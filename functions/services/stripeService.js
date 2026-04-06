const { db } = require("../config/db");
const AppError = require("../utils/AppError")
const { FieldValue } = require('firebase-admin/firestore');
const stripe = require('../config/stripe')
const { calculateListingPrice } = require('../utils/listingPriceCalculator')
const stripeService = {

    /**
     * Creates a new Stripe customer and saves their customerId to Firestore
     * - Creates the customer in Stripe using their email
     * - Merges the stripeCustomerId back into the user's Firestore document
     */
    createCustomer : async (userRef, email)=>{
        try{
            const customer = await stripe.customers.create({ email });
            await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
            return customer.id;
        }catch(e){
            console.log(e)
            throw new AppError("Failed to Create Customer", 400);
        }
    },

    /**
     * Creates a Stripe Checkout Session for a new listing payment
     * - Calculates total price based on saleType and selected addons
     * - Fetches user data and creates a Stripe customer if one doesn't exist
     * - Builds a one-time payment session with the calculated amount
     * - Attaches listingId, userEmail, and firstName to the PaymentIntent metadata for webhook processing
     * - Returns the Stripe Checkout URL to redirect the user to
     */
    stripeCheckoutSessionForCreateListing: async (listingId, uid, { saleType, selectedAddons}) => {
        const { totalCents } = calculateListingPrice(saleType, selectedAddons)
        try{
            const userRef = db.collection("users").doc(uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                throw new Error("User document not found");
            }

            const userData = userSnap.data();
            const userEmail = userData.email;
            const firstName = userData.firstName || 'User';

            if (!userEmail) {
                throw new Error("User email not found");
            }

            let customerId = userData.stripeCustomerId;

            if (!customerId) {
                customerId = await stripeService.createCustomer(userRef, userEmail);
            }

            const sessionConfig = {
                payment_method_types: ["card"],
                mode: "payment",
                customer: customerId,
                line_items: [
                    {
                        price_data: {
                                currency: 'cad',
                                product_data: {
                                name: `Mere Postings - Listing`,
                                description: 'One-time listing creation fee (includes photos & documents)',
                            },
                            unit_amount: totalCents,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    metadata: {
                        listingId,
                        userEmail,
                        firstName,
                        customerId
                    },
                },
                success_url: `${process.env.FRONTEND_URL}/success-payment`,
                cancel_url: `${process.env.FRONTEND_URL}/failure-payment`,
            };

            const session = await stripe.checkout.sessions.create(sessionConfig);
            return session.url;

        } catch(e) {
            console.error(e)
            throw new AppError(e.message || "Failed to subscribe", e.statusCode || 500);
        }
    },

    /**
     * Records a transaction in Firestore after a Stripe payment event
     * - Only saves fields that are explicitly provided (no undefined noise)
     * - Defaults status to 'pending' and type to 'one-time' if not specified
     * - Used by webhooks to track payment attempts, successes, and failures
     */
    addTransaction: async (
        customerId,
        amount,
        paymentIntentId,
        reason,
        status = "pending",
        type = "one-time",
        attemptCount,
        listingId,
    ) => {
        try{
            const transactionData = {
                timestamp: FieldValue.serverTimestamp()
            };

            // Only add fields that are provided
            if (customerId) transactionData.customerId = customerId;
            if (amount === 0 || amount) transactionData.amount = amount;
            if (paymentIntentId) transactionData.paymentIntentId = paymentIntentId;
            if (reason) transactionData.reason = reason;
            if (status) transactionData.status = status;
            if (type) transactionData.type = type;
            if (attemptCount) transactionData.attemptCount = attemptCount;
            if (listingId) transactionData.listingId = listingId;

            await db.collection("transactions").add(transactionData);
        }catch(e){

        }
    }
}

module.exports = stripeService