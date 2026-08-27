const asyncErrorHandler = require("../utils/asyncErrorHandler.js");
const propertyFieldsSchema = require("../schemas/property-fields.json");

const schemaController = {
  getPropertyFields: asyncErrorHandler(async (req, res) => {
    res.status(200).json(propertyFieldsSchema);
  }),

  getPropertyFieldsVersion: asyncErrorHandler(async (req, res) => {
    res.status(200).json({
      version: propertyFieldsSchema.version
    });
  }),
};

module.exports = schemaController;
