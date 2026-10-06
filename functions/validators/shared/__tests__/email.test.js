const {z} = require("zod");
const {emailSchema} = require("../email");

describe("emailSchema", () => {
  const schema = emailSchema();

  test("accepts a normal valid email", () => {
    expect(schema.safeParse("seller@gmail.com").success).toBe(true);
  });

  test("rejects an implausible TLD (parity with Joi's TLD check)", () => {
    expect(schema.safeParse("seller@gmail.con").success).toBe(false);
  });

  test("rejects a malformed email", () => {
    expect(schema.safeParse("not-an-email").success).toBe(false);
  });

  test("rejects an empty string (empty-string allowance is opt-in via a union, not built in here)", () => {
    expect(schema.safeParse("").success).toBe(false);
  });

  test("has a complete, user-facing refine error message", () => {
    const result = schema.safeParse("seller@gmail.con");
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Please enter a valid email address");
  });

  test("publishes format: 'email' in the JSON Schema output (frontend form-gen relies on this)", () => {
    const jsonSchema = z.toJSONSchema(schema, {io: "input"});
    expect(jsonSchema.format).toBe("email");
  });
});
