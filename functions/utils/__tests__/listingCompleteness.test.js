const {checkListingCompleteness} = require("../listingCompleteness");

const tenantUnit = {
  occupancy: "tenant_occupied",
  monthlyRent: 2200,
  tenancyType: "fixed_term",
  leaseEndDate: "2027-04-30",
  tenantPaidUtilities: ["hydro_electricity", "natural_gas"],
};

// A residential-income listing with every required field filled in, stored
// the way both save paths write it: properties/{id}.{path}.{fieldName}.
function completeTriplex() {
  return {
    propertyType: "residentialIncome",
    incomeConfiguration: {
      unitCount: "triplex",
      unitArrangement: ["stacked"],
      approxBuildingSqFt: 2400,
      sqFtSource: "mpac",
      approxYearBuilt: 1990,
    },
    unitBasics: {
      units: [
        {position: ["main_floor", "front"], bedrooms: "2", bathrooms: "1", approxSqFt: 800},
        {
          position: ["lower_level"], bedrooms: "1", bathrooms: "1", approxSqFt: 600,
          separateEntrance: true, walkOut: false,
        },
        {location: "above_ground", position: ["rear"], bedrooms: "0", bathrooms: "1", approxSqFt: 450},
      ],
    },
    exteriorOutdoor: {
      exteriorConstruction: ["brick"],
      drivewayType: "double",
      totalParkingSpaces: 4,
      parkingArrangement: "assigned_by_unit",
      garageType: "detached",
      garageSpaces: "2",
      yardSpace: "back_yard",
      outdoorSpaceArrangement: "shared",
      deckPatioBalcony: ["deck"],
      fencing: "fully_fenced",
      otherExteriorFeatures: ["none"],
    },
    buildingSystems: {
      heatingSystem: "separate_by_unit",
      coolingSystem: "no_central_cooling",
      hydroMetering: "separate_meters",
      gasMetering: "shared_meter",
      waterMetering: "not_sure",
      hotWater: "tankless",
    },
    locationFeatures: {
      nearbyAmenities: ["grocery_store"],
      transitAccess: ["bus_stop"],
      schools: ["elementary_school"],
      parksRecreation: ["park"],
      lifestyle: ["quiet_street"],
    },
    unitTenancy: {
      unitTenancies: [tenantUnit, {occupancy: "vacant"}, {occupancy: "owner_occupied"}],
    },
    buyerHighlights: {
      propertyHighlights: "Fully rented triplex steps from transit.",
      uniqueFeatures: "Zoned for a garden suite.",
    },
    saleItems: {itemsIncluded: "Fridge, stove, washer and dryer.", rentalItems: ["none"]},
  };
}

const problemFor = (result, match) => result.problems.find((p) =>
  Object.entries(match).every(([key, value]) => p[key] === value));

