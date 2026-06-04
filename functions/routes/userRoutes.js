const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const handleValidationErrors = require("../middlewares/handleValidationErrors");
const { updateUserProfileValidator } = require("../validators/userValidator");

router.put(
    "/update-user",
    verifyFirebaseToken,
    updateUserProfileValidator,
    handleValidationErrors,
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
