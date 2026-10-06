class AppError extends Error {
  // `details`: optional payload sent to the client, e.g. missing listing fields.
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace(this, this.constructor);
    this.isOperational = true;
  }
}

module.exports = AppError;