describe("checkListingCompleteness", () => {
  test("a fully completed listing passes with nothing to prune", () => {
    const result = checkListingCompleteness("residentialIncome", completeTriplex());
    expect(result.problems).toEqual([]);
    expect(result).toMatchObject({checked: true, complete: true});
    expect(result.prune).toEqual({deletePaths: [], setValues: {}});
  });

  test("property types without submission rules are not checked", () => {
    const result = checkListingCompleteness("notAType", {});
    expect(result).toEqual({checked: false, complete: true, problems: [], prune: {deletePaths: [], setValues: {}}});
    expect(checkListingCompleteness(undefined, {}).checked).toBe(false);
  });

  test("an empty listing reports every required field with its section, but not optional ones", () => {
    const result = checkListingCompleteness("residentialIncome", {});
    expect(result.complete).toBe(false);
    expect(problemFor(result, {field: "unitCount"})).toEqual({
      field: "unitCount", section: "income-configuration", message: "This field is required",
    });
    expect(problemFor(result, {field: "propertyHighlights"}).section).toBe("tell-buyers");
    expect(problemFor(result, {field: "idealBuyer"})).toBeUndefined();
    expect(problemFor(result, {field: "additionalComments"})).toBeUndefined();
    // Conditional on an unanswered garageType, so not reported on its own.
    expect(problemFor(result, {field: "garageSpaces"})).toBeUndefined();
  });

  test.each([
    ["an empty string", ""],
    ["whitespace only", "   "],
    ["null", null],
  ])("treats %s as missing", (_label, value) => {
    const doc = completeTriplex();
    doc.buyerHighlights.propertyHighlights = value;
    const result = checkListingCompleteness("residentialIncome", doc);
    expect(problemFor(result, {field: "propertyHighlights"}).message).toBe("This field is required");
  });

  test("an empty multi-select is missing", () => {
    const doc = completeTriplex();
    doc.locationFeatures.schools = [];
    expect(problemFor(checkListingCompleteness("residentialIncome", doc), {field: "schools"})).toBeDefined();
  });

  test("an invalid stored value is reported (the listing-process save path doesn't validate)", () => {
    const doc = completeTriplex();
    doc.exteriorOutdoor.fencing = "electric";
    const problem = problemFor(checkListingCompleteness("residentialIncome", doc), {field: "fencing"});
    expect(problem.section).toBe("exterior-outdoor");
    expect(problem.message).not.toBe("This field is required");
  });

  test("an out-of-range number is reported in plain English", () => {
    const doc = completeTriplex();
    doc.incomeConfiguration.approxYearBuilt = 2;
    doc.incomeConfiguration.approxBuildingSqFt = -5;
    const result = checkListingCompleteness("residentialIncome", doc);
    expect(problemFor(result, {field: "approxYearBuilt"}).message).toBe("Enter a year from 1800 onward.");
    expect(problemFor(result, {field: "approxBuildingSqFt"}).message).not.toMatch(/^Too (small|big)/);
  });

  describe("requiredWhen", () => {
    test("garage spaces are required unless the garage is None", () => {
      const doc = completeTriplex();
      delete doc.exteriorOutdoor.garageSpaces;
      expect(problemFor(checkListingCompleteness("residentialIncome", doc), {field: "garageSpaces"})).toBeDefined();

      doc.exteriorOutdoor.garageType = "none";
      expect(checkListingCompleteness("residentialIncome", doc).complete).toBe(true);
    });

    test("tenant details are required only for a tenant-occupied unit", () => {
      const doc = completeTriplex();
      doc.unitTenancy.unitTenancies[0] = {occupancy: "tenant_occupied"};
      const result = checkListingCompleteness("residentialIncome", doc);
      const missing = result.problems.filter((p) => p.field === "unitTenancies" && p.index === 0);
      expect(missing.map((p) => p.itemField)).toEqual(["monthlyRent", "tenancyType", "tenantPaidUtilities"]);
      expect(missing[0].section).toBe("tenancy");
    });

    test("lease end date is required for fixed-term leases only", () => {
      const doc = completeTriplex();
      delete doc.unitTenancy.unitTenancies[0].leaseEndDate;
      expect(problemFor(checkListingCompleteness("residentialIncome", doc), {itemField: "leaseEndDate"})).toBeDefined();

      doc.unitTenancy.unitTenancies[0].tenancyType = "month_to_month";
      expect(checkListingCompleteness("residentialIncome", doc).complete).toBe(true);
    });

    test("basement access questions apply to lower-level units, whether picked by position or by location", () => {
      const doc = completeTriplex();
      delete doc.unitBasics.units[1].walkOut;
      doc.unitBasics.units[2] = {location: "lower_level", position: ["rear"], bedrooms: "1", bathrooms: "1", approxSqFt: 500};
      const result = checkListingCompleteness("residentialIncome", doc);
      expect(result.problems.map((p) => [p.index, p.itemField])).toEqual([
        [1, "walkOut"], [2, "separateEntrance"], [2, "walkOut"],
      ]);
    });

    test("units added after the first two must say where they are", () => {
      const doc = completeTriplex();
      delete doc.unitBasics.units[2].location;
      expect(problemFor(checkListingCompleteness("residentialIncome", doc), {index: 2, itemField: "location"})).toBeDefined();
    });
  });

  describe("pruning values whose condition no longer applies", () => {
    test("stale top-level values are deleted", () => {
      const doc = completeTriplex();
      doc.exteriorOutdoor.garageType = "none";
      expect(checkListingCompleteness("residentialIncome", doc).prune.deletePaths).toEqual(["exteriorOutdoor.garageSpaces"]);
    });

    test("stale list-entry values are removed and the cleaned list is rewritten", () => {
      const doc = completeTriplex();
      doc.unitTenancy.unitTenancies[0] = {...tenantUnit, occupancy: "vacant"};
      doc.unitBasics.units[0].location = "lower_level"; // units 1-2 never ask "where"

      const {complete, prune} = checkListingCompleteness("residentialIncome", doc);
      expect(complete).toBe(true);
      expect(prune.setValues["unitTenancy.unitTenancies"][0]).toEqual({occupancy: "vacant"});
      expect(prune.setValues["unitBasics.units"][0]).not.toHaveProperty("location");
      expect(prune.setValues["unitBasics.units"][1]).toBe(doc.unitBasics.units[1]);
    });

    test("a condition on a stale value doesn't hold (lease date on a now-vacant unit)", () => {
      const doc = completeTriplex();
      doc.unitTenancy.unitTenancies[0] = {...tenantUnit, occupancy: "vacant"};
      delete doc.unitTenancy.unitTenancies[0].leaseEndDate;
      doc.unitTenancy.unitTenancies[0].tenancyType = "fixed_term";
      const result = checkListingCompleteness("residentialIncome", doc);
      expect(result.complete).toBe(true);
    });
  });

  describe("cross-field rules", () => {
    test.each([
      ["duplex", 2, true], ["duplex", 3, false],
      ["fourplex", 4, true], ["fourplex", 3, false],
      ["multi_unit", 5, true], ["multi_unit", 7, true], ["multi_unit", 4, false],
    ])("%s with %i units passes: %s", (unitCount, count, passes) => {
      const doc = completeTriplex();
      doc.incomeConfiguration.unitCount = unitCount;
      const unit = {position: ["main_floor"], bedrooms: "1", bathrooms: "1", approxSqFt: 500};
      doc.unitBasics.units = Array.from({length: count}, (_, i) => i < 2 ? unit : {...unit, location: "above_ground", position: ["rear"]});
      doc.unitTenancy.unitTenancies = Array.from({length: count}, () => ({occupancy: "vacant"}));
      const result = checkListingCompleteness("residentialIncome", doc);
      expect(result.complete).toBe(passes);
      if (!passes) expect(result.problems).toEqual([expect.objectContaining({field: "units", section: "unit-basics"})]);
    });

    test("tenancy must be entered for exactly as many units as Unit Basics lists", () => {
      const doc = completeTriplex();
      doc.unitTenancy.unitTenancies.pop();
      expect(checkListingCompleteness("residentialIncome", doc).problems).toEqual([
        expect.objectContaining({field: "unitTenancies", section: "tenancy"}),
      ]);
    });

    test("added units can't be marked Main / Upper floor or Lower Level in their position list", () => {
      const doc = completeTriplex();
      doc.unitBasics.units[2].position = ["upper_floor"];
      expect(checkListingCompleteness("residentialIncome", doc).problems).toEqual([
        expect.objectContaining({field: "units", index: 2, itemField: "position"}),
      ]);
    });
  });

  test("a malformed list is reported once instead of per entry", () => {
    const doc = completeTriplex();
    doc.unitBasics.units = "three units";
    const problem = problemFor(checkListingCompleteness("residentialIncome", doc), {field: "units"});
    expect(problem.message).toBe("Expected a list");
  });

  test("a single bad list entry is reported against its own index and field", () => {
    const doc = completeTriplex();
    doc.unitBasics.units[0].bedrooms = "twelve";
    expect(checkListingCompleteness("residentialIncome", doc).problems).toEqual([
      expect.objectContaining({field: "units", index: 0, itemField: "bedrooms"}),
    ]);
  });
});

