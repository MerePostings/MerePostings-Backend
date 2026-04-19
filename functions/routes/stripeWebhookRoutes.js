const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe')
const { db } = require("../config/db");
const { sendPaymentConfirmationEmail } = require('../services/mailService');
const { FieldValue } = require('firebase-admin/firestore');
const { addTransaction } = require('../services/stripeService');

const SECTIONS_FOR_TYPE = {
    residential:  [
        'Location',
        'Amounts/Dates',
        'Exterior', 
        'Interior', 
        'Comments', 
        'Other'
    ],
    condominium:  [
        'Location', 
        'Amounts/Dates', 
        'Exterior', 
        'Interior', 
        'Comments', 
        'Other'
    ],
    commercial:   [
        'Location',
        'Amounts/Dates', 
        'Exterior', 
        'Interior', 
        'Comments', 
        'Financial', 
        'Other'
    ],
    land:   [
        'Location', 
        'Amounts/Dates', 
        'Comments', 
        'Financial', 
        'Other'
    ],
};

const MEDIA_SECTIONS = ['Photos', 'Documents'];

function buildAdminChecklist(propertyType) {
    const sections = SECTIONS_FOR_TYPE[propertyType] || SECTIONS_FOR_TYPE['residential'];
    const allSections = [...sections, ...MEDIA_SECTIONS];

    return allSections.reduce((acc, section) => {
        acc[section] = {
        complete: false,
        completedAt: null,
        completedBy: null,
        };
        return acc;
    }, {});
}

router.post('/stripe-webhook',express.raw({type: "application/json"}), async(req, res) =>{
    const sig = req.headers["stripe-signature"];

    try{
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

        console.log(event.type);

        switch(event.type) {

            /**
             * Payment Intent Succeeded
             * Handles successful one-time payments, updates property document.
             */
            case "payment_intent.succeeded": {
                try{
                    const session = event.data.object;
    
                    const { listingId, firstName, userEmail, customerId } = session.metadata;

                    if (!listingId) {
                        console.error("No listingId in metadata");
                        return res.json({ received: true });
                    }
    
                    const propertyRef = db.collection("properties").doc(listingId);

                    const propertySnap = await propertyRef.get();
                    const propertyData = propertySnap.exists ? propertySnap.data() : {};
                    const propertyType = propertyData.propertyType || 'residential';

                    const adminChecklist = buildAdminChecklist(propertyType);
                    
                    await propertyRef.update({
                        paid: true,
                        status: 'draft',
                        _adminChecklist: adminChecklist,
                        _adminChecklistInitializedAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });

                    const listingLink = `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`
    
                    // Send confirmation email
                    await sendPaymentConfirmationEmail(userEmail, firstName, session.amount / 100, listingLink);
                    await addTransaction(customerId, session.amount / 100, session.id, "" ,"processed", "one-time", 1, listingId)
                }catch(e){
                 console.log(e)   
                }

            }

            default:
                console.log("Unhandled event type:", event.type);
                
        }
        res.json({received:true});
    }catch(e){
        console.error(`Webhook error for event :`, e);
    }
})

module.exports = router
