const AppError = require("../AppError");

describe("AppError", () => {
  test("sets message, statusCode, and isOperational", () => {
    const err = new AppError("Listing not found", 404);

    expect(err.message).toBe("Listing not found");
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  test("is an instance of Error", () => {
    const err = new AppError("Something went wrong", 500);

    expect(err).toBeInstanceOf(Error);
    expect(err.stack).toBeDefined();
  });
});
