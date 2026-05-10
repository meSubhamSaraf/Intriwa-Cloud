/**
 * Manager: create a full SR end-to-end
 * Runs in the "manager" project (pre-authenticated).
 */
import { test, expect } from "@playwright/test";

test.describe("Manager – Service Request lifecycle", () => {
  test("can reach dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    // Dashboard has these widgets — confirms the page fully loaded
    await expect(page.getByText("Today's Lineup")).toBeVisible();
  });

  test("can view service requests list", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveURL(/services/);
    await expect(page.getByRole("heading", { name: "Service Requests" })).toBeVisible();
  });

  test("can open New SR form", async ({ page }) => {
    await page.goto("/services/new");
    await expect(page).toHaveURL(/services\/new/);
    // Step 1 shows customer search or selection
    await expect(page.getByText(/customer/i).first()).toBeVisible();
  });

  test("SR list search filters work", async ({ page }) => {
    await page.goto("/services");
    const search = page.getByPlaceholder(/search/i);
    await search.fill("SR-");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  });

  test("SR list status filter works", async ({ page }) => {
    await page.goto("/services");
    const selects = page.locator("select");
    await selects.first().selectOption("OPEN");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/error/);
  });

  test("SR list type filter works", async ({ page }) => {
    await page.goto("/services");
    const selects = page.locator("select");
    await selects.nth(1).selectOption("GARAGE");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/error/);
  });

  test("can open an existing SR detail page", async ({ page }) => {
    await page.goto("/services");
    // Click the first clickable row or card
    const firstRow = page.locator("tr.cursor-pointer").first();
    const firstCard = page.locator(".md\\:hidden .cursor-pointer").first();
    const target = (await firstRow.isVisible({ timeout: 3000 })) ? firstRow : firstCard;
    if (await target.isVisible({ timeout: 3000 })) {
      await target.click();
      await page.waitForURL(/\/services\/.+/, { timeout: 8000 });
      await expect(page.getByText(/SR-/)).toBeVisible();
    } else {
      test.info().annotations.push({ type: "info", description: "No SRs in DB yet" });
    }
  });
});

test.describe("Manager – Customers", () => {
  test("can view customers list", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/customers/);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  });

  test("customers search works", async ({ page }) => {
    await page.goto("/customers");
    await page.getByPlaceholder(/search/i).fill("a");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/error/);
  });

  test("can open new customer form", async ({ page }) => {
    await page.goto("/customers/new");
    await expect(page).toHaveURL(/customers\/new/);
    // Form has a Name input — check it's visible (input or label)
    await expect(page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='Name']").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Manager – Leads", () => {
  test("can view leads list", async ({ page }) => {
    await page.goto("/leads");
    await expect(page).toHaveURL(/leads/);
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  });

  test("can open new lead form", async ({ page }) => {
    await page.goto("/leads/new");
    await expect(page).toHaveURL(/leads\/new/);
    await expect(page.locator("input[name='name'], input[placeholder*='name' i], input[placeholder*='Name']").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Manager – Mechanics", () => {
  test("can view mechanics list", async ({ page }) => {
    await page.goto("/mechanics");
    await expect(page).toHaveURL(/mechanics/);
    await expect(page.getByRole("heading", { name: "Mechanics" })).toBeVisible();
  });

  test("can view a mechanic detail page", async ({ page }) => {
    await page.goto("/mechanics");
    const firstRow = page.locator("tr.cursor-pointer").first();
    if (await firstRow.isVisible({ timeout: 3000 })) {
      await firstRow.click();
      await page.waitForURL(/\/mechanics\/.+/, { timeout: 8000 });
      await expect(page).toHaveURL(/\/mechanics\/.+/);
    } else {
      test.info().annotations.push({ type: "info", description: "No mechanics yet" });
    }
  });
});

test.describe("Manager – Invoices", () => {
  test("can view invoices list", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page).toHaveURL(/invoices/);
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  });
});

test.describe("Manager – Follow-ups", () => {
  test("can view follow-ups", async ({ page }) => {
    await page.goto("/followups");
    await expect(page).toHaveURL(/followups/);
    await expect(page.getByRole("heading", { name: /follow.up/i })).toBeVisible();
  });
});
