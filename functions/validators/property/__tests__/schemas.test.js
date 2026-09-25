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
        expect(initiatePropertySchema.safeParse({occupancyType}).success).toBe(true);
      },
  );

  test("occupancyType is optional", () => {
    expect(initiatePropertySchema.safeParse({}).success).toBe(true);
  });

  test("rejects an unknown occupancyType", () => {
    expect(initiatePropertySchema.safeParse({occupancyType: "bogus"}).success).toBe(false);
  });
});

describe("draftFieldEnvelopeSchema", () => {
  test("accepts a real propertyType with fieldName/fieldValue", () => {
    expect(draftFieldEnvelopeSchema.safeParse({
      propertyType: "detached",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 3,
    }).success).toBe(true);
  });

  test("rejects an unknown propertyType", () => {
    expect(draftFieldEnvelopeSchema.safeParse({
      propertyType: "not-a-real-type",
      fieldName: "bedroomsAboveGrade",
      fieldValue: 3,
    }).success).toBe(false);
  });

  test("requires fieldName", () => {
    expect(draftFieldEnvelopeSchema.safeParse({
      propertyType: "detached",
      fieldValue: 3,
    }).success).toBe(false);
  });

  test("rejects an empty-string fieldName (Joi.string().required() rejects \"\" by default)", () => {
    expect(draftFieldEnvelopeSchema.safeParse({
      propertyType: "detached",
      fieldName: "",
      fieldValue: 3,
    }).success).toBe(false);
  });

  test.each([0, false, ""])(
      "accepts falsy-but-present fieldValue %p (fieldValue only rejects undefined)",
      (fieldValue) => {
        expect(draftFieldEnvelopeSchema.safeParse({
          propertyType: "detached",
          fieldName: "bedroomsAboveGrade",
          fieldValue,
        }).success).toBe(true);
      },
  );

  test("rejects a missing fieldValue", () => {
    expect(draftFieldEnvelopeSchema.safeParse({
      propertyType: "detached",
      fieldName: "bedroomsAboveGrade",
    }).success).toBe(false);
  });
});

describe("selectedAddonsSchema", () => {
  const validAddonIds = Object.keys(ADDONS_BY_ID);

  test("accepts a real addon id", () => {
    expect(selectedAddonsSchema.safeParse({
      selectedAddons: [validAddonIds[0]],
    }).success).toBe(true);
  });

  test("defaults to an empty array when omitted", () => {
    const result = selectedAddonsSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.selectedAddons).toEqual([]);
  });

  test("rejects an unknown addon id", () => {
    expect(selectedAddonsSchema.safeParse({
      selectedAddons: ["not_a_real_addon"],
    }).success).toBe(false);
  });

  test("rejects duplicate addon ids", () => {
    expect(selectedAddonsSchema.safeParse({
      selectedAddons: [validAddonIds[0], validAddonIds[0]],
    }).success).toBe(false);
  });
});

describe("listingProcessPatchSchema", () => {
  test("accepts state alone", () => {
    expect(listingProcessPatchSchema.safeParse({state: {anything: "goes"}}).success).toBe(true);
  });

  test("accepts state with furthestMajorIndex inside", () => {
    expect(listingProcessPatchSchema.safeParse({
      state: {furthestMajorIndex: 2, occupancy: "owner"},
    }).success).toBe(true);
  });

  test("rejects payload without state", () => {
    expect(listingProcessPatchSchema.safeParse({}).success).toBe(false);
  });

  test("rejects non-object state", () => {
    expect(listingProcessPatchSchema.safeParse({state: "nope"}).success).toBe(false);
  });
});
