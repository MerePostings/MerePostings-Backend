const propertyService = require("../services/propertyService");
const asyncErrorHandler = require("../utils/asyncErrorHandler");
const stripeService = require("../services/stripeService");
const Busboy = require("busboy");
const {ADDONS} = require("../data/addons");

const propertyController = {

  initiateProperty: asyncErrorHandler(async (req, res) => {
    const listingId = await propertyService.initiateProperty(req.user.uid, req.body);
    res.status(201).json({listingId});
  }),

  saveDraftField: asyncErrorHandler(async (req, res) => {
    const {listingId} = req.params;
    const field = await propertyService.saveDraftField(req.user.uid, listingId, req.validatedField);
    res.status(200).json({success: true, field});
  }),

  // LEGACY — kept for backward compatibility, see propertyService.saveProperty
  addProperty: asyncErrorHandler(async (req, res)=>{
    const listingId = await propertyService.saveProperty(req.user.uid, req.body);
    res.status(200).json({listingId});
  }),

  getListing: asyncErrorHandler(async (req, res)=>{
    const listing = await propertyService.getListing(req.user.uid, req.params.id);
    res.status(200).json({listing});
  }),

  uploadMedia: asyncErrorHandler( async (req, res) => {
    const {listingId, mediaType} = req.params;
    const isAdmin = Boolean(req.user?.ifAdmin);
    const uid = req.user?.uid;

    const busboy = Busboy({headers: req.headers, limits: {fileSize: 20 * 1024 * 1024, files: 25}});
    const files = [];
    let tooLarge = false;
    let category = null;

    busboy.on("field", (fieldname, val) => {
      if (fieldname === "category") category = val;
    });

    busboy.on("file", (fieldname, file, info) => {
      const {filename, mimeType} = info;
      const bufferParts = [];
      file.on("data", (data) => bufferParts.push(data));
      file.on("limit", () => {
        tooLarge = true;
      });
      file.on("end", () => {
        files.push({
          originalname: filename,
          buffer: Buffer.concat(bufferParts),
          mimetype: mimeType,
        });
      });
    });

    busboy.on("finish", async () => {
      if (tooLarge) {
        return res.status(400).json({error: "One or more files exceeded the maximum upload size"});
      }
      if (!files || files.length === 0) {
        return res.status(400).json({error: "No files uploaded"});
      }

      try {
        const urls = await propertyService.uploadMedia(listingId, files, mediaType, {uid, isAdmin, category});
        res.status(200).json({media: urls});
      } catch (err) {
        res.status(err.statusCode || 500).json({error: err.message || "Upload failed"});
      }
    });

    busboy.end(req.rawBody);
  }),

  removeMedia: asyncErrorHandler(async (req, res) => {
    const {listingId, mediaType} = req.params;
    const {url} = req.query;
    const isAdmin = Boolean(req.user?.ifAdmin);
    const uid = req.user?.uid;

    if (!url) {
      return res.status(400).json({error: "Missing url in request body"});
    }

    await propertyService.removeMedia(listingId, mediaType, url, {uid, isAdmin});
    res.status(200).json({success: true});
  }),

  reorderMedia: asyncErrorHandler(async (req, res) => {
    const {listingId, mediaType} = req.params;
    const {urls} = req.body;
    const isAdmin = Boolean(req.user?.ifAdmin);
    const uid = req.user?.uid;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({error: "urls must be a non-empty array"});
    }

    const media = await propertyService.reorderMedia(listingId, mediaType, urls, {uid, isAdmin});
    res.status(200).json({success: true, media});
  }),

  setVirtualTourLink: asyncErrorHandler(async (req, res) => {
    const {listingId} = req.params;
    const {url} = req.body;
    const isAdmin = Boolean(req.user?.ifAdmin);
    const uid = req.user?.uid;

    const virtualTourLink = await propertyService.setVirtualTourLink(listingId, url, {uid, isAdmin});
    res.status(200).json({success: true, virtualTourLink});
  }),

  stripeCheckoutSessionForCreateListing: asyncErrorHandler( async (req, res) => {
    const {listingId} = req.params;
    const selectedAddons = await propertyService.saveSelectedAddons(req.user.uid, listingId, req.body.selectedAddons);
    const clientSecret = await stripeService.stripeCheckoutSessionForCreateListing(listingId, req.user.uid, selectedAddons);
    res.status(200).json({clientSecret});
  }),

  requestRefund: asyncErrorHandler( async (req, res)=> {
    await stripeService.requestRefund(req.params.listingId, req.user.uid);
    res.status(200).json({});
  }),

  getOwnerProperties: asyncErrorHandler( async (req, res) => {
    const properties = await propertyService.getOwnerProperties(req.user.uid);
    res.status(200).json({properties});
  }),

  getOwnerMostRecentProperty: asyncErrorHandler(async (req, res) => {
    const result = await propertyService.getOwnerMostRecentProperty(req.user.uid);
    res.status(200).json({
      property: result.property,
      stats: result.stats,
    });
  }),

  getAddons: asyncErrorHandler(async (req, res) => {
    res.status(200).json(ADDONS);
  }),

  getListingProcess: asyncErrorHandler(async (req, res) => {
    const process = await propertyService.getListingProcess(req.user.uid, req.params.listingId);
    res.status(200).json({process});
  }),

  saveListingProcess: asyncErrorHandler(async (req, res) => {
    const process = await propertyService.saveListingProcess(
        req.user.uid,
        req.params.listingId,
        req.body,
    );
    res.status(200).json({process});
  }),

  getOwnerMostRecentProcess: asyncErrorHandler(async (req, res) => {
    const result = await propertyService.getOwnerMostRecentProcess(req.user.uid);
    res.status(200).json(result);
  }),

  getProgressTracker: asyncErrorHandler(async (req, res) => {
    const result = await propertyService.getProgressTracker(req.user.uid, req.params.listingId);
    res.status(200).json(result);
  }),
};

module.exports = propertyController;
