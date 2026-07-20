jest.mock("../../config/db");
jest.mock("../../config/stripe");

const {__refs: dbRefs, resetDbMock} = require("../../config/db");
const stripe = require("../../config/stripe");
const stripeService = require("../stripeService");

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
    stripe.paymentIntents.retrieve.mockResolvedValueOnce({amount: amountPaid});
    stripe.refunds.create.mockResolvedValueOnce({id: "re_123"});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.collectionRef.add.mockResolvedValueOnce(undefined);

    await stripeService.requestRefund("listing-1", "user-1");

    expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({payment_intent: "pi_123", amount: expectedRefund}),
    );
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(expect.objectContaining({status: "refunded"}));
    expect(dbRefs.collectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({amount: -(expectedRefund / 100), type: "refund"}),
    );
  });

  // Undocumented edge case found while writing this test: if a listing is
  // paid:true with no matching transactions doc, `snapshot.docs[0]` throws a
  // raw TypeError (no docs to index into). The outer catch wraps it as
  // `AppError(e.message, e.statusCode)`, and since a native TypeError has no
  // .statusCode, that comes through as `undefined` — which errorHandler.js
  // then defaults to 500. So today's *observable* behavior is a 500, but only
  // by accident of that fallback, not by design. Documented, not fixed here.
  test("500s (by fallback, not by design) when paid:true but no transaction record exists", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", paid: true}),
    });
    dbRefs.queryRef.get.mockResolvedValueOnce({docs: []});

    await expect(stripeService.requestRefund("listing-1", "user-1")).rejects.toMatchObject({
      statusCode: undefined,
    });
  });
});
