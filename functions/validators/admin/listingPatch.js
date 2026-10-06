const {z} = require("zod");
const {emailSchema} = require("../shared/email");
const {propertyTypeFields} = require("../property/fieldRegistry");
const {propertyTypeCatalog} = require("../../data/propertyTypeCatalog");
const {ADDONS_BY_ID} = require("../../data/addons");
const {toBackendPropertyType} = require("../../utils/projectListingState");

/**
 * Admin edits to properties/{id}: `set` writes dotted Firestore paths and
 * `unset` deletes them. A path must be a seller-intake field (the flat keys
 * the seller's listing-process save writes), a registry field of the
 * listing's property type (`{path}.{dbKey}`), or `mlsNumber`.
 */

const PATH_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/;
const MAX_PATHS = 500;
const fieldPath = z.string().regex(PATH_PATTERN, {message: "Invalid field path"});

const adminListingPatchSchema = z.strictObject({
  set: z.record(fieldPath, z.unknown()).optional(),
  unset: z.array(fieldPath).max(MAX_PATHS).optional(),
}).refine(
    (body) => Object.keys(body.set || {}).length + (body.unset || []).length > 0,
    {message: "Nothing to update"},
);

const text = (max) => z.string().trim().max(max);

// Admins edit any subset of an intake object; unknown keys are rejected.
function partialObject(shape) {
  return z.strictObject(Object.fromEntries(
      Object.entries(shape).map(([key, schema]) => [key, schema.optional()]),
  ));
}

const PROPERTY_TYPE_IDS = new Set([
  ...Object.keys(propertyTypeFields),
  ...propertyTypeCatalog.flatMap(({value, slug, legacySlugs = []}) => [value, slug, ...legacySlugs]),
]);

// Shapes the seller flow stores (Mere-Postings-FE useListingFlowStore).
const INTAKE_SCHEMAS = {
  mlsNumber: text(50).min(1),
  listedWithOtherBrokerage: z.boolean(),
  supportTier: z.enum(["basic", "flexible", "full"]),
  walkthroughAnswers: partialObject({
    situation: text(200),
    situationOther: text(500),
    concern: text(200),
    reason: text(200),
    reasonOther: text(500),
    helpPreference: text(200),
  }),
  occupancy: z.enum(["owner", "tenant", "vacant"]),
  tenancy: partialObject({
    possession: z.enum(["fixed-term", "month-to-month", "vacant-possession"]),
    fixedTermUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {message: "Use the format YYYY-MM-DD"}),
    leaseAgreementAvailable: z.boolean(),
  }),
  propertyType: z.string().refine((value) => PROPERTY_TYPE_IDS.has(value), {message: "Unknown property type"}),
  askingPrice: z.number().positive().max(1_000_000_000_000),
  requestListingPriceReview: z.boolean(),
  selectedAddons: z.array(z.string().refine((id) => Object.hasOwn(ADDONS_BY_ID, id), {message: "Unknown add-on"}))
      .refine((ids) => new Set(ids).size === ids.length, {message: "Add-ons must not repeat"}),
  sellerContact: partialObject({
    firstName: text(80),
    middleName: text(80),
    lastName: text(150),
    email: emailSchema(),
    phone: text(30),
    preferredContact: z.enum(["Email", "Phone Call", "Text Message"]),
    bestTime: z.enum(["Morning", "Afternoon", "Evening", "Anytime"]),
  }),
  ownership: partialObject({
    isRegisteredOwner: z.boolean(),
    hasAdditionalOwners: z.boolean(),
    additionalOwners: z.array(z.strictObject({
      firstName: text(80).optional(),
      lastName: text(150).optional(),
    })).max(10),
    authorityType: z.enum([
      "power-of-attorney", "estate-trustee", "court-guardian", "corporate-officer", "trustee", "other",
    ]),
    lawyerAssisting: z.enum(["yes", "no", "not-yet"]),
    lawyer: partialObject({
      fullName: text(150),
      firm: text(150),
      email: emailSchema(),
      phone: text(30),
      lawSocietyNumber: text(40),
      represents: z.enum(["registered-owner", "legal-authority", "both"]),
      contactAuthorized: z.boolean(),
    }),
  }),
  mailingAddress: partialObject({
    sameAsProperty: z.boolean(),
    street: text(200),
    city: text(100),
    province: text(100),
    postalCode: text(20),
  }),
  propertyDetails: partialObject({
    address: text(300),
    unit: text(20),
    postalCode: text(20),
    addressConfirmed: z.boolean(),
  }),
  sellerConfirmations: partialObject({
    infoAccurate: z.boolean(),
    brokerageReview: z.boolean(),
    approvalRequired: z.boolean(),
  }),
};

