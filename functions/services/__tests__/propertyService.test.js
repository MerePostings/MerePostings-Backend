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

describe("propertyService.uploadMedia", () => {
  beforeEach(() => {
    resetDbMock();
  });

  const photo = (overrides = {}) => ({
    mimetype: "image/jpeg",
    originalname: "house.jpg",
    buffer: Buffer.from("fake-bytes"),
    ...overrides,
  });

  test("throws 400 for an invalid mediaType", async () => {
    await expect(
        propertyService.uploadMedia("listing-1", [photo()], "video", {uid: "user-1"}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("throws 400 when no files are received", async () => {
    await expect(
        propertyService.uploadMedia("listing-1", [], "photos", {uid: "user-1"}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("enforces ownership for non-admin callers", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "someone-else"})});

    await expect(
        propertyService.uploadMedia("listing-1", [photo()], "photos", {uid: "user-1", isAdmin: false}),
    ).rejects.toMatchObject({statusCode: 403});
  });

  test("skips the ownership check for admin callers", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.bucketFile.save.mockResolvedValue(undefined);
    dbRefs.bucketFile.getSignedUrl.mockResolvedValue(["https://signed.example/house.jpg"]);

    await propertyService.uploadMedia("listing-1", [photo()], "photos", {isAdmin: true});

    expect(dbRefs.docRef.get).not.toHaveBeenCalled();
  });

  test("throws 400 when more than maxFiles are submitted", async () => {
    const files = Array.from({length: 51}, () => photo());
    await expect(
        propertyService.uploadMedia("listing-1", files, "photos", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("throws 400 for a disallowed mime type", async () => {
    await expect(
        propertyService.uploadMedia("listing-1", [photo({mimetype: "video/mp4"})], "photos", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("throws 400 for a file over the size limit", async () => {
    const tooLarge = photo({buffer: Buffer.alloc(16 * 1024 * 1024)});
    await expect(
        propertyService.uploadMedia("listing-1", [tooLarge], "photos", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("happy path: uploads each file, appends media urls, and auto-completes the upload action", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.bucketFile.save.mockResolvedValue(undefined);
    dbRefs.bucketFile.getSignedUrl.mockResolvedValue(["https://signed.example/house.jpg"]);

    const result = await propertyService.uploadMedia("listing-1", [photo()], "photos", {isAdmin: true});

    expect(result).toEqual([
      expect.objectContaining({url: "https://signed.example/house.jpg", fileName: "house.jpg", category: null}),
    ]);
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({"media.photos": expect.anything()}),
    );
    expect(actionService.completeUploadAction).toHaveBeenCalledWith("listing-1", "photos");
  });

  test("tags attachments with the given category", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.bucketFile.save.mockResolvedValue(undefined);
    dbRefs.bucketFile.getSignedUrl.mockResolvedValue(["https://signed.example/doc.pdf"]);

    const result = await propertyService.uploadMedia(
        "listing-1",
        [photo({mimetype: "application/pdf", originalname: "doc.pdf"})],
        "attachments",
        {isAdmin: true, category: "floor_plan"},
    );

    expect(result[0].category).toBe("floor_plan");
  });

  test("wraps a Storage failure in a 500 AppError", async () => {
    dbRefs.bucketFile.save.mockRejectedValueOnce(new Error("bucket unreachable"));

    await expect(
        propertyService.uploadMedia("listing-1", [photo()], "photos", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 500});
  });

  test("does not fail the upload when auto-completing the action throws", async () => {
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);
    dbRefs.bucketFile.save.mockResolvedValue(undefined);
    dbRefs.bucketFile.getSignedUrl.mockResolvedValue(["https://signed.example/house.jpg"]);
    actionService.completeUploadAction.mockRejectedValueOnce(new Error("actions down"));

    await expect(
        propertyService.uploadMedia("listing-1", [photo()], "photos", {isAdmin: true}),
    ).resolves.toBeDefined();
  });
});

describe("propertyService.removeMedia", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 400 for an invalid mediaType", async () => {
    await expect(
        propertyService.removeMedia("listing-1", "video", "https://x/y.jpg", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("enforces ownership for non-admin callers", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "someone-else"})});

    await expect(
        propertyService.removeMedia("listing-1", "photos", "https://x/y.jpg", {uid: "user-1", isAdmin: false}),
    ).rejects.toMatchObject({statusCode: 403});
  });

  test("throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(
        propertyService.removeMedia("listing-1", "photos", "https://x/y.jpg", {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 404});
  });

  test("filters out the removed url and leaves the rest of the media array untouched", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({media: {photos: [{url: "https://x/keep.jpg"}, {url: "https://x/remove.jpg"}]}}),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    await propertyService.removeMedia("listing-1", "photos", "https://x/remove.jpg", {isAdmin: true});

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({"media.photos": [{url: "https://x/keep.jpg"}]}),
    );
  });

  test("does not throw when the url isn't a Storage download link (Storage delete is best-effort)", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({media: {photos: [{url: "https://not-a-storage-url.example/x.jpg"}]}}),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    await expect(
        propertyService.removeMedia("listing-1", "photos", "https://not-a-storage-url.example/x.jpg", {isAdmin: true}),
    ).resolves.toBeUndefined();
  });
});

describe("propertyService.reorderMedia", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 400 for an invalid mediaType", async () => {
    await expect(
        propertyService.reorderMedia("listing-1", "video", ["https://x/a.jpg"], {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("throws 400 when urls is empty", async () => {
    await expect(
        propertyService.reorderMedia("listing-1", "photos", [], {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 400});
  });

  test("throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(
        propertyService.reorderMedia("listing-1", "photos", ["https://x/a.jpg"], {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 404});
  });

  test("reorders known urls and appends any orphaned media not present in the new order", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        media: {
          photos: [
            {url: "https://x/a.jpg"},
            {url: "https://x/b.jpg"},
            {url: "https://x/orphan.jpg"},
          ],
        },
      }),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.reorderMedia(
        "listing-1", "photos", ["https://x/b.jpg", "https://x/a.jpg"], {isAdmin: true},
    );

    expect(result.map((m) => m.url)).toEqual(["https://x/b.jpg", "https://x/a.jpg", "https://x/orphan.jpg"]);
  });

  test("ignores urls in the reorder list that no longer exist in the listing's media", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({media: {photos: [{url: "https://x/a.jpg"}]}}),
    });
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.reorderMedia(
        "listing-1", "photos", ["https://x/deleted.jpg", "https://x/a.jpg"], {isAdmin: true},
    );

    expect(result.map((m) => m.url)).toEqual(["https://x/a.jpg"]);
  });

  test("wraps an unexpected failure in a 500 AppError without double-wrapping AppErrors", async () => {
    dbRefs.docRef.get.mockRejectedValueOnce(new Error("firestore down"));

    await expect(
        propertyService.reorderMedia("listing-1", "photos", ["https://x/a.jpg"], {isAdmin: true}),
    ).rejects.toMatchObject({statusCode: 500});
  });
});

