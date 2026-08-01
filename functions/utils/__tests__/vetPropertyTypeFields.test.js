const {vetPropertyTypeFields} = require("../vetPropertyTypeFields");

describe("vetPropertyTypeFields — unknown/missing propertyType", () => {
  test("passes propertyDetails/featuresUpgrades through unchanged for an unrecognized propertyType", () => {
    const propertyDetails = {address: "1 Main St", duplex: {unitCount: "duplex"}};
    const featuresUpgrades = {selected: ["d-garage-parking"], garage: "1_car"};

    const result = vetPropertyTypeFields("bungalow", propertyDetails, featuresUpgrades);

    expect(result).toEqual({propertyDetails, featuresUpgrades});
  });

  test("passes through unchanged when propertyType is missing entirely", () => {
    const propertyDetails = {address: "1 Main St"};
    const featuresUpgrades = {garage: "1_car"};

    const result = vetPropertyTypeFields(undefined, propertyDetails, featuresUpgrades);

    expect(result).toEqual({propertyDetails, featuresUpgrades});
  });

  test("defaults missing propertyDetails/featuresUpgrades to {} rather than throwing", () => {
    expect(() => vetPropertyTypeFields("detached", undefined, undefined)).not.toThrow();
    expect(vetPropertyTypeFields("detached", undefined, undefined)).toEqual({
      propertyDetails: {},
      featuresUpgrades: {},
    });
  });
});

describe("vetPropertyTypeFields — propertyDetails key filtering", () => {
  test("detached: keeps house keys, drops duplex/rural/condo-only keys", () => {
    const propertyDetails = {
      address: "1 Main St",
      unit: null,
      addressConfirmed: true,
      bedrooms: 3,
      bathrooms: 2,
      parking: "2",
      buyersLove: "Great yard",
      // stale leftovers from a previous property-type selection:
      layout: "2_bedroom",
      floorNumber: 5,
      approxSqft: "1200",
      maintenanceFee: "450",
      outdoorSpace: "balcony",
      locker: true,
      rural: {subtype: "hobby_farm"},
      duplex: {unitCount: "duplex"},
    };

    const {propertyDetails: cleaned} = vetPropertyTypeFields("detached", propertyDetails, {});

    expect(cleaned).toEqual({
      address: "1 Main St",
      unit: null,
      addressConfirmed: true,
      bedrooms: 3,
      bathrooms: 2,
      parking: "2",
      buyersLove: "Great yard",
    });
  });

  test("condo-apartment: keeps condo keys (parkingSelect), drops house's plain parking key", () => {
    const propertyDetails = {
      address: "1 Main St",
      layout: "2_bedroom",
      bathroomsSelect: "2",
      parkingSelect: "1",
      parking: "2", // stale house-shaped key
      locker: true,
      floorNumber: 5,
      approxSqft: "1200",
      maintenanceFee: "450",
      outdoorSpace: "balcony",
      buyersLove: "Great view",
      duplex: {unitCount: "duplex"},
    };

    const {propertyDetails: cleaned} = vetPropertyTypeFields("condo-apartment", propertyDetails, {});

    expect(cleaned).toEqual({
      address: "1 Main St",
      layout: "2_bedroom",
      bathroomsSelect: "2",
      parkingSelect: "1",
      locker: true,
      floorNumber: 5,
      approxSqft: "1200",
      maintenanceFee: "450",
      outdoorSpace: "balcony",
      buyersLove: "Great view",
    });
  });

  test("condo-townhouse: keeps plain parking key, not parkingSelect", () => {
    const propertyDetails = {
      layout: "2_bedroom",
      bathroomsSelect: "2",
      parking: "1",
      parkingSelect: "1", // stale condo-apartment-shaped key
      locker: true,
      buyersLove: "Nice",
    };

    const {propertyDetails: cleaned} = vetPropertyTypeFields("condo-townhouse", propertyDetails, {});

    expect(cleaned).toEqual({
      layout: "2_bedroom",
      bathroomsSelect: "2",
      parking: "1",
      locker: true,
      buyersLove: "Nice",
    });
  });

  test("rural: keeps the nested rural object, drops the nested duplex object and unused house/condo keys", () => {
    const propertyDetails = {
      address: "1 Main St",
      bedrooms: 3,
      bathrooms: 2,
      rural: {subtype: "hobby_farm", acreage: "10"},
      duplex: {unitCount: "duplex"}, // stale from a prior duplex-triplex selection
      buyersLove: "stale house field",
      layout: "stale condo field",
    };

    const {propertyDetails: cleaned} = vetPropertyTypeFields("rural", propertyDetails, {});

    expect(cleaned).toEqual({
      address: "1 Main St",
      bedrooms: 3,
      bathrooms: 2,
      rural: {subtype: "hobby_farm", acreage: "10"},
    });
  });

  test("duplex-triplex: keeps the nested duplex object, drops the nested rural object and top-level bedrooms/bathrooms", () => {
    const propertyDetails = {
      address: "1 Main St",
      bedrooms: 3, // stale from a prior detached selection
      duplex: {unitCount: "duplex", totalBedrooms: "4"},
      rural: {subtype: "hobby_farm"}, // stale from a prior rural selection
    };

    const {propertyDetails: cleaned} = vetPropertyTypeFields("duplex-triplex", propertyDetails, {});

    expect(cleaned).toEqual({
      address: "1 Main St",
      duplex: {unitCount: "duplex", totalBedrooms: "4"},
    });
  });
});

