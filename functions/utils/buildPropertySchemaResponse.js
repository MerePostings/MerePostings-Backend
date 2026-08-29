const {z} = require("zod");
const {
  propertyTypeFields,
  commonFields,
  PROPERTY_SCHEMA_VERSION,
  getKnownStepIds,
  getFieldsForPropertyType,
} = require("../validators/property/fieldRegistry");

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

function toFieldJsonSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema, {io: "input"});
  delete jsonSchema.$schema;
  return jsonSchema;
}

function mapFieldDef(fieldName, def) {
  return {
    path: def.path,
    step: def.path,
    dbKey: def.dbKey || fieldName,
    schema: toFieldJsonSchema(def.schema),
  };
}

function mapFields(fields) {
  const out = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    out[fieldName] = mapFieldDef(fieldName, def);
  }
  return out;
}

function buildFieldsByStep(propertyType) {
  const byStep = {};
  for (const [fieldName, def] of Object.entries(getFieldsForPropertyType(propertyType))) {
    const step = def.path;
    if (!byStep[step]) byStep[step] = {};
    byStep[step][fieldName] = mapFieldDef(fieldName, def);
  }
  return byStep;
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
  const steps = {};
  const fieldsByStep = {};
  for (const propertyType of propertyTypes) {
    propertyTypeFieldsOut[propertyType] = mapFields(propertyTypeFields[propertyType]);
    steps[propertyType] = getKnownStepIds(propertyType);
    fieldsByStep[propertyType] = buildFieldsByStep(propertyType);
  }

  cachedResponse = deepFreeze({
    version: PROPERTY_SCHEMA_VERSION,
    $schema: JSON_SCHEMA_DIALECT,
    propertyTypes,
    steps,
    commonFields: mapFields(commonFields),
    propertyTypeFields: propertyTypeFieldsOut,
    fieldsByStep,
  });

  return cachedResponse;
}

module.exports = {buildPropertySchemaResponse, PROPERTY_SCHEMA_VERSION};
