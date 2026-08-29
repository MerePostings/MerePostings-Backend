const {z} = require("zod");
const {emailSchema} = require("../shared/email");

/**
 * ─────────────────────────────────────────────────────────────────────
 * SHARED OPTION LISTS
 *
 * Several checkbox / radio groups repeat, with identical choices, across
 * more than one property-type screen. Centralizing them keeps the schemas
 * below in sync with the actual designs and avoids copy/paste drift when a
 * screen changes.
 * ─────────────────────────────────────────────────────────────────────
 */

// -- generic / cross-type --------------------------------------------------
const OCCUPANCY_OPTIONS = ["owner_occupied", "tenant_occupied", "vacant"];
const OCCUPANCY_PATHWAY_OPTIONS = ["tenanted", "vacant_possession_on_closing", "other", "i_know_what_i_need"];
const AREAS_OCCUPIED_OPTIONS = ["entire_property", "basement", "other_portion"];
const CONTACT_METHOD_OPTIONS = ["email", "text", "phone"];
const BEST_TIMES_OPTIONS = ["morning", "afternoon", "evening", "anytime"];
const YES_NO_NOT_SURE_OPTIONS = ["yes", "no", "not_sure"];
const YES_NO_UNKNOWN_OPTIONS = ["yes", "no", "unknown"];

// -- residential exterior / lot ---------------------------------------------
const EXTERIOR_CONSTRUCTION_OPTIONS = [
  "brick", "stone", "stucco", "vinyl_siding", "aluminum_siding", "wood", "concrete", "other",
];
const ROOF_TYPE_OPTIONS = ["asphalt_shingles", "metal", "flat_membrane", "wood_shake", "slate", "other"];
const FENCED_YARD_OPTIONS = ["yes", "no", "partial"];
const POOL_OPTIONS = ["none", "above_ground", "in_ground"];
const HOUSE_STYLE_OPTIONS = [
  "bungalow", "one_and_half_storey", "two_storey", "two_and_half_storey",
  "three_storey", "sidesplit", "backsplit", "other",
];
const SQUARE_FOOTAGE_SOURCE_OPTIONS = ["seller", "builder", "previous_listing", "mpac", "other", "not_sure"];

// -- parking / garage ---------------------------------------------------
const GARAGE_TYPE_OPTIONS = ["attached", "detached", "built_in", "carport", "other"];
const DRIVEWAY_TYPE_OPTIONS = ["private", "mutual", "shared", "circular", "other"];
const DRIVEWAY_SURFACE_OPTIONS = ["paved", "interlock", "gravel", "other"];
const CONDO_PARKING_TYPE_OPTIONS = ["underground", "surface", "garage", "other"];
const OWNERSHIP_TYPE_OPTIONS = ["owned", "exclusive_use", "rental", "other"];
const EV_CHARGING_OPTIONS = ["yes", "no", "available_nearby", "not_sure"];

// -- residential interior ------------------------------------------------
const LAUNDRY_LOCATION_OPTIONS = ["main", "upper", "basement", "other"];
const FIREPLACE_OPTIONS = ["none", "gas", "wood", "electric", "other"];
const FLOORING_OPTIONS = ["hardwood", "engineered_hardwood", "laminate", "tile", "carpet", "luxury_vinyl", "other"];
const INTERIOR_UPGRADE_OPTIONS = [
  "renovated_kitchen", "hardwood_floors", "updated_bathrooms", "open_concept_layout", "pot_lights",
  "high_ceilings", "stainless_steel_appliances", "central_air", "newer_windows", "other",
];
const ACCESSIBILITY_FEATURES_OPTIONS = [
  "no_step_entry", "wide_doorways", "main_floor_bedroom", "main_floor_bathroom",
  "grab_bars", "ramp", "stairlift", "other",
];

// -- systems & utilities ---------------------------------------------------
const HEATING_TYPE_OPTIONS = ["forced_air", "boiler", "radiant", "heat_pump", "baseboard", "other"];
const HEATING_FUEL_OPTIONS = ["natural_gas", "electric", "oil", "propane", "wood", "other"];
const COOLING_OPTIONS = ["central_air", "heat_pump", "window", "none", "other"];
const WATER_SUPPLY_OPTIONS = ["municipal", "well", "other"];
const SEWER_OPTIONS = ["municipal", "septic", "other"];
const HOT_WATER_OPTIONS = ["owned", "rented", "other"];
const WATER_SOFTENER_OPTIONS = ["owned", "rented", "none"];

// -- basement --------------------------------------------------------------
const BASEMENT_EXTENT_OPTIONS = ["full", "partial"];
const BASEMENT_FINISH_OPTIONS = ["finished", "partially_finished", "unfinished"];
const SELLER_UNDERSTANDING_STATUS_OPTIONS = ["legal", "legal_non_conforming", "not_sure"];
const OCCUPANCY_RELATIONSHIP_OPTIONS = ["tenant", "family", "owner", "other"];
const BATHROOM_TYPE_OPTIONS = ["two_piece", "three_piece", "four_piece", "five_piece_plus", "ensuite"];

// -- additional living spaces ------------------------------------------
const ADDITIONAL_LIVING_SPACE_TYPE_OPTIONS = [
  "garden_suite", "laneway_house", "coach_house", "above_garage_suite", "other",
];
const CURRENT_OCCUPANCY_OPTIONS = ["vacant", "owner", "family", "tenant", "other"];

// -- rural / acreage ---------------------------------------------------
const RURAL_SUBTYPE_OPTIONS = ["residential_acreage", "hobby_farm", "estate_property", "other"];
const LOT_SHAPE_OPTIONS = ["regular", "irregular"];
const ROAD_TYPE_OPTIONS = ["municipal", "private", "unopened", "other"];
const ROAD_SURFACE_OPTIONS = ["paved", "gravel", "other"];
const ROAD_MAINTAINED_BY_OPTIONS = ["municipality", "private", "shared", "other"];
const RURAL_DRIVEWAY_TYPE_OPTIONS = ["private", "shared"];
const WATER_SOURCE_OPTIONS = ["drilled_well", "dug_well", "municipal", "lake", "cistern", "other"];
const WATER_TREATMENT_OPTIONS = ["uv_treatment", "reverse_osmosis", "water_softener", "sediment_filter", "other"];
const SEPTIC_TYPE_OPTIONS = ["conventional", "holding_tank", "other", "not_sure"];
const NATURAL_FEATURE_OPTIONS = ["wooded_area", "open_field", "pond", "creek_stream", "waterfront", "trails", "other"];
const OUTBUILDING_TYPE_OPTIONS = [
  "barn", "workshop", "shed", "detached_garage", "stable", "drive_shed", "greenhouse", "other",
];
const GENERATOR_TYPE_OPTIONS = ["permanent", "portable"];
const INTERNET_TYPE_OPTIONS = ["fibre", "cable", "dsl", "fixed_wireless", "satellite", "other"];
const TANK_OWNERSHIP_OPTIONS = ["owned", "rented", "none"];