describe("propertyService.saveSelectedAddons", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});

    await expect(
        propertyService.saveSelectedAddons("user-1", "listing-1", ["professional_photography"]),
    ).rejects.toMatchObject({statusCode: 404});
  });

  test("throws 403 when ownerId doesn't match the caller", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "someone-else", status: "draft"})});

    await expect(
        propertyService.saveSelectedAddons("user-1", "listing-1", ["professional_photography"]),
    ).rejects.toMatchObject({statusCode: 403});
  });

  test("throws 409 when the listing is already submitted", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "user-1", status: "submitted"})});

    await expect(
        propertyService.saveSelectedAddons("user-1", "listing-1", ["professional_photography"]),
    ).rejects.toMatchObject({statusCode: 409});
  });

  test("throws 400 for an unknown addon id even if Joi validation was bypassed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "user-1", status: "draft"})});

    await expect(
        propertyService.saveSelectedAddons("user-1", "listing-1", ["not_a_real_addon"]),
    ).rejects.toMatchObject({statusCode: 400});
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("happy path: persists the addon selection and clears the legacy beforeLive field", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "user-1", status: "draft"})});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    const result = await propertyService.saveSelectedAddons("user-1", "listing-1", ["professional_photography"]);

    expect(result).toEqual(["professional_photography"]);
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({selectedAddons: ["professional_photography"]}),
    );
  });

  test("throws 500 when the Firestore write fails", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "user-1", status: "draft"})});
    dbRefs.docRef.update.mockRejectedValueOnce(new Error("firestore down"));

    await expect(
        propertyService.saveSelectedAddons("user-1", "listing-1", ["professional_photography"]),
    ).rejects.toMatchObject({statusCode: 500});
  });
});

