const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");

router.post(
    "/create-checkout-url/:listingId",
    verifyFirebaseToken,
    propertyController.stripeCheckoutSessionForCreateListing
);

router.post(
    "/add-property",
    verifyFirebaseToken,
    propertyController.addProperty
);

router.post(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    propertyController.uploadMedia
);

module.exports = router;
