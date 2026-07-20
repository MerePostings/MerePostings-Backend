module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    // Bumped from 2018: fieldRegistry.js already uses numeric separators
    // (e.g. 1_000_000_000_000), which is ES2021 syntax — under 2018 that line
    // fails to parse at all, so lint has never actually been able to
    // completely check that file.
    "ecmaVersion": 2021,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
    {
      files: ["**/__tests__/**/*.test.js", "**/__mocks__/**/*.js", "jest.setup.js"],
      env: {
        jest: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
