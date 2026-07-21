const express = require("express");
const actionController = require("../controllers/actionController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const {
    listActionsQuerySchema, schedulingPreferenceSchema,
} = require("../validators/action/schemas.js");

router.get(
    "/",
    verifyFirebaseToken,
    validate(listActionsQuerySchema, 'query'),
    actionController.listActions
);

router.get(
    "/:id",
    verifyFirebaseToken,
    actionController.getAction
);

router.patch(
    "/:id/schedule-request",
    verifyFirebaseToken,
    validate(schedulingPreferenceSchema),
    actionController.submitSchedulingPreference
);

router.patch(
    "/:id/confirm-time",
    verifyFirebaseToken,
    actionController.confirmScheduledTime
);

router.get(
    "/:id/calendar.ics",
    verifyFirebaseToken,
    actionController.downloadCalendarEvent
);

module.exports = router;
