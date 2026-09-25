const {
  getFieldDefinition,
  isValidPropertyType,
  propertyTypeFields,
  propertyTypeSections,
  commonFields,
  submissionRules,
} = require("../fieldRegistry");

const CANONICAL_TYPES = [
  "detached",
  "semiDetached",
  "condoApartment",
  "condoTownhouse",
  "rural",
  "residentialIncome",
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
    expect(getFieldDefinition("coOperativeApartment", "bedrooms")).toEqual(
        getFieldDefinition("condoApartment", "bedrooms"),
    );
    // Don't let the assertion above pass because both sides are null.
    expect(getFieldDefinition("coOperativeApartment", "bedrooms")).not.toBeNull();
  });
});

describe("getFieldDefinition — type-specific fields", () => {
  test("semiDetached.bedroomsAboveGrade resolves with its own path/schema", () => {
    const def = getFieldDefinition("semiDetached", "bedroomsAboveGrade");
    expect(def).not.toBeNull();
    expect(def.path).toBe("interior");
    expect(def.dbKey).toBe("bedroomsAboveGrade");
    expect(def.schema.safeParse(20).success).toBe(true);
    expect(def.schema.safeParse(21).success).toBe(false);
  });

  test("duplex is gone — replaced by residentialIncome", () => {
    expect(isValidPropertyType("duplex")).toBe(false);
    expect(getFieldDefinition("duplex", "units")).toBeNull();
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
    expect(propertyTypeFields.semiDetached.bedroomsAboveGrade).toBeDefined();
    expect(commonFields.bedroomsAboveGrade).toBeUndefined();
    expect(getFieldDefinition("semiDetached", "bedroomsAboveGrade")).toEqual(
        expect.objectContaining({path: propertyTypeFields.semiDetached.bedroomsAboveGrade.path}),
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
    const def = getFieldDefinition("semiDetached", "bedroomsAboveGrade");
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
  test("residentialIncome.units rejects an unrecognized key on a unit", () => {
    const def = getFieldDefinition("residentialIncome", "units");
    expect(def.schema.safeParse([{bedrooms: "2", notAField: true}]).success).toBe(false);
    expect(def.schema.safeParse([{bedrooms: "2"}]).success).toBe(true);
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

describe("residentialIncome", () => {
  const def = (fieldName) => getFieldDefinition("residentialIncome", fieldName);

  test("fields are grouped into the seven mockup pages plus the shared sale-items page, in order", () => {
    expect(propertyTypeSections.residentialIncome.map((s) => s.title)).toEqual([
      "Income Property Configuration",
      "Unit Basics",
      "Exterior & Outdoor Features",
      "Utilities & Building Systems",
      "Location & Nearby Features",
      "Tenancy Information",
      "Tell Buyers About Your Property",
      "Items Included, Not Included & Rental Items",
    ]);
  });

  test("every field's path belongs to exactly one section", () => {
    const sectionPaths = propertyTypeSections.residentialIncome.flatMap((s) => s.paths);
    for (const field of Object.values(propertyTypeFields.residentialIncome)) {
      expect(sectionPaths.filter((p) => p === field.path)).toHaveLength(1);
    }
  });

  test("only fields marked (Optional) in the mockups are optional", () => {
    const optional = Object.entries(propertyTypeFields.residentialIncome)
        .filter(([, field]) => field.schema.isOptional())
        .map(([fieldName]) => fieldName);
    expect(optional).toEqual(["idealBuyer", "additionalComments", "itemsExcluded"]);
  });

  test("draft saves accept empty text and empty selections (presence is checked at submission)", () => {
    expect(def("propertyHighlights").schema.safeParse("").success).toBe(true);
    expect(def("nearbyAmenities").schema.safeParse([]).success).toBe(true);
    expect(def("units").schema.safeParse([{}]).success).toBe(true);
  });

  test("text fields enforce the mockups' character limits", () => {
    expect(def("propertyHighlights").schema.safeParse("x".repeat(1000)).success).toBe(true);
    expect(def("propertyHighlights").schema.safeParse("x".repeat(1001)).success).toBe(false);
    expect(def("idealBuyer").schema.safeParse("x".repeat(501)).success).toBe(false);
  });

  test("\"None\" can't be combined with other options", () => {
    expect(def("deckPatioBalcony").schema.safeParse(["none"]).success).toBe(true);
    expect(def("deckPatioBalcony").schema.safeParse(["deck", "none"]).success).toBe(false);
    expect(def("otherExteriorFeatures").schema.safeParse(["shed", "none"]).success).toBe(false);
    const tenantPaidUtilities = def("unitTenancies").itemFields.tenantPaidUtilities.schema;
    expect(tenantPaidUtilities.safeParse(["heat", "none"]).success).toBe(false);
  });

  test("multi-selects reject repeated options", () => {
    expect(def("exteriorConstruction").schema.safeParse(["brick", "brick"]).success).toBe(false);
  });

  test("year built can't be in the future", () => {
    const year = new Date().getFullYear();
    expect(def("approxYearBuilt").schema.safeParse(year).success).toBe(true);
    expect(def("approxYearBuilt").schema.safeParse(year + 1).success).toBe(false);
    expect(def("approxYearBuilt").schema.safeParse(1990.5).success).toBe(false);
  });

  test("lease end date must be a real calendar date", () => {
    const leaseEndDate = def("unitTenancies").itemFields.leaseEndDate.schema;
    expect(leaseEndDate.safeParse("2027-04-30").success).toBe(true);
    expect(leaseEndDate.safeParse("2027-02-30").success).toBe(false);
    expect(leaseEndDate.safeParse("Apr 30, 2027").success).toBe(false);
  });

  test("option values match the mockups", () => {
    expect(def("unitCount").optionValues).toEqual(["duplex", "triplex", "fourplex", "multi_unit"]);
    expect(def("garageType").optionLabels.built_in_underneath).toBe("Built-in (underneath)");
    expect(def("drivewayType").optionValues).toEqual(["none", "single", "double", "circular", "laneway"]);
    expect(def("units").itemFields.position.optionValues).toEqual([
      "main_floor", "upper_floor", "lower_level", "front", "rear", "apartment_unit_number",
    ]);
    expect(def("units").itemFields.bathrooms.optionValues).toEqual(["1", "1.5", "2", "2.5", "3", "4_plus"]);
  });

  test("conditional fields declare when they apply", () => {
    expect(def("garageSpaces").requiredWhen).toEqual({field: "garageType", notIn: ["none"]});
    expect(def("unitTenancies").itemFields.leaseEndDate.requiredWhen)
        .toEqual({field: "tenancyType", in: ["fixed_term"]});
    expect(def("units").itemFields.location.requiredWhen).toEqual({itemIndex: {gte: 2}});
  });

  test("requiredWhen only references fields declared earlier (evaluation is in order)", () => {
    const referencedFields = (condition) => condition.anyOf ?
      condition.anyOf.flatMap(referencedFields) :
      (condition.field ? [condition.field] : []);
    const assertOrder = (fields) => {
      const seen = [];
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.requiredWhen) {
          for (const ref of referencedFields(field.requiredWhen)) expect(seen).toContain(ref);
        }
        if (field.itemFields) assertOrder(field.itemFields);
        seen.push(fieldName);
      }
    };
    assertOrder(propertyTypeFields.residentialIncome);
  });

  test("a required list starts with at least one entry (an empty list counts as missing)", () => {
    const offenders = [];
    for (const type of CANONICAL_TYPES) {
      for (const [name, def] of Object.entries(propertyTypeFields[type])) {
        if (!def.itemFields || def.schema.isOptional()) continue;
        if (!def.ui?.initialItems && !def.ui?.mirrorsListOf && !def.ui?.entriesFor) offenders.push(`${type}.${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("submission rules are registered for the rebuilt types only", () => {
    expect(Object.keys(submissionRules)).toEqual([
      "residentialIncome", "detached", "semiDetached", "rural", "condoApartment", "condoTownhouse",
      "coOperativeApartment", "stackedTownhouse",
    ]);
  });
});

describe("detached (final mockups)", () => {
  const def = (fieldName) => getFieldDefinition("detached", fieldName);

  test("pages follow the mockups, ending with the shared Final Listing Information pages", () => {
    expect(propertyTypeSections.detached.map((s) => s.title)).toEqual([
      "Exterior & Lot",
      "Parking & Outdoor Areas",
      "Inside the Home",
      "Basement",
      "Help Us Prepare Your Listing Remarks",
      "Items Included, Not Included & Rental Items",
    ]);
    expect(propertyTypeSections.detached.slice(-2).map((s) => s.stage)).toEqual(["finalListing", "finalListing"]);
  });

  test("every field's path belongs to exactly one section, and every card lists real fields", () => {
    const sections = propertyTypeSections.detached;
    const sectionPaths = sections.flatMap((s) => s.paths);
    for (const field of Object.values(propertyTypeFields.detached)) {
      expect(sectionPaths.filter((p) => p === field.path)).toHaveLength(1);
    }
    for (const section of sections) {
      const grouped = section.groups.flatMap((g) => g.fields || []);
      const onPage = Object.entries(propertyTypeFields.detached)
          .filter(([, f]) => section.paths.includes(f.path))
          .map(([name]) => name);
      expect(grouped).toEqual(onPage);
    }
  });

  test("only fields marked (Optional) or 'if known' are optional", () => {
    const optional = Object.entries(propertyTypeFields.detached)
        .filter(([, field]) => field.schema.isOptional())
        .map(([fieldName]) => fieldName);
    expect(optional).toEqual(["additionalRemarks", "itemsExcluded"]);
  });

  test("follow-up questions only apply after a Yes", () => {
    expect(def("drivewayType").requiredWhen).toEqual({field: "hasDriveway", in: [true]});
    expect(def("indoorParkingSpaces").requiredWhen).toEqual({field: "hasGarage", in: [true]});
    expect(def("fireplaceTypes").requiredWhen).toEqual({field: "hasFireplace", in: [true]});
    expect(def("apartmentKitchenStyle").requiredWhen).toEqual({field: "basementApartment", in: [true]});
    expect(def("basementFinish").requiredWhen).toEqual({field: "hasBasement", in: [true]});
    expect(def("interiorFeaturesOther").requiredWhen)
        .toEqual({field: "interiorFeatures", includes: "something_else"});
  });

  test("\"None\" options can't be combined with others", () => {
    expect(def("yardOutdoorFeatures").schema.safeParse(["deck", "none"]).success).toBe(false);
    expect(def("interiorFeatures").schema.safeParse(["none"]).success).toBe(true);
    expect(def("propertySetting").schema.safeParse(["corner_lot", "none_not_sure"]).success).toBe(false);
    expect(def("rentalItems").schema.safeParse(["hot_water_tank", "none"]).success).toBe(false);
  });

  test("rental item details are keyed by the ticked rental item", () => {
    const details = def("rentalItemDetails");
    expect(details.entriesFor).toBe("rentalItems");
    expect(details.schema.safeParse({hot_water_tank: {company: "Reliance"}}).success).toBe(true);
    expect(details.schema.safeParse({spaceship: {}}).success).toBe(false);
    expect(details.itemFields.company.requiredWhen).toEqual({field: "detailsUnavailable", ne: true});
    expect(details.itemFields.otherDescription.requiredWhen).toEqual({itemKey: {in: ["other"]}});
    expect(details.itemFields.agreement.schema.safeParse({url: "https://x.test/a.pdf", fileName: "a.pdf"}).success)
        .toBe(true);
  });

  test("the shared final pages are on every type without its own; residential income only takes the items page", () => {
    expect(propertyTypeSections.detached.slice(-2).map((s) => s.id)).toEqual(["listing-remarks", "sale-items"]);
    expect(getFieldDefinition("condoTownhouse", "buyerHighlights")).toBeNull();
    expect(propertyTypeSections.residentialIncome.map((s) => s.id)).not.toContain("listing-remarks");
    expect(propertyTypeSections.residentialIncome.at(-1).id).toBe("sale-items");
  });
});

describe("semiDetached (final mockups)", () => {
  const def = (fieldName) => getFieldDefinition("semiDetached", fieldName);
  const sections = propertyTypeSections.semiDetached;

  test("pages follow the mockups, ending with its own Final Listing Information pages", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "Exterior & Lot",
      "Parking & Outdoor Areas",
      "Inside the Home",
      "Home Systems & Utilities",
      "Basement & Lower Level",
      "Additional Living Spaces",
      "Location Highlights",
      "Listing Remarks & Inclusions",
    ]);
    expect(sections.filter((s) => s.stage === "finalListing").map((s) => s.id))
        .toEqual(["location-highlights", "remarks-inclusions"]);
    expect(def("buyerHighlights")).toBeNull(); // detached's shared remarks page isn't used here
  });

  test("every card lists exactly its page's fields, in order", () => {
    const fields = propertyTypeFields.semiDetached;
    for (const section of sections) {
      const onPage = Object.entries(fields).filter(([, f]) => section.paths.includes(f.path)).map(([name]) => name);
      expect(section.groups.flatMap((g) => g.fields || [])).toEqual(onPage);
    }
  });

  test("Exterior & Lot reuses detached's page minus the additional-building card, with a type badge", () => {
    const exterior = sections[0];
    expect(exterior.groups.map((g) => g.title)).toEqual(["About the home", "Approximate lot size", "Property setting"]);
    expect(exterior.groups[0].badge).toBe("Property type: Semi-Detached");
    expect(def("additionalBuildingOrLivingSpace")).toBeNull();
    expect(def("homeStyle").schema).toBe(getFieldDefinition("detached", "homeStyle").schema);
  });

  test("hot water equipment was removed from the systems page", () => {
    expect(def("hotWaterOwnership")).toBeNull();
    expect(def("hotWaterSystem").optionValues).toEqual(["tank", "tankless", "other", "not_sure"]);
  });

  test("the systems dropdowns all offer Not sure", () => {
    for (const name of ["primaryHeatingSystem", "heatingFuel", "coolingSystem", "additionalHeating",
      "waterSource", "sewageSystem", "electricalService", "hotWaterSystem"]) {
      expect(def(name).optionValues).toContain("not_sure");
    }
  });

  test("follow-ups only apply after the answer that reveals them", () => {
    expect(def("drivewayArrangement").requiredWhen).toEqual({field: "hasDriveway", in: [true]});
    expect(def("garageSharedWithAdjoining").requiredWhen).toEqual({field: "hasGarage", in: [true]});
    expect(def("basementAccess").requiredWhen).toEqual({field: "hasBasement", in: [true]});
    expect(def("separateUnitStatus").requiredWhen).toEqual({field: "basementSeparateUnit", in: ["yes"]});
    expect(def("additionalSpaceTypes").requiredWhen).toEqual({field: "hasAdditionalLivingSpace", in: [true]});
    expect(def("excludedFixturesList").requiredWhen).toEqual({field: "excludedFixtures", in: ["yes"]});
    expect(def("rentedItems").requiredWhen).toEqual({field: "rentedEquipment", in: [true]});
    expect(def("otherNotableSetting").requiredWhen).toEqual({field: "settingSurroundings", includes: "other_notable_setting"});
  });

  test("rented items are a simple list of item types (no \"none\" option in the dropdown)", () => {
    const rented = def("rentedItems");
    expect(rented.ui).toMatchObject({compactItems: true, initialItems: 1, addLabel: "Add another item"});
    expect(rented.itemFields.item.optionValues).not.toContain("none");
    expect(rented.itemFields.item.optionValues).toContain("hot_water_tank");
    expect(rented.itemFields.otherDescription.requiredWhen).toEqual({field: "item", in: ["other"]});
  });

  test("remarks are capped at the mockup's 1,500 characters", () => {
    expect(def("clientRemarks").schema.safeParse("x".repeat(1500)).success).toBe(true);
    expect(def("clientRemarks").schema.safeParse("x".repeat(1501)).success).toBe(false);
  });
});

describe("rural (final mockups)", () => {
  const def = (fieldName) => getFieldDefinition("rural", fieldName);
  const fields = propertyTypeFields.rural;
  const sections = propertyTypeSections.rural;

  test("pages follow the mockups; the last two are Final Listing Information", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "Exterior & Property Basics",
      "Interior Details",
      "Basement / Additional Living Spaces",
      "Outbuildings & Land Features",
      "Location & Nearby Features",
      "Listing Description & Included Items",
    ]);
    expect(sections.filter((s) => s.stage === "finalListing").map((s) => s.id))
        .toEqual(["location-nearby", "listing-description"]);
    expect(def("buyerHighlights")).toBeNull();
  });

  test("every card lists exactly its page's fields, in order", () => {
    for (const section of sections) {
      const onPage = Object.entries(fields).filter(([, f]) => section.paths.includes(f.path)).map(([name]) => name);
      expect(section.groups.flatMap((g) => g.fields || [])).toEqual(onPage);
    }
  });

  test("only the fields starred in the mockups (plus 'specify' follow-ups) are required", () => {
    const required = Object.entries(fields).filter(([, f]) => !f.schema.isOptional()).map(([name]) => name);
    expect(required).toEqual([
      "ruralPropertyType", "acreage", "roadAccessType", "nearestTown", "exteriorConstruction",
      "bedrooms", "bathrooms", "heatingType", "waterSource", "sewerSeptic", "laundryLocation",
      "basementType", "additionalSpacesDescription", "outbuildingDetails",
      "drivewayType", "drivewaySurface", "parkingCapacity",
      "otherIncludedItems", "otherRuralItems",
    ]);
  });

  test("duplicated questions were dropped as agreed", () => {
    for (const gone of ["civicAddress", "internetAvailability", "hotWaterTank", "washerDryerIncluded",
      "nearestTownLocation", "yearRoundRoadAccess"]) {
      expect(def(gone)).toBeNull();
    }
    expect(def("utilitiesAtProperty").optionValues).not.toContain("internet_available");
  });

  test("numbers with units are stored as a value plus a unit drawn inside it", () => {
    expect(def("acreage").ui.unitField).toBe("acreageUnit");
    expect(def("acreageUnit")).toMatchObject({ui: {renderedBy: "acreage"}});
    expect(def("acreageUnit").optionValues).toEqual(["acres", "hectares"]);
    expect(def("distanceToTownUnit").optionValues).toEqual(["km", "mi"]);
  });

  test("the rest of the basement only applies when there is one; suite follow-ups only after Yes", () => {
    expect(def("basementFinish").requiredWhen).toEqual({field: "basementType", notIn: ["slab_none"]});
    expect(def("apartmentLegalStatus").requiredWhen).toEqual({field: "basementApartment", in: ["yes"]});
    expect(def("additionalSpacesDescription").requiredWhen).toEqual({field: "additionalLivingSpaces", includes: "other"});
  });

  test("outbuildings are tick cards with their details drawn inside each card", () => {
    expect(def("outbuildings").ui).toMatchObject({control: "detailCards", inlineDetails: "outbuildingDetails"});
    const details = def("outbuildingDetails");
    expect(details.entriesFor).toBe("outbuildings");
    expect(details.ui.renderedBy).toBe("outbuildings");
    expect(details.itemFields.garageType.requiredWhen).toEqual({itemKey: {in: ["garage"]}});
    expect(details.itemFields.size.ui.labelByKey.barn).toBe("Barn Size (Approx.)");
    expect(details.itemFields.description.requiredWhen).toEqual({itemKey: {in: ["other"]}});
  });

  test("location page fields are icon tiles with distance dropdowns", () => {
    expect(def("schoolsDistance").ui).toMatchObject({control: "select", icon: "graduation-cap"});
    expect(def("publicTransitDistance").optionValues).toContain("not_available");
    expect(def("internetProvider").ui.attachTo).toBe("internetService");
  });
});

describe("condoApartment (final mockups)", () => {
  const def = (fieldName) => getFieldDefinition("condoApartment", fieldName);
  const fields = propertyTypeFields.condoApartment;
  const sections = propertyTypeSections.condoApartment;

  test("pages follow the mockups; the last two are Final Listing Information", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "Tell us about your condominium",
      "Parking & Locker Details",
      "Condominium Corporation & Fees",
      "Interior Rooms & Features",
      "Building Amenities & Services",
      "Condominium Rules & Restrictions",
      "Occupancy & Tenancy",
      "Location & Nearby Features",
      "Listing Description & Inclusions",
    ]);
    expect(sections.filter((s) => s.stage === "finalListing").map((s) => s.id))
        .toEqual(["location-nearby", "listing-description"]);
    expect(def("buyerHighlights")).toBeNull();
    expect(propertyTypeFields.coOperativeApartment).toBe(fields);
  });

  test("every card lists exactly its page's fields, in order", () => {
    for (const section of sections) {
      const onPage = Object.entries(fields).filter(([, f]) => section.paths.includes(f.path)).map(([name]) => name);
      expect(section.groups.flatMap((g) => g.fields || [])).toEqual(onPage);
    }
  });

  test("starred fields and the questions that open them are required; the rest are optional", () => {
    const required = Object.entries(fields)
        .filter(([, f]) => !f.schema.isOptional() && !f.requiredWhen)
        .map(([name]) => name);
    expect(required).toEqual([
      "squareFootage", "squareFootageSource", "parkingIncluded", "lockerIncluded", "condoCorporation", "monthlyFee",
      "hasSpecialAssessment", "bedrooms", "fullBathrooms", "hasOtherAmenity", "petsPermitted", "bbqPermitted",
      "hasOtherBalconyRestrictions", "smokingVapingRules", "longTermLeasing", "shortTermRentals",
      "hasOtherRestrictions", "currentOccupancy", "hasOtherNearbyFeature", "clientRemarks", "hasExcludedFixtures",
      "hasRentedItems",
    ]);
    expect(def("buildingStoreys").schema.isOptional()).toBe(true);
    expect(def("parkingSpaces").itemFields.evCharger.schema.isOptional()).toBe(true);
    expect(def("parkingSpaces").itemFields.spaceNumber.schema.isOptional()).toBe(false);
  });

  test("'Ensuite laundry' is only asked by the Laundry cards", () => {
    expect(def("principalRooms").optionValues).not.toContain("ensuite_laundry");
    expect(def("laundry").optionValues).toEqual(["ensuite", "shared_building", "none"]);
  });

  test("parking and lockers are card lists with a count dropdown", () => {
    expect(def("parkingSpaces")).toMatchObject({
      maxItems: 4,
      requiredWhen: {field: "parkingIncluded", in: [true]},
      ui: {countLabel: "Number of parking spaces", initialItems: 1, itemTitle: "Parking Space {n}"},
    });
    expect(def("lockers").maxItems).toBe(3);
    const locker = def("lockers").itemFields;
    expect(locker.lockerNumber.requiredWhen).toEqual({field: "lockerLocation", ne: "inside_unit"});
    expect(locker.lockerLocationOther.requiredWhen).toEqual({field: "lockerLocation", in: ["other"]});
    expect(def("parkingSpaces").itemFields.parkingTypeOther.requiredWhen).toEqual({field: "parkingType", in: ["other"]});
  });

  test("every Restricted answer opens required details", () => {
    for (const [field, details] of [
      ["petsPermitted", "petRestrictionDetails"], ["bbqPermitted", "bbqRestrictionDetails"],
      ["smokingVapingRules", "smokingVapingDetails"], ["longTermLeasing", "longTermLeasingDetails"],
      ["shortTermRentals", "shortTermRentalDetails"],
    ]) {
      expect(def(details).requiredWhen).toEqual({field, in: ["restricted"]});
      expect(def(details).schema.isOptional()).toBe(false);
    }
    expect(def("balconyRestrictionDetails").requiredWhen).toEqual({field: "hasOtherBalconyRestrictions", in: [true]});
  });

  test("tenancy questions only apply to a tenanted unit and start from step 4's answers", () => {
    expect(def("tenancySituation").requiredWhen).toEqual({field: "currentOccupancy", in: ["tenanted"]});
    expect(def("tenantRemainsAfterClosing").requiredWhen).toEqual({allOf: [
      {field: "currentOccupancy", in: ["tenanted"]},
      {field: "tenancySituation", ne: "vacant_possession"},
    ]});
    expect(def("currentOccupancy").ui.prefillFrom).toEqual({
      listingState: "occupancy", map: {tenant: "tenanted", vacant: "vacant_possession"},
    });
    expect(def("tenancySituation").ui.prefillFrom.listingState).toBe("tenancy.possession");
  });

  test("the inclusions start from page 4's appliances, which share their option values", () => {
    expect(def("includedItems").ui.prefillFrom).toEqual({field: "appliances"});
    for (const value of def("appliances").optionValues) {
      expect(def("includedItems").optionValues).toContain(value);
    }
  });

  test("option lists keep their on-screen order", () => {
    expect(def("bedrooms").optionValues).toEqual(["0", "1", "2", "3", "4", "5_plus"]);
    expect(def("bedrooms").optionLabels["0"]).toBe("Studio");
    expect(def("unitLevel").optionValues.slice(0, 3)).toEqual(["ground", "1", "2"]);
    expect(def("unitLevel").optionValues.at(-1)).toBe("penthouse");
  });

  test("shapes: month, phone, exclusive None", () => {
    expect(def("assessmentEndDate").schema.safeParse("2027-06").success).toBe(true);
    expect(def("assessmentEndDate").schema.safeParse("06/2027").success).toBe(false);
    expect(def("managementTelephone").schema.safeParse("(416) 555-0199 ext. 12").success).toBe(true);
    expect(def("managementTelephone").schema.safeParse("call me").success).toBe(false);
    expect(def("privateOutdoorSpace").schema.safeParse(["balcony", "none"]).success).toBe(false);
  });

  test("the unit level can't be above the building's storeys", () => {
    const [rule] = submissionRules.condoApartment;
    expect(rule({buildingStoreys: "10", unitLevel: "12"})).toEqual([expect.objectContaining({field: "unitLevel"})]);
    expect(rule({buildingStoreys: "10", unitLevel: "10"})).toEqual([]);
    expect(rule({buildingStoreys: "10", unitLevel: "penthouse"})).toEqual([]);
    expect(rule({unitLevel: "12"})).toEqual([]);
  });
});

describe("condoTownhouse (final mockups, per configuration)", () => {
  const def = (fieldName) => getFieldDefinition("condoTownhouse", fieldName);
  const fields = propertyTypeFields.condoTownhouse;
  const sections = propertyTypeSections.condoTownhouse;
  const flow = (config) => sections.filter((s) => !s.when || conditionHoldsFor(s.when, config)).map((s) => s.id);
  // Minimal evaluator for section conditions, which only look at page 1.
  function conditionHoldsFor(condition, config, hasBasement = true) {
    if (condition.allOf) return condition.allOf.every((c) => conditionHoldsFor(c, config, hasBasement));
    const value = condition.field === "townhouseConfiguration" ? config : hasBasement;
    if ("ne" in condition) return value !== condition.ne;
    return condition.in.includes(value);
  }

  test("page 1 asks the configuration; each configuration then gets its own pages", () => {
    expect(sections[0]).toMatchObject({id: "unit-basics", groupsTitle: "Townhouse Configuration & Unit Basics"});
    expect(sections[0].when).toBeUndefined();
    expect(def("townhouseConfiguration").optionValues)
        .toEqual(["traditional", "back_to_back", "bungalow"]);
    const traditional = [
      "unit-basics", "exterior-outdoor", "parking-locker", "interior-rooms", "basement", "corporation-fees",
      "building-amenities", "rules-restrictions", "occupancy-tenancy", "location-nearby", "listing-description",
    ];
    expect(flow("traditional")).toEqual(traditional);
    expect(flow("bungalow")).toEqual([
      "unit-basics", "bungalow-exterior", "bungalow-interior", "bungalow-basement", "bungalow-parking",
      "bungalow-location", "bungalow-description",
    ]);
    expect(flow("back_to_back")).toEqual([
      "unit-basics", "b2b-basics", "b2b-parking", "b2b-interior", "b2b-basement", "b2b-systems", "b2b-condo",
      "b2b-location", "b2b-description",
    ]);
  });

  test("the last two pages of every flow are Final Listing Information", () => {
    const finals = sections.filter((s) => s.stage === "finalListing").map((s) => s.id);
    expect(finals).toEqual([
      "location-nearby", "listing-description", "bungalow-location", "bungalow-description", "b2b-location",
      "b2b-description",
    ]);
  });

  test("the Basement page only follows a Yes on page 1", () => {
    const basement = sections.find((s) => s.id === "basement");
    expect(basement.when.allOf[1]).toEqual({field: "hasBasement", in: [true]});
  });

  test("a page's condition is folded into each of its fields' conditions", () => {
    expect(def("bgBedrooms").requiredWhen).toEqual({field: "townhouseConfiguration", in: ["bungalow"]});
    expect(def("bbBedroomsBelowGrade").requiredWhen).toEqual({allOf: [
      {field: "townhouseConfiguration", in: ["back_to_back"]},
      {field: "bbLevelStatus", in: ["partially_finished", "finished"]},
    ]});
    // Condo Apartment's shared definitions aren't changed.
    expect(def("condoCorporation").requiredWhen).toBeDefined();
    expect(getFieldDefinition("condoApartment", "condoCorporation").requiredWhen).toBeUndefined();
  });

  test("every card lists its page's fields", () => {
    for (const section of sections) {
      const onPage = Object.entries(fields).filter(([, f]) => section.paths.includes(f.path)).map(([name]) => name);
      expect([...section.groups.flatMap((g) => g.fields || [])].sort()).toEqual([...onPage].sort());
    }
  });

  test("agreed duplicates are gone", () => {
    expect(def("additionalRooms").optionValues).not.toContain("upper_floor_laundry");
    expect(def("basementRooms").optionValues).not.toContain("laundry");
    expect(def("bgWasherDryerIncluded")).toBeNull();
    expect(def("bgRentalEquipment")).toBeNull();
    expect(def("bgParkingTypes").optionValues).not.toContain("visitor_parking");
    expect(def("bbStreetSetting").optionValues).not.toContain("visitor_parking");
  });

  test("options that depend on earlier answers", () => {
    expect(def("interiorFeatures").ui.optionWhen).toEqual({
      direct_garage_access: {field: "garageType", in: ["attached", "built_in"]},
    });
    expect(def("laundryLocation").ui.optionWhen).toEqual({basement: {field: "hasBasement", in: [true]}});
  });

  test("answers carried forward within a flow", () => {
    expect(def("bgHasBasement").ui.prefillFrom.field).toBe("bgLevels");
    expect(def("bgChattels").ui.prefillFrom.field).toBe("bgAppliances");
    expect(def("bbRentedItems").ui.prefillFrom).toEqual({field: "bbEquipmentOwnership", whereValue: "rented"});
    expect(def("includedItems").ui.prefillFrom).toEqual({field: "appliances"});
  });

  test("the equipment table is stored {equipment: ownership}", () => {
    const table = def("bbEquipmentOwnership");
    expect(table.ui.control).toBe("matrix");
    expect(table.schema.safeParse({furnace: "rented", hot_water_tank: "owned"}).success).toBe(true);
    expect(table.schema.safeParse({furnace: "leased"}).success).toBe(false);
  });

  test("the old stackedTownhouse type key keeps working for existing drafts", () => {
    expect(propertyTypeFields.stackedTownhouse).toBe(fields);
    expect(propertyTypeSections.stackedTownhouse).toBe(sections);
  });
});
