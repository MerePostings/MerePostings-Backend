jest.mock("../../config/db");
jest.mock("../../config/stripe");
jest.mock("../../config/smartConnections");

const {__refs: dbRefs, resetDbMock} = require("../../config/db");
const stripe = require("../../config/stripe");
const stripeService = require("../stripeService");
const {queueSmartConnectionsContact} = require("../../config/smartConnections");

// jest.setup.js stubs ADMIN_FEE_CENTS to "2500" for the whole suite.
const ADMIN_FEE_CENTS = 2500;

describe("stripeService.requestRefund", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("400s when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("401s on ownership mismatch", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "someone-else"}),
    });

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test("400s when already refunded", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "refunded"}),
    });

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("already been refunded"),
    });
  });

  test.each(["active", "closed"])("400s when status is %s (already processed)", async (status) => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status}),
    });

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("already been processed"),
    });
  });

  test("400s when the listing hasn't been paid for", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: false}),
    });

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("not been paid for"),
    });
  });

  test("refund amount is computed as amountPaid - ADMIN_FEE_CENTS, guard blocks Stripe call when <= 0", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: true}),
    });
    dbRefs.queryRef.get.mockResolvedValueOnce({
      docs: [{data: () => ({paymentIntentId: "pi_123", customerId: "cus_1"})}],
    });
    stripe.paymentIntents.retrieve.mockResolvedValueOnce({amount: ADMIN_FEE_CENTS});

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("non-refundable admin fee"),
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test("happy path: creates the Stripe refund, marks the listing refunded, records a negative transaction", async () => {
    const amountPaid = 50000;
    const expectedRefund = amountPaid - ADMIN_FEE_CENTS;

    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: true}),
    });
    dbRefs.queryRef.get.mockResolvedValueOnce({
      docs: [{data: () => ({paymentIntentId: "pi_123", customerId: "cus_1"})}],
    });
    stripe.paymentIntents.retrieve.mockResolvedValueOnce({id: "pi_123", amount: amountPaid, created: 1793989000});
    stripe.refunds.create.mockResolvedValueOnce({id: "re_123", amount: expectedRefund});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.collectionRef.add.mockResolvedValueOnce(undefined);
    dbRefs.docRef.get.mockResolvedValueOnce({data: () => ({email: "jane@example.com", firstName: "Jane", lastName: "Doe"})});

    await stripeService.requestRefund("listing-1", "user-1");

    expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({payment_intent: "pi_123", amount: expectedRefund}),
    );
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(expect.objectContaining({status: "refunded"}));
    expect(dbRefs.collectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({amount: -(expectedRefund / 100), type: "refund"}),
    );
    expect(queueSmartConnectionsContact).toHaveBeenCalledWith({
      event: "REFUND",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      payment: expect.objectContaining({id: "pi_123", amount: amountPaid, amountRefunded: expectedRefund}),
    });
  });

  test("a failure telling Smart Connections never fails the refund", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: true}),
    });
    dbRefs.queryRef.get.mockResolvedValueOnce({
      docs: [{data: () => ({paymentIntentId: "pi_123", customerId: "cus_1"})}],
    });
    stripe.paymentIntents.retrieve.mockResolvedValueOnce({id: "pi_123", amount: 50000, created: 1793989000});
    stripe.refunds.create.mockResolvedValueOnce({id: "re_123", amount: 47500});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.collectionRef.add.mockResolvedValueOnce(undefined);
    dbRefs.docRef.get.mockRejectedValueOnce(new Error("Firestore down"));

    await expect(stripeService.requestRefund("listing-1", "user-1")).resolves.toBeUndefined();
  });

  // Edge case: if a listing is paid:true with no matching transactions doc,
  // `snapshot.docs[0]` throws a raw TypeError (no docs to index into). The
  // outer catch no longer forwards that raw error to the client — it's not
  // an AppError, so it gets logged server-side and replaced with a fixed,
  // safe 500 message (never the internal TypeError text).
  test("500s with a safe message when paid:true but no transaction record exists", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: true}),
    });
    dbRefs.queryRef.get.mockResolvedValueOnce({docs: []});

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to process refund. Please contact support.",
    });
  });
});

describe("stripeService.smartConnectionsPayment", () => {
  const paymentIntent = {
    id: "pi_1",
    description: "Mere Postings - One-time listing creation fee",
    amount: 50000,
    amount_received: 50000,
    currency: "cad",
    created: 1793989000,
    latest_charge: "ch_1",
  };

  test("adds the card, the receipt and the charge time", async () => {
    stripe.charges.retrieve.mockResolvedValueOnce({
      created: 1793990000,
      receipt_url: "https://pay.stripe.com/receipts/1",
      payment_method_details: {card: {brand: "visa", last4: "4242"}},
    });

    await expect(stripeService.smartConnectionsPayment(paymentIntent)).resolves.toEqual({
      id: "pi_1",
      description: "Mere Postings - One-time listing creation fee",
      amount: 50000,
      amountRefunded: 0,
      currency: "cad",
      paidAt: new Date(1793990000 * 1000).toISOString(),
      cardBrand: "visa",
      cardLast4: "4242",
      receiptUrl: "https://pay.stripe.com/receipts/1",
    });
  });

  test("still describes the payment when the charge can't be read", async () => {
    stripe.charges.retrieve.mockRejectedValueOnce(new Error("Stripe down"));

    const payment = await stripeService.smartConnectionsPayment(paymentIntent, 1000);
    expect(payment).toMatchObject({id: "pi_1", amount: 50000, amountRefunded: 1000});
    expect(payment.cardLast4).toBeUndefined();
  });
});
