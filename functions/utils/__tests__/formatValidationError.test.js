const {z} = require("zod");
const formatValidationError = require("../formatValidationError");
const {signUpSchema} = require("../../validators/auth/schemas");

describe("formatValidationError", () => {
  test("missing required string field produces Joi-style '\"field\" is required' message", () => {
    const result = signUpSchema.safeParse({
      lastName: "Doe",
      email: "jane@example.com",
      password: "secret",
      termsAccepted: true,
    });

    expect(result.success).toBe(false);

    const errors = formatValidationError(result.error);
    const firstNameError = errors.find((e) => e.field === "firstName");

    expect(firstNameError).toBeDefined();
    expect(firstNameError.message).toBe("\"firstName\" is required");
  });

  test("literal mismatch (termsAccepted: false) produces a 'must be true' message", () => {
    const result = signUpSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "secret",
      termsAccepted: false,
    });

    expect(result.success).toBe(false);

    const errors = formatValidationError(result.error);
    const termsError = errors.find((e) => e.field === "termsAccepted");

    expect(termsError).toBeDefined();
    expect(termsError.message).toMatch(/must be true/i);
    expect(termsError.message).not.toMatch(/invalid input/i);
  });

  test("falls back to Zod's own message for unhandled issue types", () => {
    const schema = z.string().min(3);
    const result = schema.safeParse("ab");

    expect(result.success).toBe(false);

    const errors = formatValidationError(result.error);

    expect(errors[0].message).toBe(result.error.issues[0].message);
  });

  test("uses fieldNameOverride when provided (draft-field flow)", () => {
    const schema = z.string();
    const result = schema.safeParse(undefined);

    expect(result.success).toBe(false);

    const errors = formatValidationError(result.error, "sellerEmail");

    expect(errors[0].field).toBe("sellerEmail");
    expect(errors[0].message).toBe("\"sellerEmail\" is required");
  });
});
