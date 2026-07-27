jest.mock("../../config/db");
jest.mock("../actionService");

const {__refs: dbRefs, resetDbMock} = require("../../config/db");
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

  test("happy path: updates status/paid/submittedAt", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    await propertyService.markSubmitted("listing-1");

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({status: "submitted", paid: true}),
    );
  });

  // markSubmitted's outer try/catch swallows even a failed primary update —
  // intentional fire-and-forget behavior since this is called from the
  // Stripe webhook and must never throw back into it. Documented, not a bug.
  test("swallows a primary Firestore update failure without throwing (fire-and-forget from the webhook)", async () => {
    dbRefs.docRef.update.mockRejectedValueOnce(new Error("firestore down"));

    await expect(propertyService.markSubmitted("listing-1")).resolves.toBeUndefined();
  });

  // Regression test: markSubmitted used to re-fetch the listing via a
  // `docRef` variable that was never declared in this function's scope
  // (only inlined `db.collection(...).doc(listingId)` calls existed),
  // throwing a ReferenceError that was silently swallowed by the inner
  // try/catch. Actions (photo_upload, document_upload, verification, ...)
  // were consequently never generated for ANY submitted listing.
  test("fetches the listing doc and generates actions for it after marking submitted", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    const propertyData = {ownerId: "user-1", selectedAddons: [], location: {}};
    dbRefs.docRef.get.mockResolvedValueOnce({data: () => propertyData});

    await propertyService.markSubmitted("listing-1");

    expect(actionService.generateActionsForListing).toHaveBeenCalledWith("listing-1", propertyData);
  });
});

describe("propertyService.saveListingProcess", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 404 when the listing doc doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(
        propertyService.saveListingProcess("user-1", "listing-1", {state: {occupancy: "owner"}}),
    ).rejects.toMatchObject({statusCode: 404});
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("throws 403 when ownerId doesn't match the caller", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "someone-else", status: "draft"}),
    });

    await expect(
        propertyService.saveListingProcess("user-1", "listing-1", {state: {occupancy: "owner"}}),
    ).rejects.toMatchObject({statusCode: 403});
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("throws 409 when the listing is already submitted", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ownerId: "user-1", status: "submitted"}),
    });

    await expect(
        propertyService.saveListingProcess("user-1", "listing-1", {state: {occupancy: "owner"}}),
    ).rejects.toMatchObject({statusCode: 409});
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("deep-merges nested propertyDetails and preserves siblings", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerId: "user-1",
        status: "draft",
        furthestMajorIndex: 3,
        propertyDetails: {
          address: "1 Main",
          bedrooms: 3,
          rural: {acreage: "5", subtype: "farm"},
        },
      }),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveListingProcess("user-1", "listing-1", {
      state: {propertyDetails: {address: "2 Oak"}},
    });

    expect(result.state.propertyDetails).toEqual({
      address: "2 Oak",
      bedrooms: 3,
      rural: {acreage: "5", subtype: "farm"},
    });
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyDetails: {
            address: "2 Oak",
            bedrooms: 3,
            rural: {acreage: "5", subtype: "farm"},
          },
        }),
    );
  });

  test("replaces scalar top-level fields", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerId: "user-1",
        status: "draft",
        occupancy: "tenant",
      }),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveListingProcess("user-1", "listing-1", {
      state: {occupancy: "owner"},
    });

    expect(result.state.occupancy).toBe("owner");
  });

  test("replaces arrays instead of concatenating", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerId: "user-1",
        status: "draft",
        selectedAddons: ["professional_photography"],
      }),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveListingProcess("user-1", "listing-1", {
      state: {selectedAddons: ["pre_listing_home_inspection"]},
    });

    expect(result.state.selectedAddons).toEqual(["pre_listing_home_inspection"]);
  });

  test("omitted top-level keys are left untouched", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerId: "user-1",
        status: "draft",
        supportTier: "flexible",
        occupancy: "owner",
      }),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveListingProcess("user-1", "listing-1", {
      state: {occupancy: "vacant"},
    });

    expect(result.state.supportTier).toBe("flexible");
    expect(result.state.occupancy).toBe("vacant");
  });
});
