const Joi = require('joi');

/**
 * ─────────────────────────────────────────────────────────────────────
 * SHARED OPTION LISTS
 *
 * Several checkbox / radio groups repeat, with identical choices, across
 * more than one property-type screen (garage type, heating type, interior
 * features on Detached vs Semi-Detached, etc). Centralizing them keeps the
 * schemas below in sync with the actual designs and avoids copy/paste
 * drift when a screen changes.
 * ─────────────────────────────────────────────────────────────────────
 */
const PARKING_INCLUDED_OPTIONS = ['none', '1', '2', '3_plus'];
const GARAGE_OPTIONS = ['none', '1_car', '2_car', '3_plus_car'];
const HEATING_TYPE_OPTIONS = ['forced_air_gas', 'forced_air_electric', 'electric_baseboard', 'heat_pump', 'other'];
const BASEMENT_FEATURES_OPTIONS = ['finished_basement', 'walk_out_basement', 'separate_entrance', 'basement_apartment'];
const INTERIOR_FEATURES_OPTIONS = [
    'renovated_kitchen', 'hardwood_floors', 'updated_bathrooms', 'fireplace',
    'open_concept_layout', 'pot_lights', 'high_ceilings', 'stainless_steel_appliances',
    'central_air', 'newer_windows', 'other',
];
const CONDO_OUTDOOR_SPACE_OPTIONS = ['balcony', 'terrace', 'juliette_balcony', 'none'];
const CONDO_LAYOUT_OPTIONS = [
    'studio', '1_bedroom', '1_bedroom_den', '2_bedroom', '2_bedroom_den',
    '3_bedroom', '3_bedroom_den', '4_bedroom_plus',
];
const CONDO_BUILDING_AMENITIES_OPTIONS = [
    'concierge', 'fitness_centre', 'indoor_pool', 'party_room', 'guest_suites',
    'visitor_parking', 'rooftop_terrace', 'security', 'ev_charging',
];
const CONDO_SUITE_FEATURES_OPTIONS = [
    'renovated_kitchen', 'hardwood_engineered_floors', 'updated_bathroom', 'stainless_steel_appliances',
    'open_concept_layout', 'ensuite_laundry', 'walk_in_closet', 'den_home_office', 'premium_parking_space', 'other',
];
const OCCUPANCY_OPTIONS = ['owner_occupied', 'tenant_occupied', 'vacant'];
const CONTACT_METHOD_OPTIONS = ['email', 'text', 'phone'];
const BEST_TIMES_OPTIONS = ['morning', 'afternoon', 'evening', 'anytime'];

/**
 * ─────────────────────────────────────────────────────────────────────
 * PROPERTY-TYPE-SPECIFIC FIELDS
 *
 * Keyed first by propertyType, then by fieldName. This is the ONLY
 * place you touch to add/change a field for a given property type.
 *
 *   path   - the Firestore top-level map field the value is written under.
 *            Matches your existing data shape: saveProperty() spreads
 *            sectionValues' keys directly onto the document root
 *            (e.g. doc.location, doc.pricing) rather than nesting them
 *            under a `sectionValues` key — so sections ARE top-level map
 *            fields, and that's what we replicate here.
 *   dbKey  - actual Firestore key, if different from fieldName (optional,
 *            defaults to fieldName).
 *   schema - Joi schema validating the incoming fieldValue.
 *
 * Sourced from the mockups:
 *   - "Let's build your listing together" (basics: address, layout, parking)
 *   - "Property Features & Upgrades" / "Property Features, Amenities & Lifestyle"
 *   - "Tell us about your duplex/triplex property" & "...rural property"
 *     (the longer, type-specific Property Details screens)
 * ─────────────────────────────────────────────────────────────────────
 */
