const {draftFieldEnvelopeSchema} = require("../validators/property/schemas");
const {getFieldDefinition} = require("../validators/property/fieldRegistry");
const formatValidationError = require("../utils/formatValidationError");

/**
 * Validates the draft auto-save payload in two passes:
 *
 *   1. Envelope shape: { propertyType, fieldName, fieldValue }
 *      (propertyType is checked against the known set of property types)
 *
 *   2. fieldValue itself, against whichever schema the field registry
 *      returns for this (propertyType, fieldName) pair. This is the part
 *      that can't be a static schema, since it depends on runtime values.
 *
 * On success, attaches req.validatedField with everything the service
 * layer needs to write the value to the right place in Firestore:
 *   { propertyType, fieldName, fieldValue, path, dbKey }
 */
const validateDraftField = (req, res, next) => {
  const envelopeResult = draftFieldEnvelopeSchema.safeParse(req.body);

  if (!envelopeResult.success) {
    return res.status(400).json({success: false, errors: formatValidationError(envelopeResult.error)});
  }

  const {propertyType, fieldName, fieldValue} = envelopeResult.data;
  const fieldDef = getFieldDefinition(propertyType, fieldName);

  if (!fieldDef) {
    return res.status(400).json({
      success: false,
      errors: [
        {
          field: fieldName,
          message: `"${fieldName}" is not a valid field for property type "${propertyType}"`,
        },
      ],
    });
  }

  const valueResult = fieldDef.schema.safeParse(fieldValue);

  if (!valueResult.success) {
    return res.status(400).json({success: false, errors: formatValidationError(valueResult.error, fieldName)});
  }

  req.validatedField = {
    propertyType,
    fieldName,
    fieldValue: valueResult.data,
    path: fieldDef.path,
    dbKey: fieldDef.dbKey,
  };

  next();
};

module.exports = validateDraftField;