// -- income property (duplex / triplex) ---------------------------------
const PROPERTY_CONFIGURATION_OPTIONS = ["duplex", "triplex"];
const CURRENT_USE_OPTIONS = ["entirely_residential", "mixed_use"];
const UNITS_RECOGNIZED_OPTIONS = ["legal", "legal_non_conforming", "unknown"];
const UNIT_LAUNDRY_OPTIONS = ["private", "shared", "none"];
const UNIT_OCCUPANCY_OPTIONS = ["vacant", "owner_occupied", "tenant_occupied"];
const TENANCY_TYPE_OPTIONS = ["fixed_term", "month_to_month"];
const UTILITY_OPTIONS = ["heat", "hydro", "water", "cable_internet", "other"];
const WHO_PAYS_OPTIONS = ["owner", "tenant", "mixed"];

// -- condo (apartment + townhouse) ------------------------------------
const CONDO_BEDROOM_DEN_OPTIONS = [
  "studio", "1_bedroom", "1_bedroom_den", "2_bedroom", "2_bedroom_den",
  "3_bedroom", "3_bedroom_den", "4_bedroom_plus",
];
const KITCHEN_STYLE_OPTIONS = ["standard", "open_concept", "galley", "other"];
const UNIT_EXPOSURE_OPTIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const UNIT_STYLE_OPTIONS = ["apartment", "loft", "penthouse", "other"];
const BALCONY_TYPE_OPTIONS = ["open", "enclosed", "juliette", "terrace"];
const CONDO_AMENITIES_OPTIONS = [
  "concierge_security", "gym", "indoor_pool", "outdoor_pool", "party_room", "rooftop_terrace",
  "guest_suites", "visitor_parking", "bike_storage", "sauna", "games_media_room", "other",
];
const TOWNHOUSE_CONFIGURATION_OPTIONS = ["conventional", "stacked", "back_to_back", "other"];
const TOWNHOUSE_POSITION_OPTIONS = ["end_unit", "interior_unit"];
const STACKED_UNIT_POSITION_OPTIONS = ["upper", "lower"];
const MAINTENANCE_RESPONSIBILITY_OPTIONS = ["owner", "condo", "mixed", "not_sure"];

// -- location / listing description / chattels / fixtures / rented items --
const NEARBY_FEATURE_OPTIONS = [
  "schools_nearby", "public_transit", "go_transit", "shopping", "restaurants", "parks",
  "trails", "recreation", "highway_access", "hospital_healthcare", "waterfront", "golf",
];
const CHATTEL_OPTIONS = [
  "fridge", "stove", "dishwasher", "washer", "dryer", "microwave",
  "window_coverings", "light_fixtures", "other",
];

/**
 * ─────────────────────────────────────────────────────────────────────
 * REUSABLE FIELD-GROUP BUILDERS
 *
 * A handful of "components" repeat, near-identically, across several
 * property-type screens (Parking & Garage, Exterior/Lot, Residential
 * Interior, Systems & Utilities, Basement, Additional Living Spaces).
 * These builders return `{fieldName: {path, schema}}` fragments that get
 * spread into a property type's bucket below, so a change to one of these
 * components doesn't have to be repeated by hand for every type that uses
 * it.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Bathrooms are stored as a piece-count breakdown, never a single number. */
const bathroomsSchema = () => z.object({
  twoPiece: z.number().int().min(0).max(10).default(0),
  threePiece: z.number().int().min(0).max(10).default(0),
  fourPiece: z.number().int().min(0).max(10).default(0),
  fivePiecePlus: z.number().int().min(0).max(10).default(0),
  ensuite: z.number().int().min(0).max(10).default(0),
}).strict().optional();

/** Reusable "Parking & Garage" component (detached / semiDetached / rural house). */
function buildParkingGarageFields(path = "garage") {
  return {
    hasGarage: {path, schema: z.boolean().optional()},
    garageType: {path, schema: z.enum(GARAGE_TYPE_OPTIONS).optional()},
    garageSpaces: {path, schema: z.number().int().min(0).max(10).optional()},
    insideEntryFromGarage: {path, schema: z.boolean().optional()},
    garageDoorOpener: {path, schema: z.boolean().optional()},
    hasDriveway: {path, schema: z.boolean().optional()},
    drivewayType: {path, schema: z.enum(DRIVEWAY_TYPE_OPTIONS).optional()},
    drivewaySurface: {path, schema: z.enum(DRIVEWAY_SURFACE_OPTIONS).optional()},
    drivewayParkingSpaces: {path, schema: z.number().int().min(0).max(20).optional()},
    totalParkingSpaces: {path, schema: z.number().int().min(0).max(30).optional()},
    otherParkingInformation: {path, schema: z.string().max(300).nullish()},
  };
}

/** Reusable condominium parking component (condoApartment / condoTownhouse). */
function buildCondoParkingFields(path = "condoParking") {
  return {
    parkingIncluded: {path, schema: z.boolean().optional()},
    numberOfParkingSpaces: {path, schema: z.number().int().min(0).max(10).optional()},
    parkingType: {path, schema: z.enum(CONDO_PARKING_TYPE_OPTIONS).optional()},
    parkingOwnership: {path, schema: z.enum(OWNERSHIP_TYPE_OPTIONS).optional()},
    parkingLevel: {path, schema: z.string().max(30).nullish()},
    parkingSpaceNumber: {path, schema: z.string().max(30).nullish()},
    evCharging: {path, schema: z.enum(EV_CHARGING_OPTIONS).optional()},
  };
}

/** Reusable "Exterior & Lot" shell (frontage/construction/roof/yard features). */
function buildExteriorLotFields(path = "exterior") {
  return {
    lotFrontage: {path, schema: z.number().positive().max(10000).optional()},
    lotDepth: {path, schema: z.number().positive().max(10000).optional()},
    irregularLot: {path, schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    cornerLot: {path, schema: z.boolean().optional()},
    exteriorConstruction: {path, schema: z.array(z.enum(EXTERIOR_CONSTRUCTION_OPTIONS)).optional()},
    roofType: {path, schema: z.enum(ROOF_TYPE_OPTIONS).optional()},
    roofApproximateAge: {path, schema: z.number().int().min(0).max(100).optional()},
    frontPorch: {path, schema: z.boolean().optional()},
    deck: {path, schema: z.boolean().optional()},
    patio: {path, schema: z.boolean().optional()},
    fencedYard: {path, schema: z.enum(FENCED_YARD_OPTIONS).optional()},
    landscapingFeatures: {path, schema: z.array(z.string().min(1).max(60)).max(20).optional()},
    shed: {path, schema: z.boolean().optional()},
    pool: {path, schema: z.enum(POOL_OPTIONS).optional()},
    hotTub: {path, schema: z.boolean().optional()},
    otherExteriorFeatures: {path, schema: z.string().max(300).nullish()},
  };
}

/** Reusable "Residential Interior" component (detached / semiDetached / rural house). */
function buildResidentialInteriorFields(path = "interior") {
  return {
    bedroomsAboveGrade: {path, schema: z.number().int().min(0).max(20).optional()},
    bathrooms: {path, schema: bathroomsSchema()},
    primaryBedroom: {path, schema: z.boolean().optional()},
    kitchenCount: {path, schema: z.number().int().min(0).max(5).optional()},
    livingRoom: {path, schema: z.boolean().optional()},
    diningRoom: {path, schema: z.boolean().optional()},
    familyRoom: {path, schema: z.boolean().optional()},
    denOffice: {path, schema: z.boolean().optional()},
    breakfastArea: {path, schema: z.boolean().optional()},
    laundryLocation: {path, schema: z.enum(LAUNDRY_LOCATION_OPTIONS).optional()},
    fireplace: {path, schema: z.enum(FIREPLACE_OPTIONS).optional()},
    flooring: {path, schema: z.array(z.enum(FLOORING_OPTIONS)).optional()},
    interiorUpgrades: {path, schema: z.array(z.enum(INTERIOR_UPGRADE_OPTIONS)).optional()},
    accessibilityFeatures: {path, schema: z.array(z.enum(ACCESSIBILITY_FEATURES_OPTIONS)).optional()},
    otherPrincipalRooms: {
      path,
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().max(200).nullish(),
      }).strict()).max(10).optional(),
    },
    additionalInteriorFeatures: {path, schema: z.string().max(500).nullish()},
  };
}