/** The schema for an intake path such as `ownership.lawyer.email`, or null. */
function intakeSchemaAt(path) {
  const [root, ...rest] = path.split(".");
  let schema = Object.hasOwn(INTAKE_SCHEMAS, root) ? INTAKE_SCHEMAS[root] : null;
  for (const key of rest) {
    if (schema instanceof z.ZodOptional) schema = schema.unwrap();
    if (!(schema instanceof z.ZodObject) || !Object.hasOwn(schema.shape, key)) return null;
    schema = schema.shape[key];
  }
  return schema;
}

function registryFieldsByPath(registryKey) {
  const fields = Object.hasOwn(propertyTypeFields, registryKey) ? propertyTypeFields[registryKey] : {};
  return new Map(Object.entries(fields).map(([name, def]) => [`${def.path}.${def.dbKey || name}`, def]));
}

/** Paths that sit inside another path of the same update (Firestore rejects those). */
function nestedPaths(paths) {
  const all = new Set(paths);
  return paths.filter((path) => {
    const parts = path.split(".");
    return parts.slice(0, -1).some((_, i) => all.has(parts.slice(0, i + 1).join(".")));
  });
}

/**
 * @param {string|undefined} storedPropertyType properties/{id}.propertyType
 * @param {{set?: object, unset?: string[]}} body
 * @return {Array<{path: string, message: string}>} problems; empty when valid
 */
function validateAdminListingPatch(storedPropertyType, body) {
  const set = body.set || {};
  const unset = body.unset || [];
  const nextType = Object.hasOwn(set, "propertyType") ? set.propertyType : storedPropertyType;
  const registryFields = registryFieldsByPath(toBackendPropertyType(nextType));
  const problems = [];

  const check = (path, value, isSet) => {
    const def = registryFields.get(path);
    const schema = def ? def.schema : intakeSchemaAt(path);
    if (!schema) {
      problems.push({path, message: "This field can't be edited here"});
      return;
    }
    if (!isSet) return;
    const result = schema.safeParse(value);
    if (!result.success) problems.push({path, message: result.error.issues[0]?.message || "Invalid value"});
  };

  for (const [path, value] of Object.entries(set)) check(path, value, true);
  for (const path of unset) check(path, undefined, false);
  for (const path of unset.filter((p) => Object.hasOwn(set, p))) {
    problems.push({path, message: "A field can't be both set and removed"});
  }
  for (const path of nestedPaths([...Object.keys(set), ...unset])) {
    problems.push({path, message: "Overlaps another field in the same update"});
  }
  return problems;
}

/** A copy of `doc` with the patch applied; only containers on the patched paths are copied. */
function applyPatch(doc, {set = {}, unset = []}) {
  const writeAt = (obj, keys, value, remove) => {
    const [key, ...rest] = keys;
    const copy = {...(obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {})};
    if (rest.length) copy[key] = writeAt(copy[key], rest, value, remove);
    else if (remove) delete copy[key];
    else copy[key] = value;
    return copy;
  };
  let out = doc;
  for (const [path, value] of Object.entries(set)) out = writeAt(out, path.split("."), value, false);
  for (const path of unset) out = writeAt(out, path.split("."), undefined, true);
  return out;
}

module.exports = {adminListingPatchSchema, validateAdminListingPatch, applyPatch};
