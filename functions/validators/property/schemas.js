const Joi = require("joi");
const {ADDONS_BY_ID} = require("../../data/addons");
const {LISTING_STEP_IDS} = require("../../utils/listingSteps");

const initiatePropertySchema = Joi.object({
  occupancyType: Joi.string().valid("owner_occupied", "tenant_occupied", "vacant").optional(),
});

const selectedAddonsSchema = Joi.object({
  selectedAddons: Joi.array()
      .items(Joi.string().valid(...Object.keys(ADDONS_BY_ID)))
      .unique()
      .default([]),
});

const updateViewedListingStepsSchema = Joi.object({
  steps: Joi.array()
      .items(Joi.string().valid(...LISTING_STEP_IDS))
      .unique()
      .required(),
});

module.exports = {
  initiatePropertySchema,
  selectedAddonsSchema,
  updateViewedListingStepsSchema,
};
