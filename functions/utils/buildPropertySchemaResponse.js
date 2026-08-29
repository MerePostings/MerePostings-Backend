const {z} = require("zod");
const {propertyTypeFields, commonFields} = require("../validators/property/fieldRegistry");

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

/** Bump when fieldRegistry shape changes in a FE-breaking way. */
const PROPERTY_SCHEMA_VERSION = 1;

function toFieldJsonSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema, {io: "input"});
  delete jsonSchema.$schema;
  return jsonSchema;
}

function mapFields(fields) {
  const out = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    out[fieldName] = {
      path: def.path,
      dbKey: def.dbKey || fieldName,
      schema: toFieldJsonSchema(def.schema),
    };
  }
  return out;
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
  for (const propertyType of propertyTypes) {
    propertyTypeFieldsOut[propertyType] = mapFields(propertyTypeFields[propertyType]);
  }

  cachedResponse = deepFreeze({
    version: PROPERTY_SCHEMA_VERSION,
    $schema: JSON_SCHEMA_DIALECT,
    propertyTypes,
    commonFields: mapFields(commonFields),
    propertyTypeFields: propertyTypeFieldsOut,
  });

  return cachedResponse;
}

module.exports = {buildPropertySchemaResponse, PROPERTY_SCHEMA_VERSION};
