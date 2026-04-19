const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();

router.post("/admin-login", adminController.handleAdminLogin);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/transactions', adminController.getTransactions);
router.get('/listings', adminController.getListings);
router.get('/listings/:listingId', adminController.getListingById);
router.patch('/listings/:listingId', adminController.updateListing);
router.patch('/listings/:listingId/status', adminController.updateListingStatus);

module.exports = router;