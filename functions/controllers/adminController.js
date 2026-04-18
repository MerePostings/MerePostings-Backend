const adminService = require("../services/adminService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const adminController = {  
  handleAdminLogin: asyncErrorHandler( async (req, res) => {
    const result = await adminService.handleAdminLogin(req.body.email);
    res.status(200).json(result);
  }),

  getDashboardStats: asyncErrorHandler(async (req, res) => {
    const range = req.query.range || 'This Year';
    const result = await adminService.getDashboardStats(range);
    res.status(200).json(result);
  }),

  getUsers: asyncErrorHandler(async (req, res) => {
    const result = await adminService.getUsers(req.query);
    res.status(200).json(result);
  }),

  getTransactions: asyncErrorHandler(async (req, res) => {
    const result = await adminService.getTransactions(req.query);
    res.status(200).json(result);
  }),
}

module.exports = adminController;