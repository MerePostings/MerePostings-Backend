const {
  listActionsQuerySchema,
  schedulingBatchSchema,
  adminCounterTimeSchema,
  adminFinalizeTimeSchema,
} = require("../schemas");

const threeSlots = [
  {date: "2027-01-05", timeOfDay: "morning"},
  {date: "2027-01-06", timeOfDay: "afternoon"},
  {date: "2027-01-07", timeOfDay: "morning"},
];

describe("listActionsQuerySchema", () => {
  test("accepts an empty query", () => {
    expect(listActionsQuerySchema.safeParse({}).success).toBe(true);
  });

  test("coerces a query-string limit into a number", () => {
    const result = listActionsQuerySchema.safeParse({limit: "25"});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(25);
  });

  test("rejects an unknown status", () => {
    expect(listActionsQuerySchema.safeParse({status: "bogus"}).success).toBe(false);
  });

  test("accepts a known status", () => {
    expect(listActionsQuerySchema.safeParse({status: "pending"}).success).toBe(true);
  });
});

describe("schedulingBatchSchema", () => {
  test("accepts exactly 3 unique slots", () => {
    expect(schedulingBatchSchema.safeParse({slots: threeSlots}).success).toBe(true);
  });

  test("rejects fewer than 3 slots", () => {
    expect(schedulingBatchSchema.safeParse({slots: threeSlots.slice(0, 2)}).success).toBe(false);
  });

  test("rejects more than 3 slots", () => {
    expect(schedulingBatchSchema.safeParse({
      slots: [...threeSlots, {date: "2027-01-08", timeOfDay: "morning"}],
    }).success).toBe(false);
  });

  test("rejects duplicate date+timeOfDay slots", () => {
    expect(schedulingBatchSchema.safeParse({
      slots: [threeSlots[0], threeSlots[0], threeSlots[1]],
    }).success).toBe(false);
  });

  test("rejects a malformed date", () => {
    expect(schedulingBatchSchema.safeParse({
      slots: [{date: "Jan 5", timeOfDay: "morning"}, threeSlots[1], threeSlots[2]],
    }).success).toBe(false);
  });

  test("rejects an unknown timeOfDay", () => {
    expect(schedulingBatchSchema.safeParse({
      slots: [{date: "2027-01-05", timeOfDay: "evening"}, threeSlots[1], threeSlots[2]],
    }).success).toBe(false);
  });
});

describe("adminCounterTimeSchema", () => {
  test("accepts slots with an optional note", () => {
    expect(adminCounterTimeSchema.safeParse({slots: threeSlots, note: "please pick one"}).success).toBe(true);
  });

  test("accepts slots without a note", () => {
    expect(adminCounterTimeSchema.safeParse({slots: threeSlots}).success).toBe(true);
  });

  test("accepts a null note", () => {
    expect(adminCounterTimeSchema.safeParse({slots: threeSlots, note: null}).success).toBe(true);
  });
});

describe("adminFinalizeTimeSchema", () => {
  test.each([0, 1, 2])("accepts slotIndex %d", (slotIndex) => {
    expect(adminFinalizeTimeSchema.safeParse({slotIndex}).success).toBe(true);
  });

  test("rejects slotIndex 3", () => {
    expect(adminFinalizeTimeSchema.safeParse({slotIndex: 3}).success).toBe(false);
  });

  test("rejects a missing slotIndex", () => {
    expect(adminFinalizeTimeSchema.safeParse({}).success).toBe(false);
  });
});
