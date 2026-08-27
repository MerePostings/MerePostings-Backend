const {validateFieldPatch} = require("../validators/property/propertyFields");

/** PATCH /:listingId — validates field value shape, not completion. */
const validatePropertyPatch = (req, res, next) => {
  const result = validateFieldPatch(req.body);

  if (!result.valid) {
    return res.status(400).json({success: false, errors: result.errors});
  }

  req.validatedFields = result.values;
  next();
};

module.exports = validatePropertyPatch;
