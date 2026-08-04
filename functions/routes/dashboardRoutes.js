const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");

router.get(
    "/",
    verifyFirebaseToken,
    requireVerifiedEmail,
    dashboardController.getDashboard,
);

module.exports = router;
