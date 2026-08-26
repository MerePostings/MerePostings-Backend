const Joi = require("joi");
const {ADDONS_BY_ID} = require("../../data/addons");

const initiatePropertySchema = Joi.object({
  occupancyType: Joi.string().valid("owner_occupied", "tenant_occupied", "vacant").optional(),
});

const selectedAddonsSchema = Joi.object({
  selectedAddons: Joi.array()
      .items(Joi.string().valid(...Object.keys(ADDONS_BY_ID)))
      .unique()
      .default([]),
});

module.exports = {
  initiatePropertySchema,
  selectedAddonsSchema,
};
