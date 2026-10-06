const {listNotificationsQuerySchema, preferencesPatchSchema} = require("../schemas");

describe("listNotificationsQuerySchema", () => {
  test("accepts an empty query", () => {
    expect(listNotificationsQuerySchema.safeParse({}).success).toBe(true);
  });

  test("coerces a query-string limit into a number (Express always sends strings)", () => {
    const result = listNotificationsQuerySchema.safeParse({limit: "50"});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(50);
  });

  test("rejects a limit above 100", () => {
    expect(listNotificationsQuerySchema.safeParse({limit: "101"}).success).toBe(false);
  });

  test("rejects a limit below 1", () => {
    expect(listNotificationsQuerySchema.safeParse({limit: "0"}).success).toBe(false);
  });

  test("accepts a cursorId string", () => {
    expect(listNotificationsQuerySchema.safeParse({cursorId: "abc123"}).success).toBe(true);
  });

  test("rejects an empty string cursorId", () => {
    expect(listNotificationsQuerySchema.safeParse({cursorId: ""}).success).toBe(false);
  });
});

describe("preferencesPatchSchema", () => {
  test("accepts a single known preference", () => {
    expect(preferencesPatchSchema.safeParse({status_change: false}).success).toBe(true);
  });

  test("accepts multiple known preferences", () => {
    expect(preferencesPatchSchema.safeParse({status_change: false, message: true}).success).toBe(true);
  });

  test("rejects an empty object (at least one preference required)", () => {
    expect(preferencesPatchSchema.safeParse({}).success).toBe(false);
  });

  test("rejects an object containing only unknown keys", () => {
    expect(preferencesPatchSchema.safeParse({not_a_real_type: true}).success).toBe(false);
  });

  test("rejects a non-boolean value for a known type", () => {
    expect(preferencesPatchSchema.safeParse({status_change: "yes"}).success).toBe(false);
  });
});
