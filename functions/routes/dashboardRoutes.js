const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");

router.get(
    "/",
    verifyFirebaseToken,
    dashboardController.getDashboard
);

module.exports = router;
