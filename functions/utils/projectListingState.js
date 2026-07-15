/**
 * Project FE listing-process `state` onto a properties document update.
 * Keeps MLS/domain fields on `properties`; funnel UX stays only on listingProcesses.
 */

const OCCUPANCY = {
  owner: 'owner_occupied',
  tenant: 'tenant_occupied',
  vacant: 'vacant',
};

const PROPERTY_TYPE = {
  detached: 'detached',
  'semi-detached': 'semiDetached',
  'condo-apartment': 'condoApartment',
  'condo-townhouse': 'condoTownhouse',
  rural: 'rural',
  'duplex-triplex': 'duplex',
};

const CONTACT_METHOD = {
  Email: 'email',
  'Phone Call': 'phone',
  'Text Message': 'text',
  email: 'email',
  phone: 'phone',
  text: 'text',
};

const BEST_TIME = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Evening: 'evening',
  Anytime: 'anytime',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  anytime: 'anytime',
};

const PARKING = { none: 'none', '1': '1', '2': '2', '3+': '3_plus' };

const FEATURE_ID = {
  'renovated-kitchen': 'renovated_kitchen',
  'hardwood-floors': 'hardwood_floors',
  'updated-bathrooms': 'updated_bathrooms',
  fireplace: 'fireplace',
  'open-concept': 'open_concept_layout',
  'pot-lights': 'pot_lights',
  'high-ceilings': 'high_ceilings',
  'ss-appliances': 'stainless_steel_appliances',
  'central-air': 'central_air',
  'newer-windows': 'newer_windows',
  'finished-basement': 'finished_basement',
  'walkout-basement': 'walk_out_basement',
  'separate-entrance': 'separate_entrance',
  'basement-apartment': 'basement_apartment',
  'large-backyard': 'large_backyard',
  'deck-patio': 'deck_patio',
  'fenced-yard': 'fenced_yard',
  pool: 'pool',
  'end-unit': 'end_unit',
  'no-garage': 'none',
  '1-car': '1_car',
  '2-car': '2_car',
  '3-car': '3_plus_car',
  'fy-none': 'none',
  'fy-1': '1_vehicle',
  'fy-2': '2_vehicles',
  'fy-3': '3_plus_vehicles',
  'forced-air-gas': 'forced_air_gas',
  'forced-air-electric': 'forced_air_electric',
  'electric-baseboard': 'electric_baseboard',
  'heat-pump': 'heat_pump',
  'heating-other': 'other',
  'c-renovated-kitchen': 'renovated_kitchen',
  'c-hardwood': 'hardwood_engineered_floors',
  'c-updated-bath': 'updated_bathroom',
  'c-ss-appliances': 'stainless_steel_appliances',
  'c-open-concept': 'open_concept_layout',
  'c-ensuite-laundry': 'ensuite_laundry',
  'c-walk-in': 'walk_in_closet',
  'c-den': 'den_home_office',
  'c-premium-parking': 'premium_parking_space',
  'c-corner': 'corner_unit',
  'c-south': 'south_exposure',
  'c-lake-view': 'lake_view',
  'c-city-view': 'city_view',
  'c-pet-friendly': 'pet_friendly_building',
  'c-concierge': 'concierge',
  'c-fitness': 'fitness_centre',
  'c-indoor-pool': 'indoor_pool',
  'c-party': 'party_room',
  'c-guest': 'guest_suites',
  'c-visitor-parking': 'visitor_parking',
  'c-rooftop': 'rooftop_terrace',
  'c-security': 'security',
  'c-ev': 'ev_charging',
};

function mapIds(selected, feIds) {
  const set = new Set(feIds);
  return (selected || [])
    .filter((id) => set.has(id))
    .map((id) => FEATURE_ID[id])
    .filter(Boolean);
}

