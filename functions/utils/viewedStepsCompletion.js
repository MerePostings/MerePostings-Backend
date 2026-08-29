const {getFieldsForStep, getKnownStepIds} = require("../validators/property/fieldRegistry");
const {isRequiredSchema, readFieldValue, isFieldSatisfied} = require("./schemaFieldUtils");

function checkStepCompletion(propertyType, stepId, prop) {
  const fields = getFieldsForStep(propertyType, stepId);
  if (fields.length === 0) {
    return {stepId, applicable: false, complete: true, missingFields: []};
  }

  const missingFields = [];
  for (const field of fields) {
    if (!isRequiredSchema(field.schema)) continue;
    const value = readFieldValue(prop, field.fieldName, field);
    if (!isFieldSatisfied(field, value)) {
      missingFields.push(`${stepId}.${field.fieldName}`);
    }
  }

  return {
    stepId,
    applicable: true,
    complete: missingFields.length === 0,
    missingFields,
  };
}

function checkViewedStepsCompletion(propertyType, viewedSteps, prop) {
  return viewedSteps.map((stepId) => checkStepCompletion(propertyType, stepId, prop));
}

/** Completeness for every step of the property type, not just viewed ones. */
function checkListingCompletion(propertyType, prop) {
  const steps = checkViewedStepsCompletion(propertyType, getKnownStepIds(propertyType), prop);
  const missingFields = steps.flatMap((step) => step.missingFields);
  return {
    complete: missingFields.length === 0,
    steps,
    missingFields,
  };
}

module.exports = {checkStepCompletion, checkViewedStepsCompletion, checkListingCompletion};
