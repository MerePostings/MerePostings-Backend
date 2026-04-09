const propertyService = require('../services/propertyService')
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const stripeService = require('../services/stripeService');

const propertyController = {
    addProperty: asyncErrorHandler(async(req, res)=>{
        const listingId = await propertyService.saveProperty(req.user.uid, req.body);
        res.status(200).json({listingId});
    }),

    uploadMedia: asyncErrorHandler( async (req, res) => {
        const { listingId, mediaType } = req.params;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const urls = await propertyService.uploadMedia(listingId, files, mediaType);
        res.status(200).json({ success: true, media: urls });
    }),

    stripeCheckoutSessionForCreateListing: asyncErrorHandler( async (req, res) => {
        console.log(req.params.listingId, req.user.uid)
        const checkoutUrl = await stripeService.stripeCheckoutSessionForCreateListing(req.params.listingId, req.user.uid, req.body)
        res.status(200).json({checkoutUrl})
    })
}

module.exports = propertyController