/**
 * Blueprints for the action items generated once a listing is submitted
 * (paid for). Keyed by a stable `key` used both as part of the deterministic
 * Firestore doc id (`${listingId}_${key}`) and, where relevant, as the
 * progressTracker step id it should cascade-complete.
 */
const ACTION_BLUEPRINTS = {
  verification: {
    key: "verification",
    type: "verification_required",
    progressStepId: "verification",
    requiresScheduling: true,
    title: "Schedule your verification appointment",
    description: "We need to verify a few details about your listing. Let us know a date and time of day that works for you.",
    ctaLabel: "Request Appointment",
  },
  professional_photography: {
    key: "professional_photography",
    type: "appointment_required",
    progressStepId: "professional_photography",
    requiresScheduling: true,
    title: "Schedule your photography session",
    description: "Let us know when our photographer can visit your property to capture photos, floor plans, and a virtual tour.",
    ctaLabel: "Request Appointment",
  },
  pre_listing_home_inspection: {
    key: "pre_listing_home_inspection",
    type: "appointment_required",
    progressStepId: "pre_listing_home_inspection",
    requiresScheduling: true,
    title: "Schedule your home inspection",
    description: "Let us know when the inspector can visit your property.",
    ctaLabel: "Request Appointment",
  },
  photo_upload: {
    key: "photo_upload",
    type: "photo_upload",
    progressStepId: null,
    requiresScheduling: false,
    title: "Upload property photos",
    description: "Upload photos of your property so we can prepare your listing for MLS.",
    ctaLabel: "Upload Photos",
  },
  document_upload: {
    key: "document_upload",
    type: "document_upload",
    progressStepId: null,
    requiresScheduling: false,
    title: "Upload listing documents",
    description: "Upload any supporting documents for your listing (e.g. floor plans, disclosures).",
    ctaLabel: "Upload Documents",
  },
};

/**
 * Derives which actions a listing needs based on its selected addons.
 * Mirrors the addon-driven branching in progressTrackerSteps.js, but is
 * intentionally a separate manifest — the progress tracker stays
 * admin-facing and unchanged by this feature.
 */
function getRequiredActionsForListing(selectedAddonIds = []) {
  const keys = ["verification"];

  if (selectedAddonIds.includes("professional_photography")) {
    keys.push("professional_photography");
  } else {
    keys.push("photo_upload", "document_upload");
  }

  if (selectedAddonIds.includes("pre_listing_home_inspection")) {
    keys.push("pre_listing_home_inspection");
  }

  return keys.map((key) => ACTION_BLUEPRINTS[key]);
}

module.exports = {ACTION_BLUEPRINTS, getRequiredActionsForListing};
