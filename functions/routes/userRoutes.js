const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");

router.put(
    "/update-user",
    verifyFirebaseToken,
    requireVerifiedEmail,
    userController.updateUserProfile,
);

router.get(
    "/get-user",
    verifyFirebaseToken,
    requireVerifiedEmail,
    userController.getUserById,
);

router.get(
    "/get-user-transactions",
    verifyFirebaseToken,
    requireVerifiedEmail,
    userController.getUserTransactions,
);


module.exports = router;
