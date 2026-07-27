const express = require("express");
const router = express.Router();
const logger = require("firebase-functions/logger");
const stripe = require("../config/stripe");
const {sendPaymentConfirmationEmail} = require("../services/mailService");
const {markSubmitted} = require("../services/propertyService");
const {addTransaction} = require("../services/stripeService");

router.post("/stripe-webhook", async (req, res) =>{
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    logger.info(event.type);

    switch (event.type) {
      /**
             * Payment Intent Succeeded
             * Handles successful one-time payments, updates property document.
             */
      case "payment_intent.succeeded": {
        try {
          const session = event.data.object;

          const {listingId, firstName, userEmail, customerId} = session.metadata;

          if (!listingId) {
            logger.error("No listingId in metadata");
            return res.json({received: true});
          }

          await markSubmitted(listingId);

          const listingLink = `${process.env.FRONTEND_URL}/account/my-listings/${listingId}`;

          // Send confirmation email
          await sendPaymentConfirmationEmail(userEmail, firstName, session.amount / 100, listingLink);
          await addTransaction(customerId, session.amount / 100, session.id, "", "processed", "one-time", 1, listingId);
        } catch (e) {
          logger.error(e);
        }
        break;
      }

      default:
        logger.info("Unhandled event type:", event.type);
    }
    res.json({received: true});
  } catch (e) {
    logger.error(`Webhook error for event :`, e);
    res.status(400).json({error: e.message});
  }
});

module.exports = router;
