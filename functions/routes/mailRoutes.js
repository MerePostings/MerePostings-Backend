const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mailController");
const createRateLimiter = require("../middlewares/rateLimiter");
const validate = require("../middlewares/validate");
const {contactInquirySchema} = require("../validators/contact/schemas");

const contactRateLimiter = createRateLimiter({
  max: 5,
  message: "Too many requests. Please try again later.",
});

router.post("/inquiry", contactRateLimiter, validate(contactInquirySchema), mailController.contactInquiry);

module.exports = router;
