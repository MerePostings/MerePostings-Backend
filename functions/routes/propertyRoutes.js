const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const validatePropertyPatch = require("../middlewares/validatePropertyPatch");
const {
  initiatePropertySchema, selectedAddonsSchema, updateViewedListingStepsSchema,
} = require("../validators/property/schemas.js");

router.get(
    "/get-addon-registry",
    verifyFirebaseToken,
    propertyController.getAddons,
);

router.get(
    "/get-owner-properties",
    verifyFirebaseToken,
    propertyController.getOwnerProperties,
);

router.get(
    "/get-owner-most-recent-property",
    verifyFirebaseToken,
    propertyController.getOwnerMostRecentProperty,
);

router.get(
    "/listings/:id",
    verifyFirebaseToken,
    propertyController.getListing,
);

router.post(
    "/initiate",
    verifyFirebaseToken,
    validate(initiatePropertySchema),
    propertyController.initiateProperty,
);

router.patch(
    "/:listingId",
    verifyFirebaseToken,
    validatePropertyPatch,
    propertyController.updateProperty,
);

router.patch(
    "/:listingId/viewed-listing-steps",
    verifyFirebaseToken,
    validate(updateViewedListingStepsSchema),
    propertyController.updateViewedListingSteps,
);

router.post(
    "/create-client-secret/:listingId",
    verifyFirebaseToken,
    validate(selectedAddonsSchema),
    propertyController.stripeCheckoutSessionForCreateListing,
);

router.post(
    "/request-refund/:listingId",
    verifyFirebaseToken,
    propertyController.requestRefund,
);

router.post(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    propertyController.uploadMedia,
);

router.patch(
    "/:listingId/media/:mediaType/reorder",
    verifyFirebaseToken,
    propertyController.reorderMedia,
);

router.delete(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    propertyController.removeMedia,
);

router.patch(
    "/:listingId/virtual-tour-link",
    verifyFirebaseToken,
    propertyController.setVirtualTourLink,
);

router.get(
    "/listing-process/:listingId",
    verifyFirebaseToken,
    propertyController.getProgressTracker,
);

module.exports = router;
