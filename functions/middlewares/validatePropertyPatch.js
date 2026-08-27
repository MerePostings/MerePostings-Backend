const {validatePropertyFieldPatch} = require("../utils/validatePropertyFieldPatch");

const validatePropertyPatch = (req, res, next) => {
  const result = validatePropertyFieldPatch(req.body);

  if (!result.valid) {
    return res.status(400).json({success: false, errors: result.errors});
  }

  req.validatedFields = result.values;
  next();
};

module.exports = validatePropertyPatch;
