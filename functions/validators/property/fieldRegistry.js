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

const ENUM_VALUE_LABELS = {
  yes: "Yes", no: "No", not_sure: "Not sure", unknown: "Not sure", other: "Other", none: "None",
  partial: "Partial", full: "Full", unfinished: "Unfinished",

  owner_occupied: "Owner occupied", tenant_occupied: "Tenant occupied", vacant: "Vacant",
  tenanted: "Tenanted", vacant_possession_on_closing: "Vacant possession on closing",
  i_know_what_i_need: "I know what I need", entire_property: "Entire property",
  other_portion: "Other portion", email: "Email", text: "Text", phone: "Phone",
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", anytime: "Anytime",

  brick: "Brick", stone: "Stone", stucco: "Stucco", vinyl_siding: "Vinyl siding",
  aluminum_siding: "Aluminum siding", wood: "Wood", concrete: "Concrete",
  asphalt_shingles: "Asphalt shingles", metal: "Metal", flat_membrane: "Flat membrane",
  wood_shake: "Wood shake", slate: "Slate", above_ground: "Above ground", in_ground: "In-ground",
  bungalow: "Bungalow", one_and_half_storey: "1.5 storey", two_storey: "2 storey",
  two_and_half_storey: "2.5 storey", three_storey: "3 storey", sidesplit: "Sidesplit",
  backsplit: "Backsplit", seller: "Seller", builder: "Builder",
  previous_listing: "Previous listing", mpac: "MPAC",

  attached: "Attached", detached: "Detached", built_in: "Built-in", carport: "Carport",
  private: "Private", mutual: "Mutual", shared: "Shared", circular: "Circular",
  paved: "Paved", interlock: "Interlock", gravel: "Gravel", underground: "Underground",
  surface: "Surface", garage: "Garage", owned: "Owned", exclusive_use: "Exclusive use",
  rental: "Rental", available_nearby: "Available nearby",

  main: "Main floor", upper: "Upper floor", basement: "Basement", gas: "Gas",
  electric: "Electric", hardwood: "Hardwood", engineered_hardwood: "Engineered hardwood",
  laminate: "Laminate", tile: "Tile", carpet: "Carpet", luxury_vinyl: "Luxury vinyl",
  renovated_kitchen: "Renovated kitchen", hardwood_floors: "Hardwood floors",
  updated_bathrooms: "Updated bathrooms", open_concept_layout: "Open-concept layout",
  pot_lights: "Pot lights", high_ceilings: "High ceilings",
  stainless_steel_appliances: "Stainless steel appliances", central_air: "Central air",
  newer_windows: "Newer windows", no_step_entry: "No-step entry", wide_doorways: "Wide doorways",
  main_floor_bedroom: "Main-floor bedroom", main_floor_bathroom: "Main-floor bathroom",
  grab_bars: "Grab bars", ramp: "Ramp", stairlift: "Stairlift",

  forced_air: "Forced air", boiler: "Boiler", radiant: "Radiant", heat_pump: "Heat pump",
  baseboard: "Baseboard", natural_gas: "Natural gas", oil: "Oil", propane: "Propane",
  window: "Window unit", municipal: "Municipal", well: "Well", septic: "Septic",
  rented: "Rented",

  finished: "Finished", partially_finished: "Partially finished",
  legal: "Legal", legal_non_conforming: "Legal non-conforming", family: "Family", tenant: "Tenant",
  two_piece: "2-piece", three_piece: "3-piece", four_piece: "4-piece",
  five_piece_plus: "5-piece+", ensuite: "Ensuite",

  garden_suite: "Garden suite", laneway_house: "Laneway house", coach_house: "Coach house",
  above_garage_suite: "Above-garage suite", owner: "Owner",

  residential_acreage: "Residential acreage", hobby_farm: "Hobby farm",
  estate_property: "Estate property", regular: "Regular", irregular: "Irregular",
  unopened: "Unopened", municipality: "Municipality", drilled_well: "Drilled well",
  dug_well: "Dug well", lake: "Lake", cistern: "Cistern", uv_treatment: "UV treatment",
  reverse_osmosis: "Reverse osmosis", water_softener: "Water softener",
  sediment_filter: "Sediment filter", conventional: "Conventional",
  holding_tank: "Holding tank", wooded_area: "Wooded area", open_field: "Open field",
  pond: "Pond", creek_stream: "Creek / stream", waterfront: "Waterfront", trails: "Trails",
  barn: "Barn", workshop: "Workshop", shed: "Shed", detached_garage: "Detached garage",
  stable: "Stable", drive_shed: "Drive shed", greenhouse: "Greenhouse",
  permanent: "Permanent", portable: "Portable", fibre: "Fibre", cable: "Cable", dsl: "DSL",
  fixed_wireless: "Fixed wireless", satellite: "Satellite",

  duplex: "Duplex", triplex: "Triplex", entirely_residential: "Entirely residential",
  mixed_use: "Mixed use", fixed_term: "Fixed term", month_to_month: "Month-to-month",
  heat: "Heat", hydro: "Hydro", water: "Water", cable_internet: "Cable / internet",
  mixed: "Mixed",

  studio: "Studio", "1_bedroom": "1 bedroom", "1_bedroom_den": "1 bedroom + den",
  "2_bedroom": "2 bedroom", "2_bedroom_den": "2 bedroom + den", "3_bedroom": "3 bedroom",
  "3_bedroom_den": "3 bedroom + den", "4_bedroom_plus": "4+ bedroom",
  standard: "Standard", open_concept: "Open concept", galley: "Galley",
  n: "N", s: "S", e: "E", w: "W", ne: "NE", nw: "NW", se: "SE", sw: "SW",
  apartment: "Apartment", loft: "Loft", penthouse: "Penthouse",
  open: "Open", enclosed: "Enclosed", juliette: "Juliette", terrace: "Terrace",
  concierge_security: "Concierge / security", gym: "Gym", indoor_pool: "Indoor pool",
  outdoor_pool: "Outdoor pool", party_room: "Party room", rooftop_terrace: "Rooftop terrace",
  guest_suites: "Guest suites", visitor_parking: "Visitor parking", bike_storage: "Bike storage",
  sauna: "Sauna", games_media_room: "Games / media room", back_to_back: "Back-to-back",
  end_unit: "End unit", interior_unit: "Interior unit", stacked: "Stacked", lower: "Lower",
  condo: "Condo",

  schools_nearby: "Schools nearby", public_transit: "Public transit", go_transit: "GO Transit",
  shopping: "Shopping", restaurants: "Restaurants", parks: "Parks", recreation: "Recreation",
  highway_access: "Highway access", hospital_healthcare: "Hospital / healthcare",
  golf: "Golf", fridge: "Fridge", stove: "Stove", dishwasher: "Dishwasher", washer: "Washer",
  dryer: "Dryer", microwave: "Microwave", window_coverings: "Window coverings",
  light_fixtures: "Light fixtures",

  left: "Left side", right: "Right side", monthly: "Monthly",
};

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
}).strict();

