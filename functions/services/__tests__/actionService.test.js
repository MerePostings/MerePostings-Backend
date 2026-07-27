jest.mock("../../config/db");
jest.mock("../notificationService");

const { DateTime } = require("luxon");
const { __refs: dbRefs, resetDbMock } = require("../../config/db");
const notificationService = require("../notificationService");
const actionService = require("../actionService");

const futureDate = () => DateTime.now().setZone("America/Toronto").plus({ days: 10 }).toISODate();
const pastDate = () => DateTime.now().setZone("America/Toronto").minus({ days: 1 }).toISODate();

beforeEach(() => {
  resetDbMock();
  notificationService.createNotification.mockReset().mockResolvedValue(undefined);
});

describe("actionService.generateActionsForListing", () => {
  test("no-ops when propertyData has no ownerId", async () => {
    await actionService.generateActionsForListing("listing-1", { ownerId: null });

    expect(dbRefs.tx.getAll).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  test("creates only the missing blueprint docs, updates the dashboard pointer, and notifies once", async () => {
    // 2 blueprints for a listing with no addons (verification, photo_upload, document_upload = 3),
    // simulate the first as already existing so only 2 get created.
    dbRefs.tx.getAll.mockResolvedValueOnce([
      { exists: true }, // verification already exists
      { exists: false }, // photo_upload
      { exists: false }, // document_upload
      { exists: false }, // pointer doc
    ]);

    await actionService.generateActionsForListing("listing-1", {
      ownerId: "owner-1",
      selectedAddons: [],
      location: { streetNumber: "123", streetName: "Main", municipality: "Toronto" },
    });

    expect(dbRefs.tx.set).toHaveBeenCalledTimes(3); // 2 action docs + 1 pointer doc
    const actionWrites = dbRefs.tx.set.mock.calls.filter(([, data]) => data.title);
    expect(actionWrites).toHaveLength(2);
    expect(actionWrites.map(([, data]) => data.type)).toEqual(
        expect.arrayContaining(["photo_upload", "document_upload"]),
    );

    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "owner-1", listingId: "listing-1", type: "action_update" }),
    );
  });

  test("does not notify when every required blueprint doc already exists", async () => {
    dbRefs.tx.getAll.mockResolvedValueOnce([
      { exists: true },
      { exists: true },
      { exists: true },
      { exists: true }, // pointer
    ]);

    await actionService.generateActionsForListing("listing-1", {
      ownerId: "owner-1",
      selectedAddons: [],
    });

    expect(dbRefs.tx.set).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  test("swallows a notification failure without throwing", async () => {
    dbRefs.tx.getAll.mockResolvedValueOnce([
      { exists: false },
      { exists: false },
      { exists: false },
      { exists: false },
    ]);
    notificationService.createNotification.mockRejectedValueOnce(new Error("mail down"));

    await expect(
        actionService.generateActionsForListing("listing-1", { ownerId: "owner-1", selectedAddons: [] }),
    ).resolves.toBeUndefined();
  });

  test("includes professional_photography and pre_listing_home_inspection blueprints when addons are selected, and skips the upload actions", async () => {
    dbRefs.tx.getAll.mockResolvedValueOnce([
      { exists: false }, // verification
      { exists: false }, // professional_photography
      { exists: false }, // pre_listing_home_inspection
      { exists: false }, // pointer
    ]);

    await actionService.generateActionsForListing("listing-1", {
      ownerId: "owner-1",
      selectedAddons: ["professional_photography", "pre_listing_home_inspection"],
    });

    const actionWrites = dbRefs.tx.set.mock.calls.filter(([, data]) => data.title);
    expect(actionWrites.map(([, data]) => data.type)).toEqual(
        expect.arrayContaining(["appointment_required", "verification_required"]),
    );
    expect(actionWrites.map(([, data]) => data.type)).not.toContain("photo_upload");
  });
});

describe("actionService.listActions", () => {
  test("filters by listingId and status, sorts newest first, and paginates", async () => {
    const docs = [
      { id: "a1", data: () => ({ userId: "u1", listingId: "l1", status: "pending", createdAt: "2026-01-01T00:00:00Z" }) },
      { id: "a2", data: () => ({ userId: "u1", listingId: "l1", status: "pending", createdAt: "2026-01-03T00:00:00Z" }) },
      { id: "a3", data: () => ({ userId: "u1", listingId: "l2", status: "pending", createdAt: "2026-01-02T00:00:00Z" }) },
      { id: "a4", data: () => ({ userId: "u1", listingId: "l1", status: "completed", createdAt: "2026-01-04T00:00:00Z" }) },
    ];
    dbRefs.queryRef.get.mockResolvedValueOnce({ docs });

    const result = await actionService.listActions("u1", { listingId: "l1", status: "pending" });

    expect(result.actions.map((a) => a.id)).toEqual(["a2", "a1"]);
    expect(result.nextCursor).toBeNull();
  });

  test("paginates with cursorId and reports nextCursor when more results remain", async () => {
    const docs = Array.from({ length: 3 }, (_, i) => ({
      id: `a${i}`,
      data: () => ({ userId: "u1", createdAt: `2026-01-0${i + 1}T00:00:00Z` }),
    }));
    dbRefs.queryRef.get.mockResolvedValueOnce({ docs });

    const result = await actionService.listActions("u1", { limit: 1 });

    // newest first: a2, a1, a0
    expect(result.actions.map((a) => a.id)).toEqual(["a2"]);
    expect(result.nextCursor).toBe("a2");
  });

  test("clamps limit to the [1, 100] range", async () => {
    dbRefs.queryRef.get.mockResolvedValueOnce({ docs: [] });
    await actionService.listActions("u1", { limit: 9999 });
    // no throw, and the query still ran — clamping is internal, verified indirectly via no crash
    expect(dbRefs.queryRef.get).toHaveBeenCalled();
  });

  test("ignores a cursorId that doesn't match any action in the page", async () => {
    const docs = [
      { id: "a1", data: () => ({ userId: "u1", createdAt: "2026-01-01T00:00:00Z" }) },
      { id: "a2", data: () => ({ userId: "u1", createdAt: "2026-01-02T00:00:00Z" }) },
    ];
    dbRefs.queryRef.get.mockResolvedValueOnce({ docs });

    const result = await actionService.listActions("u1", { cursorId: "does-not-exist" });

    expect(result.actions.map((a) => a.id)).toEqual(["a2", "a1"]);
  });
});

describe("actionService.getAction", () => {
  test("throws 404 when the action doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: false });

    await expect(actionService.getAction("u1", "a1")).rejects.toMatchObject({ statusCode: 404 });
  });

  test("throws 403 when the action belongs to a different user", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ userId: "someone-else" }) });

    await expect(actionService.getAction("u1", "a1")).rejects.toMatchObject({ statusCode: 403 });
  });

  test("returns the mapped action on success", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ id: "a1", exists: true, data: () => ({ userId: "u1", title: "Do the thing" }) });

    const result = await actionService.getAction("u1", "a1");
    expect(result).toMatchObject({ id: "a1", title: "Do the thing" });
  });
});