/** Reusable "Systems & Utilities" component (detached / semiDetached / rural house). */
function buildSystemsUtilitiesFields(path = "systems") {
  return {
    heatingType: {path, schema: z.enum(HEATING_TYPE_OPTIONS).optional()},
    heatingFuel: {path, schema: z.enum(HEATING_FUEL_OPTIONS).optional()},
    cooling: {path, schema: z.enum(COOLING_OPTIONS).optional()},
    waterSupply: {path, schema: z.enum(WATER_SUPPLY_OPTIONS).optional()},
    sewer: {path, schema: z.enum(SEWER_OPTIONS).optional()},
    electricalService: {path, schema: z.string().max(50).nullish()},
    hotWater: {path, schema: z.enum(HOT_WATER_OPTIONS).optional()},
    waterSoftener: {path, schema: z.enum(WATER_SOFTENER_OPTIONS).optional()},
    otherMechanicalSystems: {path, schema: z.string().max(300).nullish()},
  };
}

/** Reusable "Basement / Lower Level" component (detached / semiDetached / rural / condoTownhouse). */
function buildBasementFields(path = "basement") {
  return {
    hasBasement: {path, schema: z.boolean().optional()},
    basementExtent: {path, schema: z.enum(BASEMENT_EXTENT_OPTIONS).optional()},
    basementFinish: {path, schema: z.enum(BASEMENT_FINISH_OPTIONS).optional()},
    walkOut: {path, schema: z.boolean().optional()},
    walkUp: {path, schema: z.boolean().optional()},
    basementSeparateEntrance: {path, schema: z.boolean().optional()},
    basementBedrooms: {path, schema: z.number().int().min(0).max(10).optional()},
    basementBathroom: {
      path,
      schema: z.object({
        present: z.boolean().optional(),
        type: z.enum(BATHROOM_TYPE_OPTIONS).nullish(),
      }).strict().optional(),
    },
    recreationRoom: {path, schema: z.boolean().optional()},
    basementKitchen: {path, schema: z.boolean().optional()},
    basementLaundry: {path, schema: z.boolean().optional()},
    additionalBasementRooms: {
      path,
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().max(200).nullish(),
      }).strict()).max(10).optional(),
    },
    // Seller-provided information requiring brokerage review — the schema never
    // asserts legal authorization, only what the seller believes to be true.
    basementApartment: {path, schema: z.boolean().optional()},
    basementApartmentStatus: {path, schema: z.enum(SELLER_UNDERSTANDING_STATUS_OPTIONS).nullish()},
    basementApartmentOccupied: {path, schema: z.boolean().optional()},
    basementApartmentOccupancyRelationship: {
      path,
      schema: z.enum(OCCUPANCY_RELATIONSHIP_OPTIONS).nullish(),
    },
    basementApartmentVacantPossessionIntended: {path, schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
  };
}

