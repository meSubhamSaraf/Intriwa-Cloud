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

async function loginWithEmail(page: any, email: string, password: string) {
  await page.goto("/");
  // Click the "Login" tab (email/password tab) — default is Phone OTP
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

setup("authenticate manager", async ({ page }) => {
  await loginWithEmail(page, MANAGER_EMAIL, MANAGER_PASSWORD);
  await page.waitForURL(/\/(dashboard|services|customers|mechanic-portal)/, { timeout: 20_000 });
  await page.context().storageState({ path: "tests/e2e/.auth/manager.json" });
});

setup("authenticate mechanic", async ({ page }) => {
  if (!MECHANIC_EMAIL || !MECHANIC_PASSWORD) {
    console.warn("⚠️  TEST_MECHANIC_EMAIL / TEST_MECHANIC_PASSWORD not set — skipping mechanic auth");
    fs.writeFileSync("tests/e2e/.auth/mechanic.json", JSON.stringify({ cookies: [], origins: [] }));
    return;
  }
  await loginWithEmail(page, MECHANIC_EMAIL, MECHANIC_PASSWORD);
  await page.waitForURL(/mechanic-portal/, { timeout: 20_000 });
  await page.context().storageState({ path: "tests/e2e/.auth/mechanic.json" });
});
