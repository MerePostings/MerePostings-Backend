/**
 * Formats a Joi ValidationError into a consistent API error shape:
 *   [{ field: 'email', message: '"email" must be a valid email' }, ...]
 *
 * @param {import('joi').ValidationError} error
 * @param {string} [fieldNameOverride] - use when validating a single field's
 *   value directly (e.g. the draft auto-save flow), since in that case
 *   error.details[].path refers to the *value's* internal shape, not the
 *   outer field name the client sent.
 */
const formatJoiError = (error, fieldNameOverride) => {
    return error.details.map((detail) => ({
        field: fieldNameOverride || detail.path.join('.'),
        message: detail.message,
    }));
};

module.exports = formatJoiError;