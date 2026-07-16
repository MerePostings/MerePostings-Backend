const propertyService = require('../services/propertyService')
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const stripeService = require('../services/stripeService');
const Busboy = require("busboy");
const { ADDONS } = require('../data/addons');

const propertyController = {

    initiateProperty: asyncErrorHandler(async (req, res) => {
        const listingId = await propertyService.initiateProperty(req.user.uid, req.body);
        res.status(201).json({ listingId });
    }),

    saveDraftField: asyncErrorHandler(async (req, res) => {
        const { listingId } = req.params;
        const field = await propertyService.saveDraftField(req.user.uid, listingId, req.validatedField);
        res.status(200).json({ success: true, field });
    }),

    // LEGACY — kept for backward compatibility, see propertyService.saveProperty
    addProperty: asyncErrorHandler(async(req, res)=>{
        const listingId = await propertyService.saveProperty(req.user.uid, req.body);
        res.status(200).json({listingId});
    }),

    getListing: asyncErrorHandler(async(req,res)=>{
        const listing = await propertyService.getListing(req.user.uid,req.params.id)
        res.status(200).json({listing})
    }),

    uploadMedia: asyncErrorHandler( async (req, res) => {
        const { listingId, mediaType } = req.params;

        const busboy = Busboy({ headers: req.headers });
        const files = [];

        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
            if (!files[fieldname]) files[fieldname] = [];

            const bufferParts = [];
            file.on("data", (data) => bufferParts.push(data));
            file.on("end", () => {
                files.push({
                    originalname: filename,
                    buffer: Buffer.concat(bufferParts),
                    mimetype,
                });
            });
        });

        busboy.on("finish", async () => {

            if (!files || files.length === 0) {
                return res.status(400).json({ error: "No files uploaded" });
            }

            try {
                const urls = await propertyService.uploadMedia(listingId, files, mediaType);
                res.status(200).json({ media: urls });
            } catch (err) {
                res.status(500).json({ error: err.message || "Upload failed" });
            }
        });

        busboy.end(req.rawBody);
    }),

    removeMedia: asyncErrorHandler(async (req, res) => {
        const { listingId, mediaType } = req.params;
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Missing url in request body" });
        }

        await propertyService.removeMedia(listingId, mediaType, url);
        res.status(200).json({ success: true });
    }),

    reorderMedia: asyncErrorHandler(async (req, res) => {
        const { listingId, mediaType } = req.params;
        const { urls } = req.body;
 
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: "urls must be a non-empty array" });
        }
 
        const media = await propertyService.reorderMedia(listingId, mediaType, urls);
        res.status(200).json({ success: true, media });
    }),

    stripeCheckoutSessionForCreateListing: asyncErrorHandler( async (req, res) => {
        const { listingId } = req.params;
        const selectedAddons = await propertyService.saveSelectedAddons(req.user.uid, listingId, req.body.selectedAddons);
        const clientSecret = await stripeService.stripeCheckoutSessionForCreateListing(listingId, req.user.uid, selectedAddons)
        res.status(200).json({clientSecret})
    }),

    requestRefund: asyncErrorHandler( async (req, res)=> {
        await stripeService.requestRefund(req.params.listingId, req.user.uid)
        res.status(200).json({})
    }),

    getOwnerProperties: asyncErrorHandler( async (req, res) => {
        const properties = await propertyService.getOwnerProperties(req.user.uid)
        res.status(200).json({properties})
    }),

    getOwnerMostRecentProperty: asyncErrorHandler(async (req, res) => {
        const result = await propertyService.getOwnerMostRecentProperty(req.user.uid);
        res.status(200).json({
            property: result.property,
            stats: result.stats
        });
    }),

    getAddons: asyncErrorHandler(async (req, res) => {
        res.status(200).json(ADDONS)
    })

    getListingProcess: asyncErrorHandler(async (req, res) => {
        const process = await propertyService.getListingProcess(req.user.uid, req.params.listingId);
        res.status(200).json({ process });
    }),

    saveListingProcess: asyncErrorHandler(async (req, res) => {
        const process = await propertyService.saveListingProcess(
            req.user.uid,
            req.params.listingId,
            req.body
        );
        res.status(200).json({ process });
    }),

    getOwnerMostRecentProcess: asyncErrorHandler(async (req, res) => {
        const result = await propertyService.getOwnerMostRecentProcess(req.user.uid);
        res.status(200).json(result);
    }),
}

module.exports = propertyController