const authService = require("../services/authService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const authController = {
  signUp: asyncErrorHandler(async (req, res) => {
    await authService.signUp(req.body);

    res.status(201).json({msg: "User signed up successfully!"});
  }),

  resendVerification: asyncErrorHandler(async (req, res) => {
    await authService.resendVerificationEmail(req.user.uid);

    res.status(200).json({msg: "Verification email sent."});
  }),

};

module.exports = authController;
