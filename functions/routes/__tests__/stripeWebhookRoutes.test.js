jest.mock("../../config/stripe");
jest.mock("../../services/mailService");
jest.mock("../../services/propertyService");
jest.mock("../../services/stripeService");

const express = require("express");
const request = require("supertest");
const logger = require("firebase-functions/logger");
const stripe = require("../../config/stripe");
const {sendPaymentConfirmationEmail} = require("../../services/mailService");
const {markSubmitted} = require("../../services/propertyService");
const {addTransaction} = require("../../services/stripeService");
const stripeWebhookRoutes = require("../stripeWebhookRoutes");

// Mount only this router, not the real app.js — app.js transitively requires
// every other route/controller/service, which would drag in config/db.js and
// friends just to import the module, unrelated to what this test verifies.
function buildApp() {
  const app = express();
  app.use("/v1/webhook", stripeWebhookRoutes);
  return app;
}

function post(app, body) {
  return request(app)
      .post("/v1/webhook/stripe-webhook")
      .set("stripe-signature", "fake-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(body)));
}

const baseEvent = {
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: "pi_123",
      amount: 50000,
      metadata: {
        listingId: "listing-1",
        firstName: "Jane",
        userEmail: "jane@example.com",
        customerId: "cus_123",
      },
    },
  },
};

describe("POST /v1/webhook/stripe-webhook", () => {
  test("payment_intent.succeeded runs markSubmitted, sends email, records the transaction", async () => {
    stripe.webhooks.constructEvent.mockReturnValueOnce(baseEvent);
    markSubmitted.mockResolvedValueOnce(undefined);
    sendPaymentConfirmationEmail.mockResolvedValueOnce(undefined);
    addTransaction.mockResolvedValueOnce(undefined);

    const res = await post(buildApp(), baseEvent);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
    expect(markSubmitted).toHaveBeenCalledWith("listing-1");
    expect(sendPaymentConfirmationEmail).toHaveBeenCalledWith(
        "jane@example.com",
        "Jane",
        500, // session.amount / 100
        `${process.env.FRONTEND_URL}/account/my-listings/listing-1`,
    );
    expect(addTransaction).toHaveBeenCalledWith(
        "cus_123",
        500,
        "pi_123",
        "",
        "processed",
        "one-time",
        1,
        "listing-1",
    );
  });

  test("missing listingId in metadata short-circuits with no side effects", async () => {
    const event = {
      ...baseEvent,
      data: {object: {...baseEvent.data.object, metadata: {}}},
    };
    stripe.webhooks.constructEvent.mockReturnValueOnce(event);

    const res = await post(buildApp(), event);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
    expect(markSubmitted).not.toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).not.toHaveBeenCalled();
    expect(addTransaction).not.toHaveBeenCalled();
  });

  test("still acks 200 when a side effect rejects (best-effort, never blocks the webhook)", async () => {
    stripe.webhooks.constructEvent.mockReturnValueOnce(baseEvent);
    markSubmitted.mockRejectedValueOnce(new Error("firestore blew up"));

    const res = await post(buildApp(), baseEvent);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({received: true});
    // The failure happened inside markSubmitted, so the later calls in the
    // same try block never ran.
    expect(sendPaymentConfirmationEmail).not.toHaveBeenCalled();
    expect(addTransaction).not.toHaveBeenCalled();
  });

  // The `break` after the payment_intent.succeeded case means the switch
  // does NOT fall through to `default:`, so "Unhandled event type:" is only
  // ever logged for event types that aren't explicitly handled.
  test("does not log 'Unhandled event type:' for a handled payment_intent.succeeded", async () => {
    stripe.webhooks.constructEvent.mockReturnValueOnce(baseEvent);
    markSubmitted.mockResolvedValueOnce(undefined);
    sendPaymentConfirmationEmail.mockResolvedValueOnce(undefined);
    addTransaction.mockResolvedValueOnce(undefined);
    const logSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

    await post(buildApp(), baseEvent);

    expect(logSpy).not.toHaveBeenCalledWith("Unhandled event type:", "payment_intent.succeeded");
    logSpy.mockRestore();
  });

  test("logs 'Unhandled event type:' for an event type with no explicit case", async () => {
    const event = {...baseEvent, type: "charge.refunded"};
    stripe.webhooks.constructEvent.mockReturnValueOnce(event);
    const logSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

    await post(buildApp(), event);

    expect(logSpy).toHaveBeenCalledWith("Unhandled event type:", "charge.refunded");
    logSpy.mockRestore();
  });

  // Regression test for the bug fixed alongside this test file: a bad/missing
  // signature used to hang the request forever (no res.status/res.json call
  // in the catch block). Now it responds 400 instead.
  test("responds 400 when signature verification fails, instead of hanging", async () => {
    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });

    const res = await post(buildApp(), baseEvent);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({error: "Invalid signature"});
    expect(markSubmitted).not.toHaveBeenCalled();
  });
});
