const {projectStateToProperty} = require("../projectListingState");

describe("projectStateToProperty — edge inputs", () => {
  test.each([null, undefined, "not an object", 42])(
      "returns {} for %p without throwing (typeof !== 'object' or falsy guard)",
      (input) => {
        expect(() => projectStateToProperty(input)).not.toThrow();
        expect(projectStateToProperty(input)).toEqual({});
      },
  );

  // `typeof [] === 'object'` in JS, so an array is NOT caught by the
  // `typeof state !== 'object'` guard and falls through to the same code
  // path as `{}` below — documented here rather than assumed.
  test("an array input is not caught by the object-type guard and behaves like {}", () => {
    expect(() => projectStateToProperty([])).not.toThrow();
    expect(projectStateToProperty([])).toEqual(projectStateToProperty({}));
  });

  // Regression test documenting a real bug found while writing this suite:
  // `Number(String(pd.maintenanceFee || '').replace(/[^0-9.]/g, ''))` evaluates
  // `Number('')` as `0` (not NaN), and the guard is `fee >= 0` (not `> 0`), so
  // EVERY call with no maintenanceFee at all currently writes
  // `condoDetails.maintenanceFee: 0` into the patch — silently overwriting any
  // previously-saved fee on every listing-process merge that doesn't explicitly
  // carry a maintenanceFee. Flagging this as a finding; not fixed here.
  test("an empty state object currently produces a stray condoDetails.maintenanceFee: 0 (known bug)", () => {
    expect(projectStateToProperty({})).toEqual({"condoDetails.maintenanceFee": 0});
  });
});

describe("propertyType mapping", () => {
  test.each([
    ["detached", "detached"],
    ["semi-detached", "semiDetached"],
    ["condo-apartment", "condoApartment"],
    ["condo-townhouse", "condoTownhouse"],
    ["rural", "rural"],
    ["duplex-triplex", "duplex"],
  ])("maps FE propertyType %s to BE value %s", (fe, be) => {
    const patch = projectStateToProperty({propertyType: fe});
    expect(patch.propertyType).toBe(be);
  });

  test("unrecognized propertyType does not set the patch key at all", () => {
    const patch = projectStateToProperty({propertyType: "bungalow"});
    expect("propertyType" in patch).toBe(false);
  });
});

describe("occupancy", () => {
  test.each([
    ["owner", "owner_occupied"],
    ["tenant", "tenant_occupied"],
    ["vacant", "vacant"],
  ])("maps %s to %s on both keys", (fe, be) => {
    const patch = projectStateToProperty({occupancy: fe});
    expect(patch.occupancyType).toBe(be);
    expect(patch["occupancy.occupancyStatus"]).toBe(be);
  });

  test("invalid occupancy value sets neither key", () => {
    const patch = projectStateToProperty({occupancy: "bogus"});
    expect("occupancyType" in patch).toBe(false);
    expect("occupancy.occupancyStatus" in patch).toBe(false);
  });

  test("missing occupancy sets neither key", () => {
    const patch = projectStateToProperty({});
    expect("occupancyType" in patch).toBe(false);
  });
});

describe("askingPrice", () => {
  test("valid positive number is set", () => {
    const patch = projectStateToProperty({askingPrice: 750000});
    expect(patch["pricing.askingPrice"]).toBe(750000);
  });

  test.each([0, -100, "700000"])("rejects invalid askingPrice %p", (value) => {
    const patch = projectStateToProperty({askingPrice: value});
    expect("pricing.askingPrice" in patch).toBe(false);
  });
});

