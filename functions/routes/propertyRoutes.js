const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const validateDraftField = require("../middlewares/validateDraftField");
const {
    initiatePropertySchema, selectedAddonsSchema,
    listingProcessPatchSchema,
} = require("../validators/property/schemas.js");

router.get(
    "/get-addon-registry",
    verifyFirebaseToken,
    propertyController.getAddons
);

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
    "/get-owner-most-recent-process",
    verifyFirebaseToken,
    propertyController.getOwnerMostRecentProcess
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

router.get(
    "/:listingId/listing-process",
    verifyFirebaseToken,
    propertyController.getListingProcess
);

router.patch(
    "/:listingId/listing-process",
    verifyFirebaseToken,
    validate(listingProcessPatchSchema),
    propertyController.saveListingProcess
);

router.patch(
    "/:listingId/draft-field",
    verifyFirebaseToken,
    validateDraftField,
    propertyController.saveDraftField
);

router.post(
    "/create-client-secret/:listingId",
    verifyFirebaseToken,
    validate(selectedAddonsSchema),
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
