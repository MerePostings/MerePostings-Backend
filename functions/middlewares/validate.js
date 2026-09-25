const formatValidationError = require("../utils/formatValidationError");

const validate = (schema, property = "body") => (req, res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: formatValidationError(result.error),
    });
  }

  if (property === "query") {
    Object.defineProperty(req, "query", {
      value: result.data,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  } else {
    req[property] = result.data;
  }

  next();
};

module.exports = validate;
