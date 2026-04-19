const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();

router.post("/admin-login", adminController.handleAdminLogin);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/transactions', adminController.getTransactions);
router.get('/listings', adminController.getListings);

module.exports = router;