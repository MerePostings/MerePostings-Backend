const adminService = require("../services/adminService");
const actionService = require("../services/actionService");
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

  getListings: asyncErrorHandler(async (req, res) => {
    const result = await adminService.getListings(req.query);
    res.status(200).json(result);
  }),

  getListingById: asyncErrorHandler(async (req, res) => {
    const result = await adminService.getListingById(req.params.listingId);
    res.status(200).json(result);
  }),

  updateListing: asyncErrorHandler(async (req, res) => {
    const result = await adminService.updateListing(req.params.listingId, req.body);
    res.status(200).json(result);
  }),

  updateListingProcess: asyncErrorHandler(async (req, res) => {
    const result = await adminService.updateListingProcess(
      req.params.listingId,
      req.body?.state ?? req.body,
    );
    res.status(200).json(result);
  }),

  updateListingStatus: asyncErrorHandler(async (req, res) => {
    const result = await adminService.updateListingStatus(req.params.listingId, req.body.status);
    res.status(200).json(result);
  }),

  updateTrackingStep: asyncErrorHandler(async (req, res) => {
    const { listingId } = req.params;
    const { stepId, completed } = req.body;
    const result = await adminService.updateTrackingStep(listingId, stepId, completed);
    res.status(200).json(result);
  }),

  downloadPropertyZip: asyncErrorHandler(async (req, res) => {
    const { listingId } = req.params;
    const { folderName, zipStream } = await adminService.downloadPropertyAsZip(listingId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);
    res.setHeader('X-Zip-Filename', `${folderName}.zip`);

    zipStream.pipe(res);

    zipStream.on('error', (err) => {
      console.error('Zip stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download property zip' });
      }
    });
  }),

  listActionSchedulingQueue: asyncErrorHandler(async (req, res) => {
    const actions = await actionService.adminListSchedulingQueue();
    res.status(200).json({ actions });
  }),

  proposeActionTime: asyncErrorHandler(async (req, res) => {
    const action = await actionService.adminProposeTime(req.params.actionId, req.body);
    res.status(200).json({ action });
  }),

  completeAction: asyncErrorHandler(async (req, res) => {
    const action = await actionService.adminCompleteAction(req.params.actionId);
    res.status(200).json({ action });
  }),

}

module.exports = adminController;