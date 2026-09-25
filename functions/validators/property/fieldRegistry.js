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

  feet: "Feet", meters: "Meters", ravine_lot: "Ravine lot",
  backs_onto_park_green_space: "Backs onto a park or green space",
  backs_onto_water: "Backs onto water", backs_onto_golf_course: "Backs onto a golf course",
  no_rear_neighbours: "No rear neighbours", located_on_cul_de_sac: "Located on a cul-de-sac",
  none_not_sure: "None of these / Not sure",
  garden_suite_or_backyard_home: "Garden suite or backyard home",
  laneway_or_coach_house: "Laneway or coach house",
  living_space_above_or_connected_to_garage: "Living space above or connected to a garage",
  detached_workshop_or_studio: "Detached workshop or studio",
  detached_storage_building: "Detached storage building",
  something_else_not_sure: "Something else / Not sure",

  kitchen_island: "Kitchen island",
  walk_in_closet: "Walk-in closet", main_floor_office: "Main-floor office",
  accessibility_features: "Accessibility features", updated_kitchen: "Updated kitchen",
  ensuite_bathroom: "Ensuite bathroom", hardwood_flooring: "Hardwood flooring",
  main_floor_laundry: "Main-floor laundry", something_else: "Something else",

  porch_or_veranda: "Porch or veranda", gazebo_or_pergola: "Gazebo or pergola",
  storage_shed: "Storage shed", ev_charger: "EV charger",
  sprinkler_system: "Sprinkler system", exterior_security_system: "Exterior security system",

  "4_plus": "4+", "3_plus": "3+", full_kitchen: "Full kitchen", kitchenette: "Kitchenette",
  in_suite: "In-suite",

  right_of_way: "Right-of-way", tank: "Tank", tankless: "Tankless",
  some_shared: "Some areas or features are shared",
  breakfast_area: "Breakfast area", home_office: "Home office", laundry_room: "Laundry room",
  mudroom: "Mudroom", sunroom: "Sunroom", exercise_room: "Exercise room",
  other_finished_room: "Other finished room", central_vacuum: "Central vacuum",
  tile_flooring: "Tile flooring", skylight: "Skylight",
  interior_stairs: "Interior stairs", separate_entrance: "Separate entrance",
  bedroom: "Bedroom", bathroom: "Bathroom", kitchen_or_kitchenette: "Kitchen or kitchenette",
  laundry_area: "Laundry area", storage: "Storage",
  utility_mechanical_room: "Utility or mechanical room",
  laneway_suite: "Laneway suite", other_separate_space: "Other separate space",

  north: "North", south: "South", east: "East", west: "West", multiple: "Multiple exposures",
  patio: "Patio", surface_outdoor: "Surface / outdoor", covered_structure: "Covered structure",
  rented_leased: "Rented / leased", inside_unit: "Inside unit", unit_floor: "Unit floor",
  locker_floor: "Locker floor", common_elements: "Common elements",
  building_insurance: "Building insurance", cable_tv: "Cable TV", internet: "Internet",
  one_time: "One-time", quarterly: "Quarterly", annually: "Annually", ordered: "Ordered",
  kitchen: "Kitchen", living_room: "Living room", dining_room: "Dining room",
  combined_living_dining: "Combined living/dining", family_room: "Family room",
  den_office: "Den/office", foyer: "Foyer", breakfast_bar: "Breakfast bar",
  built_in_storage: "Built-in storage", floor_to_ceiling_windows: "Floor-to-ceiling windows",
  shared_building: "Shared building laundry",
  twenty_four_hour_concierge: "24-hour concierge", security_guard: "Security guard",
  security_system: "Security system", controlled_entry: "Controlled entry",
  parcel_lockers: "Parcel lockers", on_site_management: "On-site management",
  fitness_centre: "Fitness centre", steam_room: "Steam room", squash_court: "Squash court",
  tennis_court: "Tennis court", meeting_room: "Meeting room",
  shared_patio_terrace: "Shared patio/terrace", barbecue_area: "Barbecue area",
  community_garden: "Community garden", bicycle_storage: "Bicycle storage",
  car_wash: "Car wash", ev_charging_stations: "EV charging stations", pet_wash: "Pet wash",
  elevator: "Elevator", service_elevator: "Service elevator",
  accessible_entrance: "Accessible entrance", restricted: "Restricted",
  not_applicable: "Not applicable", prohibited_throughout: "Prohibited throughout property",
  prohibited_common_areas: "Prohibited in common areas",
  no_additional_restriction: "No additional restriction", permitted: "Permitted",
  not_permitted: "Not permitted", condominium_rules_bylaws: "Condominium rules / by-laws",
  status_certificate: "Status certificate", property_management: "Property management",
  other_document: "Other document", dogs: "Dogs", cats: "Cats",
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * RESIDENTIAL INCOME (final client mockups, 2026-09)
 *
 * Field model shared by every property type:
 *   - `schema` checks only a value's shape, so drafts can be half-filled.
 *     Presence is checked at checkout (utils/listingCompleteness.js): a field
 *     is required unless its schema is `.optional()`.
 *   - `requiredWhen` makes a field apply only while a condition holds; values
 *     left behind are pruned on submission. Conditions reference fields
 *     declared earlier: {field, in | notIn | includes | ne}, {itemIndex: {gte}},
 *     {itemKey: {in}}, {anyOf}, {allOf}.
 *   - `optionValues` / `optionLabels` fix option order and wording;
 *     `exclusiveOptions` are "None"-style options.
 *   - `itemFields` describes a repeatable list's entries.
 *   - `ui` is on-screen furniture only; its keys are documented on the FE's
 *     `FieldUi` type (Mere-Postings-FE src/services/property.ts).
 * ─────────────────────────────────────────────────────────────────────
 */

// Takes {value: label} or, when values look like integers, [[value, label], ...]
// — JS objects (and z.enum) sort integer-like keys first, so `values` is what
// preserves the on-screen order; the schema response lists options in it.
function defineOptions(labels) {
  const entries = Array.isArray(labels) ? labels : Object.entries(labels);
  return {values: entries.map(([value]) => value), labels: Object.fromEntries(entries)};
}

// `control` tells the FE which input the mockup uses: "radio" | "select" |
// "cards" for single choices, "checkboxes" | "cards" for multi-selects.
function singleSelect(options, control = "radio") {
  return {
    schema: z.enum(options.values),
    optionValues: options.values,
    optionLabels: options.labels,
    ui: {control},
  };
}

function multiSelect(options, {exclusive, control = "checkboxes"} = {}) {
  let schema = z.array(z.enum(options.values))
      .refine((ids) => new Set(ids).size === ids.length, {message: "Options must not repeat"});
  if (exclusive) {
    schema = schema.refine(
        (ids) => !ids.includes(exclusive) || ids.length === 1,
        {message: `"${options.labels[exclusive]}" can't be combined with other options`},
    );
  }
  return {
    schema,
    optionValues: options.values,
    optionLabels: options.labels,
    ui: {control},
    ...(exclusive && {exclusiveOptions: [exclusive]}),
  };
}

// A repeatable list whose entries are partially fillable while drafting;
// per-entry required-ness is checked from `itemFields` at submission.
function listField(path, itemFields, {max, ui, requiredWhen}) {
  const itemShape = {};
  for (const [key, def] of Object.entries(itemFields)) {
    itemShape[key] = def.schema.optional();
  }
  return {
    path,
    schema: z.array(z.object(itemShape).strict()).max(max),
    itemFields,
    maxItems: max,
    ui,
    ...(requiredWhen && {requiredWhen}),
  };
}

// One entry of `itemFields` per option ticked in the multi-select `forField`
// (its exclusive "None"-style option excluded), stored as {optionValue: entry}.
function keyedDetailsField(path, forField, options, itemFields, {ui} = {}) {
  const itemShape = {};
  for (const [key, def] of Object.entries(itemFields)) {
    itemShape[key] = def.schema.optional();
  }
  return {
    path,
    schema: z.partialRecord(z.enum(options.values), z.object(itemShape).strict()),
    itemFields,
    entriesFor: forField,
    ui: {...ui, entriesFor: forField},
  };
}

function yesNo(control = "radio", ui = {}) {
  return {schema: z.boolean(), ui: {control, ...ui}};
}

// A document uploaded through POST /:listingId/media/attachments; the field
// stores what that endpoint returns for the file.
function fileField(uploadCategory) {
  return {
    schema: z.object({url: z.string().url(), fileName: z.string().min(1)}).strict(),
    ui: {control: "file", accept: ".pdf,.jpg,.jpeg,.png", maxBytes: 10 * 1024 * 1024, uploadCategory},
  };
}

const draftText = (max) => z.string().trim().max(max);

const yearBuiltSchema = z.number().int().min(1800, {message: "Enter a year from 1800 onward."})
    .refine((year) => year <= new Date().getFullYear(), {message: "Year built can't be in the future"});

// -- Income Property Configuration ----------------------------------------
const RI_UNIT_COUNT = defineOptions({
  duplex: "2 units (Duplex)",
  triplex: "3 units (Triplex)",
  fourplex: "4 units (Fourplex)",
  multi_unit: "5 or more units (Multi-Unit Residential)",
});
// How many unit entries each unitCount answer requires at submission.
const RI_UNITS_REQUIRED = {duplex: {min: 2, max: 2}, triplex: {min: 3, max: 3}, fourplex: {min: 4, max: 4}, multi_unit: {min: 5}};
const RI_MAX_UNITS = 50;
const RI_UNIT_ARRANGEMENT = defineOptions({
  stacked: "Stacked — main and upper floors",
  side_by_side: "Side-by-side",
  front_and_rear: "Front and rear",
  apartment_style: "Apartment-style / common hallway",
});
const RI_SQFT_SOURCE = defineOptions({
  floor_plan_measured: "Floor plan / measured",
  mpac: "MPAC",
  builder_plans: "Builder plans",
  appraisal: "Appraisal",
  owner_estimate: "Owner estimate",
});

