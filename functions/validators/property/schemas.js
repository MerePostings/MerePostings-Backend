const Joi = require("joi");
const {ADDONS_BY_ID} = require("../../data/addons");

/**
 * Stage 1 — initiation.
 * occupancyType optional so the funnel can start before Basic detail.
 */
const initiatePropertySchema = Joi.object({
  occupancyType: Joi.string().valid("owner_occupied", "tenant_occupied", "vacant").optional(),
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
  state: Joi.object().unknown(true).required(),
});

module.exports = {
  initiatePropertySchema,
  listingProcessPatchSchema,
  selectedAddonsSchema,
};
