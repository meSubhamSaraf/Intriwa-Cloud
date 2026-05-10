import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // run sequentially to avoid DB race conditions
  retries: 1,
  timeout: 30_000,
  reporter: "html",

  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Auth setup runs once to save session files
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    {
      name: "manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/manager.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mechanic",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/mechanic.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-manager",
      use: {
        ...devices["iPhone 14"],
        storageState: "tests/e2e/.auth/manager.json",
      },
      dependencies: ["setup"],
    },
  ],
});
