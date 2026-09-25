/**
 * Checkout-time completeness check for a listing's type-specific fields: reports
 * missing or invalid answers and which stale values (from conditions that no
 * longer apply) submission should prune.
 */

const {
  propertyTypeFields,
  propertyTypeSections,
  submissionRules,
} = require("../validators/property/fieldRegistry");

const REQUIRED_MESSAGE = "This field is required";

function isBlank(value) {
  return value === undefined || value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
}

// `values` only holds fields that are themselves active, so a condition
// pointing at an inactive or unanswered field never holds — except `ne`,
// where "unanswered" is exactly "not that value". `entry` is {index} for a
// list entry or {key} for a keyed-details entry.
function conditionHolds(condition, values, entry = {}) {
  if (condition.anyOf) {
    return condition.anyOf.some((c) => conditionHolds(c, values, entry));
  }
  if (condition.allOf) {
    return condition.allOf.every((c) => conditionHolds(c, values, entry));
  }
  if (condition.itemIndex) {
    return entry.index !== undefined && entry.index >= condition.itemIndex.gte;
  }
  if (condition.itemKey) {
    return entry.key !== undefined && condition.itemKey.in.includes(entry.key);
  }
  const value = values[condition.field];
  if ("ne" in condition) return value !== condition.ne;
  if (value === undefined) return false;
  if (condition.in) return condition.in.includes(value);
  if (condition.notIn) return !condition.notIn.includes(value);
  if (condition.includes !== undefined) return Array.isArray(value) && value.includes(condition.includes);
  return false;
}

/** Zod's default size messages ("Too small: expected number to be >=1800") are
 *  developer wording; sellers see these on the checkout page. */
function friendlySizeMessage(issue) {
  if (!/^Too (small|big)/.test(issue.message || "")) return null;
  const small = issue.code === "too_small";
  const limit = small ? issue.minimum : issue.maximum;
  switch (issue.origin) {
    case "number":
      return small ? `Enter a number of at least ${limit}.` : `Enter a number no greater than ${limit}.`;
    case "string":
      return small ? `Enter at least ${limit} characters.` : `Keep this to ${limit} characters or fewer.`;
    case "array":
      return small ? `Select at least ${limit}.` : `Select no more than ${limit}.`;
    default:
      return null;
  }
}

