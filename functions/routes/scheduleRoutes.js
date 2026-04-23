const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");

router.get(
    "/get-calendar",
    scheduleController.getGoogleCalendar
);

router.post(
    "/create-event",
    verifyFirebaseToken,
    scheduleController.createCalendarEvent
);

router.get(
    "/schedule-meeting",
    scheduleController.checkMonthAvailability
);

router.get(
    "/schedule-time",
    scheduleController.checkDayAvailability
);

module.exports = router