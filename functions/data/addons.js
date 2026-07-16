const ADDONS = [
  { id: 'professional_photography',    label: 'Professional Photography Package',  priceCents: 49900 },
  { id: 'pre_listing_home_inspection', label: 'Pre-Listing Home Inspection',        priceCents: 129900 },
  { id: 'showing_coordination',        label: 'Showing Coordination',               priceCents: 24900 },
  { id: 'complete_offer_management',   label: 'Complete Offer Management Service',  priceCents: 99900 },
];

const ADDONS_BY_ID = Object.fromEntries(ADDONS.map((addon) => [addon.id, addon]));

module.exports = { ADDONS, ADDONS_BY_ID };