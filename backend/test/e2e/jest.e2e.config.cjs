module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../..",
  testMatch: ["<rootDir>/test/e2e/**/*.spec.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/e2e/jest.setup.ts"],
  globalSetup: "<rootDir>/test/e2e/global-setup.cjs",
  globalTeardown: "<rootDir>/test/e2e/global-teardown.cjs",
  testTimeout: 120000,
  forceExit: true,
  clearMocks: true,
  moduleFileExtensions: ["ts", "js", "json"],
};