describe("checkListingCompleteness — keyed rental item details", () => {
  const withRentals = (rentalItems, rentalItemDetails) => {
    const doc = completeTriplex();
    doc.saleItems = {itemsIncluded: "Fridge", rentalItems, rentalItemDetails};
    return doc;
  };
  const detailProblems = (doc) => checkListingCompleteness("residentialIncome", doc).problems
      .filter((p) => p.field === "rentalItemDetails")
      .map((p) => [p.itemKey, p.itemField]);

  test("each ticked item needs its company, payment amount and frequency", () => {
    expect(detailProblems(withRentals(["hot_water_tank"], undefined))).toEqual([
      ["hot_water_tank", "company"], ["hot_water_tank", "paymentAmount"], ["hot_water_tank", "paymentFrequency"],
    ]);
  });

  test("\"I don't have these details right now\" waives them", () => {
    expect(detailProblems(withRentals(["hot_water_tank"], {hot_water_tank: {detailsUnavailable: true}}))).toEqual([]);
  });

  test("\"Other\" also asks what the item is", () => {
    const problems = detailProblems(withRentals(["other"], {other: {detailsUnavailable: true}}));
    expect(problems).toEqual([["other", "otherDescription"]]);
  });

  test("\"There are no rental or leased items\" needs no details", () => {
    expect(detailProblems(withRentals(["none"], undefined))).toEqual([]);
  });

  test("details for items no longer ticked, and waived values, are pruned", () => {
    const doc = withRentals(["hot_water_tank"], {
      hot_water_tank: {detailsUnavailable: true, company: "Reliance"},
      water_softener: {company: "Culligan"},
    });
    const {complete, prune} = checkListingCompleteness("residentialIncome", doc);
    expect(complete).toBe(true);
    expect(prune.setValues["saleItems.rentalItemDetails"]).toEqual({hot_water_tank: {detailsUnavailable: true}});
  });
});

