jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TS"),
    delete: jest.fn(() => "DELETE"),
  },
}));

const {
  assembleProcessState,
  normalizeIncomingState,
  buildProcessPropertyUpdate,
  PROCESS_FIELD_KEYS,
} = require("../listingProcessState");

describe("assembleProcessState", () => {
  test("reads flat process fields from the property root", () => {
    const prop = {
      occupancy: "owner",
      propertyType: "detached",
      askingPrice: 500000,
      sellerContact: {fullName: "Ada"},
      furthestMajorIndex: 3,
      status: "draft",
    };
    expect(assembleProcessState(prop)).toEqual({
      occupancy: "owner",
      propertyType: "detached",
      askingPrice: 500000,
      sellerContact: {fullName: "Ada"},
      furthestMajorIndex: 3,
    });
  });

  test("unwraps step-grouped property docs", () => {
    const prop = {
      sellingStyle: {supportTier: "basic", walkthroughAnswers: {situation: "relocating"}},
      basicDetail: {occupancy: "vacant"},
    };
    expect(assembleProcessState(prop)).toEqual({
      supportTier: "basic",
      walkthroughAnswers: {situation: "relocating"},
      occupancy: "vacant",
      sellerContact: {},
      ownership: {},
      mailingAddress: {},
    });
  });

  test("returns empty object when no process fields exist", () => {
    expect(assembleProcessState({status: "draft", Location: {}})).toEqual({});
  });
});

describe("normalizeIncomingState", () => {
  test("keeps only known process keys from flat patches", () => {
    expect(
        normalizeIncomingState({
          occupancy: "tenant",
          Location: {streetName: "Main"},
          junk: true,
        }),
    ).toEqual({occupancy: "tenant"});
  });
});

describe("buildProcessPropertyUpdate", () => {
  test("deep-merges nested process fields onto properties update", () => {
    const prop = {
      status: "draft",
      occupancy: "owner",
      sellerContact: {fullName: "Ada", email: "ada@example.com"},
    };
    const {nextState, nextStatus, update} = buildProcessPropertyUpdate(prop, {
      sellerContact: {phone: "555"},
      propertyType: "detached",
    });

    expect(nextStatus).toBe("draft");
    expect(nextState.sellerContact).toEqual({
      fullName: "Ada",
      email: "ada@example.com",
      phone: "555",
    });
    expect(nextState.propertyType).toBe("detached");
    expect(update.occupancy).toBe("owner");
    expect(update.sellerContact).toEqual(nextState.sellerContact);
    expect(update.propertyType).toBe("detached");
    expect(update.status).toBe("draft");
    expect(update.flowState).toBe("DELETE");
    for (const k of ["getStarted", "sellingStyle", "basicDetail"]) {
      expect(update[k]).toBe("DELETE");
    }
  });

  test("flips initiated to draft", () => {
    const {nextStatus, update} = buildProcessPropertyUpdate(
        {status: "initiated"},
        {occupancy: "vacant"},
    );
    expect(nextStatus).toBe("draft");
    expect(update.status).toBe("draft");
  });

  test("preserves submitted status (admin may edit submitted)", () => {
    const {nextStatus, update} = buildProcessPropertyUpdate(
        {status: "submitted", occupancy: "owner"},
        {askingPrice: 1},
    );
    expect(nextStatus).toBe("submitted");
    expect(update.status).toBe("submitted");
    expect(update.askingPrice).toBe(1);
  });
});

describe("PROCESS_FIELD_KEYS", () => {
  test("does not include MLS section keys", () => {
    expect(PROCESS_FIELD_KEYS).not.toContain("Location");
    expect(PROCESS_FIELD_KEYS).not.toContain("Interior");
  });
});