describe("sellerContact", () => {
  test("fullName, email, phone are independently set and trimmed", () => {
    const patch = projectStateToProperty({
      sellerContact: {fullName: "  Jane Doe  ", email: " jane@x.com ", phone: " 555-1234 "},
    });
    expect(patch["contact.sellerFullName"]).toBe("Jane Doe");
    expect(patch["contact.sellerEmail"]).toBe("jane@x.com");
    expect(patch["contact.sellerPhone"]).toBe("555-1234");
  });

  test("omits sellerContact keys when not provided", () => {
    const patch = projectStateToProperty({sellerContact: {}});
    expect("contact.sellerFullName" in patch).toBe(false);
    expect("contact.sellerEmail" in patch).toBe(false);
    expect("contact.sellerPhone" in patch).toBe(false);
  });

  test.each([
    ["Phone Call", "phone"],
    ["phone", "phone"],
    ["Email", "email"],
    ["email", "email"],
    ["Text Message", "text"],
    ["text", "text"],
  ])("preferredContact %s maps to %s (both label and pre-mapped forms work)", (input, expected) => {
    const patch = projectStateToProperty({sellerContact: {preferredContact: input}});
    expect(patch["contact.preferredContactMethod"]).toBe(expected);
  });

  test("unrecognized preferredContact does not set the key", () => {
    const patch = projectStateToProperty({sellerContact: {preferredContact: "carrier pigeon"}});
    expect("contact.preferredContactMethod" in patch).toBe(false);
  });

  test.each([
    ["Morning", "morning"],
    ["morning", "morning"],
    ["Anytime", "anytime"],
  ])("bestTime %s maps to [%s], wrapped in an array", (input, expected) => {
    const patch = projectStateToProperty({sellerContact: {bestTime: input}});
    expect(patch["contact.bestTimesToReach"]).toEqual([expected]);
  });
});

describe("ownership", () => {
  test("boolean fields are set when typeof === 'boolean'", () => {
    const patch = projectStateToProperty({
      ownership: {isRegisteredOwner: true, hasAdditionalOwners: false},
    });
    expect(patch["ownership.isRegisteredOwner"]).toBe(true);
    expect(patch["ownership.hasAdditionalOwners"]).toBe(false);
  });

  test("a string 'true' does NOT set the flag (guards against stringly-typed input)", () => {
    const patch = projectStateToProperty({ownership: {isRegisteredOwner: "true"}});
    expect("ownership.isRegisteredOwner" in patch).toBe(false);
  });

  test("additionalOwnerNames trims and filters out blank names", () => {
    const patch = projectStateToProperty({
      ownership: {additionalOwnerNames: ["  Jane Doe  ", "   ", "", "John Smith"]},
    });
    expect(patch["ownership.additionalOwnerNames"]).toEqual(["Jane Doe", "John Smith"]);
  });

  test("additionalOwnerNames key is omitted entirely when the filtered result is empty", () => {
    const patch = projectStateToProperty({ownership: {additionalOwnerNames: ["  ", ""]}});
    expect("ownership.additionalOwnerNames" in patch).toBe(false);
  });

  test("non-array additionalOwnerNames is ignored", () => {
    const patch = projectStateToProperty({ownership: {additionalOwnerNames: "Jane Doe"}});
    expect("ownership.additionalOwnerNames" in patch).toBe(false);
  });
});

describe("mailingAddress", () => {
  test("sameAsProperty: true sets mailingAddressDifferent: false and no details key", () => {
    const patch = projectStateToProperty({
      mailingAddress: {sameAsProperty: true, street: "123 Main St"},
    });
    expect(patch["mailingAddress.mailingAddressDifferent"]).toBe(false);
    expect("mailingAddress.mailingAddressDetails" in patch).toBe(false);
  });

  test("sameAsProperty: false joins non-blank parts with ', '", () => {
    const patch = projectStateToProperty({
      mailingAddress: {
        sameAsProperty: false,
        street: "123 Main St",
        city: "Toronto",
        province: "",
        postalCode: "M1M 1M1",
      },
    });
    expect(patch["mailingAddress.mailingAddressDifferent"]).toBe(true);
    expect(patch["mailingAddress.mailingAddressDetails"]).toBe("123 Main St, Toronto, M1M 1M1");
  });

  test("sameAsProperty: false with all-blank parts omits the details key", () => {
    const patch = projectStateToProperty({
      mailingAddress: {sameAsProperty: false, street: "", city: "", province: "", postalCode: ""},
    });
    expect(patch["mailingAddress.mailingAddressDifferent"]).toBe(true);
    expect("mailingAddress.mailingAddressDetails" in patch).toBe(false);
  });

  test("missing sameAsProperty sets neither key", () => {
    const patch = projectStateToProperty({mailingAddress: {street: "123 Main St"}});
    expect("mailingAddress.mailingAddressDifferent" in patch).toBe(false);
  });
});

