const dashboardService = require('../services/dashboardService');
const asyncErrorHandler = require('../utils/asyncErrorHandler');

const dashboardController = {

    getDashboard: asyncErrorHandler(async (req, res) => {
        const dashboard = await dashboardService.getDashboard(req.user.uid);
        res.status(200).json(dashboard);
    }),

};

module.exports = dashboardController;
