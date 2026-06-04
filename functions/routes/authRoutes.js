const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();
const handleValidationErrors = require("../middlewares/handleValidationErrors");
const { signUpValidator } = require("../validators/authValidator");

router.post(
    "/sign-up",
    signUpValidator,
    handleValidationErrors,
    authController.signUp
);

module.exports = router;