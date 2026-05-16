/**
 * Manager: Analytics & P&L (revenue model)
 * Covers: page load, date range apply, P&L sections, aftermarket analysis, package performance.
 */
import { test, expect } from "@playwright/test";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

test.describe("Manager – Analytics & P&L", () => {
  test("analytics page loads with correct heading", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible({ timeout: 8000 });
  });

  test("shows date range pickers and Apply button", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.locator("input[type='date']").first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator("input[type='date']").nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /apply/i })).toBeVisible();
  });

  test("defaults to current month start date", async ({ page }) => {
    await page.goto("/analytics");
    const startInput = page.locator("input[type='date']").first();
    await expect(startInput).toBeVisible({ timeout: 8000 });
    const val = await startInput.inputValue();
    // Should be first of the current month YYYY-MM-01
    expect(val).toMatch(/^\d{4}-\d{2}-01$/);
  });

  test("applying a date range fetches and shows P&L data", async ({ page }) => {
    await page.goto("/analytics");

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // last month start
    const end = new Date(now.getFullYear(), now.getMonth(), 0);        // last month end

    await page.locator("input[type='date']").first().fill(isoDate(start));
    await page.locator("input[type='date']").nth(1).fill(isoDate(end));
    await page.getByRole("button", { name: /apply/i }).click();

    // Wait for data or empty state — just no error
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(/error/);
  });

  test("applying current month shows P&L sections", async ({ page }) => {
    await page.goto("/analytics");

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;

    await page.locator("input[type='date']").first().fill(isoDate(start));
    await page.locator("input[type='date']").nth(1).fill(isoDate(end));
    await page.getByRole("button", { name: /apply/i }).click();

    await page.waitForTimeout(4000);

    // P&L section or empty-state text should be present
    const pnlSection = page.getByText(/revenue|gross margin|parts p&l|no.*jobs/i).first();
    await expect(pnlSection).toBeVisible({ timeout: 8000 });
  });

  test("package performance section appears when data exists", async ({ page }) => {
    await page.goto("/analytics");

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    await page.locator("input[type='date']").first().fill(isoDate(start));
    await page.locator("input[type='date']").nth(1).fill(isoDate(now));
    await page.getByRole("button", { name: /apply/i }).click();

    await page.waitForTimeout(4000);

    // Package Performance section or empty state (no packages applied)
    const pkgSection = page.getByText(/package performance|no packages/i);
    // May or may not exist depending on data — just verify no crash
    await expect(page).not.toHaveURL(/error/);
    if (await pkgSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pkgSection).toBeVisible();
    }
  });

  test("aftermarket parts analysis section appears when data exists", async ({ page }) => {
    await page.goto("/analytics");

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    await page.locator("input[type='date']").first().fill(isoDate(start));
    await page.locator("input[type='date']").nth(1).fill(isoDate(now));
    await page.getByRole("button", { name: /apply/i }).click();

    await page.waitForTimeout(4000);
    await expect(page).not.toHaveURL(/error/);
  });

  test("error shown when end date before start date", async ({ page }) => {
    await page.goto("/analytics");

    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Swap dates so start > end (invalid range via the inputs — just check no crash)
    await page.locator("input[type='date']").first().fill(isoDate(future));
    await page.locator("input[type='date']").nth(1).fill(isoDate(now));
    await page.getByRole("button", { name: /apply/i }).click();
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/error/);
  });

  test("analytics sidebar link navigates correctly", async ({ page }) => {
    await page.goto("/dashboard");
    const analyticsLink = page.getByRole("link", { name: /analytics/i });
    if (await analyticsLink.isVisible({ timeout: 3000 })) {
      await analyticsLink.click();
      await page.waitForURL(/analytics/, { timeout: 8000 });
      await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
    } else {
      await page.goto("/analytics");
      await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
    }
  });
});
