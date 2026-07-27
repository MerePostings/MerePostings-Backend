module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  // Without this, coverage only reflects files a test happens to require —
  // untested controllers/services silently vanish from the report instead
  // of showing up as 0%.
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "middlewares/**/*.js",
    "routes/**/*.js",
    "utils/**/*.js",
    "validators/**/*.js",
    "!**/__tests__/**",
    "!**/__mocks__/**",
  ],
};
