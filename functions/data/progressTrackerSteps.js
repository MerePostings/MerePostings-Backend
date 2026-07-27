const { ADDONS_BY_ID } = require('../data/addons');

const PRE_STEPS = [
  { id: 'payment',      label: 'Payment' },
  { id: 'verification', label: 'Verification' },
];
const FINAL_STEP = { id: 'mls_entry_completion', label: 'MLS Entry Completion' };
const STATIC_STEPS = [...PRE_STEPS, FINAL_STEP];

function getStepsForListing(selectedAddonIds = []) {
  const dynamicSteps = selectedAddonIds
    .map((id) => ADDONS_BY_ID[id])
    .filter(Boolean)
    .map((addon) => ({ id: addon.id, label: addon.label }));

  return [...PRE_STEPS, ...dynamicSteps, FINAL_STEP];
}

module.exports = { 
  STATIC_STEPS,
  getStepsForListing
};