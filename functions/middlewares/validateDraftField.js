const { draftFieldEnvelopeSchema } = require('../validators/property/schemas');
const { getFieldDefinition } = require('../validators/property/fieldRegistry');
const formatJoiError = require('../utils/formatJoiError');

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
    const { error: envelopeError, value: envelope } = draftFieldEnvelopeSchema.validate(req.body, {
        abortEarly: false,
    });

    if (envelopeError) {
        return res.status(400).json({ success: false, errors: formatJoiError(envelopeError) });
    }

    const { propertyType, fieldName, fieldValue } = envelope;
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

    const { error: valueError, value: validatedValue } = fieldDef.schema.validate(fieldValue, {
        abortEarly: false,
        convert: true,
    });

    if (valueError) {
        return res.status(400).json({ success: false, errors: formatJoiError(valueError, fieldName) });
    }

    req.validatedField = {
        propertyType,
        fieldName,
        fieldValue: validatedValue,
        path: fieldDef.path,
        dbKey: fieldDef.dbKey,
    };

    next();
};

module.exports = validateDraftField;