const propertyTypeFields = {
    detached: {
        bedrooms: { path: 'basics', schema: Joi.number().integer().min(0).max(20) },
        bathrooms: { path: 'basics', schema: Joi.number().min(0).max(20) },
        parkingSpacesIncluded: { path: 'basics', schema: Joi.string().valid(...PARKING_INCLUDED_OPTIONS) },

        interiorFeatures: { path: 'features', schema: Joi.array().items(Joi.string().valid(...INTERIOR_FEATURES_OPTIONS)) },
        interiorFeaturesOther: { path: 'features', schema: Joi.string().max(200).allow('', null) },
        basementFeatures: { path: 'basement', schema: Joi.array().items(Joi.string().valid(...BASEMENT_FEATURES_OPTIONS)) },
        garageType: { path: 'garage', schema: Joi.string().valid(...GARAGE_OPTIONS) },
        heatingType: { path: 'heating', schema: Joi.string().valid(...HEATING_TYPE_OPTIONS) },
        heatingTypeOther: { path: 'heating', schema: Joi.string().max(200).allow('', null) },
        exteriorFeatures: {
            path: 'exterior',
            schema: Joi.array().items(Joi.string().valid('large_backyard', 'deck_patio', 'fenced_yard', 'pool', 'other')),
        },
        exteriorFeaturesOther: { path: 'exterior', schema: Joi.string().max(200).allow('', null) },
    },

    semiDetached: {
        bedrooms: { path: 'basics', schema: Joi.number().integer().min(0).max(20) },
        bathrooms: { path: 'basics', schema: Joi.number().min(0).max(20) },
        parkingSpacesIncluded: { path: 'basics', schema: Joi.string().valid(...PARKING_INCLUDED_OPTIONS) },

        interiorFeatures: { path: 'features', schema: Joi.array().items(Joi.string().valid(...INTERIOR_FEATURES_OPTIONS)) },
        interiorFeaturesOther: { path: 'features', schema: Joi.string().max(200).allow('', null) },
        basementFeatures: { path: 'basement', schema: Joi.array().items(Joi.string().valid(...BASEMENT_FEATURES_OPTIONS)) },
        garageType: { path: 'garage', schema: Joi.string().valid(...GARAGE_OPTIONS) },
        frontYardParking: { path: 'garage', schema: Joi.string().valid('none', '1_vehicle', '2_vehicles', '3_plus_vehicles') },
        heatingType: { path: 'heating', schema: Joi.string().valid(...HEATING_TYPE_OPTIONS) },
        heatingTypeOther: { path: 'heating', schema: Joi.string().max(200).allow('', null) },
        outdoorFeatures: {
            path: 'exterior',
            schema: Joi.array().items(Joi.string().valid('large_backyard', 'deck_patio', 'fenced_yard', 'pool', 'end_unit', 'other')),
        },
        outdoorFeaturesOther: { path: 'exterior', schema: Joi.string().max(200).allow('', null) },
    },

    condoApartment: {
        layoutBedroomsDen: { path: 'basics', schema: Joi.string().valid(...CONDO_LAYOUT_OPTIONS).required() },
        bathrooms: { path: 'basics', schema: Joi.number().min(0).max(10) },
        parkingSpacesIncluded: { path: 'basics', schema: Joi.string().valid(...PARKING_INCLUDED_OPTIONS) },
        lockerIncluded: { path: 'basics', schema: Joi.boolean() },
        floorNumber: { path: 'condoDetails', schema: Joi.number().integer().min(0).max(200) },
        squareFootage: { path: 'condoDetails', schema: Joi.number().positive().allow(null) },
        maintenanceFee: { path: 'condoDetails', schema: Joi.number().min(0) },
        outdoorSpace: { path: 'condoDetails', schema: Joi.string().valid(...CONDO_OUTDOOR_SPACE_OPTIONS) },

        suiteFeatures: { path: 'features', schema: Joi.array().items(Joi.string().valid(...CONDO_SUITE_FEATURES_OPTIONS)) },
        suiteFeaturesOther: { path: 'features', schema: Joi.string().max(200).allow('', null) },
        outdoorSpaceFeatures: { path: 'features', schema: Joi.array().items(Joi.string().valid(...CONDO_OUTDOOR_SPACE_OPTIONS)) },
        unitFeatures: {
            path: 'features',
            schema: Joi.array().items(Joi.string().valid('corner_unit', 'south_exposure', 'lake_view', 'city_view', 'pet_friendly_building')),
        },
        buildingAmenities: { path: 'amenities', schema: Joi.array().items(Joi.string().valid(...CONDO_BUILDING_AMENITIES_OPTIONS)) },
    },

    condoTownhouse: {
        layoutBedroomsDen: { path: 'basics', schema: Joi.string().valid(...CONDO_LAYOUT_OPTIONS).required() },
        bathrooms: { path: 'basics', schema: Joi.number().min(0).max(10) },
        parkingSpacesIncluded: { path: 'basics', schema: Joi.string().valid(...PARKING_INCLUDED_OPTIONS) },
        lockerIncluded: { path: 'basics', schema: Joi.boolean() },
        maintenanceFee: { path: 'condoDetails', schema: Joi.number().min(0) },

        suiteFeatures: { path: 'features', schema: Joi.array().items(Joi.string().valid(...CONDO_SUITE_FEATURES_OPTIONS)) },
        suiteFeaturesOther: { path: 'features', schema: Joi.string().max(200).allow('', null) },
        buildingAmenities: { path: 'amenities', schema: Joi.array().items(Joi.string().valid(...CONDO_BUILDING_AMENITIES_OPTIONS)) },
    },

    rural: {
        ruralPropertySubtype: {
            path: 'ruralDetails',
            schema: Joi.string().valid('country_home_estate', 'hobby_farm', 'agricultural_working_farm', 'recreational_property_land', 'other_not_sure').required(),
        },
        acreage: { path: 'ruralDetails', schema: Joi.string().max(50) },
        yearBuilt: { path: 'ruralDetails', schema: Joi.string().max(50) },
        bedrooms: { path: 'ruralDetails', schema: Joi.number().integer().min(0).max(20) },
        bathrooms: { path: 'ruralDetails', schema: Joi.number().min(0).max(20) },
        waterSupply: { path: 'ruralDetails', schema: Joi.string().valid('municipal', 'well', 'other_not_sure') },
        sewerSystem: { path: 'ruralDetails', schema: Joi.string().valid('municipal', 'septic', 'other_not_sure') },
        heatingType: { path: 'ruralDetails', schema: Joi.string().max(50) },
        currentLandUse: { path: 'ruralDetails', schema: Joi.string().max(50) },
        isIncomeProducing: { path: 'ruralDetails', schema: Joi.boolean() },
        incomeProducingTypes: {
            path: 'ruralDetails',
            schema: Joi.array().items(Joi.string().valid('crop_production', 'livestock', 'greenhouse', 'rental_income', 'other')),
        },
        incomeProducingOther: { path: 'ruralDetails', schema: Joi.string().max(200).allow('', null) },
        propertySetting: {
            path: 'ruralDetails',
            schema: Joi.string().valid('close_to_town', 'rural_residential_area', 'country_setting', 'private_secluded', 'agricultural_area'),
        },
        distanceToTown: { path: 'ruralDetails', schema: Joi.string().max(50) },
        additionalNotes: { path: 'ruralDetails', schema: Joi.string().max(1000).allow('', null) },

        landFeatures: {
            path: 'land',
            schema: Joi.array().items(Joi.string().valid(
                'mature_trees', 'wooded_area', 'open_fields', 'pond', 'creek_stream', 'scenic_views',
                'private_setting', 'rolling_hills', 'cleared_land', 'mixed_forest', 'conservation_area_nearby',
                'waterfront_access', 'other',
            )),
        },
        landFeaturesOther: { path: 'land', schema: Joi.string().max(200).allow('', null) },
        waterSepticSystems: {
            path: 'water',
            schema: Joi.array().items(Joi.string().valid(
                'drilled_well', 'dug_well', 'water_softener', 'uv_water_treatment', 'reverse_osmosis_system',
                'septic_system', 'septic_recently_updated', 'water_quality_tested', 'new_well_pump', 'holding_tank', 'other',
            )),
        },
        waterSepticSystemsOther: { path: 'water', schema: Joi.string().max(200).allow('', null) },
        outbuildings: {
            path: 'outbuildings',
            schema: Joi.array().items(Joi.string().valid(
                'detached_garage', 'workshop', 'barn', 'drive_shed', 'equipment_storage', 'greenhouse',
                'guest_cabin', 'bunkie', 'storage_building', 'chicken_coop', 'other',
            )),
        },
        outbuildingsOther: { path: 'outbuildings', schema: Joi.string().max(200).allow('', null) },
        outdoorLifestyleFeatures: {
            path: 'lifestyle',
            schema: Joi.array().items(Joi.string().valid(
                'walking_trails', 'atv_trails', 'snowmobile_access', 'hunting_area', 'fishing_nearby', 'fire_pit_area',
                'outdoor_entertaining_space', 'fruit_trees', 'vegetable_garden', 'fenced_yard', 'hot_tub_area', 'other',
            )),
        },
        outdoorLifestyleFeaturesOther: { path: 'lifestyle', schema: Joi.string().max(200).allow('', null) },
        parkingAccessFeatures: {
            path: 'parking',
            schema: Joi.array().items(Joi.string().valid(
                'circular_driveway', 'long_private_driveway', 'multiple_vehicle_parking', 'rv_parking', 'trailer_parking',
                'equipment_parking', 'easy_winter_access', 'municipal_road_access', 'year_round_road_access', 'gated_entrance', 'other',
            )),
        },
        parkingAccessFeaturesOther: { path: 'parking', schema: Joi.string().max(200).allow('', null) },
        agriculturalFeatures: {
            path: 'agricultural',
            schema: Joi.array().items(Joi.string().valid(
                'hobby_farm', 'horse_property', 'fenced_pastures', 'livestock_ready', 'existing_crop_area', 'orchard',
                'maple_trees', 'agricultural_zoning', 'farm_tax_program', 'riding_ring', 'paddocks', 'other',
            )),
        },
        agriculturalFeaturesOther: { path: 'agricultural', schema: Joi.string().max(200).allow('', null) },
    },

    duplex: {
        numberOfUnits: { path: 'duplexDetails', schema: Joi.string().valid('duplex_2_units', 'triplex_3_units').required() },
        buildingOccupancy: {
            path: 'duplexDetails',
            schema: Joi.string().valid('owner_occupied_plus_rental', 'fully_tenant_occupied', 'vacant'),
        },
        ownerOccupancyOpportunity: { path: 'duplexDetails', schema: Joi.string().valid('yes', 'no', 'not_sure') },
        numberOfStoreys: { path: 'duplexDetails', schema: Joi.number().valid(1, 2, 3) },
        hasLowerLevelApartment: { path: 'duplexDetails', schema: Joi.string().valid('no', 'yes', 'not_sure') },
        buildingAccessType: { path: 'duplexDetails', schema: Joi.string().valid('elevator_building', 'walk_up_building', 'not_applicable') },
        totalBedrooms: { path: 'duplexDetails', schema: Joi.number().integer().min(0).max(30) },
        totalBathrooms: { path: 'duplexDetails', schema: Joi.number().min(0).max(30) },
        totalLivingRooms: { path: 'duplexDetails', schema: Joi.number().integer().min(0).max(10) },
        totalDiningAreas: { path: 'duplexDetails', schema: Joi.number().integer().min(0).max(10) },
        laundrySetup: { path: 'duplexDetails', schema: Joi.string().valid('ensuite_laundry_in_units', 'shared_laundry', 'no_laundry') },
        approxFinishedSquareFootage: { path: 'duplexDetails', schema: Joi.string().max(50) }, // range dropdown, e.g. "2,500 - 3,000 sq ft"
        buildingAccess: { path: 'duplexDetails', schema: Joi.string().valid('separate_unit_entrances', 'shared_main_entrance', 'combination_of_both') },
        totalParkingSpaces: { path: 'duplexDetails', schema: Joi.number().integer().min(0).max(20) },
        parkingType: {
            path: 'duplexDetails',
            schema: Joi.array().items(Joi.string().valid('garage', 'private_drive', 'surface_parking', 'laneway_access', 'other')),
        },
        parkingTypeOther: { path: 'duplexDetails', schema: Joi.string().max(200).allow('', null) },
        layoutAccessNotes: { path: 'duplexDetails', schema: Joi.string().max(300).allow('', null) },

        buildingFeatures: {
            path: 'building',
            schema: Joi.array().items(Joi.string().valid(
                'separate_hydro_meters', 'separate_gas_meters', 'separate_water_meters', 'self_contained_units',
                'fire_retrofit_completed', 'updated_electrical', 'updated_plumbing', 'security_system',
                'intercom_buzz_in_system', 'other',
            )),
        },
        buildingFeaturesOther: { path: 'building', schema: Joi.string().max(200).allow('', null) },
        unitFeatures: {
            path: 'unit',
            schema: Joi.array().items(Joi.string().valid(
                'renovated_kitchens', 'updated_bathrooms', 'hardwood_flooring', 'stainless_steel_appliances',
                'ensuite_laundry', 'central_air', 'newer_windows', 'open_concept_layout', 'balcony_terrace', 'other',
            )),
        },
        unitFeaturesOther: { path: 'unit', schema: Joi.string().max(200).allow('', null) },
        lowerLevelFeatures: {
            path: 'lowerLevel',
            schema: Joi.array().items(Joi.string().valid(
                'finished_basement', 'separate_entrance', 'self_contained_unit', 'additional_living_area', 'storage_area', 'other',
            )),
        },
        lowerLevelFeaturesOther: { path: 'lowerLevel', schema: Joi.string().max(200).allow('', null) },
        outdoorFeatures: {
            path: 'exterior',
            schema: Joi.array().items(Joi.string().valid(
                'backyard', 'deck', 'patio', 'fenced_yard', 'garden_area', 'storage_shed', 'landscaping', 'other_outdoor_space', 'other',
            )),
        },
        outdoorFeaturesOther: { path: 'exterior', schema: Joi.string().max(200).allow('', null) },
        parkingAccessFeatures: {
            path: 'parking',
            schema: Joi.array().items(Joi.string().valid(
                'garage_parking', 'private_drive', 'laneway_access', 'visitor_parking', 'extra_parking_area', 'easy_winter_access', 'other',
            )),
        },
        parkingAccessFeaturesOther: { path: 'parking', schema: Joi.string().max(200).allow('', null) },
    },
};

