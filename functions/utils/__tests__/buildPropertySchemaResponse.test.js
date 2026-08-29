const {buildPropertySchemaResponse} = require("../buildPropertySchemaResponse");

describe("buildPropertySchemaResponse", () => {
  const result = buildPropertySchemaResponse();

  test("lists every known property type, including aliases", () => {
    expect(result.propertyTypes).toEqual(expect.arrayContaining([
      "detached", "semiDetached", "condoApartment", "condoTownhouse",
      "rural", "duplex", "stackedTownhouse", "coOperativeApartment",
    ]));
  });

  test("commonFields includes askingPrice with its path/dbKey and a JSON Schema", () => {
    const field = result.commonFields.askingPrice;
    expect(field.path).toBe("pricing");
    expect(field.dbKey).toBe("askingPrice");
    expect(field.schema.type).toBe("number");
  });

  test("commonFields.sellerEmail publishes format: 'email' (not dropped by the TLD-plausibility refine)", () => {
    expect(result.commonFields.sellerEmail.schema.format).toBe("email");
  });

  test("detached.garageType is an enum JSON Schema, no longer a bare GARAGE_OPTIONS list", () => {
    const field = result.propertyTypeFields.detached.garageType;
    expect(field.path).toBe("garage");
    expect(field.schema.enum).toEqual(
        expect.arrayContaining(["attached", "detached", "built_in", "carport", "other"]),
    );
    expect(field.schema.enum).not.toContain("2_car");
  });

  test("detached.bathrooms is an object JSON Schema with piece-count properties", () => {
    const field = result.propertyTypeFields.detached.bathrooms;
    expect(field.schema.type).toBe("object");
    expect(Object.keys(field.schema.properties)).toEqual(
        expect.arrayContaining(["twoPiece", "threePiece", "fourPiece", "fivePiecePlus", "ensuite"]),
    );
  });

  test("duplex.units is an array JSON Schema, not aggregate total fields", () => {
    const field = result.propertyTypeFields.duplex.units;
    expect(field.path).toBe("units");
    expect(field.schema.type).toBe("array");
    expect(result.propertyTypeFields.duplex.totalBedrooms).toBeUndefined();
  });

  test("every property type's fields resolve to a JSON Schema (no fields silently dropped)", () => {
    for (const propertyType of result.propertyTypes) {
      const fields = result.propertyTypeFields[propertyType];
      expect(Object.keys(fields).length).toBeGreaterThan(0);
      for (const [fieldName, field] of Object.entries(fields)) {
        expect(field.schema).toBeDefined();
        expect(typeof field.path).toBe("string");
        expect(field.dbKey).toBe(fieldName);
      }
    }
  });

  test("calling buildPropertySchemaResponse() twice returns an equivalently-structured (memoized) result", () => {
    const first = buildPropertySchemaResponse();
    const second = buildPropertySchemaResponse();

    expect(second).toBe(first); // memoized: same object reference, not just deep-equal
    expect(second).toEqual(first);
  });

  test("$schema appears once at the top level, not duplicated on every field", () => {
    expect(result.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(result.commonFields.askingPrice.schema.$schema).toBeUndefined();
    expect(result.propertyTypeFields.detached.garageType.schema.$schema).toBeUndefined();
  });

  test("bathrooms piece-count fields are not marked required (input-mode JSON Schema)", () => {
    const field = result.propertyTypeFields.detached.bathrooms;
    expect(field.schema.required || []).not.toEqual(
        expect.arrayContaining(["twoPiece", "threePiece", "fourPiece", "fivePiecePlus", "ensuite"]),
    );
    // still describes each field, just doesn't force it on the input side
    expect(Object.keys(field.schema.properties)).toEqual(
        expect.arrayContaining(["twoPiece", "threePiece", "fourPiece", "fivePiecePlus", "ensuite"]),
    );
  });

  test("feeFrequency (a top-level field with .default()) still resolves to a sensible JSON Schema", () => {
    const field = result.propertyTypeFields.condoApartment.feeFrequency;
    expect(field.schema.enum).toEqual(expect.arrayContaining(["monthly", "other"]));
    expect(field.schema.default).toBe("monthly");
  });

  test("the cached response is deep-frozen so a caller can't mutate it and corrupt future responses", () => {
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.propertyTypes)).toBe(true);
    expect(Object.isFrozen(result.commonFields)).toBe(true);
    expect(Object.isFrozen(result.commonFields.askingPrice)).toBe(true);
    expect(Object.isFrozen(result.commonFields.askingPrice.schema)).toBe(true);

    expect(() => {
      "use strict";
      result.propertyTypes.push("fake");
    }).toThrow(TypeError);

    expect(result.propertyTypes).not.toContain("fake");
  });
});
