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

            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalCents,
                currency: 'cad',
                customer: customerId,
                payment_method_types: ['card'],
                metadata: {
                    listingId,
                    userEmail,
                    firstName,
                    customerId,
                },
                description: 'Mere Postings - One-time listing creation fee',
            });

            return paymentIntent.client_secret;

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
                createdAt: FieldValue.serverTimestamp()
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
    },

    requestRefund: async (listingId, uid)=>{
        try{
            const propertyRef = db.collection('properties').doc(listingId);
            const propertySnap = await propertyRef.get();

            if (!propertySnap.exists) {
                throw new AppError('Listing not found', 400);
            }

            const listing = propertySnap.data();

            if (listing.ownerId !== uid) {
                throw new AppError('Unauthorized', 401);
            }

            if (listing.status === 'refunded') {
                throw new AppError('This listing has already been refunded', 400);
            }
            
            if (listing.status === 'active' || listing.status === 'closed') {
                throw new AppError('This listing has already been processed', 400);
            }

            if (!listing.paid) {
                throw new AppError('This listing has not been paid for', 400);
            }

            const snapshot = await db
                .collection("transactions")
                .where("listingId", "==", listingId)
                .orderBy("createdAt", "desc")
                .get();

            
            const paymentIntentId = snapshot.docs[0].data().paymentIntentId;

            if (!paymentIntentId) {
                throw new AppError('Payment reference not found. Please contact support.', 400);
            }

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            const amountPaid = paymentIntent.amount;

            const refundAmount = amountPaid - parseInt(process.env.ADMIN_FEE_CENTS);

            if (refundAmount <= 0) {
                throw new AppError(`Amount paid does not exceed the non-refundable admin fee of $${process.env.ADMIN_FEE_CENTS}`, 400);
            }

            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: refundAmount,
                reason: 'requested_by_customer',
            });

            await propertyRef.update({
                refundedAt: FieldValue.serverTimestamp(),
                status: 'refunded',
                updatedAt: FieldValue.serverTimestamp(),
            });

            await db.collection('transactions').add({
                customerId: snapshot.docs[0].data().customerId ?? null,
                listingId,
                paymentIntentId,
                refundId: refund.id,
                amount: -(refundAmount / 100),
                status: 'refunded',
                type: 'refund',
                createdAt: FieldValue.serverTimestamp(),
            });
        }catch(e){
            throw new AppError(e.message || "Failed to process refund", e.statusCode)
        }
    }
}

module.exports = stripeService