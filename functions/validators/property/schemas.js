const Joi = require('joi');
const { propertyTypeFields } = require('./fieldRegistry');
const { ADDONS_BY_ID } = require('../../data/addons')

/**
 * Stage 1 — initiation.
 * ⚠️ Placeholder enum — swap in your real occupancy types.
 */
const initiatePropertySchema = Joi.object({
    occupancyType: Joi.string().valid('owner_occupied', 'tenant_occupied', 'vacant').required(),
});

/**
 * Stage 2 — draft auto-save envelope.
 *
 * `fieldValue` is deliberately Joi.any() here — its real shape depends on
 * BOTH propertyType and fieldName, so it can't be pinned down statically.
 * It gets validated dynamically against the field registry in
 * middlewares/validateDraftField.js, after this envelope passes.
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

module.exports = { initiatePropertySchema, draftFieldEnvelopeSchema, selectedAddonsSchema };