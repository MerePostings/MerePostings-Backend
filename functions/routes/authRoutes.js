const express = require("express");
const authController = require("../controllers/authController");
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const createRateLimiter = require("../middlewares/rateLimiter");
const {signUpSchema} = require("../validators/auth/schemas");
const router = express.Router();


const signUpRateLimiter = createRateLimiter({
  max: 10,
  message: "Too many sign-up attempts. Please try again later.",
});

router.post("/sign-up", signUpRateLimiter, validate(signUpSchema), authController.signUp);

router.post("/resend-verification", verifyFirebaseToken, authController.resendVerification);

module.exports = router;
