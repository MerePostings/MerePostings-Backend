const express = require("express");
const authController = require("../controllers/authController");
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const router = express.Router();

router.post("/sign-up", authController.signUp);

// Intentionally NOT gated by requireVerifiedEmail — an unverified user must
// be able to reach this to get themselves un-stuck.
router.post("/resend-verification", verifyFirebaseToken, authController.resendVerification);

module.exports = router;
