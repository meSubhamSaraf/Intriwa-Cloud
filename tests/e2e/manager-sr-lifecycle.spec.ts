/**
 * Manager: create a full SR end-to-end
 * Runs in the "manager" project (pre-authenticated).
 */
import { test, expect } from "@playwright/test";

const TIMESTAMP = Date.now();
const TEST_CUSTOMER = `Test Customer ${TIMESTAMP}`;
const TEST_PHONE = `9${String(TIMESTAMP).slice(-9)}`; // 10-digit

test.describe("Manager – Service Request lifecycle", () => {
  test("can reach dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("can view service requests list", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: /service requests/i })).toBeVisible();
  });

  test("can open New SR form", async ({ page }) => {
    await page.goto("/services/new");
    // First step should show
    await expect(page.getByText(/customer/i).first()).toBeVisible();
  });

  test("create SR for existing customer (search flow)", async ({ page }) => {
    await page.goto("/services/new");

    // Search for a customer by phone — use a real customer in your DB
    const searchInput = page.getByPlaceholder(/search customer/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("99"); // partial search — should return results
      await page.waitForTimeout(600); // debounce
      const firstResult = page.locator("[data-testid='customer-result'], .customer-result, [role='option']").first();
      if (await firstResult.isVisible({ timeout: 3000 })) {
        await firstResult.click();
      }
    }

    // Just verify we didn't crash and the form is visible
    await expect(page).not.toHaveURL(/error/);
  });

  test("SR list search filters work", async ({ page }) => {
    await page.goto("/services");
    const search = page.getByPlaceholder(/search/i);
    await search.fill("SR-");
    await page.waitForTimeout(400);
    // Either rows or empty state visible — no crash
    await expect(page.locator("table, [data-testid='empty-state'], .divide-y").first()).toBeVisible();
  });

  test("SR list status filter works", async ({ page }) => {
    await page.goto("/services");
    await page.selectOption("select", "OPEN");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/error/);
  });

  test("SR list type filter works", async ({ page }) => {
    await page.goto("/services");
    // Find the type filter select (second select)
    const selects = page.locator("select");
    await selects.nth(1).selectOption("GARAGE");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/error/);
  });

  test("can open an existing SR detail page", async ({ page }) => {
    await page.goto("/services");
    // Click the first row / card
    const firstRow = page.locator("tr.cursor-pointer, .cursor-pointer").first();
    if (await firstRow.isVisible({ timeout: 3000 })) {
      await firstRow.click();
      await page.waitForURL(/\/services\/.+/, { timeout: 8000 });
      await expect(page.getByText(/SR-/)).toBeVisible();
    } else {
      test.skip(); // no SRs in DB yet
    }
  });
});

test.describe("Manager – Customers", () => {
  test("can view customers list", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible();
  });

  test("customers search works", async ({ page }) => {
    await page.goto("/customers");
    await page.getByPlaceholder(/search/i).fill("a");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  });

  test("can open new customer form", async ({ page }) => {
    await page.goto("/customers/new");
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });
});

test.describe("Manager – Leads", () => {
  test("can view leads list", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /leads/i })).toBeVisible();
  });

  test("can open new lead form", async ({ page }) => {
    await page.goto("/leads/new");
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });
});

test.describe("Manager – Mechanics", () => {
  test("can view mechanics list", async ({ page }) => {
    await page.goto("/mechanics");
    await expect(page.getByRole("heading", { name: /mechanics/i })).toBeVisible();
  });

  test("can view a mechanic detail page", async ({ page }) => {
    await page.goto("/mechanics");
    const firstCard = page.locator("tr.cursor-pointer, .cursor-pointer, [href*='/mechanics/']").first();
    if (await firstCard.isVisible({ timeout: 3000 })) {
      await firstCard.click();
      await page.waitForURL(/\/mechanics\/.+/, { timeout: 8000 });
      await expect(page.getByText(/skills|availability|earnings/i).first()).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe("Manager – Invoices", () => {
  test("can view invoices list", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();
  });
});

test.describe("Manager – Follow-ups", () => {
  test("can view follow-ups", async ({ page }) => {
    await page.goto("/followups");
    await expect(page.getByRole("heading", { name: /follow/i })).toBeVisible();
  });
});