describe("address parsing via propertyDetails (requires addressConfirmed: true)", () => {
  test("standard 'number street, city' address", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "123 Main St, Toronto"},
    });
    expect(patch["location.streetNumber"]).toBe("123");
    expect(patch["location.streetName"]).toBe("Main St");
    expect(patch["location.municipality"]).toBe("Toronto");
    expect("location.apartmentUnitNumber" in patch).toBe(false);
  });

  test("missing municipality segment defaults to 'Unknown'", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "123 Main St"},
    });
    expect(patch["location.municipality"]).toBe("Unknown");
  });

  test("unit-prefixed address extracts apartmentUnitNumber and shifts street/municipality", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "Unit 4, 123 Main St, Toronto"},
    });
    expect(patch["location.apartmentUnitNumber"]).toBe("4");
    expect(patch["location.streetNumber"]).toBe("123");
    expect(patch["location.streetName"]).toBe("Main St");
    expect(patch["location.municipality"]).toBe("Toronto");
  });

  test("letter-suffixed street number is captured", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "123A King St, Ottawa"},
    });
    expect(patch["location.streetNumber"]).toBe("123A");
    expect(patch["location.streetName"]).toBe("King St");
  });

  test("no leading street number defaults to '0' and keeps full string as streetName", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "Main St, Toronto"},
    });
    expect(patch["location.streetNumber"]).toBe("0");
    expect(patch["location.streetName"]).toBe("Main St");
  });

  test("pd.unit overrides the parsed unit when present", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "Unit 4, 123 Main St, Toronto", unit: "7"},
    });
    expect(patch["location.apartmentUnitNumber"]).toBe("7");
  });

  test("pd.unit fills in the unit when address has none", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: true, address: "123 Main St, Toronto", unit: "9"},
    });
    expect(patch["location.apartmentUnitNumber"]).toBe("9");
  });

  test("addressConfirmed: false sets no location keys, regardless of address", () => {
    const patch = projectStateToProperty({
      propertyDetails: {addressConfirmed: false, address: "123 Main St, Toronto"},
    });
    expect("location.streetNumber" in patch).toBe(false);
  });

  test("addressConfirmed absent sets no location keys", () => {
    const patch = projectStateToProperty({
      propertyDetails: {address: "123 Main St, Toronto"},
    });
    expect("location.streetNumber" in patch).toBe(false);
  });
});

describe("numeric coercions", () => {
  test("floorNumber accepts a numeric string", () => {
    const patch = projectStateToProperty({propertyDetails: {floorNumber: "5"}});
    expect(patch["condoDetails.floorNumber"]).toBe(5);
  });

  test("floorNumber accepts an already-numeric value", () => {
    const patch = projectStateToProperty({propertyDetails: {floorNumber: 12}});
    expect(patch["condoDetails.floorNumber"]).toBe(12);
  });

  test("floorNumber rejects a non-numeric string", () => {
    const patch = projectStateToProperty({propertyDetails: {floorNumber: "top floor"}});
    expect("condoDetails.floorNumber" in patch).toBe(false);
  });

  test("approxSqft strips currency formatting and parses", () => {
    const patch = projectStateToProperty({propertyDetails: {approxSqft: "$1,200.50"}});
    expect(patch["condoDetails.squareFootage"]).toBe(1200.5);
  });

  test("approxSqft of 0 is rejected (sqft must be > 0)", () => {
    const patch = projectStateToProperty({propertyDetails: {approxSqft: "0"}});
    expect("condoDetails.squareFootage" in patch).toBe(false);
  });

  test("maintenanceFee of 0 IS allowed (fee must be >= 0, not > 0 — deliberate asymmetry with sqft)", () => {
    const patch = projectStateToProperty({propertyDetails: {maintenanceFee: "0"}});
    expect(patch["condoDetails.maintenanceFee"]).toBe(0);
  });

  test("maintenanceFee strips currency formatting and parses", () => {
    const patch = projectStateToProperty({propertyDetails: {maintenanceFee: "$450.00"}});
    expect(patch["condoDetails.maintenanceFee"]).toBe(450);
  });
});

