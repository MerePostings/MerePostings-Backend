const AppError = require("./AppError");
const {
  getFieldDefinition,
  isValidPropertyType,
  propertyTypeFields,
  commonFields,
} = require("../validators/property/fieldRegistry");

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function getFieldsForPropertyType(propertyType) {
  return {...commonFields, ...(propertyTypeFields[propertyType] || {})};
}

function deepMergePlainObjects(prev, next) {
  if (!isPlainObject(next)) return next;
  if (!isPlainObject(prev)) return {...next};
  const out = {...prev};
  for (const key of Object.keys(next)) {
    const n = next[key];
    const p = prev[key];
    if (isPlainObject(n) && isPlainObject(p)) {
      out[key] = deepMergePlainObjects(p, n);
    } else {
      out[key] = n;
    }
  }
  return out;
}

/**
 * Walk nested PATCH body → flat field patches.
 * Shape: { propertyType?, garage: { garageType: "..." }, location: { ... } }
 */
function extractFieldPatches(body) {
  if (!isPlainObject(body)) return [];
  const patches = [];

  for (const [path, section] of Object.entries(body)) {
    if (path === "propertyType") continue;
    if (!isPlainObject(section)) {
      throw new AppError(`"${path}" must be an object`, 400);
    }
    for (const [fieldName, value] of Object.entries(section)) {
      patches.push({path, fieldName, value});
    }
  }
  return patches;
}

function throwValidationErrors(errors) {
  const err = new AppError("Validation failed", 400);
  err.errors = errors;
  throw err;
}

function retainExplicitKeys(input, parsed) {
  if (!isPlainObject(input) || !isPlainObject(parsed)) return parsed;
  const out = {};
  for (const key of Object.keys(input)) {
    out[key] = retainExplicitKeys(input[key], parsed[key]);
  }
  return out;
}

/** Validate patches against fieldRegistry; returns { [path]: { [dbKey]: value } }. */
function validateFieldPatches(propertyType, patches) {
  const errors = [];
  const validatedByPath = {};

  for (const {path, fieldName, value} of patches) {
    const def = getFieldDefinition(propertyType, fieldName);
    const fieldKey = `${path}.${fieldName}`;

    if (!def) {
      errors.push({
        field: fieldKey,
        message: `"${fieldName}" is not valid for property type "${propertyType}"`,
      });
      continue;
    }
    if (def.path !== path) {
      errors.push({
        field: fieldKey,
        message: `"${fieldName}" belongs under "${def.path}", not "${path}"`,
      });
      continue;
    }

    const result = def.schema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const suffix = issue.path.length ? `.${issue.path.join(".")}` : "";
        errors.push({field: `${fieldKey}${suffix}`, message: issue.message});
      }
      continue;
    }

    const dbKey = def.dbKey || fieldName;
    if (!validatedByPath[path]) validatedByPath[path] = {};
    validatedByPath[path][dbKey] = isPlainObject(value) ?
      retainExplicitKeys(value, result.data) :
      result.data;
  }

  if (errors.length) throwValidationErrors(errors);
  return validatedByPath;
}

/** Deep-merge validated path sections onto existing property data → Firestore update. */
function buildFirestoreUpdate(existing, validatedByPath) {
  const update = {};

  for (const [path, fields] of Object.entries(validatedByPath)) {
    if (path === "top") {
      Object.assign(update, fields);
    } else {
      update[path] = deepMergePlainObjects(existing[path], fields);
    }
  }

  return update;
}

/** Group stored property values by registry path for GET responses. */
function assembleListingFields(prop, propertyType) {
  if (!propertyType || !isValidPropertyType(propertyType)) return {};

  const fields = getFieldsForPropertyType(propertyType);
  const out = {};

  for (const [fieldName, def] of Object.entries(fields)) {
    const dbKey = def.dbKey || fieldName;
    const value = def.path === "top" ? prop[dbKey] : prop[def.path]?.[dbKey];
    if (value === undefined) continue;
    if (!out[def.path]) out[def.path] = {};
    out[def.path][fieldName] = value;
  }

  return out;
}

function resolvePropertyType(body, existing) {
  const requested = body?.propertyType;
  if (requested) {
    if (!isValidPropertyType(requested)) {
      throw new AppError(`Unknown property type "${requested}"`, 400);
    }
    if (existing?.propertyType && existing.propertyType !== requested) {
      throw new AppError(
          `Property type mismatch: listing is "${existing.propertyType}" but request sent "${requested}"`,
          409,
      );
    }
    return requested;
  }
  if (existing?.propertyType) return existing.propertyType;
  throw new AppError("propertyType is required", 400);
}

module.exports = {
  assembleListingFields,
  buildFirestoreUpdate,
  extractFieldPatches,
  resolvePropertyType,
  validateFieldPatches,
};
