const express = require("express");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");
const validate = require("../middlewares/validate");
const {
  initiatePropertySchema, selectedAddonsSchema,
  listingProcessPatchSchema, viewedStepsSchema,
} = require("../validators/property/schemas.js");
const {PROPERTY_SCHEMA_VERSION} = require("../validators/property/fieldRegistry");

router.get("/schema/version", (_req, res) => {
  res.status(200).json({version: PROPERTY_SCHEMA_VERSION});
});

router.get(
    "/schema",
    propertyController.getPropertySchema,
);

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

router.get(
    "/:listingId/listing-process",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getListingProcess,
);

router.patch(
    "/:listingId/listing-process",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(listingProcessPatchSchema),
    propertyController.saveListingProcess,
);

router.put(
    "/:listingId/viewed-steps",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(viewedStepsSchema),
    propertyController.updateViewedSteps,
);

router.get(
    "/:listingId/viewed-steps/completion",
    verifyFirebaseToken,
    requireVerifiedEmail,
    propertyController.getViewedStepsCompletion,
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
