import asyncErrorHandler from "../utils/asyncErrorHandler";
import propertyFieldsSchema from "../schemas/property-fields.json";

const schemaController = {
    getPropertyFields: asyncErrorHandler(async (req, res) => {
        res.status(200).json(propertyFieldsSchema);
    }),

    getPropertyFieldsVersion: asyncErrorHandler(async (req, res) => {
        res.status(200).json({ version: propertyFieldsSchema.version });
    }),
};

export default schemaController;