// "Stacked Townhouse" and "Co-operative Apartment" appear as selectable property-type
// tiles on the Condo Apartment category screen, but no dedicated field-collection
// screens were provided for them. Reusing the closest matching type's fields as a
// starting point — swap these out once dedicated screens exist for them.
propertyTypeFields.stackedTownhouse = propertyTypeFields.condoTownhouse;
propertyTypeFields.coOperativeApartment = propertyTypeFields.condoApartment;

/**
 * ─────────────────────────────────────────────────────────────────────
 * FIELDS SHARED BY EVERY PROPERTY TYPE
 *
 * These come from screens that don't branch by property type: address
 * capture, "Tell Buyers About Your Property", and "Let's get a clear
 * picture of your situation" (occupancy / contact / ownership / mailing).
 * ─────────────────────────────────────────────────────────────────────
 */
const commonFields = {
    propertyType: {
        path: 'top',
        schema: Joi.string().valid(...Object.keys(propertyTypeFields)).required(),
    },

    askingPrice: { path: 'pricing', schema: Joi.number().positive().max(1_000_000_000_000).required() },

    streetNumber: { path: 'location', schema: Joi.string().max(20).required() },
    streetName: { path: 'location', schema: Joi.string().max(100).required() },
    abbreviation: { path: 'location', schema: Joi.string().max(20).allow('', null) },
    streetDirection: { path: 'location', schema: Joi.string().max(10).allow('', null) },
    apartmentUnitNumber: { path: 'location', schema: Joi.string().max(20).allow('', null) },
    municipality: { path: 'location', schema: Joi.string().max(100).required() },

    buyersWillLove: { path: 'buyerInfo', schema: Joi.string().max(2000).required() },
    includedItems: { path: 'buyerInfo', schema: Joi.string().max(1000).allow('', null) },
    excludedItems: { path: 'buyerInfo', schema: Joi.string().max(300).allow('', null) },
    rentalItemsEquipment: { path: 'buyerInfo', schema: Joi.string().max(250).allow('', null) },

    recentImprovements: { path: 'improvements', schema: Joi.string().max(1000).allow('', null) },

    occupancyStatus: { path: 'occupancy', schema: Joi.string().valid(...OCCUPANCY_OPTIONS).required() },

    sellerFullName: { path: 'contact', schema: Joi.string().max(150).required() },
    sellerEmail: { path: 'contact', schema: Joi.string().email().required() },
    sellerPhone: { path: 'contact', schema: Joi.string().max(20).required() },
    preferredContactMethod: { path: 'contact', schema: Joi.string().valid(...CONTACT_METHOD_OPTIONS).required() },
    bestTimesToReach: { path: 'contact', schema: Joi.array().items(Joi.string().valid(...BEST_TIMES_OPTIONS)).allow(null) },

    isRegisteredOwner: { path: 'ownership', schema: Joi.boolean().required() },
    hasAdditionalOwners: { path: 'ownership', schema: Joi.boolean() },
    additionalOwnerNames: { path: 'ownership', schema: Joi.array().items(Joi.string().max(150)).max(10).allow(null) },

    mailingAddressDifferent: { path: 'mailingAddress', schema: Joi.boolean() },
    mailingAddressDetails: { path: 'mailingAddress', schema: Joi.string().max(300).allow('', null) },
};

/**
 * Resolves the validation + storage definition for a (propertyType, fieldName)
 * pair. Type-specific fields take priority over common fields of the same name.
 *
 * @param {string} propertyType
 * @param {string} fieldName
 * @returns {{ path: string, dbKey: string, schema: import('joi').Schema } | null}
 */
const getFieldDefinition = (propertyType, fieldName) => {
    const typeFields = propertyTypeFields[propertyType] || {};
    const def = typeFields[fieldName] || commonFields[fieldName];
    if (!def) return null;
    return { ...def, dbKey: def.dbKey || fieldName };
};

const isValidPropertyType = (propertyType) =>
    Object.prototype.hasOwnProperty.call(propertyTypeFields, propertyType);

module.exports = {
    getFieldDefinition,
    isValidPropertyType,
    propertyTypeFields,
    commonFields,
};