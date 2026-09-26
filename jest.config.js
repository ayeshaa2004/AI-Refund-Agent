/* eslint-disable @typescript-eslint/no-require-imports */

const nextJest = require("next/jest");

// Point next/jest at the app root so it can load next.config.js / .env
// files and reuse the same SWC transform + tsconfig path aliases (@/...)
// that the app itself uses, instead of us re-declaring them by hand.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

module.exports = createJestConfig(customJestConfig);
