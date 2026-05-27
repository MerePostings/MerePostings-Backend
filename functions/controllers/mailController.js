const mailService = require("../services/mailService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const mailController = {
  
    guestMeetingRequest : asyncErrorHandler(async (req, res) => {
			const { year, month, day, time, email } = req.body;
			const result = await mailService.guestMeetingRequest({
				year,
				month,
				day,
				time,
				email,
			});
			res.status(200).json(result);
    }),

  
  callbackRequest: asyncErrorHandler(async (req, res) => {
    const { time, subject, email } = req.body;
    const result = await mailService.callbackRequest({ time, subject, email });
    res.status(200).json(result);
  }),

  
  contactMessage: asyncErrorHandler(async (req, res) => {
    const { name, email, message } = req.body;
    const result = await mailService.contactMessage({ name, email, message });
    res.status(200).json(result);
  }),
};

module.exports = mailController;