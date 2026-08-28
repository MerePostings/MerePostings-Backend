const {signUpSchema} = require("../schemas");

describe("signUpSchema", () => {
  const valid = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    password: "hunter2",
    termsAccepted: true,
  };

  test("accepts a valid signup payload", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  test("accepts marketingOptIn when present", () => {
    expect(signUpSchema.safeParse({...valid, marketingOptIn: false}).success).toBe(true);
  });

  test("marketingOptIn is optional", () => {
    const result = signUpSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data.marketingOptIn).toBeUndefined();
  });

  test("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({...valid, email: "not-an-email"}).success).toBe(false);
  });

  test("rejects an email with an implausible TLD (TLD-check parity with old Joi validation)", () => {
    expect(signUpSchema.safeParse({...valid, email: "jane@example.con"}).success).toBe(false);
  });

  test("rejects termsAccepted: false", () => {
    expect(signUpSchema.safeParse({...valid, termsAccepted: false}).success).toBe(false);
  });

  test("rejects a missing required field", () => {
    const missingPassword = {...valid};
    delete missingPassword.password;
    expect(signUpSchema.safeParse(missingPassword).success).toBe(false);
  });

  test("rejects firstName as empty string", () => {
    expect(signUpSchema.safeParse({...valid, firstName: ""}).success).toBe(false);
  });

  test("rejects lastName as empty string", () => {
    expect(signUpSchema.safeParse({...valid, lastName: ""}).success).toBe(false);
  });

  test("rejects password as empty string", () => {
    expect(signUpSchema.safeParse({...valid, password: ""}).success).toBe(false);
  });
});
