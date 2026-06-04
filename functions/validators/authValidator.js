const { body } = require("express-validator");

const SPECIAL = /[!@#$%^&*()_+\-=\[\]{}|;:",./<>?]/;

const signUpValidator = [
    body("firstName")
        .isString().withMessage("First name must be a string")
        .trim()
        .notEmpty().withMessage("First name is required")
        .isLength({ max: 50 }).withMessage("First name must be 50 characters or fewer")
        .matches(/^[a-zA-Z\s'-]+$/).withMessage("First name contains invalid characters"),

    body("lastName")
        .isString().withMessage("Last name must be a string")
        .trim()
        .notEmpty().withMessage("Last name is required")
        .isLength({ max: 50 }).withMessage("Last name must be 50 characters or fewer")
        .matches(/^[a-zA-Z\s'-]+$/).withMessage("Last name contains invalid characters"),

    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage(`Password must be at least 8 characters`)
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/).withMessage("Password must contain at least one number")
        .matches(SPECIAL).withMessage("Password must contain at least one special character"),

    body("termsAccepted")
        .notEmpty().withMessage("You must accept the terms and conditions")
        .isBoolean().withMessage("termsAccepted must be a boolean")
        .custom((value) => {
            if (value !== true) {
                throw new Error("You must accept the terms and conditions");
            }
            return true;
        }),

    body("marketingOptIn")
        .optional()
        .isBoolean().withMessage("marketingOptIn must be a boolean"),
];

module.exports = { signUpValidator };