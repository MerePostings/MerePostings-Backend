const mailService = require("../services/mailService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const mailController = {
  contactInquiry: asyncErrorHandler(async (req, res) => {
    const {name, email, topic, message} = req.body;
    await mailService.contactInquiry({name, email, topic, message});
    res.status(200).json({message: "Thanks, we'll be in touch soon."});
  }),
};

module.exports = mailController;
