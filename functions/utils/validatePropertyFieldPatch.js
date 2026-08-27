const Ajv = require("ajv");
const propertyFieldsSchema = require("../schemas/property-fields.json");

const RESERVED_KEYS = new Set(["version", "$schema"]);

function stripUiKeywords(subschema) {
  const cleaned = {...subschema};
  delete cleaned["x-ui"];
  return cleaned;
}

const ajv = new Ajv({allErrors: true, strict: false});
const fieldValidators = new Map();

for (const [fieldName, subschema] of Object.entries(propertyFieldsSchema.properties || {})) {
  fieldValidators.set(fieldName, ajv.compile(stripUiKeywords(subschema)));
}

function formatErrors(field, validate) {
  return (validate.errors || []).map((err) => ({
    field,
    message: err.message || "Invalid value",
  }));
}

/**
 * Validates a partial property-fields PATCH body field-by-field against
 * property-fields.json subschemas. Does not run document-level required/allOf rules.
 */
function validatePropertyFieldPatch(body) {
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
      errors.push(...formatErrors(key, validate));
      continue;
    }

    values[key] = value;
  }

  if (errors.length > 0) {
    return {valid: false, errors};
  }

  return {valid: true, values};
}

module.exports = {validatePropertyFieldPatch};