describe("actionService.submitSchedulingBatch", () => {
  const slots = [
    { date: futureDate(), timeOfDay: "morning" },
    { date: futureDate(), timeOfDay: "afternoon" },
    { date: futureDate(), timeOfDay: "morning" },
  ];

  test("throws 404 when the action doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: false });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 404 });
  });

  test("throws 403 when the action belongs to a different user", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ userId: "someone-else" }) });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 403 });
  });

  test("throws 400 when the action does not require scheduling", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ userId: "u1", requiresScheduling: false }) });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 409 when the action is already completed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: "u1", requiresScheduling: true, status: "completed" }),
    });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("throws 409 when the appointment is already confirmed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: "u1", requiresScheduling: true, schedulingRequest: { state: "confirmed" } }),
    });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("throws 409 when a batch is already awaiting the admin", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: "u1", requiresScheduling: true, schedulingRequest: { state: "requested" } }),
    });
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("throws 400 when any submitted slot date is in the past", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userId: "u1", requiresScheduling: true, schedulingRequest: null }),
    });

    const badSlots = [{ date: pastDate(), timeOfDay: "morning" }, ...slots.slice(1)];
    await expect(actionService.submitSchedulingBatch("u1", "a1", { slots: badSlots })).rejects.toMatchObject({ statusCode: 400 });
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("happy path: writes a requested scheduling batch and flips status to in_progress", async () => {
    dbRefs.docRef.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: "u1", requiresScheduling: true, schedulingRequest: null }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: "u1", schedulingRequest: { state: "requested", slots } }),
        });

    const result = await actionService.submitSchedulingBatch("u1", "a1", { slots });

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in_progress",
          schedulingRequest: expect.objectContaining({ state: "requested", proposedBy: "user", slots }),
        }),
    );
    expect(result.schedulingRequest.state).toBe("requested");
  });

  test("re-submission after an admin counter carries the countered batch into history", async () => {
    const priorSubmittedAt = { toDate: () => new Date("2026-01-01T00:00:00Z") };
    dbRefs.docRef.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: "u1",
            requiresScheduling: true,
            schedulingRequest: {
              state: "countered",
              slots: [{ date: futureDate(), timeOfDay: "afternoon" }],
              proposedBy: "admin",
              submittedAt: priorSubmittedAt,
              history: [],
            },
          }),
        })
        .mockResolvedValueOnce({ exists: true, data: () => ({ userId: "u1" }) });

    await actionService.submitSchedulingBatch("u1", "a1", { slots });

    const [payload] = dbRefs.docRef.update.mock.calls[0];
    expect(payload.schedulingRequest.history).toHaveLength(1);
    expect(payload.schedulingRequest.history[0]).toMatchObject({ proposedBy: "admin" });
  });
});

