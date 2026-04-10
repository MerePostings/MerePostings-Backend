const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");

router.put(
    "/update-user",
    verifyFirebaseToken,
    userController.updateUserProfile
);

router.get(
    "/get-user",
    verifyFirebaseToken,
    userController.getUserById
);

router.get(
    "/get-user-transactions",
    verifyFirebaseToken,
    userController.getUserTransactions
);


module.exports = router;
