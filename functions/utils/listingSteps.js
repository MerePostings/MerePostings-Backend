const propertyFieldsSchema = require("../schemas/property-fields.json");

const LISTING_STEP_IDS = [...new Set(
    Object.values(propertyFieldsSchema.properties || {})
        .map((def) => def["x-ui"]?.section)
        .filter(Boolean),
)];

module.exports = {LISTING_STEP_IDS};