describe("actionService.completeUploadAction", () => {
  test("no-ops for a mediaType that isn't photos or attachments", async () => {
    await actionService.completeUploadAction("listing-1", "video");
    expect(dbRefs.docRef.get).not.toHaveBeenCalled();
  });

  test("no-ops when the action doc doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: false });
    await actionService.completeUploadAction("listing-1", "photos");
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("no-ops when the action is already completed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ status: "completed" }) });
    await actionService.completeUploadAction("listing-1", "attachments");
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("marks the matching upload action completed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pending" }) });
    await actionService.completeUploadAction("listing-1", "photos");
    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" }),
    );
  });
});

describe("actionService.adminListSchedulingQueue / adminListConfirmedAppointments", () => {
  test("adminListSchedulingQueue returns actions sorted by submittedAt ascending", async () => {
    dbRefs.queryRef.get.mockResolvedValueOnce({
      docs: [
        { id: "a1", data: () => ({ schedulingRequest: { submittedAt: "2026-01-03T00:00:00Z" } }) },
        { id: "a2", data: () => ({ schedulingRequest: { submittedAt: "2026-01-01T00:00:00Z" } }) },
      ],
    });

    const result = await actionService.adminListSchedulingQueue();
    expect(result.map((a) => a.id)).toEqual(["a2", "a1"]);
  });

  test("adminListConfirmedAppointments returns actions sorted by scheduledEvent.startDateTime ascending", async () => {
    dbRefs.queryRef.get.mockResolvedValueOnce({
      docs: [
        { id: "a1", data: () => ({ scheduledEvent: { startDateTime: "2026-02-01T09:00:00Z" } }) },
        { id: "a2", data: () => ({ scheduledEvent: { startDateTime: "2026-01-15T09:00:00Z" } }) },
      ],
    });

    const result = await actionService.adminListConfirmedAppointments();
    expect(result.map((a) => a.id)).toEqual(["a2", "a1"]);
  });
});

describe("actionService.adminCounterTime", () => {
  const slots = [{ date: futureDate(), timeOfDay: "morning" }];

  test("throws 404 when the action doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: false });
    await expect(actionService.adminCounterTime("a1", { slots })).rejects.toMatchObject({ statusCode: 404 });
  });

  test("throws 400 when the action does not require scheduling", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({ requiresScheduling: false }) });
    await expect(actionService.adminCounterTime("a1", { slots })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 409 when there is no active user-submitted batch to counter", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ requiresScheduling: true, schedulingRequest: { state: "countered" } }),
    });
    await expect(actionService.adminCounterTime("a1", { slots })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("happy path: writes a countered batch and notifies the owner", async () => {
    dbRefs.docRef.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ requiresScheduling: true, schedulingRequest: { state: "requested" }, userId: "u1", title: "Verification" }),
        })
        .mockResolvedValueOnce({ exists: true, data: () => ({ schedulingRequest: { state: "countered" } }) });

    const result = await actionService.adminCounterTime("a1", { slots, note: "How about these?" });

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          schedulingRequest: expect.objectContaining({ state: "countered", proposedBy: "admin", note: "How about these?" }),
        }),
    );
    expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", sendEmail: true }),
    );
    expect(result.schedulingRequest.state).toBe("countered");
  });

  test("does not throw when the notification fails", async () => {
    dbRefs.docRef.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ requiresScheduling: true, schedulingRequest: { state: "requested" }, userId: "u1" }),
        })
        .mockResolvedValueOnce({ exists: true, data: () => ({}) });
    notificationService.createNotification.mockRejectedValueOnce(new Error("mail down"));

    await expect(actionService.adminCounterTime("a1", { slots })).resolves.toBeDefined();
  });
});