/** Reusable repeatable "Additional Living Spaces" component (detached / semiDetached). */
function buildAdditionalLivingSpaceFields(path = "additionalLivingSpaces") {
  return {
    additionalLivingSpaces: {
      path,
      schema: z.array(z.object({
        type: z.enum(ADDITIONAL_LIVING_SPACE_TYPE_OPTIONS),
        bedrooms: z.number().int().min(0).max(10).optional(),
        bathrooms: z.number().int().min(0).max(10).optional(),
        kitchen: z.boolean().optional(),
        separateEntrance: z.boolean().optional(),
        approximateSize: z.string().max(50).nullish(),
        // Seller-provided information requiring brokerage review, not a legal
        // determination — see basementApartmentStatus above for the same pattern.
        sellerUnderstandingOfStatus: z.enum(SELLER_UNDERSTANDING_STATUS_OPTIONS).nullish(),
        currentOccupancy: z.enum(CURRENT_OCCUPANCY_OPTIONS).optional(),
        occupancyRelationship: z.enum(OCCUPANCY_RELATIONSHIP_OPTIONS).nullish(),
        vacantPossessionIntended: z.enum(YES_NO_UNKNOWN_OPTIONS).optional(),
        additionalDescription: z.string().max(300).nullish(),
      }).strict()).max(10).optional(),
    },
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────
 * PROPERTY-TYPE-SPECIFIC FIELDS
 *
 * Keyed first by propertyType, then by fieldName. This is the ONLY place
 * you touch to add/change a field for a given property type.
 *
 *   path   - the Firestore top-level map field the value is written under.
 *   dbKey  - actual Firestore key, if different from fieldName (optional,
 *            defaults to fieldName).
 *   schema - Zod schema validating the incoming fieldValue.
 * ─────────────────────────────────────────────────────────────────────
 */
const propertyTypeFields = {
  detached: {
    // PAGE D-02 — Your Detached Home / Exterior & Lot
    houseStyle: {path: "exterior", schema: z.enum(HOUSE_STYLE_OPTIONS).optional()},
    numberOfStoreys: {path: "exterior", schema: z.string().max(20).nullish()},
    approximateYearBuilt: {path: "exterior", schema: z.string().max(20).nullish()},
    approxAboveGradeSquareFootage: {path: "exterior", schema: z.string().max(30).nullish()},
    squareFootageSource: {path: "exterior", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS).optional()},
    ...buildExteriorLotFields("exterior"),

    // PAGE D-03 — Parking & Garage
    ...buildParkingGarageFields("garage"),

    // PAGE D-04/D-05 — Inside Your Home / Systems & Utilities
    ...buildResidentialInteriorFields("interior"),
    ...buildSystemsUtilitiesFields("systems"),

    // PAGE D-06 — Basement / Lower Level
    ...buildBasementFields("basement"),

    // PAGE D-07 — Additional Living Spaces
    ...buildAdditionalLivingSpaceFields("additionalLivingSpaces"),
  },

  semiDetached: {
    // PAGE SD-02/SD-03 — Your Semi-Detached Home / Lot & Exterior
    houseStyle: {path: "exterior", schema: z.enum(HOUSE_STYLE_OPTIONS).optional()},
    numberOfStoreys: {path: "exterior", schema: z.string().max(20).nullish()},
    approximateYearBuilt: {path: "exterior", schema: z.string().max(20).nullish()},
    approxAboveGradeSquareFootage: {path: "exterior", schema: z.string().max(30).nullish()},
    squareFootageSource: {path: "exterior", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS).optional()},
    // The attached-side / shared-feature fields are the genuine semi-detached
    // differences called out in the spec — everything else reuses Detached.
    attachedSide: {path: "exterior", schema: z.enum(["left", "right", "not_sure"]).optional()},
    cornerProperty: {path: "exterior", schema: z.boolean().optional()},
    otherConfigurationNotes: {path: "exterior", schema: z.string().max(300).nullish()},
    sharedExteriorFeatureKnown: {path: "exterior", schema: z.boolean().optional()},
    sharedWalkway: {path: "exterior", schema: z.boolean().optional()},
    mutualSharedAccess: {path: "exterior", schema: z.boolean().optional()},
    additionalSharedFeatureNotes: {path: "exterior", schema: z.string().max(300).nullish()},
    // PAGE SD-04 — a semi-specific yard distinction not present on Detached's
    // exterior/lot shell (buildExteriorLotFields), so it's added here directly
    // rather than folded into the shared component.
    privateRearYard: {path: "exterior", schema: z.boolean().optional()},
    ...buildExteriorLotFields("exterior"),

    // PAGE SD-04 — Parking & Garage (+ mutual-driveway disclosure)
    ...buildParkingGarageFields("garage"),
    sharedWithAdjoiningProperty: {path: "garage", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    sellerComments: {path: "garage", schema: z.string().max(300).nullish()},

    // PAGE SD-05/SD-06 — Inside Your Home / Systems & Utilities
    ...buildResidentialInteriorFields("interior"),
    ...buildSystemsUtilitiesFields("systems"),

    // PAGE SD-07 — Basement
    ...buildBasementFields("basement"),

    // PAGE SD-08 — Additional Living Spaces
    ...buildAdditionalLivingSpaceFields("additionalLivingSpaces"),
  },

  rural: {
    // PAGE RA-01 — Your Rural Property
    ruralPropertySubtype: {path: "ruralProperty", schema: z.enum(RURAL_SUBTYPE_OPTIONS)},
    approximateAcreage: {path: "ruralProperty", schema: z.number().positive().max(100000).optional()},
    lotFrontage: {path: "ruralProperty", schema: z.number().positive().max(100000).optional()},
    lotDepth: {path: "ruralProperty", schema: z.number().positive().max(100000).optional()},
    lotShape: {path: "ruralProperty", schema: z.enum(LOT_SHAPE_OPTIONS).optional()},
    surveyAvailable: {path: "ruralProperty", schema: z.boolean().optional()},
    propertyBoundariesKnown: {path: "ruralProperty", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    yearBuilt: {path: "ruralProperty", schema: z.string().max(20).nullish()},
    approxHouseSquareFootage: {path: "ruralProperty", schema: z.string().max(30).nullish()},
    numberOfStoreys: {path: "ruralProperty", schema: z.string().max(20).nullish()},

    // PAGE RA-02 — Access & Road
    roadType: {path: "ruralAccess", schema: z.enum(ROAD_TYPE_OPTIONS).optional()},
    roadSurface: {path: "ruralAccess", schema: z.enum(ROAD_SURFACE_OPTIONS).optional()},
    yearRoundRoadAccess: {path: "ruralAccess", schema: z.boolean().optional()},
    roadMaintainedBy: {path: "ruralAccess", schema: z.enum(ROAD_MAINTAINED_BY_OPTIONS).optional()},
    privateRoadFees: {path: "ruralAccess", schema: z.number().min(0).nullish()},
    ruralDrivewayType: {path: "ruralAccess", schema: z.enum(RURAL_DRIVEWAY_TYPE_OPTIONS).optional()},
    drivewayLengthNotes: {path: "ruralAccess", schema: z.string().max(200).nullish()},
    seasonalAccessIssue: {path: "ruralAccess", schema: z.boolean().optional()},
    easementRightOfWayKnown: {path: "ruralAccess", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},

    // PAGE RA-03 — Water & Wastewater (seller-reported only, never a compliance claim)
    waterSource: {path: "ruralWater", schema: z.enum(WATER_SOURCE_OPTIONS).optional()},
    wellLocationKnown: {path: "ruralWater", schema: z.boolean().optional()},
    wellRecordAvailable: {path: "ruralWater", schema: z.boolean().optional()},
    waterTreatmentEquipment: {
      path: "ruralWater",
      schema: z.array(z.enum(WATER_TREATMENT_OPTIONS)).optional(),
    },
    waterSoftener: {path: "ruralWater", schema: z.enum(WATER_SOFTENER_OPTIONS).optional()},
    septicSystem: {path: "ruralWater", schema: z.boolean().optional()},
    septicType: {path: "ruralWater", schema: z.enum(SEPTIC_TYPE_OPTIONS).optional()},
    septicLocationKnown: {path: "ruralWater", schema: z.boolean().optional()},
    septicRecordAvailable: {path: "ruralWater", schema: z.boolean().optional()},
    approxSepticInstallationYear: {path: "ruralWater", schema: z.string().max(20).nullish()},
    municipalSewer: {path: "ruralWater", schema: z.boolean().optional()},

    // PAGE RA-04 — Land & Site Features
    naturalFeatures: {path: "ruralLand", schema: z.array(z.enum(NATURAL_FEATURE_OPTIONS)).optional()},
    conservationAreaInvolvementKnown: {path: "ruralLand", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    farmingCurrentlyOccurring: {path: "ruralLand", schema: z.boolean().optional()},
    agriculturalUse: {path: "ruralLand", schema: z.string().max(200).nullish()},
    fencedAcreage: {path: "ruralLand", schema: z.enum(FENCED_YARD_OPTIONS).optional()},
    views: {path: "ruralLand", schema: z.array(z.string().min(1).max(60)).max(10).optional()},
    otherLandFeatures: {path: "ruralLand", schema: z.string().max(300).nullish()},

    // PAGE RA-05 — Outbuildings & Structures (repeatable, a property may have several)
    outbuildings: {
      path: "outbuildings",
      schema: z.array(z.object({
        structureType: z.enum(OUTBUILDING_TYPE_OPTIONS),
        approximateSize: z.string().max(50).nullish(),
        electricity: z.boolean().optional(),
        water: z.boolean().optional(),
        heating: z.boolean().optional(),
        insulated: z.enum(YES_NO_NOT_SURE_OPTIONS).optional(),
        currentUse: z.string().max(200).nullish(),
        additionalDescription: z.string().max(300).nullish(),
      }).strict()).max(15).optional(),
    },

    // PAGE RA-06/RA-07/RA-08 — House Exterior & Parking / Inside Your Home / Basement
    ...buildExteriorLotFields("exterior"),
    ...buildParkingGarageFields("garage"),
    ...buildResidentialInteriorFields("interior"),
    ...buildBasementFields("basement"),

    // PAGE RA-09 — Rural Utilities
    ruralElectricity: {path: "ruralUtilities", schema: z.string().max(30).nullish()},
    ruralHeatingType: {path: "ruralUtilities", schema: z.enum(HEATING_TYPE_OPTIONS).optional()},
    ruralHeatingFuel: {path: "ruralUtilities", schema: z.enum(HEATING_FUEL_OPTIONS).optional()},
    ruralCooling: {path: "ruralUtilities", schema: z.enum(COOLING_OPTIONS).optional()},
    generator: {path: "ruralUtilities", schema: z.boolean().optional()},
    generatorType: {path: "ruralUtilities", schema: z.enum(GENERATOR_TYPE_OPTIONS).optional()},
    internetAvailable: {path: "ruralUtilities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    internetType: {path: "ruralUtilities", schema: z.enum(INTERNET_TYPE_OPTIONS).optional()},
    propaneTank: {path: "ruralUtilities", schema: z.enum(TANK_OWNERSHIP_OPTIONS).optional()},
    oilTank: {path: "ruralUtilities", schema: z.boolean().optional()},
  },

  duplex: {
    // PAGE IP-01 — Income Property Configuration
    propertyConfiguration: {path: "incomeProperty", schema: z.enum(PROPERTY_CONFIGURATION_OPTIONS)},
    currentUse: {path: "incomeProperty", schema: z.enum(CURRENT_USE_OPTIONS).optional()},
    numberOfResidentialUnits: {
      path: "incomeProperty",
      schema: z.union([z.literal(2), z.literal(3)]).optional(),
    },
    // Seller-provided information requiring brokerage review — never an assertion
    // by the platform that a unit is legally authorized.
    unitsRecognizedBySellerAs: {path: "incomeProperty", schema: z.enum(UNITS_RECOGNIZED_OPTIONS).optional()},
    ownerOccupiesUnit: {path: "incomeProperty", schema: z.boolean().optional()},
    approximateYearBuilt: {path: "incomeProperty", schema: z.string().max(20).nullish()},
    approxBuildingSquareFootage: {path: "incomeProperty", schema: z.string().max(30).nullish()},
    storeys: {path: "incomeProperty", schema: z.number().int().min(1).max(10).optional()},
    separateEntrances: {path: "incomeProperty", schema: z.boolean().optional()},
    commonEntrance: {path: "incomeProperty", schema: z.boolean().optional()},

    // PAGE IP-02/IP-03/IP-04 — Unit 1/2/3: one repeatable Unit object, not three
    // separate field systems. UI shows up to 3 (Unit 3 only for a triplex); the
    // schema itself just caps the array length.
    units: {
      path: "units",
      schema: z.array(z.object({
        unitIdentifier: z.string().max(50).nullish(),
        floorLocation: z.string().max(100).nullish(),
        bedrooms: z.number().int().min(0).max(15).optional(),
        bathrooms: bathroomsSchema(),
        kitchen: z.boolean().optional(),
        livingRoom: z.boolean().optional(),
        diningArea: z.boolean().optional(),
        laundry: z.enum(UNIT_LAUNDRY_OPTIONS).optional(),
        separateEntrance: z.boolean().optional(),
        approxUnitSize: z.string().max(50).nullish(),
        currentOccupancy: z.enum(UNIT_OCCUPANCY_OPTIONS).optional(),
        additionalUnitFeatures: z.string().max(300).nullish(),
        // Rent is a material characteristic of an income property (unlike the
        // simplified tenancy question used for an ordinary detached seller),
        // so it lives on the unit itself, only collected when tenant-occupied.
        tenancy: z.object({
          tenancyType: z.enum(TENANCY_TYPE_OPTIONS).optional(),
          currentMonthlyRent: z.number().min(0).max(1_000_000).optional(),
          utilitiesIncluded: z.array(z.enum(UTILITY_OPTIONS)).optional(),
          tenantPaysUtilities: z.array(z.enum(UTILITY_OPTIONS)).optional(),
          vacantPossessionIntended: z.enum(YES_NO_UNKNOWN_OPTIONS).optional(),
        }).strict().nullish(),
      }).strict()).max(3).optional(),
    },

    // PAGE IP-05 — Building Systems & Utilities
    electricalService: {path: "buildingSystems", schema: z.string().max(50).nullish()},
    separateElectricalMeters: {path: "buildingSystems", schema: z.boolean().optional()},
    separateGasMeters: {path: "buildingSystems", schema: z.boolean().optional()},
    separateWaterMeters: {path: "buildingSystems", schema: z.boolean().optional()},
    buildingHeatingSystem: {path: "buildingSystems", schema: z.enum(HEATING_TYPE_OPTIONS).optional()},
    buildingHeatingFuel: {path: "buildingSystems", schema: z.enum(HEATING_FUEL_OPTIONS).optional()},
    buildingCooling: {path: "buildingSystems", schema: z.enum(COOLING_OPTIONS).optional()},
    buildingHotWaterSystem: {path: "buildingSystems", schema: z.enum(HOT_WATER_OPTIONS).optional()},
    buildingWater: {path: "buildingSystems", schema: z.enum(WATER_SUPPLY_OPTIONS).optional()},
    buildingSewer: {path: "buildingSystems", schema: z.enum(SEWER_OPTIONS).optional()},
    whoPaysWater: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS).optional()},
    whoPaysHeat: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS).optional()},
    whoPaysHydro: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS).optional()},

    // PAGE IP-06 — Common Areas & Laundry
    sharedLaundry: {path: "commonAreas", schema: z.boolean().optional()},
    coinOperatedLaundry: {path: "commonAreas", schema: z.boolean().optional()},
    commonHallways: {path: "commonAreas", schema: z.boolean().optional()},
    sharedStorage: {path: "commonAreas", schema: z.boolean().optional()},
    separateStorageByUnit: {path: "commonAreas", schema: z.boolean().optional()},
    sharedOutdoorArea: {path: "commonAreas", schema: z.boolean().optional()},
    otherCommonFacilities: {path: "commonAreas", schema: z.string().max(300).nullish()},

    // PAGE IP-07 — Parking
    incomePropertyGarage: {path: "incomePropertyParking", schema: z.boolean().optional()},
    incomePropertyGarageSpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(10).optional(),
    },
    incomePropertyDrivewaySpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(20).optional(),
    },
    incomePropertyTotalSpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(30).optional(),
    },
    parkingAssignedByUnit: {path: "incomePropertyParking", schema: z.boolean().optional()},
    unit1Parking: {path: "incomePropertyParking", schema: z.string().max(50).nullish()},
    unit2Parking: {path: "incomePropertyParking", schema: z.string().max(50).nullish()},
    unit3Parking: {path: "incomePropertyParking", schema: z.string().max(50).nullish()},
    sharedParking: {path: "incomePropertyParking", schema: z.boolean().optional()},

    // PAGE IP-08 — Exterior & Property Features (reuses the standard shell)
    ...buildExteriorLotFields("exterior"),
  },

  condoApartment: {
    // PAGE CA-01 — Your Condo
    unitNumber: {path: "condoUnit", schema: z.string().max(30).nullish()},
    buildingName: {path: "condoUnit", schema: z.string().max(150).nullish()},
    unitLevel: {path: "condoUnit", schema: z.string().max(20).nullish()},
    approximateUnitSize: {path: "condoUnit", schema: z.string().max(30).nullish()},
    sourceOfSquareFootage: {path: "condoUnit", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS).optional()},
    unitExposure: {path: "condoUnit", schema: z.array(z.enum(UNIT_EXPOSURE_OPTIONS)).max(4).optional()},
    unitStyle: {path: "condoUnit", schema: z.enum(UNIT_STYLE_OPTIONS).optional()},
    numberOfLevelsWithinUnit: {path: "condoUnit", schema: z.string().max(10).nullish()},
    yearBuilt: {path: "condoUnit", schema: z.string().max(20).nullish()},

    // PAGE CA-02 — Inside Your Condo
    bedrooms: {path: "interior", schema: z.number().int().min(0).max(10).optional()},
    bedroomDenConfiguration: {path: "interior", schema: z.enum(CONDO_BEDROOM_DEN_OPTIONS).optional()},
    bathrooms: {path: "interior", schema: bathroomsSchema()},
    kitchenStyle: {path: "interior", schema: z.enum(KITCHEN_STYLE_OPTIONS).optional()},
    livingRoom: {path: "interior", schema: z.boolean().optional()},
    diningArea: {path: "interior", schema: z.boolean().optional()},
    denOffice: {path: "interior", schema: z.boolean().optional()},
    ensuiteLaundry: {path: "interior", schema: z.boolean().optional()},
    laundryLocation: {path: "interior", schema: z.enum(LAUNDRY_LOCATION_OPTIONS).optional()},
    fireplace: {path: "interior", schema: z.enum(FIREPLACE_OPTIONS).optional()},
    flooring: {path: "interior", schema: z.array(z.enum(FLOORING_OPTIONS)).optional()},
    interiorFeatures: {path: "interior", schema: z.array(z.string().min(1).max(60)).max(15).optional()},
    renovationsUpgrades: {path: "interior", schema: z.string().max(500).nullish()},
    additionalRooms: {
      path: "interior",
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().max(200).nullish(),
      }).strict()).max(10).optional(),
    },

    // PAGE CA-03 — Balcony & Private Outdoor Space
    balcony: {path: "outdoorSpace", schema: z.boolean().optional()},
    balconyType: {path: "outdoorSpace", schema: z.enum(BALCONY_TYPE_OPTIONS).optional()},
    balconyExposure: {path: "outdoorSpace", schema: z.enum(UNIT_EXPOSURE_OPTIONS).optional()},
    terrace: {path: "outdoorSpace", schema: z.boolean().optional()},
    privatePatio: {path: "outdoorSpace", schema: z.boolean().optional()},
    approxOutdoorSize: {path: "outdoorSpace", schema: z.string().max(30).nullish()},
    outdoorFeatures: {path: "outdoorSpace", schema: z.string().max(300).nullish()},

    // PAGE CA-04 — Parking
    ...buildCondoParkingFields("condoParking"),

    // PAGE CA-05 — Locker / Storage
    lockerIncluded: {path: "condoLocker", schema: z.boolean().optional()},
    numberOfLockers: {path: "condoLocker", schema: z.number().int().min(0).max(5).optional()},
    lockerOwnership: {path: "condoLocker", schema: z.enum(OWNERSHIP_TYPE_OPTIONS).optional()},
    lockerLevelLocation: {path: "condoLocker", schema: z.string().max(30).nullish()},
    lockerNumber: {path: "condoLocker", schema: z.string().max(30).nullish()},
    otherStorage: {path: "condoLocker", schema: z.string().max(200).nullish()},

    // PAGE CA-06 — Condo Fees & Inclusions
    monthlyCondoFee: {path: "condoFees", schema: z.number().min(0).optional()},
    feeFrequency: {path: "condoFees", schema: z.enum(["monthly", "other"]).default("monthly")},
    heatIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    hydroIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    waterIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    centralAirIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    parkingIncludedInFee: {path: "condoFees", schema: z.boolean().optional()},
    buildingInsuranceIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    commonElementsIncluded: {path: "condoFees", schema: z.boolean().optional()},
    cableInternetIncluded: {path: "condoFees", schema: z.boolean().optional()},
    otherFeeInclusions: {path: "condoFees", schema: z.string().max(300).nullish()},
    // Seller-reported flag only; the schema doesn't collect a legal special-
    // assessment disclosure, just enough to route the listing for review.
    specialAssessmentKnown: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    specialAssessmentDetails: {path: "condoFees", schema: z.string().max(500).nullish()},

    // PAGE CA-07 — Building & Amenities
    buildingAmenities: {path: "amenities", schema: z.array(z.enum(CONDO_AMENITIES_OPTIONS)).optional()},
    otherAmenities: {path: "amenities", schema: z.string().max(300).nullish()},
    bbqPermitted: {path: "amenities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    petRestrictionsKnown: {path: "amenities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
  },

  condoTownhouse: {
    // PAGE CT-01 — Your Condo Townhouse
    townhouseConfiguration: {
      path: "townhouseConfig",
      schema: z.enum(TOWNHOUSE_CONFIGURATION_OPTIONS).optional(),
    },
    position: {path: "townhouseConfig", schema: z.enum(TOWNHOUSE_POSITION_OPTIONS).optional()},
    numberOfStoreys: {path: "townhouseConfig", schema: z.string().max(10).nullish()},
    approxSquareFootage: {path: "townhouseConfig", schema: z.string().max(30).nullish()},
    sourceOfSquareFootage: {path: "townhouseConfig", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS).optional()},
    yearBuilt: {path: "townhouseConfig", schema: z.string().max(20).nullish()},
    unitNumber: {path: "townhouseConfig", schema: z.string().max(30).nullish()},
    privateEntrance: {path: "townhouseConfig", schema: z.boolean().optional()},
    // Only meaningful when townhouseConfiguration = "stacked"; harmless no-op
    // otherwise, matching how the rest of the registry handles conditional
    // fields (the FE decides what to show, the schema just validates what's sent).
    unitPosition: {path: "townhouseConfig", schema: z.enum(STACKED_UNIT_POSITION_OPTIONS).optional()},
    interiorStairsToUnit: {path: "townhouseConfig", schema: z.boolean().optional()},
    exteriorEntrance: {path: "townhouseConfig", schema: z.boolean().optional()},

    // PAGE CT-02 — Exterior & Your Outdoor Space
    frontPorch: {path: "outdoorSpace", schema: z.boolean().optional()},
    privateYard: {path: "outdoorSpace", schema: z.boolean().optional()},
    yardFenced: {path: "outdoorSpace", schema: z.enum(FENCED_YARD_OPTIONS).optional()},
    patio: {path: "outdoorSpace", schema: z.boolean().optional()},
    deck: {path: "outdoorSpace", schema: z.boolean().optional()},
    balcony: {path: "outdoorSpace", schema: z.boolean().optional()},
    terrace: {path: "outdoorSpace", schema: z.boolean().optional()},
    bbqPermitted: {path: "outdoorSpace", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    exteriorMaintenanceResponsibilityKnown: {
      path: "outdoorSpace",
      schema: z.enum(MAINTENANCE_RESPONSIBILITY_OPTIONS).optional(),
    },
    outdoorFeatures: {path: "outdoorSpace", schema: z.string().max(300).nullish()},

    // PAGE CT-03 — Parking & Garage
    hasGarage: {path: "parking", schema: z.boolean().optional()},
    garageType: {path: "parking", schema: z.enum(GARAGE_TYPE_OPTIONS).optional()},
    garageSpaces: {path: "parking", schema: z.number().int().min(0).max(5).optional()},
    drivewayParkingSpaces: {path: "parking", schema: z.number().int().min(0).max(10).optional()},
    condoParkingSpace: {path: "parking", schema: z.boolean().optional()},
    parkingOwnership: {path: "parking", schema: z.enum(OWNERSHIP_TYPE_OPTIONS).optional()},
    parkingSpaceNumber: {path: "parking", schema: z.string().max(30).nullish()},
    parkingLevel: {path: "parking", schema: z.string().max(30).nullish()},
    insideAccessFromGarage: {path: "parking", schema: z.boolean().optional()},
    visitorParking: {path: "parking", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},
    evCharging: {path: "parking", schema: z.enum(YES_NO_NOT_SURE_OPTIONS).optional()},

    // PAGE CT-04 — Inside Your Townhouse
    bedrooms: {path: "interior", schema: z.number().int().min(0).max(10).optional()},
    bathrooms: {path: "interior", schema: bathroomsSchema()},
    kitchenStyle: {path: "interior", schema: z.enum(KITCHEN_STYLE_OPTIONS).optional()},
    livingRoom: {path: "interior", schema: z.boolean().optional()},
    diningRoom: {path: "interior", schema: z.boolean().optional()},
    familyRoom: {path: "interior", schema: z.boolean().optional()},
    denOffice: {path: "interior", schema: z.boolean().optional()},
    laundryLocation: {path: "interior", schema: z.enum(LAUNDRY_LOCATION_OPTIONS).optional()},
    fireplace: {path: "interior", schema: z.enum(FIREPLACE_OPTIONS).optional()},
    flooring: {path: "interior", schema: z.array(z.enum(FLOORING_OPTIONS)).optional()},
    interiorUpgrades: {path: "interior", schema: z.string().max(500).nullish()},
    additionalRooms: {
      path: "interior",
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().max(200).nullish(),
      }).strict()).max(10).optional(),
    },

    // PAGE CT-05 — Basement / Lower Level (not assumed to exist; FE may skip
    // this page entirely for stacked configurations)
    ...buildBasementFields("basement"),

    // PAGE CT-06 — Locker / Storage
    lockerStorageIncluded: {path: "lockerStorage", schema: z.boolean().optional()},
    lockerOwnership: {path: "lockerStorage", schema: z.enum(OWNERSHIP_TYPE_OPTIONS).optional()},
    lockerNumber: {path: "lockerStorage", schema: z.string().max(30).nullish()},
    lockerLocation: {path: "lockerStorage", schema: z.string().max(30).nullish()},
    additionalStorage: {path: "lockerStorage", schema: z.string().max(200).nullish()},

    // PAGE CT-07 — Condo Fees
    monthlyMaintenanceFee: {path: "condoFees", schema: z.number().min(0).optional()},
    waterIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    heatIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    hydroIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    exteriorMaintenanceIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    landscapingIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    snowRemovalIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    feeParkingIncluded: {path: "condoFees", schema: z.boolean().optional()},
    buildingCommonInsurance: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},
    otherFeeInclusions: {path: "condoFees", schema: z.string().max(300).nullish()},
    specialAssessmentKnown: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS).optional()},

    // PAGE CT-08 — Common Elements & Amenities
    buildingAmenities: {path: "amenities", schema: z.array(z.enum(CONDO_AMENITIES_OPTIONS)).optional()},
    otherAmenities: {path: "amenities", schema: z.string().max(300).nullish()},
  },
};

