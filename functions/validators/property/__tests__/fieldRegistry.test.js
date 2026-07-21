const {
  getFieldDefinition,
  isValidPropertyType,
  propertyTypeFields,
  commonFields,
} = require("../fieldRegistry");

const CANONICAL_TYPES = [
  "detached",
  "semiDetached",
  "condoApartment",
  "condoTownhouse",
  "rural",
  "duplex",
];
const ALIAS_TYPES = ["stackedTownhouse", "coOperativeApartment"];

describe("isValidPropertyType", () => {
  test.each([...CANONICAL_TYPES, ...ALIAS_TYPES])("%s is valid", (type) => {
    expect(isValidPropertyType(type)).toBe(true);
  });

  test("rejects an unknown type", () => {
    expect(isValidPropertyType("bogus")).toBe(false);
  });

  test("rejects undefined", () => {
    expect(isValidPropertyType(undefined)).toBe(false);
  });
});

describe("aliases reuse the underlying type's field map", () => {
  test("stackedTownhouse aliases condoTownhouse", () => {
    expect(propertyTypeFields.stackedTownhouse).toBe(propertyTypeFields.condoTownhouse);
  });

  test("coOperativeApartment aliases condoApartment", () => {
    expect(propertyTypeFields.coOperativeApartment).toBe(propertyTypeFields.condoApartment);
  });
});

describe("getFieldDefinition — type-specific fields", () => {
  test("detached.bedrooms resolves with its own path/schema", () => {
    const def = getFieldDefinition("detached", "bedrooms");
    expect(def).not.toBeNull();
    expect(def.path).toBe("basics");
    expect(def.dbKey).toBe("bedrooms");
    expect(def.schema.validate(20).error).toBeUndefined();
    expect(def.schema.validate(21).error).toBeDefined();
  });

  test("semiDetached.outdoorFeatures includes end_unit (detached.exteriorFeatures does not)", () => {
    const semiDef = getFieldDefinition("semiDetached", "outdoorFeatures");
    const detachedDef = getFieldDefinition("detached", "exteriorFeatures");

    expect(semiDef.schema.validate(["end_unit"]).error).toBeUndefined();
    expect(detachedDef.schema.validate(["end_unit"]).error).toBeDefined();
  });

  test("condoApartment.bathrooms caps at 10, detached.bathrooms caps at 20", () => {
    const condoBathrooms = getFieldDefinition("condoApartment", "bathrooms");
    const detachedBathrooms = getFieldDefinition("detached", "bathrooms");

    expect(condoBathrooms.schema.validate(10).error).toBeUndefined();
    expect(condoBathrooms.schema.validate(11).error).toBeDefined();
    expect(detachedBathrooms.schema.validate(11).error).toBeUndefined();
    expect(detachedBathrooms.schema.validate(20).error).toBeUndefined();
    expect(detachedBathrooms.schema.validate(21).error).toBeDefined();
  });

  test("rural.ruralPropertySubtype is required and type-only", () => {
    const def = getFieldDefinition("rural", "ruralPropertySubtype");
    expect(def.schema.validate(undefined).error).toBeDefined();
    expect(def.schema.validate("hobby_farm").error).toBeUndefined();
    expect(getFieldDefinition("detached", "ruralPropertySubtype")).toBeNull();
  });

  test("duplex.numberOfUnits only accepts the two defined values", () => {
    const def = getFieldDefinition("duplex", "numberOfUnits");
    expect(def.schema.validate("duplex_2_units").error).toBeUndefined();
    expect(def.schema.validate("fourplex").error).toBeDefined();
  });

  test("aliases resolve the same field definitions as their underlying type", () => {
    expect(getFieldDefinition("stackedTownhouse", "maintenanceFee")).toEqual(
        getFieldDefinition("condoTownhouse", "maintenanceFee"),
    );
    expect(getFieldDefinition("coOperativeApartment", "layoutBedroomsDen")).toEqual(
        getFieldDefinition("condoApartment", "layoutBedroomsDen"),
    );
  });
});

describe("getFieldDefinition — common-field fallback", () => {
  test.each(CANONICAL_TYPES)("%s falls back to the common askingPrice field", (type) => {
    const def = getFieldDefinition(type, "askingPrice");
    expect(def).not.toBeNull();
    expect(def.path).toBe("pricing");
  });

  test.each(CANONICAL_TYPES)("%s falls back to the common municipality field", (type) => {
    const def = getFieldDefinition(type, "municipality");
    expect(def.path).toBe("location");
  });

  // No field name currently exists in both a per-type map and commonFields, so
  // there's no real-world collision to exercise "type overrides common" against.
  // This test instead pins down the implementation's precedence directly.
  test("precedence is type-specific first, common second (typeFields[x] || commonFields[x])", () => {
    expect(propertyTypeFields.detached.bedrooms).toBeDefined();
    expect(commonFields.bedrooms).toBeUndefined();
    expect(getFieldDefinition("detached", "bedrooms")).toEqual(
        expect.objectContaining({path: propertyTypeFields.detached.bedrooms.path}),
    );
  });
});

describe("getFieldDefinition — unknown combinations", () => {
  // typeFields defaults to {} for an unknown propertyType (not null), so lookup
  // still falls through to commonFields — an unknown type only returns null when
  // the fieldName isn't a common field either.
  test("unknown propertyType still resolves a common field name via fallback", () => {
    expect(getFieldDefinition("not-a-type", "askingPrice")).not.toBeNull();
  });

  test("unknown propertyType with a type-specific-only fieldName returns null", () => {
    expect(getFieldDefinition("not-a-type", "bedrooms")).toBeNull();
  });

  test("known propertyType with unknown fieldName returns null", () => {
    expect(getFieldDefinition("detached", "not-a-real-field")).toBeNull();
  });
});

describe("getFieldDefinition — dbKey defaults", () => {
  test("dbKey defaults to fieldName when not explicitly set", () => {
    const def = getFieldDefinition("detached", "bedrooms");
    expect(def.dbKey).toBe("bedrooms");
  });
});

describe("commonFields Joi boundary values", () => {
  test.each([1, 1_000_000_000_000])("askingPrice accepts %p", (value) => {
    expect(commonFields.askingPrice.schema.validate(value).error).toBeUndefined();
  });

  test.each([0, -1, 1_000_000_000_001])("askingPrice rejects %p", (value) => {
    expect(commonFields.askingPrice.schema.validate(value).error).toBeDefined();
  });

  test("preferredContactMethod only accepts the defined enum", () => {
    expect(commonFields.preferredContactMethod.schema.validate("phone").error).toBeUndefined();
    expect(commonFields.preferredContactMethod.schema.validate("carrier_pigeon").error).toBeDefined();
  });
});
