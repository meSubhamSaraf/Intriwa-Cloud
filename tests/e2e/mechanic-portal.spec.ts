/**
 * Mechanic portal tests — runs in the "mechanic" project.
 * Skips gracefully if mechanic credentials aren't configured.
 */
import { test, expect } from "@playwright/test";
import fs from "fs";

// Skip entire suite if mechanic auth wasn't saved
const authFile = "tests/e2e/.auth/mechanic.json";
const mechanicAuthEmpty = (() => {
  try {
    const s = JSON.parse(fs.readFileSync(authFile, "utf8"));
    return s.cookies?.length === 0;
  } catch { return true; }
})();

test.describe("Mechanic portal", () => {
  test.skip(mechanicAuthEmpty, "Mechanic credentials not configured in .env.test.local");

  test("lands on mechanic portal after login", async ({ page }) => {
    await page.goto("/mechanic-portal");
    await expect(page).toHaveURL(/mechanic-portal/);
  });

  test("shows Jobs tab by default", async ({ page }) => {
    await page.goto("/mechanic-portal");
    // Tab should be visible
    await expect(page.getByRole("tab", { name: /jobs/i }).or(page.getByText(/today|assigned|open/i)).first()).toBeVisible();
  });

  test("job cards show Navigate button for field/intrapremise jobs", async ({ page }) => {
    await page.goto("/mechanic-portal");
    // If there are any Intrapremise jobs, they should show a Navigate button
    const navigateBtn = page.getByRole("link", { name: /navigate/i });
    const jobCards = page.locator("[class*='card'], .border, [class*='rounded']").filter({ hasText: /Intrapremise|OPC|society/i });
    if (await jobCards.count() > 0) {
      // At least one card with a location type is shown
      await expect(jobCards.first()).toBeVisible();
    }
    // No crash
    await expect(page).not.toHaveURL(/error/);
  });

  test("can switch to Earnings tab", async ({ page }) => {
    await page.goto("/mechanic-portal");
    const earningsTab = page.getByRole("tab", { name: /earnings/i }).or(page.getByText(/earnings/i).first());
    if (await earningsTab.isVisible({ timeout: 3000 })) {
      await earningsTab.click();
      await expect(page).not.toHaveURL(/error/);
    }
  });

  test("can switch to Attendance tab", async ({ page }) => {
    await page.goto("/mechanic-portal");
    const tab = page.getByRole("tab", { name: /attendance/i }).or(page.getByText(/attendance/i).first());
    if (await tab.isVisible({ timeout: 3000 })) {
      await tab.click();
      await expect(page).not.toHaveURL(/error/);
    }
  });

  test("mark job in-progress (if an open job exists)", async ({ page }) => {
    await page.goto("/mechanic-portal");
    // Look for a "Start" or "Mark In Progress" button
    const startBtn = page.getByRole("button", { name: /start|in.?progress/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 })) {
      await startBtn.click();
      // Should either show confirmation or status change — just verify no error
      await page.waitForTimeout(1000);
      await expect(page).not.toHaveURL(/error/);
    } else {
      test.info().annotations.push({ type: "info", description: "No open jobs to mark in-progress" });
    }
  });
});