/** Reusable "Parking & Garage" component (detached / semiDetached / rural house). */
function buildParkingGarageFields(path = "garage") {
  return {
    hasGarage: {path, schema: z.boolean()},
    garageType: {path, schema: z.enum(GARAGE_TYPE_OPTIONS)},
    garageSpaces: {path, schema: z.number().int().min(0).max(10)},
    insideEntryFromGarage: {path, schema: z.boolean()},
    garageDoorOpener: {path, schema: z.boolean()},
    hasDriveway: {path, schema: z.boolean()},
    drivewayType: {path, schema: z.enum(DRIVEWAY_TYPE_OPTIONS)},
    drivewaySurface: {path, schema: z.enum(DRIVEWAY_SURFACE_OPTIONS)},
    drivewayParkingSpaces: {path, schema: z.number().int().min(0).max(20)},
    totalParkingSpaces: {path, schema: z.number().int().min(0).max(30)},
    otherParkingInformation: {path, schema: z.string().min(1).max(300)},
  };
}

/** Reusable condominium parking component (condoApartment / condoTownhouse). */
function buildCondoParkingFields(path = "condoParking") {
  return {
    parkingIncluded: {path, schema: z.boolean()},
    numberOfParkingSpaces: {path, schema: z.number().int().min(0).max(10)},
    parkingType: {path, schema: z.enum(CONDO_PARKING_TYPE_OPTIONS)},
    parkingOwnership: {path, schema: z.enum(OWNERSHIP_TYPE_OPTIONS)},
    parkingLevel: {path, schema: z.string().min(1).max(30)},
    parkingSpaceNumber: {path, schema: z.string().min(1).max(30)},
    evCharging: {path, schema: z.enum(EV_CHARGING_OPTIONS)},
  };
}

/** Reusable "Exterior & Lot" shell (frontage/construction/roof/yard features). */
function buildExteriorLotFields(path = "exterior") {
  return {
    lotFrontage: {path, schema: z.number().positive().max(10000)},
    lotDepth: {path, schema: z.number().positive().max(10000)},
    irregularLot: {path, schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    cornerLot: {path, schema: z.boolean()},
    exteriorConstruction: {path, schema: z.array(z.enum(EXTERIOR_CONSTRUCTION_OPTIONS)).min(1)},
    roofType: {path, schema: z.enum(ROOF_TYPE_OPTIONS)},
    roofApproximateAge: {path, schema: z.number().int().min(0).max(100)},
    frontPorch: {path, schema: z.boolean()},
    deck: {path, schema: z.boolean()},
    patio: {path, schema: z.boolean()},
    fencedYard: {path, schema: z.enum(FENCED_YARD_OPTIONS)},
    landscapingFeatures: {path, schema: z.array(z.string().min(1).max(60)).max(20).min(1)},
    shed: {path, schema: z.boolean()},
    pool: {path, schema: z.enum(POOL_OPTIONS)},
    hotTub: {path, schema: z.boolean()},
    otherExteriorFeatures: {path, schema: z.string().min(1).max(300)},
  };
}

/** Reusable "Residential Interior" component (detached / semiDetached / rural house). */
function buildResidentialInteriorFields(path = "interior") {
  return {
    bedroomsAboveGrade: {path, schema: z.number().int().min(0).max(20)},
    bathrooms: {path, schema: bathroomsSchema()},
    primaryBedroom: {path, schema: z.boolean()},
    kitchenCount: {path, schema: z.number().int().min(0).max(5)},
    livingRoom: {path, schema: z.boolean()},
    diningRoom: {path, schema: z.boolean()},
    familyRoom: {path, schema: z.boolean()},
    denOffice: {path, schema: z.boolean()},
    breakfastArea: {path, schema: z.boolean()},
    laundryLocation: {path, schema: z.enum(LAUNDRY_LOCATION_OPTIONS)},
    fireplace: {path, schema: z.enum(FIREPLACE_OPTIONS)},
    flooring: {path, schema: z.array(z.enum(FLOORING_OPTIONS)).min(1)},
    interiorUpgrades: {path, schema: z.array(z.enum(INTERIOR_UPGRADE_OPTIONS)).min(1)},
    accessibilityFeatures: {path, schema: z.array(z.enum(ACCESSIBILITY_FEATURES_OPTIONS)).min(1)},
    otherPrincipalRooms: {
      path,
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().min(1).max(200),
      }).strict()).max(10).min(1),
    },
    additionalInteriorFeatures: {path, schema: z.string().min(1).max(500)},
  };
}

/** Reusable "Systems & Utilities" component (detached / semiDetached / rural house). */
function buildSystemsUtilitiesFields(path = "systems") {
  return {
    heatingType: {path, schema: z.enum(HEATING_TYPE_OPTIONS)},
    heatingFuel: {path, schema: z.enum(HEATING_FUEL_OPTIONS)},
    cooling: {path, schema: z.enum(COOLING_OPTIONS)},
    waterSupply: {path, schema: z.enum(WATER_SUPPLY_OPTIONS)},
    sewer: {path, schema: z.enum(SEWER_OPTIONS)},
    electricalService: {path, schema: z.string().min(1).max(50)},
    hotWater: {path, schema: z.enum(HOT_WATER_OPTIONS)},
    waterSoftener: {path, schema: z.enum(WATER_SOFTENER_OPTIONS)},
    otherMechanicalSystems: {path, schema: z.string().min(1).max(300)},
  };
}

/** Reusable "Basement / Lower Level" component (detached / semiDetached / rural / condoTownhouse). */
function buildBasementFields(path = "basement") {
  return {
    hasBasement: {path, schema: z.boolean()},
    basementExtent: {path, schema: z.enum(BASEMENT_EXTENT_OPTIONS)},
    basementFinish: {path, schema: z.enum(BASEMENT_FINISH_OPTIONS)},
    walkOut: {path, schema: z.boolean()},
    walkUp: {path, schema: z.boolean()},
    basementSeparateEntrance: {path, schema: z.boolean()},
    basementBedrooms: {path, schema: z.number().int().min(0).max(10)},
    basementBathroom: {
      path,
      schema: z.object({
        present: z.boolean(),
        type: z.enum(BATHROOM_TYPE_OPTIONS),
      }).strict(),
    },
    recreationRoom: {path, schema: z.boolean()},
    basementKitchen: {path, schema: z.boolean()},
    basementLaundry: {path, schema: z.boolean()},
    additionalBasementRooms: {
      path,
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().min(1).max(200),
      }).strict()).max(10).min(1),
    },
    // Seller-provided information requiring brokerage review — the schema never
    // asserts legal authorization, only what the seller believes to be true.
    basementApartment: {path, schema: z.boolean()},
    basementApartmentStatus: {path, schema: z.enum(SELLER_UNDERSTANDING_STATUS_OPTIONS)},
    basementApartmentOccupied: {path, schema: z.boolean()},
    basementApartmentOccupancyRelationship: {
      path,
      schema: z.enum(OCCUPANCY_RELATIONSHIP_OPTIONS),
    },
    basementApartmentVacantPossessionIntended: {path, schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
  };
}

