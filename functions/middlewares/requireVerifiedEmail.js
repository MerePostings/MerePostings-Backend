// Must run after verifyFirebaseToken, which populates req.user from the
// decoded ID token — including the standard `email_verified` claim, so no
// extra Firestore/Auth lookup is needed here.
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
