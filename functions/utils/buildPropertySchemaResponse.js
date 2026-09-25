const {z} = require("zod");
const {
  propertyTypeFields,
  commonFields,
  propertyTypeSections,
  fieldLabels,
  fieldHints,
  sectionStages,
  ENUM_VALUE_LABELS,
} = require("../validators/property/fieldRegistry");
const {propertyTypeCatalog} = require("../data/propertyTypeCatalog");

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

const ACRONYM_FIXES = {ev: "EV", mls: "MLS", uv: "UV", hvac: "HVAC", id: "ID"};

function humanize(name) {
  const spaced = String(name)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim();
  return spaced
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ACRONYM_FIXES[word.toLowerCase()] ||
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
}

function enumOptionsFor(jsonSchema, {optionValues, optionLabels = {}} = {}) {
  const values = optionValues || jsonSchema.enum || jsonSchema.items?.enum;
  if (!values) return undefined;
  return values.map((value) => ({
    value,
    label: optionLabels[value] || ENUM_VALUE_LABELS[value] || humanize(value),
  }));
}

function toFieldJsonSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema, {io: "input"});
  delete jsonSchema.$schema;
  return jsonSchema;
}

/** A regex field's flags and message, which JSON Schema's `pattern` can't carry. */
function patternCheckOf(schema) {
  let inner = schema;
  while (inner?._zod?.def?.innerType) inner = inner._zod.def.innerType;
  const check = (inner?._zod?.def?.checks || []).find((c) => c._zod.def.format === "regex");
  if (!check) return undefined;
  const {pattern, error} = check._zod.def;
  const message = typeof error === "function" ? error({}) : undefined;
  return {
    ...(pattern.flags && {flags: pattern.flags}),
    ...(typeof message === "string" && {message}),
  };
}

// Everything the FE needs to render and validate one input, shared by
// top-level fields and the entries of a repeatable list's itemFields.
function describeInput(def, label, hint) {
  const jsonSchema = toFieldJsonSchema(def.schema);
  const out = {
    label,
    required: !def.schema.isOptional(),
    schema: jsonSchema,
    options: enumOptionsFor(jsonSchema, def),
  };
  if (hint) out.hint = hint;
  const patternCheck = patternCheckOf(def.schema);
  if (patternCheck && Object.keys(patternCheck).length) out.patternCheck = patternCheck;
  if (def.ui) out.ui = def.ui;
  if (def.requiredWhen) out.requiredWhen = def.requiredWhen;
  if (def.exclusiveOptions) out.exclusiveOptions = def.exclusiveOptions;
  if (def.itemFields) {
    if (def.maxItems !== undefined) out.maxItems = def.maxItems;
    out.itemFields = {};
    for (const [key, itemDef] of Object.entries(def.itemFields)) {
      out.itemFields[key] = describeInput(itemDef, itemDef.label || humanize(key), itemDef.hint);
    }
  }
  return out;
}

function mapFields(fields, propertyType) {
  const labelsForType = (propertyType && fieldLabels[propertyType]) || {};
  const hintsForType = (propertyType && fieldHints[propertyType]) || {};
  const out = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    out[fieldName] = {
      path: def.path,
      dbKey: def.dbKey || fieldName,
      ...describeInput(def, labelsForType[fieldName] || humanize(fieldName), hintsForType[fieldName]),
    };
  }
  return out;
}

// An untitled card is headed by its first field (published as `headerField`).
function buildGroups(groups, propertyType) {
  const labels = fieldLabels[propertyType] || {};
  const hints = fieldHints[propertyType] || {};
  return groups.map(({title, hint, fields, headerField, ...rest}) => {
    if (rest.content) return {fields: [], ...rest};
    if (title) return {title, ...(hint && {hint}), fields, ...(headerField && {headerField}), ...rest};
    const [first] = fields;
    return {
      title: labels[first] || humanize(first),
      ...(hints[first] && {hint: hints[first]}),
      fields,
      headerField: first,
      ...rest,
    };
  });
}

function buildSections(propertyType, fields) {
  const sectionDefs = propertyTypeSections[propertyType];
  if (!sectionDefs) return [];
  return sectionDefs.map(({paths, groups, ...pageCopy}) => ({
    ...pageCopy,
    fields: Object.entries(fields)
        .filter(([, def]) => paths.includes(def.path))
        .map(([fieldName]) => fieldName),
    ...(groups && {groups: buildGroups(groups, propertyType)}),
  }));
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}

let cachedResponse = null;

function buildPropertySchemaResponse() {
  if (cachedResponse) {
    return cachedResponse;
  }

  const propertyTypes = Object.keys(propertyTypeFields);

  const propertyTypeFieldsOut = {};
  const sectionsOut = {};
  for (const propertyType of propertyTypes) {
    propertyTypeFieldsOut[propertyType] = mapFields(propertyTypeFields[propertyType], propertyType);
    sectionsOut[propertyType] = buildSections(propertyType, propertyTypeFields[propertyType]);
  }

  cachedResponse = deepFreeze({
    $schema: JSON_SCHEMA_DIALECT,
    propertyTypes,
    propertyTypeOptions: propertyTypeCatalog,
    stages: sectionStages,
    commonFields: mapFields(commonFields),
    propertyTypeFields: propertyTypeFieldsOut,
    sections: sectionsOut,
  });

  return cachedResponse;
}

module.exports = {buildPropertySchemaResponse};
