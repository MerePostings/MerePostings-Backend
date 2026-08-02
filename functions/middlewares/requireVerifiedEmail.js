const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      error: "Please verify your email address to continue.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  next();
};

module.exports = requireVerifiedEmail;