describe("checkListingCompleteness — detached", () => {
  test("follow-ups only count after a Yes", () => {
    const result = checkListingCompleteness("detached", {
      parkingOutdoor: {hasDriveway: false, hasGarage: true},
      basement: {hasBasement: false},
    });
    const fields = result.problems.map((p) => p.field);
    expect(fields).not.toContain("drivewayType");
    expect(fields).toEqual(expect.arrayContaining(["garageType", "indoorParkingSpaces"]));
    expect(fields).not.toContain("basementFinish");
    expect(fields).not.toContain("basementApartment");
  });

  test("stored raw FE slug data is checked against the detached registry, sections included", () => {
    const result = checkListingCompleteness("detached", {});
    expect(problemFor(result, {field: "homeStyle"}).section).toBe("exterior-lot");
    expect(problemFor(result, {field: "buyerHighlights"}).section).toBe("listing-remarks");
    expect(problemFor(result, {field: "itemsExcluded"})).toBeUndefined();
  });
});

describe("checkListingCompleteness — semiDetached", () => {
  test("a basement's follow-ups, and a separate unit's, only count once revealed", () => {
    const fields = (doc) => checkListingCompleteness("semiDetached", doc).problems.map((p) => p.field);
    expect(fields({basement: {hasBasement: false}})).not.toContain("basementAccess");
    const withBasement = fields({basement: {hasBasement: true, basementSeparateUnit: "no"}});
    expect(withBasement).toEqual(expect.arrayContaining(["basementFinish", "basementAccess", "basementRooms"]));
    expect(withBasement).not.toContain("separateUnitStatus");
    expect(fields({basement: {hasBasement: true, basementSeparateUnit: "yes"}}))
        .toEqual(expect.arrayContaining(["separateUnitStatus", "separateUnitOccupancy", "separateUnitVacantPossession"]));
  });

  test("rented items need at least one item once the buyer assumes rentals", () => {
    const result = checkListingCompleteness("semiDetached", {remarksInclusions: {rentedEquipment: true}});
    expect(result.problems).toContainEqual(expect.objectContaining({field: "rentedItems", section: "remarks-inclusions"}));
    const listed = checkListingCompleteness("semiDetached", {
      remarksInclusions: {rentedEquipment: true, rentedItems: [{item: "other"}]},
    });
    expect(listed.problems).toContainEqual(expect.objectContaining({field: "rentedItems", index: 0, itemField: "otherDescription"}));
  });
});

describe("checkListingCompleteness — rural", () => {
  const problems = (doc) => checkListingCompleteness("rural", doc).problems;
  const fields = (doc) => problems(doc).map((p) => p.field);

  test("only the starred fields are reported on an empty listing", () => {
    expect(fields({})).toEqual([
      "ruralPropertyType", "acreage", "roadAccessType", "nearestTown", "exteriorConstruction",
      "bedrooms", "bathrooms", "heatingType", "waterSource", "sewerSeptic", "laundryLocation",
      "basementType", "drivewayType", "drivewaySurface", "parkingCapacity",
    ]);
  });

  test("an 'Other' outbuilding needs a description; sizes stay optional", () => {
    const doc = {ruralOutbuildings: {outbuildings: ["barn", "other"]}};
    expect(problems(doc).filter((p) => p.field === "outbuildingDetails"))
        .toEqual([expect.objectContaining({itemKey: "other", itemField: "description"})]);
  });

  test("details for an outbuilding that isn't ticked are pruned", () => {
    const doc = {ruralOutbuildings: {outbuildings: ["barn"], outbuildingDetails: {barn: {size: "30x40"}, workshop: {size: "20x30"}}}};
    expect(checkListingCompleteness("rural", doc).prune.setValues["ruralOutbuildings.outbuildingDetails"])
        .toEqual({barn: {size: "30x40"}});
  });

  test("answers for a basement that isn't there are pruned", () => {
    const doc = {ruralBasement: {basementType: "slab_none", basementFinish: "finished"}};
    expect(checkListingCompleteness("rural", doc).prune.deletePaths).toContain("ruralBasement.basementFinish");
  });
});

