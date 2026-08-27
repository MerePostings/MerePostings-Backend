const {updateViewedListingStepsSchema} = require("../../validators/property/schemas");
const {LISTING_STEP_IDS} = require("../listingSteps");

describe("listingSteps", () => {
  test("derives step ids from property-fields schema sections", () => {
    expect(LISTING_STEP_IDS).toContain("basic-details");
    expect(LISTING_STEP_IDS).toContain("occupancy");
    expect(LISTING_STEP_IDS).toContain("condo-fees");
    expect(LISTING_STEP_IDS.length).toBeGreaterThan(10);
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
