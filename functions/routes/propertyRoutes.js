const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() })

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
    upload.array('files', 50),
    propertyController.uploadMedia
);

module.exports = router;
