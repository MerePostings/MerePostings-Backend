const {getFieldsForStep} = require("../validators/property/fieldRegistry");
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

module.exports = {checkStepCompletion, checkViewedStepsCompletion};
