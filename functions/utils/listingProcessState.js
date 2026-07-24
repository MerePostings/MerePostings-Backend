const {FieldValue} = require("firebase-admin/firestore");

/** Flat listing-process fields stored once on the property root (no flowState). */
const PROCESS_FIELD_KEYS = [
  "listedWithOtherBrokerage",
  "supportTier",
  "occupancy",
  "propertyType",
  "askingPrice",
  "selectedAddons",
  "walkthroughAnswers",
  "sellerContact",
  "ownership",
  "mailingAddress",
  "propertyDetails",
  "featuresUpgrades",
  "buyerCopy",
  "sellerConfirmations",
];

/** Intermediate step-group keys to delete after migrating to flat. */
const STEP_GROUP_KEYS = [
  "getStarted",
  "sellingStyle",
  "basicDetail",
  "tellBuyers",
  "beforeLive",
  "reviewListing",
];

function isStepGroupedState(state) {
  if (!state || typeof state !== "object") return false;
  return STEP_GROUP_KEYS.some((k) => state[k] != null && typeof state[k] === "object");
}

function isFlatProcessState(state) {
  if (!state || typeof state !== "object") return false;
  if (isStepGroupedState(state)) return false;
  return PROCESS_FIELD_KEYS.some((k) => k in state);
}

/** Unwrap step-grouped wire → flat process fields. */
function unwrapStepGroupsToFlat(grouped) {
  if (!grouped || typeof grouped !== "object") return {};
  const out = {};
  if (typeof grouped.furthestMajorIndex === "number") {
    out.furthestMajorIndex = grouped.furthestMajorIndex;
  }
  if (grouped.getStarted) {
    out.listedWithOtherBrokerage = grouped.getStarted.listedWithOtherBrokerage ?? null;
  }
  if (grouped.sellingStyle) {
    out.supportTier = grouped.sellingStyle.supportTier ?? null;
    out.walkthroughAnswers = grouped.sellingStyle.walkthroughAnswers ?? {};
  }
  if (grouped.basicDetail) {
    out.occupancy = grouped.basicDetail.occupancy ?? null;
    out.sellerContact = grouped.basicDetail.sellerContact ?? {};
    out.ownership = grouped.basicDetail.ownership ?? {};
    out.mailingAddress = grouped.basicDetail.mailingAddress ?? {};
  }
  if (grouped.propertyDetails && typeof grouped.propertyDetails === "object") {
    const {propertyType, askingPrice, ...rest} = grouped.propertyDetails;
    out.propertyDetails = rest;
    if (propertyType !== undefined) out.propertyType = propertyType;
    if (askingPrice !== undefined) out.askingPrice = askingPrice;
  }
  if (grouped.featuresUpgrades != null) out.featuresUpgrades = grouped.featuresUpgrades;
  if (grouped.tellBuyers != null) out.buyerCopy = grouped.tellBuyers;
  if (grouped.beforeLive?.selectedAddons != null) {
    out.selectedAddons = grouped.beforeLive.selectedAddons;
  }
  if (grouped.reviewListing != null) out.sellerConfirmations = grouped.reviewListing;
  return out;
}

/** Normalize incoming PATCH state (flat, step-grouped, or legacy flowState blob) → flat. */
function normalizeIncomingState(state) {
  if (!state || typeof state !== "object") return {};
  if (isStepGroupedState(state)) return unwrapStepGroupsToFlat(state);
  const out = {};
  if (typeof state.furthestMajorIndex === "number") {
    out.furthestMajorIndex = state.furthestMajorIndex;
  }
  for (const k of PROCESS_FIELD_KEYS) {
    if (k in state) out[k] = state[k];
  }
  return out;
}

/** Assemble listing-process `state` from property root (flat preferred). */
function assembleProcessState(prop) {
  if (!prop || typeof prop !== "object") return {};
  if (isFlatProcessState(prop)) {
    const state = {};
    if (typeof prop.furthestMajorIndex === "number") {
      state.furthestMajorIndex = prop.furthestMajorIndex;
    }
    for (const k of PROCESS_FIELD_KEYS) {
      if (k in prop) state[k] = prop[k];
    }
    if (!Array.isArray(state.selectedAddons) && Array.isArray(prop.beforeLive?.selectedAddons)) {
      state.selectedAddons = prop.beforeLive.selectedAddons;
    }
    return state;
  }
  if (isStepGroupedState(prop)) {
    return unwrapStepGroupsToFlat(prop);
  }
  if (prop.flowState && typeof prop.flowState === "object") {
    return normalizeIncomingState(prop.flowState);
  }
  return {};
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-merge plain objects for listing-process nested fields.
 * Arrays / scalars / null replace. Used so sparse nested PATCHes keep siblings.
 */
function deepMergePlainObjects(prev, next) {
  if (!isPlainObject(next)) return next;
  if (!isPlainObject(prev)) return {...next};
  const out = {...prev};
  for (const key of Object.keys(next)) {
    const n = next[key];
    const p = prev[key];
    if (isPlainObject(n) && isPlainObject(p)) {
      out[key] = deepMergePlainObjects(p, n);
    } else {
      out[key] = n;
    }
  }
  return out;
}

/**
 * Merge incoming process state onto a property doc.
 * Returns next wire state + Firestore update payload (properties only).
 */
function buildProcessPropertyUpdate(prop, state) {
  const incoming = state != null ? normalizeIncomingState(state) : {};
  const prev = assembleProcessState(prop);

  const nextState = {...prev};
  if (typeof incoming.furthestMajorIndex === "number") {
    nextState.furthestMajorIndex = Math.max(0, Math.min(8, incoming.furthestMajorIndex));
  }
  for (const k of PROCESS_FIELD_KEYS) {
    if (k in incoming) {
      nextState[k] = deepMergePlainObjects(prev[k], incoming[k]);
    }
  }

  const nextStatus = prop.status === "initiated" ? "draft" : prop.status;
  const update = {
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
    flowState: FieldValue.delete(),
  };
  for (const k of STEP_GROUP_KEYS) {
    update[k] = FieldValue.delete();
  }
  if (typeof nextState.furthestMajorIndex === "number") {
    update.furthestMajorIndex = nextState.furthestMajorIndex;
  }
  for (const k of PROCESS_FIELD_KEYS) {
    if (k in nextState) update[k] = nextState[k];
  }

  return {nextState, nextStatus, update};
}

module.exports = {
  PROCESS_FIELD_KEYS,
  STEP_GROUP_KEYS,
  assembleProcessState,
  normalizeIncomingState,
  deepMergePlainObjects,
  buildProcessPropertyUpdate,
};