function firstIssueMessage(error) {
  const issue = error.issues[0];
  if (!issue) return "Invalid value";
  return friendlySizeMessage(issue) || issue.message || "Invalid value";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// The option values a keyed-details field needs an entry for: whatever is
// ticked in its `entriesFor` field, minus that field's "None"-style options.
function keyedEntryKeys(def, defs, active) {
  const selected = active[def.entriesFor];
  if (!Array.isArray(selected)) return [];
  const exclusive = defs[def.entriesFor]?.exclusiveOptions || [];
  return selected.filter((key) => !exclusive.includes(key));
}

function listShapeError(def, value) {
  if (!Array.isArray(value)) return "Expected a list";
  if (value.length > def.maxItems) return `No more than ${def.maxItems} entries are allowed`;
  if (value.some((item) => item === null || typeof item !== "object" || Array.isArray(item))) {
    return "Each entry must be an object";
  }
  return null;
}

/**
 * Checks one set of field definitions (a property type's fields, or one
 * list item's itemFields) against their values, in declaration order.
 *
 * @return {{problems: object[], active: object, inactiveKeys: string[], cleanedLists: object}}
 *   active       - values of fields whose condition holds (or that have none)
 *   inactiveKeys - fields holding a value their condition no longer allows
 *   cleanedLists - list fields whose items had inactive values, with those removed
 */
function checkFields(defs, values, entry) {
  const problems = [];
  const active = {};
  const inactiveKeys = [];
  const cleanedLists = {};

  for (const [key, def] of Object.entries(defs)) {
    let value = values?.[key];

    if (def.requiredWhen && !conditionHolds(def.requiredWhen, active, entry)) {
      if (value !== undefined) inactiveKeys.push(key);
      continue;
    }

    if (def.entriesFor) {
      const result = checkKeyedDetails(key, def, defs, active, value);
      problems.push(...result.problems);
      if (result.cleaned) cleanedLists[key] = result.cleaned;
      if (value !== undefined) active[key] = value;
      continue;
    }

    // Answers using an option whose `optionWhen` no longer holds are dropped.
    const optionWhen = def.ui?.optionWhen;
    if (optionWhen && !isBlank(value)) {
      const allowed = (v) => !optionWhen[v] || conditionHolds(optionWhen[v], active, entry);
      if (Array.isArray(value)) {
        const kept = value.filter(allowed);
        if (kept.length !== value.length) {
          cleanedLists[key] = kept;
          value = kept;
        }
      } else if (!allowed(value)) {
        inactiveKeys.push(key);
        value = undefined;
      }
    }

    if (isBlank(value)) {
      if (!def.schema.isOptional()) problems.push({field: key, message: REQUIRED_MESSAGE});
      continue;
    }

    // Lists are checked entry by entry below, so one bad entry is reported
    // against its own index/field instead of failing the list as a whole.
    const shapeError = def.itemFields ? listShapeError(def, value) : null;
    const parsed = def.itemFields ? null : def.schema.safeParse(value);
    if (shapeError || (parsed && !parsed.success)) {
      problems.push({field: key, message: shapeError || firstIssueMessage(parsed.error)});
      continue;
    }
    active[key] = value;

    if (def.itemFields) {
      let changed = false;
      const cleanedItems = value.map((item, index) => {
        const result = checkFields(def.itemFields, item, {index});
        for (const p of result.problems) {
          problems.push({field: key, index, itemField: p.field, message: p.message});
        }
        if (result.inactiveKeys.length === 0) return item;
        changed = true;
        const cleaned = {...item};
        for (const inactiveKey of result.inactiveKeys) delete cleaned[inactiveKey];
        return cleaned;
      });
      if (changed) cleanedLists[key] = cleanedItems;
    }
  }

  return {problems, active, inactiveKeys, cleanedLists};
}

// One entry per ticked option; entries for options no longer ticked, and
// inactive values inside kept entries, are pruned.
function checkKeyedDetails(key, def, defs, active, value) {
  const problems = [];
  if (value !== undefined && !isPlainObject(value)) {
    return {problems: [{field: key, message: "Expected an object"}], cleaned: null};
  }
  const stored = value || {};
  const keys = keyedEntryKeys(def, defs, active);
  const cleaned = {};
  let changed = Object.keys(stored).some((k) => !keys.includes(k));

  for (const entryKey of keys) {
    const item = isPlainObject(stored[entryKey]) ? stored[entryKey] : {};
    const result = checkFields(def.itemFields, item, {key: entryKey});
    for (const p of result.problems) {
      problems.push({field: key, itemKey: entryKey, itemField: p.field, message: p.message});
    }
    if (result.inactiveKeys.length === 0) {
      if (stored[entryKey] !== undefined) cleaned[entryKey] = stored[entryKey];
      continue;
    }
    changed = true;
    cleaned[entryKey] = {...item};
    for (const inactiveKey of result.inactiveKeys) delete cleaned[entryKey][inactiveKey];
  }
  return {problems, cleaned: changed ? cleaned : null};
}

function readStoredValue(doc, fieldName, def) {
  const key = def.dbKey || fieldName;
  return def.path === "top" ? doc?.[key] : doc?.[def.path]?.[key];
}

function storagePath(fieldName, def) {
  const key = def.dbKey || fieldName;
  return def.path === "top" ? key : `${def.path}.${key}`;
}

function sectionIdFor(propertyType, path) {
  const section = (propertyTypeSections[propertyType] || []).find((s) => s.paths.includes(path));
  return section ? section.id : null;
}

/**
 * @param {string} propertyType - backend registry key (e.g. "residentialIncome")
 * @param {object} doc - the properties/{id} document data
 * @return {{
 *   checked: boolean,
 *   complete: boolean,
 *   problems: Array<{field: string, section: string|null, message: string, index?: number, itemKey?: string,
 *     itemField?: string}>,
 *   prune: {deletePaths: string[], setValues: object},
 * }}
 *   checked - false when this property type isn't enforced yet (always complete)
 *   prune   - Firestore dotted paths to delete / overwrite so stale values
 *             from inactive conditions don't survive submission
 */
function checkListingCompleteness(propertyType, doc) {
  const rules = submissionRules[propertyType];
  const fields = propertyTypeFields[propertyType];
  if (!rules || !fields) {
    return {checked: false, complete: true, problems: [], prune: {deletePaths: [], setValues: {}}};
  }

  const values = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    values[fieldName] = readStoredValue(doc, fieldName, def);
  }

  const {problems, active, inactiveKeys, cleanedLists} = checkFields(fields, values);

  // Cross-field rules only see fields that passed their own checks, so each
  // rule can assume well-formed input for whatever it reads.
  for (const rule of rules) problems.push(...rule(active));

  const withSections = problems.map((p) => ({
    ...p,
    section: sectionIdFor(propertyType, fields[p.field]?.path),
  }));

  const setValues = {};
  for (const [fieldName, list] of Object.entries(cleanedLists)) {
    setValues[storagePath(fieldName, fields[fieldName])] = list;
  }

  return {
    checked: true,
    complete: withSections.length === 0,
    problems: withSections,
    prune: {
      deletePaths: inactiveKeys.map((fieldName) => storagePath(fieldName, fields[fieldName])),
      setValues,
    },
  };
}

module.exports = {checkListingCompleteness};