// -- Unit Basics ----------------------------------------------------------
// Units added via "Add another unit" (3rd onward) answer this instead of
// picking Main / Upper / Lower Level in their position list.
const RI_ADDED_UNIT_LOCATION = defineOptions({
  lower_level: "Lower Level / Basement",
  above_ground: "Another Above-Ground Unit",
});
const RI_UNIT_POSITION = defineOptions({
  main_floor: "Main Floor",
  upper_floor: "Upper Floor",
  lower_level: "Lower Level / Basement",
  front: "Front",
  rear: "Rear",
  apartment_unit_number: "Apartment / Unit Number",
});
const RI_ADDED_UNIT_POSITIONS = ["front", "rear", "apartment_unit_number"];
const RI_BEDROOMS = defineOptions([
  ["0", "0 (Studio)"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6_plus", "6+"],
]);
const RI_BATHROOMS = defineOptions([
  ["1", "1"], ["1.5", "1.5"], ["2", "2"], ["2.5", "2.5"], ["3", "3"], ["4_plus", "4+"],
]);

// -- Exterior & Outdoor Features ------------------------------------------
const RI_EXTERIOR_CONSTRUCTION = defineOptions({
  brick: "Brick", stone: "Stone", stucco: "Stucco", vinyl_siding: "Vinyl Siding",
  aluminum_siding: "Aluminum Siding", wood_siding: "Wood Siding", concrete: "Concrete",
});
const RI_DRIVEWAY_TYPE = defineOptions({
  none: "None", single: "Single driveway", double: "Double driveway",
  circular: "Circular driveway", laneway: "Laneway",
});
const RI_PARKING_ARRANGEMENT = defineOptions({
  shared: "Shared", assigned_by_unit: "Assigned by unit", no_parking: "No Parking",
});
const RI_GARAGE_TYPE = defineOptions({
  none: "None", attached: "Attached", detached: "Detached", built_in_underneath: "Built-in (underneath)",
});
const RI_GARAGE_SPACES = defineOptions([["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const RI_YARD_SPACE = defineOptions({
  front_yard: "Front yard", back_yard: "Back yard", side_yard: "Side yard", none: "None",
});
const RI_OUTDOOR_SPACE_ARRANGEMENT = defineOptions({
  shared: "Shared", private: "Private to one or more units", combination: "Combination", none: "None",
});
const RI_DECK_PATIO_BALCONY = defineOptions({
  deck: "Deck", patio: "Patio", balcony_upper_level: "Balcony (upper level)",
  balcony_ground_level: "Balcony (ground level)", none: "None",
});
const RI_FENCING = defineOptions({
  fully_fenced: "Fully fenced", partially_fenced: "Partially fenced", none: "None",
});
const RI_OTHER_EXTERIOR_FEATURES = defineOptions({
  shed: "Shed", gazebo: "Gazebo", pool: "Pool", garden: "Garden",
  exterior_lighting: "Exterior lighting", interlock_paved_area: "Interlock / Paved area",
  green_space: "Green space", none: "None",
});

// -- Utilities & Building Systems -----------------------------------------
const RI_HEATING_SYSTEM = defineOptions({
  shared: "One shared system (entire building)", separate_by_unit: "Separate systems by unit",
});
const RI_COOLING_SYSTEM = defineOptions({
  shared: "One shared system (entire building)", separate_by_unit: "Separate systems by unit",
  no_central_cooling: "No central cooling",
});
const RI_HYDRO_METERING = defineOptions({
  shared_meter: "One shared meter (entire building)", separate_meters: "Separate meters by unit",
  not_sure: "Not sure",
});
const RI_GAS_METERING = defineOptions({
  shared_meter: "One shared meter (entire building)", separate_meters: "Separate meters by unit",
  not_applicable: "Not applicable (no natural gas)", not_sure: "Not sure",
});
const RI_WATER_METERING = RI_HYDRO_METERING;
const RI_HOT_WATER = defineOptions({
  shared: "One shared system (entire building)", separate_by_unit: "Separate systems by unit",
  tankless: "Tankless (on-demand)", not_sure: "Not sure",
});

// -- Location & Nearby Features -------------------------------------------
const RI_NEARBY_AMENITIES = defineOptions({
  grocery_store: "Grocery store", shopping_centre_mall: "Shopping centre / mall",
  restaurants_cafes: "Restaurants / cafes", pharmacy: "Pharmacy",
  hospital_medical_centre: "Hospital / medical centre", library: "Library",
  community_centre: "Community centre", place_of_worship: "Place of worship",
  banks_financial_services: "Banks / financial services", other_key_amenities: "Other key amenities",
});
const RI_TRANSIT_ACCESS = defineOptions({
  subway_station: "Subway station", go_station: "GO station", bus_stop: "Bus stop",
  streetcar_lrt: "Streetcar / LRT", major_highway_access: "Major highway access",
  bicycle_lanes_trails: "Bicycle lanes / trails", easy_commuting_access: "Easy commuting access",
  other_transit_option: "Other transit option",
});
const RI_SCHOOLS = defineOptions({
  elementary_school: "Elementary school", secondary_school: "Secondary school",
  french_immersion: "French immersion", private_school: "Private school",
  college: "College", university: "University",
});
const RI_PARKS_RECREATION = defineOptions({
  park: "Park", walking_hiking_trails: "Walking / hiking trails", recreation_centre: "Recreation centre",
  sports_facilities: "Sports facilities", conservation_area: "Conservation area",
  waterfront_beach: "Waterfront / beach",
});
const RI_LIFESTYLE = defineOptions({
  nearby_entertainment: "Nearby entertainment", fitness_centre_gym: "Fitness centre / gym",
  daycare: "Daycare", nearby_employment_areas: "Nearby employment areas", quiet_street: "Quiet street",
  family_friendly_neighbourhood: "Family friendly neighbourhood", vibrant_trendy_area: "Vibrant / trendy area",
  other_notable_feature: "Other notable feature",
});

// -- Tenancy Information --------------------------------------------------
const RI_UNIT_OCCUPANCY = defineOptions({
  vacant: "Vacant", owner_occupied: "Owner occupied", tenant_occupied: "Tenant occupied",
});
const RI_TENANCY_TYPE = defineOptions({
  fixed_term: "Fixed-term (lease agreement)", month_to_month: "Month-to-month",
});
const RI_TENANT_PAID_UTILITIES = defineOptions({
  heat: "Heat", hydro_electricity: "Hydro / Electricity", water: "Water", natural_gas: "Natural Gas",
  internet_cable: "Internet / Cable", none: "None (Utilities included in rent)",
});

const IS_LOWER_LEVEL_UNIT = {
  anyOf: [
    {field: "position", includes: "lower_level"},
    {field: "location", in: ["lower_level"]},
  ],
};
const IS_TENANT_OCCUPIED = {field: "occupancy", in: ["tenant_occupied"]};

const residentialIncomeFields = {
  // PAGE RI-01 — Income Property Configuration
  unitCount: {
    path: "incomeConfiguration",
    ...singleSelect(RI_UNIT_COUNT),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 2,
      optionIcons: {duplex: "house", triplex: "hotel", fourplex: "building", multi_unit: "building-2"},
    },
  },
  unitArrangement: {
    path: "incomeConfiguration",
    ...multiSelect(RI_UNIT_ARRANGEMENT, {control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 2,
      optionIcons: {stacked: "layers", side_by_side: "columns-2", front_and_rear: "rows-2", apartment_style: "building"},
    },
  },
  approxBuildingSqFt: {
    path: "incomeConfiguration",
    schema: z.number().positive().max(1_000_000),
    ui: {placeholder: "e.g. 2,400", suffix: "sq ft"},
  },
  sqFtSource: {
    path: "incomeConfiguration",
    ...singleSelect(RI_SQFT_SOURCE, "select"),
    ui: {control: "select", placeholder: "Select source"},
  },
  approxYearBuilt: {path: "incomeConfiguration", schema: yearBuiltSchema, ui: {placeholder: "e.g. 1990"}},

  // PAGE RI-02 — Unit Basics. Tenancy for the same units lives in
  // `unitTenancies` below, matched by position (units[i] <-> unitTenancies[i]).
  units: listField("unitBasics", {
    location: {
      label: "Where is this additional unit?",
      ...singleSelect(RI_ADDED_UNIT_LOCATION),
      requiredWhen: {itemIndex: {gte: 2}},
      ui: {control: "cards", optionStyle: "row", optionColumns: 2, wide: true},
    },
    position: {
      label: "Unit Position",
      hint: "Select all that apply.",
      ...multiSelect(RI_UNIT_POSITION),
      ui: {
        control: "checkboxes",
        optionStyle: "row",
        optionColumns: 3,
        wide: true,
        addedItemOptions: {fromIndex: 2, values: RI_ADDED_UNIT_POSITIONS},
      },
    },
    bedrooms: {label: "Bedrooms", ...singleSelect(RI_BEDROOMS), ui: {control: "select", placeholder: "Select"}},
    bathrooms: {label: "Bathrooms", ...singleSelect(RI_BATHROOMS), ui: {control: "select", placeholder: "Select"}},
    approxSqFt: {
      label: "Approximate Unit Square Footage",
      schema: z.number().positive().max(100_000),
      ui: {placeholder: "e.g. 800", suffix: "sq ft"},
    },
    separateEntrance: {
      label: "Does this unit have a separate entrance?",
      schema: z.boolean(),
      requiredWhen: IS_LOWER_LEVEL_UNIT,
      ui: {groupTitle: "Lower-Level / Basement Access"},
    },
    walkOut: {label: "Is the entrance a walk-out?", schema: z.boolean(), requiredWhen: IS_LOWER_LEVEL_UNIT},
  }, {
    max: RI_MAX_UNITS,
    ui: {
      numberedItems: true,
      itemTitle: "Unit {n}",
      initialItems: 2,
      itemLayout: "grid",
      itemColumns: 3,
      addLabel: "Add another unit",
      addHint: "Use this if the property has more than 2 self-contained units.",
    },
  }),

  // PAGE RI-03 — Exterior & Outdoor Features (whole property)
  exteriorConstruction: {
    path: "exteriorOutdoor",
    ...multiSelect(RI_EXTERIOR_CONSTRUCTION),
    ui: {control: "checkboxes", optionStyle: "row", optionColumns: 3},
  },
  drivewayType: {path: "exteriorOutdoor", ...singleSelect(RI_DRIVEWAY_TYPE), ui: {control: "select", placeholder: "Select"}},
  totalParkingSpaces: {
    path: "exteriorOutdoor",
    schema: z.number().int().min(0).max(100),
    ui: {placeholder: "e.g. 4"},
  },
  parkingArrangement: {path: "exteriorOutdoor", ...singleSelect(RI_PARKING_ARRANGEMENT)},
  garageType: {path: "exteriorOutdoor", ...singleSelect(RI_GARAGE_TYPE)},
  garageSpaces: {
    path: "exteriorOutdoor",
    ...singleSelect(RI_GARAGE_SPACES),
    requiredWhen: {field: "garageType", notIn: ["none"]},
    ui: {control: "select", placeholder: "Select"},
  },
  // Single-select exactly as drawn (radio buttons) in the mockup.
  yardSpace: {path: "exteriorOutdoor", ...singleSelect(RI_YARD_SPACE)},
  outdoorSpaceArrangement: {path: "exteriorOutdoor", ...singleSelect(RI_OUTDOOR_SPACE_ARRANGEMENT)},
  deckPatioBalcony: {
    path: "exteriorOutdoor",
    ...multiSelect(RI_DECK_PATIO_BALCONY, {exclusive: "none"}),
    ui: {control: "checkboxes", optionColumns: 1},
  },
  fencing: {path: "exteriorOutdoor", ...singleSelect(RI_FENCING)},
  otherExteriorFeatures: {path: "exteriorOutdoor", ...multiSelect(RI_OTHER_EXTERIOR_FEATURES, {exclusive: "none"})},

  // PAGE RI-04 — Utilities & Building Systems
  heatingSystem: {path: "buildingSystems", ...singleSelect(RI_HEATING_SYSTEM)},
  coolingSystem: {path: "buildingSystems", ...singleSelect(RI_COOLING_SYSTEM)},
  hydroMetering: {path: "buildingSystems", ...singleSelect(RI_HYDRO_METERING)},
  gasMetering: {path: "buildingSystems", ...singleSelect(RI_GAS_METERING)},
  waterMetering: {path: "buildingSystems", ...singleSelect(RI_WATER_METERING)},
  hotWater: {path: "buildingSystems", ...singleSelect(RI_HOT_WATER)},

  // PAGE RI-05 — Location & Nearby Features
  nearbyAmenities: {path: "locationFeatures", ...multiSelect(RI_NEARBY_AMENITIES)},
  transitAccess: {path: "locationFeatures", ...multiSelect(RI_TRANSIT_ACCESS)},
  schools: {path: "locationFeatures", ...multiSelect(RI_SCHOOLS)},
  parksRecreation: {path: "locationFeatures", ...multiSelect(RI_PARKS_RECREATION)},
  lifestyle: {path: "locationFeatures", ...multiSelect(RI_LIFESTYLE)},

  // PAGE RI-06 — Tenancy Information, one entry per unit (same order as `units`).
  // Replaces the shared occupancy/tenancy page for this property type.
  unitTenancies: listField("unitTenancy", {
    occupancy: {label: "Current Occupancy", ...singleSelect(RI_UNIT_OCCUPANCY), ui: {control: "radio", inline: true, wide: true}},
    monthlyRent: {
      label: "Current Monthly Rent",
      schema: z.number().positive().max(1_000_000),
      requiredWhen: IS_TENANT_OCCUPIED,
      ui: {prefix: "$", groupTitle: "Tenant Details"},
    },
    tenancyType: {label: "Tenancy Type", ...singleSelect(RI_TENANCY_TYPE), requiredWhen: IS_TENANT_OCCUPIED},
    leaseEndDate: {
      label: "Lease End Date",
      hint: "Select the lease end date.",
      schema: z.iso.date(),
      requiredWhen: {field: "tenancyType", in: ["fixed_term"]},
    },
    tenantPaidUtilities: {
      label: "Utility Payment Arrangement",
      hint: "Which utilities are paid by the tenant? (Select all that apply)",
      ...multiSelect(RI_TENANT_PAID_UTILITIES, {exclusive: "none"}),
      requiredWhen: IS_TENANT_OCCUPIED,
      ui: {control: "checkboxes", wide: true},
    },
  }, {
    max: RI_MAX_UNITS,
    ui: {
      numberedItems: true,
      itemTitle: "Unit {n} – Tenancy Information",
      itemLayout: "grid",
      itemColumns: 3,
      itemSubtitle: "Select the current occupancy for this unit.",
      addLabel: "Add Another Unit",
      addHint: "Use this if the property has more than 3 self-contained units.",
      mirrorsListOf: "units",
      notes: [{
        when: {field: "occupancy", in: ["vacant"]},
        text: "No additional information is required for this unit since it is vacant. " +
          "You can return and update this information at any time.",
      }],
    },
  }),

  // PAGE RI-07 — Tell Buyers About Your Property
  propertyHighlights: {
    path: "buyerHighlights",
    schema: draftText(1000),
    ui: {
      multiline: true,
      placeholder: "For example: unique features, recent upgrades, investment potential, income opportunity, " +
        "potential uses, or anything else you would like buyers to know.",
    },
  },
  uniqueFeatures: {
    path: "buyerHighlights",
    schema: draftText(1000),
    ui: {
      multiline: true,
      placeholder: "For example: special zoning, development potential, future plans in the area, " +
        "multi-generational use, strong rental demand, or other important information.",
    },
  },
  idealBuyer: {
    path: "buyerHighlights",
    schema: draftText(500).optional(),
    ui: {multiline: true, placeholder: "For example: investors, first-time buyers, families, developers, business owners, etc."},
  },
  additionalComments: {
    path: "buyerHighlights",
    schema: draftText(500).optional(),
    ui: {multiline: true, placeholder: "Add any other information that may help us market your property effectively."},
  },
};

// Checks that span more than one field, run at submission after every
// field has passed its own required/format checks. Each receives the
// field values keyed by fieldName and returns a list of problems.
const residentialIncomeSubmissionRules = [
  ({unitCount, units}) => {
    const expected = RI_UNITS_REQUIRED[unitCount];
    if (!expected || !Array.isArray(units)) return [];
    const count = units.length;
    if (count >= expected.min && (expected.max === undefined || count <= expected.max)) return [];
    const wanted = expected.max === undefined ? `at least ${expected.min}` : `${expected.min}`;
    return [{field: "units", message: `"${RI_UNIT_COUNT.labels[unitCount]}" needs ${wanted} units, but ${count} were entered`}];
  },
  ({units, unitTenancies}) => {
    if (!Array.isArray(units) || !Array.isArray(unitTenancies)) return [];
    if (units.length === unitTenancies.length) return [];
    return [{
      field: "unitTenancies",
      message: `Tenancy information was entered for ${unitTenancies.length} units, but the property has ${units.length}`,
    }];
  },
  ({units}) => {
    if (!Array.isArray(units)) return [];
    const problems = [];
    units.forEach((unit, index) => {
      if (index < 2 || !Array.isArray(unit?.position)) return;
      if (unit.position.some((id) => !RI_ADDED_UNIT_POSITIONS.includes(id))) {
        problems.push({
          field: "units", index, itemField: "position",
          message: "Additional units can only be marked Front, Rear or Apartment / Unit Number",
        });
      }
    });
    return problems;
  },
];


/**
 * ─────────────────────────────────────────────────────────────────────
 * DETACHED (final client mockups, 2026-09) — same model as residential income.
 * ─────────────────────────────────────────────────────────────────────
 */

const D_HOME_STYLE = defineOptions({
  bungalow: "Bungalow", one_and_half_storey: "1.5 Storey", two_storey: "2 Storey",
  two_and_half_storey: "2.5 Storey", three_storey: "3 Storey", sidesplit: "Sidesplit",
  backsplit: "Backsplit", other: "Other",
});
const D_STOREYS = defineOptions([["1", "1"], ["1.5", "1.5"], ["2", "2"], ["2.5", "2.5"], ["3_plus", "3+"]]);
const D_EXTERIOR_FINISH = defineOptions({
  brick: "Brick", stone: "Stone", stucco: "Stucco", vinyl_siding: "Vinyl Siding",
  aluminum_siding: "Aluminum Siding", wood_siding: "Wood Siding", concrete: "Concrete", other: "Other",
});
const D_LOT_UNIT = defineOptions({feet: "Feet", metres: "Metres"});
const D_PROPERTY_SETTING = defineOptions({
  corner_lot: "Corner lot", irregular_shaped_lot: "Irregular-shaped lot", ravine_lot: "Ravine lot",
  backs_onto_park: "Backs onto a park or green space", backs_onto_water: "Backs onto water",
  backs_onto_golf_course: "Backs onto a golf course", no_rear_neighbours: "No rear neighbours",
  cul_de_sac: "Located on a cul-de-sac", none_not_sure: "None of these / Not sure",
});
const D_ADDITIONAL_BUILDING = defineOptions({
  no: "No", garden_suite: "Garden suite or backyard home", laneway_coach_house: "Laneway or coach house",
  above_garage: "Living space above or connected to a garage", workshop_studio: "Detached workshop or studio",
  storage_building: "Detached storage building", something_else_not_sure: "Something else / Not sure",
});
const D_DRIVEWAY_TYPE = defineOptions({private: "Private", shared: "Shared", mutual: "Mutual"});
const D_DRIVEWAY_FINISH = defineOptions({
  asphalt: "Asphalt", concrete: "Concrete", interlock: "Interlock", gravel: "Gravel", other: "Other",
});
const D_GARAGE_TYPE = defineOptions({attached: "Attached", detached: "Detached", built_in: "Built-in", carport: "Carport"});
const D_YARD_FEATURES = defineOptions({
  fenced_yard: "Fenced yard", deck: "Deck", patio: "Patio", porch_veranda: "Porch or veranda",
  gazebo_pergola: "Gazebo or pergola", storage_shed: "Storage shed", pool: "Pool", hot_tub: "Hot tub",
  ev_charger: "EV charger", sprinkler_system: "Sprinkler system",
  exterior_security_system: "Exterior security system", none: "None of these",
});
const D_BEDROOMS = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6_plus", "6+"]]);
const D_FULL_BATHS = defineOptions([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5_plus", "5+"]]);
const D_PARTIAL_BATHS = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const D_HEATING = defineOptions({
  forced_air_gas: "Forced air (gas)", forced_air_electric: "Forced air (electric)", heat_pump: "Heat pump",
  boiler_radiant: "Boiler / radiant", baseboard: "Baseboard", other: "Other",
});
const D_COOLING = defineOptions({
  central_air: "Central air", heat_pump: "Heat pump", ductless: "Ductless / mini-split",
  window_units: "Window units", none: "None",
});
const D_FIREPLACE_COUNT = defineOptions([["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const D_FIREPLACE_TYPE = defineOptions({gas: "Gas", wood: "Wood", electric: "Electric"});
const D_LAUNDRY = defineOptions({main_floor: "Main floor", upper_floor: "Upper floor", basement: "Basement", none: "None"});
// Ordered to read across the mockup's two columns row by row.
const D_INTERIOR_FEATURES = defineOptions({
  open_concept: "Open-concept layout", updated_kitchen: "Updated kitchen",
  kitchen_island: "Kitchen island", ensuite_bathroom: "Ensuite bathroom",
  walk_in_closet: "Walk-in closet", hardwood_flooring: "Hardwood flooring",
  main_floor_office: "Main-floor office", main_floor_laundry: "Main-floor laundry",
  accessibility_features: "Accessibility features", something_else: "Something else",
  none: "None of these",
});
const D_BASEMENT_FINISH = defineOptions({finished: "Finished", partially_finished: "Partially finished", unfinished: "Unfinished"});
const D_BASEMENT_BEDROOMS = defineOptions([["none", "None"], ["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const D_BASEMENT_WASHROOMS = defineOptions([["none", "None"], ["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const D_KITCHEN_STYLE = defineOptions({full_kitchen: "Full kitchen", kitchenette: "Kitchenette"});
const D_LAUNDRY_SETUP = defineOptions({in_suite: "In-suite", shared: "Shared", none: "None"});

const HAS = (field) => ({field, in: [true]});

// Exterior & Lot fields shared by detached and semi-detached (identical
// mockups; only detached also asks about an additional building there).
const exteriorLotFields = {
  homeStyle: {path: "exteriorLot", ...singleSelect(D_HOME_STYLE), ui: {control: "select", placeholder: "Select"}},
  numberOfStoreys: {path: "exteriorLot", ...singleSelect(D_STOREYS), ui: {control: "select", placeholder: "Select"}},
  approxYearBuilt: {path: "exteriorLot", schema: yearBuiltSchema, ui: {placeholder: "Enter year"}},
  primaryExteriorFinish: {
    path: "exteriorLot",
    ...singleSelect(D_EXTERIOR_FINISH),
    ui: {control: "select", placeholder: "Select"},
  },
  lotWidth: {path: "exteriorLot", schema: z.number().positive().max(100_000), ui: {placeholder: "Enter"}},
  lotDepth: {path: "exteriorLot", schema: z.number().positive().max(100_000), ui: {placeholder: "Enter"}},
  lotMeasurementUnit: {path: "exteriorLot", ...singleSelect(D_LOT_UNIT), ui: {control: "select", placeholder: "Select"}},
  propertySetting: {
    path: "exteriorLot",
    ...multiSelect(D_PROPERTY_SETTING, {exclusive: "none_not_sure"}),
    ui: {control: "checkboxes", optionStyle: "row", optionColumns: 3},
  },
};

// Yard & outdoor feature checklist, identical on detached and semi-detached.
const yardOutdoorFeaturesField = {
  path: "parkingOutdoor",
  ...multiSelect(D_YARD_FEATURES, {exclusive: "none", control: "cards"}),
  ui: {
    control: "cards",
    optionStyle: "row",
    optionColumns: 4,
    optionIcons: {
      fenced_yard: "fence", deck: "rows-3", patio: "umbrella", porch_veranda: "house", gazebo_pergola: "tent",
      storage_shed: "warehouse", pool: "waves", hot_tub: "bath", ev_charger: "plug-zap",
      sprinkler_system: "droplets", exterior_security_system: "shield-check", none: "ban",
    },
  },
};

const detachedFields = {
  // PAGE D-01 — Exterior & Lot
  ...exteriorLotFields,
  additionalBuildingOrLivingSpace: {
    path: "exteriorLot",
    ...singleSelect(D_ADDITIONAL_BUILDING),
    ui: {control: "cards", optionStyle: "row", optionColumns: 4},
  },

  // PAGE D-02 — Parking & Outdoor Areas
  hasDriveway: {path: "parkingOutdoor", ...yesNo("cards", {optionStyle: "row"})},
  drivewayType: {
    path: "parkingOutdoor",
    ...singleSelect(D_DRIVEWAY_TYPE),
    requiredWhen: HAS("hasDriveway"),
    ui: {control: "select", placeholder: "Select"},
  },
  drivewayFinish: {
    path: "parkingOutdoor",
    ...singleSelect(D_DRIVEWAY_FINISH),
    requiredWhen: HAS("hasDriveway"),
    ui: {control: "select", placeholder: "Select"},
  },
  outsideParkingSpaces: {path: "parkingOutdoor", schema: z.number().int().min(0).max(20), requiredWhen: HAS("hasDriveway")},
  hasGarage: {
    path: "parkingOutdoor",
    ...yesNo("cards", {optionStyle: "row", helpText: "We'll ask about the type and indoor parking spaces if you select Yes."}),
  },
  garageType: {
    path: "parkingOutdoor",
    ...singleSelect(D_GARAGE_TYPE),
    requiredWhen: HAS("hasGarage"),
    ui: {control: "select", placeholder: "Select"},
  },
  indoorParkingSpaces: {path: "parkingOutdoor", schema: z.number().int().min(1).max(10), requiredWhen: HAS("hasGarage")},
  yardOutdoorFeatures: yardOutdoorFeaturesField,

  // PAGE D-03 — Inside the Home
  bedroomsAboveGround: {path: "interior", ...singleSelect(D_BEDROOMS), ui: {control: "select", placeholder: "Select"}},
  fullBathroomsAboveGround: {path: "interior", ...singleSelect(D_FULL_BATHS), ui: {control: "select", placeholder: "Select"}},
  partialBathroomsAboveGround: {
    path: "interior",
    ...singleSelect(D_PARTIAL_BATHS),
    ui: {control: "select", placeholder: "Select"},
  },
  mainHeatingType: {path: "interior", ...singleSelect(D_HEATING), ui: {control: "select", placeholder: "Select"}},
  cooling: {path: "interior", ...singleSelect(D_COOLING), ui: {control: "select", placeholder: "Select"}},
  hasFireplace: {path: "interior", ...yesNo("segmented", {helpText: "If Yes, we'll ask for the number and type."})},
  fireplaceCount: {
    path: "interior",
    ...singleSelect(D_FIREPLACE_COUNT),
    requiredWhen: HAS("hasFireplace"),
    ui: {control: "select", placeholder: "Select"},
  },
  fireplaceTypes: {path: "interior", ...multiSelect(D_FIREPLACE_TYPE), requiredWhen: HAS("hasFireplace")},
  laundryLocation: {path: "interior", ...singleSelect(D_LAUNDRY), ui: {control: "select", placeholder: "Select"}},
  interiorFeatures: {
    path: "interior",
    ...multiSelect(D_INTERIOR_FEATURES, {exclusive: "none", control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 2,
      optionIcons: {
        open_concept: "sofa", kitchen_island: "cooking-pot", walk_in_closet: "shirt", main_floor_office: "monitor",
        accessibility_features: "accessibility", updated_kitchen: "refrigerator", ensuite_bathroom: "shower-head",
        hardwood_flooring: "layers", main_floor_laundry: "washing-machine", something_else: "circle-ellipsis",
        none: "ban",
      },
    },
  },
  interiorFeaturesOther: {
    path: "interior",
    schema: draftText(200),
    requiredWhen: {field: "interiorFeatures", includes: "something_else"},
    ui: {placeholder: "Tell us what else"},
  },

  // PAGE D-04 — Basement
  hasBasement: {path: "basement", ...yesNo("cards", {optionStyle: "row", wide: true})},
  basementFinish: {
    path: "basement",
    ...singleSelect(D_BASEMENT_FINISH),
    requiredWhen: HAS("hasBasement"),
    ui: {control: "cards", optionStyle: "row", optionColumns: 3, wide: true},
  },
  basementBedrooms: {
    path: "basement",
    ...singleSelect(D_BASEMENT_BEDROOMS),
    requiredWhen: HAS("hasBasement"),
    ui: {control: "radio", inline: true},
  },
  basementWashrooms: {
    path: "basement",
    ...singleSelect(D_BASEMENT_WASHROOMS),
    requiredWhen: HAS("hasBasement"),
    ui: {control: "radio", inline: true},
  },
  basementApartment: {
    path: "basement",
    ...yesNo("cards", {
      optionStyle: "row",
      wide: true,
      helpText: "Select Yes only when the basement contains a separate apartment and has its own entrance.",
    }),
    requiredWhen: HAS("hasBasement"),
  },
  apartmentLivingRoom: {
    path: "basement",
    ...yesNo("radio", {inline: true, groupTitle: "Tell us about the basement apartment"}),
    requiredWhen: HAS("basementApartment"),
  },
  apartmentFamilyRoom: {path: "basement", ...yesNo("radio", {inline: true}), requiredWhen: HAS("basementApartment")},
  apartmentKitchenStyle: {
    path: "basement",
    ...singleSelect(D_KITCHEN_STYLE),
    requiredWhen: HAS("basementApartment"),
    ui: {control: "radio", inline: true},
  },
  apartmentLaundrySetup: {
    path: "basement",
    ...singleSelect(D_LAUNDRY_SETUP),
    requiredWhen: HAS("basementApartment"),
    ui: {control: "radio", inline: true},
  },
  apartmentCurrentlyLeased: {
    path: "basement",
    ...yesNo("radio", {inline: true}),
    requiredWhen: HAS("basementApartment"),
  },
};


/**
 * ─────────────────────────────────────────────────────────────────────
 * FINAL LISTING INFORMATION — detached's closing pages (residential income
 * reuses the sale-items page). `stage: "finalListing"` shows them under that
 * step rather than Property Details.
 * ─────────────────────────────────────────────────────────────────────
 */

const FL_LOCATION = defineOptions({
  close_to_schools: "Close to schools", close_to_parks: "Close to parks",
  close_to_public_transit: "Close to public transit", close_to_go_transit: "Close to GO Transit",
  close_to_shopping: "Close to shopping", close_to_restaurants: "Close to restaurants",
  close_to_recreation: "Close to recreation facilities", close_to_highways: "Close to highways",
  close_to_trails: "Close to trails", close_to_healthcare: "Close to healthcare", quiet_street: "Quiet street",
  family_friendly: "Family-friendly neighbourhood",
});
const FL_RENTAL_ITEMS = defineOptions({
  hot_water_tank: "Hot-water tank", tankless_hot_water: "Tankless hot-water system",
  furnace_heating: "Furnace or heating equipment", air_conditioning: "Air-conditioning equipment",
  heat_pump: "Heat pump", water_softener: "Water softener", water_filtration: "Water filtration system",
  security_alarm: "Security or alarm system", smart_home: "Smart-home equipment",
  solar_energy: "Solar or energy equipment", propane_tank: "Propane tank", other: "Other",
  none: "There are no rental or leased items",
});
const FL_PAYMENT_FREQUENCY = defineOptions({monthly: "Monthly", quarterly: "Quarterly", annually: "Annually", other: "Other"});
const DETAILS_KNOWN = {field: "detailsUnavailable", ne: true};

const listingRemarksFields = {
  buyerHighlights: {
    path: "listingRemarks",
    schema: draftText(2000),
    ui: {
      multiline: true,
      placeholder: "For example: a bright renovated kitchen, natural light, a practical layout, private backyard, " +
        "home office, entertaining space or recent improvements.",
    },
  },
  locationHighlights: {
    path: "listingRemarks",
    ...multiSelect(FL_LOCATION),
    ui: {control: "checkboxes", optionStyle: "row", optionColumns: 3},
  },
  additionalRemarks: {
    path: "listingRemarks",
    schema: draftText(500).optional(),
    ui: {multiline: true, placeholder: "Type here..."},
  },
};

const saleItemsFields = {
  itemsIncluded: {
    path: "saleItems",
    schema: draftText(1000),
    ui: {
      multiline: true,
      placeholder: "Refrigerator, stove, dishwasher, washer, dryer, window coverings, garage-door opener and backyard shed.",
    },
  },
  itemsExcluded: {
    path: "saleItems",
    schema: draftText(500).optional(),
    ui: {
      multiline: true,
      placeholder: "Dining-room chandelier, wall-mounted television, backyard shed or patio furniture.",
      helpText: "If nothing is excluded, you may leave this blank.",
    },
  },
  rentalItems: {
    path: "saleItems",
    ...multiSelect(FL_RENTAL_ITEMS, {exclusive: "none"}),
    ui: {control: "checkboxes", optionStyle: "row", optionColumns: 4, wide: true},
  },
  rentalItemDetails: keyedDetailsField("saleItems", "rentalItems", FL_RENTAL_ITEMS, {
    // Declared first so the fields below can depend on it; `placement: "end"`
    // still renders it last, as in the mockup.
    detailsUnavailable: {
      label: "I don't have these details right now",
      schema: z.boolean().optional(),
      ui: {control: "checkbox", placement: "end"},
    },
    otherDescription: {
      label: "What is the item?",
      schema: draftText(100),
      requiredWhen: {itemKey: {in: ["other"]}},
    },
    company: {label: "Rental or leasing company", schema: draftText(150), requiredWhen: DETAILS_KNOWN},
    paymentAmount: {
      label: "Approximate payment",
      schema: z.number().positive().max(100_000),
      requiredWhen: DETAILS_KNOWN,
      ui: {prefix: "$"},
    },
    paymentFrequency: {
      label: "Payment frequency",
      ...singleSelect(FL_PAYMENT_FREQUENCY, "segmented"),
      requiredWhen: DETAILS_KNOWN,
    },
    accountNumber: {label: "Contract or account number (if available)", schema: draftText(60).optional()},
    contractEndDate: {label: "Contract end date (if known)", schema: z.iso.date().optional()},
    buyoutAmount: {
      label: "Buyout amount (if known)",
      schema: z.number().min(0).max(1_000_000).optional(),
      ui: {prefix: "$"},
    },
    agreement: {label: "Upload agreement or recent statement", ...fileField("rental_agreement"), schema: fileField().schema.optional()},
  }, {ui: {itemTitle: "{label} details", wide: true}}),
};

const listingRemarksSection = {
  id: "listing-remarks",
  title: "Help Us Prepare Your Listing Remarks",
  paths: ["listingRemarks"],
  stage: "finalListing",
  groupStyle: "titled",
  continueLabel: "Continue to What Stays & What Goes",
  accent: "orange",
  groups: [
    {
      content: {
        icon: "wand-sparkles",
        title: "You provide the details—we'll help with the writing.",
        body: "Tell us what you want buyers to notice, understand, and feel about your property and its location. " +
          "We use AI-assisted tools, where appropriate, to organize what you share and prepare clear, professional " +
          "listing remarks. The Brokerage reviews and refines the wording before it is published on MLS®.",
      },
    },
    {fields: ["buyerHighlights", "locationHighlights"]},
    {fields: ["additionalRemarks"]},
    {
      content: {
        title: "Your Property Brochure",
        body: "The information you provide will also help us prepare a professional property brochure for your " +
          "listing. You'll receive a print-ready PDF for prospective buyers visiting the property and a digital copy " +
          "that is easy to share by email.",
        checks: ["Professionally prepared", "Ready to print", "Easy to share digitally"],
      },
    },
  ],
  panels: [{
    type: "gallery",
    title: "Think Beyond the Property",
    body: "Buyers are also interested in the neighbourhood, everyday conveniences and the lifestyle the location may offer.",
    cards: [
      {
        label: "Schools & Parks",
        icon: "school",
        image: {src: "/assets/images/create-listing/neighbourhood-schools-parks.jpg", alt: "School beside a park and playground"},
      },
      {
        label: "Shopping & Convenience",
        icon: "shopping-bag",
        image: {src: "/assets/images/create-listing/neighbourhood-shopping.jpg", alt: "Open-air shopping plaza"},
      },
      {
        label: "Dining & Lifestyle",
        icon: "utensils-crossed",
        image: {src: "/assets/images/create-listing/neighbourhood-dining-lifestyle.jpg", alt: "Tree-lined restaurant patio"},
      },
    ],
    note: {icon: "leaf", text: "Your local knowledge helps buyers picture life beyond the front door."},
  }],
};

const saleItemsSection = {
  id: "sale-items",
  title: "Items Included, Not Included & Rental Items",
  paths: ["saleItems"],
  stage: "finalListing",
  subtitle: "Tell us what will remain, what you plan to remove, and about any rental or leased items connected to the property.",
  groupStyle: "numberedTitle",
  groups: [
    {fields: ["itemsIncluded"]},
    {fields: ["itemsExcluded"]},
    {
      title: "Rental or Leased Items Connected to the Property",
      hint: "Tell us about any equipment or services currently rented or leased. The Brokerage will review the " +
        "information to determine how it should be disclosed and addressed.",
      fields: ["rentalItems", "rentalItemDetails"],
    },
    {content: {body: "We'll review your answers and prepare the appropriate listing wording."}},
  ],
  panels: [{
    type: "guide",
    image: {src: "/assets/images/create-listing/modern-kitchen-interior.png", alt: "Kitchen with island"},
    title: "Helping Us Prepare Accurate Listing Information",
    body: "Clearly identifying included, excluded, and rental or leased items helps prevent misunderstandings. " +
      "The Brokerage will review your answers and prepare the appropriate listing wording.",
  }],
};

const FINAL_LISTING_LABELS = {
  buyerHighlights: "What would you like buyers to notice and appreciate about your property?",
  locationHighlights: "What should buyers know about the location?",
  additionalRemarks: "Anything else you would like buyers to know?",
  itemsIncluded: "Items Included in the Sale",
  itemsExcluded: "Items Not Included in the Sale",
  rentalItems: "Select every rental or leased item that applies.",
  rentalItemDetails: "Rental or leased item details",
};
const FINAL_LISTING_HINTS = {
  buyerHighlights: "In your own words, tell us what makes the property special and what you believe buyers will " +
    "value most. Short notes are perfectly fine.",
  locationHighlights: "Select all that apply. We'll use the relevant information when preparing your listing remarks.",
  additionalRemarks: "Share anything important that was not covered above.",
  itemsIncluded: "List the appliances and other items that will remain with the property. You may also include " +
    "outdoor items such as a shed, gazebo or play structure.",
  itemsExcluded: "List anything you plan to remove that a buyer might otherwise expect to remain.",
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * SEMI-DETACHED (final client mockups, 2026-09) — same model as residential income.
 * ─────────────────────────────────────────────────────────────────────
 */

const SD_DRIVEWAY_ARRANGEMENT = defineOptions({
  private: "Private driveway", shared: "Shared driveway", mutual: "Mutual driveway", right_of_way: "Right-of-way",
});
const SD_DRIVEWAY_TYPE = defineOptions({
  single_wide: "Single-wide", double_wide: "Double-wide", tandem: "Tandem", circular: "Circular",
});
const SD_YARD_EXCLUSIVE = defineOptions({
  exclusive: "Yes, exclusive to this property", some_shared: "Some areas or features are shared", not_sure: "Not sure",
});
const SD_MAIN_LIVING_SPACES = defineOptions({
  living_room: "Living room", dining_room: "Dining room", family_room: "Family room", kitchen: "Kitchen",
  breakfast_area: "Breakfast area", home_office: "Home office", laundry_room: "Laundry room", mudroom: "Mudroom",
  recreation_room: "Recreation room", sunroom: "Sunroom", exercise_room: "Exercise room",
  other_finished_room: "Other finished room",
});
const SD_INTERIOR_FEATURES = defineOptions({
  fireplace: "Fireplace", central_vacuum: "Central vacuum", hardwood_flooring: "Hardwood flooring", carpet: "Carpet",
  tile_flooring: "Tile flooring", skylight: "Skylight", accessibility_features: "Accessibility features",
  none: "None of these",
});
const SD_HEATING = defineOptions({
  forced_air: "Forced air", hot_water_boiler: "Hot water / boiler", radiant: "Radiant", heat_pump: "Heat pump",
  electric_baseboard: "Electric baseboard", other: "Other", not_sure: "Not sure",
});
const SD_HEATING_FUEL = defineOptions({
  natural_gas: "Natural gas", electric: "Electric", oil: "Oil", propane: "Propane", wood: "Wood", other: "Other",
  not_sure: "Not sure",
});
const SD_COOLING = defineOptions({
  central_air: "Central air", heat_pump: "Heat pump", ductless: "Ductless / mini-split", window_units: "Window units",
  none: "None", not_sure: "Not sure",
});
const SD_ADDITIONAL_HEATING = defineOptions({
  none: "None", fireplace_wood_stove: "Fireplace / wood stove", electric_baseboard: "Electric baseboard",
  heat_pump: "Heat pump", other: "Other", not_sure: "Not sure",
});
const SD_WATER_SOURCE = defineOptions({municipal: "Municipal", well: "Well", other: "Other", not_sure: "Not sure"});
const SD_SEWAGE = defineOptions({municipal: "Municipal", septic: "Septic", other: "Other", not_sure: "Not sure"});
const SD_ELECTRICAL = defineOptions({
  amp_60: "60 amp", amp_100: "100 amp", amp_125: "125 amp", amp_200: "200 amp", amp_400: "400 amp", not_sure: "Not sure",
});
const SD_HOT_WATER = defineOptions({tank: "Tank", tankless: "Tankless", other: "Other", not_sure: "Not sure"});
const NO_YES_NOT_SURE = defineOptions({no: "No", yes: "Yes", not_sure: "Not sure"});
const YES_NO_NOT_SURE = defineOptions({yes: "Yes", no: "No", not_sure: "Not sure"});
const NO_YES = defineOptions({no: "No", yes: "Yes"});
const SD_BASEMENT_ACCESS = defineOptions({
  interior_stairs: "Interior stairs", separate_entrance: "Separate entrance", walk_out: "Walk-out", walk_up: "Walk-up",
});
const SD_BASEMENT_ROOMS = defineOptions({
  recreation_room: "Recreation room", bedroom: "Bedroom", bathroom: "Bathroom",
  kitchen_kitchenette: "Kitchen or kitchenette", laundry_area: "Laundry area", storage: "Storage",
  utility_mechanical: "Utility or mechanical room", other_finished_room: "Other finished room",
});
const SD_UNIT_STATUS = defineOptions({legal: "Legal", legal_non_conforming: "Legal non-conforming", not_sure: "Not sure"});
const SD_UNIT_OCCUPANCY = defineOptions({vacant: "Vacant", owner_family: "Owner or family", tenant: "Tenant"});
const SD_SPACE_TYPES = defineOptions({
  garden_suite: "Garden suite", laneway_suite: "Laneway suite", coach_house: "Coach house",
  above_garage_suite: "Above-garage suite", other_separate_space: "Other separate space",
});
const SD_SPACE_USE = defineOptions({
  living_space: "Living space", rental_unit: "Rental unit", home_office_studio: "Home office / studio",
  storage: "Storage", not_used: "Not currently used", other: "Other",
});
const SD_SPACE_OCCUPANCY = defineOptions({vacant: "Vacant", owner_family: "Owner or family", tenant: "Tenant", other: "Other"});
const SD_APPROVAL_STATUS = defineOptions({permitted: "Permitted / approved", not_permitted: "Not permitted", not_sure: "Not sure"});
const SD_CONVENIENCES = defineOptions({
  schools: "Schools", parks: "Parks", playgrounds: "Playgrounds", shopping: "Shopping", groceries: "Groceries",
  restaurants_cafes: "Restaurants & cafés", community_centre: "Community centre", library: "Library",
  hospital_healthcare: "Hospital or healthcare", places_of_worship: "Places of worship", waterfront: "Waterfront",
  trails: "Trails",
});
const SD_TRANSPORTATION = defineOptions({
  public_transit: "Public transit", go_transit: "GO Transit", subway: "Subway", major_highways: "Major highways",
  bike_routes: "Bike routes", walkable_services: "Walkable services", airport_access: "Airport access",
  none: "None of these",
});
const SD_SETTING = defineOptions({
  urban_neighbourhood: "Urban neighbourhood", quiet_residential_street: "Quiet residential street",
  cul_de_sac: "Cul-de-sac", ravine_green_space: "Ravine or green space", water_view: "Water view",
  other_notable_setting: "Other notable setting",
});
const SD_CHATTELS = defineOptions({
  refrigerator: "Refrigerator", stove: "Stove", dishwasher: "Dishwasher", washer: "Washer", dryer: "Dryer",
  window_coverings: "Window coverings", garage_door_opener: "Garage-door opener", other_items: "Other items",
});
// The rental-item list without its "There are no rental or leased items" option.
const RENTAL_ITEM_TYPES = defineOptions(
    Object.fromEntries(Object.entries(FL_RENTAL_ITEMS.labels).filter(([value]) => value !== "none")),
);

const selectUi = {control: "select", placeholder: "Select"};
const IS_YES = (field) => ({field, in: ["yes"]});

const semiDetachedFields = {
  // PAGE SD-01 — Exterior & Lot (shared with detached)
  ...exteriorLotFields,

  // PAGE SD-02 — Parking & Outdoor Areas
  hasDriveway: {path: "parkingOutdoor", ...yesNo("cards", {optionStyle: "row"})},
  drivewayArrangement: {
    path: "parkingOutdoor",
    ...singleSelect(SD_DRIVEWAY_ARRANGEMENT),
    requiredWhen: HAS("hasDriveway"),
    ui: selectUi,
  },
  drivewayType: {path: "parkingOutdoor", ...singleSelect(SD_DRIVEWAY_TYPE), requiredWhen: HAS("hasDriveway"), ui: selectUi},
  drivewayFinish: {
    path: "parkingOutdoor",
    ...singleSelect(D_DRIVEWAY_FINISH),
    requiredWhen: HAS("hasDriveway"),
    ui: selectUi,
  },
  outsideParkingSpaces: {path: "parkingOutdoor", schema: z.number().int().min(0).max(20), requiredWhen: HAS("hasDriveway")},
  hasGarage: {path: "parkingOutdoor", ...yesNo("cards", {optionStyle: "row"})},
  garageType: {path: "parkingOutdoor", ...singleSelect(D_GARAGE_TYPE), requiredWhen: HAS("hasGarage"), ui: selectUi},
  indoorParkingSpaces: {path: "parkingOutdoor", schema: z.number().int().min(1).max(10), requiredWhen: HAS("hasGarage")},
  garageSharedWithAdjoining: {
    path: "parkingOutdoor",
    ...yesNo("cards", {optionStyle: "row"}),
    requiredWhen: HAS("hasGarage"),
  },
  yardOutdoorFeatures: yardOutdoorFeaturesField,
  yardExclusiveUse: {
    path: "parkingOutdoor",
    ...singleSelect(SD_YARD_EXCLUSIVE),
    ui: {control: "cards", optionStyle: "row", optionColumns: 3},
  },

  // PAGE SD-03 — Inside the Home
  bedroomsAboveGrade: {path: "interior", schema: z.number().int().min(0).max(20)},
  bedroomsBelowGrade: {path: "interior", schema: z.number().int().min(0).max(10)},
  fullBathrooms: {path: "interior", schema: z.number().int().min(0).max(10)},
  partialBathrooms: {path: "interior", schema: z.number().int().min(0).max(10)},
  mainLivingSpaces: {
    path: "interior",
    ...multiSelect(SD_MAIN_LIVING_SPACES, {control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {
        living_room: "sofa", dining_room: "utensils-crossed", family_room: "armchair", kitchen: "cooking-pot",
        breakfast_area: "coffee", home_office: "monitor", laundry_room: "washing-machine", mudroom: "door-open",
        recreation_room: "gamepad-2", sunroom: "sun", exercise_room: "dumbbell", other_finished_room: "circle-ellipsis",
      },
    },
  },
  otherFinishedRoom: {
    path: "interior",
    schema: draftText(200),
    requiredWhen: {field: "mainLivingSpaces", includes: "other_finished_room"},
    ui: {placeholder: "Tell us what the room is"},
  },
  interiorFeatures: {
    path: "interior",
    ...multiSelect(SD_INTERIOR_FEATURES, {exclusive: "none", control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {
        fireplace: "flame", central_vacuum: "wind", hardwood_flooring: "layers", carpet: "square-dashed",
        tile_flooring: "grid-2x2", skylight: "lightbulb", accessibility_features: "accessibility", none: "ban",
      },
    },
  },

  // PAGE SD-04 — Home Systems & Utilities
  primaryHeatingSystem: {path: "systems", ...singleSelect(SD_HEATING), ui: selectUi},
  heatingFuel: {path: "systems", ...singleSelect(SD_HEATING_FUEL), ui: selectUi},
  coolingSystem: {path: "systems", ...singleSelect(SD_COOLING), ui: selectUi},
  additionalHeating: {path: "systems", ...singleSelect(SD_ADDITIONAL_HEATING), ui: selectUi},
  waterSource: {path: "systems", ...singleSelect(SD_WATER_SOURCE), ui: selectUi},
  sewageSystem: {path: "systems", ...singleSelect(SD_SEWAGE), ui: selectUi},
  electricalService: {path: "systems", ...singleSelect(SD_ELECTRICAL), ui: selectUi},
  hotWaterSystem: {path: "systems", ...singleSelect(SD_HOT_WATER), ui: selectUi},
  sharedSystems: {
    path: "systems",
    ...singleSelect(NO_YES_NOT_SURE),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 3,
      helpText: "This is uncommon, but it's important for us to identify anything shared.",
    },
  },

  // PAGE SD-05 — Basement & Lower Level
  hasBasement: {path: "basement", ...yesNo("cards", {optionStyle: "row"})},
  basementFinish: {
    path: "basement",
    ...singleSelect(D_BASEMENT_FINISH),
    requiredWhen: HAS("hasBasement"),
    ui: {control: "cards", optionStyle: "row", optionColumns: 3},
  },
  basementAccess: {
    path: "basement",
    ...multiSelect(SD_BASEMENT_ACCESS, {control: "cards"}),
    requiredWhen: HAS("hasBasement"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {interior_stairs: "footprints", separate_entrance: "door-open", walk_out: "door-closed", walk_up: "trending-up"},
    },
  },
  basementRooms: {
    path: "basement",
    ...multiSelect(SD_BASEMENT_ROOMS, {control: "cards"}),
    requiredWhen: HAS("hasBasement"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {
        recreation_room: "sofa", bedroom: "bed-double", bathroom: "bath", kitchen_kitchenette: "cooking-pot",
        laundry_area: "washing-machine", storage: "package", utility_mechanical: "wrench",
        other_finished_room: "circle-ellipsis",
      },
    },
  },
  basementOtherRoom: {
    path: "basement",
    schema: draftText(200),
    requiredWhen: {field: "basementRooms", includes: "other_finished_room"},
    ui: {placeholder: "Tell us what the room is"},
  },
  basementSeparateUnit: {
    path: "basement",
    ...singleSelect(NO_YES),
    requiredWhen: HAS("hasBasement"),
    ui: {
      control: "cards",
      optionStyle: "row",
      helpText: "If you select Yes, we'll ask about its status and whether it is vacant or occupied.",
    },
  },
  separateUnitStatus: {
    path: "basement",
    ...singleSelect(SD_UNIT_STATUS),
    requiredWhen: IS_YES("basementSeparateUnit"),
    ui: {control: "radio", inline: true},
  },
  separateUnitOccupancy: {
    path: "basement",
    ...singleSelect(SD_UNIT_OCCUPANCY),
    requiredWhen: IS_YES("basementSeparateUnit"),
    ui: {control: "radio", inline: true},
  },
  separateUnitVacantPossession: {
    path: "basement",
    ...singleSelect(YES_NO_NOT_SURE),
    requiredWhen: IS_YES("basementSeparateUnit"),
    ui: {control: "radio", inline: true},
  },

  // PAGE SD-06 — Additional Living Spaces
  hasAdditionalLivingSpace: {path: "additionalLivingSpaces", ...yesNo("cards", {optionStyle: "row"})},
  additionalSpaceTypes: {
    path: "additionalLivingSpaces",
    ...multiSelect(SD_SPACE_TYPES, {control: "cards"}),
    requiredWhen: HAS("hasAdditionalLivingSpace"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 5,
      optionIcons: {
        garden_suite: "house", laneway_suite: "warehouse", coach_house: "building", above_garage_suite: "building-2",
        other_separate_space: "circle-ellipsis",
      },
    },
  },
  additionalSpaceUse: {
    path: "additionalLivingSpaces",
    ...singleSelect(SD_SPACE_USE),
    requiredWhen: HAS("hasAdditionalLivingSpace"),
    ui: selectUi,
  },
  additionalSpaceOccupancy: {
    path: "additionalLivingSpaces",
    ...singleSelect(SD_SPACE_OCCUPANCY),
    requiredWhen: HAS("hasAdditionalLivingSpace"),
    ui: selectUi,
  },
  additionalSpaceApproval: {
    path: "additionalLivingSpaces",
    ...singleSelect(SD_APPROVAL_STATUS),
    requiredWhen: HAS("hasAdditionalLivingSpace"),
    ui: {...selectUi, helpText: "Choose Not sure if you don't have documentation confirming the status."},
  },
  additionalSpaceServicesShared: {
    path: "additionalLivingSpaces",
    ...singleSelect(YES_NO_NOT_SURE),
    requiredWhen: HAS("hasAdditionalLivingSpace"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 3,
      helpText: "This may include water, hydro, gas, heating or other services.",
    },
  },

  // PAGE SD-07 — Location Highlights (Final Listing Information)
  everydayConveniences: {
    path: "locationHighlights",
    ...multiSelect(SD_CONVENIENCES, {control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {
        schools: "school", parks: "trees", playgrounds: "baby", shopping: "shopping-bag", groceries: "shopping-cart",
        restaurants_cafes: "utensils-crossed", community_centre: "users", library: "book-open",
        hospital_healthcare: "hospital", places_of_worship: "church", waterfront: "waves", trails: "mountain",
      },
    },
  },
  transportationAccess: {
    path: "locationHighlights",
    ...multiSelect(SD_TRANSPORTATION, {exclusive: "none", control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 4,
      optionIcons: {
        public_transit: "bus", go_transit: "train-front", subway: "tram-front", major_highways: "route",
        bike_routes: "bike", walkable_services: "person-standing", airport_access: "plane", none: "ban",
      },
    },
  },
  settingSurroundings: {
    path: "locationHighlights",
    ...multiSelect(SD_SETTING, {control: "cards"}),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 6,
      optionIcons: {
        urban_neighbourhood: "building", quiet_residential_street: "house", cul_de_sac: "map-pin",
        ravine_green_space: "tree-deciduous", water_view: "waves", other_notable_setting: "circle-ellipsis",
      },
    },
  },
  otherNotableSetting: {
    path: "locationHighlights",
    schema: draftText(200),
    requiredWhen: {field: "settingSurroundings", includes: "other_notable_setting"},
    ui: {placeholder: "Tell us about the setting"},
  },

  // PAGE SD-08 — Listing Remarks & Inclusions (Final Listing Information)
  clientRemarks: {path: "remarksInclusions", schema: draftText(1500), ui: {multiline: true}},
  includedChattels: {
    path: "remarksInclusions",
    ...multiSelect(SD_CHATTELS, {control: "cards"}),
    ui: {control: "cards", optionStyle: "row", optionColumns: 4},
  },
  otherChattels: {
    path: "remarksInclusions",
    schema: draftText(300),
    requiredWhen: {field: "includedChattels", includes: "other_items"},
    ui: {placeholder: "List the other items"},
  },
  excludedFixtures: {
    path: "remarksInclusions",
    ...singleSelect(NO_YES),
    ui: {control: "cards", optionStyle: "row", helpText: "If Yes, list each excluded fixture clearly."},
  },
  excludedFixturesList: {
    path: "remarksInclusions",
    schema: draftText(500),
    requiredWhen: IS_YES("excludedFixtures"),
    ui: {multiline: true, placeholder: "List each excluded fixture"},
  },
  rentedEquipment: {path: "remarksInclusions", ...yesNo("cards", {optionStyle: "row"})},
  rentedItems: listField("remarksInclusions", {
    item: {label: "Item", ...singleSelect(RENTAL_ITEM_TYPES), ui: selectUi},
    otherDescription: {
      label: "What is the item?",
      schema: draftText(100),
      requiredWhen: {field: "item", in: ["other"]},
    },
  }, {
    max: 15,
    requiredWhen: HAS("rentedEquipment"),
    ui: {compactItems: true, initialItems: 1, addLabel: "Add another item"},
  }),
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * RURAL / ACREAGE (final client mockups, 2026-09). Only fields starred "*"
 * in the mockups are required; the rest use `optional()`.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Same field, but optional (not starred in the rural mockups). */
function optional(def) {
  return {...def, schema: def.schema.optional()};
}

/** A number with a unit dropdown drawn inside it, stored as two fields. */
function withUnit(path, valueName, unitName, valueSchema, units, ui = {}) {
  return {
    [valueName]: {path, schema: valueSchema, ui: {...ui, unitField: unitName}},
    [unitName]: optional({path, ...singleSelect(units), ui: {control: "select", renderedBy: valueName}}),
  };
}

const R_PROPERTY_TYPE = defineOptions({
  country_home: "Country Home / Estate", hobby_farm: "Hobby Farm", working_farm: "Agricultural / Working Farm",
  recreational: "Recreational Property / Land", other_not_sure: "Other / Not Sure",
});
const R_PROPERTY_USE = defineOptions({
  residential: "Residential", agricultural: "Agricultural", recreational: "Recreational", mixed_use: "Mixed use",
  other: "Other",
});
const R_LOT_SHAPE = defineOptions({regular: "Regular", irregular: "Irregular", not_sure: "Not sure"});
const R_YEAR_BUILT = defineOptions({
  before_1950: "Before 1950", y1950_1970: "1950–1970", y1970_1990: "1970–1990", y1990_2000: "1990–2000",
  y2000_2010: "2000–2010", y2010_2020: "2010–2020", y2020_plus: "2020+", not_sure: "Not sure",
});
const R_STOREYS = defineOptions([["1", "1"], ["1.5", "1.5"], ["2", "2"], ["2.5", "2.5"], ["3_plus", "3+"]]);
const R_ACREAGE_UNIT = defineOptions({acres: "Acres", hectares: "Hectares"});
const R_LENGTH_UNIT = defineOptions({ft: "ft", m: "m"});
const R_AREA_UNIT = defineOptions({sq_ft: "sq ft", sq_m: "sq m"});
const R_DISTANCE_UNIT = defineOptions({km: "km", mi: "mi"});
const R_MUNICIPAL_ADDRESS = defineOptions({yes: "Yes", no_not_assigned: "No / Not Assigned"});
const R_ROAD_ACCESS = defineOptions({
  paved_municipal: "Paved municipal road", gravel_municipal: "Gravel municipal road", private_road: "Private road",
  seasonal_road: "Seasonal road", other: "Other",
});
const R_YEAR_ROUND = defineOptions({yes: "Yes", seasonal_only: "Seasonal only", not_sure: "Not sure"});
const R_EXT_CONSTRUCTION = defineOptions({
  wood_frame: "Wood frame", brick: "Brick", block_concrete: "Block / concrete", log: "Log",
  steel_metal: "Steel / metal", other: "Other",
});
const R_EXT_FINISH = defineOptions({
  brick: "Brick", stone: "Stone", vinyl_siding: "Vinyl siding", wood_siding: "Wood siding", stucco: "Stucco",
  aluminum_siding: "Aluminum siding", metal: "Metal", other: "Other",
});
const R_ROOF_TYPE = defineOptions({gable: "Gable", hip: "Hip", gambrel: "Gambrel", flat: "Flat", other: "Other"});
const R_ROOF_MATERIAL = defineOptions({
  asphalt_shingles: "Asphalt shingles", metal: "Metal", cedar_shake: "Cedar shake", slate: "Slate", other: "Other",
});
const R_ROOM_COUNT = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6_plus", "6+"]]);
const R_BATHROOMS = defineOptions([
  ["1", "1"], ["1.5", "1.5"], ["2", "2"], ["2.5", "2.5"], ["3", "3"], ["3.5", "3.5"], ["4_plus", "4+"],
]);
const R_HEATING = defineOptions({
  forced_air_gas: "Forced air (gas)", forced_air_propane: "Forced air (propane)", forced_air_oil: "Forced air (oil)",
  electric_baseboard: "Electric baseboard", heat_pump: "Heat pump", wood_pellet: "Wood / pellet",
  boiler_radiant: "Boiler / radiant", other: "Other",
});
const R_COOLING = defineOptions({
  central_air: "Central air", heat_pump: "Heat pump", ductless: "Ductless", window_units: "Window units", none: "None",
});
const R_FIREPLACE = defineOptions({
  none: "None", wood_fireplace: "Wood fireplace", gas_fireplace: "Gas fireplace", wood_stove: "Wood stove",
  pellet_stove: "Pellet stove", multiple: "Multiple",
});
const R_WATER_SOURCE = defineOptions({
  drilled_well: "Drilled well", dug_well: "Dug well", municipal: "Municipal", lake_river: "Lake / river",
  cistern: "Cistern", other: "Other",
});
const R_SEWER = defineOptions({
  septic_system: "Septic system", holding_tank: "Holding tank", municipal_sewer: "Municipal sewer", other: "Other",
});
const R_LAUNDRY = defineOptions({
  main_floor: "Main floor", upper_floor: "Upper floor", basement: "Basement", mudroom: "Mudroom", other: "Other",
});
const R_YES_NO = defineOptions({yes: "Yes", no: "No"});
const R_YES_NO_NOT_SURE = defineOptions({yes: "Yes", no: "No", not_sure: "Not Sure"});
const R_FLOORING = defineOptions({
  hardwood: "Hardwood", engineered_hardwood: "Engineered hardwood", laminate: "Laminate", vinyl: "Vinyl", tile: "Tile",
  carpet: "Carpet", concrete: "Concrete", other: "Other",
});
const R_INTERIOR_FEATURES = defineOptions({
  open_concept: "Open-concept layout", kitchen_island: "Kitchen island", walk_in_closet: "Walk-in closet",
  main_floor_office: "Main-floor office", updated_kitchen: "Updated kitchen", ensuite_bathroom: "Ensuite bathroom",
  central_vacuum: "Central vacuum", skylight: "Skylight", other: "Other",
});
const R_ACCESSIBILITY = defineOptions({
  no_step_entry: "No-step entry", wide_doorways: "Wide doorways", main_floor_bedroom: "Main-floor bedroom",
  main_floor_bathroom: "Main-floor bathroom", grab_bars: "Grab bars", ramp: "Ramp", stairlift: "Stairlift",
  other: "Other",
});
const R_SECURITY = defineOptions({
  alarm_system: "Alarm system", security_cameras: "Security cameras", motion_lights: "Motion lights",
  smart_locks: "Smart locks", gated_entry: "Gated entry", other: "Other",
});
const R_BASEMENT_TYPE = defineOptions({
  full: "Full", partial: "Partial", crawl_space: "Crawl space", slab_none: "Slab / no basement",
});
const R_WALKOUT = defineOptions({walk_out: "Walk-out", walk_up: "Walk-up", both: "Both", neither: "Neither"});
const R_SUITE_STATUS = defineOptions({legal: "Legal", unregistered: "Unregistered", not_sure: "Not Sure"});
const R_TENANCY = defineOptions({
  vacant: "Vacant", owner_occupied: "Owner-occupied", tenant_occupied: "Tenant-occupied", family: "Family",
});
const R_VACANT_POSSESSION = defineOptions({yes: "Yes", no: "No", not_applicable: "Not Applicable"});
const R_ADDITIONAL_SPACES = defineOptions({
  in_law_suite: "In-Law Suite", garden_suite: "Garden Suite", bunkie: "Bunkie",
  loft_upper: "Loft / Upper Level Living Space", other: "Other",
});
const R_OUTBUILDINGS = defineOptions({
  garage: "Garage", barn: "Barn", workshop: "Workshop", drive_shed: "Drive Shed", storage_shed: "Storage Shed",
  greenhouse: "Greenhouse", bunkie_guest: "Bunkie / Guest Structure", other: "Other Structures",
});
const R_GARAGE_TYPE = defineOptions({attached: "Attached", detached: "Detached", carport: "Carport"});
const R_LAND_FEATURES = defineOptions({
  paddocks: "Paddocks", fencing: "Fencing", pasture: "Pasture", cultivated_land: "Cultivated Land",
  wooded_area: "Wooded Area", pond: "Pond", creek_stream: "Creek / Stream", trails_paths: "Trails / Paths",
  gardens_orchards: "Gardens / Orchards", pool_hot_tub: "Pool / Hot Tub",
});
const R_DRIVEWAY_TYPE = defineOptions({private: "Private", shared: "Shared", right_of_way: "Right-of-way"});
const R_DRIVEWAY_SURFACE = defineOptions({
  gravel: "Gravel", asphalt: "Asphalt", concrete: "Concrete", dirt: "Dirt", other: "Other",
});
const R_UTILITIES = defineOptions({
  hydro: "Hydro", natural_gas: "Natural Gas", propane: "Propane", well: "Well", septic: "Septic", other: "Other",
});
const R_DISTANCE = defineOptions({
  under_5: "Under 5 km", km_5_10: "5–10 km", km_10_20: "10–20 km", km_20_50: "20–50 km", km_50_plus: "50+ km",
  not_available: "Not available", not_sure: "Not sure",
});
const R_MAIL = defineOptions({at_property: "At Property", community_mailbox: "Community Mailbox", not_sure: "Not Sure"});
const R_INTERNET = defineOptions({
  high_speed: "High Speed", limited: "Limited", not_available: "Not Available", not_sure: "Not Sure",
});
const R_CELLULAR = defineOptions({excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor"});
const R_EMERGENCY = defineOptions({
  within_15: "Within 15 min", min_15_30: "15–30 min", min_30_plus: "30+ min", not_sure: "Not Sure",
});
const R_CHATTELS = defineOptions({
  refrigerator: "Refrigerator", stove_range: "Stove / Range", dishwasher: "Dishwasher", washer_dryer: "Washer / Dryer",
  freezer: "Freezer", window_coverings: "Window Coverings", garage_door_opener: "Garage Door Opener & Remotes",
  water_treatment_owned: "Water Treatment Equipment (owned)", other: "Other (specify below)",
});
const R_RENTALS = defineOptions({
  hot_water_tank: "Hot Water Tank (Rental)", furnace: "Furnace (Rental)", air_conditioner: "Air Conditioner (Rental)",
  propane_tank: "Propane Tank (Rental)", water_softener: "Water Softener / Treatment (Rental)",
  security_system: "Security System (Rental)", solar_other: "Solar / Other Leased Equipment",
  other: "Other (specify below)",
});
const R_RURAL_ITEMS = defineOptions({
  tractors: "Tractor(s)", trailers: "Trailers", atv_utv: "ATV / UTV / Side-by-side",
  lawn_garden: "Lawn / Garden Equipment", generators: "Generator(s)", barn_equipment: "Barn Equipment",
  fencing_equipment: "Fencing / Electric Fencing Equipment", water_pumps: "Water Pump(s)",
  livestock_equipment: "Livestock Equipment", feeders_waterers: "Feeders / Waterers", hay_equipment: "Hay Equipment",
  firewood_stoves: "Firewood / Wood Stoves", other_movable: "Other Movable Items (specify below)",
});

const rSelect = (options, placeholder = "Select") => ({...singleSelect(options), ui: {control: "select", placeholder}});
const rRadio = (options) => ({...singleSelect(options), ui: {control: "radio", inline: true}});
const rMulti = (options) => ({...multiSelect(options), ui: {control: "multiselect", placeholder: "Select features"}});
const HAS_BASEMENT = {field: "basementType", notIn: ["slab_none"]};
const HAS_APARTMENT = {field: "basementApartment", in: ["yes"]};
const TICKED = (field, value) => ({field, includes: value});
const OUTBUILDING_SIZED = ["barn", "workshop", "drive_shed", "storage_shed", "greenhouse", "bunkie_guest"];
const distance = (icon) => optional({path: "ruralLocation", ...rSelect(R_DISTANCE, "Select distance"), ui: {
  control: "select", placeholder: "Select distance", icon,
}});

const ruralFields = {
  // PAGE R-01 — Exterior & Property Basics
  ruralPropertyType: {path: "ruralBasics", ...rSelect(R_PROPERTY_TYPE, "Select property type")},
  ...withUnit("ruralBasics", "acreage", "acreageUnit", z.number().positive().max(1_000_000), R_ACREAGE_UNIT,
      {placeholder: "Example: 10.25"}),
  lotShape: optional({path: "ruralBasics", ...rSelect(R_LOT_SHAPE, "Select shape")}),
  ...(() => {
    const f = withUnit("ruralBasics", "frontage", "frontageUnit", z.number().positive().max(1_000_000), R_LENGTH_UNIT,
        {placeholder: "Example: 300"});
    return {frontage: optional(f.frontage), frontageUnit: f.frontageUnit};
  })(),
  ...(() => {
    const f = withUnit("ruralBasics", "depth", "depthUnit", z.number().positive().max(1_000_000), R_LENGTH_UNIT,
        {placeholder: "Example: 1,500"});
    return {depth: optional(f.depth), depthUnit: f.depthUnit};
  })(),
  propertyUse: optional({path: "ruralBasics", ...rSelect(R_PROPERTY_USE, "Select use")}),
  yearBuilt: optional({path: "ruralBasics", ...rSelect(R_YEAR_BUILT, "Select year built")}),
  storeys: optional({path: "ruralBasics", ...rSelect(R_STOREYS, "Select storeys")}),
  ...(() => {
    const f = withUnit("ruralBasics", "aboveGradeArea", "aboveGradeAreaUnit", z.number().positive().max(1_000_000),
        R_AREA_UNIT, {placeholder: "Example: 2,500"});
    return {aboveGradeArea: optional(f.aboveGradeArea), aboveGradeAreaUnit: f.aboveGradeAreaUnit};
  })(),
  municipalAddress: optional({path: "ruralBasics", ...rRadio(R_MUNICIPAL_ADDRESS)}),
  roadAccessType: {path: "ruralBasics", ...rSelect(R_ROAD_ACCESS, "Select access type")},
  yearRoundAccess: optional({path: "ruralBasics", ...rSelect(R_YEAR_ROUND, "Select access")}),
  nearestTown: {path: "ruralBasics", schema: draftText(100), ui: {placeholder: "Enter nearest town"}},
  ...(() => {
    const f = withUnit("ruralBasics", "distanceToTown", "distanceToTownUnit", z.number().min(0).max(10_000),
        R_DISTANCE_UNIT, {placeholder: "Example: 15"});
    return {distanceToTown: optional(f.distanceToTown), distanceToTownUnit: f.distanceToTownUnit};
  })(),
  exteriorConstruction: {path: "ruralBasics", ...rSelect(R_EXT_CONSTRUCTION, "Select exterior")},
  exteriorFinish: optional({path: "ruralBasics", ...rSelect(R_EXT_FINISH, "Select finish")}),
  roofType: optional({path: "ruralBasics", ...rSelect(R_ROOF_TYPE, "Select roof type")}),
  roofMaterial: optional({path: "ruralBasics", ...rSelect(R_ROOF_MATERIAL, "Select material")}),

  // PAGE R-02 — Interior Details
  bedrooms: {path: "ruralInterior", ...rSelect(R_ROOM_COUNT)},
  bathrooms: {path: "ruralInterior", ...rSelect(R_BATHROOMS)},
  kitchens: optional({path: "ruralInterior", ...rSelect(R_ROOM_COUNT)}),
  diningRooms: optional({path: "ruralInterior", ...rSelect(R_ROOM_COUNT)}),
  livingRooms: optional({path: "ruralInterior", ...rSelect(R_ROOM_COUNT)}),
  familyRooms: optional({path: "ruralInterior", ...rSelect(R_ROOM_COUNT)}),
  otherRooms: optional({path: "ruralInterior", schema: draftText(200), ui: {placeholder: "List other rooms", wide: true}}),
  heatingType: {path: "ruralInterior", ...rSelect(R_HEATING, "Select heating type")},
  coolingType: optional({path: "ruralInterior", ...rSelect(R_COOLING, "Select cooling type")}),
  fireplaceWoodStove: optional({path: "ruralInterior", ...rSelect(R_FIREPLACE, "Select option")}),
  waterSource: {path: "ruralInterior", ...rSelect(R_WATER_SOURCE, "Select water source")},
  sewerSeptic: {path: "ruralInterior", ...rSelect(R_SEWER, "Select system")},
  electricalService: optional({path: "ruralInterior", ...rSelect(SD_ELECTRICAL, "Select service")}),
  laundryLocation: {path: "ruralInterior", ...rSelect(R_LAUNDRY, "Select location")},
  laundryTubSink: optional({path: "ruralInterior", ...rRadio(R_YES_NO)}),
  otherLaundryFeatures: optional({
    path: "ruralInterior",
    schema: draftText(200),
    ui: {placeholder: "e.g., Built-in cabinets"},
  }),
  flooring: optional({path: "ruralInterior", ...rMulti(R_FLOORING), ui: {control: "multiselect", placeholder: "Select flooring"}}),
  interiorFeatures: optional({path: "ruralInterior", ...rMulti(R_INTERIOR_FEATURES)}),
  accessibilityFeatures: optional({path: "ruralInterior", ...rMulti(R_ACCESSIBILITY)}),
  securityFeatures: optional({path: "ruralInterior", ...rMulti(R_SECURITY)}),
  additionalNotes: optional({
    path: "ruralInterior",
    schema: draftText(500),
    ui: {multiline: true, wide: true, placeholder: "Add any details about the interior that buyers should know"},
  }),

  // PAGE R-03 — Basement / Additional Living Spaces
  basementType: {path: "ruralBasement", ...rSelect(R_BASEMENT_TYPE, "Select type")},
  basementFinish: optional({
    path: "ruralBasement",
    ...rSelect(D_BASEMENT_FINISH, "Select finish"),
    requiredWhen: HAS_BASEMENT,
  }),
  walkOutWalkUp: optional({path: "ruralBasement", ...rSelect(R_WALKOUT, "Select option"), requiredWhen: HAS_BASEMENT}),
  separateEntrance: optional({path: "ruralBasement", ...rRadio(R_YES_NO), requiredWhen: HAS_BASEMENT}),
  basementRooms: optional({
    path: "ruralBasement",
    schema: draftText(200),
    requiredWhen: HAS_BASEMENT,
    ui: {placeholder: "e.g., Recreation Room, Bedroom, Bathroom, Office", wide: true},
  }),
  basementApartment: optional({path: "ruralBasement", ...rRadio(R_YES_NO_NOT_SURE), requiredWhen: HAS_BASEMENT}),
  apartmentLegalStatus: optional({path: "ruralBasement", ...rRadio(R_SUITE_STATUS), requiredWhen: HAS_APARTMENT}),
  apartmentTenancyStatus: optional({
    path: "ruralBasement",
    ...rSelect(R_TENANCY, "Select status"),
    requiredWhen: HAS_APARTMENT,
  }),
  apartmentVacantPossession: optional({path: "ruralBasement", ...rRadio(R_VACANT_POSSESSION), requiredWhen: HAS_APARTMENT}),
  additionalLivingSpaces: optional({
    path: "ruralBasement",
    ...multiSelect(R_ADDITIONAL_SPACES, {control: "cards"}),
    ui: {
      control: "cards",
      wide: true,
      optionStyle: "row",
      optionColumns: 5,
      optionIcons: {
        in_law_suite: "users", garden_suite: "house", bunkie: "tent", loft_upper: "trending-up", other: "ellipsis",
      },
    },
  }),
  additionalSpacesDescription: {
    path: "ruralBasement",
    schema: draftText(200),
    requiredWhen: TICKED("additionalLivingSpaces", "other"),
    ui: {placeholder: "e.g., Above detached garage, Converted barn, Pool house", wide: true},
  },
  otherStructures: optional({path: "ruralBasement", ...rRadio(R_YES_NO_NOT_SURE)}),
  otherStructuresDescription: optional({
    path: "ruralBasement",
    schema: draftText(200),
    requiredWhen: {field: "otherStructures", in: ["yes"]},
    ui: {placeholder: "e.g., Guest house, Barn with living quarters"},
  }),

  // PAGE R-04 — Outbuildings & Land Features
  outbuildings: optional({
    path: "ruralOutbuildings",
    ...multiSelect(R_OUTBUILDINGS),
    ui: {
      control: "detailCards",
      inlineDetails: "outbuildingDetails",
      optionIcons: {
        garage: "warehouse", barn: "house", workshop: "hammer", drive_shed: "tent", storage_shed: "package",
        greenhouse: "flower-2", bunkie_guest: "bed-double", other: "ellipsis",
      },
      optionDescriptions: {
        garage: "Attached or Detached", barn: "Include animal barn", workshop: "Heated or unheated",
        drive_shed: "Open sided structure", storage_shed: "Garden or storage", greenhouse: "Include size if known",
        bunkie_guest: "Seasonal or year-round", other: "Describe other buildings",
      },
    },
  }),
  outbuildingDetails: {
    ...keyedDetailsField("ruralOutbuildings", "outbuildings", R_OUTBUILDINGS, {
      garageType: {
        label: "Garage Type",
        ...optional(rSelect(R_GARAGE_TYPE, "Select type")),
        requiredWhen: {itemKey: {in: ["garage"]}},
      },
      size: {
        label: "Size (Approx.)",
        schema: draftText(50).optional(),
        requiredWhen: {itemKey: {in: OUTBUILDING_SIZED}},
        ui: {
          labelByKey: {
            barn: "Barn Size (Approx.)", workshop: "Workshop Size (Approx.)", drive_shed: "Drive Shed Size (Approx.)",
            storage_shed: "Shed Size (Approx.)",
          },
          placeholderByKey: {
            barn: "e.g., 30x40 ft", workshop: "e.g., 20x30 ft", drive_shed: "e.g., 24x36 ft",
            storage_shed: "e.g., 10x12 ft", greenhouse: "e.g., 8x12 ft", bunkie_guest: "e.g., 12x16 ft",
          },
        },
      },
      description: {
        label: "Please Describe",
        schema: draftText(100),
        requiredWhen: {itemKey: {in: ["other"]}},
        ui: {placeholder: "e.g., Cabin, Studio"},
      },
    }),
    ui: {entriesFor: "outbuildings", renderedBy: "outbuildings"},
  },
  landFeatures: optional({
    path: "ruralOutbuildings",
    ...multiSelect(R_LAND_FEATURES),
    ui: {
      control: "detailCards",
      optionDescriptions: {
        paddocks: "Fenced paddocks", fencing: "Perimeter or cross fencing", pasture: "Grazing land",
        cultivated_land: "Farm or crop land", wooded_area: "Treed / forested", pond: "Pond or small lake",
        creek_stream: "Water feature", trails_paths: "Walking or ATV trails", gardens_orchards: "Vegetable, fruit, etc.",
        pool_hot_tub: "In-ground or above",
      },
    },
  }),
  drivewayType: {path: "ruralOutbuildings", ...rSelect(R_DRIVEWAY_TYPE, "Select driveway type")},
  drivewaySurface: {path: "ruralOutbuildings", ...rSelect(R_DRIVEWAY_SURFACE, "Select surface")},
  parkingCapacity: {path: "ruralOutbuildings", schema: draftText(30), ui: {placeholder: "e.g., 6+ vehicles"}},
  utilitiesAtProperty: optional({
    path: "ruralOutbuildings",
    ...multiSelect(R_UTILITIES),
    ui: {control: "checkboxes", wide: true, optionColumns: 6},
  }),

  // PAGE R-05 — Location & Nearby Features (Final Listing Information)
  schoolsDistance: distance("graduation-cap"),
  shoppingDistance: distance("shopping-cart"),
  healthcareDistance: distance("hospital"),
  recreationCentreDistance: distance("dumbbell"),
  parksDistance: distance("trees"),
  highwaysDistance: distance("route"),
  publicTransitDistance: distance("bus"),
  trailsDistance: distance("footprints"),
  golfDistance: distance("flag"),
  waterfrontDistance: distance("waves"),
  airportDistance: distance("plane"),
  otherNearbyAmenities: optional({
    path: "ruralLocation",
    schema: draftText(200),
    ui: {placeholder: "Please describe", icon: "ellipsis"},
  }),
  schoolBusAccess: optional({path: "ruralLocation", ...rRadio(R_YES_NO_NOT_SURE), ui: {control: "radio", inline: true, icon: "bus"}}),
  garbageCollection: optional({
    path: "ruralLocation",
    ...rRadio(R_YES_NO_NOT_SURE),
    ui: {control: "radio", inline: true, icon: "trash-2"},
  }),
  mailDelivery: optional({path: "ruralLocation", ...rRadio(R_MAIL), ui: {control: "radio", inline: true, icon: "mail"}}),
  internetService: optional({
    path: "ruralLocation",
    ...rRadio(R_INTERNET),
    ui: {control: "radio", inline: true, icon: "wifi"},
  }),
  internetProvider: optional({
    path: "ruralLocation",
    schema: draftText(100),
    ui: {placeholder: "e.g., Starlink, Bell, Xplornet", attachTo: "internetService"},
  }),
  cellularService: optional({path: "ruralLocation", ...singleSelect(R_CELLULAR), ui: {control: "radio", icon: "signal"}}),
  emergencyServices: optional({
    path: "ruralLocation",
    ...singleSelect(R_EMERGENCY),
    ui: {control: "radio", icon: "shield-plus"},
  }),

  // PAGE R-06 — Listing Description & Included Items (Final Listing Information)
  clientRemarks: optional({
    path: "ruralListing",
    schema: draftText(1500),
    ui: {
      multiline: true,
      placeholder: "Describe your property, including acreage, privacy, views, outbuildings, trails, ponds, gardens, " +
        "access, and nearby community features...",
      helpText: "Tip: Focus on lifestyle, location, and standout features.",
    },
  }),
  includedChattels: optional({
    path: "ruralListing",
    ...multiSelect(R_CHATTELS),
    ui: {control: "checkboxes", optionColumns: 1},
  }),
  otherIncludedItems: {
    path: "ruralListing",
    schema: draftText(200),
    requiredWhen: TICKED("includedChattels", "other"),
    ui: {placeholder: "Please specify other included items"},
  },
  fixturesExcluded: optional({
    path: "ruralListing",
    schema: draftText(500),
    ui: {
      multiline: true,
      placeholder: "e.g., Light fixtures in the barn, built-in shelving in workshop, ceiling fans, fireplace inserts, etc.",
    },
  }),
  rentedLeasedItems: optional({
    path: "ruralListing",
    ...multiSelect(R_RENTALS),
    ui: {control: "checkboxes", optionColumns: 1},
  }),
  rentalDetails: optional({path: "ruralListing", schema: draftText(200), ui: {placeholder: "Rental company / details (if known)"}}),
  ruralItems: optional({
    path: "ruralListing",
    ...multiSelect(R_RURAL_ITEMS),
    ui: {control: "checkboxes", optionColumns: 4},
  }),
  otherRuralItems: {
    path: "ruralListing",
    schema: draftText(200),
    requiredWhen: TICKED("ruralItems", "other_movable"),
    ui: {placeholder: "Please specify other items"},
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────
 * CONDO APARTMENT (final mockups, 2026-09). Required: the "*" fields plus the
 * Yes/No questions that open them; everything else is `optional()`.
 * ─────────────────────────────────────────────────────────────────────
 */
const numberOptions = (from, to) => Array.from({length: to - from + 1}, (_, i) => [String(from + i), String(from + i)]);

const C_STYLE = defineOptions({apartment: "Apartment", loft: "Loft"});
const C_STOREYS = defineOptions(numberOptions(1, 100));
const C_UNIT_LEVEL = defineOptions([["ground", "Ground"], ...numberOptions(1, 100), ["penthouse", "Penthouse"]]);
const C_SQFT_SOURCE = defineOptions({
  builder_floor_plan: "Builder floor plan", condo_documents: "Condominium documents", mpac: "MPAC",
  appraisal: "Appraisal", measured_by_seller: "Measured by seller", other: "Other",
});
const C_EXPOSURE = defineOptions({
  north: "North", south: "South", east: "East", west: "West", multiple: "Multiple exposures",
});
const C_OUTDOOR_SPACE = defineOptions({balcony: "Balcony", terrace: "Terrace", patio: "Patio", none: "None"});
const C_PARKING_TYPE = defineOptions({
  underground: "Underground", surface_outdoor: "Surface/outdoor", covered_structure: "Covered structure",
  other: "Other",
});
const C_INTEREST = defineOptions({owned: "Owned", exclusive_use: "Exclusive use", rented_leased: "Rented/leased"});
const C_LOCKER_LOCATION = defineOptions({
  inside_unit: "Inside unit", unit_floor: "Unit floor", locker_floor: "Locker floor", parking_level: "Parking level",
  other: "Other",
});
const C_FEE_INCLUDES = defineOptions({
  common_elements: "Common elements", building_insurance: "Building insurance", water: "Water", heat: "Heat",
  hydro: "Hydro", central_air: "Central air", parking: "Parking", locker: "Locker", cable_tv: "Cable TV",
  internet: "Internet",
});
const C_ASSESSMENT_FREQUENCY = defineOptions({
  one_time: "One-time", monthly: "Monthly", quarterly: "Quarterly", annually: "Annually",
});
const C_STATUS_CERTIFICATE = defineOptions({yes: "Yes", no: "No", ordered: "Ordered"});
const C_BEDROOMS = defineOptions([["0", "Studio"], ...numberOptions(1, 4), ["5_plus", "5+"]]);
const C_DENS = defineOptions(numberOptions(0, 3));
const C_FULL_BATHS = defineOptions([...numberOptions(1, 4), ["5_plus", "5+"]]);
const C_POWDER_ROOMS = defineOptions(numberOptions(0, 3));
// "Ensuite laundry" is asked once, by the Laundry cards below.
const C_PRINCIPAL_ROOMS = defineOptions({
  kitchen: "Kitchen", living_room: "Living room", dining_room: "Dining room",
  combined_living_dining: "Combined living/dining", family_room: "Family room", den_office: "Den/office",
  foyer: "Foyer",
});
const C_INTERIOR_FEATURES = defineOptions({
  open_concept: "Open-concept layout", kitchen_island: "Kitchen island", breakfast_bar: "Breakfast bar",
  walk_in_closet: "Walk-in closet", ensuite_bathroom: "Ensuite bathroom", fireplace: "Fireplace",
  built_in_storage: "Built-in storage", floor_to_ceiling_windows: "Floor-to-ceiling windows",
  accessible_features: "Accessible features",
});
const C_LAUNDRY = defineOptions({ensuite: "Ensuite", shared_building: "Shared building laundry", none: "None"});
const C_HEATING = defineOptions({
  forced_air: "Forced air", heat_pump: "Heat pump", fan_coil: "Fan coil", baseboard: "Baseboard",
  radiant: "Radiant", other: "Other",
});
const C_COOLING = defineOptions({
  central_air: "Central air", heat_pump: "Heat pump", fan_coil: "Fan coil", wall_window: "Wall/window unit",
  none: "None",
});
const C_FLOORING = defineOptions({
  hardwood: "Hardwood", engineered_wood: "Engineered wood", laminate: "Laminate", tile: "Tile", carpet: "Carpet",
  vinyl: "Vinyl", other: "Other",
});
const C_APPLIANCES = defineOptions({
  refrigerator: "Refrigerator", stove: "Stove", dishwasher: "Dishwasher", microwave: "Microwave", washer: "Washer",
  dryer: "Dryer",
});
const C_CONCIERGE = defineOptions({concierge: "Concierge", twenty_four_hour: "24-hour concierge"});
const C_ENTRY_SERVICES = defineOptions({
  security_guard: "Security guard", security_system: "Security system", controlled_entry: "Controlled entry",
  parcel_lockers: "Parcel lockers", on_site_management: "On-site management",
});
const C_FITNESS = defineOptions({
  fitness_centre: "Fitness centre", indoor_pool: "Indoor pool", outdoor_pool: "Outdoor pool", sauna: "Sauna",
  steam_room: "Steam room", hot_tub: "Hot tub", yoga_studio: "Yoga studio", games_room: "Games room",
  media_room: "Media room", squash_court: "Squash court", tennis_court: "Tennis court",
});
const C_SOCIAL = defineOptions({
  party_room: "Party room", meeting_room: "Meeting room", guest_suites: "Guest suites",
  rooftop_terrace: "Rooftop terrace", shared_patio_terrace: "Shared patio/terrace", barbecue_area: "Barbecue area",
  community_garden: "Community garden", library: "Library",
});
const C_PRACTICAL = defineOptions({
  visitor_parking: "Visitor parking", bicycle_storage: "Bicycle storage", car_wash: "Car wash",
  ev_charging_stations: "EV charging stations", pet_wash: "Pet wash", elevator: "Elevator",
  service_elevator: "Service elevator", accessible_entrance: "Accessible entrance",
});
const C_YES_NO_RESTRICTED = defineOptions({yes: "Yes", no: "No", restricted: "Restricted"});
const C_PETS = defineOptions({dogs: "Dogs", cats: "Cats", other: "Other"});
const C_MAX_PETS = defineOptions(numberOptions(1, 5));
const C_BBQ = defineOptions({yes: "Yes", no: "No", restricted: "Restricted", not_applicable: "Not applicable"});
const C_SMOKING = defineOptions({
  prohibited_throughout: "Prohibited throughout property", prohibited_common_areas: "Prohibited in common areas",
  restricted: "Restricted", no_additional_restriction: "No additional restriction",
});
const C_RENTAL_RULE = defineOptions({permitted: "Permitted", not_permitted: "Not permitted", restricted: "Restricted"});
const C_RULE_SOURCES = defineOptions({
  rules_bylaws: "Condominium rules/by-laws", status_certificate: "Status certificate",
  property_management: "Property management", other_document: "Other document",
});
const C_OCCUPANCY = defineOptions({
  tenanted: "Tenanted", vacant_possession: "Vacant possession on closing",
  other_know_what_i_need: "Other / I know what I need",
});
const C_TENANCY_SITUATION = defineOptions({
  fixed_term: "Fixed term", month_to_month: "Month-to-month", vacant_possession: "Vacant possession on closing",
});
const C_AREA_SETTING = defineOptions({
  downtown: "Downtown", urban_neighbourhood: "Urban neighbourhood", suburban_centre: "Suburban centre",
  waterfront: "Waterfront", other: "Other",
});
const C_TRANSIT = defineOptions({
  subway: "Subway", streetcar: "Streetcar", bus_service: "Bus service", go_transit: "GO Transit",
  major_highway: "Major highway", bicycle_routes: "Bicycle routes", car_share: "Car-share access",
});
const C_SERVICES = defineOptions({
  grocery_stores: "Grocery stores", shopping: "Shopping", restaurants_cafes: "Restaurants & cafés",
  schools: "Schools", child_care: "Child care", hospital_medical: "Hospital or medical services", banks: "Banks",
  pharmacy: "Pharmacy",
});
const C_DESTINATIONS = defineOptions({
  parks: "Parks", walking_trails: "Walking trails", waterfront_access: "Waterfront access",
  community_centre: "Community centre", fitness_recreation: "Fitness or recreation facilities",
  entertainment_district: "Entertainment district", university_college: "University or college",
  places_of_worship: "Places of worship",
});
// Page 4's appliance values reappear here so they can be carried forward.
const C_INCLUDED_ITEMS = defineOptions({
  ...C_APPLIANCES.labels,
  window_coverings: "Window coverings", light_fixtures: "Existing light fixtures",
  built_in_shelving: "Built-in shelving", tv_wall_mounts: "Television wall mounts", other: "Other",
});
const C_RENTED_ITEM = defineOptions({
  water_heater: "Water heater", water_softener: "Water softener", water_filtration: "Water filtration system",
  hvac_equipment: "HVAC equipment", security_system: "Security system", other: "Other",
});
const C_PAYMENT_FREQUENCY = defineOptions({
  monthly: "Monthly", quarterly: "Quarterly", annually: "Annually", one_time: "One-time",
});

const cInline = (options) => ({...singleSelect(options), ui: {control: "radio", inline: true}});
const cChecks = (options, ui = {}) => ({...multiSelect(options), ui: {control: "checkboxes", inline: true, ...ui}});
const cText = (max, placeholder, ui = {}) => ({schema: draftText(max), ui: {placeholder, ...ui}});
const cDetails = (placeholder, ui = {}) => cText(500, placeholder, ui);
const cMoney = () => ({schema: z.number().min(0).max(10_000_000), ui: {prefix: "$", placeholder: "0.00"}});
const IS_TRUE = (field) => ({field, in: [true]});
const PICKED = (field, value) => ({field, in: [value]});
const TENANTED = PICKED("currentOccupancy", "tenanted");
const LOCKER_NOT_IN_UNIT = {field: "lockerLocation", ne: "inside_unit"};
// ISO "YYYY-MM"; the FE draws it as a month picker (MM / YYYY).
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {message: "Use the format YYYY-MM"});
const phoneSchema = z.string().trim().max(30)
    .regex(/^\+?[\d\s().-]{7,}(\s*(x|ext\.?)\s*\d+)?$/i, {message: "Enter a valid telephone number"});

const condoApartmentFields = {
  // PAGE CA-01 — Tell us about your condominium (Building & Unit Basics)
  condoStyle: optional({
    path: "condoUnit",
    ...singleSelect(C_STYLE, "cards"),
    ui: {control: "cards", wide: true, optionIcons: {apartment: "building", loft: "warehouse"}},
  }),
  buildingStoreys: optional({path: "condoUnit", ...rSelect(C_STOREYS)}),
  unitLevel: optional({path: "condoUnit", ...rSelect(C_UNIT_LEVEL)}),
  squareFootage: {
    path: "condoUnit",
    schema: z.number().int().positive().max(50_000),
    ui: {
      placeholder: "Enter square feet",
      helpText: "Required for the listing. Do not include balconies, terraces, parking or lockers.",
    },
  },
  squareFootageSource: {path: "condoUnit", ...rSelect(C_SQFT_SOURCE, "Select source")},
  unitExposure: optional({path: "condoUnit", ...singleSelect(C_EXPOSURE, "segmented")}),
  privateOutdoorSpace: optional({
    path: "condoUnit",
    ...multiSelect(C_OUTDOOR_SPACE, {exclusive: "none"}),
    ui: {control: "cards", optionStyle: "row", optionColumns: 4},
  }),

  // PAGE CA-02 — Parking & Locker Details. The "Number of…" dropdown and the
  // "Add another…" button both edit the same list of cards.
  parkingIncluded: {path: "condoParkingLocker", ...yesNo()},
  parkingSpaces: listField("condoParkingLocker", {
    parkingType: {label: "Parking type", ...cInline(C_PARKING_TYPE)},
    parkingTypeOther: {
      label: "Describe parking type",
      ...cText(100, "e.g., Tandem space"),
      requiredWhen: PICKED("parkingType", "other"),
    },
    parkingInterest: {label: "Parking interest", ...cInline(C_INTEREST)},
    parkingLevel: {label: "Parking level", ...cText(30, "e.g., P2")},
    spaceNumber: {label: "Space number", ...cText(30, "e.g., 118")},
    evCharger: {label: "EV charger", schema: z.boolean().optional(), ui: {control: "radio"}},
  }, {
    max: 4,
    requiredWhen: IS_TRUE("parkingIncluded"),
    ui: {
      itemTitle: "Parking Space {n}", addLabel: "Add another parking space", initialItems: 1,
      countLabel: "Number of parking spaces", itemLayout: "grid",
    },
  }),
  lockerIncluded: {path: "condoParkingLocker", ...yesNo()},
  lockers: listField("condoParkingLocker", {
    lockerLocation: {label: "Locker location", ...cInline(C_LOCKER_LOCATION)},
    lockerLocationOther: {
      label: "Describe locker location",
      ...cText(100, "e.g., Storage room behind the lobby"),
      requiredWhen: PICKED("lockerLocation", "other"),
    },
    lockerInterest: {label: "Locker interest", ...cInline(C_INTEREST)},
    levelFloor: {label: "Level/floor", ...cText(30, "e.g., P2"), requiredWhen: LOCKER_NOT_IN_UNIT},
    roomArea: {
      label: "Room/area",
      schema: draftText(60).optional(),
      requiredWhen: LOCKER_NOT_IN_UNIT,
      ui: {placeholder: "e.g., Room B"},
    },
    lockerNumber: {label: "Locker number", ...cText(30, "e.g., 74"), requiredWhen: LOCKER_NOT_IN_UNIT},
  }, {
    max: 3,
    requiredWhen: IS_TRUE("lockerIncluded"),
    ui: {
      itemTitle: "Locker {n}", addLabel: "Add another locker", initialItems: 1, countLabel: "Number of lockers",
      itemLayout: "grid",
    },
  }),

  // PAGE CA-03 — Condominium Corporation & Fees
  condoCorporation: {path: "condoCorporation", ...cText(50, "e.g., TSCC 1234")},
  managementCompany: optional({path: "condoCorporation", ...cText(150, "Enter company name")}),
  managerContact: optional({path: "condoCorporation", ...cText(150, "Enter name")}),
  managementTelephone: optional({
    path: "condoCorporation",
    schema: phoneSchema,
    ui: {placeholder: "Enter telephone number"},
  }),
  monthlyFee: {path: "condoCorporation", ...cMoney()},
  feeInclusions: optional({
    path: "condoCorporation",
    ...cChecks(C_FEE_INCLUDES, {
      optionStyle: "row",
      optionColumns: 3,
      helpText: "Select only items included in the regular monthly fee.",
    }),
  }),
  hasSpecialAssessment: {path: "condoCorporation", ...yesNo()},
  assessmentAmount: {path: "condoCorporation", ...cMoney(), requiredWhen: IS_TRUE("hasSpecialAssessment")},
  assessmentFrequency: {
    path: "condoCorporation",
    ...rSelect(C_ASSESSMENT_FREQUENCY),
    requiredWhen: IS_TRUE("hasSpecialAssessment"),
  },
  assessmentEndDate: optional({
    path: "condoCorporation",
    schema: monthSchema,
    requiredWhen: IS_TRUE("hasSpecialAssessment"),
    ui: {control: "month", placeholder: "MM / YYYY"},
  }),
  assessmentPurpose: {
    path: "condoCorporation",
    ...cText(200, "Briefly describe the work or expense", {wide: true}),
    requiredWhen: IS_TRUE("hasSpecialAssessment"),
  },
  assessmentPaidInFull: optional({
    path: "condoCorporation",
    ...yesNo(),
    requiredWhen: IS_TRUE("hasSpecialAssessment"),
  }),
  statusCertificate: optional({
    path: "condoCorporation",
    ...cInline(C_STATUS_CERTIFICATE),
    ui: {control: "radio", inline: true, helpText: "You may upload it later from your Seller Dashboard."},
  }),

  // PAGE CA-04 — Interior Rooms & Features
  bedrooms: {path: "condoInterior", ...rSelect(C_BEDROOMS)},
  dens: optional({path: "condoInterior", ...rSelect(C_DENS)}),
  fullBathrooms: {path: "condoInterior", ...rSelect(C_FULL_BATHS)},
  powderRooms: optional({path: "condoInterior", ...rSelect(C_POWDER_ROOMS)}),
  principalRooms: optional({
    path: "condoInterior",
    ...cChecks(C_PRINCIPAL_ROOMS, {optionStyle: "row", optionColumns: 4}),
  }),
  otherInteriorRoom: optional({path: "condoInterior", ...cText(60, "Add another room")}),
  interiorFeatures: optional({
    path: "condoInterior",
    ...cChecks(C_INTERIOR_FEATURES, {optionStyle: "row", optionColumns: 4}),
  }),
  laundry: optional({
    path: "condoInterior",
    ...singleSelect(C_LAUNDRY, "cards"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 1,
      optionIcons: {ensuite: "washing-machine", shared_building: "building-2", none: "ban"},
    },
  }),
  heating: optional({path: "condoInterior", ...rSelect(C_HEATING)}),
  cooling: optional({path: "condoInterior", ...rSelect(C_COOLING)}),
  primaryFlooring: optional({
    path: "condoInterior",
    ...cChecks(C_FLOORING, {wide: true, optionStyle: "row", optionColumns: 4}),
  }),
  appliances: optional({
    path: "condoInterior",
    ...cChecks(C_APPLIANCES, {wide: true, optionStyle: "row", optionColumns: 4}),
  }),

  // PAGE CA-05 — Building Amenities & Services
  concierge: optional({
    path: "condoAmenities",
    ...singleSelect(C_CONCIERGE),
    ui: {control: "radio", inline: true, clearable: true, separator: "or", hideLabel: true},
  }),
  entryServices: optional({
    path: "condoAmenities",
    ...cChecks(C_ENTRY_SERVICES, {hideLabel: true, optionStyle: "row", optionColumns: 2}),
  }),
  fitnessAmenities: optional({path: "condoAmenities", ...cChecks(C_FITNESS, {optionStyle: "row", optionColumns: 4})}),
  socialAmenities: optional({path: "condoAmenities", ...cChecks(C_SOCIAL, {optionStyle: "row", optionColumns: 4})}),
  practicalAmenities: optional({
    path: "condoAmenities",
    ...cChecks(C_PRACTICAL, {optionStyle: "row", optionColumns: 4}),
  }),
  hasOtherAmenity: {
    path: "condoAmenities",
    ...yesNo("radio", {helpText: "Selecting Yes opens a field to add up to five additional amenities."}),
  },
  otherAmenities: listField("condoAmenities", {
    amenity: {label: "Amenity", ...cText(60, "e.g., Golf simulator")},
  }, {
    max: 5,
    requiredWhen: IS_TRUE("hasOtherAmenity"),
    ui: {compactItems: true, initialItems: 1, addLabel: "Add another amenity"},
  }),

  // PAGE CA-06 — Condominium Rules & Restrictions
  petsPermitted: {path: "condoRules", ...cInline(C_YES_NO_RESTRICTED), ui: {control: "radio", inline: true, wide: true}},
  permittedPets: optional({
    path: "condoRules",
    ...cChecks(C_PETS),
    requiredWhen: PICKED("petsPermitted", "restricted"),
  }),
  maxPets: optional({
    path: "condoRules",
    ...rSelect(C_MAX_PETS),
    requiredWhen: PICKED("petsPermitted", "restricted"),
  }),
  maxPetWeight: optional({
    path: "condoRules",
    schema: z.number().positive().max(500),
    requiredWhen: PICKED("petsPermitted", "restricted"),
    ui: {placeholder: "Enter pounds", suffix: "lbs"},
  }),
  petRestrictionDetails: {
    path: "condoRules",
    ...cDetails("Describe the applicable restrictions", {wide: true}),
    requiredWhen: PICKED("petsPermitted", "restricted"),
  },
  bbqPermitted: {path: "condoRules", ...cInline(C_BBQ)},
  bbqRestrictionDetails: {
    path: "condoRules",
    ...cDetails("e.g., electric barbecues only", {wide: true}),
    requiredWhen: PICKED("bbqPermitted", "restricted"),
  },
  hasOtherBalconyRestrictions: {path: "condoRules", ...yesNo()},
  balconyRestrictionDetails: {
    path: "condoRules",
    ...cDetails("Describe the applicable restriction", {wide: true}),
    requiredWhen: IS_TRUE("hasOtherBalconyRestrictions"),
  },
  smokingVapingRules: {path: "condoRules", ...cInline(C_SMOKING)},
  smokingVapingDetails: {
    path: "condoRules",
    ...cDetails("Describe the applicable restriction", {wide: true}),
    requiredWhen: PICKED("smokingVapingRules", "restricted"),
  },
  longTermLeasing: {path: "condoRules", ...cInline(C_RENTAL_RULE)},
  longTermLeasingDetails: {
    path: "condoRules",
    ...cDetails("Describe the applicable restriction"),
    requiredWhen: PICKED("longTermLeasing", "restricted"),
  },
  shortTermRentals: {path: "condoRules", ...cInline(C_RENTAL_RULE)},
  shortTermRentalDetails: {
    path: "condoRules",
    ...cDetails("Describe the applicable restriction"),
    requiredWhen: PICKED("shortTermRentals", "restricted"),
  },
  rulesSources: optional({
    path: "condoRules",
    ...cChecks(C_RULE_SOURCES, {
      optionStyle: "row",
      optionColumns: 4,
      helpText: "Select every source you used. Supporting documents can be uploaded later from your Seller Dashboard.",
    }),
  }),
  hasOtherRestrictions: {
    path: "condoRules",
    ...yesNo("radio", {helpText: "Selecting Yes opens a required 500-character description field."}),
  },
  otherRestrictionsDetails: {
    path: "condoRules",
    ...cDetails("Describe the restriction", {multiline: true, wide: true}),
    requiredWhen: IS_TRUE("hasOtherRestrictions"),
  },

  // PAGE CA-07 — Occupancy & Tenancy. The first two answers start from the
  // occupancy step's (step 4) answers where they match.
  currentOccupancy: {
    path: "condoOccupancy",
    ...singleSelect(C_OCCUPANCY, "cards"),
    ui: {
      control: "cards",
      optionDescriptions: {
        tenanted: "A tenant currently occupies the unit.",
        vacant_possession: "The unit will be provided vacant on closing.",
        other_know_what_i_need: "Continue with the required listing information.",
      },
      prefillFrom: {listingState: "occupancy", map: {tenant: "tenanted", vacant: "vacant_possession"}},
    },
  },
  tenancySituation: optional({
    path: "condoOccupancy",
    ...singleSelect(C_TENANCY_SITUATION, "cards"),
    requiredWhen: TENANTED,
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 3,
      prefillFrom: {
        listingState: "tenancy.possession",
        map: {"fixed-term": "fixed_term", "month-to-month": "month_to_month", "vacant-possession": "vacant_possession"},
      },
    },
  }),
  writtenTenancyAgreement: optional({path: "condoOccupancy", ...yesNo("radio", {inline: true}), requiredWhen: TENANTED}),
  tenancyIncludesParking: optional({path: "condoOccupancy", ...yesNo("radio", {inline: true}), requiredWhen: TENANTED}),
  tenancyIncludesLocker: optional({path: "condoOccupancy", ...yesNo("radio", {inline: true}), requiredWhen: TENANTED}),
  tenantRemainsAfterClosing: optional({
    path: "condoOccupancy",
    ...yesNo("radio", {inline: true}),
    requiredWhen: {allOf: [TENANTED, {field: "tenancySituation", ne: "vacant_possession"}]},
  }),
  tenancyAgreementAvailable: optional({
    path: "condoOccupancy",
    ...yesNo("radio", {inline: true, helpText: "You may upload the agreement later from your Seller Dashboard."}),
    requiredWhen: TENANTED,
  }),
  hasOtherOccupancyAgreements: optional({
    path: "condoOccupancy",
    ...yesNo("radio", {inline: true, helpText: "Selecting Yes opens a required description."}),
    requiredWhen: TENANTED,
  }),
  otherOccupancyAgreementsDetails: {
    path: "condoOccupancy",
    ...cDetails("Describe the agreements or notices", {multiline: true, wide: true}),
    requiredWhen: IS_TRUE("hasOtherOccupancyAgreements"),
  },

  // PAGE CA-08 — Location & Nearby Features (Final Listing Information)
  areaSetting: optional({
    path: "condoLocation",
    ...singleSelect(C_AREA_SETTING, "cards"),
    ui: {
      control: "cards",
      optionStyle: "row",
      optionColumns: 5,
      helpText: "Selecting Other opens a required description.",
    },
  }),
  areaSettingOther: {
    path: "condoLocation",
    ...cText(100, "Describe the setting"),
    requiredWhen: PICKED("areaSetting", "other"),
  },
  transitAccess: optional({path: "condoLocation", ...cChecks(C_TRANSIT, {optionStyle: "row", optionColumns: 4})}),
  everydayServices: optional({path: "condoLocation", ...cChecks(C_SERVICES, {optionStyle: "row", optionColumns: 4})}),
  parksDestinations: optional({
    path: "condoLocation",
    ...cChecks(C_DESTINATIONS, {optionStyle: "row", optionColumns: 4}),
  }),
  hasOtherNearbyFeature: {
    path: "condoLocation",
    ...yesNo("radio", {helpText: "Selecting Yes opens up to three additional feature fields."}),
  },
  otherNearbyFeatures: listField("condoLocation", {
    feature: {label: "Nearby feature", ...cText(60, "e.g., Farmers' market")},
  }, {
    max: 3,
    requiredWhen: IS_TRUE("hasOtherNearbyFeature"),
    ui: {compactItems: true, initialItems: 1, addLabel: "Add another feature"},
  }),
  locationLikes: optional({
    path: "condoLocation",
    ...cDetails("Describe the location in your own words", {
      multiline: true,
      wide: true,
      helpText: "We may use your answer to help prepare the listing remarks. The brokerage will review the final " +
        "wording.",
    }),
  }),

  // PAGE CA-09 — Listing Description & Inclusions (Final Listing Information)
  clientRemarks: {
    path: "condoListing",
    ...cText(1500, "Share the unit's best features, improvements, views and lifestyle benefits.", {
      multiline: true,
      helpText: "The brokerage will review the final wording before it is used.",
    }),
  },
  includedItems: optional({
    path: "condoListing",
    ...cChecks(C_INCLUDED_ITEMS, {
      optionStyle: "row",
      optionColumns: 2,
      helpText: "Selecting Other opens a required item-description field. Add each item separately.",
      prefillFrom: {field: "appliances"},
    }),
  }),
  otherIncludedItems: listField("condoListing", {
    item: {label: "Item", ...cText(100, "Describe the item")},
  }, {
    max: 10,
    requiredWhen: TICKED("includedItems", "other"),
    ui: {compactItems: true, initialItems: 1, addLabel: "Add another item"},
  }),
  hasExcludedFixtures: {path: "condoListing", ...yesNo("radio", {inline: true})},
  excludedFixtures: {
    path: "condoListing",
    ...cDetails("List each excluded fixture clearly", {
      multiline: true,
      helpText: "Examples may include a specific light fixture, mirror or wall-mounted item that will be removed.",
    }),
    requiredWhen: IS_TRUE("hasExcludedFixtures"),
  },
  hasRentedItems: {path: "condoListing", ...yesNo("radio", {inline: true})},
  rentedItems: listField("condoListing", {
    item: {label: "Item", ...rSelect(C_RENTED_ITEM, "Select item")},
    otherItemDescription: {
      label: "Other item description",
      ...cText(100, "Describe the item"),
      requiredWhen: PICKED("item", "other"),
    },
    provider: {label: "Provider", schema: draftText(100).optional(), ui: {placeholder: "Enter company, if known"}},
    paymentAmount: {label: "Payment amount", schema: cMoney().schema.optional(), ui: cMoney().ui},
    paymentFrequency: {label: "Payment frequency", ...optional(rSelect(C_PAYMENT_FREQUENCY))},
    contractDetails: {
      label: "Contract or buyout details",
      schema: draftText(200).optional(),
      ui: {placeholder: "Enter details, if known"},
    },
  }, {
    max: 10,
    requiredWhen: IS_TRUE("hasRentedItems"),
    ui: {
      itemTitle: "Rented/Leased Item {n}", addLabel: "Add another rented or leased item", initialItems: 1,
      itemLayout: "grid",
    },
  }),
};

// The unit can't sit above the building's top storey (Ground and Penthouse
// aren't numbered, so they're never compared).
const condoApartmentSubmissionRules = [
  ({buildingStoreys, unitLevel}) => {
    const storeys = Number(buildingStoreys);
    const level = Number(unitLevel);
    if (!Number.isInteger(storeys) || !Number.isInteger(level) || level <= storeys) return [];
    return [{field: "unitLevel", message: `Unit level ${level} is above the building's ${storeys} storeys`}];
  },
];

/**
 * ─────────────────────────────────────────────────────────────────────
 * CONDO TOWNHOUSE (final mockups, 2026-09)
 *
 * Page 1 asks the configuration; every other page carries a section `when`,
 * folded into its fields' `requiredWhen` (applySectionConditions), so a flow
 * the seller didn't choose is ignored at checkout. Traditional follows its
 * "*" markers; Bungalow and Back-to-back have none, so single choices and
 * counts are required, tick lists only when they offer None, and text only
 * when revealed.
 * ─────────────────────────────────────────────────────────────────────
 */
const TH_CONFIGURATION = defineOptions({
  traditional: "Traditional townhouse", back_to_back: "Back-to-back townhouse", bungalow: "Bungalow townhouse",
});
// An unanswered configuration shows the Traditional pages, since page 1 is
// the Traditional page.
const TH_TRADITIONAL = {allOf: [
  {field: "townhouseConfiguration", ne: "bungalow"},
  {field: "townhouseConfiguration", ne: "back_to_back"},
]};
const TH_BUNGALOW = {field: "townhouseConfiguration", in: ["bungalow"]};
const TH_BACK_TO_BACK = {field: "townhouseConfiguration", in: ["back_to_back"]};
const anyTicked = (field, values) => ({anyOf: values.map((value) => TICKED(field, value))});
const cCards = (options, icons, ui = {}) => ({...singleSelect(options, "cards"), ui: {control: "cards", optionIcons: icons, ...ui}});
const cMultiCards = (options, icons, {exclusive, ...ui} = {}) => ({
  ...multiSelect(options, {exclusive, control: "cards"}),
  ui: {control: "cards", optionIcons: icons, ...ui},
});
const cSegmented = (options, ui = {}) => ({...singleSelect(options, "segmented"), ui: {control: "segmented", ...ui}});
const cChecksNone = (options, ui = {}) => ({
  ...multiSelect(options, {exclusive: "none"}),
  ui: {control: "checkboxes", inline: true, ...ui},
});
// "Other" opens a required description drawn right under its question.
const otherText = (path, field, {multi = false, placeholder = "Please describe", max = 100} = {}) => ({
  path,
  schema: draftText(max),
  requiredWhen: multi ? TICKED(field, "other") : PICKED(field, "other"),
  ui: {placeholder, attachTo: field},
});

const TH_POSITION = defineOptions({end_unit: "End unit", interior_unit: "Interior/middle unit"});
const TH_STOREYS = defineOptions([["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const TH_ACCESS = defineOptions({
  private_exterior: "Private exterior entrance", shared_interior: "Shared interior entrance", other: "Other",
});
const TH_EXPOSURE = defineOptions({north: "North", south: "South", east: "East", west: "West"});
const TH_EXTERIOR = defineOptions({
  brick: "Brick", stone: "Stone", stucco: "Stucco", vinyl_siding: "Vinyl siding", wood: "Wood", metal: "Metal",
  concrete: "Concrete", other: "Other",
});
const TH_OUTDOOR_SPACES = defineOptions({
  front_porch: "Front porch", covered_entrance: "Covered entrance", balcony: "Balcony", terrace: "Terrace",
  patio: "Patio", deck: "Deck", private_yard: "Private yard", shared_yard: "Shared yard", none: "None",
});
const TH_OUTDOOR_INTEREST = defineOptions({
  part_of_unit: "Part of the unit", exclusive_use: "Exclusive use", shared_common_element: "Shared common element",
  document_review: "Document review required",
});
const TH_OUTDOOR_FEATURES = defineOptions({
  landscaping: "Landscaping", garden_area: "Garden area", storage_shed: "Storage shed",
  bbq_gas_line: "Barbecue gas line",
});
const TH_MAINTAINER = defineOptions({
  unit_owner: "Unit owner", corporation: "Condominium corporation", shared: "Shared responsibility",
});
const TH_GARAGE_TYPE = defineOptions({built_in: "Built-in", attached: "Attached", detached: "Detached"});
const TH_SPACES = defineOptions([["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const TH_DRIVEWAY = defineOptions({yes: "Yes", no: "No", shared: "Shared"});
const TH_PARKING_INTEREST = defineOptions({
  part_of_unit: "Part of the unit", exclusive_use: "Exclusive use", rented_leased: "Rented/leased",
});
const TH_LOCKER_LOCATION = defineOptions({
  inside_unit: "Inside unit", garage: "Garage", unit_level: "Unit level", locker_room: "Locker room",
  parking_level: "Parking level", other: "Other",
});
const TH_LAYOUT = defineOptions({
  combined: "Combined living/dining", separate: "Separate living and dining", living_only: "Living area only",
});
// "Upper-floor laundry" is asked once, by Laundry location.
const TH_ROOMS = defineOptions({
  kitchen: "Kitchen", family_room: "Family room", den_office: "Den/office", foyer: "Foyer", mudroom: "Mudroom",
  breakfast_area: "Breakfast area",
});
const TH_FEATURES = defineOptions({
  open_concept: "Open-concept layout", kitchen_island: "Kitchen island", breakfast_bar: "Breakfast bar",
  walk_in_closet: "Walk-in closet", ensuite_bathroom: "Ensuite bathroom", fireplace: "Fireplace",
  built_in_storage: "Built-in storage", direct_garage_access: "Direct garage access",
  accessible_features: "Accessible features",
});
const TH_LAUNDRY = defineOptions({main_level: "Main level", upper_level: "Upper level", basement: "Basement", none: "None"});
const TH_ROOM_COUNT = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const TH_BASEMENT_FINISH = defineOptions({
  finished: "Finished", partially_finished: "Partially finished", unfinished: "Unfinished",
});
const TH_BASEMENT_ACCESS = defineOptions({
  interior_stairs: "Interior stairs", walk_out: "Walk-out", walk_up: "Walk-up",
  separate_entrance: "Separate exterior entrance",
});
// "Laundry" is asked once, by the Interior page's Laundry location.
const TH_BASEMENT_ROOMS = defineOptions({
  recreation_room: "Recreation room", living_area: "Living area", utility_room: "Utility room", storage: "Storage",
  cold_room: "Cold room", other: "Other",
});
const TH_APARTMENT_STATUS = defineOptions({
  confirmed: "Confirmed lawful/registered", not_confirmed: "Not confirmed lawful/registered",
  document_review: "Document review required",
});
const TH_BASEMENT_OCCUPANCY = defineOptions({
  owner_occupied: "Owner occupied", vacant: "Vacant", tenanted: "Tenanted", other: "Other",
});

const HAS_OUTDOOR = anyTicked("outdoorSpaces", TH_OUTDOOR_SPACES.values.filter((v) => v !== "none"));
const HAS_YARD = anyTicked("outdoorSpaces", ["private_yard", "shared_yard"]);
const HAS_GARAGE = IS_TRUE("hasGarage");
const HAS_DRIVEWAY = {field: "hasDriveway", in: ["yes", "shared"]};
const TH_FINISHED = {field: "basementFinish", in: ["finished", "partially_finished"]};

const traditionalTownhouseFields = {
  // PAGE CT-01 — Tell us about your condominium townhouse (every configuration
  // starts here; the rest of the page is the Traditional flow's).
  townhouseConfiguration: {
    path: "townhouseBasics",
    ...cCards(TH_CONFIGURATION, {traditional: "house", back_to_back: "building-2", bungalow: "house-plus"}),
  },
  unitPosition: {path: "townhouseBasics", ...cInline(TH_POSITION), requiredWhen: TH_TRADITIONAL},
  numberOfStoreys: {path: "townhouseBasics", ...rSelect(TH_STOREYS), requiredWhen: TH_TRADITIONAL},
  unitAccess: {
    path: "townhouseBasics",
    ...cInline(TH_ACCESS),
    requiredWhen: TH_TRADITIONAL,
    ui: {control: "radio", inline: true, helpText: "Selecting Other opens a required access description."},
  },
  unitAccessOther: otherText("townhouseBasics", "unitAccess", {placeholder: "Describe how the unit is accessed"}),
  squareFootage: {
    path: "townhouseBasics",
    schema: z.number().int().positive().max(50_000),
    requiredWhen: TH_TRADITIONAL,
    ui: {
      placeholder: "Enter square feet",
      helpText: "Required for the listing. Exclude unfinished basement space, garage, parking and outdoor areas.",
    },
  },
  squareFootageSource: {path: "townhouseBasics", ...rSelect(C_SQFT_SOURCE, "Select source"), requiredWhen: TH_TRADITIONAL},
  yearBuilt: optional({
    path: "townhouseBasics",
    schema: yearBuiltSchema,
    requiredWhen: TH_TRADITIONAL,
    ui: {placeholder: "YYYY"},
  }),
  unitExposure: {path: "townhouseBasics", ...cChecks(TH_EXPOSURE), requiredWhen: TH_TRADITIONAL},
  hasBasement: {
    path: "townhouseBasics",
    ...yesNo("radio", {helpText: "Selecting Yes adds the Basement page later in this flow."}),
    requiredWhen: TH_TRADITIONAL,
  },

  // PAGE CT-02 — Exterior & Private Outdoor Features
  exteriorMaterials: optional({
    path: "townhouseExterior",
    ...cMultiCards(TH_EXTERIOR, {
      brick: "brick-wall", stone: "mountain", stucco: "square-dashed", vinyl_siding: "align-justify",
      wood: "trees", metal: "columns-3", concrete: "square", other: "ellipsis",
    }, {helpText: "Selecting Other opens a required description."}),
  }),
  exteriorMaterialsOther: otherText("townhouseExterior", "exteriorMaterials", {multi: true}),
  outdoorSpaces: optional({
    path: "townhouseExterior",
    ...cMultiCards(TH_OUTDOOR_SPACES, {
      front_porch: "door-open", covered_entrance: "house", balcony: "fence", terrace: "umbrella",
      patio: "armchair", deck: "fence", private_yard: "trees", shared_yard: "trees", none: "ban",
    }, {exclusive: "none"}),
  }),
  outdoorInterest: {path: "townhouseExterior", ...cCards(TH_OUTDOOR_INTEREST, {
    part_of_unit: "house", exclusive_use: "award", shared_common_element: "users", document_review: "file-text",
  }), requiredWhen: HAS_OUTDOOR},
  yardFenced: optional({path: "townhouseExterior", ...yesNo("radio", {inline: true}), requiredWhen: HAS_YARD}),
  outdoorFeatures: optional({path: "townhouseExterior", ...cChecks(TH_OUTDOOR_FEATURES), requiredWhen: HAS_OUTDOOR}),
  outdoorMaintainer: optional({path: "townhouseExterior", ...cInline(TH_MAINTAINER), requiredWhen: HAS_OUTDOOR}),
  hasGarage: {path: "townhouseExterior", ...yesNo()},
  garageType: {path: "townhouseExterior", ...cCards(TH_GARAGE_TYPE, {
    built_in: "warehouse", attached: "house", detached: "warehouse",
  }), requiredWhen: HAS_GARAGE},
  garageSpaces: {path: "townhouseExterior", ...rSelect(TH_SPACES), requiredWhen: HAS_GARAGE},
  hasDriveway: {path: "townhouseExterior", ...cInline(TH_DRIVEWAY)},
  drivewaySpaces: {path: "townhouseExterior", ...rSelect(TH_SPACES), requiredWhen: HAS_DRIVEWAY},

  // PAGE CT-03 — Parking & Locker Details (the garage and driveway cards
  // follow the Exterior page's answers).
  garagePermitted: {path: "townhouseParking", ...yesNo("radio", {inline: true}), requiredWhen: HAS_GARAGE},
  garagePermittedSpaces: {path: "townhouseParking", ...rSelect(TH_SPACES), requiredWhen: IS_TRUE("garagePermitted")},
  garageInterest: {path: "townhouseParking", ...cInline(TH_PARKING_INTEREST), requiredWhen: IS_TRUE("garagePermitted")},
  garageIdentifier: optional({
    path: "townhouseParking",
    ...cText(60, "Enter number or description, if shown"),
    requiredWhen: IS_TRUE("garagePermitted"),
  }),
  drivewayPermitted: {path: "townhouseParking", ...yesNo("radio", {inline: true}), requiredWhen: HAS_DRIVEWAY},
  drivewayPermittedSpaces: {path: "townhouseParking", ...rSelect(TH_SPACES), requiredWhen: IS_TRUE("drivewayPermitted")},
  drivewayInterest: {path: "townhouseParking", ...cInline(TH_PARKING_INTEREST), requiredWhen: IS_TRUE("drivewayPermitted")},
  drivewayIdentifier: optional({
    path: "townhouseParking",
    ...cText(60, "Enter number or description, if shown"),
    requiredWhen: IS_TRUE("drivewayPermitted"),
  }),
  hasOtherParking: {
    path: "townhouseParking",
    ...yesNo("radio", {
      helpText: "Selecting Yes adds a separate parking card for underground, surface/outdoor, covered structure or " +
        "other parking.",
    }),
  },
  otherParkingSpaces: listField("townhouseParking", {
    parkingType: {label: "Parking type", ...cInline(C_PARKING_TYPE)},
    parkingTypeOther: {
      label: "Describe parking type",
      ...cText(100, "e.g., Tandem space"),
      requiredWhen: PICKED("parkingType", "other"),
    },
    parkingInterest: {label: "Parking interest", ...cInline(TH_PARKING_INTEREST)},
    parkingIdentifier: {
      label: "Parking identifier",
      schema: draftText(60).optional(),
      ui: {placeholder: "Enter number or description, if shown"},
    },
  }, {
    max: 4,
    requiredWhen: IS_TRUE("hasOtherParking"),
    ui: {itemTitle: "Parking Space {n}", addLabel: "Add another parking space", initialItems: 1, itemLayout: "grid"},
  }),
  lockerIncluded: {path: "townhouseParking", ...yesNo()},
  lockers: listField("townhouseParking", {
    lockerLocation: {label: "Locker location", ...cInline(TH_LOCKER_LOCATION)},
    lockerLocationOther: {
      label: "Describe locker location",
      ...cText(100, "e.g., Storage room behind the garage"),
      requiredWhen: PICKED("lockerLocation", "other"),
    },
    lockerInterest: {label: "Locker interest", ...cInline(TH_PARKING_INTEREST)},
    lockerNumber: {label: "Locker number", schema: draftText(30).optional(), ui: {placeholder: "Enter number, if shown"}},
    locationDescription: {
      label: "Location description",
      schema: draftText(100).optional(),
      ui: {placeholder: "e.g., storage area at rear of garage"},
    },
  }, {
    max: 3,
    requiredWhen: IS_TRUE("lockerIncluded"),
    ui: {
      itemTitle: "Locker {n}", addLabel: "Add another locker", initialItems: 1, countLabel: "Number of lockers",
      itemLayout: "grid",
    },
  }),

  // PAGE CT-04 — Interior Rooms & Features (above grade)
  bedroomsAboveGrade: {path: "townhouseInterior", ...rSelect(C_BEDROOMS)},
  densAboveGrade: optional({path: "townhouseInterior", ...rSelect(C_DENS)}),
  fullBathroomsAboveGrade: {path: "townhouseInterior", ...rSelect(C_FULL_BATHS)},
  powderRoomsAboveGrade: optional({path: "townhouseInterior", ...rSelect(C_POWDER_ROOMS)}),
  livingDiningLayout: {path: "townhouseInterior", ...cCards(TH_LAYOUT, {
    combined: "sofa", separate: "armchair", living_only: "sofa",
  })},
  additionalRooms: optional({path: "townhouseInterior", ...cChecks(TH_ROOMS)}),
  otherAboveGradeRoom: optional({path: "townhouseInterior", ...cText(60, "Add another room")}),
  interiorFeatures: optional({
    path: "townhouseInterior",
    ...cChecks(TH_FEATURES, {
      helpText: "Direct garage access appears only when a private attached or built-in garage was confirmed earlier.",
      optionWhen: {direct_garage_access: {field: "garageType", in: ["attached", "built_in"]}},
    }),
  }),
  laundryLocation: {
    path: "townhouseInterior",
    ...cInline(TH_LAUNDRY),
    ui: {
      control: "radio",
      inline: true,
      helpText: "Selecting Basement records the laundry location on the conditional Basement page.",
      optionWhen: {basement: IS_TRUE("hasBasement")},
    },
  },
  heating: {path: "townhouseInterior", ...rSelect(C_HEATING)},
  cooling: {path: "townhouseInterior", ...rSelect(C_COOLING)},
  primaryFlooring: optional({path: "townhouseInterior", ...cChecks(C_FLOORING, {wide: true})}),
  appliances: optional({path: "townhouseInterior", ...cChecks(C_APPLIANCES, {wide: true})}),

  // PAGE CT-05 — Basement Details (only when page 1 says there is one)
  basementFinish: {path: "townhouseBasement", ...cInline(TH_BASEMENT_FINISH)},
  finishedBasementArea: {
    path: "townhouseBasement",
    schema: z.number().int().positive().max(20_000),
    requiredWhen: TH_FINISHED,
    ui: {
      placeholder: "Enter square feet",
      helpText: "Record finished below-grade area separately from the required above-grade square footage.",
    },
  },
  basementAccess: optional({path: "townhouseBasement", ...cChecks(TH_BASEMENT_ACCESS)}),
  bedroomsBelowGrade: optional({path: "townhouseBasement", ...rSelect(TH_ROOM_COUNT)}),
  fullBathroomsBelowGrade: optional({path: "townhouseBasement", ...rSelect(TH_ROOM_COUNT)}),
  powderRoomsBelowGrade: optional({path: "townhouseBasement", ...rSelect(TH_ROOM_COUNT)}),
  kitchensBelowGrade: optional({path: "townhouseBasement", ...rSelect(TH_ROOM_COUNT)}),
  basementRooms: optional({
    path: "townhouseBasement",
    ...cChecks(TH_BASEMENT_ROOMS, {helpText: "Selecting Other opens a repeatable room field.", wide: true}),
  }),
  otherBasementRooms: listField("townhouseBasement", {
    room: {label: "Room", ...cText(60, "e.g., Home gym")},
  }, {
    max: 5,
    requiredWhen: TICKED("basementRooms", "other"),
    ui: {compactItems: true, initialItems: 1, addLabel: "Add another room"},
  }),
  hasBasementApartment: {path: "townhouseBasement", ...yesNo("radio", {inline: true})},
  basementApartmentStatus: {
    path: "townhouseBasement",
    ...cInline(TH_APARTMENT_STATUS),
    requiredWhen: IS_TRUE("hasBasementApartment"),
  },
  apartmentSeparateEntrance: optional({
    path: "townhouseBasement", ...yesNo("radio", {inline: true}), requiredWhen: IS_TRUE("hasBasementApartment"),
  }),
  apartmentOwnKitchen: optional({
    path: "townhouseBasement", ...yesNo("radio", {inline: true}), requiredWhen: IS_TRUE("hasBasementApartment"),
  }),
  apartmentOwnBathroom: optional({
    path: "townhouseBasement", ...yesNo("radio", {inline: true}), requiredWhen: IS_TRUE("hasBasementApartment"),
  }),
  basementOccupancy: {path: "townhouseBasement", ...cInline(TH_BASEMENT_OCCUPANCY)},
  basementOccupantRemains: optional({
    path: "townhouseBasement",
    ...yesNo("radio", {inline: true}),
    requiredWhen: {field: "basementOccupancy", in: ["tenanted", "other"]},
  }),
  basementWrittenAgreement: optional({
    path: "townhouseBasement",
    ...yesNo("radio", {inline: true}),
    requiredWhen: PICKED("basementOccupancy", "tenanted"),
  }),
};

// -- Bungalow townhouse ---------------------------------------------------
const BG_POSITION = defineOptions({interior_unit: "Interior unit", end_unit: "End unit"});
const BG_LEVELS = defineOptions({
  one_level: "One level", one_level_basement: "One level + basement", one_level_loft: "One level + loft",
  other: "Other",
});
const BG_EXTERIOR = defineOptions({
  brick: "Brick", stone: "Stone", stucco: "Stucco", vinyl_siding: "Vinyl siding", aluminum_siding: "Aluminum siding",
  wood: "Wood", other: "Other", not_sure: "Not sure",
});
const BG_EXPOSURE = defineOptions({
  north: "North", north_east: "North-east", east: "East", south_east: "South-east", south: "South",
  south_west: "South-west", west: "West", north_west: "North-west", not_sure: "Not sure",
});
const BG_OUTDOOR = defineOptions({
  front_porch: "Front porch", patio: "Patio", terrace: "Terrace", balcony: "Balcony", private_yard: "Private yard",
  garden_area: "Garden area", deck: "Deck", none: "None", other: "Other",
});
const BG_BEDROOMS = defineOptions([...numberOptions(1, 4), ["5_plus", "5+"]]);
const BG_BEDROOM_FEATURES = defineOptions({
  primary_main_floor: "Primary bedroom is on the main floor", all_main_floor: "All bedrooms are on the main floor",
});
const BG_BATHROOM_FEATURES = defineOptions({
  ensuite_bathroom: "Ensuite bathroom", main_floor_powder_room: "Main floor powder room",
});
const BG_ROOM_COUNT = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const BG_KITCHEN_TYPE = defineOptions({
  eat_in: "Eat-in kitchen", breakfast_area: "Breakfast area", kitchen_island: "Kitchen island",
  walk_in_pantry: "Walk-in pantry",
});
const BG_APPLIANCES = defineOptions({
  refrigerator: "Refrigerator", stove: "Stove / Range", dishwasher: "Dishwasher",
  built_in_microwave: "Built-in microwave", range_hood: "Range hood", oven: "Oven", other: "Other",
});
const BG_LAUNDRY = defineOptions({
  main_floor: "Main floor", basement: "Basement", laundry_room: "Laundry room", closet: "Closet", other: "Other",
});
const BG_HEATING = defineOptions({
  forced_air_gas: "Forced air (gas)", forced_air_electric: "Forced air (electric)", heat_pump: "Heat pump",
  electric_baseboard: "Electric baseboard", radiant: "Radiant", other: "Other",
});
const BG_COOLING = defineOptions({
  central_air: "Central air", heat_pump: "Heat pump", ductless: "Ductless", window_units: "Window units",
  none: "None",
});
const BG_INTERIOR_FEATURES = defineOptions({
  hardwood_flooring: "Hardwood flooring", laminate_flooring: "Laminate flooring",
  ceramic_porcelain: "Ceramic / Porcelain", carpet: "Carpet", vinyl: "Vinyl / Luxury vinyl", pot_lights: "Pot lights",
  vaulted_ceiling: "Cathedral / Vaulted ceiling", smooth_ceilings: "Smooth ceilings", crown_moulding: "Crown moulding",
  fireplace: "Fireplace", walk_in_closet: "Walk-in closet", walk_in_shower: "Walk-in shower", grab_bars: "Grab bars",
  wide_doorways: "Wide doorways / Accessibility", other: "Other",
});
const BG_HAS_BASEMENT = defineOptions({yes: "Yes, it has a basement", no: "No, no basement"});
const BG_BASEMENT_TYPE = defineOptions({full: "Full basement", partial_crawl: "Partial / Crawl space", not_sure: "Not sure"});
const BG_BASEMENT_FINISH = defineOptions({
  fully_finished: "Fully finished", partially_finished: "Partially finished", unfinished: "Unfinished",
  not_sure: "Not sure",
});
const BG_BASEMENT_ACCESS = defineOptions({
  interior: "Interior access", walk_up: "Walk-up to exterior", separate_entrance: "Separate entrance",
  not_sure: "Not sure",
});
const BG_BASEMENT_FEATURES = defineOptions({
  above_grade_windows: "Above grade windows", large_windows: "Large windows", walk_out: "Walk-out to yard",
  high_ceilings: "High ceilings", bathroom: "Bathroom", kitchen: "Kitchen / Kitchenette", laundry: "Laundry",
  wet_bar: "Wet bar", fireplace_stove: "Fireplace / Stove", cold_cellar: "Cold cellar",
  storage_utility: "Storage / Utility room", other: "Other", none: "None of these",
});
const BG_APARTMENT_LEGAL = defineOptions({legal: "Yes, legal", not_legal_not_sure: "No, not legal / Not sure"});
const BG_ADDITIONAL_SPACES = defineOptions({
  loft: "Loft", upper_level: "Upper-level living area", sunroom: "Sunroom", solarium: "Solarium", other: "Other",
});
// "Visitor parking" isn't unit parking; it's listed with the community features.
const BG_PARKING = defineOptions({
  attached_garage: "Attached garage", detached_garage: "Detached garage", private_driveway: "Private driveway",
  surface_space: "Surface parking space",
});
const BG_TOTAL_SPACES = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const BG_GARAGE_VEHICLES = defineOptions([["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const BG_GARAGE_FEATURES = defineOptions({
  inside_entry: "Inside entry to home", heated: "Heated", auto_door_opener: "Automatic garage door opener",
  insulated: "Insulated", built_in_shelving: "Built-in shelving / storage", workshop_area: "Workshop area",
  ev_outlet: "EV charging outlet", other: "Other",
});
const BG_COMMUNITY = defineOptions({
  visitor_parking: "Visitor parking", landscaping: "Landscaping / grounds maintenance", snow_removal: "Snow removal",
  common_elements: "Common elements maintenance", clubhouse: "Clubhouse / recreation room",
  fitness: "Fitness / exercise room", outdoor_pool: "Outdoor pool", security_system: "Security system",
  tennis_pickleball: "Tennis / pickleball court", bbq_area: "BBQ area", walking_trails: "Walking trails / green space",
  other: "Other",
});
const BG_NEARBY = defineOptions({
  schools: "Schools", public_transit: "Public Transit", shopping: "Shopping", highways: "Highways",
  parks_trails: "Parks & Trails", recreation_centres: "Recreation Centres", places_of_worship: "Places of Worship",
  healthcare: "Healthcare", restaurants_cafes: "Restaurants & Cafés", entertainment: "Entertainment",
  golf_courses: "Golf Courses", waterfront_green_space: "Waterfront / Green Space", other: "Other Nearby Features",
});
const BG_LOCATED_IN = defineOptions({urban: "Urban", suburban: "Suburban", rural: "Rural", small_town: "Small Town"});
const BG_CHATTELS = defineOptions({
  stove: "Stove", microwave_range_hood: "Microwave / Range Hood", refrigerator: "Refrigerator",
  dishwasher: "Dishwasher", washer: "Washer", dryer: "Dryer", window_coverings: "All Window Coverings",
  light_fixtures: "All Light Fixtures", other: "Other (specify)",
});
const BG_RENTED = defineOptions({
  water_heater: "Water Heater (Rental)", furnace: "Furnace (Rental)", air_conditioner: "Air Conditioner (Rental)",
  other: "Other (specify)", none: "None",
});
const BG_HAS_A_BASEMENT = PICKED("bgHasBasement", "yes");
const BG_HAS_GARAGE = anyTicked("bgParkingTypes", ["attached_garage", "detached_garage"]);

const bungalowTownhouseFields = {
  // PAGE CT-BG-01 — Exterior & Property Basics
  bgPosition: {path: "bungalowExterior", ...cCards(BG_POSITION, {interior_unit: "house", end_unit: "house"}, {
    optionDescriptions: {
      interior_unit: "Attached to homes on both sides.",
      end_unit: "At the end of the townhouse row.",
    },
  })},
  bgLevels: {path: "bungalowExterior", ...cInline(BG_LEVELS)},
  bgLevelsOther: otherText("bungalowExterior", "bgLevels"),
  bgYearBuilt: {
    path: "bungalowExterior",
    ...rSelect(R_YEAR_BUILT, "Select year or range"),
    ui: {control: "select", placeholder: "Select year or range", notSureOption: "not_sure"},
  },
  bgExteriorConstruction: optional({
    path: "bungalowExterior",
    ...multiSelect(BG_EXTERIOR, {exclusive: "not_sure"}),
    ui: {control: "checkboxes", inline: true},
  }),
  bgExteriorOther: otherText("bungalowExterior", "bgExteriorConstruction", {multi: true}),
  bgFrontExposure: {
    path: "bungalowExterior",
    ...rSelect(BG_EXPOSURE, "Select direction"),
    ui: {control: "select", placeholder: "Select direction", notSureOption: "not_sure"},
  },
  bgOutdoorFeatures: {path: "bungalowExterior", ...cChecksNone(BG_OUTDOOR)},
  bgOutdoorOther: otherText("bungalowExterior", "bgOutdoorFeatures", {multi: true}),

  // PAGE CT-BG-02 — Interior Details. Washer/dryer and rental equipment are
  // asked once, on the Description & Included Items page.
  bgBedrooms: {path: "bungalowInterior", ...rSelect(BG_BEDROOMS)},
  bgBedroomFeatures: optional({path: "bungalowInterior", ...cChecks(BG_BEDROOM_FEATURES, {inline: false, hideLabel: true})}),
  bgBathrooms: {path: "bungalowInterior", ...rSelect(R_BATHROOMS)},
  bgBathroomFeatures: optional({path: "bungalowInterior", ...cChecks(BG_BATHROOM_FEATURES, {inline: false, hideLabel: true})}),
  bgLivingRooms: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgDiningRooms: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgKitchens: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgFamilyRooms: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgDensOffices: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgEatingAreas: {path: "bungalowInterior", ...rSelect(BG_ROOM_COUNT)},
  bgOpenConcept: optional({path: "bungalowInterior", ...yesNo("checkbox")}),
  bgKitchenType: optional({path: "bungalowInterior", ...cChecks(BG_KITCHEN_TYPE, {inline: false})}),
  bgAppliances: optional({path: "bungalowInterior", ...cChecks(BG_APPLIANCES)}),
  bgAppliancesOther: otherText("bungalowInterior", "bgAppliances", {multi: true}),
  bgLaundryLocation: {path: "bungalowInterior", ...cInline(BG_LAUNDRY)},
  bgLaundryOther: otherText("bungalowInterior", "bgLaundryLocation"),
  bgHeating: {path: "bungalowInterior", ...rSelect(BG_HEATING)},
  bgCooling: {path: "bungalowInterior", ...rSelect(BG_COOLING)},
  bgWaterSupply: {path: "bungalowInterior", ...rSelect(SD_WATER_SOURCE)},
  bgSewer: {path: "bungalowInterior", ...rSelect(SD_SEWAGE)},
  bgElectricalService: {path: "bungalowInterior", ...rSelect(SD_ELECTRICAL)},
  bgInteriorFeatures: optional({path: "bungalowInterior", ...cChecks(BG_INTERIOR_FEATURES)}),
  bgInteriorFeaturesOther: otherText("bungalowInterior", "bgInteriorFeatures", {multi: true}),
  bgInteriorNotes: optional({
    path: "bungalowInterior",
    ...cDetails("Provide any additional details...", {multiline: true}),
  }),

  // PAGE CT-BG-03 — Basement & Additional Living Spaces
  bgHasBasement: {
    path: "bungalowBasement",
    ...singleSelect(BG_HAS_BASEMENT),
    ui: {
      control: "radio",
      prefillFrom: {field: "bgLevels", map: {one_level_basement: "yes", one_level: "no", one_level_loft: "no"}},
    },
  },
  bgBasementType: {path: "bungalowBasement", ...singleSelect(BG_BASEMENT_TYPE), requiredWhen: BG_HAS_A_BASEMENT},
  bgBasementFinish: {path: "bungalowBasement", ...singleSelect(BG_BASEMENT_FINISH), requiredWhen: BG_HAS_A_BASEMENT},
  bgBasementAccess: {path: "bungalowBasement", ...singleSelect(BG_BASEMENT_ACCESS), requiredWhen: BG_HAS_A_BASEMENT},
  bgBasementFeatures: {
    path: "bungalowBasement",
    ...multiSelect(BG_BASEMENT_FEATURES, {exclusive: "none"}),
    requiredWhen: BG_HAS_A_BASEMENT,
    ui: {control: "checkboxes", inline: true},
  },
  bgBasementFeaturesOther: {
    ...otherText("bungalowBasement", "bgBasementFeatures", {multi: true}),
  },
  bgBasementApartment: {path: "bungalowBasement", ...yesNo("segmented"), requiredWhen: BG_HAS_A_BASEMENT},
  bgApartmentLegal: {
    path: "bungalowBasement",
    ...cInline(BG_APARTMENT_LEGAL),
    requiredWhen: IS_TRUE("bgBasementApartment"),
  },
  bgHasAdditionalSpaces: {path: "bungalowBasement", ...yesNo("segmented")},
  bgAdditionalSpaces: {
    path: "bungalowBasement",
    ...cChecks(BG_ADDITIONAL_SPACES),
    requiredWhen: IS_TRUE("bgHasAdditionalSpaces"),
  },
  bgAdditionalSpacesOther: otherText("bungalowBasement", "bgAdditionalSpaces", {multi: true}),

  // PAGE CT-BG-04 — Parking & Condo Features
  bgParkingTypes: optional({
    path: "bungalowParking",
    ...cMultiCards(BG_PARKING, {
      attached_garage: "warehouse", detached_garage: "warehouse", private_driveway: "car", surface_space: "car-front",
    }),
  }),
  bgParkingSpaces: {path: "bungalowParking", ...rSelect(BG_TOTAL_SPACES)},
  bgGarageVehicles: {path: "bungalowParking", ...rSelect(BG_GARAGE_VEHICLES), requiredWhen: BG_HAS_GARAGE},
  bgGarageFeatures: optional({
    path: "bungalowParking",
    ...cChecks(BG_GARAGE_FEATURES),
    requiredWhen: BG_HAS_GARAGE,
  }),
  bgGarageFeaturesOther: otherText("bungalowParking", "bgGarageFeatures", {multi: true}),
  bgCommunityFeatures: optional({
    path: "bungalowParking",
    ...cMultiCards(BG_COMMUNITY, {
      visitor_parking: "circle-parking", landscaping: "sprout", snow_removal: "snowflake",
      common_elements: "landmark", clubhouse: "house", fitness: "dumbbell", outdoor_pool: "waves",
      security_system: "shield-check", tennis_pickleball: "volleyball", bbq_area: "flame", walking_trails: "trees",
      other: "ellipsis",
    }),
  }),
  bgCommunityOther: otherText("bungalowParking", "bgCommunityFeatures", {multi: true}),
  bgHasCondoFees: {path: "bungalowParking", ...yesNo("radio", {inline: true})},
  bgMonthlyFee: {path: "bungalowParking", ...cMoney(), requiredWhen: IS_TRUE("bgHasCondoFees")},
  bgFeeInclusions: {
    path: "bungalowParking",
    ...cDetails("List what is included in the condo / maintenance fee...", {multiline: true}),
    requiredWhen: IS_TRUE("bgHasCondoFees"),
  },

  // PAGE CT-BG-05 — Location & Nearby Features (Final Listing Information)
  bgNearbyAmenities: optional({
    path: "bungalowLocation",
    ...multiSelect(BG_NEARBY),
    ui: {
      control: "detailCards",
      optionIcons: {
        schools: "graduation-cap", public_transit: "bus", shopping: "shopping-bag", highways: "route",
        parks_trails: "trees", recreation_centres: "person-standing", places_of_worship: "church",
        healthcare: "hospital", restaurants_cafes: "utensils", entertainment: "ticket", golf_courses: "flag",
        waterfront_green_space: "waves",
      },
      optionDescriptions: {
        schools: "Elementary, secondary or private schools", public_transit: "Bus stop, subway, GO station, etc.",
        shopping: "Grocery stores, malls, retail, services", highways: "Major highways or access routes",
        parks_trails: "Parks, walking trails, conservation areas",
        recreation_centres: "Community centres, arenas, fitness, etc.",
        places_of_worship: "Churches, temples, mosques, etc.", healthcare: "Hospitals, clinics, pharmacies",
        restaurants_cafes: "Dining, cafés and takeout", entertainment: "Cinemas, theatres, events, attractions",
        golf_courses: "Golf courses or country clubs", waterfront_green_space: "Lakes, rivers, beaches or waterfront areas",
        other: "Provide additional details about nearby features that buyers may find important.",
      },
    },
  }),
  bgOtherNearby: {
    path: "bungalowLocation",
    ...cDetails("Tell us more about other nearby features...", {multiline: true}),
    requiredWhen: TICKED("bgNearbyAmenities", "other"),
  },
  bgNeighbourhoodHighlights: optional({
    path: "bungalowLocation",
    ...cDetails("Describe what makes this neighbourhood special...", {multiline: true}),
  }),
  bgLocatedIn: optional({path: "bungalowLocation", ...cInline(BG_LOCATED_IN)}),

  // PAGE CT-BG-06 — Description & Included Items (Final Listing Information)
  bgClientRemarks: {
    path: "bungalowListing",
    ...cText(1500, "Enter your client remarks here...", {multiline: true}),
  },
  bgChattels: optional({
    path: "bungalowListing",
    ...cChecks(BG_CHATTELS, {
      prefillFrom: {field: "bgAppliances", map: {built_in_microwave: "microwave_range_hood", range_hood: "microwave_range_hood"}},
    }),
  }),
  bgChattelsOther: otherText("bungalowListing", "bgChattels", {multi: true, placeholder: "Please specify"}),
  bgRentedItems: {path: "bungalowListing", ...cChecksNone(BG_RENTED)},
  bgRentedOther: otherText("bungalowListing", "bgRentedItems", {multi: true, placeholder: "Please specify"}),
};

// -- Back-to-back townhouse -----------------------------------------------
const BB_POSITION = defineOptions({interior_unit: "Interior unit", end_unit: "End unit", corner_unit: "Corner unit"});
const BB_STOREYS = defineOptions({two: "2 storeys", three: "3 storeys", four: "4 storeys", other: "Other"});
const BB_OUTDOOR = defineOptions({front_porch: "Front porch", balcony: "Balcony", terrace: "Terrace", none: "None"});
const BB_GARAGE = defineOptions({
  built_in: "Built-in garage", attached: "Attached garage", underground: "Underground parking",
  surface: "Surface parking", none: "No garage",
});
const BB_SPACES = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4_plus", "4+"]]);
const BB_EV = defineOptions({yes: "Yes", no: "No", rough_in: "Rough-in only"});
const BB_BEDROOMS = defineOptions([...numberOptions(0, 4), ["5_plus", "5+"]]);
const BB_FULL_BATHS = defineOptions([...numberOptions(1, 3), ["4_plus", "4+"]]);
const BB_PARTIAL_BATHS = defineOptions([...numberOptions(0, 2), ["3_plus", "3+"]]);
const BB_ROOMS = defineOptions({
  living_room: "Living room", dining_room: "Dining room", family_room: "Family room", den: "Den",
  home_office: "Home office", breakfast_area: "Breakfast area", great_room: "Great room", other: "Other",
});
const BB_KITCHENS = defineOptions([["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const BB_KITCHEN_TYPE = defineOptions({open_concept: "Open concept", eat_in: "Eat-in", separate: "Separate"});
const BB_LAUNDRY = defineOptions({
  upper_level: "Upper level", main_level: "Main level", lower_level: "Lower level", basement: "Basement",
  garage: "Garage",
});
const BB_FEATURES = defineOptions({
  fireplace: "Fireplace", hardwood_flooring: "Hardwood flooring", open_concept: "Open-concept layout",
  updated_kitchen: "Updated kitchen", walk_in_closet: "Walk-in closet", central_vacuum: "Central vacuum",
});
const BB_LEVEL_STATUS = defineOptions({
  none: "No basement or lower level", unfinished: "Unfinished", partially_finished: "Partially finished",
  finished: "Finished",
});
const BB_ACCESS = defineOptions({
  interior_access: "Interior access", walk_out: "Walk-out", walk_up: "Walk-up", separate_entrance: "Separate entrance",
});
const BB_BELOW_COUNT = defineOptions([["0", "0"], ["1", "1"], ["2", "2"], ["3_plus", "3+"]]);
const BB_FINISHED_ROOMS = defineOptions({
  recreation_room: "Recreation room", office_den: "Office or den", kitchen: "Kitchen", other: "Other",
});
const BB_SUITE_STATUS = defineOptions({
  legal: "Legal", legal_non_conforming: "Legal non-conforming", retrofit_unknown: "Retrofit status unknown",
  not_legal: "Not legal", unsure: "Unsure",
});
const BB_HEATING = defineOptions({
  forced_air: "Forced air", heat_pump: "Heat pump", baseboard: "Baseboard", radiant: "Radiant", other: "Other",
});
const BB_FUEL = defineOptions({
  natural_gas: "Natural gas", electric: "Electric", oil: "Oil", propane: "Propane", other: "Other",
});
const BB_COOLING = defineOptions({
  central_air: "Central air", ductless: "Ductless", window_units: "Window units", none: "None",
});
const BB_WATER = defineOptions({municipal: "Municipal", private: "Private"});
const BB_PANEL = defineOptions({breakers: "Breakers", fuses: "Fuses", unsure: "Unsure"});
const BB_SERVICE = defineOptions({amp_60: "60 amp", amp_100: "100 amp", amp_200: "200 amp", unsure: "Unsure"});
const BB_EQUIPMENT = defineOptions({
  furnace: "Furnace", air_conditioner: "Air conditioner", hot_water_tank: "Hot-water tank", heat_pump: "Heat pump",
  water_softener: "Water softener",
});
const BB_OWNERSHIP = [
  {value: "owned", label: "Owned"}, {value: "rented", label: "Rented"}, {value: "not_present", label: "Not present"},
];
const BB_SYSTEMS = defineOptions({
  sump_pump: "Sump pump", backwater_valve: "Backwater valve", water_filtration: "Water filtration",
  smart_thermostat: "Smart thermostat", none: "None",
});
const BB_FEE_INCLUDES = defineOptions({
  common_elements: "Common elements", building_insurance: "Building insurance", water: "Water", heat: "Heat",
  hydro: "Hydro", parking: "Parking", internet_cable: "Internet or cable", other: "Other",
});
const BB_PARKING_STATUS = defineOptions({owned: "Owned", exclusive_use: "Exclusive use", rented: "Rented", none: "None"});
const BB_LOCKER_STATUS = defineOptions({owned: "Owned", exclusive_use: "Exclusive use", rented: "Rented"});
const BB_AMENITIES = defineOptions({
  visitor_parking: "Visitor parking", outdoor_pool: "Outdoor pool", indoor_pool: "Indoor pool",
  fitness_room: "Fitness room", party_room: "Party room", playground: "Playground", security: "Security", none: "None",
});
const BB_NEARBY = defineOptions({
  schools: "Schools", child_care: "Child care", public_transit: "Public transit", go_transit: "GO Transit",
  shopping: "Shopping", grocery_stores: "Grocery stores", restaurants: "Restaurants", parks: "Parks",
  walking_trails: "Walking trails", recreation_centre: "Recreation centre", hospital: "Hospital",
  highway_access: "Highway access", waterfront: "Waterfront", places_of_worship: "Places of worship",
  community_centre: "Community centre", other: "Other",
});
// "Visitor parking" is asked once, with the shared amenities.
const BB_SETTING = defineOptions({
  quiet_street: "Quiet street", cul_de_sac: "Cul-de-sac", family_friendly: "Family-friendly",
  mature_trees: "Mature trees", green_space: "Green space", walkable_area: "Walkable area", bike_routes: "Bike routes",
});
const BB_FRONT_EXPOSURE = defineOptions({north: "North", south: "South", east: "East", west: "West"});
const BB_VIEW = defineOptions({
  residential: "Residential", park: "Park", ravine: "Ravine", city: "City", water: "Water", other: "Other",
});
const BB_CHATTELS = defineOptions({
  refrigerator: "Refrigerator", stove: "Stove", dishwasher: "Dishwasher", microwave: "Microwave", washer: "Washer",
  dryer: "Dryer", freezer: "Freezer", window_coverings: "Window coverings", garage_door_opener: "Garage-door opener",
  remote_controls: "Remote controls",
});
const BB_RENTED = defineOptions({
  hot_water_tank: "Hot-water tank", furnace: "Furnace", air_conditioner: "Air conditioner", heat_pump: "Heat pump",
  water_softener: "Water softener", security_system: "Security system", other: "Other",
});
const BB_HAS_LOWER_LEVEL = {field: "bbLevelStatus", notIn: ["none"]};
const BB_FINISHED = {field: "bbLevelStatus", in: ["partially_finished", "finished"]};

const backToBackTownhouseFields = {
  // PAGE CT-BB-01 — Tell us about your back-to-back townhouse
  bbPosition: {path: "b2bBasics", ...cCards(BB_POSITION, {
    interior_unit: "house", end_unit: "house", corner_unit: "house",
  })},
  bbStoreys: {path: "b2bBasics", ...cSegmented(BB_STOREYS)},
  bbStoreysOther: otherText("b2bBasics", "bbStoreys", {placeholder: "Describe the number of storeys"}),
  bbPrivateEntrance: {path: "b2bBasics", ...yesNo("segmented")},
  bbOutdoorAreas: {path: "b2bBasics", ...cChecksNone(BB_OUTDOOR)},

  // PAGE CT-BB-02 — Parking and garage
  bbGarageType: {path: "b2bParking", ...cCards(BB_GARAGE, {
    built_in: "warehouse", attached: "house", underground: "car", surface: "car-front", none: "ban",
  })},
  bbGarageSpaces: {path: "b2bParking", ...rSelect(BB_SPACES), requiredWhen: {field: "bbGarageType", notIn: ["none"]}},
  bbDrivewaySpaces: {path: "b2bParking", ...rSelect(BB_SPACES)},
  bbDirectGarageAccess: {
    path: "b2bParking",
    ...yesNo("segmented"),
    requiredWhen: {field: "bbGarageType", in: ["built_in", "attached"]},
  },
  bbEvCharger: {path: "b2bParking", ...cSegmented(BB_EV)},

  // PAGE CT-BB-03 — Inside your townhouse (above grade)
  bbBedrooms: {path: "b2bInterior", ...rSelect(BB_BEDROOMS)},
  bbFullBathrooms: {path: "b2bInterior", ...rSelect(BB_FULL_BATHS)},
  bbPartialBathrooms: {path: "b2bInterior", ...rSelect(BB_PARTIAL_BATHS)},
  bbPrincipalRooms: optional({path: "b2bInterior", ...cChecks(BB_ROOMS)}),
  bbPrincipalRoomsOther: otherText("b2bInterior", "bbPrincipalRooms", {multi: true}),
  bbKitchens: {path: "b2bInterior", ...rSelect(BB_KITCHENS)},
  bbKitchenType: {
    path: "b2bInterior",
    ...rSelect(BB_KITCHEN_TYPE),
    ui: {control: "select", placeholder: "Select", helpText: "For example: open concept, eat-in or separate."},
  },
  bbLaundryLocation: {path: "b2bInterior", ...cSegmented(BB_LAUNDRY)},
  bbInteriorFeatures: optional({path: "b2bInterior", ...cChecks(BB_FEATURES)}),
  // Add-more lists: a seller may have nothing extra to add.
  bbOtherInteriorFeatures: optional(listField("b2bInterior", {
    feature: {label: "Interior feature", ...cText(60, "e.g., Skylight")},
  }, {max: 10, ui: {compactItems: true, addLabel: "Add another interior feature"}})),

  // PAGE CT-BB-04 — Basement or lower level
  bbLevelStatus: {
    path: "b2bBasement",
    ...cCards(BB_LEVEL_STATUS, {
      none: "square-dashed", unfinished: "square", partially_finished: "lamp", finished: "sofa",
    }, {helpText: "Selecting \"No basement or lower level\" skips the remaining questions on this page."}),
  },
  bbBasementAccess: optional({
    path: "b2bBasement",
    ...cChecks(BB_ACCESS),
    requiredWhen: BB_HAS_LOWER_LEVEL,
  }),
  bbBedroomsBelowGrade: {path: "b2bBasement", ...rSelect(BB_BELOW_COUNT), requiredWhen: BB_FINISHED},
  bbFullBathroomsBelowGrade: {path: "b2bBasement", ...rSelect(BB_BELOW_COUNT), requiredWhen: BB_FINISHED},
  bbPartialBathroomsBelowGrade: {path: "b2bBasement", ...rSelect(BB_BELOW_COUNT), requiredWhen: BB_FINISHED},
  bbOtherFinishedRooms: optional({path: "b2bBasement", ...cChecks(BB_FINISHED_ROOMS), requiredWhen: BB_FINISHED}),
  bbOtherFinishedRoomsOther: otherText("b2bBasement", "bbOtherFinishedRooms", {multi: true}),
  bbHasSuite: {path: "b2bBasement", ...yesNo("segmented"), requiredWhen: BB_HAS_LOWER_LEVEL},
  bbSuiteLegalStatus: {path: "b2bBasement", ...rSelect(BB_SUITE_STATUS), requiredWhen: IS_TRUE("bbHasSuite")},
  bbSuiteTenantOccupied: {path: "b2bBasement", ...yesNo("segmented"), requiredWhen: IS_TRUE("bbHasSuite")},

  // PAGE CT-BB-05 — Home systems and utilities
  bbHeating: {path: "b2bSystems", ...cSegmented(BB_HEATING)},
  bbHeatingFuel: {path: "b2bSystems", ...rSelect(BB_FUEL)},
  bbCooling: {path: "b2bSystems", ...multiSelect(BB_COOLING, {exclusive: "none", control: "segmented"})},
  bbWaterSupply: {path: "b2bSystems", ...rSelect(BB_WATER)},
  bbElectricalPanel: {path: "b2bSystems", ...rSelect(BB_PANEL)},
  bbElectricalService: {path: "b2bSystems", ...rSelect(BB_SERVICE)},
  bbEquipmentOwnership: optional({
    path: "b2bSystems",
    schema: z.partialRecord(z.enum(BB_EQUIPMENT.values), z.enum(BB_OWNERSHIP.map((c) => c.value))),
    optionValues: BB_EQUIPMENT.values,
    optionLabels: BB_EQUIPMENT.labels,
    ui: {control: "matrix", columns: BB_OWNERSHIP, rowHeader: "Equipment", wide: true},
  }),
  bbOtherEquipment: optional(listField("b2bSystems", {
    equipment: {label: "Rented or leased equipment", ...cText(60, "e.g., Water heater tank")},
  }, {max: 5, ui: {compactItems: true, addLabel: "Add other rented or leased equipment"}})),
  bbAdditionalSystems: {path: "b2bSystems", ...cChecksNone(BB_SYSTEMS)},

  // PAGE CT-BB-06 — Condominium details
  bbCorporationNumber: optional({
    path: "b2bCondo",
    ...cText(50, "For example: TSCC 1234", {helpText: "If you don't know, this can be confirmed from your status certificate."}),
  }),
  bbManagementCompany: optional({path: "b2bCondo", ...cText(150, "Enter company name")}),
  bbMonthlyFee: {path: "b2bCondo", ...cMoney()},
  bbFeeInclusions: optional({path: "b2bCondo", ...cChecks(BB_FEE_INCLUDES)}),
  bbParkingStatus: {path: "b2bCondo", ...rSelect(BB_PARKING_STATUS)},
  bbParkingSpaceNumber: optional({
    path: "b2bCondo",
    ...cText(30, "Enter if known"),
    requiredWhen: {field: "bbParkingStatus", notIn: ["none"]},
  }),
  bbLockerIncluded: {path: "b2bCondo", ...yesNo("segmented")},
  bbLockerStatus: {path: "b2bCondo", ...rSelect(BB_LOCKER_STATUS), requiredWhen: IS_TRUE("bbLockerIncluded")},
  bbLockerNumber: optional({
    path: "b2bCondo",
    ...cText(30, "Enter if known"),
    requiredWhen: IS_TRUE("bbLockerIncluded"),
  }),
  bbSharedAmenities: {path: "b2bCondo", ...cChecksNone(BB_AMENITIES)},

  // PAGE CT-BB-07 — Location and nearby features (Final Listing Information)
  bbNearby: optional({path: "b2bLocation", ...cChecks(BB_NEARBY)}),
  bbLocationHighlights: optional({
    path: "b2bLocation",
    ...cDetails("For example: a quiet townhouse community close to parks, schools, shopping and public transit.", {
      multiline: true,
    }),
  }),
  bbStreetSetting: optional({path: "b2bLocation", ...cChecks(BB_SETTING)}),
  bbFrontExposure: {path: "b2bLocation", ...rSelect(BB_FRONT_EXPOSURE)},
  bbView: {path: "b2bLocation", ...rSelect(BB_VIEW)},

  // PAGE CT-BB-08 — Listing description and included items (Final Listing Information)
  bbClientRemarks: {
    path: "b2bListing",
    ...cText(1500, "For example: Bright, modern back-to-back townhouse with an open-concept main floor, spacious " +
      "bedrooms, private entrance and convenient access to parks, shopping and transit.", {multiline: true}),
  },
  bbChattels: optional({path: "b2bListing", ...cChecks(BB_CHATTELS)}),
  bbOtherChattels: optional(listField("b2bListing", {
    item: {label: "Included item", ...cText(100, "Describe the item")},
  }, {max: 10, ui: {compactItems: true, addLabel: "Add another included item"}})),
  bbNoExcludedFixtures: optional({path: "b2bListing", ...yesNo("checkbox")}),
  bbExcludedFixtures: {
    path: "b2bListing",
    ...cText(500, "For example: dining-room light fixture and wall-mounted television brackets", {
      helpText: "If none are excluded, select \"No excluded fixtures.\"",
    }),
    requiredWhen: {field: "bbNoExcludedFixtures", ne: true},
  },
  bbHasRentedItems: {path: "b2bListing", ...yesNo("segmented")},
  bbRentedItems: {
    path: "b2bListing",
    ...cChecks(BB_RENTED, {prefillFrom: {field: "bbEquipmentOwnership", whereValue: "rented"}}),
    requiredWhen: IS_TRUE("bbHasRentedItems"),
  },
  bbRentalDetails: optional({
    path: "b2bListing",
    ...cText(200, "Enter if known"),
    requiredWhen: IS_TRUE("bbHasRentedItems"),
  }),
};

// Condo Apartment's corporation, amenities, rules, occupancy, location and
// description pages close the Traditional flow.
const CONDO_PAGES_FOR_TOWNHOUSE = [
  "condoCorporation", "condoAmenities", "condoRules", "condoOccupancy", "condoLocation", "condoListing",
];
const TILE_CONTROLS = ["checkboxes", "radio", "cards"];

/** Townhouse mockups draw choices as compact tiles; a field that sets its own layout keeps it. */
function tileOptions(fields) {
  const tile = (def) => {
    const ui = def.ui ?? {};
    const itemFields = def.itemFields && tileOptions(def.itemFields);
    const tiled = def.optionValues?.length && TILE_CONTROLS.includes(ui.control) &&
      !ui.optionStyle && !ui.optionColumns && !ui.optionDescriptions && !ui.clearable;
    if (!tiled && !itemFields) return def;
    return {
      ...def,
      ...(itemFields && {itemFields}),
      ...(tiled && {
        ui: {...ui, control: ui.control === "radio" ? "cards" : ui.control, optionStyle: "row", optionColumns: "auto"},
      }),
    };
  };
  return Object.fromEntries(Object.entries(fields).map(([name, def]) => [name, tile(def)]));
}

const condoTownhouseFields = {
  ...tileOptions(traditionalTownhouseFields),
  ...Object.fromEntries(Object.entries(condoApartmentFields)
      .filter(([, def]) => CONDO_PAGES_FOR_TOWNHOUSE.includes(def.path))),
  ...tileOptions(bungalowTownhouseFields),
  ...tileOptions(backToBackTownhouseFields),
};

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
  detached: {...detachedFields, ...listingRemarksFields, ...saleItemsFields},

  semiDetached: semiDetachedFields,

  rural: ruralFields,

  residentialIncome: {...residentialIncomeFields, ...saleItemsFields},

  condoApartment: condoApartmentFields,

  // Replaced once its sections exist (applySectionConditions, below them).
  condoTownhouse: condoTownhouseFields,
};

// The old Stacked Townhouse type key stays for existing drafts and uses the
// condo townhouse pages. Co-operative Apartment reuses Condo Apartment's pages
// until it has its own.
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
const RI_UNSURE_NOTICE = "Tell us what you know. You can leave anything you're unsure about for review.";
const RI_EDIT_LATER_TIP = "You can come back and edit this information at any time before submitting your listing.";
/** Residential income sidebar photo (no `file` = placeholder). */
const riPhoto = (file, alt) => ({type: "image", image: {...(file && {src: `/assets/images/create-listing/${file}`}), alt}});

// Detached's Exterior & Lot page; semi-detached reuses it (see below).
const exteriorLotSection = {
  id: "exterior-lot",
  title: "Exterior & Lot",
  paths: ["exteriorLot"],
  subtitle: "Tell us what you know about the outside of the home and the property.",
  groupStyle: "titled",
  groups: [
    {
      title: "About the home",
      columns: 2,
      fields: ["homeStyle", "numberOfStoreys", "approxYearBuilt", "primaryExteriorFinish"],
    },
    {title: "Approximate lot size", columns: 3, fields: ["lotWidth", "lotDepth", "lotMeasurementUnit"]},
    {
      title: "Property setting",
      fields: ["propertySetting"],
      note: {
        style: "tip",
        text: "We'll ask about nearby schools, shopping, parks, transit, highways and other location benefits " +
          "later, when you tell us what buyers will love about the property.",
      },
    },
    {
      title: "Additional building or living space",
      fields: ["additionalBuildingOrLivingSpace"],
      note: {style: "tip", text: "If there is a separate living space, we'll ask a few more relevant questions later."},
    },
  ],
  panels: [{
    type: "guide",
    image: {src: "/assets/images/create-listing/detached-exterior-lot.jpg", alt: "Two-storey detached home with a front porch"},
    icon: "house",
    title: "Your Property at a Glance",
    items: [
      {
        icon: "clipboard-check",
        title: "Why we're asking",
        body: "These details help us prepare your MLS® listing and highlight important property features.",
      },
      {
        icon: "user-round",
        title: "Tell us what you know",
        body: "We'll review available property information and confirm important details before your listing " +
          "is published.",
      },
      {
        icon: "circle-arrow-right",
        title: "Coming next",
        body: "Next, we'll ask about the driveway, parking, garage and outdoor areas.",
      },
    ],
  }],
};

/** Rural sidebars: photo, "why" callout, "What to have ready" checklist, tip, security note. */
function ruralPanels({image, why, ready, readyIcon, tip}) {
  return [
    {type: "image", image},
    {type: "callout", tone: "green", ...why},
    {type: "checklist", title: "What to have ready", items: ready, icon: readyIcon},
    {type: "callout", tone: "yellow", icon: "lightbulb", title: "Tip", body: tip},
    {
      type: "callout",
      tone: "plain",
      icon: "shield",
      title: "Your information is secure",
      body: "Your information is kept private and used only to create and manage your listing.",
    },
  ];
}

/** Condo apartment sidebars: a titled box of icon cards; each page also has a `heroImage`. */
const condoCards = (title, items) => [{type: "cards", title, items}];
const CONDO_PAGE = {eyebrow: "Condo Apartment", groupStyle: "numberedTitle", requiredMarker: "asterisk"};

const condoApartmentSections = [
  {
    ...CONDO_PAGE,
    id: "unit-basics",
    title: "Tell us about your condominium",
    paths: ["condoUnit"],
    subtitle: "Start with the unit, building and features that describe your property.",
    heroImage: {src: "/assets/images/create-listing/condo-unit-basics.jpg", alt: "Condo living room and kitchen with a city view", aspectRatio: "3/1"},
    groupStyle: "titled",
    groups: [{
      title: "Building & Unit Basics",
      columns: 2,
      fields: [
        "condoStyle", "buildingStoreys", "unitLevel", "squareFootage", "squareFootageSource", "unitExposure",
        "privateOutdoorSpace",
      ],
    }],
    panels: condoCards("About your condo listing", [
      {
        icon: "building",
        title: "Unit and level",
        body: "Enter the unit's actual level, even when the building markets floors differently.",
      },
      {
        icon: "ruler",
        title: "Required square footage",
        body: "Provide the best supported figure and its source. We'll review it against the available condominium " +
          "documents.",
      },
      {
        icon: "umbrella",
        title: "Outdoor space",
        body: "Balconies, terraces and patios are recorded separately and are not included in the unit's square footage.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "parking-locker",
    title: "Parking & Locker Details",
    paths: ["condoParkingLocker"],
    subtitle: "Tell us what is included with the unit. We'll only show questions that apply.",
    heroImage: {src: "/assets/images/create-listing/condo-parking-locker.jpg", alt: "Underground parking garage and storage lockers", aspectRatio: "3/1"},
    groupStyle: "plain",
    groups: [
      {
        title: "Parking",
        hint: "Does the unit include parking?",
        headerField: "parkingIncluded",
        fields: ["parkingIncluded", "parkingSpaces"],
      },
      {
        title: "Locker",
        hint: "Does the unit include a locker?",
        headerField: "lockerIncluded",
        fields: ["lockerIncluded", "lockers"],
      },
    ],
    panels: condoCards("Why these details matter", [
      {
        icon: "file-text",
        title: "Owned or exclusive use?",
        body: "Select what your condominium documents show. We'll verify the legal description during review.",
      },
      {
        icon: "square-plus",
        title: "More than one?",
        body: "Add a separate card for every parking space or locker included with the unit.",
      },
      {
        icon: "list",
        title: "Numbers and levels",
        body: "Use the identifiers shown on the parking stall, locker door or condominium documents.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "corporation-fees",
    title: "Condominium Corporation & Fees",
    paths: ["condoCorporation"],
    subtitle: "Tell us about the corporation, monthly fees and any additional assessments.",
    heroImage: {src: "/assets/images/create-listing/condo-corporation-lobby.jpg", alt: "Condominium lobby and concierge desk", aspectRatio: "3/1"},
    groups: [
      {
        title: "Condominium corporation",
        columns: 2,
        fields: ["condoCorporation", "managementCompany", "managerContact", "managementTelephone"],
      },
      {title: "Monthly maintenance fee", columns: 2, fields: ["monthlyFee", "feeInclusions"]},
      {
        title: "Special assessments",
        hint: "Is there a current or approved special assessment?",
        headerField: "hasSpecialAssessment",
        columns: 3,
        revealPanel: true,
        fields: [
          "hasSpecialAssessment", "assessmentAmount", "assessmentFrequency", "assessmentEndDate",
          "assessmentPurpose", "assessmentPaidInFull",
        ],
      },
      {
        title: "Status certificate",
        hint: "Do you have a current status certificate?",
        headerField: "statusCertificate",
        fields: ["statusCertificate"],
      },
    ],
    panels: condoCards("About condominium information", [
      {
        icon: "file-text",
        title: "Corporation number",
        body: "Usually shown on the status certificate, maintenance-fee statement or condominium documents.",
      },
      {
        icon: "clipboard-check",
        title: "Fee inclusions",
        body: "Choose only services paid through the regular monthly condominium fee.",
      },
      {
        icon: "coins",
        title: "Special assessments",
        body: "Disclose any current or approved assessment. We'll review the supporting documents before activation.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "interior-rooms",
    title: "Interior Rooms & Features",
    paths: ["condoInterior"],
    subtitle: "Tell us about the rooms, finishes and systems inside the unit.",
    heroImage: {src: "/assets/images/create-listing/condo-interior-rooms.jpg", alt: "Condo living and dining area with a bedroom beyond", aspectRatio: "3/1"},
    groups: [
      {title: "Bedrooms & bathrooms", fields: ["bedrooms", "dens", "fullBathrooms", "powderRooms"]},
      {
        title: "Principal rooms",
        hint: "Which rooms are in the unit?",
        headerField: "principalRooms",
        fields: ["principalRooms", "otherInteriorRoom"],
      },
      {title: "Interior features", headerField: "interiorFeatures", fields: ["interiorFeatures"]},
      {
        title: "Unit systems & finishes",
        columns: 3,
        fields: ["laundry", "heating", "cooling", "primaryFlooring", "appliances"],
      },
    ],
    panels: condoCards("Describing the interior", [
      {
        icon: "bed",
        title: "Bedrooms and dens",
        body: "Count bedrooms separately from dens or offices. We'll review how each room may be described on MLS®.",
      },
      {
        icon: "clipboard-check",
        title: "Select what applies",
        body: "Choose only rooms and features that are physically inside this condominium unit.",
      },
      {
        icon: "ruler",
        title: "Measurements come next",
        body: "Room dimensions can be confirmed during the verification and listing-review process.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "building-amenities",
    title: "Building Amenities & Services",
    paths: ["condoAmenities"],
    subtitle: "Select the shared amenities and services available to residents.",
    heroImage: {alt: "Building fitness centre and indoor pool", aspectRatio: "3/1"},
    groups: [
      {
        title: "Entry, security & resident services",
        hint: "Which services are available?",
        columns: 2,
        fields: ["concierge", "entryServices"],
      },
      {title: "Fitness, wellness & recreation", headerField: "fitnessAmenities", fields: ["fitnessAmenities"]},
      {title: "Social & outdoor amenities", headerField: "socialAmenities", fields: ["socialAmenities"]},
      {
        title: "Parking, access & practical amenities",
        headerField: "practicalAmenities",
        fields: ["practicalAmenities"],
      },
      {
        title: "Is there another shared amenity?",
        headerField: "hasOtherAmenity",
        unnumbered: true,
        fields: ["hasOtherAmenity", "otherAmenities"],
      },
    ],
    panels: condoCards("Selecting building amenities", [
      {
        icon: "users",
        title: "Shared amenities only",
        body: "Choose features maintained for residents by the condominium corporation.",
      },
      {
        icon: "clipboard-check",
        title: "Confirm availability",
        body: "Select only amenities currently operating or officially available to residents.",
      },
      {
        icon: "house",
        title: "Not inside the unit",
        body: "Private-unit features, balcony, parking and locker details are recorded on earlier pages.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "rules-restrictions",
    title: "Condominium Rules & Restrictions",
    paths: ["condoRules"],
    subtitle: "Tell us about rules that may affect how an owner or occupant can use the unit.",
    heroImage: {src: "/assets/images/create-listing/condo-rules-balcony.jpg", alt: "Condo balcony overlooking the city", aspectRatio: "3/1"},
    groups: [
      {
        title: "Pets",
        columns: 3,
        fields: ["petsPermitted", "permittedPets", "maxPets", "maxPetWeight", "petRestrictionDetails"],
      },
      {
        title: "Balcony & outdoor use",
        columns: 1,
        fields: ["bbqPermitted", "bbqRestrictionDetails", "hasOtherBalconyRestrictions", "balconyRestrictionDetails"],
      },
      {
        title: "Smoking & vaping",
        hint: "What do the condominium rules provide?",
        headerField: "smokingVapingRules",
        fields: ["smokingVapingRules", "smokingVapingDetails"],
      },
      {
        title: "Rental restrictions",
        columns: 2,
        fields: ["longTermLeasing", "longTermLeasingDetails", "shortTermRentals", "shortTermRentalDetails"],
      },
      {
        title: "Information source",
        hint: "How did you confirm these rules?",
        headerField: "rulesSources",
        fields: ["rulesSources"],
      },
      {
        title: "Are there other restrictions a buyer should know about?",
        headerField: "hasOtherRestrictions",
        unnumbered: true,
        fields: ["hasOtherRestrictions", "otherRestrictionsDetails"],
      },
    ],
    panels: condoCards("Why we ask", [
      {
        icon: "file-text",
        title: "Use confirmed information",
        body: "Answer from the condominium documents or information provided by property management.",
      },
      {
        icon: "clipboard-check",
        title: "Restricted means details",
        body: "Whenever Restricted is selected, describe the rule so it can be reviewed accurately.",
      },
      {
        icon: "house",
        title: "Brokerage review",
        body: "We'll compare these answers with the available condominium documents before activation.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "occupancy-tenancy",
    title: "Occupancy & Tenancy",
    paths: ["condoOccupancy"],
    subtitle: "Tell us how the unit is occupied and what possession is expected on closing.",
    heroImage: {alt: "Condo unit entrance and living room", aspectRatio: "3/1"},
    groups: [
      {
        title: "Current occupancy",
        hint: "What best describes the unit?",
        headerField: "currentOccupancy",
        fields: ["currentOccupancy"],
      },
      {
        title: "Tenancy details",
        hint: "What is the tenancy situation?",
        headerField: "tenancySituation",
        fields: [
          "tenancySituation", "writtenTenancyAgreement", "tenancyIncludesParking", "tenancyIncludesLocker",
          "tenantRemainsAfterClosing",
        ],
        note: {
          style: "warning",
          icon: "circle-check",
          title: "Listing status: Sold with tenant remaining",
          text: "The brokerage will review the tenancy documents and possession information before the listing is " +
            "activated.",
          when: {field: "tenantRemainsAfterClosing", in: [true]},
        },
      },
      {
        title: "Tenancy documents",
        fields: ["tenancyAgreementAvailable", "hasOtherOccupancyAgreements", "otherOccupancyAgreementsDetails"],
      },
    ],
    panels: condoCards("Selling an occupied condominium", [
      {
        icon: "file-text",
        title: "Tenancy affects possession",
        body: "An existing tenancy may continue after the sale unless vacant possession is lawfully available.",
      },
      {
        icon: "building",
        title: "Condominium rules still apply",
        body: "The tenant's use of parking, lockers and shared amenities remains subject to the condominium documents.",
      },
      {
        icon: "clipboard-check",
        title: "Brokerage review required",
        body: "Selecting an answer does not itself end a tenancy or guarantee vacant possession. We'll review the " +
          "available documents before activation.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "location-nearby",
    title: "Location & Nearby Features",
    paths: ["condoLocation"],
    stage: "finalListing",
    subtitle: "Select the places, services and connections that help describe this location.",
    heroImage: {src: "/assets/images/create-listing/condo-location-street.jpg", alt: "Tree-lined city street with a streetcar", aspectRatio: "3/1"},
    groups: [
      {
        title: "Area setting",
        hint: "How would you describe the setting?",
        headerField: "areaSetting",
        fields: ["areaSetting", "areaSettingOther"],
      },
      {
        title: "Transit & transportation",
        hint: "Select all that apply.",
        headerField: "transitAccess",
        fields: ["transitAccess"],
      },
      {
        title: "Everyday services",
        hint: "Select all that apply.",
        headerField: "everydayServices",
        fields: ["everydayServices"],
      },
      {
        title: "Parks, recreation & destinations",
        hint: "Select all that apply.",
        headerField: "parksDestinations",
        columns: 1,
        fields: ["parksDestinations", "hasOtherNearbyFeature", "otherNearbyFeatures", "locationLikes"],
      },
    ],
    panels: condoCards("Describing the location", [
      {
        icon: "map-pin",
        title: "Select what is genuinely nearby",
        body: "Choose features that reasonably help a buyer understand the property's location.",
      },
      {
        icon: "shield",
        title: "Avoid unverified claims",
        body: "Do not enter travel times, school rankings or guaranteed access unless they can be confirmed.",
      },
      {
        icon: "pencil",
        title: "We'll shape the wording",
        body: "Your selections support the listing draft; they are not automatically published as written.",
      },
    ]),
  },
  {
    ...CONDO_PAGE,
    id: "listing-description",
    title: "Listing Description & Inclusions",
    paths: ["condoListing"],
    stage: "finalListing",
    subtitle: "Help us prepare the buyer-facing description and record what is included with the sale.",
    heroImage: {src: "/assets/images/create-listing/condo-listing-description.jpg", alt: "Condo kitchen and living area", aspectRatio: "3/1"},
    continueLabel: "Review Listing Details",
    groups: [
      {
        title: "Client remarks",
        hint: "Describe what makes this property special",
        headerField: "clientRemarks",
        fields: ["clientRemarks"],
      },
      {
        title: "Items included with the sale",
        hint: "We carried forward the appliances you selected earlier. Confirm what will remain with the property.",
        headerField: "includedItems",
        fields: ["includedItems", "otherIncludedItems"],
        row: "items",
      },
      {
        title: "Excluded fixtures",
        hint: "Are any fixtures excluded from the sale?",
        headerField: "hasExcludedFixtures",
        fields: ["hasExcludedFixtures", "excludedFixtures"],
        row: "items",
      },
      {
        title: "Rented or leased items",
        hint: "Are any items rented or leased?",
        headerField: "hasRentedItems",
        fields: ["hasRentedItems", "rentedItems"],
        note: {
          style: "warning",
          icon: "info",
          title: "Before documents are prepared",
          text: "The brokerage will review inclusions, exclusions and rental items with you. Required listing " +
            "documents will reflect the confirmed information.",
        },
      },
    ],
    panels: condoCards("Preparing accurate listing information", [
      {
        icon: "message-circle-more",
        title: "Tell us in your own words",
        body: "Focus on factual features and improvements. Avoid guarantees or claims that cannot be supported.",
      },
      {
        icon: "clipboard-check",
        title: "Included or excluded?",
        body: "Clearly identify anything a buyer could reasonably expect to remain but that the seller intends to " +
          "remove.",
      },
      {
        icon: "file-text",
        title: "Rental obligations matter",
        body: "Disclose equipment or services that may require an assumption, payout or separate arrangement.",
      },
    ]),
  },
];

/** Condo townhouse pages. A section's `when` shows the page only while it holds. */
const TOWNHOUSE_PAGE = {eyebrow: "Condo Townhouse", groupStyle: "numbered", requiredMarker: "asterisk"};
const BUNGALOW_PAGE = {eyebrow: "Bungalow Townhouse", groupStyle: "numbered", when: TH_BUNGALOW};
const B2B_PAGE = {eyebrow: "Condo Townhouse", groupStyle: "numbered", when: TH_BACK_TO_BACK};

function bungalowPanels(image, items, tipTitle = "Not sure? That's okay.") {
  return [
    {type: "image", image},
    {type: "cards", items},
    {
      type: "callout",
      tone: "yellow",
      icon: "lightbulb",
      title: tipTitle,
      body: "Provide what you know. The brokerage will review all information before your listing is entered on MLS®.",
    },
    {
      type: "callout",
      tone: "plain",
      icon: "shield-check",
      title: "Your information is secure",
      body: "Your information is kept private and used only to create and manage your listing.",
    },
  ];
}

function backToBackPanels(image, paragraphs, note = null, noteIcon = "info") {
  return [
    {type: "image", image},
    ...paragraphs.map(([title, body]) => ({type: "text", title, body})),
    ...(note ? [{type: "callout", tone: "green", icon: noteIcon, body: note}] : []),
  ];
}

const BUNGALOW_EXTERIOR_PHOTO = {src: "/assets/images/create-listing/th-bungalow-exterior.jpg", alt: "Bungalow townhouse exterior"};
const BUNGALOW_INTERIOR_PHOTO = {src: "/assets/images/create-listing/th-bungalow-interior.jpg", alt: "Bungalow townhouse kitchen and living area"};
const BUNGALOW_PARKING_PHOTO = {src: "/assets/images/create-listing/th-bungalow-parking.jpg", alt: "Bungalow townhouse driveway, garage and visitor parking"};
const BUNGALOW_STREET_PHOTO = {src: "/assets/images/create-listing/th-bungalow-street.jpg", alt: "Bungalow townhouse street"};

const traditionalTownhouseSections = [
  {
    ...TOWNHOUSE_PAGE,
    id: "unit-basics",
    title: "Tell us about your condominium townhouse",
    paths: ["townhouseBasics"],
    subtitle: "Start with the townhouse configuration, unit position and required size information.",
    heroImage: {src: "/assets/images/create-listing/th-traditional-unit-basics.jpg", alt: "Row of brick townhouses along a tree-lined sidewalk", aspectRatio: "3/1"},
    groupsTitle: "Townhouse Configuration & Unit Basics",
    groups: [
      {
        title: "Townhouse configuration",
        hint: "Which configuration best describes the unit?",
        headerField: "townhouseConfiguration",
        fields: ["townhouseConfiguration"],
      },
      {title: "Unit arrangement", fields: ["unitPosition", "numberOfStoreys", "unitAccess", "unitAccessOther"]},
      {
        title: "Size & building information",
        columns: 2,
        fields: ["squareFootage", "squareFootageSource", "yearBuilt", "unitExposure"],
      },
      {
        title: "Does the unit have a basement or below-grade living space?",
        headerField: "hasBasement",
        fields: ["hasBasement"],
      },
    ],
    panels: condoCards("Identifying the townhouse", [
      {
        icon: "house",
        title: "Choose the physical configuration",
        body: "Select how the unit is constructed, not how the condominium corporation describes its marketing model.",
      },
      {
        icon: "building",
        title: "End or interior unit",
        body: "An end unit has an exterior side wall; an interior unit is attached on both sides.",
      },
      {
        icon: "file-text",
        title: "Required square footage",
        body: "Provide the best supported figure and its source. We'll review it against available property and " +
          "condominium documents.",
      },
    ]),
  },
  {
    ...TOWNHOUSE_PAGE,
    id: "exterior-outdoor",
    title: "Exterior & Private Outdoor Features",
    paths: ["townhouseExterior"],
    when: TH_TRADITIONAL,
    subtitle: "Tell us about the unit's exterior materials, entrance and outdoor areas.",
    heroImage: {src: "/assets/images/create-listing/th-traditional-exterior.jpg", alt: "Townhouse patio and fenced yard", aspectRatio: "3/1"},
    groups: [
      {
        title: "Exterior materials",
        hint: "Which exterior finishes apply?",
        headerField: "exteriorMaterials",
        fields: ["exteriorMaterials", "exteriorMaterialsOther"],
      },
      {
        title: "Entrance & outdoor spaces",
        hint: "Which features are connected to the unit?",
        headerField: "outdoorSpaces",
        fields: ["outdoorSpaces"],
      },
      {
        title: "Outdoor-area interest",
        fields: ["outdoorInterest", "yardFenced", "outdoorFeatures", "outdoorMaintainer"],
      },
      {
        title: "Garage & driveway",
        fields: ["hasGarage", "garageType", "garageSpaces", "hasDriveway", "drivewaySpaces"],
        note: {
          style: "plain",
          text: "Parking ownership, exclusive-use status, levels and space numbers are recorded on the next Parking & " +
            "Locker page.",
        },
      },
    ],
    panels: condoCards("Understanding condo-townhouse exteriors", [
      {
        icon: "house",
        title: "Exterior may be common element",
        body: "A space can appear private while ownership or maintenance remains governed by the condominium documents.",
      },
      {
        icon: "file-text",
        title: "Exclusive use is not ownership",
        body: "Exclusive use generally means the unit has the right to use a defined common-element area.",
      },
      {
        icon: "car",
        title: "Parking details come next",
        body: "This page records physical garage and driveway features. The next page records the legal parking " +
          "interest and identifiers.",
      },
    ]),
  },
  {
    ...TOWNHOUSE_PAGE,
    id: "parking-locker",
    title: "Parking & Locker Details",
    paths: ["townhouseParking"],
    when: TH_TRADITIONAL,
    subtitle: "Confirm the parking provided with the unit and record its condominium interest.",
    heroImage: {src: "/assets/images/create-listing/th-traditional-parking.jpg", alt: "Townhouse garage and private driveway", aspectRatio: "2/1"},
    groups: [
      {
        fields: [],
        content: {
          variant: "summary",
          title: "From Exterior & Private Outdoor Features",
          lines: [
            {when: HAS_GARAGE, text: "{garageType} garage • {garageSpaces|space|spaces} shown"},
            {when: {field: "hasDriveway", in: ["yes"]}, text: "Private driveway • {drivewaySpaces|space|spaces} shown"},
            {when: {field: "hasDriveway", in: ["shared"]}, text: "Shared driveway • {drivewaySpaces|space|spaces} shown"},
          ],
          empty: "No garage or driveway was recorded.",
          edit: {section: "exterior-outdoor", label: "Edit exterior details"},
        },
      },
      {
        title: "Garage & driveway parking",
        fields: [
          "garagePermitted", "garagePermittedSpaces", "garageInterest", "garageIdentifier",
          "drivewayPermitted", "drivewayPermittedSpaces", "drivewayInterest", "drivewayIdentifier",
        ],
        boxes: [
          {
            title: "Private garage",
            hint: "Does the garage provide permitted parking?",
            headerField: "garagePermitted",
            fields: ["garagePermitted", "garagePermittedSpaces", "garageInterest", "garageIdentifier"],
          },
          {
            title: "Private driveway",
            hint: "Does the driveway provide permitted parking?",
            headerField: "drivewayPermitted",
            fields: ["drivewayPermitted", "drivewayPermittedSpaces", "drivewayInterest", "drivewayIdentifier"],
          },
        ],
        total: {
          icon: "car",
          text: "Total confirmed parking: {total} spaces",
          sum: ["garagePermittedSpaces", "drivewayPermittedSpaces"],
        },
      },
      {
        title: "Other parking",
        hint: "Is any additional parking included?",
        headerField: "hasOtherParking",
        fields: ["hasOtherParking", "otherParkingSpaces"],
      },
      {
        title: "Locker",
        hint: "Does the unit include a locker?",
        headerField: "lockerIncluded",
        fields: ["lockerIncluded", "lockers"],
      },
    ],
    panels: condoCards("Confirming parking and storage", [
      {
        icon: "car",
        title: "A driveway is not automatically parking",
        body: "Confirm that the space is permitted for vehicle parking under the condominium documents and rules.",
      },
      {
        icon: "file-text",
        title: "Physical space and legal interest",
        body: "Record whether parking or storage is part of the unit, exclusive use or rented/leased.",
      },
      {
        icon: "clipboard-check",
        title: "Carried forward, then confirmed",
        body: "Garage and driveway features come from the previous page, but only confirmed permitted spaces count " +
          "in the listing.",
      },
    ]),
  },
  {
    ...TOWNHOUSE_PAGE,
    id: "interior-rooms",
    title: "Interior Rooms & Features",
    paths: ["townhouseInterior"],
    when: TH_TRADITIONAL,
    subtitle: "Tell us about the rooms, finishes and systems above grade.",
    heroImage: {src: "/assets/images/create-listing/th-traditional-interior.jpg", alt: "Townhouse living room, kitchen and staircase", aspectRatio: "1962/802"},
    groups: [
      {
        title: "Bedrooms & bathrooms",
        fields: ["bedroomsAboveGrade", "densAboveGrade", "fullBathroomsAboveGrade", "powderRoomsAboveGrade"],
        note: {style: "plain", text: "Basement bedrooms and bathrooms are recorded separately when a Basement page is added."},
      },
      {
        title: "Living & principal rooms",
        fields: ["livingDiningLayout", "additionalRooms", "otherAboveGradeRoom"],
      },
      {title: "Townhouse interior features", headerField: "interiorFeatures", fields: ["interiorFeatures"]},
      {
        title: "Systems, finishes & appliances",
        fields: ["laundryLocation", "heating", "cooling", "primaryFlooring", "appliances"],
      },
    ],
    panels: condoCards("Describing a multi-level interior", [
      {
        icon: "house",
        title: "Above grade only",
        body: "Count rooms on the main and upper levels here. Basement spaces are recorded separately.",
      },
      {
        icon: "clipboard-check",
        title: "Avoid duplicate rooms",
        body: "Choose either a combined living/dining area or separate living and dining rooms.",
      },
      {
        icon: "clipboard-list",
        title: "Carried-forward features",
        body: "Garage access and basement-dependent choices appear only when supported by earlier answers.",
      },
    ]),
  },
  {
    ...TOWNHOUSE_PAGE,
    id: "basement",
    title: "Basement Details",
    paths: ["townhouseBasement"],
    when: {allOf: [TH_TRADITIONAL, IS_TRUE("hasBasement")]},
    subtitle: "Tell us about the below-grade space, access, rooms and current use.",
    heroImage: {src: "/assets/images/create-listing/th-traditional-basement.jpg", alt: "Finished townhouse basement", aspectRatio: "1966/800"},
    groups: [
      {title: "Basement finish", fields: ["basementFinish", "finishedBasementArea"]},
      {
        title: "Basement access",
        hint: "How can the basement be accessed?",
        headerField: "basementAccess",
        fields: ["basementAccess"],
      },
      {
        title: "Rooms & features",
        fields: [
          "bedroomsBelowGrade", "fullBathroomsBelowGrade", "powderRoomsBelowGrade", "kitchensBelowGrade",
          "basementRooms", "otherBasementRooms",
        ],
      },
      {
        title: "Basement apartment or separate living area",
        fields: [
          "hasBasementApartment", "basementApartmentStatus", "apartmentSeparateEntrance", "apartmentOwnKitchen",
          "apartmentOwnBathroom",
        ],
        note: {
          style: "plain",
          text: "The brokerage will review the available documents before deciding how the space may be described in " +
            "the listing.",
          when: {field: "hasBasementApartment", in: [true]},
        },
      },
      {
        title: "Current use & occupancy",
        fields: ["basementOccupancy", "basementOccupantRemains", "basementWrittenAgreement"],
        note: {
          style: "warning",
          icon: "circle-alert",
          title: "Listing status: Sold with occupant/tenant remaining",
          text: "The occupancy and tenancy information will carry forward to the Occupancy & Tenancy page for " +
            "brokerage review.",
          when: {field: "basementOccupantRemains", in: [true]},
        },
      },
    ],
    panels: condoCards("Describing basement space accurately", [
      {
        icon: "house",
        title: "Above and below grade stay separate",
        body: "Do not combine finished basement area with the unit's required above-grade square footage.",
      },
      {
        icon: "door-open",
        title: "A separate entrance is not legal status",
        body: "Access, kitchen and bathroom features do not by themselves establish a lawful apartment.",
      },
      {
        icon: "users",
        title: "Tenancy affects possession",
        body: "If an occupant or tenant remains, that condition must be carried through the listing and transaction " +
          "documents.",
      },
    ]),
  },
  // The rest of the Traditional flow is Condo Apartment's pages.
  ...condoApartmentSections
      .filter((s) => s.paths.every((p) => CONDO_PAGES_FOR_TOWNHOUSE.includes(p)))
      .map((s) => ({...s, eyebrow: "Condo Townhouse", when: TH_TRADITIONAL})),
];

const bungalowTownhouseSections = [
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-exterior",
    title: "Exterior & Property Basics",
    paths: ["bungalowExterior"],
    subtitle: "Tell us about the exterior and basic characteristics of your bungalow townhouse.",
    groups: [
      {
        title: "Position within the townhouse row",
        hint: "Where is your bungalow townhouse positioned?",
        headerField: "bgPosition",
        fields: ["bgPosition"],
      },
      {title: "Levels / storeys", hint: "How is the home configured?", headerField: "bgLevels", fields: ["bgLevels", "bgLevelsOther"]},
      {title: "Approximate year built", hint: "When was the property built?", headerField: "bgYearBuilt", fields: ["bgYearBuilt"]},
      {
        title: "Exterior construction",
        hint: "Select all that apply.",
        headerField: "bgExteriorConstruction",
        fields: ["bgExteriorConstruction", "bgExteriorOther"],
      },
      {
        title: "Exterior exposure / orientation",
        hint: "Which direction does the front of the home face?",
        headerField: "bgFrontExposure",
        fields: ["bgFrontExposure"],
      },
      {
        title: "Private outdoor features",
        hint: "Select everything that belongs with or is available for this unit.",
        headerField: "bgOutdoorFeatures",
        fields: ["bgOutdoorFeatures", "bgOutdoorOther"],
      },
    ],
    panels: bungalowPanels(BUNGALOW_EXTERIOR_PHOTO, [
      {
        icon: "house",
        title: "Why we ask this",
        body: "These details help buyers understand your home and help us present it accurately on MLS®.",
      },
      {
        icon: "sun",
        title: "End units can matter",
        body: "End units often have more windows, natural light, and extra outdoor exposure.",
      },
      {
        icon: "tree-deciduous",
        title: "Outdoor space counts",
        body: "Patios, yards and outdoor areas are features many buyers value in a bungalow townhouse.",
      },
    ], "Don't worry if you're unsure."),
  },
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-interior",
    title: "Interior Details",
    paths: ["bungalowInterior"],
    subtitle: "Tell us about the interior layout, rooms and features of your bungalow townhouse.",
    groups: [
      {
        title: "Bedrooms & bathrooms",
        fields: ["bgBedrooms", "bgBedroomFeatures", "bgBathrooms", "bgBathroomFeatures"],
        boxes: [
          {
            title: "Bedrooms",
            hint: "How many bedrooms are in the home?",
            headerField: "bgBedrooms",
            fields: ["bgBedrooms", "bgBedroomFeatures"],
          },
          {
            title: "Bathrooms",
            hint: "How many bathrooms are in the home?",
            headerField: "bgBathrooms",
            fields: ["bgBathrooms", "bgBathroomFeatures"],
          },
        ],
      },
      {
        title: "Principal rooms",
        columns: 4,
        fields: ["bgLivingRooms", "bgDiningRooms", "bgKitchens", "bgFamilyRooms", "bgDensOffices", "bgEatingAreas", "bgOpenConcept"],
      },
      {title: "Kitchen details", fields: ["bgKitchenType", "bgAppliances", "bgAppliancesOther"]},
      {
        title: "Laundry",
        hint: "Where is the laundry located?",
        headerField: "bgLaundryLocation",
        fields: ["bgLaundryLocation", "bgLaundryOther"],
        note: {
          style: "tip",
          icon: "washing-machine",
          text: "Main floor laundry is a popular feature in bungalow townhouses and adds convenience for many buyers.",
        },
      },
      {
        title: "Mechanical & utilities",
        columns: 5,
        fields: ["bgHeating", "bgCooling", "bgWaterSupply", "bgSewer", "bgElectricalService"],
      },
      {
        title: "Interior features",
        hint: "Select all that apply to your home.",
        headerField: "bgInteriorFeatures",
        fields: ["bgInteriorFeatures", "bgInteriorFeaturesOther"],
      },
      {
        title: "Additional interior notes (optional)",
        hint: "Is there anything else about the interior that buyers should know?",
        headerField: "bgInteriorNotes",
        fields: ["bgInteriorNotes"],
      },
    ],
    panels: bungalowPanels(BUNGALOW_INTERIOR_PHOTO, [
      {icon: "sofa", title: "Show the comfort and livability", body: "Buyers love to know how the space is laid out and how rooms are used."},
      {
        icon: "door-open",
        title: "Main floor living is a big advantage",
        body: "Bungalows offer the ease of one-level living that many buyers are looking for.",
      },
      {
        icon: "sun",
        title: "Light, flow and function matter",
        body: "Details like open concept, main floor laundry and quality finishes help your listing stand out.",
      },
    ], "Don't worry if you're unsure."),
  },
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-basement",
    title: "Basement & Additional Living Spaces",
    paths: ["bungalowBasement"],
    subtitle: "Tell us about the basement and any additional living spaces that belong with or are included in your " +
      "bungalow townhouse.",
    groups: [
      {
        title: "Basement information",
        columns: 4,
        fields: ["bgHasBasement", "bgBasementType", "bgBasementFinish", "bgBasementAccess"],
      },
      {
        title: "Basement features",
        hint: "Select all that apply.",
        headerField: "bgBasementFeatures",
        fields: ["bgBasementFeatures", "bgBasementFeaturesOther"],
      },
      {title: "Basement apartment / in-law suite", fields: ["bgBasementApartment", "bgApartmentLegal"]},
      {
        title: "Additional living spaces (above or beyond the main level)",
        fields: ["bgHasAdditionalSpaces", "bgAdditionalSpaces", "bgAdditionalSpacesOther"],
      },
    ],
    panels: bungalowPanels(BUNGALOW_INTERIOR_PHOTO, [
      {
        icon: "house",
        title: "Basement space adds value",
        body: "Finished basements, walk-outs and separate entrances can expand living space and appeal to more buyers.",
      },
      {
        icon: "users",
        title: "Legal matters",
        body: "If there is a lower-level apartment, it's important to know if it is legal or non-legal (grandfathered).",
      },
      {
        icon: "trending-up",
        title: "Additional spaces count",
        body: "Lofts, sunrooms, solariums and other bonus spaces can make your home stand out.",
      },
    ]),
  },
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-parking",
    title: "Parking & Condo Features",
    paths: ["bungalowParking"],
    subtitle: "Tell us about the parking and any condo or community features that apply to your bungalow townhouse.",
    groups: [
      {
        title: "Parking",
        hint: "What parking spaces are included with this property?",
        headerField: "bgParkingTypes",
        fields: ["bgParkingTypes", "bgParkingSpaces"],
      },
      {title: "Garage details (if applicable)", fields: ["bgGarageVehicles", "bgGarageFeatures", "bgGarageFeaturesOther"]},
      {
        title: "Condo / community features",
        hint: "Which of the following features or services are included in your condo or community?",
        headerField: "bgCommunityFeatures",
        fields: ["bgCommunityFeatures", "bgCommunityOther"],
      },
      {title: "Condo fees & inclusions", fields: ["bgHasCondoFees", "bgMonthlyFee", "bgFeeInclusions"]},
      {fields: [], content: {variant: "notice", body: "Condo fees and features help buyers understand the full value of your home."}},
    ],
    panels: bungalowPanels(BUNGALOW_PARKING_PHOTO, [
      {
        icon: "car",
        title: "Parking matters",
        body: "Buyers want to know how easy and convenient parking will be for them and their guests.",
      },
      {
        icon: "building",
        title: "Condo features add value",
        body: "Shared amenities and services can make your property more attractive to buyers.",
      },
      {
        icon: "circle-dollar-sign",
        title: "Be transparent",
        body: "Accurate details about fees and inclusions build trust and help buyers make confident decisions.",
      },
    ]),
  },
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-location",
    title: "Location & Nearby Features",
    paths: ["bungalowLocation"],
    stage: "finalListing",
    subtitle: "Tell us about the location of your bungalow townhouse and the amenities nearby.",
    groups: [
      {
        title: "Nearby amenities",
        hint: "Select all that are within a convenient distance from your property.",
        headerField: "bgNearbyAmenities",
        fields: ["bgNearbyAmenities", "bgOtherNearby"],
      },
      {
        title: "Neighbourhood overview (optional)",
        hint: "Help buyers understand the neighbourhood and community.",
        fields: ["bgNeighbourhoodHighlights", "bgLocatedIn"],
      },
    ],
    panels: bungalowPanels(BUNGALOW_STREET_PHOTO, [
      {
        icon: "map-pin",
        title: "Location is everything",
        body: "Buyers consider location one of the most important factors when choosing a home.",
      },
      {
        icon: "users",
        title: "Nearby features add convenience",
        body: "Homes close to amenities, transit, schools and parks tend to attract more interest.",
      },
      {
        icon: "chart-column",
        title: "Help buyers picture their lifestyle",
        body: "Highlighting what's nearby helps buyers see how your home fits their needs.",
      },
    ]),
  },
  {
    ...BUNGALOW_PAGE,
    id: "bungalow-description",
    title: "Description & Included Items",
    paths: ["bungalowListing"],
    stage: "finalListing",
    continueLabel: "Review & Continue",
    subtitle: "Provide a clear, accurate description and list the items included with your bungalow townhouse.",
    groups: [
      {
        title: "Client remarks (For MLS®)",
        hint: "Tell buyers what makes your property special.\nKeep it factual and focused on the features, upgrades, " +
          "and lifestyle benefits.",
        headerField: "bgClientRemarks",
        fields: ["bgClientRemarks"],
        tips: {
          title: "Helpful tips",
          items: [
            "Highlight key features and upgrades", "Mention nearby amenities and lifestyle",
            "Keep it concise and buyer-focused", "No contact information or promotional content",
          ],
        },
      },
      {
        title: "Chattels & fixtures (Included)",
        hint: "Select all items that are included in the sale.",
        headerField: "bgChattels",
        fields: ["bgChattels", "bgChattelsOther"],
      },
      {
        title: "Rented or leased items (To be assumed by buyer, if applicable)",
        hint: "If any items are rented or leased (e.g., water heater, furnace, A/C, etc.), select and provide details.",
        headerField: "bgRentedItems",
        fields: ["bgRentedItems", "bgRentedOther"],
        note: {
          style: "warning",
          icon: "info",
          text: "The information you provide will be used to prepare your MLS® listing. Please ensure accuracy.",
        },
      },
    ],
    panels: bungalowPanels(BUNGALOW_STREET_PHOTO, [
      {
        icon: "file-text",
        title: "Clear, accurate description",
        body: "A great description helps more buyers connect with your home.",
      },
      {icon: "wallet", title: "List included items", body: "Buyers appreciate knowing exactly what is included in the sale."},
      {icon: "shield-check", title: "Be transparent", body: "Disclose any rented or leased items to avoid delays or surprises."},
    ]),
  },
];

const backToBackTownhouseSections = [
  {
    ...B2B_PAGE,
    id: "b2b-basics",
    title: "Tell us about your back-to-back townhouse",
    paths: ["b2bBasics"],
    subtitle: "We'll show only the details that apply to this townhouse configuration.",
    groups: [
      {title: "Townhouse position", hint: "Where is the unit located within the row?", headerField: "bbPosition", fields: ["bbPosition"]},
      {title: "Number of storeys", headerField: "bbStoreys", fields: ["bbStoreys", "bbStoreysOther"]},
      {
        title: "Private exterior entrance",
        hint: "Does the unit have its own private entrance from outside?",
        headerField: "bbPrivateEntrance",
        fields: ["bbPrivateEntrance"],
      },
      {
        title: "Outdoor areas belonging to the unit",
        hint: "Select all that apply.",
        headerField: "bbOutdoorAreas",
        fields: ["bbOutdoorAreas"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-basics.jpg", alt: "Row of three-storey back-to-back townhouses"}, [
      [
        "About back-to-back townhouses",
        "A back-to-back townhouse shares side walls and a rear wall with neighbouring homes. It normally has no " +
          "private rear yard.",
      ],
      [
        "Why we ask",
        "The unit's position, entrance and outdoor areas help us describe the property accurately and show the " +
          "correct MLS® fields.",
      ],
    ], "Parking, condominium fees and corporation details are collected separately."),
  },
  {
    ...B2B_PAGE,
    id: "b2b-parking",
    title: "Parking and garage",
    paths: ["b2bParking"],
    subtitle: "Tell us what parking is included with the townhouse.",
    groups: [
      {
        title: "Garage type",
        hint: "Select the option that best describes the garage.",
        headerField: "bbGarageType",
        fields: ["bbGarageType"],
      },
      {
        title: "Parking spaces",
        fields: ["bbGarageSpaces", "bbDrivewaySpaces"],
        total: {text: "Total parking spaces: {total}", sum: ["bbGarageSpaces", "bbDrivewaySpaces"]},
      },
      {
        title: "Direct access from the garage",
        hint: "Can you enter the townhouse directly from the garage?",
        headerField: "bbDirectGarageAccess",
        fields: ["bbDirectGarageAccess"],
      },
      {
        title: "Electric vehicle charging",
        hint: "Is an EV charger included with the property?",
        headerField: "bbEvCharger",
        fields: ["bbEvCharger"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-parking.jpg", alt: "Townhouses with built-in garages"}, [
      [
        "Describe only the parking included",
        "Enter the spaces assigned to or included with this townhouse. Do not include visitor parking.",
      ],
      [
        "Condominium parking details",
        "We'll ask whether each parking space is owned, exclusive use or rented on the condominium details page.",
      ],
    ], "Parking space numbers can be added later from the status certificate or condominium documents."),
  },
  {
    ...B2B_PAGE,
    id: "b2b-interior",
    title: "Inside your townhouse",
    paths: ["b2bInterior"],
    subtitle: "Tell us about the finished living spaces above grade.",
    groups: [
      {
        title: "Bedrooms and bathrooms",
        fields: ["bbBedrooms", "bbFullBathrooms", "bbPartialBathrooms"],
        note: {style: "plain", text: "Basement and lower-level rooms are collected on the next page."},
      },
      {
        title: "Principal rooms",
        hint: "Select all that apply.",
        headerField: "bbPrincipalRooms",
        fields: ["bbPrincipalRooms", "bbPrincipalRoomsOther"],
      },
      {title: "Kitchen", fields: ["bbKitchens", "bbKitchenType"]},
      {
        title: "Laundry location",
        hint: "Select the primary laundry location.",
        headerField: "bbLaundryLocation",
        fields: ["bbLaundryLocation"],
      },
      {
        title: "Interior features",
        hint: "Select all that apply.",
        headerField: "bbInteriorFeatures",
        fields: ["bbInteriorFeatures", "bbOtherInteriorFeatures"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-interior.jpg", alt: "Townhouse living room and staircase"}, [
      ["Focus on the living space", "Choose the rooms and features that are part of the townhouse itself."],
      [
        "What comes next",
        "We'll ask about the basement or lower level separately, including finished areas, entrances and any " +
          "additional living space.",
      ],
    ], "Room dimensions and detailed descriptions can be confirmed during the property review."),
  },
  {
    ...B2B_PAGE,
    id: "b2b-basement",
    title: "Basement or lower level",
    paths: ["b2bBasement"],
    subtitle: "Tell us about any space located below the main living level.",
    groups: [
      {
        title: "Level status",
        hint: "Which option best describes the space?",
        headerField: "bbLevelStatus",
        fields: ["bbLevelStatus"],
      },
      {title: "Access", hint: "Select all that apply.", headerField: "bbBasementAccess", fields: ["bbBasementAccess"]},
      {
        title: "Finished rooms below grade",
        fields: [
          "bbBedroomsBelowGrade", "bbFullBathroomsBelowGrade", "bbPartialBathroomsBelowGrade", "bbOtherFinishedRooms",
          "bbOtherFinishedRoomsOther",
        ],
      },
      {
        title: "Basement apartment or secondary suite",
        hint: "Is any part of this level used as a separate apartment or secondary suite?",
        headerField: "bbHasSuite",
        fields: ["bbHasSuite", "bbSuiteLegalStatus", "bbSuiteTenantOccupied"],
      },
    ],
    // The mockup's "we'll collect the tenancy details separately" note is left
    // out: this flow has no tenancy page.
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-interior.jpg", alt: "Staircase leading down to the lower level"}, [
      [
        "Why these details matter",
        "Finished space, separate entrances and secondary suites affect how the property is described and marketed.",
      ],
      [
        "A suite requires review",
        "Selecting a legal status does not confirm that the suite complies with municipal, fire or building " +
          "requirements. Supporting documents may be requested.",
      ],
    ]),
  },
  {
    ...B2B_PAGE,
    id: "b2b-systems",
    title: "Home systems and utilities",
    paths: ["b2bSystems"],
    subtitle: "Tell us about the systems and equipment serving your townhouse.",
    groups: [
      {title: "Heating", hint: "Select the primary heating system.", fields: ["bbHeating", "bbHeatingFuel"]},
      {title: "Cooling", hint: "Select all that apply.", headerField: "bbCooling", fields: ["bbCooling"]},
      {title: "Water and electrical", fields: ["bbWaterSupply", "bbElectricalPanel", "bbElectricalService"]},
      {
        title: "Equipment ownership",
        hint: "Tell us whether each item is owned, rented or not present.",
        headerField: "bbEquipmentOwnership",
        fields: ["bbEquipmentOwnership", "bbOtherEquipment"],
      },
      {
        title: "Additional systems",
        hint: "Select all that apply.",
        headerField: "bbAdditionalSystems",
        fields: ["bbAdditionalSystems"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-systems.jpg", alt: "Furnace and hot-water tank"}, [
      [
        "Check the equipment labels",
        "Rental agreements or recent utility bills can help confirm whether equipment is owned or rented.",
      ],
      [
        "Enter what you know",
        "If you're unsure about the electrical service or equipment ownership, select Unsure where available. We can " +
          "confirm key details during the property review.",
      ],
    ], "Rented and leased equipment must also be disclosed as part of the listing.", "circle-check"),
  },
  {
    ...B2B_PAGE,
    id: "b2b-condo",
    title: "Condominium details",
    paths: ["b2bCondo"],
    subtitle: "Tell us about the condominium corporation, fees and included property.",
    groups: [
      {title: "Corporation and management", fields: ["bbCorporationNumber", "bbManagementCompany"]},
      {title: "Monthly maintenance fee", fields: ["bbMonthlyFee", "bbFeeInclusions"]},
      {
        title: "Parking designation",
        fields: ["bbParkingStatus", "bbParkingSpaceNumber"],
        note: {style: "plain", text: "The number of parking spaces was collected on the previous parking page."},
      },
      {
        title: "Locker",
        hint: "Is a locker included with the townhouse?",
        headerField: "bbLockerIncluded",
        fields: ["bbLockerIncluded", "bbLockerStatus", "bbLockerNumber"],
      },
      {
        title: "Shared amenities",
        hint: "Select all that apply.",
        headerField: "bbSharedAmenities",
        fields: ["bbSharedAmenities"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-condo.jpg", alt: "Street of brick townhouses with garages and balconies"}, [
      [
        "Use your status certificate",
        "Your status certificate or latest maintenance-fee statement is usually the best source for corporation, " +
          "parking and locker details.",
      ],
      [
        "We'll verify the information",
        "Enter what you know now. Missing corporation or designation details can be confirmed during the brokerage " +
          "review.",
      ],
    ], "Do not include visitor parking as a space belonging to the unit.", "circle-check"),
  },
  {
    ...B2B_PAGE,
    id: "b2b-location",
    title: "Location and nearby features",
    paths: ["b2bLocation"],
    stage: "finalListing",
    subtitle: "Help buyers understand what makes the location convenient and appealing.",
    groups: [
      {title: "What's nearby?", hint: "Select all that apply.", headerField: "bbNearby", fields: ["bbNearby"]},
      {
        title: "Location highlights",
        hint: "Tell us what you like most about the area.",
        headerField: "bbLocationHighlights",
        fields: ["bbLocationHighlights"],
      },
      {
        title: "Street and community setting",
        hint: "Select all that apply.",
        headerField: "bbStreetSetting",
        fields: ["bbStreetSetting"],
      },
      {title: "Views and exposure", fields: ["bbFrontExposure", "bbView"]},
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-location.jpg", alt: "Townhouses beside a tree-lined street with a bus shelter"}, [
      [
        "Show buyers the lifestyle",
        "Nearby services, green space and transportation can help buyers understand how the location fits their " +
          "daily life.",
      ],
      [
        "Keep the details accurate",
        "Choose only features that are genuinely nearby. Exact distances and school boundaries can be confirmed " +
          "during the brokerage review.",
      ],
    ], "Avoid guaranteeing school attendance areas, travel times or future development.", "circle-alert"),
  },
  {
    ...B2B_PAGE,
    id: "b2b-description",
    title: "Listing description and included items",
    paths: ["b2bListing"],
    stage: "finalListing",
    subtitle: "Help us prepare an accurate and appealing MLS® listing.",
    groups: [
      {
        title: "Describe your townhouse",
        hint: "Tell buyers what makes the property special. Focus on the home, improvements, layout and location.",
        headerField: "bbClientRemarks",
        fields: ["bbClientRemarks"],
      },
      {
        title: "Chattels included",
        hint: "Select the movable items that will remain with the property.",
        headerField: "bbChattels",
        fields: ["bbChattels", "bbOtherChattels"],
      },
      {
        title: "Fixtures excluded",
        hint: "List any attached items that will not be included in the sale.",
        fields: ["bbExcludedFixtures", "bbNoExcludedFixtures"],
      },
      {
        title: "Rented or leased items",
        hint: "Are any systems, appliances or other items rented or leased?",
        headerField: "bbHasRentedItems",
        fields: ["bbHasRentedItems", "bbRentedItems", "bbRentalDetails"],
      },
    ],
    panels: backToBackPanels({src: "/assets/images/create-listing/th-b2b-description.jpg", alt: "Townhouse kitchen and living area"}, [
      [
        "Your details become the listing",
        "We'll use the information you provide to prepare the MLS® description and identify included, excluded and " +
          "rented items.",
      ],
      [
        "Accuracy matters",
        "The brokerage will review the wording and property details before the listing is entered on MLS®.",
      ],
    ], "Rented items and excluded fixtures should be clearly identified to help avoid misunderstandings."),
  },
];

const condoTownhouseSections = [
  ...traditionalTownhouseSections,
  ...bungalowTownhouseSections,
  ...backToBackTownhouseSections,
];

/**
 * Makes every field on a page with a `when` conditional on it (combined with
 * the field's own `requiredWhen`), so hidden pages' fields are skipped by the
 * FE, ignored at checkout and pruned on submission. Returns new definitions;
 * shared ones (Condo Apartment's pages) are never mutated.
 */
function applySectionConditions(fields, sections) {
  const whenByPath = {};
  for (const section of sections) {
    if (!section.when) continue;
    for (const path of section.paths) whenByPath[path] = section.when;
  }
  return Object.fromEntries(Object.entries(fields).map(([name, def]) => {
    const when = whenByPath[def.path];
    if (!when) return [name, def];
    return [name, {...def, requiredWhen: def.requiredWhen ? {allOf: [when, def.requiredWhen]} : when}];
  }));
}

const propertyTypeSections = {
  // Page copy is transcribed from the mockups. Group and panel keys are
  // documented on the FE's SectionGroup / SectionPanel types.
  detached: [
    exteriorLotSection,
    {
      id: "parking-outdoor",
      title: "Parking & Outdoor Areas",
      paths: ["parkingOutdoor"],
      subtitle: "Tell us about the property's parking and outdoor features. You'll only see follow-up questions " +
        "that apply to your answers.",
      groupStyle: "plain",
      groups: [
        {
          title: "Driveway",
          hint: "Does the property have a driveway?",
          headerField: "hasDriveway",
          columns: 3,
          revealPanel: true,
          fields: ["hasDriveway", "drivewayType", "drivewayFinish", "outsideParkingSpaces"],
        },
        {
          title: "Garage or carport",
          hint: "Does the property have a garage or carport?",
          headerField: "hasGarage",
          fields: ["hasGarage", "garageType", "indoorParkingSpaces"],
        },
        {
          title: "Yard & outdoor features",
          fields: ["yardOutdoorFeatures"],
          note: {
            style: "tip",
            text: "That's all we need for now. Later, we'll help you confirm which items will stay with the property " +
              "and whether anything is rented, leased or financed.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {
          src: "/assets/images/create-listing/detached-parking-outdoor.jpg",
          alt: "Double garage, driveway and fenced backyard patio",
          aspectRatio: "2/1",
        },
        icon: "car",
        title: "Parking & Outdoor Areas",
        items: [
          {
            title: "Why we're asking",
            body: "These details help us prepare accurate MLS® parking information and highlight useful outdoor features.",
          },
          {
            title: "Tell us what you know",
            body: "Provide your best estimate. We'll review important details during the Verification Visit.",
          },
          {
            title: "What happens later?",
            body: "We'll separately confirm what stays with the property and whether anything is rented, leased or financed.",
          },
          {title: "Coming next", body: "Inside the Home"},
        ],
      }],
    },
    {
      id: "inside-home",
      title: "Inside the Home",
      paths: ["interior"],
      subtitle: "Tell us about the main living areas of the home. Basement details will be collected separately.",
      groupStyle: "numbered",
      groups: [
        {
          title: "Bedrooms & Bathrooms",
          columns: 3,
          fields: ["bedroomsAboveGround", "fullBathroomsAboveGround", "partialBathroomsAboveGround"],
        },
        {
          title: "Comfort & Everyday Living",
          columns: 2,
          fields: ["mainHeatingType", "cooling", "hasFireplace", "fireplaceCount", "fireplaceTypes", "laundryLocation"],
        },
        {
          fields: ["interiorFeatures", "interiorFeaturesOther"],
          note: {style: "plain", text: "That's all we need here. We'll confirm important details before your listing is published."},
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/detached-inside-home.jpg", alt: "Open-concept living room and kitchen"},
        icon: "sofa",
        title: "Helping Buyers Understand the Home",
        items: [
          {
            icon: "circle-question-mark",
            title: "Why we're asking",
            body: "These details help us prepare the MLS® listing and highlight the home's most important interior features.",
          },
          {
            icon: "clipboard-pen",
            title: "Tell us what you know",
            body: "We'll confirm important details before your listing is published.",
          },
          {
            icon: "circle-arrow-right",
            title: "Coming next",
            body: "Next, we'll ask about the basement, if the home has one.",
          },
        ],
      }],
    },
    {
      id: "basement",
      title: "Basement",
      paths: ["basement"],
      subtitle: "Tell us about the basement and whether it includes a separate apartment.",
      groupStyle: "plain",
      completeNote: {
        title: "Your basement details are complete",
        body: "Next, we'll help you identify the property's important features and improvements.",
      },
      groups: [
        {
          title: "Basement details",
          columns: 2,
          fields: ["hasBasement", "basementFinish", "basementBedrooms", "basementWashrooms"],
        },
        {
          title: "Basement apartment with a separate entrance",
          variant: "tinted",
          columns: 2,
          fields: [
            "basementApartment", "apartmentLivingRoom", "apartmentFamilyRoom", "apartmentKitchenStyle",
            "apartmentLaundrySetup", "apartmentCurrentlyLeased",
          ],
        },
      ],
      panels: [{
        type: "guide",
        image: {
          src: "/assets/images/create-listing/detached-basement-walkout.jpg",
          alt: "Finished lower level with a walk-out to the garden",
          aspectRatio: "4/3",
        },
        icon: "house",
        title: "Understanding the Lower Level",
        body: "Basement details can affect how the property is described and marketed.",
        items: [
          {
            title: "A separate basement apartment",
            body: "We'll collect a few additional details about its living areas, kitchen, laundry and occupancy.",
          },
          {
            title: "We'll verify important details",
            body: "Tell us what you know. We'll review important information before the listing is published.",
          },
        ],
      }],
    },
    listingRemarksSection,
    saleItemsSection,
  ],
  semiDetached: [
    {
      ...exteriorLotSection,
      subtitle: "Tell us what you know about the outside of your semi-detached home and the property.",
      groups: [
        {...exteriorLotSection.groups[0], badge: "Property type: Semi-Detached"},
        // Detached's additional-building card is left out: page 6 covers it.
        ...exteriorLotSection.groups.slice(1, 3),
      ],
      panels: [{
        ...exteriorLotSection.panels[0],
        image: {src: "/assets/images/create-listing/semi-detached-exterior.png", alt: "Semi-detached home exterior"},
      }],
    },
    {
      id: "parking-outdoor",
      title: "Parking & Outdoor Areas",
      paths: ["parkingOutdoor"],
      subtitle: "Tell us about the property's parking and outdoor features.\nYou'll only see follow-up questions " +
        "that apply to your answers.",
      groupStyle: "plain",
      groups: [
        {
          title: "Driveway",
          hint: "Does the property have a driveway?",
          headerField: "hasDriveway",
          columns: 4,
          revealPanel: true,
          fields: ["hasDriveway", "drivewayArrangement", "drivewayType", "drivewayFinish", "outsideParkingSpaces"],
          note: {
            style: "plain",
            text: "If the driveway is shared or accessed by right-of-way, select the arrangement that best applies.",
          },
        },
        {
          title: "Garage or carport",
          hint: "Does the property have a garage or carport?",
          headerField: "hasGarage",
          columns: 3,
          revealPanel: true,
          fields: ["hasGarage", "garageType", "indoorParkingSpaces", "garageSharedWithAdjoining"],
        },
        {
          title: "Yard & outdoor features",
          columns: 1,
          fields: ["yardOutdoorFeatures", "yardExclusiveUse"],
          note: {
            style: "tip",
            icon: "sprout",
            text: "That's all we need for now. We'll confirm parking, shared access and outdoor details during the " +
              "Verification Visit.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-detached-exterior.png", alt: "Semi-detached homes with driveways"},
        icon: "car",
        title: "Parking & Outdoor Areas",
        items: [
          {
            title: "Why we're asking",
            body: "These details help us prepare accurate MLS® parking information and identify shared access or " +
              "outdoor areas.",
          },
          {
            title: "Tell us what you know",
            body: "Provide your best estimate. We'll review important details during the Verification Visit.",
          },
          {
            title: "What happens later?",
            body: "During the Verification Visit, we'll confirm the parking arrangement, garage details and whether " +
              "any driveway or outdoor areas are shared with the adjoining property.",
          },
          {title: "Coming next", body: "Inside the Home"},
        ],
      }],
    },
    {
      id: "inside-home",
      title: "Inside the Home",
      paths: ["interior"],
      subtitle: "Tell us about the home's interior layout and principal rooms.\nProvide your best estimate. We'll " +
        "confirm important details during the Verification Visit.",
      groupStyle: "plain",
      groups: [
        {
          title: "Bedrooms & bathrooms",
          fields: ["bedroomsAboveGrade", "bedroomsBelowGrade", "fullBathrooms", "partialBathrooms"],
          note: {style: "plain", text: "Only include rooms currently set up and used for these purposes."},
        },
        {
          title: "Main living spaces",
          hint: "Which of these are included in the home?\nSelect all that apply.",
          headerField: "mainLivingSpaces",
          fields: ["mainLivingSpaces", "otherFinishedRoom"],
        },
        {
          title: "Interior features",
          hint: "Which features are part of the home?\nSelect all that apply.",
          headerField: "interiorFeatures",
          fields: ["interiorFeatures"],
          note: {
            style: "tip",
            icon: "sprout",
            text: "That's all we need on this screen. Next, we'll ask about the home's systems and utilities.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-inside-home.jpg", alt: "Living and dining area with a staircase"},
        icon: "sofa",
        title: "Inside the Home",
        items: [
          {
            title: "Why we're asking",
            body: "Room counts and interior features help us prepare accurate MLS® property information.",
          },
          {
            title: "Tell us what you know",
            body: "Use the home's current layout. You don't need to measure rooms or confirm exact dimensions here.",
          },
          {
            title: "What happens later?",
            body: "We'll review the interior details and confirm important information during the Verification Visit.",
          },
          {title: "Coming next", body: "Home Systems & Utilities"},
        ],
      }],
    },
    {
      id: "systems-utilities",
      title: "Home Systems & Utilities",
      paths: ["systems"],
      subtitle: "Tell us about the systems and services that support the home.\nChoose what best describes the " +
        "property today. If you're unsure, select Not sure.",
      groupStyle: "plain",
      groups: [
        {
          title: "Heating & cooling",
          fields: ["primaryHeatingSystem", "heatingFuel", "coolingSystem", "additionalHeating"],
        },
        {
          title: "Water & electrical",
          fields: ["waterSource", "sewageSystem", "electricalService", "hotWaterSystem"],
        },
        {
          title: "Shared systems or services",
          hint: "Are any mechanical systems, meters or utility services shared with the adjoining property?",
          headerField: "sharedSystems",
          fields: ["sharedSystems"],
          note: {
            style: "tip",
            icon: "cog",
            text: "Provide your best information. We'll confirm visible equipment and any shared services during " +
              "the Verification Visit.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-systems-utilities.jpg", alt: "Furnace, water heater and electrical panel"},
        icon: "cog",
        title: "Home Systems & Utilities",
        items: [
          {
            title: "Why we're asking",
            body: "These details support accurate MLS® information and help buyers understand the home's essential " +
              "systems.",
          },
          {
            title: "Tell us what you know",
            body: "You don't need model numbers or technical specifications. Select the option that best applies.",
          },
          {
            title: "What happens later?",
            body: "We'll review visible equipment during the Verification Visit.",
            emphasis: "The visit is not a home inspection.",
          },
          {title: "Coming next", body: "Basement & Lower Level"},
        ],
      }],
    },
    {
      id: "basement",
      title: "Basement & Lower Level",
      paths: ["basement"],
      subtitle: "Tell us about the basement or lower level.\nYou'll only see follow-up questions that apply to " +
        "your answers.",
      groupStyle: "plain",
      groups: [
        {
          title: "Basement or lower level",
          hint: "Does the property have a basement or lower level?",
          headerField: "hasBasement",
          revealPanel: true,
          fields: ["hasBasement", "basementFinish"],
        },
        {
          title: "Access",
          hint: "How can the basement or lower level be accessed?\nSelect all that apply.",
          headerField: "basementAccess",
          fields: ["basementAccess"],
        },
        {
          title: "Rooms & spaces",
          hint: "Which of these are included?\nSelect all that apply.",
          headerField: "basementRooms",
          fields: ["basementRooms", "basementOtherRoom"],
        },
        {
          title: "Separate living unit",
          hint: "Is there a basement apartment or other separate living unit?",
          headerField: "basementSeparateUnit",
          fields: [
            "basementSeparateUnit", "separateUnitStatus", "separateUnitOccupancy", "separateUnitVacantPossession",
          ],
          note: {
            style: "tip",
            icon: "cog",
            text: "We'll confirm important basement details during the Verification Visit.\nThis is not a " +
              "building-code or legal-status determination.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-basement.jpg", alt: "Finished basement recreation room"},
        icon: "footprints",
        title: "Basement & Lower Level",
        items: [
          {
            title: "Why we're asking",
            body: "Basement finish, access and rooms are important parts of accurate MLS® property information.",
          },
          {
            title: "Tell us what you know",
            body: "Describe the space as it is currently used. You don't need to determine whether a separate unit is legal.",
          },
          {
            title: "What happens if there's an apartment?",
            body: "We'll ask a few additional questions about its status, occupancy and vacant-possession plans.",
          },
          {title: "Coming next", body: "Additional Living Spaces"},
        ],
      }],
    },
    {
      id: "additional-living",
      title: "Additional Living Spaces",
      paths: ["additionalLivingSpaces"],
      subtitle: "Tell us about any separate living space outside the main home and basement.\nYou'll only see " +
        "follow-up questions when an additional space applies.",
      groupStyle: "plain",
      groups: [
        {
          title: "Additional living space",
          hint: "Does the property include another separate building or living space?",
          headerField: "hasAdditionalLivingSpace",
          fields: ["hasAdditionalLivingSpace"],
        },
        {
          title: "Type of space",
          hint: "Which type best describes it?\nSelect all that apply.",
          headerField: "additionalSpaceTypes",
          fields: ["additionalSpaceTypes"],
        },
        {
          title: "Current use & occupancy",
          fields: ["additionalSpaceUse", "additionalSpaceOccupancy", "additionalSpaceApproval"],
        },
        {
          title: "Services",
          hint: "Are any utilities or services shared with the main home?",
          headerField: "additionalSpaceServicesShared",
          fields: ["additionalSpaceServicesShared"],
          note: {
            style: "tip",
            icon: "cog",
            text: "We may ask for available permits, plans or other documents.\nThe brokerage does not determine " +
              "legal status.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-additional-living.jpg", alt: "Backyard garden suite"},
        icon: "house",
        title: "Additional Living Spaces",
        items: [
          {
            title: "Why we're asking",
            body: "Separate living spaces can affect how the property is described, occupied and marketed.",
          },
          {
            title: "Tell us what you know",
            body: "Describe the space and its current use. Select Not sure if its approval status has not been confirmed.",
          },
          {
            title: "What happens later?",
            body: "We'll review available information and may request permits, plans or occupancy documents.",
          },
          {title: "Coming next", body: "Location Highlights"},
        ],
      }],
    },
    {
      id: "location-highlights",
      title: "Location Highlights",
      paths: ["locationHighlights"],
      stage: "finalListing",
      subtitle: "Tell us what's nearby and what makes the location convenient.\nSelect the features you reasonably " +
        "believe apply.",
      groupStyle: "plain",
      groups: [
        {
          title: "Everyday conveniences",
          hint: "Which of these are nearby?\nSelect all that apply.",
          headerField: "everydayConveniences",
          fields: ["everydayConveniences"],
        },
        {
          title: "Transportation & access",
          hint: "Which options are convenient from the property?\nSelect all that apply.",
          headerField: "transportationAccess",
          fields: ["transportationAccess"],
        },
        {
          title: "Setting & surroundings",
          hint: "Which descriptions apply?",
          headerField: "settingSurroundings",
          fields: ["settingSurroundings", "otherNotableSetting"],
          note: {
            style: "tip",
            icon: "cog",
            text: "Choose only what you know.\nDon't include school ratings, promised travel times or unverified claims.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-location-highlights.jpg", alt: "Tree-lined residential street"},
        icon: "map-pin",
        title: "Location Highlights",
        items: [
          {
            title: "Why we're asking",
            body: "Nearby amenities and access help buyers understand the property's location and lifestyle.",
          },
          {
            title: "Tell us what you know",
            body: "Select features based on your familiarity with the area. Exact distances are not required here.",
          },
          {
            title: "How we'll use this",
            body: "We'll use your selections to help prepare the MLS® location information and listing remarks.",
          },
          {title: "Coming next", body: "Listing Remarks & Inclusions"},
        ],
      }],
    },
    {
      id: "remarks-inclusions",
      title: "Listing Remarks & Inclusions",
      paths: ["remarksInclusions"],
      stage: "finalListing",
      subtitle: "Help us understand how you'd like the property presented.\nWe'll review the information before " +
        "preparing the MLS® listing.",
      groupStyle: "plain",
      groups: [
        {
          title: "Client remarks",
          hint: "What would you like buyers to know about the property?",
          headerField: "clientRemarks",
          fields: ["clientRemarks"],
        },
        {
          title: "Included chattels",
          hint: "Which movable items will be included?\nSelect all that apply.",
          headerField: "includedChattels",
          fields: ["includedChattels", "otherChattels"],
        },
        {
          title: "Excluded fixtures",
          hint: "Are any attached fixtures specifically excluded?",
          headerField: "excludedFixtures",
          row: "exclusions",
          fields: ["excludedFixtures", "excludedFixturesList"],
        },
        {
          title: "Rented or leased items",
          hint: "Will the buyer assume any rented or leased equipment?",
          headerField: "rentedEquipment",
          row: "exclusions",
          fields: ["rentedEquipment", "rentedItems"],
        },
        {
          // A full-width tip under both side-by-side cards, as in the mockup.
          fields: [],
          content: {
            variant: "tip",
            icon: "sprout",
            body: "These details help prepare the listing. Final inclusions, exclusions and rental obligations must " +
              "be stated in the Agreement of Purchase and Sale.",
          },
        },
      ],
      panels: [{
        type: "guide",
        image: {src: "/assets/images/create-listing/semi-remarks-inclusions.jpg", alt: "Laptop showing a listing"},
        icon: "file-text",
        title: "Listing Remarks & Inclusions",
        items: [
          {
            title: "Why we're asking",
            body: "Clear remarks and item details help present the property accurately and reduce misunderstandings.",
          },
          {
            title: "What happens later?",
            body: "We'll review the remarks and item details. Final transaction terms are set out in the signed " +
              "Agreement of Purchase and Sale.",
          },
          {title: "Coming next", body: "Review Your Property Details"},
        ],
      }],
    },
  ],
  rural: [
    {
      id: "exterior-basics",
      title: "Exterior & Property Basics",
      paths: ["ruralBasics"],
      eyebrow: "Rural / Acreage",
      subtitle: "Tell us the basic details about your rural property and land. This helps us showcase it " +
        "accurately to buyers.",
      groupStyle: "sectioned",
      groups: [
        {
          title: "Property & Land Details",
          columns: 3,
          icon: "file-text",
          fields: [
            "ruralPropertyType", "acreage", "acreageUnit", "lotShape", "frontage", "frontageUnit", "depth", "depthUnit",
            "propertyUse", "yearBuilt", "storeys", "aboveGradeArea", "aboveGradeAreaUnit",
          ],
        },
        {
          title: "Location & Access",
          icon: "map-pin",
          fields: ["municipalAddress", "roadAccessType", "yearRoundAccess", "nearestTown", "distanceToTown",
            "distanceToTownUnit"],
        },
        {
          title: "Exterior Construction",
          icon: "house",
          fields: ["exteriorConstruction", "exteriorFinish", "roofType", "roofMaterial"],
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-farm-lane.jpg", alt: "Farmhouse at the end of a fenced gravel lane"},
        why: {
          icon: "trees",
          title: "Why these details matter",
          body: "Buyers searching for rural properties care about the land, access, and features that make your " +
            "property unique.",
        },
        ready: ["Lot size (acres)", "Year built", "Access information", "Outbuildings and land features"],
        readyIcon: "warehouse",
        tip: "If you're not sure about a measurement, an approximate value is okay. You can update it later if needed.",
      }),
    },
    {
      id: "interior-details",
      title: "Interior Details",
      paths: ["ruralInterior"],
      eyebrow: "Rural / Acreage",
      subtitle: "Tell us about the interior of your home, including rooms, systems and utilities.",
      groupStyle: "sectioned",
      groups: [
        {
          title: "Rooms & Living Spaces",
          icon: "sofa",
          fields: ["bedrooms", "bathrooms", "kitchens", "diningRooms", "livingRooms", "familyRooms", "otherRooms"],
        },
        {
          title: "Systems & Utilities",
          icon: "house-plug",
          fields: ["heatingType", "coolingType", "fireplaceWoodStove", "waterSource", "sewerSeptic", "electricalService"],
        },
        {
          title: "Laundry",
          icon: "washing-machine",
          fields: ["laundryLocation", "laundryTubSink", "otherLaundryFeatures"],
        },
        {
          title: "Interior Features",
          icon: "door-open",
          fields: ["flooring", "interiorFeatures", "accessibilityFeatures", "securityFeatures", "additionalNotes"],
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-farm-lane.jpg", alt: "Farmhouse at the end of a fenced gravel lane"},
        why: {
          icon: "lightbulb",
          title: "Why this information matters",
          body: "Buyers want to know how your home is built and functioning, especially details like water source, " +
            "septic system, heating and utilities.",
        },
        ready: [
          "Number of bedrooms and bathrooms", "Type of heating and cooling", "Water source (well, municipal, etc.)",
          "Septic or sewer system details", "Any interior upgrades or features",
        ],
        readyIcon: "house",
        tip: "If you're unsure about your systems (e.g., septic age or water quality), you can still continue and " +
          "update this information later.",
      }),
    },
    {
      id: "basement-additional",
      title: "Basement / Additional Living Spaces",
      paths: ["ruralBasement"],
      eyebrow: "Rural / Acreage",
      subtitle: "Tell us about your basement and any additional living spaces on your property.",
      groupStyle: "sectioned",
      groups: [
        {
          title: "Basement Details",
          icon: "house",
          fields: [
            "basementType", "basementFinish", "walkOutWalkUp", "separateEntrance", "basementRooms", "basementApartment",
            "apartmentLegalStatus", "apartmentTenancyStatus", "apartmentVacantPossession",
          ],
        },
        {
          title: "Additional Living Spaces",
          icon: "house-plus",
          hint: "Does your property have any additional living spaces? (Select all that apply)",
          headerField: "additionalLivingSpaces",
          fields: ["additionalLivingSpaces", "additionalSpacesDescription"],
        },
        {
          title: "Other Structures on Property",
          icon: "building",
          fields: ["otherStructures", "otherStructuresDescription"],
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-living-room.jpg", alt: "Open living room and kitchen with timber beams"},
        why: {
          icon: "house",
          title: "Why this information matters",
          body: "Buyers want to understand all usable living space on your property, including basement functionality " +
            "and any additional dwellings.",
        },
        ready: [
          "Details about your basement (finished, layout, access)", "Legal status of any secondary suites",
          "Information on additional living spaces", "Details about other residential structures",
        ],
        readyIcon: "house",
        tip: "If you're not sure about legal status, you can select “Not Sure” and update it later.",
      }),
    },
    {
      id: "outbuildings-land",
      title: "Outbuildings & Land Features",
      paths: ["ruralOutbuildings"],
      eyebrow: "Rural / Acreage",
      subtitle: "Tell us about any outbuildings, structures, and land features on your property. Select all that " +
        "apply and provide details where possible.",
      groupStyle: "sectioned",
      groups: [
        {
          title: "Outbuildings & Structures",
          icon: "warehouse",
          hint: "Select all that apply and add details where possible.",
          headerField: "outbuildings",
          fields: ["outbuildings", "outbuildingDetails"],
        },
        {
          title: "Land Features",
          icon: "sprout",
          hint: "Select all that apply.",
          headerField: "landFeatures",
          fields: ["landFeatures"],
        },
        {
          title: "Access, Parking & Utilities (At the Property)",
          icon: "route",
          fields: ["drivewayType", "drivewaySurface", "parkingCapacity", "utilitiesAtProperty"],
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-outbuildings.jpg", alt: "Farm with a barn, garage, shed, garden and pond"},
        why: {
          icon: "sprout",
          title: "Why this information matters",
          body: "Outbuildings and land features help buyers understand the full value and potential of your rural property.",
        },
        ready: [
          "Details about any buildings or structures", "Land features and usable land information",
          "Parking and access details", "Utility availability on the property",
        ],
        readyIcon: "warehouse",
        tip: "If you're not sure about sizes, approximate values are perfectly okay. You can always update later.",
      }),
    },
    {
      id: "location-nearby",
      title: "Location & Nearby Features",
      paths: ["ruralLocation"],
      stage: "finalListing",
      eyebrow: "Rural / Acreage",
      subtitle: "Help buyers understand the location and lifestyle around your property.",
      groupStyle: "sectioned",
      groups: [
        {
          title: "Nearby Amenities & Conveniences",
          icon: "store",
          hint: "Select all that apply and provide approximate distance where known.",
          layout: "tiles",
          fields: [
            "schoolsDistance", "shoppingDistance", "healthcareDistance", "recreationCentreDistance", "parksDistance",
            "highwaysDistance", "publicTransitDistance", "trailsDistance", "golfDistance", "waterfrontDistance",
            "airportDistance", "otherNearbyAmenities",
          ],
        },
        {
          title: "Rural Services & Access",
          icon: "clipboard-list",
          hint: "Tell us about important services and access to your property.",
          layout: "tiles",
          fields: [
            "schoolBusAccess", "garbageCollection", "mailDelivery", "internetService", "internetProvider",
            "cellularService", "emergencyServices",
          ],
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-village-road.jpg", alt: "Country road leading into a small town"},
        why: {
          icon: "map-pin",
          title: "Why this information matters",
          body: "Buyers often choose rural properties for lifestyle, privacy and convenience. Clear location details " +
            "help them picture life here.",
        },
        ready: [
          "Nearest town / community and distance", "Access to schools, shopping and healthcare",
          "Road access and year-round availability", "Internet and cellular service information",
          "Other features unique to this area",
        ],
        readyIcon: "signpost",
        tip: "If you're unsure about a distance, a general estimate is perfectly fine. You can update details later.",
      }),
    },
    {
      id: "listing-description",
      title: "Listing Description & Included Items",
      paths: ["ruralListing"],
      stage: "finalListing",
      eyebrow: "Rural / Acreage",
      subtitle: "Almost done! Provide a great description and let buyers know what is included, excluded, or rented " +
        "with the property.",
      groupStyle: "sectioned",
      continueLabel: "Review & Continue to Payment",
      groups: [
        {
          title: "Client Remarks / MLS® Description",
          icon: "pencil-line",
          hint: "Highlight the best features of your property and what makes it unique.",
          headerField: "clientRemarks",
          fields: ["clientRemarks"],
        },
        {
          title: "Chattels Included",
          icon: "square-check",
          hint: "Items that will stay with the property.",
          headerField: "includedChattels",
          row: "items",
          fields: ["includedChattels", "otherIncludedItems"],
        },
        {
          title: "Fixtures Excluded",
          icon: "x",
          hint: "Items that are attached but will not remain.",
          row: "items",
          fields: ["fixturesExcluded"],
        },
        {
          title: "Rented or Leased Items",
          icon: "circle",
          hint: "Items you do not own and will not transfer.",
          headerField: "rentedLeasedItems",
          row: "items",
          fields: ["rentedLeasedItems", "rentalDetails"],
        },
        {
          title: "Rural-Specific Items",
          icon: "warehouse",
          hint: "Confirm which of the following items are included in the sale.",
          headerField: "ruralItems",
          fields: ["ruralItems", "otherRuralItems"],
        },
        {
          content: {
            variant: "notice",
            title: "Important:",
            body: "Items not checked above are assumed to be excluded from the sale. Please be clear to avoid " +
              "misunderstandings.",
          },
        },
      ],
      panels: ruralPanels({
        image: {src: "/assets/images/create-listing/rural-pond-house.jpg", alt: "Country home with a detached garage beside a pond"},
        why: {
          icon: "map-pin",
          title: "Why this information matters",
          body: "Clear details about what's included, excluded, and rented helps prevent confusion and protects both " +
            "you and buyers. Accurate information leads to a smoother transaction.",
        },
        ready: [
          "A compelling description of your property", "List of included and excluded items",
          "Details of any rented or leased equipment", "Rural equipment or items that may be part of the sale",
        ],
        readyIcon: "warehouse",
        tip: "Buyers value honesty and clarity. The more detailed you are now, the fewer questions later.",
      }),
    },
  ],
  residentialIncome: [
    {
      id: "income-configuration",
      title: "Income Property Configuration",
      paths: ["incomeConfiguration"],
      groups: [{fields: ["unitCount"]}, {fields: ["unitArrangement"]}, {title: "Building Information", fields: ["approxBuildingSqFt", "sqFtSource", "approxYearBuilt"]}],
      subtitle: "Tell us about the overall configuration of the building.",
      notice: RI_UNSURE_NOTICE,
      panels: [
        riPhoto("ri-floor-plan-ground.jpg", "Ground-floor plan showing Units 1 and 2 beside a common stairwell"),
        {
          type: "highlight",
          title: "Selling a Residential Income Property",
          body: "You're building wealth and creating opportunity.",
          listTitle: "Buyers look for:",
          items: ["Number of units and layout", "Building arrangement", "Approximate building size", "Year built"],
        },
        {
          type: "note",
          title: "Zoning & Regulatory Review",
          body: "Buyers should ensure that their lawyer reviews zoning, permitted use and available documentation " +
            "relating to the property and its individual units as part of their due diligence.",
        },

      ],
    },
    {
      id: "unit-basics",
      title: "Unit Basics",
      paths: ["unitBasics"],
      groups: [{fields: ["units"]}],
      subtitle: "Tell us the basic make-up of each self-contained unit.",
      notice: RI_UNSURE_NOTICE,
      panels: [
        riPhoto("ri-unit-layout.jpg", "Example one-bedroom unit layout"),
        {
          type: "steps",
          title: "How to identify each unit",
          body: "Units can be identified in different ways. Use the options above to describe each unit.",
          items: [
            {
              title: "Use the unit position",
              body: "Select all that apply, such as main floor, upper floor, lower level / basement, front or rear.",
            },
            {
              title: "Add more units when needed",
              body: "If the property has more than two self-contained units, add them one at a time.",
            },
            {
              title: "Basement logic stays simple",
              body: "If a unit is lower-level or basement, we'll ask about separate entrance and walk-out.",
            },
          ],
        },
        {
          type: "note",
          title: "Keep it simple",
          body: "You only need the basic make-up of each unit here. More detailed tenancy and utility " +
            "information can be collected on the next pages.",
        },

      ],
    },
    {
      id: "exterior-outdoor",
      title: "Exterior & Outdoor Features",
      paths: ["exteriorOutdoor"],
      groups: [
        {fields: ["exteriorConstruction"]},
        {title: "Driveway & Parking", fields: ["drivewayType", "totalParkingSpaces", "parkingArrangement"]},
        {columns: 2, fields: ["garageType", "garageSpaces"]},
        {title: "Yard & Outdoor Space", fields: ["yardSpace", "outdoorSpaceArrangement", "deckPatioBalcony"]},
        // Fencing and Other Exterior Features sit side by side, as in the mockup.
        {row: "fencing-other", fields: ["fencing"]},
        {row: "fencing-other", fields: ["otherExteriorFeatures"]},
      ],
      subtitle: "Tell us about the exterior features and outdoor spaces for the entire property.",
      notice: "This information applies to the whole property, not to individual units.",
      panels: [
        riPhoto("ri-exterior.jpg", "Two-storey income property with two garages and an exterior staircase"),
        {type: "info", title: "Why this information is important", body: "Exterior and outdoor features help buyers understand the overall property, parking, " +
        "outdoor spaces and amenities for all units."},
        {type: "tips", title: "Helpful Tips", items: [
          "Include all exterior features that apply to the property.",
          "If parking or outdoor space is assigned to specific units, you can provide more details in the description later.",
          "Select all options that apply.",
          RI_EDIT_LATER_TIP,
        ]},
        riPhoto("ri-backyard.jpg", "Fenced backyard patio with a dining set and barbecue"),
      ],
    },
    {
      id: "utilities-systems",
      title: "Utilities & Building Systems",
      paths: ["buildingSystems"],
      groups: [
        {fields: ["heatingSystem"]},
        {fields: ["coolingSystem"]},
        {fields: ["hydroMetering"]},
        {fields: ["gasMetering"]},
        {fields: ["waterMetering"]},
        {fields: ["hotWater"]},
      ],
      subtitle: "Tell us about the building's main systems and how they are set up.",
      notice: "This information applies to the entire property and helps buyers understand the building's " +
        "utilities and systems.",
      panels: [
        riPhoto("ri-mechanical-room.jpg", "Mechanical room with water heaters and furnaces"),
        {type: "info", title: "Why this information is important", body: "Utility and building system details help buyers understand how the property operates, " +
        "which can affect operating costs, maintenance and future plans."},
        {type: "tips", title: "Helpful Tips", items: [
          "Select the option that best describes the system for the entire property.",
          "If the property has a combination of systems, choose the option that applies most accurately.",
          RI_EDIT_LATER_TIP,
          "Utility payment arrangements (who pays) will be collected later in the Tenancy Information section.",
        ]},
        riPhoto("ri-ac-units.jpg", "Two outdoor air-conditioning units"),
      ],
    },
    {
      id: "location-nearby",
      title: "Location & Nearby Features",
      paths: ["locationFeatures"],
      groups: [
        {fields: ["nearbyAmenities"]},
        {fields: ["transitAccess"]},
        {fields: ["schools"]},
        {fields: ["parksRecreation"]},
        {fields: ["lifestyle"]},
      ],
      subtitle: "Tell us about what makes this location special.",
      notice: "You do not need to enter the address again. This information helps buyers understand the " +
        "neighbourhood and nearby amenities.",
      panels: [
        riPhoto("ri-waterfront-skyline.jpg", "Waterfront path with the city skyline"),
        {type: "info", title: "Why this information is important", body: "Location features help buyers understand the lifestyle, convenience and overall value of " +
        "the property, making your listing more appealing and easier to market."},
        {type: "tips", title: "Helpful Tips", items: [
          "Select all options that apply.",
          "Focus on nearby amenities and lifestyle features.",
          "Highlight what makes this location unique.",
          RI_EDIT_LATER_TIP,
        ]},
        riPhoto("ri-waterfront-park.jpg", "Park bench on a waterfront path facing the skyline"),
      ],
    },
    {
      id: "tenancy",
      title: "Tenancy Information",
      paths: ["unitTenancy"],
      groups: [{fields: ["unitTenancies"]}],
      subtitle: "Tell us about the current occupancy and tenant details for each unit.",
      notice: "Complete the tenancy information for each unit in your property. This helps buyers understand " +
        "the rental status and investment potential.",
      panels: [
        riPhoto("ri-building-exterior.jpg", "Modern low-rise residential building"),
        {type: "info", title: "Why this information is important", body: "Tenancy information helps buyers understand the income potential and occupancy status of " +
        "each unit, making your property more attractive and easier to evaluate."},
        {type: "tips", title: "Helpful Tips", items: [
          "Provide accurate and up-to-date information for each unit.",
          "If a unit is tenant occupied, include the current rent and lease details.",
          "Only select the utilities that are paid by the tenant for that unit.",
          "If a unit is vacant or owner occupied, no further tenancy details are required.",
          RI_EDIT_LATER_TIP,
        ]},
        riPhoto("ri-living-room.jpg", "Open-concept living room and kitchen"),
      ],
    },
    {
      id: "tell-buyers",
      title: "Tell Buyers About Your Property",
      paths: ["buyerHighlights"],
      groups: [
        {fields: ["propertyHighlights"]},
        {fields: ["uniqueFeatures"]},
        {fields: ["idealBuyer"]},
        {fields: ["additionalComments"]},
      ],
      subtitle: "Highlight the features that make your property special.",
      notice: "Use this space to share any additional information you would like buyers to know about your " +
        "property. This will help us create an attractive and compelling listing.",
      panels: [
        riPhoto("ri-building-exterior.jpg", "Modern low-rise residential building"),
        {type: "info", title: "Why this information is important", body: "Your insights help us showcase the key benefits of your property and attract the right " +
        "buyers. A well-written description can make a big difference in generating interest."},
        {type: "tips", title: "Helpful Tips", items: [
          "Be clear and concise.",
          "Highlight what makes your property stand out.",
          "Mention investment potential or rental income.",
          "Share any recent upgrades or improvements.",
          "Don't worry — you can come back and edit this information at any time before submitting your listing.",
        ]},
        riPhoto("ri-living-room.jpg", "Open-concept living room and kitchen"),
      ],
    },
    saleItemsSection,
  ],
  condoApartment: condoApartmentSections,
  condoTownhouse: condoTownhouseSections,
};
propertyTypeSections.stackedTownhouse = propertyTypeSections.condoTownhouse;
propertyTypeFields.condoTownhouse = applySectionConditions(condoTownhouseFields, condoTownhouseSections);
propertyTypeFields.stackedTownhouse = propertyTypeFields.condoTownhouse;
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
const EXTERIOR_LOT_LABELS = {
  homeStyle: "Home style", numberOfStoreys: "Number of storeys", approxYearBuilt: "Approximate year built",
  primaryExteriorFinish: "Primary exterior finish", lotWidth: "Width", lotDepth: "Depth",
  lotMeasurementUnit: "Measurements in",
  propertySetting: "Do any of these describe the property or its setting?",
};

const fieldLabels = {
  condoTownhouse: {
    townhouseConfiguration: "Townhouse configuration",
    unitPosition: "Unit position", numberOfStoreys: "Number of storeys", unitAccess: "How is the unit accessed?",
    unitAccessOther: "Describe the access", squareFootage: "Square footage",
    squareFootageSource: "Square-footage source", yearBuilt: "Approximate year built", unitExposure: "Unit exposure",
    hasBasement: "Does the unit have a basement or below-grade living space?",

    exteriorMaterials: "Which exterior finishes apply?", exteriorMaterialsOther: "Describe the exterior finish",
    outdoorSpaces: "Which features are connected to the unit?",
    outdoorInterest: "How is the private outdoor area identified in the condominium documents?",
    yardFenced: "Is the yard fenced?", outdoorFeatures: "Outdoor features (select all that apply)",
    outdoorMaintainer: "Who maintains this outdoor area?", hasGarage: "Does the unit have a private garage?",
    garageType: "Garage type", garageSpaces: "Garage spaces", hasDriveway: "Does the unit have a driveway?",
    drivewaySpaces: "Driveway spaces",

    garagePermitted: "Does the garage provide permitted parking?", garagePermittedSpaces: "Permitted spaces",
    garageInterest: "Parking interest", garageIdentifier: "Parking identifier",
    drivewayPermitted: "Does the driveway provide permitted parking?", drivewayPermittedSpaces: "Permitted spaces",
    drivewayInterest: "Parking interest", drivewayIdentifier: "Parking identifier",
    hasOtherParking: "Is any additional parking included?", otherParkingSpaces: "Other parking",
    lockerIncluded: "Does the unit include a locker?", lockers: "Lockers",

    bedroomsAboveGrade: "Bedrooms above grade", densAboveGrade: "Dens above grade",
    fullBathroomsAboveGrade: "Full bathrooms above grade", powderRoomsAboveGrade: "Powder rooms above grade",
    livingDiningLayout: "Living and dining layout",
    additionalRooms: "Which additional rooms are above grade? (Select all that apply)",
    otherAboveGradeRoom: "Other above-grade room", interiorFeatures: "Townhouse interior features",
    laundryLocation: "Laundry location", heating: "Heating", cooling: "Cooling",
    primaryFlooring: "Primary flooring (Select all that apply)", appliances: "Appliances included (Select all that apply)",

    basementFinish: "How is the basement finished?", finishedBasementArea: "Approximate finished area",
    basementAccess: "How can the basement be accessed?", bedroomsBelowGrade: "Bedrooms below grade",
    fullBathroomsBelowGrade: "Full bathrooms below grade", powderRoomsBelowGrade: "Powder rooms below grade",
    kitchensBelowGrade: "Kitchens below grade", basementRooms: "Other rooms & features",
    otherBasementRooms: "Other basement rooms",
    hasBasementApartment: "Is any part set up as a separate apartment or self-contained living area?",
    basementApartmentStatus: "How is its status confirmed?", apartmentSeparateEntrance: "Does it have a separate entrance?",
    apartmentOwnKitchen: "Does it have its own kitchen?", apartmentOwnBathroom: "Does it have its own bathroom?",
    basementOccupancy: "How is the basement currently occupied?",
    basementOccupantRemains: "Will the occupant or tenant remain after closing?",
    basementWrittenAgreement: "Is there a written tenancy agreement?",

    bgPosition: "Position within the townhouse row", bgLevels: "Levels / storeys", bgLevelsOther: "Describe the levels",
    bgYearBuilt: "Approximate year built", bgExteriorConstruction: "Exterior construction",
    bgExteriorOther: "Describe the exterior construction", bgFrontExposure: "Exterior exposure / orientation",
    bgOutdoorFeatures: "Private outdoor features", bgOutdoorOther: "Describe the outdoor feature",
    bgBedrooms: "Bedrooms", bgBedroomFeatures: "Bedroom features", bgBathrooms: "Bathrooms",
    bgBathroomFeatures: "Bathroom features", bgLivingRooms: "Living Room", bgDiningRooms: "Dining Room",
    bgKitchens: "Kitchen", bgFamilyRooms: "Family Room", bgDensOffices: "Den / Office", bgEatingAreas: "Eating Area",
    bgOpenConcept: "Open concept layout", bgKitchenType: "Kitchen type", bgAppliances: "Appliances included",
    bgAppliancesOther: "Other appliances", bgLaundryLocation: "Where is the laundry located?",
    bgLaundryOther: "Describe the laundry location", bgHeating: "Heating type", bgCooling: "Cooling",
    bgWaterSupply: "Water supply", bgSewer: "Sewer / Septic", bgElectricalService: "Electrical service",
    bgInteriorFeatures: "Interior features", bgInteriorFeaturesOther: "Other interior features",
    bgInteriorNotes: "Additional interior notes",
    bgHasBasement: "Does this home have a basement?", bgBasementType: "Basement type",
    bgBasementFinish: "Basement finish level", bgBasementAccess: "Basement access",
    bgBasementFeatures: "Basement features", bgBasementFeaturesOther: "Other basement features",
    bgBasementApartment: "Is there a self-contained apartment, in-law suite or separate living space in the basement?",
    bgApartmentLegal: "If yes, is it a legal apartment?",
    bgHasAdditionalSpaces: "Does this property include any additional living spaces above or beyond the main level?",
    bgAdditionalSpaces: "If yes, select all that apply.", bgAdditionalSpacesOther: "Other living space",
    bgParkingTypes: "What parking spaces are included with this property?",
    bgParkingSpaces: "How many parking spaces are included?", bgGarageVehicles: "Garage parking for how many vehicles?",
    bgGarageFeatures: "Garage features (select all that apply)", bgGarageFeaturesOther: "Other garage features",
    bgCommunityFeatures: "Condo / community features", bgCommunityOther: "Other community features",
    bgHasCondoFees: "Are there monthly condo / maintenance fees?",
    bgMonthlyFee: "Monthly condo / maintenance fee amount", bgFeeInclusions: "What is included in the monthly fee?",
    bgNearbyAmenities: "Nearby amenities", bgOtherNearby: "Other nearby features",
    bgNeighbourhoodHighlights: "Neighbourhood highlights (optional)", bgLocatedIn: "Property is located in:",
    bgClientRemarks: "Client remarks", bgChattels: "Chattels & fixtures (Included)", bgChattelsOther: "Other chattels",
    bgRentedItems: "Rented or leased items", bgRentedOther: "Other rented or leased items",

    bbPosition: "Townhouse position", bbStoreys: "Number of storeys", bbStoreysOther: "Describe the storeys",
    bbPrivateEntrance: "Private exterior entrance", bbOutdoorAreas: "Outdoor areas belonging to the unit",
    bbGarageType: "Garage type", bbGarageSpaces: "Garage spaces", bbDrivewaySpaces: "Driveway or surface spaces",
    bbDirectGarageAccess: "Direct access from the garage", bbEvCharger: "Electric vehicle charging",
    bbBedrooms: "Bedrooms above grade", bbFullBathrooms: "Full bathrooms above grade",
    bbPartialBathrooms: "Partial bathrooms above grade", bbPrincipalRooms: "Principal rooms",
    bbPrincipalRoomsOther: "Other principal rooms", bbKitchens: "Kitchens above grade", bbKitchenType: "Kitchen type",
    bbLaundryLocation: "Laundry location", bbInteriorFeatures: "Interior features",
    bbOtherInteriorFeatures: "Other interior features",
    bbLevelStatus: "Level status", bbBasementAccess: "Access", bbBedroomsBelowGrade: "Bedrooms",
    bbFullBathroomsBelowGrade: "Full bathrooms", bbPartialBathroomsBelowGrade: "Partial bathrooms",
    bbOtherFinishedRooms: "Other finished rooms", bbOtherFinishedRoomsOther: "Other finished room",
    bbHasSuite: "Is any part of this level used as a separate apartment or secondary suite?",
    bbSuiteLegalStatus: "Legal status", bbSuiteTenantOccupied: "Is the suite currently occupied by a tenant?",
    bbHeating: "Heating", bbHeatingFuel: "Heating fuel", bbCooling: "Cooling", bbWaterSupply: "Water supply",
    bbElectricalPanel: "Electrical panel", bbElectricalService: "Electrical service",
    bbEquipmentOwnership: "Equipment ownership", bbOtherEquipment: "Other rented or leased equipment",
    bbAdditionalSystems: "Additional systems",
    bbCorporationNumber: "Condominium corporation number", bbManagementCompany: "Property management company",
    bbMonthlyFee: "Current monthly fee", bbFeeInclusions: "What does the fee include? Select all that apply.",
    bbParkingStatus: "Parking status", bbParkingSpaceNumber: "Parking space number",
    bbLockerIncluded: "Is a locker included with the townhouse?", bbLockerStatus: "Locker status",
    bbLockerNumber: "Locker number", bbSharedAmenities: "Shared amenities",
    bbNearby: "What's nearby?", bbLocationHighlights: "Location highlights",
    bbStreetSetting: "Street and community setting", bbFrontExposure: "Front exposure", bbView: "View",
    bbClientRemarks: "Describe your townhouse", bbChattels: "Chattels included",
    bbOtherChattels: "Other included items", bbNoExcludedFixtures: "No excluded fixtures",
    bbExcludedFixtures: "Fixtures excluded", bbHasRentedItems: "Are any systems, appliances or other items rented or leased?",
    bbRentedItems: "If Yes, select all that apply.", bbRentalDetails: "Rental company or details",
  },
  rural: {
    ruralPropertyType: "Property Type", acreage: "Acreage (Total Land Size)", acreageUnit: "Acreage unit",
    lotShape: "Lot Shape", frontage: "Frontage (Approx.)", frontageUnit: "Frontage unit", depth: "Depth (Approx.)",
    depthUnit: "Depth unit", propertyUse: "Property Use", yearBuilt: "Year Built", storeys: "Storeys",
    aboveGradeArea: "Approx. Total Above Grade Area", aboveGradeAreaUnit: "Area unit",
    municipalAddress: "Municipal Address?", roadAccessType: "Road / Access Type",
    yearRoundAccess: "Year-Round Access?", nearestTown: "Nearest Town / Community",
    distanceToTown: "Distance to Town (Approx.)", distanceToTownUnit: "Distance unit",
    exteriorConstruction: "Exterior Construction", exteriorFinish: "Exterior Finish", roofType: "Roof Type",
    roofMaterial: "Roof Material",

    bedrooms: "Bedrooms", bathrooms: "Bathrooms", kitchens: "Kitchens", diningRooms: "Dining Rooms",
    livingRooms: "Living Rooms", familyRooms: "Family Rooms", otherRooms: "Other Rooms (e.g., Den, Office, Library)",
    heatingType: "Heating Type", coolingType: "Cooling Type", fireplaceWoodStove: "Fireplace / Wood Stove",
    waterSource: "Water Source", sewerSeptic: "Sewer / Septic System", electricalService: "Electrical Service",
    laundryLocation: "Laundry Location", laundryTubSink: "Laundry Tub / Sink",
    otherLaundryFeatures: "Other Laundry Features", flooring: "Flooring", interiorFeatures: "Interior Features",
    accessibilityFeatures: "Accessibility Features", securityFeatures: "Security Features",
    additionalNotes: "Additional Notes",

    basementType: "Basement Type", basementFinish: "Basement Finish", walkOutWalkUp: "Walk-Out / Walk-Up",
    separateEntrance: "Separate Entrance", basementRooms: "Basement Rooms",
    basementApartment: "Basement Apartment / Secondary Suite", apartmentLegalStatus: "If Yes, Is It Legal?",
    apartmentTenancyStatus: "Basement Tenancy Status",
    apartmentVacantPossession: "Will the Basement Be Vacant Possession on Closing?",
    additionalLivingSpaces: "Additional Living Spaces", additionalSpacesDescription: "Please describe",
    otherStructures: "Are there any other residential or non-residential buildings on the property?",
    otherStructuresDescription: "If Yes, Please Describe",

    outbuildings: "Outbuildings & Structures", outbuildingDetails: "Outbuilding details",
    landFeatures: "Land Features", drivewayType: "Driveway Type", drivewaySurface: "Driveway Surface",
    parkingCapacity: "Parking Capacity (Approx.)", utilitiesAtProperty: "Utilities At Property",

    schoolsDistance: "Schools", shoppingDistance: "Shopping / Groceries", healthcareDistance: "Healthcare",
    recreationCentreDistance: "Recreation Centre", parksDistance: "Parks / Conservation",
    highwaysDistance: "Highways / Major Roads", publicTransitDistance: "Public Transit",
    trailsDistance: "Nearby Trails", golfDistance: "Golf / Recreation Facilities",
    waterfrontDistance: "Waterfront / Lake / River Access", airportDistance: "Airport",
    otherNearbyAmenities: "Other Nearby Amenities", schoolBusAccess: "School Bus Access",
    garbageCollection: "Garbage / Waste Collection", mailDelivery: "Mail Delivery",
    internetService: "Internet Service Availability", internetProvider: "Provider (if known)",
    cellularService: "Cellular Service", emergencyServices: "Emergency Services Proximity",

    clientRemarks: "Client Remarks / MLS® Description", includedChattels: "Chattels Included",
    otherIncludedItems: "Other included items",
    fixturesExcluded: "List any fixtures, built-ins, or attached items that are NOT included in the sale.",
    rentedLeasedItems: "Rented or Leased Items", rentalDetails: "Rental company / details",
    ruralItems: "Rural-Specific Items", otherRuralItems: "Other items",
  },
  detached: {
    ...EXTERIOR_LOT_LABELS,
    additionalBuildingOrLivingSpace: "Is there another building or living space on the property?",

    hasDriveway: "Does the property have a driveway?", drivewayType: "Driveway type",
    drivewayFinish: "Driveway finish", outsideParkingSpaces: "Outside parking spaces",
    hasGarage: "Does the property have a garage or carport?", garageType: "Garage type",
    indoorParkingSpaces: "Indoor parking spaces", yardOutdoorFeatures: "Which of these are on the property?",

    bedroomsAboveGround: "Bedrooms above ground", fullBathroomsAboveGround: "Full bathrooms above ground",
    partialBathroomsAboveGround: "Partial bathrooms above ground", mainHeatingType: "Main heating type",
    cooling: "Cooling", hasFireplace: "Fireplace", fireplaceCount: "Number of fireplaces",
    fireplaceTypes: "Fireplace type", laundryLocation: "Laundry location", interiorFeatures: "Interior Features",
    interiorFeaturesOther: "Something else",

    hasBasement: "Does the home have a basement?", basementFinish: "How is the basement finished?",
    basementBedrooms: "Bedrooms in the basement", basementWashrooms: "Washrooms in the basement",
    basementApartment: "Does the home have a basement apartment with a separate entrance?",
    apartmentLivingRoom: "Living room", apartmentFamilyRoom: "Family room", apartmentKitchenStyle: "Kitchen style",
    apartmentLaundrySetup: "Laundry setup", apartmentCurrentlyLeased: "Is the basement apartment currently leased?",
    ...FINAL_LISTING_LABELS,
  },

  semiDetached: {
    ...EXTERIOR_LOT_LABELS,

    hasDriveway: "Does the property have a driveway?", drivewayArrangement: "Driveway arrangement",
    drivewayType: "Driveway type", drivewayFinish: "Driveway finish", outsideParkingSpaces: "Outside parking spaces",
    hasGarage: "Does the property have a garage or carport?", garageType: "Garage type",
    indoorParkingSpaces: "Indoor parking spaces",
    garageSharedWithAdjoining: "Any part shared with the adjoining property?",
    yardOutdoorFeatures: "Which of these are on the property?",
    yardExclusiveUse: "Are the yard and outdoor areas for this property's exclusive use?",

    bedroomsAboveGrade: "Bedrooms above grade", bedroomsBelowGrade: "Bedrooms below grade",
    fullBathrooms: "Full bathrooms", partialBathrooms: "Partial bathrooms",
    mainLivingSpaces: "Main living spaces", otherFinishedRoom: "Other finished room",
    interiorFeatures: "Interior features",

    primaryHeatingSystem: "Primary heating system", heatingFuel: "Heating fuel", coolingSystem: "Cooling system",
    additionalHeating: "Additional heating", waterSource: "Water source", sewageSystem: "Sewage system",
    electricalService: "Electrical service", hotWaterSystem: "Hot water system",
    sharedSystems: "Are any mechanical systems, meters or utility services shared with the adjoining property?",

    hasBasement: "Does the property have a basement or lower level?", basementFinish: "Current level of finish",
    basementAccess: "How can the basement or lower level be accessed?",
    basementRooms: "Which rooms or spaces are included?", basementOtherRoom: "Other finished room",
    basementSeparateUnit: "Is there a basement apartment or other separate living unit?",
    separateUnitStatus: "Seller's understanding of its status", separateUnitOccupancy: "Current occupancy",
    separateUnitVacantPossession: "Vacant possession on closing?",

    hasAdditionalLivingSpace: "Does the property include another separate building or living space?",
    additionalSpaceTypes: "Type of space", additionalSpaceUse: "Current use", additionalSpaceOccupancy: "Occupancy",
    additionalSpaceApproval: "Municipal approval status",
    additionalSpaceServicesShared: "Are any utilities or services shared with the main home?",

    everydayConveniences: "Everyday conveniences", transportationAccess: "Transportation & access",
    settingSurroundings: "Setting & surroundings", otherNotableSetting: "Other notable setting",

    clientRemarks: "Client remarks", includedChattels: "Included chattels", otherChattels: "Other items",
    excludedFixtures: "Excluded fixtures", excludedFixturesList: "Excluded fixtures to list",
    rentedEquipment: "Will the buyer assume any rented or leased equipment?", rentedItems: "Rented or leased items",
  },

  condoApartment: {
    condoStyle: "Condominium style", buildingStoreys: "Building storeys", unitLevel: "Unit level",
    squareFootage: "Square footage", squareFootageSource: "Square-footage source", unitExposure: "Unit exposure",
    privateOutdoorSpace: "Private outdoor space",

    parkingIncluded: "Does the unit include parking?", parkingSpaces: "Parking spaces",
    lockerIncluded: "Does the unit include a locker?", lockers: "Lockers",

    condoCorporation: "Condominium corporation", managementCompany: "Property management company",
    managerContact: "Property manager or contact", managementTelephone: "Management telephone",
    monthlyFee: "Monthly maintenance fee", feeInclusions: "What does the fee include?",
    hasSpecialAssessment: "Is there a current or approved special assessment?",
    assessmentAmount: "Assessment amount", assessmentFrequency: "Payment frequency",
    assessmentEndDate: "Expected end date", assessmentPurpose: "Purpose of assessment",
    assessmentPaidInFull: "Has the assessment been paid in full?",
    statusCertificate: "Do you have a current status certificate?",

    bedrooms: "Bedrooms", dens: "Dens", fullBathrooms: "Full bathrooms", powderRooms: "Powder rooms",
    principalRooms: "Which rooms are in the unit?", otherInteriorRoom: "Other interior room",
    interiorFeatures: "Interior features", laundry: "Laundry", heating: "Heating", cooling: "Cooling",
    primaryFlooring: "Primary flooring", appliances: "Appliances included",

    concierge: "Concierge", entryServices: "Entry & security services",
    fitnessAmenities: "Fitness, wellness & recreation", socialAmenities: "Social & outdoor amenities",
    practicalAmenities: "Parking, access & practical amenities",
    hasOtherAmenity: "Is there another shared amenity?", otherAmenities: "Other shared amenities",

    petsPermitted: "Are pets permitted?", permittedPets: "Permitted pets", maxPets: "Maximum number of pets",
    maxPetWeight: "Maximum weight, if applicable", petRestrictionDetails: "Pet restriction details",
    bbqPermitted: "Are barbecues permitted?", bbqRestrictionDetails: "Barbecue restriction details",
    hasOtherBalconyRestrictions: "Are there other balcony or terrace restrictions?",
    balconyRestrictionDetails: "Balcony or terrace restriction details",
    smokingVapingRules: "What do the condominium rules provide?",
    smokingVapingDetails: "Smoking or vaping restriction details", longTermLeasing: "Long-term leasing",
    longTermLeasingDetails: "Long-term leasing restriction details", shortTermRentals: "Short-term rentals",
    shortTermRentalDetails: "Short-term rental restriction details", rulesSources: "How did you confirm these rules?",
    hasOtherRestrictions: "Are there other restrictions a buyer should know about?",
    otherRestrictionsDetails: "Other restrictions",

    currentOccupancy: "Current occupancy", tenancySituation: "What is the tenancy situation?",
    writtenTenancyAgreement: "Is there a written tenancy agreement?",
    tenancyIncludesParking: "Does the tenancy include a parking space?",
    tenancyIncludesLocker: "Does the tenancy include a locker?",
    tenantRemainsAfterClosing: "Will the tenant remain after closing?",
    tenancyAgreementAvailable: "Do you have the current tenancy agreement available?",
    hasOtherOccupancyAgreements: "Are there other written agreements or notices affecting occupancy?",
    otherOccupancyAgreementsDetails: "Agreements or notices affecting occupancy",

    areaSetting: "Area setting", areaSettingOther: "Describe the setting", transitAccess: "Transit & transportation",
    everydayServices: "Everyday services", parksDestinations: "Parks, recreation & destinations",
    hasOtherNearbyFeature: "Would you like to identify another nearby feature?",
    otherNearbyFeatures: "Other nearby features", locationLikes: "What do you like about this location? (optional)",

    clientRemarks: "Client remarks", includedItems: "Items included with the sale",
    otherIncludedItems: "Other included items", hasExcludedFixtures: "Are any fixtures excluded from the sale?",
    excludedFixtures: "Fixtures to be excluded", hasRentedItems: "Are any items rented or leased?",
    rentedItems: "Rented or leased items",
  },

  residentialIncome: {
    ...FINAL_LISTING_LABELS,
    unitCount: "How many self-contained residential units are in the property?",
    unitArrangement: "How are the residential units arranged within the building?",
    approxBuildingSqFt: "Approximate total building square footage",
    sqFtSource: "Square-footage source",
    approxYearBuilt: "Approximate year built",

    units: "Units",

    exteriorConstruction: "Exterior Construction",
    drivewayType: "Driveway Type",
    totalParkingSpaces: "Total Parking Spaces",
    parkingArrangement: "Parking Arrangement",
    garageType: "Garage",
    garageSpaces: "Number of Garage Spaces",
    yardSpace: "Yard / Outdoor Space",
    outdoorSpaceArrangement: "Outdoor Space Arrangement",
    deckPatioBalcony: "Deck / Patio / Balcony",
    fencing: "Fencing",
    otherExteriorFeatures: "Other Exterior Features",

    heatingSystem: "Heating System",
    coolingSystem: "Cooling System",
    hydroMetering: "Electricity / Hydro Metering",
    gasMetering: "Natural Gas Metering",
    waterMetering: "Water Metering",
    hotWater: "Hot Water",

    nearbyAmenities: "Nearby Amenities",
    transitAccess: "Transit & Access",
    schools: "Schools",
    parksRecreation: "Parks & Recreation",
    lifestyle: "Lifestyle & Convenience",

    unitTenancies: "Tenancy Information",

    propertyHighlights: "Property Highlights",
    uniqueFeatures: "What Makes This Property Unique?",
    idealBuyer: "Ideal Buyer",
    additionalComments: "Additional Comments",
  },
};
// The Traditional flow ends with Condo Apartment's pages, labelled the same way.
fieldLabels.condoTownhouse = {...fieldLabels.condoApartment, ...fieldLabels.condoTownhouse};

/**
 * Optional per-(propertyType, fieldName) helper text shown under a field's
 * label (the mockups' grey subtitle line). "(Optional)" is left out — the
 * schema response's `required: false` already carries that.
 */
const SELECT_ALL = "Select all that apply.";
const fieldHints = {
  detached: {
    propertySetting: SELECT_ALL,
    additionalBuildingOrLivingSpace: "Select the best answer.",
    yardOutdoorFeatures: SELECT_ALL,
    interiorFeatures: SELECT_ALL,
    ...FINAL_LISTING_HINTS,
  },
  semiDetached: {
    propertySetting: SELECT_ALL,
    yardOutdoorFeatures: SELECT_ALL,
  },
  condoTownhouse: {
    bgLivingRooms: "Above grade", bgDiningRooms: "Above grade", bgKitchens: "Above grade", bgFamilyRooms: "Above grade",
    bgDensOffices: "Above grade", bgEatingAreas: "Above grade",
    bgBedrooms: "How many bedrooms are in the home?", bgBathrooms: "How many bathrooms are in the home?",
  },
  residentialIncome: {
    ...FINAL_LISTING_HINTS,
    unitArrangement: SELECT_ALL,
    exteriorConstruction: SELECT_ALL,
    otherExteriorFeatures: SELECT_ALL,

    heatingSystem: "How is the property heated?",
    coolingSystem: "How is the property cooled?",
    hydroMetering: "How is electricity (hydro) metered?",
    gasMetering: "How is natural gas metered?",
    waterMetering: "How is water metered?",
    hotWater: "How is hot water provided?",

    nearbyAmenities: SELECT_ALL,
    transitAccess: SELECT_ALL,
    schools: SELECT_ALL,
    parksRecreation: SELECT_ALL,
    lifestyle: SELECT_ALL,

    propertyHighlights: "What do you love most about this property?",
    uniqueFeatures: "Share any additional details that may not have been covered in the previous pages.",
    idealBuyer: "Who do you think would be the perfect buyer for this property?",
    additionalComments: "Anything else you would like us to know?",
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

/** Property types checked for completeness before checkout, with any cross-field rules. */
const submissionRules = {
  residentialIncome: residentialIncomeSubmissionRules,
  detached: [],
  semiDetached: [],
  rural: [],
  condoApartment: condoApartmentSubmissionRules,
  condoTownhouse: [],
};
submissionRules.coOperativeApartment = submissionRules.condoApartment;
submissionRules.stackedTownhouse = submissionRules.condoTownhouse;

/** Titles of the flow stages sections can belong to (via `stage`). */
const sectionStages = {
  finalListing: {title: "Final Listing Information"},
};

module.exports = {
  getFieldDefinition,
  isValidPropertyType,
  propertyTypeFields,
  commonFields,
  propertyTypeSections,
  fieldLabels,
  fieldHints,
  submissionRules,
  sectionStages,
  ENUM_VALUE_LABELS,
};
