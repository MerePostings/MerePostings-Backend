const {
  assembleListingFields,
  buildFirestoreUpdate,
  extractFieldPatches,
  resolvePropertyType,
  validateFieldPatches,
} = require("../listingProcessFields");

describe("listingProcessFields", () => {
  test("extractFieldPatches flattens multiple path sections", () => {
    const patches = extractFieldPatches({
      propertyType: "detached",
      garage: {garageType: "attached", garageSpaces: 2},
      interior: {bedroomsAboveGrade: 3},
    });

    expect(patches).toEqual(expect.arrayContaining([
      {path: "garage", fieldName: "garageType", value: "attached"},
      {path: "garage", fieldName: "garageSpaces", value: 2},
      {path: "interior", fieldName: "bedroomsAboveGrade", value: 3},
    ]));
    expect(patches).toHaveLength(3);
  });

  test("validateFieldPatches rejects a field under the wrong path", () => {
    expect(() => validateFieldPatches("detached", [
      {path: "interior", fieldName: "garageType", value: "attached"},
    ])).toThrow(expect.objectContaining({statusCode: 400}));
  });

  test("validateFieldPatches rejects an invalid enum value", () => {
    try {
      validateFieldPatches("detached", [
        {path: "garage", fieldName: "garageType", value: "flying-car"},
      ]);
      throw new Error("expected throw");
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.errors[0].field).toBe("garage.garageType");
    }
  });

  test("validateFieldPatches keeps only explicitly sent object keys after Zod defaults", () => {
    const validated = validateFieldPatches("detached", [
      {path: "interior", fieldName: "bathrooms", value: {twoPiece: 0}},
    ]);

    expect(validated.interior.bathrooms).toEqual({twoPiece: 0});
  });

  test("buildFirestoreUpdate deep-merges nested objects within a path", () => {
    const update = buildFirestoreUpdate(
        {interior: {bathrooms: {twoPiece: 1, threePiece: 2}}},
        {interior: {bathrooms: {twoPiece: 0}}},
    );

    expect(update.interior.bathrooms).toEqual({twoPiece: 0, threePiece: 2});
  });

  test("assembleListingFields groups stored values by registry path", () => {
    const fields = assembleListingFields({
      propertyType: "detached",
      garage: {garageType: "attached"},
      interior: {bedroomsAboveGrade: 4},
    }, "detached");

    expect(fields.garage.garageType).toBe("attached");
    expect(fields.interior.bedroomsAboveGrade).toBe(4);
    expect(fields.top.propertyType).toBe("detached");
  });

  test("resolvePropertyType uses the listing type when omitted", () => {
    expect(resolvePropertyType({}, {propertyType: "detached"})).toBe("detached");
  });
});
