const path = require("path");
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  setupFilesAfterEnv: [
    "jest-expect-message",
    path.join(__dirname, "src/polyfills.cjs"),
  ],
  testPathIgnorePatterns: ["data", "utils"],
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./test/tsconfig.json",
      },
    ],
  },
};