describe("checkListingCompleteness — condoApartment", () => {
  const problems = (doc) => checkListingCompleteness("condoApartment", doc).problems;
  const fields = (doc) => problems(doc).map((p) => p.field);

  test("an empty listing reports the starred fields and the questions that open them", () => {
    expect(fields({})).toEqual([
      "squareFootage", "squareFootageSource", "parkingIncluded", "lockerIncluded", "condoCorporation", "monthlyFee",
      "hasSpecialAssessment", "bedrooms", "fullBathrooms", "hasOtherAmenity", "petsPermitted", "bbqPermitted",
      "hasOtherBalconyRestrictions", "smokingVapingRules", "longTermLeasing", "shortTermRentals",
      "hasOtherRestrictions", "currentOccupancy", "hasOtherNearbyFeature", "clientRemarks", "hasExcludedFixtures",
      "hasRentedItems",
    ]);
  });

  test("parking Yes needs at least one filled parking card", () => {
    const doc = {condoParkingLocker: {parkingIncluded: true}};
    expect(fields(doc)).toContain("parkingSpaces");
    const partial = {condoParkingLocker: {parkingIncluded: true, parkingSpaces: [{parkingType: "underground"}]}};
    expect(problems(partial).filter((p) => p.field === "parkingSpaces").map((p) => p.itemField))
        .toEqual(["parkingInterest", "parkingLevel", "spaceNumber"]);
  });

  test("a locker inside the unit needs no level or number", () => {
    const doc = {condoParkingLocker: {
      lockerIncluded: true, lockers: [{lockerLocation: "inside_unit", lockerInterest: "owned", lockerNumber: "74"}],
    }};
    expect(problems(doc).filter((p) => p.field === "lockers")).toEqual([]);
    expect(checkListingCompleteness("condoApartment", doc).prune.setValues["condoParkingLocker.lockers"])
        .toEqual([{lockerLocation: "inside_unit", lockerInterest: "owned"}]);
  });

  test("tenancy answers are pruned once the unit is no longer tenanted", () => {
    const doc = {condoOccupancy: {currentOccupancy: "vacant_possession", tenancySituation: "fixed_term"}};
    expect(checkListingCompleteness("condoApartment", doc).prune.deletePaths)
        .toContain("condoOccupancy.tenancySituation");
  });

  test("'will the tenant remain' only applies when the tenancy doesn't end on closing", () => {
    const doc = {condoOccupancy: {
      currentOccupancy: "tenanted", tenancySituation: "vacant_possession", tenantRemainsAfterClosing: true,
    }};
    expect(checkListingCompleteness("condoApartment", doc).prune.deletePaths)
        .toEqual(["condoOccupancy.tenantRemainsAfterClosing"]);
  });

  test("a unit above the top storey is reported", () => {
    const doc = {condoUnit: {buildingStoreys: "10", unitLevel: "12"}};
    expect(problems(doc)).toContainEqual(expect.objectContaining({field: "unitLevel", section: "unit-basics"}));
  });
});

describe("checkListingCompleteness — condoTownhouse", () => {
  const check = (doc) => checkListingCompleteness("condoTownhouse", doc);
  const fields = (doc) => check(doc).problems.map((p) => p.field);
  const config = (value, basics = {}) => ({townhouseBasics: {townhouseConfiguration: value, ...basics}});

  test("only the chosen configuration's pages are checked", () => {
    const bungalow = fields(config("bungalow"));
    expect(bungalow).toContain("bgPosition");
    expect(bungalow).not.toContain("squareFootage");
    expect(bungalow).not.toContain("bbPosition");
    expect(bungalow).not.toContain("condoCorporation");

    const traditional = fields(config("traditional"));
    expect(traditional).toEqual(expect.arrayContaining(["squareFootage", "hasBasement", "condoCorporation", "clientRemarks"]));
    expect(traditional).not.toContain("bgPosition");
    expect(traditional).not.toContain("basementFinish");
  });

  test("the Basement page is only checked after a Yes", () => {
    expect(fields(config("traditional", {hasBasement: true}))).toContain("basementFinish");
  });

  test("answers from a flow the seller switched away from are pruned", () => {
    const doc = {...config("back_to_back"), bungalowExterior: {bgPosition: "end_unit"}};
    expect(check(doc).prune.deletePaths).toContain("bungalowExterior.bgPosition");
  });

  test("an option whose condition no longer holds is dropped", () => {
    const doc = {
      ...config("traditional"),
      townhouseExterior: {hasGarage: true, garageType: "detached"},
      townhouseInterior: {interiorFeatures: ["fireplace", "direct_garage_access"], laundryLocation: "basement"},
    };
    const result = check(doc);
    expect(result.prune.setValues["townhouseInterior.interiorFeatures"]).toEqual(["fireplace"]);
    expect(result.prune.deletePaths).toContain("townhouseInterior.laundryLocation");
    expect(result.problems.map((p) => p.field)).toContain("laundryLocation");
  });
});
