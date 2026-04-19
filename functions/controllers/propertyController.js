const propertyService = require('../services/propertyService')
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const stripeService = require('../services/stripeService');
const Busboy = require("busboy");

const propertyController = {
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

    stripeCheckoutSessionForCreateListing: asyncErrorHandler( async (req, res) => {
        const checkoutUrl = await stripeService.stripeCheckoutSessionForCreateListing(req.params.listingId, req.user.uid, req.body)
        res.status(200).json({checkoutUrl})
    }),

    getOwnerProperties: asyncErrorHandler( async (req, res) => {
        const properties = await propertyService.getOwnerProperties(req.user.uid)
        res.status(200).json({properties})
    }),
}

module.exports = propertyController