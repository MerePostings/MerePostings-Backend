const {
  LISTING_STEP_IDS,
  validateFieldPatch,
  getViewedStepCompletion,
  getListingCompletion,
} = require("../propertyFields");
const {updateViewedListingStepsSchema} = require("../schemas");

describe("propertyFields — validateFieldPatch", () => {
  test("accepts a valid enum field", () => {
    const result = validateFieldPatch({"property-type": "detached"});
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({"property-type": "detached"});
  });

  test("accepts multiple valid fields", () => {
    const result = validateFieldPatch({
      "garage": true,
      "garage-spaces": 2,
    });
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({"garage": true, "garage-spaces": 2});
  });

  test("accepts a valid object field", () => {
    const result = validateFieldPatch({
      "bathrooms": {"two-piece": 1, "three-piece": 2},
    });
    expect(result.valid).toBe(true);
  });

  test("rejects an empty body", () => {
    const result = validateFieldPatch({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/at least one field/);
  });

  test("rejects unknown keys", () => {
    const result = validateFieldPatch({"not-a-field": "x"});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toEqual(
        expect.objectContaining({field: "not-a-field"}),
    );
  });

  test("rejects reserved meta keys", () => {
    const result = validateFieldPatch({version: 1});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("version");
  });

  test("rejects invalid enum value", () => {
    const result = validateFieldPatch({"property-type": "castle"});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("property-type");
  });

  test("rejects wrong type", () => {
    const result = validateFieldPatch({"garage": "yes"});
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("garage");
  });

  test("rejects non-object body", () => {
    const result = validateFieldPatch(null);
    expect(result.valid).toBe(false);
  });
});

describe("propertyFields — LISTING_STEP_IDS", () => {
  test("derives step ids from property-fields schema sections", () => {
    expect(LISTING_STEP_IDS).toContain("basic-details");
    expect(LISTING_STEP_IDS).toContain("occupancy");
    expect(LISTING_STEP_IDS).toContain("condo-fees");
    expect(LISTING_STEP_IDS.length).toBeGreaterThan(10);
  });
});

describe("propertyFields — getListingCompletion", () => {
  test("flags missing root required field", () => {
    const result = getListingCompletion({});
    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(
        expect.arrayContaining([expect.objectContaining({field: "property-type", section: "basic-details"})]),
    );
  });

  test("flags conditional required fields", () => {
    const result = getListingCompletion({"property-type": "detached"});
    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(
        expect.arrayContaining([expect.objectContaining({field: "basement", section: "lower-level"})]),
    );
  });

  test("passes when conditionals are satisfied", () => {
    const result = getListingCompletion({
      "property-type": "detached",
      "basement": false,
    });
    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
});

describe("propertyFields — getViewedStepCompletion", () => {
  test("only checks opened sections", () => {
    const result = getViewedStepCompletion({}, ["occupancy"]);
    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  test("flags missing required fields in viewed sections", () => {
    const result = getViewedStepCompletion({}, ["basic-details"]);
    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual([
      expect.objectContaining({field: "property-type", section: "basic-details"}),
    ]);
  });

  test("ignores unviewed conditional requirements", () => {
    const result = getViewedStepCompletion(
        {"property-type": "detached"},
        ["basic-details"],
    );
    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
});

describe("updateViewedListingStepsSchema", () => {
  test("accepts a list of known step ids", () => {
    const {error} = updateViewedListingStepsSchema.validate({
      steps: ["basic-details", "occupancy"],
    });
    expect(error).toBeUndefined();
  });

  test("accepts an empty list", () => {
    const {error} = updateViewedListingStepsSchema.validate({steps: []});
    expect(error).toBeUndefined();
  });

  test("rejects unknown step ids", () => {
    const {error} = updateViewedListingStepsSchema.validate({steps: ["not-a-step"]});
    expect(error).toBeDefined();
  });

  test("rejects duplicate step ids", () => {
    const {error} = updateViewedListingStepsSchema.validate({
      steps: ["basic-details", "basic-details"],
    });
    expect(error).toBeDefined();
  });

  test("requires steps", () => {
    const {error} = updateViewedListingStepsSchema.validate({});
    expect(error).toBeDefined();
  });
});
