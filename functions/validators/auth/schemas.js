const {z} = require("zod");
const {emailSchema} = require("../shared/email");

const signUpSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: emailSchema(),
  password: z.string().min(1),
  termsAccepted: z.literal(true),
  marketingOptIn: z.boolean().optional(),
});

module.exports = {
  signUpSchema,
};
