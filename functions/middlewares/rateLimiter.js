const rateLimit = require("express-rate-limit");

const createRateLimiter = ({windowMs = 15 * 60 * 1000, max, message}) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {msg: message},
});

module.exports = createRateLimiter;
