const {z} = require("zod");
const {
  propertyTypeFields,
  commonFields,
  propertyTypeSections,
  fieldLabels,
  ENUM_VALUE_LABELS,
} = require("../validators/property/fieldRegistry");

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

function enumOptionsFor(jsonSchema) {
  const values = jsonSchema.enum || jsonSchema.items?.enum;
  if (!values) return undefined;
  return values.map((value) => ({
    value,
    label: ENUM_VALUE_LABELS[value] || humanize(value),
  }));
}

function toFieldJsonSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema, {io: "input"});
  delete jsonSchema.$schema;
  return jsonSchema;
}

function mapFields(fields, propertyType) {
  const labelsForType = (propertyType && fieldLabels[propertyType]) || {};
  const out = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    const jsonSchema = toFieldJsonSchema(def.schema);
    out[fieldName] = {
      path: def.path,
      dbKey: def.dbKey || fieldName,
      label: labelsForType[fieldName] || humanize(fieldName),
      required: !def.schema.isOptional(),
      schema: jsonSchema,
      options: enumOptionsFor(jsonSchema),
    };
  }
  return out;
}

function buildSections(propertyType, fields) {
  const sectionDefs = propertyTypeSections[propertyType];
  if (!sectionDefs) return [];
  return sectionDefs.map(({id, title, paths}) => ({
    id,
    title,
    fields: Object.entries(fields)
        .filter(([, def]) => paths.includes(def.path))
        .map(([fieldName]) => fieldName),
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
    commonFields: mapFields(commonFields),
    propertyTypeFields: propertyTypeFieldsOut,
    sections: sectionsOut,
  });

  return cachedResponse;
}

module.exports = {buildPropertySchemaResponse};
