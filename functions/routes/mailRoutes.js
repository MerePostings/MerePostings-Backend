const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mailController");
const createRateLimiter = require("../middlewares/rateLimiter");

const contactRateLimiter = createRateLimiter({
  max: 5,
  message: "Too many requests. Please try again later.",
});

router.post("/schedule-guest", contactRateLimiter, mailController.guestMeetingRequest);

router.post("/request-callback", contactRateLimiter, mailController.callbackRequest);

router.post("/send-message", contactRateLimiter, mailController.contactMessage);

module.exports = router;
