const express = require("express");
const notificationController = require("../controllers/notificationController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const validate = require("../middlewares/validate");
const {
    listNotificationsQuerySchema, preferencesPatchSchema,
} = require("../validators/notification/schemas.js");

router.get(
    "/",
    verifyFirebaseToken,
    validate(listNotificationsQuerySchema, 'query'),
    notificationController.listNotifications
);

router.get(
    "/unread-count",
    verifyFirebaseToken,
    notificationController.getUnreadCount
);

router.get(
    "/preferences",
    verifyFirebaseToken,
    notificationController.getPreferences
);

router.patch(
    "/preferences",
    verifyFirebaseToken,
    validate(preferencesPatchSchema),
    notificationController.updatePreferences
);

router.patch(
    "/read-all",
    verifyFirebaseToken,
    notificationController.markAllAsRead
);

router.patch(
    "/:id/read",
    verifyFirebaseToken,
    notificationController.markAsRead
);

module.exports = router;
