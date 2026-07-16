const Joi = require('joi');
const { propertyTypeFields } = require('./fieldRegistry');

/**
 * Stage 1 — initiation.
 * occupancyType optional so the funnel can start before Basic detail.
 */
const initiatePropertySchema = Joi.object({
    occupancyType: Joi.string().valid('owner_occupied', 'tenant_occupied', 'vacant').optional(),
});

/**
 * Stage 2 — draft auto-save envelope (legacy FE path; still used by admin/compat).
 */
const draftFieldEnvelopeSchema = Joi.object({
    propertyType: Joi.string()
        .valid(...Object.keys(propertyTypeFields))
        .required(),
    fieldName: Joi.string().required(),
    fieldValue: Joi.any().required(),
});

/** Wizard process document — full FE flow state + progress. */
const listingProcessPatchSchema = Joi.object({
    furthestMajorIndex: Joi.number().integer().min(0).max(8).optional(),
    state: Joi.object().unknown(true).optional(),
}).or('furthestMajorIndex', 'state');

module.exports = {
    initiatePropertySchema,
    draftFieldEnvelopeSchema,
    listingProcessPatchSchema,
};