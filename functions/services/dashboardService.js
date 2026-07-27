const {db} = require("../config/db");
const userService = require("./userService");
const propertyService = require("./propertyService");
const actionService = require("./actionService");
const notificationService = require("./notificationService");

const dashboardService = {
  getDashboard: async (uid) => {
    const [user, listing, pointerSnap] = await Promise.all([
      userService.getUserById(uid),
      propertyService.getOwnerMostRecentProperty(uid),
      db.collection("dashboardPointers").doc(uid).get(),
    ]);

    const pointer = pointerSnap.exists ?
            pointerSnap.data() :
            {recentActionIds: [], recentNotificationIds: [], unreadNotificationsCount: 0};

    const actionIds = pointer.recentActionIds || [];
    const notificationIds = pointer.recentNotificationIds || [];

    // recent action/notification ids are cached on dashboardPointers/{uid}
    // (kept in sync inline at creation time — see actionService.generateActionsForListing
    // / notificationService.createNotification); the documents themselves are
    // always fetched live here, in a single db.getAll() round trip, so there's
    // nothing to keep in sync when an action/notification's content changes.
    const refs = [
      ...actionIds.map((id) => db.collection("actions").doc(id)),
      ...notificationIds.map((id) => db.collection("notifications").doc(id)),
    ];

    const docs = refs.length ? await db.getAll(...refs) : [];

    const actions = docs
        .slice(0, actionIds.length)
        .filter((doc) => doc.exists)
        .map((doc) => actionService.formatAction(doc.id, doc.data()));

    const notifications = docs
        .slice(actionIds.length)
        .filter((doc) => doc.exists)
        .map((doc) => notificationService.formatNotification(doc.id, doc.data()));

    return {
      user,
      listing,
      recentActions: {actions, nextCursor: null},
      recentNotifications: {notifications, nextCursor: null},
      unreadNotificationsCount: pointer.unreadNotificationsCount || 0,
    };
  },
};

module.exports = dashboardService;
