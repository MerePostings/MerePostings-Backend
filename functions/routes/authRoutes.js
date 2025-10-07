const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/sign-up", authController.signUp);
router.post("/if-user-exists", authController.ifUserVerified);

module.exports = router;
