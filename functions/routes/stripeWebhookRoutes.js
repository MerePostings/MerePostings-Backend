const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe')
const { db } = require("../config/db");
const { sendPaymentConfirmationEmail } = require('../services/mailService');
const { FieldValue } = require('firebase-admin/firestore');
const { addTransaction } = require('../services/stripeService');

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
                    
                    await propertyRef.update({
                        paid: true,
                        status: 'pending',
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
