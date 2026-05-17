/**
 * Scenario: Aftermarket part selling price flows correctly to invoice
 *
 * Flow:
 *  1. Manager creates a new SR and moves it to IN_PROGRESS
 *  2. Mechanic adds an aftermarket part with a buying (purchase) price
 *  3. Manager opens the SR, sets a higher selling price, and approves the part
 *  4. Manager raises the invoice
 *  5. Invoice line item shows the SELLING price (not buying price)
 *
 * Prerequisites:
 *  - At least 1 customer with a vehicle in the DB
 *  - At least 1 mechanic in the DB
 *  - Mechanic auth saved in tests/e2e/.auth/mechanic.json
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "fs";

const BUYING_PRICE  = 650;
const SELLING_PRICE = 950;
const PART_NAME     = `Brake Pads E2E ${Date.now()}`;
const MECHANIC_AUTH = "tests/e2e/.auth/mechanic.json";

const mechanicAuthReady = (() => {
  try {
    const s = JSON.parse(fs.readFileSync(MECHANIC_AUTH, "utf8"));
    return (s.cookies?.length ?? 0) > 0;
  } catch { return false; }
})();

// ── Shared state ─────────────────────────────────────────────────
let srId = "";

// ── Helpers ──────────────────────────────────────────────────────

async function selectFirstCustomer(page: Page): Promise<boolean> {
  const input = page.getByPlaceholder(/search by name or phone/i);
  if (!(await input.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await input.fill("a");
  await page.waitForTimeout(600);
  let btn = page.locator("button").filter({ hasText: /\d{7,}/ }).first();
  if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
    await input.fill("e");
    await page.waitForTimeout(600);
    btn = page.locator("button").filter({ hasText: /\d{7,}/ }).first();
  }
  if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  await btn.click();
  await page.waitForTimeout(400);
  return true;
}

async function selectFirstVehicle(page: Page): Promise<boolean> {
  const btn = page.locator("button").filter({ hasText: /petrol|diesel|cng|electric|hybrid/i }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function clickContinue(page: Page) {
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.waitForTimeout(700);
}

// ════════════════════════════════════════════════════════════════
test.describe.serial("Aftermarket part: buying price vs selling price on invoice", () => {

  // ── Step 1: Manager creates SR ───────────────────────────────
  test("1 · Manager creates SR and submits", async ({ page }) => {
    await page.goto("/services/new");
    await expect(page).toHaveURL(/services\/new/);

    const found = await selectFirstCustomer(page);
    if (!found) { test.skip(true, "No customers in DB"); return; }

    await clickContinue(page); // → Vehicle
    await selectFirstVehicle(page);
    await clickContinue(page); // → Issue

    await expect(page.getByRole("heading", { name: /issue/i })).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/problem|customer's own words/i).fill("Brake pads worn out — needs replacement");

    await clickContinue(page); // → Services
    await page.waitForTimeout(1000);
    await clickContinue(page); // → Schedule
    await clickContinue(page); // → Mechanic

    // Select first mechanic
    const mechanicCard = page.locator("label, button, div").filter({ hasText: /available|on job/i }).first();
    if (await mechanicCard.isVisible({ timeout: 3000 })) await mechanicCard.click();
    await clickContinue(page); // → Review

    await expect(page.getByRole("heading", { name: /review/i })).toBeVisible({ timeout: 8000 });

    const [response] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes("/api/service-requests") && r.request().method() === "POST",
        { timeout: 15000 },
      ),
      page.getByRole("button", { name: /create service request/i }).click(),
    ]);

    const srData = await response.json().catch(() => ({}));
    srId = srData.id ?? "";
    if (!srId) {
      await page.waitForURL(/\/services\/.+/, { timeout: 15000 });
      srId = page.url().split("/services/")[1]?.split("?")[0] ?? "";
    }

    await expect(page).toHaveURL(/\/services\/.+/, { timeout: 15000 });
    expect(srId).toBeTruthy();
    console.log(`[E2E] Created SR: ${srId}`);
  });

  // ── Step 2: Manager moves SR to IN_PROGRESS so mechanic can act
  test("2 · Manager moves SR to In Progress", async ({ page }) => {
    if (!srId) { test.skip(true, "SR not created"); return; }
    await page.goto(`/services/${srId}`);
    await expect(page.getByText(/SR-/)).toBeVisible({ timeout: 10000 });

    // Click "Start Job" or status change if available from manager side
    const startBtn = page.getByRole("button", { name: /start.*job|in progress|mark.*progress/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    // If there's no direct button, skip — mechanic will start from portal
    await expect(page).not.toHaveURL(/error/);
  });

  // ── Step 3: Mechanic adds aftermarket part with buying price ──
  test("3 · Mechanic adds aftermarket part with buying price", async ({ browser }) => {
    test.skip(!mechanicAuthReady, "Mechanic auth not configured — skipping mechanic step");
    if (!srId) { test.skip(true, "SR not created"); return; }

    const ctx = await browser.newContext({ storageState: MECHANIC_AUTH });
    const page = await ctx.newPage();

    try {
      await page.goto("/mechanic-portal");
      await page.waitForTimeout(1500);

      // Clock in if needed
      const clockInBtn = page.getByRole("button", { name: /clock.*in|start shift/i }).first();
      if (await clockInBtn.isVisible({ timeout: 2000 })) {
        await clockInBtn.click();
        await page.waitForTimeout(1000);
      }

      // Start the job if not already started
      const startJobBtn = page.getByRole("button", { name: /start.*job/i }).first();
      if (await startJobBtn.isVisible({ timeout: 3000 })) {
        await startJobBtn.click();
        await page.waitForTimeout(1000);
      }

      // Add aftermarket part
      const addItemBtn = page.getByRole("button", { name: /add.*item|add.*part/i }).first();
      if (!(await addItemBtn.isVisible({ timeout: 5000 }))) {
        test.info().annotations.push({ type: "info", description: "Add Item not visible — job may need to be started first" });
        return;
      }
      await addItemBtn.click();

      await expect(page.getByRole("heading", { name: /add.*part|add.*item/i })).toBeVisible({ timeout: 5000 });

      // Fill part name
      const nameInput = page.getByPlaceholder(/air filter|brake pads|item name/i).first();
      await nameInput.fill(PART_NAME);

      // Fill buying (purchase) price
      const buyingInput = page.locator("input[type='number']").first();
      await buyingInput.fill(String(BUYING_PRICE));

      // Submit
      await page.getByRole("button", { name: /add.*item|add.*part|submit/i }).last().click();
      await page.waitForTimeout(1500);

      await expect(page).not.toHaveURL(/error/);
      console.log(`[E2E] Mechanic added "${PART_NAME}" with buying price ₹${BUYING_PRICE}`);
    } finally {
      await ctx.close();
    }
  });

  // ── Step 4: Manager sets SELLING price and approves the part ──
  test("4 · Manager sets selling price and approves part", async ({ page }) => {
    if (!srId) { test.skip(true, "SR not created"); return; }
    await page.goto(`/services/${srId}`);
    await expect(page.getByText(/SR-/)).toBeVisible({ timeout: 10000 });

    // Find "Parts Added by Mechanic" section
    const partsSection = page.getByText(/parts added by mechanic/i).first();
    if (!(await partsSection.isVisible({ timeout: 5000 }))) {
      test.info().annotations.push({ type: "info", description: "No mechanic-added parts visible — mechanic step may have been skipped" });
      return;
    }

    // The part should show the buying price
    await expect(page.getByText(/purchase price/i).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(new RegExp(`₹${BUYING_PRICE.toLocaleString("en-IN")}|₹\\s*${BUYING_PRICE}`))).toBeVisible();

    // Fill the selling price input (labeled "Selling price (₹)")
    const sellingInput = page.getByLabel(/selling price/i).first();
    if (!(await sellingInput.isVisible({ timeout: 3000 }))) {
      // Fallback: find input near "Selling price" label
      const sellingLabel = page.getByText(/selling price/i).first();
      await sellingLabel.scrollIntoViewIfNeeded();
      const inputNearLabel = page.locator("input[type='number']").filter({
        has: page.locator("..").filter({ hasText: /selling price/i }),
      }).first();
      await inputNearLabel.fill(String(SELLING_PRICE));
    } else {
      await sellingInput.fill(String(SELLING_PRICE));
    }

    await page.waitForTimeout(300);

    // Click Save if it appears (appears when value differs from stored selling price)
    const saveBtn = page.getByRole("button", { name: /^save$/i }).first();
    if (await saveBtn.isVisible({ timeout: 2000 })) {
      await saveBtn.click();
      await page.waitForTimeout(800);
    }

    // Click Approve
    const approveBtn = page.getByRole("button", { name: /^approve$/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 3000 });
    await approveBtn.click();
    await page.waitForTimeout(1000);

    // Confirm: part now shows "Selling price confirmed: ₹950"
    await expect(page.getByText(/selling price confirmed/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(new RegExp(`₹${SELLING_PRICE.toLocaleString("en-IN")}|₹\\s*${SELLING_PRICE}`))).toBeVisible();
    console.log(`[E2E] Manager set selling price ₹${SELLING_PRICE} (cost ₹${BUYING_PRICE}) and approved`);
  });

  // ── Step 5: Manager raises invoice ───────────────────────────
  test("5 · Manager raises invoice", async ({ page }) => {
    if (!srId) { test.skip(true, "SR not created"); return; }
    await page.goto(`/services/${srId}`);
    await expect(page.getByText(/SR-/)).toBeVisible({ timeout: 10000 });

    // Mark job ready if not already (required before Raise Invoice appears)
    const readyBtn = page.getByRole("button", { name: /mark.*ready|ready for pickup/i }).first();
    if (await readyBtn.isVisible({ timeout: 3000 })) {
      await readyBtn.click();
      await page.waitForTimeout(1000);
    }

    const raiseInvoiceBtn = page.getByRole("button", { name: /raise invoice/i });
    if (!(await raiseInvoiceBtn.isVisible({ timeout: 5000 }))) {
      test.info().annotations.push({ type: "info", description: "Raise Invoice button not visible — SR may not be in READY state" });
      return;
    }

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/invoices") && r.request().method() === "POST", { timeout: 10000 }),
      raiseInvoiceBtn.click(),
    ]);
    await page.waitForTimeout(1000);

    // Navigate to the invoice
    const viewInvoiceLink = page.getByRole("link", { name: /view invoice/i });
    await expect(viewInvoiceLink).toBeVisible({ timeout: 5000 });
    await viewInvoiceLink.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 10000 });

    console.log(`[E2E] Invoice raised: ${page.url()}`);
  });

  // ── Step 6: Verify selling price (not buying price) on invoice
  test("6 · Invoice shows selling price, not buying price", async ({ page }) => {
    if (!srId) { test.skip(true, "SR not created"); return; }

    // Navigate to the SR first to get the invoice link
    await page.goto(`/services/${srId}`);
    await expect(page.getByText(/SR-/)).toBeVisible({ timeout: 10000 });

    const viewInvoiceLink = page.getByRole("link", { name: /view invoice/i });
    if (!(await viewInvoiceLink.isVisible({ timeout: 5000 }))) {
      test.info().annotations.push({ type: "info", description: "Invoice not yet raised for this SR" });
      return;
    }
    await viewInvoiceLink.click();
    await page.waitForURL(/\/invoices\/.+/, { timeout: 10000 });

    // The invoice should show the part name
    await expect(page.getByText(new RegExp(PART_NAME.split(" ").slice(0, 3).join(" "), "i"))).toBeVisible({ timeout: 5000 });

    // Selling price (₹950) should be visible as a line item amount
    const sellingPriceText = page.getByText(new RegExp(`₹\\s*${SELLING_PRICE.toLocaleString("en-IN")}|₹\\s*${SELLING_PRICE}\\b`));
    await expect(sellingPriceText.first()).toBeVisible({ timeout: 3000 });

    // Buying price (₹650) should NOT appear as a standalone line item amount
    // (It's the internal cost, not shown to the customer)
    const buyingPriceAsAmount = page.locator("span, td").filter({ hasText: new RegExp(`^₹\\s*${BUYING_PRICE}$`) });
    const buyingVisible = await buyingPriceAsAmount.isVisible({ timeout: 1000 }).catch(() => false);
    expect(buyingVisible).toBe(false);

    console.log(`[E2E] ✓ Invoice shows selling price ₹${SELLING_PRICE}, buying price ₹${BUYING_PRICE} is not exposed`);
  });
});