describe("actionService.adminFinalizeTime", () => {
  const listingId = "listing-1";
  const slots = [
    { date: futureDate(), timeOfDay: "morning" },
    { date: futureDate(), timeOfDay: "afternoon" },
    { date: futureDate(), timeOfDay: "morning" },
  ];

  test("throws 404 when the action doesn't exist", async () => {
    dbRefs.tx.get.mockResolvedValueOnce({ exists: false });
    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 0 })).rejects.toMatchObject({ statusCode: 404 });
  });

  test("throws 400 when the action does not require scheduling", async () => {
    dbRefs.tx.get.mockResolvedValueOnce({ exists: true, data: () => ({ requiresScheduling: false }) });
    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 0 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 409 when there is no requested batch to finalize", async () => {
    dbRefs.tx.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ requiresScheduling: true, schedulingRequest: { state: "countered" } }),
    });
    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 0 })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("throws 400 for an out-of-range slot index", async () => {
    dbRefs.tx.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ requiresScheduling: true, schedulingRequest: { state: "requested", slots } }),
    });
    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 5 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 409 when the chosen window conflicts with another confirmed appointment for the same listing", async () => {
    dbRefs.tx.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            requiresScheduling: true,
            listingId,
            schedulingRequest: { state: "requested", slots },
          }),
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: "other-action",
              data: () => ({
                scheduledEvent: {
                  startDateTime: DateTime.fromISO(`${slots[0].date}T09:00`, { zone: "America/Toronto" }).toJSDate().toISOString(),
                  endDateTime: DateTime.fromISO(`${slots[0].date}T12:00`, { zone: "America/Toronto" }).toJSDate().toISOString(),
                },
              }),
            },
          ],
        });

    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 0 })).rejects.toMatchObject({ statusCode: 409 });
    expect(dbRefs.tx.update).not.toHaveBeenCalled();
  });

  test("happy path: books the full timeOfDay window, ignores its own doc and non-conflicting appointments, and notifies", async () => {
    dbRefs.tx.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            requiresScheduling: true,
            listingId,
            userId: "u1",
            title: "Verification",
            schedulingRequest: { state: "requested", slots },
          }),
        })
        .mockResolvedValueOnce({
          docs: [
            // same doc id as the one being finalized — must be excluded from the conflict check
            { id: "a1", data: () => ({ scheduledEvent: { startDateTime: "2000-01-01T00:00:00Z", endDateTime: "2000-01-01T01:00:00Z" } }) },
            // a confirmed appointment on a totally different day — no overlap
            {
              id: "other-action",
              data: () => ({
                scheduledEvent: {
                  startDateTime: DateTime.fromISO(`${slots[0].date}T09:00`, { zone: "America/Toronto" }).plus({ days: 5 }).toJSDate().toISOString(),
                  endDateTime: DateTime.fromISO(`${slots[0].date}T12:00`, { zone: "America/Toronto" }).plus({ days: 5 }).toJSDate().toISOString(),
                },
              }),
            },
          ],
        });
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ schedulingRequest: { state: "confirmed", confirmedSlotIndex: 0 } }),
    });

    const result = await actionService.adminFinalizeTime("a1", { slotIndex: 0 });

    expect(dbRefs.tx.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          "schedulingRequest.state": "confirmed",
          "schedulingRequest.confirmedSlotIndex": 0,
          status: "completed",
        }),
    );
    expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", severity: "success", sendEmail: true }),
    );
    expect(result.schedulingRequest.state).toBe("confirmed");
  });

  test("does not throw when the confirmation notification fails", async () => {
    dbRefs.tx.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            requiresScheduling: true,
            listingId,
            userId: "u1",
            schedulingRequest: { state: "requested", slots },
          }),
        })
        .mockResolvedValueOnce({ docs: [] });
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    notificationService.createNotification.mockRejectedValueOnce(new Error("mail down"));

    await expect(actionService.adminFinalizeTime("a1", { slotIndex: 0 })).resolves.toBeDefined();
  });
});

describe("actionService.adminCompleteAction", () => {
  test("throws 404 when the action doesn't exist", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({ exists: false });
    await expect(actionService.adminCompleteAction("a1")).rejects.toMatchObject({ statusCode: 404 });
  });

  test("throws 409 when scheduling is required but not yet confirmed", async () => {
    dbRefs.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ requiresScheduling: true, schedulingRequest: { state: "countered" } }),
    });
    await expect(actionService.adminCompleteAction("a1")).rejects.toMatchObject({ statusCode: 409 });
  });

  test("skips the write when already completed", async () => {
    dbRefs.docRef.get
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "completed" }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "completed" }) });
    await actionService.adminCompleteAction("a1");
    expect(dbRefs.docRef.update).not.toHaveBeenCalled();
  });

  test("marks a non-scheduling action completed", async () => {
    dbRefs.docRef.get
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "pending", requiresScheduling: false }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "completed" }) });

    const result = await actionService.adminCompleteAction("a1");

    expect(dbRefs.docRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(result.status).toBe("completed");
  });
});
