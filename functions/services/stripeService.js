const logger = require("firebase-functions/logger");
const {db} = require("../config/db");
const AppError = require("../utils/AppError");
const {FieldValue} = require("firebase-admin/firestore");
const stripe = require("../config/stripe");
const calculateListingPrice = require("../utils/listingPriceCalculator");
const {queueSmartConnectionsContact} = require("../config/smartConnections");
const stripeService = {

  /**
     * The payment as Smart Connections records it: a paid invoice on the
     * person's contact. Reads the card and Stripe's receipt from the latest
     * charge; if that fails, the payment is still sent without them.
     * @param {object} paymentIntent a succeeded PaymentIntent
     * @param {number} amountRefunded cents refunded so far
     */
  smartConnectionsPayment: async (paymentIntent, amountRefunded = 0) => {
    const payment = {
      id: paymentIntent.id,
      description: paymentIntent.description || "Mere Postings - One-time listing creation fee",
      amount: paymentIntent.amount_received || paymentIntent.amount,
      amountRefunded,
      currency: paymentIntent.currency || "cad",
      paidAt: (paymentIntent.created ? new Date(paymentIntent.created * 1000) : new Date()).toISOString(),
    };
    const chargeId = typeof paymentIntent.latest_charge === "string" ?
      paymentIntent.latest_charge :
      paymentIntent.latest_charge?.id;
    if (!chargeId) return payment;
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      const card = charge.payment_method_details?.card;
      if (charge.created) payment.paidAt = new Date(charge.created * 1000).toISOString();
      if (card?.brand) payment.cardBrand = card.brand;
      if (card?.last4) payment.cardLast4 = card.last4;
      if (charge.receipt_url) payment.receiptUrl = charge.receipt_url;
    } catch (e) {
      logger.warn("[stripe] Couldn't read the charge of a payment", {paymentIntentId: paymentIntent.id});
    }
    return payment;
  },

  /**
     * Creates a new Stripe customer and saves their customerId to Firestore
     * - Creates the customer in Stripe using their email
     * - Merges the stripeCustomerId back into the user's Firestore document
     */
  createCustomer: async (userRef, email)=>{
    try {
      const customer = await stripe.customers.create({email});
      await userRef.set({stripeCustomerId: customer.id}, {merge: true});
      return customer.id;
    } catch (e) {
      logger.error(e);
      throw new AppError("Failed to Create Customer", 400);
    }
  },

  /**
     * Creates a Stripe Checkout Session for a new listing payment
     * - Calculates total price based on selected addons
     * - Fetches user data and creates a Stripe customer if one doesn't exist
     * - Builds a one-time payment session with the calculated amount
     * - Attaches listingId, userEmail, and firstName to the PaymentIntent metadata for webhook processing
     * - Returns the Stripe Checkout URL to redirect the user to
     */
  stripeCheckoutSessionForCreateListing: async (listingId, uid, selectedAddons) => {
    const {totalCents} = calculateListingPrice(selectedAddons);

    try {
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new Error("User document not found");
      }

      const userData = userSnap.data();
      const userEmail = userData.email;
      const firstName = userData.firstName || "User";

      if (!userEmail) {
        throw new Error("User email not found");
      }

      let customerId = userData.stripeCustomerId;
      if (!customerId) {
        customerId = await stripeService.createCustomer(userRef, userEmail);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "cad",
        customer: customerId,
        payment_method_types: ["card"],
        metadata: {
          listingId,
          userEmail,
          firstName,
          customerId,
        },
        description: "Mere Postings - One-time listing creation fee",
      });

      return paymentIntent.client_secret;
    } catch (e) {
      logger.error("[stripe] Failed to create checkout session:", e);
      throw new AppError("Failed to start checkout. Please try again.", 500);
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
    try {
      const transactionData = {
        createdAt: FieldValue.serverTimestamp(),
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
    } catch (e) {
      // Best-effort audit log — never blocks the payment flow itself.
    }
  },

  requestRefund: async (listingId, uid)=>{
    try {
      const propertyRef = db.collection("properties").doc(listingId);
      const propertySnap = await propertyRef.get();

      if (!propertySnap.exists) {
        throw new AppError("Listing not found", 400);
      }

      const listing = propertySnap.data();

      if (listing.ownerId !== uid) {
        throw new AppError("Unauthorized", 401);
      }

      if (listing.status === "refunded") {
        throw new AppError("This listing has already been refunded", 400);
      }

      if (listing.status === "active" || listing.status === "closed") {
        throw new AppError("This listing has already been processed", 400);
      }

      if (!listing.paid) {
        throw new AppError("This listing has not been paid for", 400);
      }

      if (listing.complimentary) {
        throw new AppError("Complimentary listings can't be refunded", 400);
      }

      const snapshot = await db
          .collection("transactions")
          .where("listingId", "==", listingId)
          .orderBy("createdAt", "desc")
          .get();


      const paymentIntentId = snapshot.docs[0].data().paymentIntentId;

      if (!paymentIntentId) {
        throw new AppError("Payment reference not found. Please contact support.", 400);
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
        reason: "requested_by_customer",
      });

      await propertyRef.update({
        refundedAt: FieldValue.serverTimestamp(),
        status: "refunded",
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection("transactions").add({
        customerId: snapshot.docs[0].data().customerId ?? null,
        listingId,
        paymentIntentId,
        refundId: refund.id,
        amount: -(refundAmount / 100),
        status: "refunded",
        type: "refund",
        createdAt: FieldValue.serverTimestamp(),
      });

      // The refund has gone through; Smart Connections hearing about it must not undo that.
      try {
        const owner = (await db.collection("users").doc(uid).get()).data() || {};
        await queueSmartConnectionsContact({
          event: "REFUND",
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          payment: await stripeService.smartConnectionsPayment(paymentIntent, refund.amount),
        });
      } catch (e) {
        logger.error("[smartConnections] Couldn't queue a refund", {listingId, message: e.message});
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      logger.error("[stripe] Failed to process refund:", e);
      throw new AppError("Failed to process refund. Please contact support.", 500);
    }
  },
};

module.exports = stripeService;
