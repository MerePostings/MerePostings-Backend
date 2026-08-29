const logger = require("firebase-functions/logger");

const devError = (err, res) => {
  const payload = {
    message: err.message,
    stackTrace: err.stack,
    err: err,
  };
  if (err.errors) payload.errors = err.errors;
  res.status(err.statusCode).json(payload);
};

const prodError = (err, res) => {
  logger.error(err);
  if (err.isOperational) {
    const payload = {message: err.message};
    if (err.errors) payload.errors = err.errors;
    res.status(err.statusCode).json(payload);
  } else {
    res.status(500).json({
      message: "Something went wrong! Please try again later.",
    });
  }
};

const handleError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === "development") {
    devError(err, res);
  } else {
    prodError(err, res);
  }
};

module.exports = handleError;