function parseAddress(label) {
  if (!label || typeof label !== 'string') return null;
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  let streetPart = parts[0];
  let municipality = parts[1] || 'Unknown';
  let unit = null;
  if (/^unit\s+/i.test(parts[0]) && parts.length >= 2) {
    unit = parts[0].replace(/^unit\s+/i, '').trim();
    streetPart = parts[1];
    municipality = parts[2] || 'Unknown';
  }
  const tokens = streetPart.split(/\s+/).filter(Boolean);
  let streetNumber = '0';
  let rest = tokens;
  if (tokens.length && /^\d+[A-Za-z]?$/.test(tokens[0])) {
    streetNumber = tokens[0];
    rest = tokens.slice(1);
  }
  return {
    streetNumber,
    streetName: rest.join(' ') || streetPart,
    municipality,
    apartmentUnitNumber: unit,
  };
}

/**
 * @param {object} state - FE listing flow state slice
 * @returns {object} Firestore merge patch for properties/{id}
 */
function projectStateToProperty(state) {
  if (!state || typeof state !== 'object') return {};

  const patch = {};
  const beType = PROPERTY_TYPE[state.propertyType];
  if (beType) patch.propertyType = beType;

  if (state.occupancy && OCCUPANCY[state.occupancy]) {
    patch.occupancyType = OCCUPANCY[state.occupancy];
    patch['occupancy.occupancyStatus'] = OCCUPANCY[state.occupancy];
  }

  if (typeof state.askingPrice === 'number' && state.askingPrice > 0) {
    patch['pricing.askingPrice'] = state.askingPrice;
  }

  const c = state.sellerContact || {};
  if (c.fullName) patch['contact.sellerFullName'] = String(c.fullName).trim();
  if (c.email) patch['contact.sellerEmail'] = String(c.email).trim();
  if (c.phone) patch['contact.sellerPhone'] = String(c.phone).trim();
  if (c.preferredContact && CONTACT_METHOD[c.preferredContact]) {
    patch['contact.preferredContactMethod'] = CONTACT_METHOD[c.preferredContact];
  }
  if (c.bestTime && BEST_TIME[c.bestTime]) {
    patch['contact.bestTimesToReach'] = [BEST_TIME[c.bestTime]];
  }

  const o = state.ownership || {};
  if (typeof o.isRegisteredOwner === 'boolean') {
    patch['ownership.isRegisteredOwner'] = o.isRegisteredOwner;
  }
  if (typeof o.hasAdditionalOwners === 'boolean') {
    patch['ownership.hasAdditionalOwners'] = o.hasAdditionalOwners;
  }
  if (Array.isArray(o.additionalOwnerNames)) {
    const names = o.additionalOwnerNames.map((n) => String(n).trim()).filter(Boolean);
    if (names.length) patch['ownership.additionalOwnerNames'] = names;
  }

  const m = state.mailingAddress || {};
  if (typeof m.sameAsProperty === 'boolean') {
    patch['mailingAddress.mailingAddressDifferent'] = !m.sameAsProperty;
    if (!m.sameAsProperty) {
      const details = [m.street, m.city, m.province, m.postalCode]
        .map((x) => (x || '').trim())
        .filter(Boolean)
        .join(', ');
      if (details) patch['mailingAddress.mailingAddressDetails'] = details;
    }
  }

  const pd = state.propertyDetails || {};
  if (pd.addressConfirmed && pd.address) {
    const parsed = parseAddress(pd.address);
    if (parsed) {
      patch['location.streetNumber'] = parsed.streetNumber;
      patch['location.streetName'] = parsed.streetName;
      patch['location.municipality'] = parsed.municipality;
      const unit = (pd.unit || '').trim() || parsed.apartmentUnitNumber;
      if (unit) patch['location.apartmentUnitNumber'] = unit;
    }
  }

  if (typeof pd.bedrooms === 'number') patch['basics.bedrooms'] = pd.bedrooms;
  if (typeof pd.bathrooms === 'number') patch['basics.bathrooms'] = pd.bathrooms;
  if (pd.parking && PARKING[pd.parking]) {
    patch['basics.parkingSpacesIncluded'] = PARKING[pd.parking];
  }
  if (typeof pd.locker === 'boolean') patch['basics.lockerIncluded'] = pd.locker;
  if (pd.layout) patch['basics.layoutBedroomsDen'] = pd.layout;

  const floor = Number(pd.floorNumber);
  if (Number.isFinite(floor)) patch['condoDetails.floorNumber'] = floor;
  const sqft = Number(String(pd.approxSqft || '').replace(/[^0-9.]/g, ''));
  if (Number.isFinite(sqft) && sqft > 0) patch['condoDetails.squareFootage'] = sqft;
  const fee = Number(String(pd.maintenanceFee || '').replace(/[^0-9.]/g, ''));
  if (Number.isFinite(fee) && fee >= 0) patch['condoDetails.maintenanceFee'] = fee;

  const bc = state.buyerCopy || {};
  const love = (bc.highlights || pd.buyersLove || '').trim();
  if (love) patch['buyerInfo.buyersWillLove'] = love;
  if ((bc.inclusions || '').trim()) patch['buyerInfo.includedItems'] = bc.inclusions.trim();
  if ((bc.exclusions || '').trim()) patch['buyerInfo.excludedItems'] = bc.exclusions.trim();
  if ((bc.rentalItems || '').trim()) {
    patch['buyerInfo.rentalItemsEquipment'] = bc.rentalItems.trim();
  }

  const fu = state.featuresUpgrades || {};
  if ((fu.recentImprovements || '').trim()) {
    patch['improvements.recentImprovements'] = fu.recentImprovements.trim();
  }
  if (fu.garage && FEATURE_ID[fu.garage]) patch['garage.garageType'] = FEATURE_ID[fu.garage];
  if (fu.frontYardParking && FEATURE_ID[fu.frontYardParking]) {
    patch['garage.frontYardParking'] = FEATURE_ID[fu.frontYardParking];
  }
  if (fu.heating && FEATURE_ID[fu.heating]) patch['heating.heatingType'] = FEATURE_ID[fu.heating];
  if ((fu.heatingOther || '').trim()) {
    patch['heating.heatingTypeOther'] = fu.heatingOther.trim();
  }

  const selected = fu.selected || [];
  if (beType === 'detached' || beType === 'semiDetached') {
    patch['features.interiorFeatures'] = mapIds(selected, [
      'renovated-kitchen', 'hardwood-floors', 'updated-bathrooms', 'fireplace',
      'open-concept', 'pot-lights', 'high-ceilings', 'ss-appliances', 'central-air', 'newer-windows',
    ]);
    patch['basement.basementFeatures'] = mapIds(selected, [
      'finished-basement', 'walkout-basement', 'separate-entrance', 'basement-apartment',
    ]);
  }
  if (beType === 'detached') {
    patch['exterior.exteriorFeatures'] = mapIds(selected, [
      'large-backyard', 'deck-patio', 'fenced-yard', 'pool',
    ]);
  }
  if (beType === 'semiDetached') {
    patch['exterior.outdoorFeatures'] = mapIds(selected, [
      'large-backyard', 'deck-patio', 'fenced-yard', 'pool', 'end-unit',
    ]);
  }
  if (beType === 'condoApartment' || beType === 'condoTownhouse') {
    patch['features.suiteFeatures'] = mapIds(selected, [
      'c-renovated-kitchen', 'c-hardwood', 'c-updated-bath', 'c-ss-appliances',
      'c-open-concept', 'c-ensuite-laundry', 'c-walk-in', 'c-den', 'c-premium-parking',
    ]);
    patch['amenities.buildingAmenities'] = mapIds(selected, [
      'c-concierge', 'c-fitness', 'c-indoor-pool', 'c-party', 'c-guest',
      'c-visitor-parking', 'c-rooftop', 'c-security', 'c-ev',
    ]);
  }

  if (Array.isArray(state.selectedAddons)) {
    patch.selectedAddons = state.selectedAddons;
  }
  if (state.saleType) patch.saleType = state.saleType;

  return patch;
}

module.exports = { projectStateToProperty, PROPERTY_TYPE, OCCUPANCY };
