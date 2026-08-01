/**
 * Strips propertyDetails/featuresUpgrades keys left over from a different
 * property type. The FE listing-process flow (PATCH /:listingId/listing-process)
 * merges autosaves into these nested objects key-by-key with no concept of
 * "this key belongs to duplex, not detached" (see propertyService.js's
 * deepMergePlainObjects), so switching propertyType mid-draft leaves the old
 * type's fields sitting in Firestore forever. Run once at submission time.
 *
 * propertyType here is the raw FE slug as stored on properties/{id}
 * (e.g. "detached", "semi-detached", "condo-apartment", "condo-townhouse",
 * "rural", "duplex-triplex") — there is no server-side translation of this
 * value in the listing-process save path.
 */

const PROPERTY_DETAILS_ALLOWED = {
  "detached": ["address", "unit", "addressConfirmed", "bedrooms", "bathrooms", "parking", "buyersLove"],
  "semi-detached": ["address", "unit", "addressConfirmed", "bedrooms", "bathrooms", "parking", "buyersLove"],
  "condo-apartment": [
    "address", "unit", "addressConfirmed", "layout", "bathroomsSelect", "parkingSelect",
    "locker", "floorNumber", "approxSqft", "maintenanceFee", "outdoorSpace", "buyersLove",
  ],
  "condo-townhouse": [
    "address", "unit", "addressConfirmed", "layout", "bathroomsSelect", "parking", "locker", "buyersLove",
  ],
  "rural": ["address", "unit", "addressConfirmed", "bedrooms", "bathrooms", "rural"],
  "duplex-triplex": ["address", "unit", "addressConfirmed", "duplex"],
};

const FEATURES_UPGRADES_ALLOWED = {
  "detached": ["selected", "otherTexts", "garage", "heating", "heatingOther", "recentImprovements"],
  "semi-detached": [
    "selected", "otherTexts", "garage", "frontYardParking", "heating", "heatingOther", "recentImprovements",
  ],
  "condo-apartment": ["selected", "otherTexts", "outdoorSpace", "recentImprovements"],
  "condo-townhouse": ["selected", "otherTexts", "outdoorSpace", "recentImprovements"],
  "rural": ["selected", "otherTexts", "recentImprovements"],
  "duplex-triplex": ["selected", "otherTexts", "recentImprovements"],
};

const OTHER_TEXT_GROUPS_ALLOWED = {
  "detached": ["interior", "exterior"],
  "semi-detached": ["interior", "outdoor"],
  "condo-apartment": ["suite"],
  "condo-townhouse": ["suite"],
  "rural": ["land", "water", "outbuildings", "lifestyle", "parking-access", "ag"],
  "duplex-triplex": ["building", "unit", "lower", "outdoor", "parking"],
};

const SELECTED_ID_PREFIX = {
  "detached": null,
  "semi-detached": null,
  "condo-apartment": "c-",
  "condo-townhouse": "c-",
  "rural": "r-",
  "duplex-triplex": "d-",
};

const KNOWN_ID_PREFIXES = ["c-", "r-", "d-"];

function pick(obj, allowedKeys) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (allowedKeys.includes(key)) out[key] = obj[key];
  }
  return out;
}

function filterSelected(selected, prefix) {
  if (prefix) return selected.filter((id) => typeof id === "string" && id.startsWith(prefix));
  return selected.filter((id) => typeof id === "string" && !KNOWN_ID_PREFIXES.some((p) => id.startsWith(p)));
}

function vetPropertyTypeFields(propertyType, propertyDetails = {}, featuresUpgrades = {}) {
  const pdAllowed = PROPERTY_DETAILS_ALLOWED[propertyType];
  const fuAllowed = FEATURES_UPGRADES_ALLOWED[propertyType];

  if (!pdAllowed || !fuAllowed) {
    return {propertyDetails, featuresUpgrades};
  }

  const cleanedPropertyDetails = pick(propertyDetails, pdAllowed);
  const cleanedFeaturesUpgrades = pick(featuresUpgrades, fuAllowed);

  if (cleanedFeaturesUpgrades.otherTexts && typeof cleanedFeaturesUpgrades.otherTexts === "object") {
    cleanedFeaturesUpgrades.otherTexts = pick(
        cleanedFeaturesUpgrades.otherTexts,
        OTHER_TEXT_GROUPS_ALLOWED[propertyType],
    );
  }

  if (Array.isArray(cleanedFeaturesUpgrades.selected)) {
    cleanedFeaturesUpgrades.selected = filterSelected(
        cleanedFeaturesUpgrades.selected,
        SELECTED_ID_PREFIX[propertyType],
    );
  }

  return {propertyDetails: cleanedPropertyDetails, featuresUpgrades: cleanedFeaturesUpgrades};
}

module.exports = {vetPropertyTypeFields};
