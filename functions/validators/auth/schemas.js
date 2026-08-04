const Joi = require("joi");

const signUpSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  termsAccepted: Joi.boolean().valid(true).required(),
  marketingOptIn: Joi.boolean().optional(),
});

module.exports = {
  signUpSchema,
};
