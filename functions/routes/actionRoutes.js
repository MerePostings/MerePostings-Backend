const express = require("express");
const actionController = require("../controllers/actionController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");
const validate = require("../middlewares/validate");
const {
  listActionsQuerySchema, schedulingBatchSchema,
} = require("../validators/action/schemas.js");

router.get(
    "/",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(listActionsQuerySchema, "query"),
    actionController.listActions,
);

router.get(
    "/:id",
    verifyFirebaseToken,
    requireVerifiedEmail,
    actionController.getAction,
);

router.patch(
    "/:id/schedule-request",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(schedulingBatchSchema),
    actionController.submitSchedulingBatch,
);

router.get(
    "/:id/calendar.ics",
    verifyFirebaseToken,
    requireVerifiedEmail,
    actionController.downloadCalendarEvent,
);

module.exports = router;
