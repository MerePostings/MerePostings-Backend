jest.mock("../../config/db");
jest.mock("../notificationService");
jest.mock("../actionService");

const {__refs: dbRefs, resetDbMock} = require("../../config/db");
const notificationService = require("../notificationService");
const actionService = require("../actionService");
const propertyService = require("../propertyService");

describe("propertyService.saveDraftField", () => {
  beforeEach(() => {
    resetDbMock();
  });

  const field = {
    propertyType: "detached",
    fieldName: "bedrooms",
    fieldValue: 3,
    path: "basics",
    dbKey: "bedrooms",
  };

  test("throws 404 when the listing doc doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(propertyService.saveDraftField("user-1", "listing-1", field)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("throws 403 when ownerId doesn't match the caller", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "someone-else", status: "draft"}),
    });

    await expect(propertyService.saveDraftField("user-1", "listing-1", field)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("throws 409 when the listing is already submitted, without writing", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "submitted", propertyType: "detached"}),
    });

    await expect(propertyService.saveDraftField("user-1", "listing-1", field)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("throws 409 on a propertyType mismatch", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", propertyType: "condoApartment"}),
    });

    await expect(propertyService.saveDraftField("user-1", "listing-1", field)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("happy path: writes a nested dotted-path key and returns the field", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", propertyType: "detached"}),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveDraftField("user-1", "listing-1", field);

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({"basics.bedrooms": 3, "status": "draft"}),
    );
    expect(result).toEqual({bedrooms: 3});
  });

  test("happy path: a 'top' sectionPath writes the dbKey directly, not nested", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", propertyType: null}),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const topField = {propertyType: "detached", fieldName: "propertyType", fieldValue: "detached", path: "top", dbKey: "propertyType"};
    await propertyService.saveDraftField("user-1", "listing-1", topField);

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({propertyType: "detached"}),
    );
  });

  test("throws 500 when the Firestore write fails", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "draft", propertyType: "detached"}),
    });
    dbRefs.docRef.update.mockRejectedValueOnce(new Error("firestore down"));

    await expect(propertyService.saveDraftField("user-1", "listing-1", field)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe("propertyService.markSubmitted", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("happy path: updates status/paid/submittedAt and notifies the owner", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.docRef.get.mockResolvedValueOnce({
      data: () => ({ownerId: "user-1", location: {streetName: "Main St"}}),
    });
    notificationService.createNotification.mockResolvedValueOnce(undefined);
    actionService.generateActionsForListing.mockResolvedValueOnce(undefined);

    await propertyService.markSubmitted("listing-1");

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({status: "submitted", paid: true}),
    );
    expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({userId: "user-1", listingId: "listing-1"}),
    );
    expect(actionService.generateActionsForListing).toHaveBeenCalledWith(
        "listing-1",
        expect.objectContaining({ownerId: "user-1"}),
    );
  });

  test("swallows a notification failure without throwing, and still runs actions", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.docRef.get.mockResolvedValueOnce({
      data: () => ({ownerId: "user-1"}),
    });
    notificationService.createNotification.mockRejectedValueOnce(new Error("notify failed"));
    actionService.generateActionsForListing.mockResolvedValueOnce(undefined);

    await expect(propertyService.markSubmitted("listing-1")).resolves.toBeUndefined();
    expect(actionService.generateActionsForListing).toHaveBeenCalled();
  });

  test("swallows an actions-generation failure independently of notification", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.docRef.get.mockResolvedValueOnce({
      data: () => ({ownerId: "user-1"}),
    });
    notificationService.createNotification.mockResolvedValueOnce(undefined);
    actionService.generateActionsForListing.mockRejectedValueOnce(new Error("actions failed"));

    await expect(propertyService.markSubmitted("listing-1")).resolves.toBeUndefined();
    expect(notificationService.createNotification).toHaveBeenCalled();
  });

  // markSubmitted's outer try/catch swallows even a failed primary update —
  // intentional fire-and-forget behavior since this is called from the
  // Stripe webhook and must never throw back into it. Documented, not a bug.
  test("swallows a primary Firestore update failure without throwing (fire-and-forget from the webhook)", async () => {
    dbRefs.docRef.update.mockRejectedValueOnce(new Error("firestore down"));

    await expect(propertyService.markSubmitted("listing-1")).resolves.toBeUndefined();
  });
});
