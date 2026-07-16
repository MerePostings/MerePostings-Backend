const { ADDONS_BY_ID } = require('../data/addons');

const STATIC_STEPS = [
  { id: 'ownership_verified',      label: 'Ownership Verified' },
  { id: 'measurement_confirmed',   label: 'Measurement Confirmed' },
  { id: 'property_verified',       label: 'Property Verified' },
  { id: 'mls_entry_complete',      label: 'MLS Entry Complete' },
  { id: 'listing_live',            label: 'Listing Live' },
  { id: 'for_sale_sign_installed', label: 'For Sale Sign Installed' },
];

function getStepsForListing(selectedAddonIds = []) {
  const dynamicSteps = selectedAddonIds
    .map((id) => ADDONS_BY_ID[id])
    .filter(Boolean)
    .map((addon) => ({ id: addon.id, label: addon.label }));

  return [...STATIC_STEPS, ...dynamicSteps];
}

module.exports = { 
  STATIC_STEPS,
  getStepsForListing
};