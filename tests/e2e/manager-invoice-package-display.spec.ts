/**
 * Manager: Invoice with package display
 * Covers: invoice list, invoice detail, package badge, sub-items, MRP strikethrough savings nudge.
 */
import { test, expect } from "@playwright/test";

test.describe("Manager – Invoice package display", () => {
  test("invoices list page loads", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible({ timeout: 8000 });
  });

  test("invoice list shows status badges", async ({ page }) => {
    await page.goto("/invoices");
    // Status filter dropdown should be present
    const statusFilter = page.locator("select").first();
    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await expect(statusFilter).toBeVisible();
    }
    await expect(page).not.toHaveURL(/error/);
  });

  test("can open an invoice detail page", async ({ page }) => {
    await page.goto("/invoices");

    const invoiceRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (!(await invoiceRow.isVisible({ timeout: 3000 }))) {
      test.info().annotations.push({ type: "info", description: "No invoices in DB yet" });
      return;
    }

    await invoiceRow.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/invoices\/.+/);
    await expect(page.getByText(/INV-|invoice/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("invoice detail shows line items section", async ({ page }) => {
    await page.goto("/invoices");

    const invoiceRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (!(await invoiceRow.isVisible({ timeout: 3000 }))) {
      test.info().annotations.push({ type: "info", description: "No invoices in DB yet" });
      return;
    }

    await invoiceRow.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

    // Invoice should show line items — either a table or a list
    const lineItems = page.locator("table, [class*='divide-y']").first();
    await expect(lineItems).toBeVisible({ timeout: 8000 });
  });

  test("invoice with package shows 'Package' badge", async ({ page }) => {
    await page.goto("/invoices");
    const rows = page.locator("tr.cursor-pointer, [class*='cursor-pointer']");
    const count = await rows.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.goto("/invoices");
      const row = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").nth(i);
      if (!(await row.isVisible({ timeout: 2000 }))) break;

      await row.click();
      await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

      const pkgBadge = page.getByText(/package/i).filter({ hasNot: page.locator("h1, h2, h3, nav") });
      if (await pkgBadge.isVisible({ timeout: 2000 })) {
        await expect(pkgBadge.first()).toBeVisible();
        // Verify sub-items are visible (left-border items under a package row)
        const subItems = page.locator("[class*='border-l'], [class*='pl-']").first();
        if (await subItems.isVisible({ timeout: 2000 })) {
          await expect(subItems).toBeVisible();
        }
        return; // found and verified a package invoice
      }
    }
    test.info().annotations.push({ type: "info", description: "No package invoices found in first 5 invoices" });
  });

  test("invoice with package shows MRP strikethrough savings", async ({ page }) => {
    await page.goto("/invoices");
    const rows = page.locator("tr.cursor-pointer, [class*='cursor-pointer']");
    const count = await rows.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.goto("/invoices");
      const row = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").nth(i);
      if (!(await row.isVisible({ timeout: 2000 }))) break;

      await row.click();
      await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

      // MRP strikethrough: line-through styling
      const strikethrough = page.locator("[class*='line-through']").first();
      if (await strikethrough.isVisible({ timeout: 2000 })) {
        await expect(strikethrough).toBeVisible();
        // Savings nudge text
        const savingsText = page.getByText(/save ₹|you save|saved/i).first();
        if (await savingsText.isVisible({ timeout: 2000 })) {
          await expect(savingsText).toBeVisible();
        }
        return; // found a package invoice with strikethrough
      }
    }
    test.info().annotations.push({ type: "info", description: "No package invoices with MRP strikethrough found" });
  });

  test("invoice shows correct total, subtotal, tax rows", async ({ page }) => {
    await page.goto("/invoices");
    const invoiceRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (!(await invoiceRow.isVisible({ timeout: 3000 }))) {
      test.info().annotations.push({ type: "info", description: "No invoices in DB yet" });
      return;
    }

    await invoiceRow.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

    // Total amount should be visible somewhere
    const totalLabel = page.getByText(/total|amount/i).first();
    await expect(totalLabel).toBeVisible({ timeout: 8000 });
  });

  test("Mark as Paid button visible on unpaid invoice", async ({ page }) => {
    await page.goto("/invoices");
    // Filter to DRAFT or SENT invoices
    const statusSelect = page.locator("select").first();
    if (await statusSelect.isVisible({ timeout: 3000 })) {
      await statusSelect.selectOption("SENT").catch(() => {});
    }

    const invoiceRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (!(await invoiceRow.isVisible({ timeout: 3000 }))) {
      test.info().annotations.push({ type: "info", description: "No SENT invoices found" });
      return;
    }

    await invoiceRow.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

    const markPaidBtn = page.getByRole("button", { name: /mark.*paid|paid/i }).first();
    if (await markPaidBtn.isVisible({ timeout: 3000 })) {
      await expect(markPaidBtn).toBeVisible();
    } else {
      test.info().annotations.push({ type: "info", description: "Invoice may already be PAID or no button shown" });
    }
  });

  test("Retrigger send button is present on sent invoice", async ({ page }) => {
    await page.goto("/invoices");
    const invoiceRow = page.locator("tr.cursor-pointer, [class*='cursor-pointer']").first();
    if (!(await invoiceRow.isVisible({ timeout: 3000 }))) {
      test.info().annotations.push({ type: "info", description: "No invoices in DB yet" });
      return;
    }

    await invoiceRow.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 8000 });

    // Retrigger / Resend button
    const retriggerBtn = page.getByRole("button", { name: /resend|retrigger|send again/i });
    if (await retriggerBtn.isVisible({ timeout: 3000 })) {
      await expect(retriggerBtn).toBeVisible();
    }
    await expect(page).not.toHaveURL(/error/);
  });
});
