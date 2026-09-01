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

  test("aliases resolve the same field definitions as their underlying type", () => {
    expect(getFieldDefinition("stackedTownhouse", "townhouseConfiguration")).toEqual(
        getFieldDefinition("condoTownhouse", "townhouseConfiguration"),
    );
    expect(getFieldDefinition("coOperativeApartment", "bedroomDenConfiguration")).toEqual(
        getFieldDefinition("condoApartment", "bedroomDenConfiguration"),
    );
  });
});

describe("getFieldDefinition — type-specific fields", () => {
  test("detached.bedroomsAboveGrade resolves with its own path/schema", () => {
    const def = getFieldDefinition("detached", "bedroomsAboveGrade");
    expect(def).not.toBeNull();
    expect(def.path).toBe("interior");
    expect(def.dbKey).toBe("bedroomsAboveGrade");
    expect(def.schema.safeParse(20).success).toBe(true);
    expect(def.schema.safeParse(21).success).toBe(false);
  });

  test("semiDetached has attachedSide, detached does not", () => {
    const semiDef = getFieldDefinition("semiDetached", "attachedSide");
    const detachedDef = getFieldDefinition("detached", "attachedSide");

    expect(semiDef).not.toBeNull();
    expect(semiDef.schema.safeParse("left").success).toBe(true);
    expect(semiDef.schema.safeParse("upstairs").success).toBe(false);
    expect(detachedDef).toBeNull();
  });

  // PDF audit finding: PAGE SD-04 lists "Private rear yard: Yes/No" as a
  // semi-specific field alongside the shared exterior/lot shell — Detached
  // has no equivalent field.
  test("semiDetached has privateRearYard, detached does not", () => {
    const semiDef = getFieldDefinition("semiDetached", "privateRearYard");
    const detachedDef = getFieldDefinition("detached", "privateRearYard");

    expect(semiDef).not.toBeNull();
    expect(semiDef.path).toBe("exterior");
    expect(semiDef.schema.safeParse(true).success).toBe(true);
    expect(semiDef.schema.safeParse("yes").success).toBe(false);
    expect(detachedDef).toBeNull();
  });

  test("GARAGE_OPTIONS-style flat enum has been replaced by a structured garage/parking component", () => {
    const def = getFieldDefinition("detached", "garageType");
    expect(def).not.toBeNull();
    expect(def.path).toBe("garage");
    expect(def.schema.safeParse("attached").success).toBe(true);
    expect(def.schema.safeParse("2_car").success).toBe(false); // old GARAGE_OPTIONS value, no longer valid

    // Companion fields that make up the new component.
    expect(getFieldDefinition("detached", "hasGarage")).not.toBeNull();
    expect(getFieldDefinition("detached", "drivewayType").schema.safeParse("mutual").success).toBe(true);
    expect(getFieldDefinition("detached", "totalParkingSpaces").schema.safeParse(4).success).toBe(true);
  });

  test("bathrooms are a structured piece-count object, not a bare number", () => {
    const def = getFieldDefinition("detached", "bathrooms");
    expect(def.path).toBe("interior");
    expect(def.schema.safeParse({twoPiece: 1, fourPiece: 1, ensuite: 1}).success).toBe(true);
    expect(def.schema.safeParse(3).success).toBe(false); // old bare-number shape is now invalid
    expect(def.schema.safeParse({twoPiece: -1}).success).toBe(false);
  });

  test("condoApartment.bedroomDenConfiguration and bedrooms are both present", () => {
    const denConfig = getFieldDefinition("condoApartment", "bedroomDenConfiguration");
    const bedrooms = getFieldDefinition("condoApartment", "bedrooms");

    expect(denConfig.schema.safeParse("2_bedroom_den").success).toBe(true);
    expect(denConfig.schema.safeParse("mansion").success).toBe(false);
    expect(bedrooms.schema.safeParse(2).success).toBe(true);
  });

  test("rural.ruralPropertySubtype is required and type-only", () => {
    const def = getFieldDefinition("rural", "ruralPropertySubtype");
    expect(def.schema.safeParse(undefined).success).toBe(false);
    expect(def.schema.safeParse("hobby_farm").success).toBe(true);
    expect(getFieldDefinition("detached", "ruralPropertySubtype")).toBeNull();
  });

  test("rural.outbuildings is a repeatable structure, capped at 15", () => {
    const def = getFieldDefinition("rural", "outbuildings");
    const validOutbuilding = {
      structureType: "barn",
      approximateSize: "20x30",
      electricity: true,
      water: false,
      heating: false,
      insulated: "not_sure",
      currentUse: "Storage",
      additionalDescription: "Older barn",
    };
    expect(def.schema.safeParse([
      validOutbuilding,
      {...validOutbuilding, structureType: "workshop"},
    ]).success).toBe(true);
    expect(def.schema.safeParse([{...validOutbuilding, structureType: "spaceship"}]).success).toBe(false);
    expect(def.schema.safeParse(Array(16).fill(validOutbuilding)).success).toBe(false);
  });

  test("duplex.propertyConfiguration only accepts duplex or triplex", () => {
    const def = getFieldDefinition("duplex", "propertyConfiguration");
    expect(def.schema.safeParse("duplex").success).toBe(true);
    expect(def.schema.safeParse("triplex").success).toBe(true);
    expect(def.schema.safeParse("fourplex").success).toBe(false);
  });

  test("duplex.units is a repeatable per-unit object (max 3), not aggregate totals", () => {
    const def = getFieldDefinition("duplex", "units");
    expect(getFieldDefinition("duplex", "totalBedrooms")).toBeNull();

    const validUnit = {
      unitIdentifier: "Unit 1",
      floorLocation: "Main floor",
      bedrooms: 2,
      bathrooms: {twoPiece: 1},
      kitchen: true,
      livingRoom: true,
      diningArea: true,
      laundry: "private",
      separateEntrance: true,
      approxUnitSize: "800 sqft",
      currentOccupancy: "tenant_occupied",
      additionalUnitFeatures: "Updated kitchen",
      tenancy: {
        tenancyType: "month_to_month",
        currentMonthlyRent: 1800,
        utilitiesIncluded: ["heat"],
        tenantPaysUtilities: ["hydro"],
        vacantPossessionIntended: "no",
      },
    };

    expect(def.schema.safeParse([
      validUnit,
      {...validUnit, unitIdentifier: "Unit 2", bedrooms: 1},
    ]).success).toBe(true);

    // Max 3 units (duplex/triplex only).
    expect(def.schema.safeParse([validUnit, validUnit, validUnit, validUnit]).success).toBe(false);
    // Bad nested tenancy value is caught.
    expect(
        def.schema.safeParse([
          {...validUnit, tenancy: {...validUnit.tenancy, tenancyType: "week_to_week"}},
        ]).success,
    ).toBe(false);
  });

  test("condoTownhouse.townhouseConfiguration captures conventional/stacked/back_to_back", () => {
    const def = getFieldDefinition("condoTownhouse", "townhouseConfiguration");
    expect(def.schema.safeParse("stacked").success).toBe(true);
    expect(def.schema.safeParse("duplex").success).toBe(false);
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
    expect(propertyTypeFields.detached.bedroomsAboveGrade).toBeDefined();
    expect(commonFields.bedroomsAboveGrade).toBeUndefined();
    expect(getFieldDefinition("detached", "bedroomsAboveGrade")).toEqual(
        expect.objectContaining({path: propertyTypeFields.detached.bedroomsAboveGrade.path}),
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
    expect(getFieldDefinition("not-a-type", "bedroomsAboveGrade")).toBeNull();
  });

  test("known propertyType with unknown fieldName returns null", () => {
    expect(getFieldDefinition("detached", "not-a-real-field")).toBeNull();
  });
});

describe("getFieldDefinition — dbKey defaults", () => {
  test("dbKey defaults to fieldName when not explicitly set", () => {
    const def = getFieldDefinition("detached", "bedroomsAboveGrade");
    expect(def.dbKey).toBe("bedroomsAboveGrade");
  });
});

describe("commonFields — occupancy and common merge-point pages", () => {
  test("occupancyPathway accepts the four decision-page choices", () => {
    expect(commonFields.occupancyPathway.schema.safeParse("i_know_what_i_need").success).toBe(true);
    expect(commonFields.occupancyPathway.schema.safeParse("landlord").success).toBe(false);
  });

  test("nearbyFeatures is a multi-select against the known checklist", () => {
    expect(commonFields.nearbyFeatures.schema.safeParse(["waterfront", "golf"]).success).toBe(true);
    expect(commonFields.nearbyFeatures.schema.safeParse(["moon_base"]).success).toBe(false);
  });

  test("rentedLeasedItems is a repeatable object, not one field per item type", () => {
    expect(commonFields.rentedLeasedItems.schema.safeParse([
      {item: "Hot water heater", provider: "Reliance", approxPayment: 45.99, buyoutKnown: "not_sure"},
    ]).success).toBe(true);
    expect(commonFields.rentedLeasedItems.schema.safeParse([{provider: "Reliance"}]).success).toBe(false); // item required
  });
});

describe("commonFields — required plain strings reject empty string", () => {
  // Joi.string().required() rejects "" by default, independent of
  // .required() itself. A bare z.string() would not — this pins the .min(1)
  // fix down so a future edit can't silently drop it again.
  test.each(["streetNumber", "streetName", "municipality", "buyersWillLove", "sellerFullName", "sellerPhone"])(
      "%s rejects an empty string",
      (fieldName) => {
        expect(commonFields[fieldName].schema.safeParse("").success).toBe(false);
      },
  );
});

describe("nested repeatable-object required strings reject empty string", () => {
  test("otherPrincipalRooms.roomType rejects an empty string", () => {
    const def = getFieldDefinition("detached", "otherPrincipalRooms");
    expect(def.schema.safeParse([{roomType: "", notes: "Bright"}]).success).toBe(false);
    expect(def.schema.safeParse([{roomType: "Sunroom", notes: "Bright"}]).success).toBe(true);
  });

  test("rentedLeasedItems.item rejects an empty string", () => {
    expect(
        commonFields.rentedLeasedItems.schema.safeParse([
          {item: "", provider: "Reliance", approxPayment: 45.99, buyoutKnown: "not_sure"},
        ]).success,
    ).toBe(false);
    expect(
        commonFields.rentedLeasedItems.schema.safeParse([
          {item: "Hot water heater", provider: "Reliance", approxPayment: 45.99, buyoutKnown: "not_sure"},
        ]).success,
    ).toBe(true);
  });
});

describe("object-shaped fields reject unknown keys (.strict(), no stripUnknown override here)", () => {
  // validateDraftField.js calls fieldDef.schema.safeParse(fieldValue) directly,
  // with no equivalent of middlewares/validate.js's stripUnknown:true — so
  // unlike Tasks 2-5's schemas, an unrecognized key here must be rejected,
  // not silently stripped.
  test("detached.bathrooms rejects an unrecognized key", () => {
    const def = getFieldDefinition("detached", "bathrooms");
    expect(def.schema.safeParse({twoPiece: 1, sixPiece: 1}).success).toBe(false);
    expect(def.schema.safeParse({twoPiece: 1}).success).toBe(true);
  });

  test("duplex.units rejects an unrecognized key on a unit, and on its nested tenancy object", () => {
    const def = getFieldDefinition("duplex", "units");
    const validUnit = {
      unitIdentifier: "Unit 1",
      floorLocation: "Main floor",
      bedrooms: 2,
      bathrooms: {twoPiece: 1},
      kitchen: true,
      livingRoom: true,
      diningArea: true,
      laundry: "private",
      separateEntrance: true,
      approxUnitSize: "800 sqft",
      currentOccupancy: "tenant_occupied",
      additionalUnitFeatures: "Updated kitchen",
      tenancy: {
        tenancyType: "month_to_month",
        currentMonthlyRent: 1800,
        utilitiesIncluded: ["heat"],
        tenantPaysUtilities: ["hydro"],
        vacantPossessionIntended: "no",
      },
    };
    expect(def.schema.safeParse([{...validUnit, notAField: true}]).success).toBe(false);
    expect(
        def.schema.safeParse([
          {...validUnit, tenancy: {...validUnit.tenancy, notAField: true}},
        ]).success,
    ).toBe(false);
    expect(def.schema.safeParse([validUnit]).success).toBe(true);
  });

  test("ownership.lawyer still allows unknown keys (kept .passthrough(), matching original .unknown(true))", () => {
    expect(commonFields.lawyer.schema.safeParse({
      fullName: "Jane Doe",
      firm: "Doe Law",
      email: "lawyer@example.com",
      phone: "4165551234",
      lawSocietyNumber: "12345",
      represents: "registered-owner",
      contactAuthorized: true,
      extraField: "ok",
    }).success).toBe(true);
  });
});

describe("commonFields Joi/Zod boundary values", () => {
  test.each([1, 1_000_000_000_000])("askingPrice accepts %p", (value) => {
    expect(commonFields.askingPrice.schema.safeParse(value).success).toBe(true);
  });

  test.each([0, -1, 1_000_000_000_001])("askingPrice rejects %p", (value) => {
    expect(commonFields.askingPrice.schema.safeParse(value).success).toBe(false);
  });

  test("preferredContactMethod only accepts the defined enum", () => {
    expect(commonFields.preferredContactMethod.schema.safeParse("phone").success).toBe(true);
    expect(commonFields.preferredContactMethod.schema.safeParse("carrier_pigeon").success).toBe(false);
  });

  test.each(["fixed_term", "month_to_month", "vacant_possession_on_closing"])(
      "tenancyPossession accepts %s",
      (value) => {
        expect(commonFields.tenancyPossession.schema.safeParse(value).success).toBe(true);
      },
  );

  test("tenancyPossession rejects an unknown value", () => {
    expect(commonFields.tenancyPossession.schema.safeParse("week_to_week").success).toBe(false);
  });

  test("fixedTermUntil accepts an ISO date string", () => {
    expect(commonFields.fixedTermUntil.schema.safeParse("2027-06-30").success).toBe(true);
    expect(commonFields.fixedTermUntil.schema.safeParse("June 30").success).toBe(false);
  });

  test("leaseAgreementAvailable accepts boolean", () => {
    expect(commonFields.leaseAgreementAvailable.schema.safeParse(true).success).toBe(true);
    expect(commonFields.leaseAgreementAvailable.schema.safeParse("yes").success).toBe(false);
  });
});

describe("commonFields Joi/Zod parity regression tests", () => {
  // Task 6 bug fix #1: additionalOwnerNames array items now correctly reject empty strings.
  test("additionalOwnerNames rejects an empty-string array item", () => {
    expect(commonFields.additionalOwnerNames.schema.safeParse([""]).success).toBe(false);
  });

  test("additionalOwnerNames accepts a valid non-empty name", () => {
    expect(commonFields.additionalOwnerNames.schema.safeParse(["Jane Doe"]).success).toBe(true);
  });

  // Every field in the registry is now required, no exceptions — the "" escape
  // hatches these fields used to carry (for parity with old Joi .allow("", null)
  // behavior) were removed, so "" is rejected exactly like any other missing value.
  test("fixedTermUntil rejects an empty string", () => {
    expect(commonFields.fixedTermUntil.schema.safeParse("").success).toBe(false);
  });

  test("fixedTermUntil rejects a malformed non-empty date", () => {
    expect(commonFields.fixedTermUntil.schema.safeParse("not-a-date").success).toBe(false);
  });

  test("fixedTermUntil still accepts a valid ISO date", () => {
    expect(commonFields.fixedTermUntil.schema.safeParse("2027-01-01").success).toBe(true);
  });

  const validLawyer = {
    fullName: "Jane Doe",
    firm: "Doe Law",
    email: "lawyer@example.com",
    phone: "4165551234",
    lawSocietyNumber: "12345",
    represents: "registered-owner",
    contactAuthorized: true,
  };

  test("lawyer.email rejects an empty string", () => {
    expect(commonFields.lawyer.schema.safeParse({...validLawyer, email: ""}).success).toBe(false);
  });

  test("lawyer.email rejects a malformed non-empty email", () => {
    expect(commonFields.lawyer.schema.safeParse({...validLawyer, email: "not-an-email"}).success).toBe(false);
  });

  // TLD-plausibility parity fix: Zod's own email format check doesn't
  // validate the TLD, so "seller@gmail.con" would otherwise slip through.
  test("lawyer.email rejects an email with an implausible TLD", () => {
    expect(commonFields.lawyer.schema.safeParse({...validLawyer, email: "seller@gmail.con"}).success).toBe(false);
  });

  test("sellerEmail accepts a normal valid email", () => {
    expect(commonFields.sellerEmail.schema.safeParse("seller@gmail.com").success).toBe(true);
  });

  test("sellerEmail rejects an email with an implausible TLD", () => {
    expect(commonFields.sellerEmail.schema.safeParse("seller@gmail.con").success).toBe(false);
  });

  test("lawyer.represents rejects an empty string", () => {
    expect(commonFields.lawyer.schema.safeParse({...validLawyer, represents: ""}).success).toBe(false);
  });

  test("lawyer.represents rejects an invalid non-empty enum value", () => {
    expect(commonFields.lawyer.schema.safeParse({...validLawyer, represents: "bogus"}).success).toBe(false);
  });

  test("lawyer accepts a fully valid object", () => {
    expect(commonFields.lawyer.schema.safeParse(validLawyer).success).toBe(true);
  });
});
