const express = require("express");
const adminController = require("../controllers/adminController");
const propertyController = require("../controllers/propertyController");
const router = express.Router();
const verifyAdminFirebaseToken = require("../middlewares/verifyAdminFirebaseToken");
const validate = require("../middlewares/validate");
const { adminProposeTimeSchema } = require("../validators/action/schemas.js");

router.post("/admin-login",             adminController.handleAdminLogin);

router.use(verifyAdminFirebaseToken);

router.get("/download-zip/:listingId",  adminController.downloadPropertyZip);
router.get('/dashboard-stats',          adminController.getDashboardStats);
router.get('/users',                    adminController.getUsers);
router.get('/transactions',             adminController.getTransactions);
router.get('/listings',                 adminController.getListings);
router.get('/listings/:listingId',      adminController.getListingById);
router.patch('/listings/:listingId',              adminController.updateListing);
router.patch('/listings/:listingId/listing-process', adminController.updateListingProcess);
router.patch('/listings/:listingId/status',       adminController.updateListingStatus);
router.patch('/listings/:listingId/tracking',     adminController.updateTrackingStep);
router.post('/:listingId/media/:mediaType',         propertyController.uploadMedia);
router.delete('/:listingId/media/:mediaType',       propertyController.removeMedia);
router.patch('/:listingId/media/:mediaType/reorder',propertyController.reorderMedia);

router.get('/actions/scheduling-queue',            adminController.listActionSchedulingQueue);
router.patch('/actions/:actionId/propose-time',    validate(adminProposeTimeSchema), adminController.proposeActionTime);
router.patch('/actions/:actionId/complete',        adminController.completeAction);

module.exports = router;