/** Reusable repeatable "Additional Living Spaces" component (detached / semiDetached). */
function buildAdditionalLivingSpaceFields(path = "additionalLivingSpaces") {
  return {
    additionalLivingSpaces: {
      path,
      schema: z.array(z.object({
        type: z.enum(ADDITIONAL_LIVING_SPACE_TYPE_OPTIONS),
        bedrooms: z.number().int().min(0).max(10),
        bathrooms: z.number().int().min(0).max(10),
        kitchen: z.boolean(),
        separateEntrance: z.boolean(),
        approximateSize: z.string().min(1).max(50),
        // Seller-provided information requiring brokerage review, not a legal
        // determination — see basementApartmentStatus above for the same pattern.
        sellerUnderstandingOfStatus: z.enum(SELLER_UNDERSTANDING_STATUS_OPTIONS),
        currentOccupancy: z.enum(CURRENT_OCCUPANCY_OPTIONS),
        occupancyRelationship: z.enum(OCCUPANCY_RELATIONSHIP_OPTIONS),
        vacantPossessionIntended: z.enum(YES_NO_UNKNOWN_OPTIONS),
        additionalDescription: z.string().min(1).max(300),
      }).strict()).max(10).min(1),
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
    houseStyle: {path: "exterior", schema: z.enum(HOUSE_STYLE_OPTIONS)},
    numberOfStoreys: {path: "exterior", schema: z.string().min(1).max(20)},
    approximateYearBuilt: {path: "exterior", schema: z.string().min(1).max(20)},
    approxAboveGradeSquareFootage: {path: "exterior", schema: z.string().min(1).max(30)},
    squareFootageSource: {path: "exterior", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS)},
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
    houseStyle: {path: "exterior", schema: z.enum(HOUSE_STYLE_OPTIONS)},
    numberOfStoreys: {path: "exterior", schema: z.string().min(1).max(20)},
    approximateYearBuilt: {path: "exterior", schema: z.string().min(1).max(20)},
    approxAboveGradeSquareFootage: {path: "exterior", schema: z.string().min(1).max(30)},
    squareFootageSource: {path: "exterior", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS)},
    // The attached-side / shared-feature fields are the genuine semi-detached
    // differences called out in the spec — everything else reuses Detached.
    attachedSide: {path: "exterior", schema: z.enum(["left", "right", "not_sure"])},
    cornerProperty: {path: "exterior", schema: z.boolean()},
    otherConfigurationNotes: {path: "exterior", schema: z.string().min(1).max(300)},
    sharedExteriorFeatureKnown: {path: "exterior", schema: z.boolean()},
    sharedWalkway: {path: "exterior", schema: z.boolean()},
    mutualSharedAccess: {path: "exterior", schema: z.boolean()},
    additionalSharedFeatureNotes: {path: "exterior", schema: z.string().min(1).max(300)},
    // PAGE SD-04 — a semi-specific yard distinction not present on Detached's
    // exterior/lot shell (buildExteriorLotFields), so it's added here directly
    // rather than folded into the shared component.
    privateRearYard: {path: "exterior", schema: z.boolean()},
    ...buildExteriorLotFields("exterior"),

    // PAGE SD-04 — Parking & Garage (+ mutual-driveway disclosure)
    ...buildParkingGarageFields("garage"),
    sharedWithAdjoiningProperty: {path: "garage", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    sellerComments: {path: "garage", schema: z.string().min(1).max(300)},

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
    approximateAcreage: {path: "ruralProperty", schema: z.number().positive().max(100000)},
    lotFrontage: {path: "ruralProperty", schema: z.number().positive().max(100000)},
    lotDepth: {path: "ruralProperty", schema: z.number().positive().max(100000)},
    lotShape: {path: "ruralProperty", schema: z.enum(LOT_SHAPE_OPTIONS)},
    surveyAvailable: {path: "ruralProperty", schema: z.boolean()},
    propertyBoundariesKnown: {path: "ruralProperty", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    yearBuilt: {path: "ruralProperty", schema: z.string().min(1).max(20)},
    approxHouseSquareFootage: {path: "ruralProperty", schema: z.string().min(1).max(30)},
    numberOfStoreys: {path: "ruralProperty", schema: z.string().min(1).max(20)},

    // PAGE RA-02 — Access & Road
    roadType: {path: "ruralAccess", schema: z.enum(ROAD_TYPE_OPTIONS)},
    roadSurface: {path: "ruralAccess", schema: z.enum(ROAD_SURFACE_OPTIONS)},
    yearRoundRoadAccess: {path: "ruralAccess", schema: z.boolean()},
    roadMaintainedBy: {path: "ruralAccess", schema: z.enum(ROAD_MAINTAINED_BY_OPTIONS)},
    privateRoadFees: {path: "ruralAccess", schema: z.number().min(0)},
    ruralDrivewayType: {path: "ruralAccess", schema: z.enum(RURAL_DRIVEWAY_TYPE_OPTIONS)},
    drivewayLengthNotes: {path: "ruralAccess", schema: z.string().min(1).max(200)},
    seasonalAccessIssue: {path: "ruralAccess", schema: z.boolean()},
    easementRightOfWayKnown: {path: "ruralAccess", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},

    // PAGE RA-03 — Water & Wastewater (seller-reported only, never a compliance claim)
    waterSource: {path: "ruralWater", schema: z.enum(WATER_SOURCE_OPTIONS)},
    wellLocationKnown: {path: "ruralWater", schema: z.boolean()},
    wellRecordAvailable: {path: "ruralWater", schema: z.boolean()},
    waterTreatmentEquipment: {
      path: "ruralWater",
      schema: z.array(z.enum(WATER_TREATMENT_OPTIONS)).min(1),
    },
    waterSoftener: {path: "ruralWater", schema: z.enum(WATER_SOFTENER_OPTIONS)},
    septicSystem: {path: "ruralWater", schema: z.boolean()},
    septicType: {path: "ruralWater", schema: z.enum(SEPTIC_TYPE_OPTIONS)},
    septicLocationKnown: {path: "ruralWater", schema: z.boolean()},
    septicRecordAvailable: {path: "ruralWater", schema: z.boolean()},
    approxSepticInstallationYear: {path: "ruralWater", schema: z.string().min(1).max(20)},
    municipalSewer: {path: "ruralWater", schema: z.boolean()},

    // PAGE RA-04 — Land & Site Features
    naturalFeatures: {path: "ruralLand", schema: z.array(z.enum(NATURAL_FEATURE_OPTIONS)).min(1)},
    conservationAreaInvolvementKnown: {path: "ruralLand", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    farmingCurrentlyOccurring: {path: "ruralLand", schema: z.boolean()},
    agriculturalUse: {path: "ruralLand", schema: z.string().min(1).max(200)},
    fencedAcreage: {path: "ruralLand", schema: z.enum(FENCED_YARD_OPTIONS)},
    views: {path: "ruralLand", schema: z.array(z.string().min(1).max(60)).max(10).min(1)},
    otherLandFeatures: {path: "ruralLand", schema: z.string().min(1).max(300)},

    // PAGE RA-05 — Outbuildings & Structures (repeatable, a property may have several)
    outbuildings: {
      path: "outbuildings",
      schema: z.array(z.object({
        structureType: z.enum(OUTBUILDING_TYPE_OPTIONS),
        approximateSize: z.string().min(1).max(50),
        electricity: z.boolean(),
        water: z.boolean(),
        heating: z.boolean(),
        insulated: z.enum(YES_NO_NOT_SURE_OPTIONS),
        currentUse: z.string().min(1).max(200),
        additionalDescription: z.string().min(1).max(300),
      }).strict()).max(15).min(1),
    },

    // PAGE RA-06/RA-07/RA-08 — House Exterior & Parking / Inside Your Home / Basement
    ...buildExteriorLotFields("exterior"),
    ...buildParkingGarageFields("garage"),
    ...buildResidentialInteriorFields("interior"),
    ...buildBasementFields("basement"),

    // PAGE RA-09 — Rural Utilities
    ruralElectricity: {path: "ruralUtilities", schema: z.string().min(1).max(30)},
    ruralHeatingType: {path: "ruralUtilities", schema: z.enum(HEATING_TYPE_OPTIONS)},
    ruralHeatingFuel: {path: "ruralUtilities", schema: z.enum(HEATING_FUEL_OPTIONS)},
    ruralCooling: {path: "ruralUtilities", schema: z.enum(COOLING_OPTIONS)},
    generator: {path: "ruralUtilities", schema: z.boolean()},
    generatorType: {path: "ruralUtilities", schema: z.enum(GENERATOR_TYPE_OPTIONS)},
    internetAvailable: {path: "ruralUtilities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    internetType: {path: "ruralUtilities", schema: z.enum(INTERNET_TYPE_OPTIONS)},
    propaneTank: {path: "ruralUtilities", schema: z.enum(TANK_OWNERSHIP_OPTIONS)},
    oilTank: {path: "ruralUtilities", schema: z.boolean()},
  },

  duplex: {
    // PAGE IP-01 — Income Property Configuration
    propertyConfiguration: {path: "incomeProperty", schema: z.enum(PROPERTY_CONFIGURATION_OPTIONS)},
    currentUse: {path: "incomeProperty", schema: z.enum(CURRENT_USE_OPTIONS)},
    numberOfResidentialUnits: {
      path: "incomeProperty",
      schema: z.union([z.literal(2), z.literal(3)]),
    },
    // Seller-provided information requiring brokerage review — never an assertion
    // by the platform that a unit is legally authorized.
    unitsRecognizedBySellerAs: {path: "incomeProperty", schema: z.enum(UNITS_RECOGNIZED_OPTIONS)},
    ownerOccupiesUnit: {path: "incomeProperty", schema: z.boolean()},
    approximateYearBuilt: {path: "incomeProperty", schema: z.string().min(1).max(20)},
    approxBuildingSquareFootage: {path: "incomeProperty", schema: z.string().min(1).max(30)},
    storeys: {path: "incomeProperty", schema: z.number().int().min(1).max(10)},
    separateEntrances: {path: "incomeProperty", schema: z.boolean()},
    commonEntrance: {path: "incomeProperty", schema: z.boolean()},

    // PAGE IP-02/IP-03/IP-04 — Unit 1/2/3: one repeatable Unit object, not three
    // separate field systems. UI shows up to 3 (Unit 3 only for a triplex); the
    // schema itself just caps the array length.
    units: {
      path: "units",
      schema: z.array(z.object({
        unitIdentifier: z.string().min(1).max(50),
        floorLocation: z.string().min(1).max(100),
        bedrooms: z.number().int().min(0).max(15),
        bathrooms: bathroomsSchema(),
        kitchen: z.boolean(),
        livingRoom: z.boolean(),
        diningArea: z.boolean(),
        laundry: z.enum(UNIT_LAUNDRY_OPTIONS),
        separateEntrance: z.boolean(),
        approxUnitSize: z.string().min(1).max(50),
        currentOccupancy: z.enum(UNIT_OCCUPANCY_OPTIONS),
        additionalUnitFeatures: z.string().min(1).max(300),
        // Rent is a material characteristic of an income property (unlike the
        // simplified tenancy question used for an ordinary detached seller),
        // so it lives on the unit itself.
        tenancy: z.object({
          tenancyType: z.enum(TENANCY_TYPE_OPTIONS),
          currentMonthlyRent: z.number().min(0).max(1_000_000),
          utilitiesIncluded: z.array(z.enum(UTILITY_OPTIONS)).min(1),
          tenantPaysUtilities: z.array(z.enum(UTILITY_OPTIONS)).min(1),
          vacantPossessionIntended: z.enum(YES_NO_UNKNOWN_OPTIONS),
        }).strict(),
      }).strict()).max(3).min(1),
    },

    // PAGE IP-05 — Building Systems & Utilities
    electricalService: {path: "buildingSystems", schema: z.string().min(1).max(50)},
    separateElectricalMeters: {path: "buildingSystems", schema: z.boolean()},
    separateGasMeters: {path: "buildingSystems", schema: z.boolean()},
    separateWaterMeters: {path: "buildingSystems", schema: z.boolean()},
    buildingHeatingSystem: {path: "buildingSystems", schema: z.enum(HEATING_TYPE_OPTIONS)},
    buildingHeatingFuel: {path: "buildingSystems", schema: z.enum(HEATING_FUEL_OPTIONS)},
    buildingCooling: {path: "buildingSystems", schema: z.enum(COOLING_OPTIONS)},
    buildingHotWaterSystem: {path: "buildingSystems", schema: z.enum(HOT_WATER_OPTIONS)},
    buildingWater: {path: "buildingSystems", schema: z.enum(WATER_SUPPLY_OPTIONS)},
    buildingSewer: {path: "buildingSystems", schema: z.enum(SEWER_OPTIONS)},
    whoPaysWater: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS)},
    whoPaysHeat: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS)},
    whoPaysHydro: {path: "buildingSystems", schema: z.enum(WHO_PAYS_OPTIONS)},

    // PAGE IP-06 — Common Areas & Laundry
    sharedLaundry: {path: "commonAreas", schema: z.boolean()},
    coinOperatedLaundry: {path: "commonAreas", schema: z.boolean()},
    commonHallways: {path: "commonAreas", schema: z.boolean()},
    sharedStorage: {path: "commonAreas", schema: z.boolean()},
    separateStorageByUnit: {path: "commonAreas", schema: z.boolean()},
    sharedOutdoorArea: {path: "commonAreas", schema: z.boolean()},
    otherCommonFacilities: {path: "commonAreas", schema: z.string().min(1).max(300)},

    // PAGE IP-07 — Parking
    incomePropertyGarage: {path: "incomePropertyParking", schema: z.boolean()},
    incomePropertyGarageSpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(10),
    },
    incomePropertyDrivewaySpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(20),
    },
    incomePropertyTotalSpaces: {
      path: "incomePropertyParking",
      schema: z.number().int().min(0).max(30),
    },
    parkingAssignedByUnit: {path: "incomePropertyParking", schema: z.boolean()},
    unit1Parking: {path: "incomePropertyParking", schema: z.string().min(1).max(50)},
    unit2Parking: {path: "incomePropertyParking", schema: z.string().min(1).max(50)},
    unit3Parking: {path: "incomePropertyParking", schema: z.string().min(1).max(50)},
    sharedParking: {path: "incomePropertyParking", schema: z.boolean()},

    // PAGE IP-08 — Exterior & Property Features (reuses the standard shell)
    ...buildExteriorLotFields("exterior"),
  },

  condoApartment: {
    // PAGE CA-01 — Your Condo
    unitNumber: {path: "condoUnit", schema: z.string().min(1).max(30)},
    buildingName: {path: "condoUnit", schema: z.string().min(1).max(150)},
    unitLevel: {path: "condoUnit", schema: z.string().min(1).max(20)},
    approximateUnitSize: {path: "condoUnit", schema: z.string().min(1).max(30)},
    sourceOfSquareFootage: {path: "condoUnit", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS)},
    unitExposure: {path: "condoUnit", schema: z.array(z.enum(UNIT_EXPOSURE_OPTIONS)).max(4).min(1)},
    unitStyle: {path: "condoUnit", schema: z.enum(UNIT_STYLE_OPTIONS)},
    numberOfLevelsWithinUnit: {path: "condoUnit", schema: z.string().min(1).max(10)},
    yearBuilt: {path: "condoUnit", schema: z.string().min(1).max(20)},

    // PAGE CA-02 — Inside Your Condo
    bedrooms: {path: "interior", schema: z.number().int().min(0).max(10)},
    bedroomDenConfiguration: {path: "interior", schema: z.enum(CONDO_BEDROOM_DEN_OPTIONS)},
    bathrooms: {path: "interior", schema: bathroomsSchema()},
    kitchenStyle: {path: "interior", schema: z.enum(KITCHEN_STYLE_OPTIONS)},
    livingRoom: {path: "interior", schema: z.boolean()},
    diningArea: {path: "interior", schema: z.boolean()},
    denOffice: {path: "interior", schema: z.boolean()},
    ensuiteLaundry: {path: "interior", schema: z.boolean()},
    laundryLocation: {path: "interior", schema: z.enum(LAUNDRY_LOCATION_OPTIONS)},
    fireplace: {path: "interior", schema: z.enum(FIREPLACE_OPTIONS)},
    flooring: {path: "interior", schema: z.array(z.enum(FLOORING_OPTIONS)).min(1)},
    interiorFeatures: {path: "interior", schema: z.array(z.string().min(1).max(60)).max(15).min(1)},
    renovationsUpgrades: {path: "interior", schema: z.string().min(1).max(500)},
    additionalRooms: {
      path: "interior",
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().min(1).max(200),
      }).strict()).max(10).min(1),
    },

    // PAGE CA-03 — Balcony & Private Outdoor Space
    balcony: {path: "outdoorSpace", schema: z.boolean()},
    balconyType: {path: "outdoorSpace", schema: z.enum(BALCONY_TYPE_OPTIONS)},
    balconyExposure: {path: "outdoorSpace", schema: z.enum(UNIT_EXPOSURE_OPTIONS)},
    terrace: {path: "outdoorSpace", schema: z.boolean()},
    privatePatio: {path: "outdoorSpace", schema: z.boolean()},
    approxOutdoorSize: {path: "outdoorSpace", schema: z.string().min(1).max(30)},
    outdoorFeatures: {path: "outdoorSpace", schema: z.string().min(1).max(300)},

    // PAGE CA-04 — Parking
    ...buildCondoParkingFields("condoParking"),

    // PAGE CA-05 — Locker / Storage
    lockerIncluded: {path: "condoLocker", schema: z.boolean()},
    numberOfLockers: {path: "condoLocker", schema: z.number().int().min(0).max(5)},
    lockerOwnership: {path: "condoLocker", schema: z.enum(OWNERSHIP_TYPE_OPTIONS)},
    lockerLevelLocation: {path: "condoLocker", schema: z.string().min(1).max(30)},
    lockerNumber: {path: "condoLocker", schema: z.string().min(1).max(30)},
    otherStorage: {path: "condoLocker", schema: z.string().min(1).max(200)},

    // PAGE CA-06 — Condo Fees & Inclusions
    monthlyCondoFee: {path: "condoFees", schema: z.number().min(0)},
    feeFrequency: {path: "condoFees", schema: z.enum(["monthly", "other"]).default("monthly")},
    heatIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    hydroIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    waterIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    centralAirIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    parkingIncludedInFee: {path: "condoFees", schema: z.boolean()},
    buildingInsuranceIncluded: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    commonElementsIncluded: {path: "condoFees", schema: z.boolean()},
    cableInternetIncluded: {path: "condoFees", schema: z.boolean()},
    otherFeeInclusions: {path: "condoFees", schema: z.string().min(1).max(300)},
    // Seller-reported flag only; the schema doesn't collect a legal special-
    // assessment disclosure, just enough to route the listing for review.
    specialAssessmentKnown: {path: "condoFees", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    specialAssessmentDetails: {path: "condoFees", schema: z.string().min(1).max(500)},

    // PAGE CA-07 — Building & Amenities
    buildingAmenities: {path: "amenities", schema: z.array(z.enum(CONDO_AMENITIES_OPTIONS)).min(1)},
    otherAmenities: {path: "amenities", schema: z.string().min(1).max(300)},
    bbqPermitted: {path: "amenities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    petRestrictionsKnown: {path: "amenities", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
  },

  condoTownhouse: {
    // PAGE CT-01 — Your Condo Townhouse
    townhouseConfiguration: {
      path: "townhouseConfig",
      schema: z.enum(TOWNHOUSE_CONFIGURATION_OPTIONS),
    },
    position: {path: "townhouseConfig", schema: z.enum(TOWNHOUSE_POSITION_OPTIONS)},
    numberOfStoreys: {path: "townhouseConfig", schema: z.string().min(1).max(10)},
    approxSquareFootage: {path: "townhouseConfig", schema: z.string().min(1).max(30)},
    sourceOfSquareFootage: {path: "townhouseConfig", schema: z.enum(SQUARE_FOOTAGE_SOURCE_OPTIONS)},
    yearBuilt: {path: "townhouseConfig", schema: z.string().min(1).max(20)},
    unitNumber: {path: "townhouseConfig", schema: z.string().min(1).max(30)},
    privateEntrance: {path: "townhouseConfig", schema: z.boolean()},
    // Only meaningful when townhouseConfiguration = "stacked"; harmless no-op
    // otherwise, matching how the rest of the registry handles conditional
    // fields (the FE decides what to show, the schema just validates what's sent).
    unitPosition: {path: "townhouseConfig", schema: z.enum(STACKED_UNIT_POSITION_OPTIONS)},
    interiorStairsToUnit: {path: "townhouseConfig", schema: z.boolean()},
    exteriorEntrance: {path: "townhouseConfig", schema: z.boolean()},

    // PAGE CT-02 — Exterior & Your Outdoor Space
    frontPorch: {path: "outdoorSpace", schema: z.boolean()},
    privateYard: {path: "outdoorSpace", schema: z.boolean()},
    yardFenced: {path: "outdoorSpace", schema: z.enum(FENCED_YARD_OPTIONS)},
    patio: {path: "outdoorSpace", schema: z.boolean()},
    deck: {path: "outdoorSpace", schema: z.boolean()},
    balcony: {path: "outdoorSpace", schema: z.boolean()},
    terrace: {path: "outdoorSpace", schema: z.boolean()},
    bbqPermitted: {path: "outdoorSpace", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    exteriorMaintenanceResponsibilityKnown: {
      path: "outdoorSpace",
      schema: z.enum(MAINTENANCE_RESPONSIBILITY_OPTIONS),
    },
    outdoorFeatures: {path: "outdoorSpace", schema: z.string().min(1).max(300)},

    // PAGE CT-03 — Parking & Garage
    hasGarage: {path: "parking", schema: z.boolean()},
    garageType: {path: "parking", schema: z.enum(GARAGE_TYPE_OPTIONS)},
    garageSpaces: {path: "parking", schema: z.number().int().min(0).max(5)},
    drivewayParkingSpaces: {path: "parking", schema: z.number().int().min(0).max(10)},
    condoParkingSpace: {path: "parking", schema: z.boolean()},
    parkingOwnership: {path: "parking", schema: z.enum(OWNERSHIP_TYPE_OPTIONS)},
    parkingSpaceNumber: {path: "parking", schema: z.string().min(1).max(30)},
    parkingLevel: {path: "parking", schema: z.string().min(1).max(30)},
    insideAccessFromGarage: {path: "parking", schema: z.boolean()},
    visitorParking: {path: "parking", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},
    evCharging: {path: "parking", schema: z.enum(YES_NO_NOT_SURE_OPTIONS)},

    // PAGE CT-04 — Inside Your Townhouse
    bedrooms: {path: "interior", schema: z.number().int().min(0).max(10)},
    bathrooms: {path: "interior", schema: bathroomsSchema()},
    kitchenStyle: {path: "interior", schema: z.enum(KITCHEN_STYLE_OPTIONS)},
    livingRoom: {path: "interior", schema: z.boolean()},
    diningRoom: {path: "interior", schema: z.boolean()},
    familyRoom: {path: "interior", schema: z.boolean()},
    denOffice: {path: "interior", schema: z.boolean()},
    laundryLocation: {path: "interior", schema: z.enum(LAUNDRY_LOCATION_OPTIONS)},
    fireplace: {path: "interior", schema: z.enum(FIREPLACE_OPTIONS)},
    flooring: {path: "interior", schema: z.array(z.enum(FLOORING_OPTIONS)).min(1)},
    interiorUpgrades: {path: "interior", schema: z.string().min(1).max(500)},
    additionalRooms: {
      path: "interior",
      schema: z.array(z.object({
        roomType: z.string().min(1).max(60),
        notes: z.string().min(1).max(200),
      }).strict()).max(10).min(1),
    },

    // PAGE CT-05 — Basement / Lower Level (not assumed to exist; FE may skip
    // this page entirely for stacked configurations)
    ...buildBasementFields("basement"),

    // PAGE CT-06 — Locker / Storage
    lockerStorageIncluded: {path: "lockerStorage", schema: z.boolean()},
    lockerOwnership: {path: "lockerStorage", schema: z.enum(OWNERSHIP_TYPE_OPTIONS)},
    lockerNumber: {path: "lockerStorage", schema: z.string().min(1).max(30)},
    lockerLocation: {path: "lockerStorage", schema: z.string().min(1).max(30)},
    additionalStorage: {path: "lockerStorage", schema: z.string().min(1).max(200)},

    // PAGE CT-07 — Condo Fees
    monthlyMaintenanceFee: {path: "condoFees", schema: z.number().min(0)},
    waterIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    heatIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    hydroIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    exteriorMaintenanceIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    landscapingIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    snowRemovalIncluded: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    feeParkingIncluded: {path: "condoFees", schema: z.boolean()},
    buildingCommonInsurance: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},
    otherFeeInclusions: {path: "condoFees", schema: z.string().min(1).max(300)},
    specialAssessmentKnown: {path: "condoFees", schema: z.enum(YES_NO_UNKNOWN_OPTIONS)},

    // PAGE CT-08 — Common Elements & Amenities
    buildingAmenities: {path: "amenities", schema: z.array(z.enum(CONDO_AMENITIES_OPTIONS)).min(1)},
    otherAmenities: {path: "amenities", schema: z.string().min(1).max(300)},
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
 * UI SECTION GROUPING
 *
 * Turns the "// PAGE D-02 — Exterior & Lot" style comments above into real
 * data: an ordered list of {id, title, paths} per property type, so the
 * frontend can render one page per section instead of hardcoding its own
 * grouping. `paths` references the same top-level Firestore keys used as
 * `path` above — a section pulls in every field whose `path` is listed here,
 * in field-declaration order.
 * ─────────────────────────────────────────────────────────────────────
 */
const propertyTypeSections = {
  detached: [
    {id: "exterior-lot", title: "Exterior & Lot", paths: ["exterior"]},
    {id: "parking-garage", title: "Parking & Garage", paths: ["garage"]},
    {id: "inside-systems", title: "Inside Your Home & Systems", paths: ["interior", "systems"]},
    {id: "basement", title: "Basement / Lower Level", paths: ["basement"]},
    {id: "additional-living", title: "Additional Living Spaces", paths: ["additionalLivingSpaces"]},
  ],
  semiDetached: [
    {id: "exterior-lot", title: "Lot & Exterior", paths: ["exterior"]},
    {id: "parking-garage", title: "Parking & Garage", paths: ["garage"]},
    {id: "inside-systems", title: "Inside Your Home & Systems", paths: ["interior", "systems"]},
    {id: "basement", title: "Basement", paths: ["basement"]},
    {id: "additional-living", title: "Additional Living Spaces", paths: ["additionalLivingSpaces"]},
  ],
  rural: [
    {id: "rural-property", title: "Your Rural Property", paths: ["ruralProperty"]},
    {id: "access-road", title: "Access & Road", paths: ["ruralAccess"]},
    {id: "water-wastewater", title: "Water & Wastewater", paths: ["ruralWater"]},
    {id: "land-site", title: "Land & Site Features", paths: ["ruralLand"]},
    {id: "outbuildings", title: "Outbuildings & Structures", paths: ["outbuildings"]},
    {id: "exterior-parking", title: "House Exterior & Parking", paths: ["exterior", "garage"]},
    {id: "inside-home", title: "Inside Your Home", paths: ["interior"]},
    {id: "basement", title: "Basement", paths: ["basement"]},
    {id: "rural-utilities", title: "Rural Utilities", paths: ["ruralUtilities"]},
  ],
  duplex: [
    {id: "configuration", title: "Income Property Configuration", paths: ["incomeProperty"]},
    {id: "units", title: "Units", paths: ["units"]},
    {id: "building-systems", title: "Building Systems & Utilities", paths: ["buildingSystems"]},
    {id: "common-areas", title: "Common Areas & Laundry", paths: ["commonAreas"]},
    {id: "parking", title: "Parking", paths: ["incomePropertyParking"]},
    {id: "exterior", title: "Exterior & Property Features", paths: ["exterior"]},
  ],
  condoApartment: [
    {id: "your-condo", title: "Your Condo", paths: ["condoUnit"]},
    {id: "inside-condo", title: "Inside Your Condo", paths: ["interior"]},
    {id: "balcony-outdoor", title: "Balcony & Private Outdoor Space", paths: ["outdoorSpace"]},
    {id: "parking", title: "Parking", paths: ["condoParking"]},
    {id: "locker-storage", title: "Locker / Storage", paths: ["condoLocker"]},
    {id: "condo-fees", title: "Condo Fees & Inclusions", paths: ["condoFees"]},
    {id: "building-amenities", title: "Building & Amenities", paths: ["amenities"]},
  ],
  condoTownhouse: [
    {id: "your-townhouse", title: "Your Condo Townhouse", paths: ["townhouseConfig"]},
    {id: "exterior-outdoor", title: "Exterior & Your Outdoor Space", paths: ["outdoorSpace"]},
    {id: "parking-garage", title: "Parking & Garage", paths: ["parking"]},
    {id: "inside-townhouse", title: "Inside Your Townhouse", paths: ["interior"]},
    {id: "basement", title: "Basement / Lower Level", paths: ["basement"]},
    {id: "locker-storage", title: "Locker / Storage", paths: ["lockerStorage"]},
    {id: "condo-fees", title: "Condo Fees", paths: ["condoFees"]},
    {id: "common-amenities", title: "Common Elements & Amenities", paths: ["amenities"]},
  ],
};
propertyTypeSections.stackedTownhouse = propertyTypeSections.condoTownhouse;
propertyTypeSections.coOperativeApartment = propertyTypeSections.condoApartment;

/**
 * ─────────────────────────────────────────────────────────────────────
 * EXPLICIT FIELD LABELS
 *
 * Optional per-(propertyType, fieldName) override of the humanized fallback
 * in `buildPropertySchemaResponse.js`. Add entries here as each section gets
 * pixel-matched against its mock — anything absent just falls back to a
 * humanized version of the field name, so this can be filled in
 * incrementally without blocking the rest of the registry.
 * ─────────────────────────────────────────────────────────────────────
 */
const fieldLabels = {
  detached: {
    houseStyle: "Home style", numberOfStoreys: "Number of storeys",
    approximateYearBuilt: "Approximate year built",
    approxAboveGradeSquareFootage: "Approximate above-grade square footage",
    squareFootageSource: "Source of square footage", lotFrontage: "Lot frontage",
    lotDepth: "Lot depth", irregularLot: "Irregular-shaped lot", cornerLot: "Corner lot",
    exteriorConstruction: "Exterior construction", roofType: "Roof type",
    roofApproximateAge: "Approximate roof age", frontPorch: "Front porch", deck: "Deck",
    patio: "Patio", fencedYard: "Fenced yard", landscapingFeatures: "Landscaping features",
    shed: "Shed", pool: "Pool", hotTub: "Hot tub",
    otherExteriorFeatures: "Other exterior features",

    hasGarage: "Does the property have a garage?", garageType: "Garage type",
    garageSpaces: "Garage spaces", insideEntryFromGarage: "Inside entry from garage",
    garageDoorOpener: "Garage door opener", hasDriveway: "Does the property have a driveway?",
    drivewayType: "Driveway type", drivewaySurface: "Driveway finish",
    drivewayParkingSpaces: "Outside parking spaces", totalParkingSpaces: "Total parking spaces",
    otherParkingInformation: "Other parking information",

    bedroomsAboveGrade: "Bedrooms above ground", bathrooms: "Bathrooms",
    primaryBedroom: "Primary bedroom", kitchenCount: "Number of kitchens",
    livingRoom: "Living room", diningRoom: "Dining room", familyRoom: "Family room",
    denOffice: "Den / office", breakfastArea: "Breakfast area",
    laundryLocation: "Laundry location", fireplace: "Fireplace", flooring: "Flooring",
    interiorUpgrades: "Interior upgrades", accessibilityFeatures: "Accessibility features",
    otherPrincipalRooms: "Other principal rooms",
    additionalInteriorFeatures: "Additional interior features",

    heatingType: "Main heating type", heatingFuel: "Heating fuel", cooling: "Cooling",
    waterSupply: "Water supply", sewer: "Sewer", electricalService: "Electrical service",
    hotWater: "Hot water", waterSoftener: "Water softener",
    otherMechanicalSystems: "Other mechanical systems",

    hasBasement: "Does the property have a basement?", basementExtent: "Basement extent",
    basementFinish: "How is the basement finished?", walkOut: "Walk-out",
    walkUp: "Walk-up", basementSeparateEntrance: "Separate entrance",
    basementBedrooms: "Bedrooms in the basement", basementBathroom: "Basement bathroom",
    recreationRoom: "Recreation room", basementKitchen: "Basement kitchen",
    basementLaundry: "Basement laundry", additionalBasementRooms: "Additional basement rooms",
    basementApartment: "Basement apartment with a separate entrance",
    basementApartmentStatus: "Seller's understanding of unit status",
    basementApartmentOccupied: "Is the basement apartment occupied?",
    basementApartmentOccupancyRelationship: "Occupant relationship to seller",
    basementApartmentVacantPossessionIntended: "Vacant possession intended on closing",

    additionalLivingSpaces: "Additional building or living space",
  },
};

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
  // plain-string field (no enum/regex to reject "" on its own) gets an
  // explicit .min(1) to match. Every field in this registry is required.
  streetNumber: {path: "location", schema: z.string().min(1).max(20)},
  streetName: {path: "location", schema: z.string().min(1).max(100)},
  abbreviation: {path: "location", schema: z.string().min(1).max(20)},
  streetDirection: {path: "location", schema: z.string().min(1).max(10)},
  apartmentUnitNumber: {path: "location", schema: z.string().min(1).max(20)},
  municipality: {path: "location", schema: z.string().min(1).max(100)},

  buyersWillLove: {path: "buyerInfo", schema: z.string().min(1).max(2000)},
  includedItems: {path: "buyerInfo", schema: z.string().min(1).max(1000)},
  excludedItems: {path: "buyerInfo", schema: z.string().min(1).max(300)},
  rentalItemsEquipment: {path: "buyerInfo", schema: z.string().min(1).max(250)},

  recentImprovements: {path: "improvements", schema: z.string().min(1).max(1000)},

  // Occupancy / Tenancy — the "decision page" reused across property types.
  // Once captured, this shouldn't be asked again for the same listing.
  occupancyStatus: {path: "occupancy", schema: z.enum(OCCUPANCY_OPTIONS)},
  occupancyPathway: {path: "occupancy", schema: z.enum(OCCUPANCY_PATHWAY_OPTIONS)},
  tenancyPossession: {
    path: "occupancy",
    schema: z.enum(["fixed_term", "month_to_month", "vacant_possession_on_closing"]),
  },
  areasOccupiedByTenant: {path: "occupancy", schema: z.enum(AREAS_OCCUPIED_OPTIONS)},
  additionalTenancyInformation: {path: "occupancy", schema: z.string().min(1).max(500)},
  fixedTermUntil: {
    path: "occupancy",
    schema: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  },
  leaseAgreementAvailable: {path: "occupancy", schema: z.boolean()},

  sellerFullName: {path: "contact", schema: z.string().min(1).max(150)},
  sellerEmail: {path: "contact", schema: emailSchema()},
  sellerPhone: {path: "contact", schema: z.string().min(1).max(20)},
  preferredContactMethod: {path: "contact", schema: z.enum(CONTACT_METHOD_OPTIONS)},
  bestTimesToReach: {path: "contact", schema: z.array(z.enum(BEST_TIMES_OPTIONS)).min(1)},

  isRegisteredOwner: {path: "ownership", schema: z.boolean()},
  hasAdditionalOwners: {path: "ownership", schema: z.boolean()},
  // Item strings here have no explicit "" allowance in the original
  // (Joi.string().max(150) with no .allow("", null)), so, like roomType/item
  // elsewhere, they need .min(1) to keep rejecting empty-string entries.
  additionalOwnerNames: {path: "ownership", schema: z.array(z.string().min(1).max(150)).max(10).min(1)},
  additionalOwners: {
    path: "ownership",
    schema: z.array(z.object({
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(150),
    }).strict()).max(10).min(1),
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
    ]),
  },
  lawyerAssisting: {
    path: "ownership",
    schema: z.enum(["yes", "no", "not-yet"]),
  },
  lawyer: {
    path: "ownership",
    schema: z.object({
      fullName: z.string().min(1).max(150),
      firm: z.string().min(1).max(150),
      email: emailSchema(),
      phone: z.string().min(1).max(30),
      lawSocietyNumber: z.string().min(1).max(40),
      represents: z.enum(["registered-owner", "legal-authority", "both"]),
      contactAuthorized: z.boolean(),
    }).passthrough(),
  },

  mailingAddressDifferent: {path: "mailingAddress", schema: z.boolean()},
  mailingAddressDetails: {path: "mailingAddress", schema: z.string().min(1).max(300)},

  // COMMON PAGE — Location & Nearby Features (every branch merges back here)
  nearbyFeatures: {path: "locationFeatures", schema: z.array(z.enum(NEARBY_FEATURE_OPTIONS)).min(1)},
  otherLocationAdvantages: {path: "locationFeatures", schema: z.string().min(1).max(300)},
  whatDoYouLikeAboutLocation: {path: "locationFeatures", schema: z.string().min(1).max(500)},

  // COMMON PAGE — Listing Description (AI may help write it, but must not
  // invent property facts — enforced by the writing flow, not this schema)
  sellerPropertyHighlights: {path: "listingDescription", schema: z.string().min(1).max(1000)},
  clientPublicRemarks: {path: "listingDescription", schema: z.string().min(1).max(1500)},
  aiAssistanceRequested: {path: "listingDescription", schema: z.boolean()},
  specialSellingFeatures: {path: "listingDescription", schema: z.string().min(1).max(500)},

  // COMMON PAGE — Chattels
  chattelsIncluded: {path: "chattels", schema: z.array(z.enum(CHATTEL_OPTIONS)).min(1)},
  otherChattels: {path: "chattels", schema: z.string().min(1).max(300)},

  // COMMON PAGE — Fixtures excluded from the sale
  excludedFixtures: {path: "fixtures", schema: z.string().min(1).max(500)},

  // COMMON PAGE — Rented / Leased Items: one repeatable object, not twenty
  // separate fields (hot-water heaters, HVAC, water softeners, propane tanks...).
  rentedLeasedItems: {
    path: "rentedItems",
    schema: z.array(z.object({
      item: z.string().min(1).max(100),
      provider: z.string().min(1).max(150),
      approxPayment: z.number().min(0),
      buyoutKnown: z.enum(["yes", "no", "not_sure"]),
    }).strict()).max(15).min(1),
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
  propertyTypeSections,
  fieldLabels,
  ENUM_VALUE_LABELS,
};
