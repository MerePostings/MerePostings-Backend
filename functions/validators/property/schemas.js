const Joi = require('joi');
const { propertyTypeFields } = require('./fieldRegistry');
const { ADDONS_BY_ID } = require('../../data/addons')

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

/**
 * Addon selection payload — sent right before checkout (and optionally
 * autosaved earlier if the frontend has a dedicated addons step).
 * Enum is built from ADDONS_BY_ID so it can't drift out of sync with
 * the actual addon registry.
 */
const selectedAddonsSchema = Joi.object({
    selectedAddons: Joi.array()
        .items(Joi.string().valid(...Object.keys(ADDONS_BY_ID)))
        .unique()
        .default([]),
});

const listingProcessPatchSchema = Joi.object({
    furthestMajorIndex: Joi.number().integer().min(0).max(8).optional(),
    state: Joi.object().unknown(true).optional(),
}).or('furthestMajorIndex', 'state');

module.exports = {
    initiatePropertySchema,
    draftFieldEnvelopeSchema,
    listingProcessPatchSchema,
    selectedAddonsSchema
};