// "Stacked Townhouse" and "Co-operative Apartment" appear as selectable
// property-type tiles on the Condo Apartment category screen, but no
// dedicated field-collection screens have been designed for either — stacked
// configuration is now captured directly via condoTownhouse.townhouseConfiguration
// instead. Reusing the closest matching type's fields as a starting point;
// swap these out once dedicated screens exist for them.
propertyTypeFields.stackedTownhouse = propertyTypeFields.condoTownhouse;
propertyTypeFields.coOperativeApartment = propertyTypeFields.condoApartment;

/**
 * ─────────────────────────────────────────────────────────────────────
 * FIELDS SHARED BY EVERY PROPERTY TYPE
 *
 * These come from screens that don't branch by property type: address
 * capture, occupancy/contact/ownership/mailing, and the common "merge
 * point" pages every branch returns to (Location & Nearby Features,
 * Listing Description, Chattels, Fixtures, Rented/Leased Items).
 * ─────────────────────────────────────────────────────────────────────
 */
const commonFields = {
  propertyType: {
    path: "top",
    schema: z.enum(Object.keys(propertyTypeFields)),
  },

  askingPrice: {path: "pricing", schema: z.number().positive().max(1_000_000_000_000)},

  // .min(1) below: Joi.string().required() rejects "" by default, independent
  // of .required() itself — plain z.string() alone would not, so every
  // required plain-string field (no enum/regex to reject "" on its own) gets
  // an explicit .min(1) to match. Optional text fields (.nullish() below)
  // need no such change, since Joi's explicit .allow("", null) already
  // permits empty string, which z.string() also permits by default.
  streetNumber: {path: "location", schema: z.string().min(1).max(20)},
  streetName: {path: "location", schema: z.string().min(1).max(100)},
  abbreviation: {path: "location", schema: z.string().max(20).nullish()},
  streetDirection: {path: "location", schema: z.string().max(10).nullish()},
  apartmentUnitNumber: {path: "location", schema: z.string().max(20).nullish()},
  municipality: {path: "location", schema: z.string().min(1).max(100)},

  buyersWillLove: {path: "buyerInfo", schema: z.string().min(1).max(2000)},
  includedItems: {path: "buyerInfo", schema: z.string().max(1000).nullish()},
  excludedItems: {path: "buyerInfo", schema: z.string().max(300).nullish()},
  rentalItemsEquipment: {path: "buyerInfo", schema: z.string().max(250).nullish()},

  recentImprovements: {path: "improvements", schema: z.string().max(1000).nullish()},

  // Occupancy / Tenancy — the "decision page" reused across property types.
  // Once captured, this shouldn't be asked again for the same listing.
  occupancyStatus: {path: "occupancy", schema: z.enum(OCCUPANCY_OPTIONS)},
  occupancyPathway: {path: "occupancy", schema: z.enum(OCCUPANCY_PATHWAY_OPTIONS).optional()},
  tenancyPossession: {
    path: "occupancy",
    schema: z.enum(["fixed_term", "month_to_month", "vacant_possession_on_closing"]).nullish(),
  },
  areasOccupiedByTenant: {path: "occupancy", schema: z.enum(AREAS_OCCUPIED_OPTIONS).optional()},
  additionalTenancyInformation: {path: "occupancy", schema: z.string().max(500).nullish()},
  // Original Joi kept .pattern(...).allow("", null) — unlike a plain string,
  // Zod's format check (.regex()) still rejects "" even under .nullish(), so
  // "" is added back explicitly via a union to keep parity with the original
  // explicit empty-string allowance.
  fixedTermUntil: {
    path: "occupancy",
    schema: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullish(),
  },
  leaseAgreementAvailable: {path: "occupancy", schema: z.boolean().nullish()},

  sellerFullName: {path: "contact", schema: z.string().min(1).max(150)},
  sellerEmail: {path: "contact", schema: emailSchema()},
  sellerPhone: {path: "contact", schema: z.string().min(1).max(20)},
  preferredContactMethod: {path: "contact", schema: z.enum(CONTACT_METHOD_OPTIONS)},
  bestTimesToReach: {path: "contact", schema: z.array(z.enum(BEST_TIMES_OPTIONS)).nullish()},

  isRegisteredOwner: {path: "ownership", schema: z.boolean()},
  hasAdditionalOwners: {path: "ownership", schema: z.boolean().optional()},
  // Item strings here have no explicit "" allowance in the original
  // (Joi.string().max(150) with no .allow("", null)), so, like roomType/item
  // elsewhere, they need .min(1) to keep rejecting empty-string entries.
  additionalOwnerNames: {path: "ownership", schema: z.array(z.string().min(1).max(150)).max(10).nullish()},
  additionalOwners: {
    path: "ownership",
    schema: z.array(z.object({
      firstName: z.string().max(80).nullish(),
      lastName: z.string().max(150).nullish(),
    }).strict()).max(10).nullish(),
  },
  authorityType: {
    path: "ownership",
    schema: z.enum([
      "power-of-attorney",
      "estate-trustee",
      "court-guardian",
      "corporate-officer",
      "trustee",
      "other",
    ]).nullish(),
  },
  lawyerAssisting: {
    path: "ownership",
    schema: z.enum(["yes", "no", "not-yet"]).nullish(),
  },
  lawyer: {
    path: "ownership",
    schema: z.object({
      fullName: z.string().max(150).nullish(),
      firm: z.string().max(150).nullish(),
      // Original allowed "" explicitly alongside a valid-email check
      // (Joi.string().email().allow("", null)) — emailSchema().nullish()
      // alone would reject "" since it still runs the format/TLD check, so
      // "" is added back via a union to preserve that allowance.
      email: z.union([z.literal(""), emailSchema()]).nullish(),
      phone: z.string().max(30).nullish(),
      lawSocietyNumber: z.string().max(40).nullish(),
      // Original was Joi.string().valid(...).allow("", null) — same
      // "" -> enum parity concern as email above.
      represents: z.union([
        z.literal(""),
        z.enum(["registered-owner", "legal-authority", "both"]),
      ]).nullish(),
      contactAuthorized: z.boolean().optional(),
    }).passthrough().nullish(),
  },

  mailingAddressDifferent: {path: "mailingAddress", schema: z.boolean().optional()},
  mailingAddressDetails: {path: "mailingAddress", schema: z.string().max(300).nullish()},

  // COMMON PAGE — Location & Nearby Features (every branch merges back here)
  nearbyFeatures: {path: "locationFeatures", schema: z.array(z.enum(NEARBY_FEATURE_OPTIONS)).optional()},
  otherLocationAdvantages: {path: "locationFeatures", schema: z.string().max(300).nullish()},
  whatDoYouLikeAboutLocation: {path: "locationFeatures", schema: z.string().max(500).nullish()},

  // COMMON PAGE — Listing Description (AI may help write it, but must not
  // invent property facts — enforced by the writing flow, not this schema)
  sellerPropertyHighlights: {path: "listingDescription", schema: z.string().max(1000).nullish()},
  clientPublicRemarks: {path: "listingDescription", schema: z.string().max(1500).nullish()},
  aiAssistanceRequested: {path: "listingDescription", schema: z.boolean().optional()},
  specialSellingFeatures: {path: "listingDescription", schema: z.string().max(500).nullish()},

  // COMMON PAGE — Chattels
  chattelsIncluded: {path: "chattels", schema: z.array(z.enum(CHATTEL_OPTIONS)).optional()},
  otherChattels: {path: "chattels", schema: z.string().max(300).nullish()},

  // COMMON PAGE — Fixtures excluded from the sale
  excludedFixtures: {path: "fixtures", schema: z.string().max(500).nullish()},

  // COMMON PAGE — Rented / Leased Items: one repeatable object, not twenty
  // separate fields (hot-water heaters, HVAC, water softeners, propane tanks...).
  rentedLeasedItems: {
    path: "rentedItems",
    schema: z.array(z.object({
      item: z.string().min(1).max(100),
      provider: z.string().max(150).nullish(),
      approxPayment: z.number().min(0).nullish(),
      buyoutKnown: z.enum(["yes", "no", "not_sure"]).nullish(),
    }).strict()).max(15).optional(),
  },
};

/**
 * Resolves the validation + storage definition for a (propertyType, fieldName)
 * pair. Type-specific fields take priority over common fields of the same name.
 *
 * @param {string} propertyType
 * @param {string} fieldName
 * @returns {{ path: string, dbKey: string, schema: import('zod').ZodType } | null}
 */
const getFieldDefinition = (propertyType, fieldName) => {
  const typeFields = propertyTypeFields[propertyType] || {};
  const def = typeFields[fieldName] || commonFields[fieldName];
  if (!def) return null;
  return {...def, dbKey: def.dbKey || fieldName};
};

const isValidPropertyType = (propertyType) =>
  Object.prototype.hasOwnProperty.call(propertyTypeFields, propertyType);

module.exports = {
  getFieldDefinition,
  isValidPropertyType,
  propertyTypeFields,
  commonFields,
};