describe("selectedAddons and saleType passthrough", () => {
  test("selectedAddons array passes through as-is", () => {
    const patch = projectStateToProperty({selectedAddons: ["professional_photography"]});
    expect(patch.selectedAddons).toEqual(["professional_photography"]);
  });

  test("non-array selectedAddons is dropped", () => {
    const patch = projectStateToProperty({selectedAddons: "professional_photography"});
    expect("selectedAddons" in patch).toBe(false);
  });

  test("truthy saleType passes through", () => {
    const patch = projectStateToProperty({saleType: "private"});
    expect(patch.saleType).toBe("private");
  });

  test("falsy saleType is dropped", () => {
    const patch = projectStateToProperty({saleType: ""});
    expect("saleType" in patch).toBe(false);
  });
});

describe("feature mapping by property type", () => {
  const selected = ["renovated-kitchen", "deck-patio", "not-a-real-id"];

  test("detached and semiDetached both map shared interiorFeatures/basementFeatures identically", () => {
    const detached = projectStateToProperty({
      propertyType: "detached",
      featuresUpgrades: {selected},
    });
    const semiDetached = projectStateToProperty({
      propertyType: "semi-detached",
      featuresUpgrades: {selected},
    });

    expect(detached["features.interiorFeatures"]).toEqual(["renovated_kitchen"]);
    expect(semiDetached["features.interiorFeatures"]).toEqual(["renovated_kitchen"]);
    expect(detached["basement.basementFeatures"]).toEqual([]);
    expect(semiDetached["basement.basementFeatures"]).toEqual([]);
  });

  test("detached-only: exterior.exteriorFeatures excludes end-unit", () => {
    const patch = projectStateToProperty({
      propertyType: "detached",
      featuresUpgrades: {selected: [...selected, "end-unit"]},
    });
    expect(patch["exterior.exteriorFeatures"]).toEqual(["deck_patio"]);
    expect("exterior.outdoorFeatures" in patch).toBe(false);
  });

  test("semiDetached-only: exterior.outdoorFeatures includes end-unit under a different key name", () => {
    const patch = projectStateToProperty({
      propertyType: "semi-detached",
      featuresUpgrades: {selected: [...selected, "end-unit"]},
    });
    expect(patch["exterior.outdoorFeatures"]).toEqual(expect.arrayContaining(["deck_patio", "end_unit"]));
    expect("exterior.exteriorFeatures" in patch).toBe(false);
  });

  test("condoApartment and condoTownhouse both map suiteFeatures/buildingAmenities identically", () => {
    const condoSelected = ["c-renovated-kitchen", "c-concierge", "bogus"];

    const condoApartment = projectStateToProperty({
      propertyType: "condo-apartment",
      featuresUpgrades: {selected: condoSelected},
    });
    const condoTownhouse = projectStateToProperty({
      propertyType: "condo-townhouse",
      featuresUpgrades: {selected: condoSelected},
    });

    expect(condoApartment["features.suiteFeatures"]).toEqual(["renovated_kitchen"]);
    expect(condoTownhouse["features.suiteFeatures"]).toEqual(["renovated_kitchen"]);
    expect(condoApartment["amenities.buildingAmenities"]).toEqual(["concierge"]);
    expect(condoTownhouse["amenities.buildingAmenities"]).toEqual(["concierge"]);
  });

  test.each(["rural", "duplex-triplex"])(
      "%s does not set any of the detached/condo feature keys",
      (feType) => {
        const patch = projectStateToProperty({
          propertyType: feType,
          featuresUpgrades: {selected: ["renovated-kitchen", "c-concierge"]},
        });
        expect("features.interiorFeatures" in patch).toBe(false);
        expect("exterior.exteriorFeatures" in patch).toBe(false);
        expect("exterior.outdoorFeatures" in patch).toBe(false);
        expect("features.suiteFeatures" in patch).toBe(false);
        expect("amenities.buildingAmenities" in patch).toBe(false);
      },
  );

  test("unrecognized propertyType sets no feature keys at all", () => {
    const patch = projectStateToProperty({
      propertyType: "houseboat",
      featuresUpgrades: {selected: ["renovated-kitchen"]},
    });
    expect(Object.keys(patch).some((k) => k.startsWith("features.") || k.startsWith("exterior."))).toBe(false);
  });

  test("garbage ids not present in FEATURE_ID are silently dropped, not thrown", () => {
    expect(() =>
      projectStateToProperty({
        propertyType: "detached",
        featuresUpgrades: {selected: ["totally-made-up-id"]},
      }),
    ).not.toThrow();
  });
});

