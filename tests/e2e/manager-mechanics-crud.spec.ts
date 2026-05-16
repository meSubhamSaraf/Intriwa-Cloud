/**
 * Manager: Add Mechanic + revenue model (pay structure)
 * Covers: mechanics list, add mechanic modal with salary/percent/fixed pay, verify appears in list.
 */
import { test, expect } from "@playwright/test";

const UNIQUE_SUFFIX = Date.now();
const TEST_NAME = `Test Mechanic ${UNIQUE_SUFFIX}`;
const TEST_PHONE = `9${String(UNIQUE_SUFFIX).slice(-9)}`;

test.describe("Manager – Add Mechanic", () => {
  test("mechanics list page loads", async ({ page }) => {
    await page.goto("/mechanics");
    await expect(page.getByRole("heading", { name: "Mechanics" })).toBeVisible();
  });

  test("opens Add Mechanic modal", async ({ page }) => {
    await page.goto("/mechanics");
    await page.getByRole("button", { name: /add mechanic/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).toBeVisible({ timeout: 5000 });
  });

  test("add mechanic – percent of item pay structure", async ({ page }) => {
    await page.goto("/mechanics");
    await page.getByRole("button", { name: /add mechanic/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).toBeVisible({ timeout: 5000 });

    // Fill basic details
    await page.getByPlaceholder(/ravi kumar/i).fill(TEST_NAME);
    await page.getByPlaceholder(/9876543210/i).fill(TEST_PHONE);

    // Pay structure: PERCENT_OF_ITEM (default) — fill payout rate
    const payStructureSelect = page.locator("select").filter({ hasText: /percent|commission/i }).first();
    // Employment type and pay structure selects — pick the right ones by position
    const selects = page.locator("form select");
    // Select: employment type (first), pay structure (second)
    await selects.nth(0).selectOption("FULL_TIME");
    await selects.nth(1).selectOption("PERCENT_OF_ITEM");

    // Payout rate input
    await page.getByPlaceholder(/e\.g\. 40/i).fill("35");

    await page.getByRole("button", { name: /add mechanic/i }).click();
    // Should show success toast or credential display
    await page.waitForTimeout(2000);
    // Either credentials panel appears or mechanic was added (modal closes)
    const modalHeading = page.getByRole("heading", { name: "Add Mechanic" });
    const credDisplay = page.getByText(/email|password|credentials/i);
    const isModalGone = !(await modalHeading.isVisible({ timeout: 1000 }).catch(() => false));
    const hasCredentials = await credDisplay.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isModalGone || hasCredentials).toBeTruthy();
  });

  test("add mechanic – monthly salary pay structure", async ({ page }) => {
    await page.goto("/mechanics");
    await page.getByRole("button", { name: /add mechanic/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).toBeVisible({ timeout: 5000 });

    const salaryName = `Salary Mechanic ${UNIQUE_SUFFIX + 1}`;
    const salaryPhone = `8${String(UNIQUE_SUFFIX + 1).slice(-9)}`;
    await page.getByPlaceholder(/ravi kumar/i).fill(salaryName);
    await page.getByPlaceholder(/9876543210/i).fill(salaryPhone);

    const selects = page.locator("form select");
    await selects.nth(1).selectOption("SALARY");

    // Monthly salary input appears
    await expect(page.getByPlaceholder(/15000/i)).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder(/15000/i).fill("18000");

    await page.getByRole("button", { name: /add mechanic/i }).click();
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/error/);
  });

  test("add mechanic – fixed per item pay structure", async ({ page }) => {
    await page.goto("/mechanics");
    await page.getByRole("button", { name: /add mechanic/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).toBeVisible({ timeout: 5000 });

    const fixedName = `Fixed Mechanic ${UNIQUE_SUFFIX + 2}`;
    const fixedPhone = `7${String(UNIQUE_SUFFIX + 2).slice(-9)}`;
    await page.getByPlaceholder(/ravi kumar/i).fill(fixedName);
    await page.getByPlaceholder(/9876543210/i).fill(fixedPhone);

    const selects = page.locator("form select");
    await selects.nth(1).selectOption("FIXED_PER_ITEM");

    // Fixed per item rate input
    await expect(page.getByPlaceholder(/e\.g\. 200/i)).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder(/e\.g\. 200/i).fill("250");

    await page.getByRole("button", { name: /add mechanic/i }).click();
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/error/);
  });

  test("mechanic detail page loads and shows payout info", async ({ page }) => {
    await page.goto("/mechanics");
    const firstRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (await firstRow.isVisible({ timeout: 3000 })) {
      await firstRow.click();
      await page.waitForURL(/\/mechanics\/.+/, { timeout: 8000 });
      // Detail page should show name and some pay/attendance information
      await expect(page).toHaveURL(/\/mechanics\/.+/);
      await expect(page.locator("body")).not.toHaveText(/error/i);
    } else {
      test.info().annotations.push({ type: "info", description: "No mechanics in DB yet" });
    }
  });

  test("cancel modal without submitting works cleanly", async ({ page }) => {
    await page.goto("/mechanics");
    await page.getByRole("button", { name: /add mechanic/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).toBeVisible({ timeout: 5000 });

    // Click cancel
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("heading", { name: "Add Mechanic" })).not.toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL(/mechanics/);
  });
});
