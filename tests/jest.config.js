const path = require("path");

// Launched from the repo root (see package.json) so coverage maps onto the app's files.
module.exports = {
  rootDir: path.resolve(__dirname, ".."),
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  modulePathIgnorePatterns: ["<rootDir>/tests/node_modules"],
  testEnvironment: "node",
  globalSetup: "<rootDir>/tests/support/globalSetup.js",
  globalTeardown: "<rootDir>/tests/support/globalTeardown.js",
  setupFiles: ["<rootDir>/tests/support/env.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/support/show-bugs.js"],
  testTimeout: 30000,
  // index.js names variables `public` and `private`, which Node allows in sloppy mode but Babel
  // rejects; run the files untransformed and measure coverage with V8 instead.
  transform: {},
  coverageProvider: "v8",
  collectCoverageFrom: ["index.js", "config/**/*.js", "controllers/**/*.js", "middleware/**/*.js", "model/**/*.js", "routes/**/*.js"],
  coverageDirectory: "<rootDir>/tests/coverage",
  coverageThreshold: { global: { statements: 90, branches: 80, functions: 90, lines: 90 } },
};
