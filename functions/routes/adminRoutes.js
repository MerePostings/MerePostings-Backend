const express = require("express");
const adminController = require("../controllers/adminController");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyAdminFirebaseToken = require("../middlewares/verifyAdminFirebaseToken");
const validate = require("../middlewares/validate");
const createRateLimiter = require("../middlewares/rateLimiter");
const {adminCounterTimeSchema, adminFinalizeTimeSchema} = require("../validators/action/schemas.js");

const adminLoginRateLimiter = createRateLimiter({
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

router.post("/admin-login", adminLoginRateLimiter, adminController.handleAdminLogin);

router.use(verifyAdminFirebaseToken);

router.get("/download-zip/:listingId", adminController.downloadPropertyZip);
router.get("/dashboard-stats", adminController.getDashboardStats);
router.get("/users", adminController.getUsers);
router.get("/transactions", adminController.getTransactions);
router.get("/listings", adminController.getListings);
router.get("/listings/:listingId", adminController.getListingById);
router.patch("/listings/:listingId", adminController.updateListing);
router.patch("/listings/:listingId/status", adminController.updateListingStatus);
router.get("/listings/:listingId/progress-tracker", adminController.getProgressTracker);
router.patch("/listings/:listingId/progress-tracker", adminController.updateProgressStep);
router.post("/:listingId/media/:mediaType", propertyController.uploadMedia);
router.delete("/:listingId/media/:mediaType", propertyController.removeMedia);
router.patch("/:listingId/media/:mediaType/reorder", propertyController.reorderMedia);

router.get("/actions/scheduling-queue", adminController.listActionSchedulingQueue);
router.get("/actions/confirmed", adminController.listConfirmedAppointments);
router.patch("/actions/:actionId/counter-time", validate(adminCounterTimeSchema), adminController.counterActionTime);
router.patch("/actions/:actionId/finalize-time", validate(adminFinalizeTimeSchema), adminController.finalizeActionTime);
router.patch("/actions/:actionId/complete", adminController.completeAction);

module.exports = router;
