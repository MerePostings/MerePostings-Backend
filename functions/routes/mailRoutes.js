const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mailController");
 
router.post("/schedule-guest", mailController.guestMeetingRequest);
 
router.post("/request-callback", mailController.callbackRequest);
 
router.post("/send-message", mailController.contactMessage);
 
module.exports = router;