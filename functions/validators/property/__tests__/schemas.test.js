const {
  initiatePropertySchema,
  draftFieldEnvelopeSchema,
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

describe("draftFieldEnvelopeSchema", () => {
  test("accepts a real propertyType with fieldName/fieldValue", () => {
    const {error} = draftFieldEnvelopeSchema.validate({
      propertyType: "detached",
      fieldName: "bedrooms",
      fieldValue: 3,
    });
    expect(error).toBeUndefined();
  });

  test("rejects an unknown propertyType", () => {
    const {error} = draftFieldEnvelopeSchema.validate({
      propertyType: "not-a-real-type",
      fieldName: "bedrooms",
      fieldValue: 3,
    });
    expect(error).toBeDefined();
  });

  test("requires fieldName", () => {
    const {error} = draftFieldEnvelopeSchema.validate({
      propertyType: "detached",
      fieldValue: 3,
    });
    expect(error).toBeDefined();
  });

  test.each([0, false, ""])(
      "accepts falsy-but-present fieldValue %p (Joi.any().required() only rejects undefined)",
      (fieldValue) => {
        const {error} = draftFieldEnvelopeSchema.validate({
          propertyType: "detached",
          fieldName: "bedrooms",
          fieldValue,
        });
        expect(error).toBeUndefined();
      },
  );

  test("rejects a missing fieldValue", () => {
    const {error} = draftFieldEnvelopeSchema.validate({
      propertyType: "detached",
      fieldName: "bedrooms",
    });
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
  test("accepts state alone", () => {
    const {error} = listingProcessPatchSchema.validate({state: {anything: "goes"}});
    expect(error).toBeUndefined();
  });

  test("accepts state with furthestMajorIndex inside", () => {
    const {error} = listingProcessPatchSchema.validate({
      state: {furthestMajorIndex: 2, occupancy: "owner"},
    });
    expect(error).toBeUndefined();
  });

  test("rejects payload without state", () => {
    const {error} = listingProcessPatchSchema.validate({});
    expect(error).toBeDefined();
  });

  test("rejects non-object state", () => {
    const {error} = listingProcessPatchSchema.validate({state: "nope"});
    expect(error).toBeDefined();
  });
});
