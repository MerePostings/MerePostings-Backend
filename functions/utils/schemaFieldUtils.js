function isRequiredSchema(schema) {
  return !schema.safeParse(undefined).success;
}

function readFieldValue(prop, fieldName, def) {
  const dbKey = def.dbKey || fieldName;
  return def.path === "top" ? prop[dbKey] : prop[def.path]?.[dbKey];
}

function isFieldSatisfied(def, value) {
  return def.schema.safeParse(value).success;
}

module.exports = {isRequiredSchema, readFieldValue, isFieldSatisfied};
