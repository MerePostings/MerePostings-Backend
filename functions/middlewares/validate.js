/**
 * Generic Joi validation middleware. Validates req[property] against the
 * given schema, replaces it with the coerced/defaulted value on success,
 * or responds 400 with a field-by-field error list on failure.
 *
 * @param {import('joi').Schema} schema
 * @param {'body'|'query'|'params'} [property]
 */
const validate = (schema, property = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });

    if (error) {
        return res.status(400).json({
            success: false,
            errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
        });
    }

    req[property] = value;
    next();
};

module.exports = validate;