const express = require("express");
const notificationController = require("../controllers/notificationController");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/verifyFirebaseToken");
const requireVerifiedEmail = require("../middlewares/requireVerifiedEmail");
const validate = require("../middlewares/validate");
const {
  listNotificationsQuerySchema, preferencesPatchSchema,
} = require("../validators/notification/schemas.js");

router.get(
    "/",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(listNotificationsQuerySchema, "query"),
    notificationController.listNotifications,
);

router.get(
    "/unread-count",
    verifyFirebaseToken,
    requireVerifiedEmail,
    notificationController.getUnreadCount,
);

router.get(
    "/preferences",
    verifyFirebaseToken,
    requireVerifiedEmail,
    notificationController.getPreferences,
);

router.patch(
    "/preferences",
    verifyFirebaseToken,
    requireVerifiedEmail,
    validate(preferencesPatchSchema),
    notificationController.updatePreferences,
);

router.patch(
    "/read-all",
    verifyFirebaseToken,
    requireVerifiedEmail,
    notificationController.markAllAsRead,
);

router.patch(
    "/:id/read",
    verifyFirebaseToken,
    requireVerifiedEmail,
    notificationController.markAsRead,
);

module.exports = router;
