/**
 * Single source of truth for property-fields.json rules.
 * - validateFieldPatch: value shape on PATCH (not completion)
 * - getViewedStepCompletion / getListingCompletion: required fields present
 */
const Ajv = require("ajv");
const propertyFieldsSchema = require("../../schemas/property-fields.json");

const RESERVED_KEYS = new Set(["version", "$schema"]);

function stripUiKeywords(subschema) {
  const cleaned = {...subschema};
  delete cleaned["x-ui"];
  return cleaned;
}

const LISTING_STEP_IDS = [...new Set(
    Object.values(propertyFieldsSchema.properties || {})
        .map((def) => def["x-ui"]?.section)
        .filter(Boolean),
)];

const fieldSections = Object.fromEntries(
    Object.entries(propertyFieldsSchema.properties || {}).map(([field, def]) => [
      field,
      def["x-ui"]?.section ?? null,
    ]),
);

const ajv = new Ajv({allErrors: true, strict: false});

const fieldValidators = new Map();
for (const [fieldName, subschema] of Object.entries(propertyFieldsSchema.properties || {})) {
  fieldValidators.set(fieldName, ajv.compile(stripUiKeywords(subschema)));
}

const documentSchema = {
  type: propertyFieldsSchema.type,
  properties: Object.fromEntries(
      Object.entries(propertyFieldsSchema.properties || {}).map(([field, def]) => [
        field,
        stripUiKeywords(def),
      ]),
  ),
  required: propertyFieldsSchema.required,
  allOf: propertyFieldsSchema.allOf,
};
const documentValidator = ajv.compile(documentSchema);

function formatFieldErrors(field, validate) {
  return (validate.errors || []).map((err) => ({
    field,
    message: err.message || "Invalid value",
  }));
}

function validateFieldPatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {valid: false, errors: [{field: "", message: "Request body must be a non-empty object"}]};
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return {valid: false, errors: [{field: "", message: "Request body must contain at least one field"}]};
  }

  const errors = [];
  const values = {};

  for (const key of keys) {
    if (RESERVED_KEYS.has(key)) {
      errors.push({field: key, message: `"${key}" is not a patchable field`});
      continue;
    }

    const validate = fieldValidators.get(key);
    if (!validate) {
      errors.push({field: key, message: `"${key}" is not a recognized property field`});
      continue;
    }

    const value = body[key];
    if (!validate(value)) {
      errors.push(...formatFieldErrors(key, validate));
      continue;
    }

    values[key] = value;
  }

  if (errors.length > 0) {
    return {valid: false, errors};
  }

  return {valid: true, values};
}

function collectMissingRequiredFields(fields = {}) {
  documentValidator(fields);

  const seen = new Set();
  const missingFields = [];

  for (const err of documentValidator.errors || []) {
    if (err.keyword !== "required") continue;

    const field = err.params.missingProperty;
    if (!field || seen.has(field)) continue;
    seen.add(field);

    missingFields.push({
      field,
      section: fieldSections[field] ?? null,
      message: `Missing required field "${field}"`,
    });
  }

  return missingFields;
}

function getViewedStepCompletion(fields, viewedListingSteps = []) {
  const viewed = new Set(viewedListingSteps);
  const missingFields = collectMissingRequiredFields(fields).filter(
      (item) => item.section && viewed.has(item.section),
  );

  return {complete: missingFields.length === 0, missingFields};
}

function getListingCompletion(fields) {
  const missingFields = collectMissingRequiredFields(fields);
  return {complete: missingFields.length === 0, missingFields};
}

module.exports = {
  LISTING_STEP_IDS,
  validateFieldPatch,
  getViewedStepCompletion,
  getListingCompletion,
};
