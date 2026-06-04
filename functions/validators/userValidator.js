const { body } = require("express-validator");

const updateUserProfileValidator = [
    body("firstName")
        .optional()
        .isString().withMessage("First name must be a string")
        .trim()
        .notEmpty().withMessage("First name cannot be blank")
        .isLength({ max: 50 }).withMessage("First name must be 50 characters or fewer")
        .matches(/^[a-zA-Z\s'-]+$/).withMessage("First name contains invalid characters"),

    body("lastName")
        .optional()
        .isString().withMessage("Last name must be a string")
        .trim()
        .notEmpty().withMessage("Last name cannot be blank")
        .isLength({ max: 50 }).withMessage("Last name must be 50 characters or fewer")
        .matches(/^[a-zA-Z\s'-]+$/).withMessage("Last name contains invalid characters"),

    body().custom((_, { req }) => {
        const { firstName, lastName } = req.body;
        if (firstName === undefined && lastName === undefined) {
            throw new Error("At least one field (firstName or lastName) must be provided");
        }
        return true;
    }),
];

module.exports = { updateUserProfileValidator };