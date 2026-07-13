const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const validateDraftField = require("../middlewares/validateDraftField");
const { initiatePropertySchema } = require("../validators/property/schemas.js");

router.get(
    "/get-owner-properties",
    verifyFirebaseToken,
    propertyController.getOwnerProperties
);

router.get(
    "/get-owner-most-recent-property",
    verifyFirebaseToken,
    propertyController.getOwnerMostRecentProperty
);

router.get(
    "/listings/:id",
    verifyFirebaseToken,
    propertyController.getListing
);

router.post(
    "/initiate",
    verifyFirebaseToken,
    validate(initiatePropertySchema),
    propertyController.initiateProperty
);

router.patch(
    "/:listingId/draft-field",
    verifyFirebaseToken,
    validateDraftField,
    propertyController.saveDraftField
);

router.post(
    "/create-checkout-url/:listingId",
    verifyFirebaseToken,
    propertyController.stripeCheckoutSessionForCreateListing
);

router.post(
    "/request-refund/:listingId",
    verifyFirebaseToken,
    propertyController.requestRefund
);

// LEGACY — kept for backward compatibility, see propertyController.addProperty
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

router.patch(
    "/:listingId/media/:mediaType/reorder",
    verifyFirebaseToken,
    propertyController.reorderMedia
);

router.delete(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    propertyController.removeMedia
);

module.exports = router;