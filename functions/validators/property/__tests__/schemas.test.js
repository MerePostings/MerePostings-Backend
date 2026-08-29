const {
  initiatePropertySchema,
  listingProcessPatchSchema,
  selectedAddonsSchema,
} = require("../schemas");
const {ADDONS_BY_ID} = require("../../../data/addons");

describe("initiatePropertySchema", () => {
  test.each(["owner_occupied", "tenant_occupied", "vacant"])(
      "accepts occupancyType %s",
      (occupancyType) => {
        const {error} = initiatePropertySchema.validate({occupancyType});
        expect(error).toBeUndefined();
      },
  );

  test("occupancyType is optional", () => {
    const {error} = initiatePropertySchema.validate({});
    expect(error).toBeUndefined();
  });

  test("rejects an unknown occupancyType", () => {
    const {error} = initiatePropertySchema.validate({occupancyType: "bogus"});
    expect(error).toBeDefined();
  });
});

describe("selectedAddonsSchema", () => {
  const validAddonIds = Object.keys(ADDONS_BY_ID);

  test("accepts a real addon id", () => {
    const {error} = selectedAddonsSchema.validate({
      selectedAddons: [validAddonIds[0]],
    });
    expect(error).toBeUndefined();
  });

  test("defaults to an empty array when omitted", () => {
    const {value, error} = selectedAddonsSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.selectedAddons).toEqual([]);
  });

  test("rejects an unknown addon id", () => {
    const {error} = selectedAddonsSchema.validate({
      selectedAddons: ["not_a_real_addon"],
    });
    expect(error).toBeDefined();
  });

  test("rejects duplicate addon ids", () => {
    const {error} = selectedAddonsSchema.validate({
      selectedAddons: [validAddonIds[0], validAddonIds[0]],
    });
    expect(error).toBeDefined();
  });
});

describe("listingProcessPatchSchema", () => {
  test("accepts nested path sections with an optional propertyType", () => {
    const {error} = listingProcessPatchSchema.validate({
      propertyType: "detached",
      garage: {garageType: "attached"},
      interior: {bedroomsAboveGrade: 3},
    });
    expect(error).toBeUndefined();
  });
});
