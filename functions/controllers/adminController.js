const adminService = require("../services/adminService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");

const adminController = {  
  handleAdminLogin: asyncErrorHandler( async (req, res) => {
    const result = await adminService.handleAdminLogin(req.body.email);
    res.status(200).json(result);
  }),
}

module.exports = adminController;