describe("featuresUpgrades — garage/heating/improvements", () => {
  test("garage and frontYardParking map through FEATURE_ID", () => {
    const patch = projectStateToProperty({
      featuresUpgrades: {garage: "2-car", frontYardParking: "fy-2"},
    });
    expect(patch["garage.garageType"]).toBe("2_car");
    expect(patch["garage.frontYardParking"]).toBe("2_vehicles");
  });

  test("unrecognized garage value does not set the key", () => {
    const patch = projectStateToProperty({featuresUpgrades: {garage: "flying-car"}});
    expect("garage.garageType" in patch).toBe(false);
  });

  test("heating maps through FEATURE_ID and heatingOther is trimmed", () => {
    const patch = projectStateToProperty({
      featuresUpgrades: {heating: "heat-pump", heatingOther: "  wood stove  "},
    });
    expect(patch["heating.heatingType"]).toBe("heat_pump");
    expect(patch["heating.heatingTypeOther"]).toBe("wood stove");
  });

  test("recentImprovements is trimmed and set", () => {
    const patch = projectStateToProperty({
      featuresUpgrades: {recentImprovements: "  new roof 2023  "},
    });
    expect(patch["improvements.recentImprovements"]).toBe("new roof 2023");
  });

  test("blank recentImprovements does not set the key", () => {
    const patch = projectStateToProperty({featuresUpgrades: {recentImprovements: "   "}});
    expect("improvements.recentImprovements" in patch).toBe(false);
  });
});

describe("buyerCopy", () => {
  test("highlights takes priority over propertyDetails.buyersLove", () => {
    const patch = projectStateToProperty({
      buyerCopy: {highlights: "Bright and spacious"},
      propertyDetails: {buyersLove: "Should not be used"},
    });
    expect(patch["buyerInfo.buyersWillLove"]).toBe("Bright and spacious");
  });

  test("falls back to propertyDetails.buyersLove when highlights is absent", () => {
    const patch = projectStateToProperty({
      propertyDetails: {buyersLove: "Great natural light"},
    });
    expect(patch["buyerInfo.buyersWillLove"]).toBe("Great natural light");
  });

  test("inclusions/exclusions/rentalItems are trimmed and independently optional", () => {
    const patch = projectStateToProperty({
      buyerCopy: {inclusions: " fridge ", exclusions: " chandelier ", rentalItems: " hot water tank "},
    });
    expect(patch["buyerInfo.includedItems"]).toBe("fridge");
    expect(patch["buyerInfo.excludedItems"]).toBe("chandelier");
    expect(patch["buyerInfo.rentalItemsEquipment"]).toBe("hot water tank");
  });

  test("blank rentalItems does not set the key", () => {
    const patch = projectStateToProperty({buyerCopy: {rentalItems: "   "}});
    expect("buyerInfo.rentalItemsEquipment" in patch).toBe(false);
  });
});

describe("basics passthrough", () => {
  test("bedrooms/bathrooms/parking/locker/layout are set when present", () => {
    const patch = projectStateToProperty({
      propertyDetails: {bedrooms: 3, bathrooms: 2, parking: "2", locker: true, layout: "2_bedroom"},
    });
    expect(patch["basics.bedrooms"]).toBe(3);
    expect(patch["basics.bathrooms"]).toBe(2);
    expect(patch["basics.parkingSpacesIncluded"]).toBe("2");
    expect(patch["basics.lockerIncluded"]).toBe(true);
    expect(patch["basics.layoutBedroomsDen"]).toBe("2_bedroom");
  });

  test("non-numeric bedrooms/bathrooms are ignored", () => {
    const patch = projectStateToProperty({propertyDetails: {bedrooms: "three"}});
    expect("basics.bedrooms" in patch).toBe(false);
  });
});
