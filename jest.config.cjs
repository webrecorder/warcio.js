const path = require("path");
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: [
    "jest-expect-message",
    path.join(__dirname, "src/polyfills.cjs"),
  ],
};