describe("propertyService.markStepCompleted / markStepIncomplete", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("markStepCompleted throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});
    await expect(propertyService.markStepCompleted("listing-1", "verification")).rejects.toMatchObject({statusCode: 404});
  });

  test("markStepCompleted throws 400 for a step id that isn't valid for this listing's addons", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({selectedAddons: []})});
    await expect(propertyService.markStepCompleted("listing-1", "not_a_real_step")).rejects.toMatchObject({statusCode: 400});
  });

  test("markStepCompleted writes a serverTimestamp under progressTracker.completedSteps", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({selectedAddons: []})});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    await propertyService.markStepCompleted("listing-1", "verification");

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({"progressTracker.completedSteps.verification": expect.anything()}),
    );
  });

  test("markStepIncomplete throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});
    await expect(propertyService.markStepIncomplete("listing-1", "verification")).rejects.toMatchObject({statusCode: 404});
  });

  test("markStepIncomplete throws 400 for a step id that isn't valid for this listing's addons", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({selectedAddons: []})});
    await expect(propertyService.markStepIncomplete("listing-1", "not_a_real_step")).rejects.toMatchObject({statusCode: 400});
  });

  test("markStepIncomplete deletes the completedSteps entry", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({selectedAddons: []})});
    dbRefs.docRef.update.mockResolvedValueOnce(undefined);

    await propertyService.markStepIncomplete("listing-1", "verification");

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({"progressTracker.completedSteps.verification": expect.anything()}),
    );
  });
});

describe("propertyService.getProgressTracker", () => {
  beforeEach(() => {
    resetDbMock();
  });

  test("throws 404 when the listing doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: false});
    await expect(propertyService.getProgressTracker("user-1", "listing-1")).rejects.toMatchObject({statusCode: 404});
  });

  test("throws 403 when a non-admin caller (uid set) doesn't own the listing", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "someone-else"})});
    await expect(propertyService.getProgressTracker("user-1", "listing-1")).rejects.toMatchObject({statusCode: 403});
  });

  test("skips the ownership check for admin calls (uid null)", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({exists: true, data: () => ({ownerId: "someone-else", selectedAddons: []})});
    await expect(propertyService.getProgressTracker(null, "listing-1")).resolves.toBeDefined();
  });

  test("computes completed count and percentage from completedSteps", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerId: "user-1",
        selectedAddons: [],
        progressTracker: {
          completedSteps: {
            payment: {toDate: () => new Date("2026-01-01")},
            verification: {toDate: () => new Date("2026-01-02")},
          },
        },
      }),
    });

    const result = await propertyService.getProgressTracker("user-1", "listing-1");

    expect(result.totalSteps).toBe(3); // payment, verification, mls_entry_completion
    expect(result.completedCount).toBe(2);
    expect(result.percentage).toBe(Math.round((2 / 3) * 100));
    expect(result.steps.find((s) => s.id === "mls_entry_completion").completed).toBe(false);
  });
});
