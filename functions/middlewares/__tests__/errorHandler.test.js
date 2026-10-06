const handleError = require("../errorHandler");
const AppError = require("../../utils/AppError");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("errorHandler (non-development)", () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = "production";
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("returns an operational error's message and details", () => {
    const res = mockRes();
    handleError(new AppError("Missing fields", 422, {missingFields: [{field: "unitCount"}]}), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({message: "Missing fields", details: {missingFields: [{field: "unitCount"}]}});
  });

  test("returns only the message when an operational error has no details", () => {
    const res = mockRes();
    handleError(new AppError("Listing not found", 404), {}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({message: "Listing not found"});
  });

  test("hides non-operational errors behind a generic 500", () => {
    const res = mockRes();
    handleError(new Error("db exploded"), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({message: "Something went wrong! Please try again later."});
  });
});

describe("errorHandler (development)", () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = "development";
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("keeps `details` at the top level, as in production", () => {
    const res = mockRes();
    handleError(new AppError("Missing fields", 422, {missingFields: [{field: "unitCount"}]}), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "Missing fields",
      details: {missingFields: [{field: "unitCount"}]},
      stackTrace: expect.any(String),
    }));
  });
});
