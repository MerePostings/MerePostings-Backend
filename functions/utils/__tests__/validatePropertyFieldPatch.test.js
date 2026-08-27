const {validatePropertyFieldPatch} = require("../validatePropertyFieldPatch");

describe("validatePropertyFieldPatch", () => {
  test("accepts a valid enum field", () => {
    const result = validatePropertyFieldPatch({"property-type": "detached"});
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({"property-type": "detached"});
  });

  test("accepts multiple valid fields", () => {
    const result = validatePropertyFieldPatch({
      "garage": true,
      "garage-spaces": 2,
    });
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({"garage": true, "garage-spaces": 2});
  });

  test("accepts a valid object field", () => {
    const result = validatePropertyFieldPatch({
      "bathrooms": {"two-piece": 1, "three-piece": 2},
    });
    expect(result.valid).toBe(true);
  });

  test("rejects an empty body", () => {
    const result = validatePropertyFieldPatch({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/at least one field/);
  });

  test("rejects unknown keys", () => {
    const result = validatePropertyFieldPatch({"not-a-field": "x"});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toEqual(
        expect.objectContaining({field: "not-a-field"}),
    );
  });

  test("rejects reserved meta keys", () => {
    const result = validatePropertyFieldPatch({version: 1});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("version");
  });

  test("rejects invalid enum value", () => {
    const result = validatePropertyFieldPatch({"property-type": "castle"});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("property-type");
  });

  test("rejects wrong type", () => {
    const result = validatePropertyFieldPatch({"garage": "yes"});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("garage");
  });

  test("rejects non-object body", () => {
    const result = validatePropertyFieldPatch(null);
    expect(result.valid).toBe(false);
  });
});
