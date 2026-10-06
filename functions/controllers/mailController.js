const mailService = require("../services/mailService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const mailController = {

  guestMeetingRequest: asyncErrorHandler(async (req, res) => {
    const {year, month, day, time, email, phone, topic, notes} = req.body;
    const result = await mailService.guestMeetingRequest({
      year,
      month,
      day,
      time,
      email,
      phone,
      topic,
      notes,
    });
    res.status(200).json(result);
  }),


  callbackRequest: asyncErrorHandler(async (req, res) => {
    const {name, email, phone, time, topic, notes} = req.body;
    const result = await mailService.callbackRequest({
      name,
      email,
      phone,
      time,
      topic,
      notes,
    });
    res.status(200).json(result);
  }),


  contactMessage: asyncErrorHandler(async (req, res) => {
    const {name, email, phone, property, topic, message} = req.body;
    const result = await mailService.contactMessage({
      name,
      email,
      phone,
      property,
      topic,
      message,
    });
    res.status(200).json(result);
  }),
};

module.exports = mailController;