describe("vetPropertyTypeFields — featuresUpgrades key filtering", () => {
  test("semi-detached: keeps frontYardParking (unlike detached), drops condo-only outdoorSpace", () => {
    const featuresUpgrades = {
      selected: [],
      garage: "1_car",
      frontYardParking: "1_vehicle",
      heating: "forced_air_gas",
      heatingOther: "",
      outdoorSpace: "balcony", // stale condo-shaped key
      recentImprovements: "New roof",
    };

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("semi-detached", {}, featuresUpgrades);

    expect(cleaned).toEqual({
      selected: [],
      garage: "1_car",
      frontYardParking: "1_vehicle",
      heating: "forced_air_gas",
      heatingOther: "",
      recentImprovements: "New roof",
    });
  });

  test("detached: drops frontYardParking (semi-detached-only)", () => {
    const featuresUpgrades = {
      selected: [],
      garage: "1_car",
      frontYardParking: "1_vehicle", // stale semi-detached-shaped key
      heating: "forced_air_gas",
      recentImprovements: "New roof",
    };

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("detached", {}, featuresUpgrades);

    expect(cleaned).toEqual({
      selected: [],
      garage: "1_car",
      heating: "forced_air_gas",
      recentImprovements: "New roof",
    });
  });

  test("condo-apartment: keeps outdoorSpace, drops garage/heating (house-only)", () => {
    const featuresUpgrades = {
      selected: [],
      garage: "1_car", // stale house-shaped key
      heating: "forced_air_gas", // stale house-shaped key
      outdoorSpace: "balcony",
      recentImprovements: "New paint",
    };

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("condo-apartment", {}, featuresUpgrades);

    expect(cleaned).toEqual({
      selected: [],
      outdoorSpace: "balcony",
      recentImprovements: "New paint",
    });
  });

  test("rural and duplex-triplex only keep selected/otherTexts/recentImprovements", () => {
    const featuresUpgrades = {
      selected: [],
      garage: "1_car",
      outdoorSpace: "balcony",
      recentImprovements: "New well pump",
    };

    expect(vetPropertyTypeFields("rural", {}, featuresUpgrades).featuresUpgrades).toEqual({
      selected: [],
      recentImprovements: "New well pump",
    });
    expect(vetPropertyTypeFields("duplex-triplex", {}, featuresUpgrades).featuresUpgrades).toEqual({
      selected: [],
      recentImprovements: "New well pump",
    });
  });
});

describe("vetPropertyTypeFields — otherTexts group-id filtering", () => {
  test("detached keeps interior/exterior groups, drops a stale rural group key", () => {
    const featuresUpgrades = {
      otherTexts: {interior: "Custom trim", exterior: "Custom fence", land: "stale rural text"},
    };

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("detached", {}, featuresUpgrades);

    expect(cleaned.otherTexts).toEqual({interior: "Custom trim", exterior: "Custom fence"});
  });

  test("duplex-triplex keeps its 5 groups, drops a stale condo 'suite' group key", () => {
    const featuresUpgrades = {
      otherTexts: {building: "a", unit: "b", lower: "c", outdoor: "d", parking: "e", suite: "stale condo text"},
    };

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("duplex-triplex", {}, featuresUpgrades);

    expect(cleaned.otherTexts).toEqual({building: "a", unit: "b", lower: "c", outdoor: "d", parking: "e"});
  });

  test("leaves featuresUpgrades.otherTexts absent if it was never present", () => {
    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("detached", {}, {garage: "1_car"});

    expect(cleaned).not.toHaveProperty("otherTexts");
  });
});

describe("vetPropertyTypeFields — selected feature-id prefix filtering", () => {
  test("condo-apartment keeps only c- prefixed ids", () => {
    const featuresUpgrades = {selected: ["c-concierge", "renovated_kitchen", "r-hobby-farm", "d-garage-parking"]};

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("condo-apartment", {}, featuresUpgrades);

    expect(cleaned.selected).toEqual(["c-concierge"]);
  });

  test("rural keeps only r- prefixed ids", () => {
    const featuresUpgrades = {selected: ["c-concierge", "r-hobby-farm", "d-garage-parking"]};

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("rural", {}, featuresUpgrades);

    expect(cleaned.selected).toEqual(["r-hobby-farm"]);
  });

  test("duplex-triplex keeps only d- prefixed ids", () => {
    const featuresUpgrades = {selected: ["c-concierge", "r-hobby-farm", "d-garage-parking"]};

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("duplex-triplex", {}, featuresUpgrades);

    expect(cleaned.selected).toEqual(["d-garage-parking"]);
  });

  test("detached (house type) keeps only unprefixed ids, dropping any c-/r-/d- prefixed leftovers", () => {
    const featuresUpgrades = {selected: ["renovated_kitchen", "c-concierge", "r-hobby-farm", "d-garage-parking", "hardwood_floors"]};

    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("detached", {}, featuresUpgrades);

    expect(cleaned.selected).toEqual(["renovated_kitchen", "hardwood_floors"]);
  });

  test("leaves featuresUpgrades.selected absent if it was never present", () => {
    const {featuresUpgrades: cleaned} = vetPropertyTypeFields("detached", {}, {garage: "1_car"});

    expect(cleaned).not.toHaveProperty("selected");
  });
});
