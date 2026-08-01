const notificationService = require("../services/notificationService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const notificationController = {

  listNotifications: asyncErrorHandler(async (req, res) => {
    const {cursorId, limit} = req.query;
    const result = await notificationService.listNotifications(req.user.uid, {cursorId, limit});
    res.status(200).json(result);
  }),

  getUnreadCount: asyncErrorHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.uid);
    res.status(200).json({count});
  }),

  markAsRead: asyncErrorHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.user.uid, req.params.id);
    res.status(200).json({notification});
  }),

  markAllAsRead: asyncErrorHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.uid);
    res.status(200).json(result);
  }),

  getPreferences: asyncErrorHandler(async (req, res) => {
    const preferences = await notificationService.getPreferences(req.user.uid);
    res.status(200).json({preferences});
  }),

  updatePreferences: asyncErrorHandler(async (req, res) => {
    const preferences = await notificationService.updatePreferences(req.user.uid, req.body);
    res.status(200).json({preferences});
  }),

};

module.exports = notificationController;
