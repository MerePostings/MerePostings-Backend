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
    // Google's 80-char limit doesn't match this codebase's actual style
    // (pre-existing lines run up to 344 chars) — off rather than picking an
    // arbitrary number that still needs periodic manual wrapping.
    "max-len": "off",
    // Mandatory @param/@return JSDoc on every function conflicts with this
    // project's documented convention of writing no comments unless the WHY
    // is non-obvious (see CLAUDE.md).
    "valid-jsdoc": "off",
    "require-jsdoc": "off",
    // eslint-config-google's new-cap assumes any capitalized call is a
    // constructor; express.Router() is capitalized by Express convention but
    // is a factory, not a constructor — this is standard idiomatic Express.
    "new-cap": ["error", {"capIsNew": false}],
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
