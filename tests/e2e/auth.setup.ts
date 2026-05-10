import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";

// Load .env.test.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });

const MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL!;
const MANAGER_PASSWORD = process.env.TEST_MANAGER_PASSWORD!;
const MECHANIC_EMAIL = process.env.TEST_MECHANIC_EMAIL;
const MECHANIC_PASSWORD = process.env.TEST_MECHANIC_PASSWORD;

setup("authenticate manager", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(MANAGER_EMAIL);
  await page.getByPlaceholder(/password/i).fill(MANAGER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|services|customers)/, { timeout: 15_000 });
  await page.context().storageState({ path: "tests/e2e/.auth/manager.json" });
});

setup("authenticate mechanic", async ({ page }) => {
  if (!MECHANIC_EMAIL || !MECHANIC_PASSWORD) {
    console.warn("⚠️  TEST_MECHANIC_EMAIL / TEST_MECHANIC_PASSWORD not set — skipping mechanic auth");
    // Write an empty storage state so dependent tests don't crash
    fs.writeFileSync("tests/e2e/.auth/mechanic.json", JSON.stringify({ cookies: [], origins: [] }));
    return;
  }
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(MECHANIC_EMAIL);
  await page.getByPlaceholder(/password/i).fill(MECHANIC_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/mechanic-portal/, { timeout: 15_000 });
  await page.context().storageState({ path: "tests/e2e/.auth/mechanic.json" });
});
