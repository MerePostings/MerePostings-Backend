const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");
const validate = require("../middlewares/validate");
const validatePropertyPatch = require("../middlewares/validatePropertyPatch");
const {
  initiatePropertySchema, selectedAddonsSchema, updateViewedListingStepsSchema,
} = require("../validators/property/schemas.js");

router.get(
    "/get-addon-registry",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getAddons,
);

router.get(
    "/get-owner-properties",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getOwnerProperties,
);

router.get(
    "/get-owner-most-recent-property",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getOwnerMostRecentProperty,
);

router.get(
    "/get-owner-most-recent-process",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getOwnerMostRecentProcess,
);

router.get(
    "/listings/:id",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getListing,
);

router.post(
    "/initiate",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(initiatePropertySchema),
    propertyController.initiateProperty,
);

router.patch(
    "/:listingId",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getListingProcess,
);

router.patch(
    "/:listingId/viewed-listing-steps",
    verifyFirebaseToken,
    validate(updateViewedListingStepsSchema),
    propertyController.updateViewedListingSteps,
);

router.get(
    "/:listingId/viewed-listing-steps/completion",
    verifyFirebaseToken,
    propertyController.getViewedStepCompletionStatus,
);

router.post(
    "/create-client-secret/:listingId",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(selectedAddonsSchema),
    propertyController.stripeCheckoutSessionForCreateListing,
);

router.post(
    "/request-refund/:listingId",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.requestRefund,
);

router.post(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.uploadMedia,
);

router.patch(
    "/:listingId/media/:mediaType/reorder",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.reorderMedia,
);

router.delete(
    "/:listingId/media/:mediaType",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.removeMedia,
);

router.patch(
    "/:listingId/virtual-tour-link",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.setVirtualTourLink,
);

router.get(
    "/listing-process/:listingId",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getProgressTracker,
);

module.exports = router;
