const { ADDONS_BY_ID } = require('../data/addons');

const STATIC_STEPS = [
  { id: 'verification',         label: 'Verification' },
  { id: 'mls_entry_completion', label: 'MLS Entry Completion' },
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