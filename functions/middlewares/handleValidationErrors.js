const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");
 
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return next(new AppError(firstError.msg, 400));
    }
    next();
};
 
module.exports = handleValidationErrors;