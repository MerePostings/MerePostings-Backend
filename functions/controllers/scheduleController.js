const scheduleService = require("../services/scheduleService");
const { buildISODateTime } = require("../utils/formatDate");

const scheduleController = {

  getGoogleCalendar: async (req, res, next) => {
    try {
      await scheduleService.getGoogleCalendar(req, res)
    } catch (err) {
      next(err)
    }
  },

  createCalendarEvent: async (req, res, next) => {
    try {
      const { year,month,date,time } = req.body;
      const userID = req.user.uid
  
      

      const startDateTime = buildISODateTime(year,month,date,time)

      const event = await scheduleService.createCalendarEvent(
        startDateTime,
        date,
        time,
        month,
        year,
        userID
      );

      res.status(201).json({
        message: "Event created successfully",
        event,
      });
    } catch (err) {
      next(err);
    }
  },

  checkMonthAvailability: async (req, res, next) => {
    try {
      const { year, month } = req.query;
      
      const event = await scheduleService.checkMonthAvailability(
        year,
        month
      );

      res.status(201).json({
        event,
      });
    } catch (err) {
      next(err);
    }
  },

	checkDayAvailability: async (req, res, next) => {
    try {
      const { year, month,day} = req.query;
      const event = await scheduleService.checkDayAvailability(
        year,
        month,
        day
      );
      res.status(201).json({
        event,
      });
    } catch (err) {
      next(err);
    }
  }

}

module.exports = scheduleController;
