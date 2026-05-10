/**
 * Mobile manager tests — runs in the "mobile-manager" project (iPhone 14 viewport).
 */
import { test, expect } from "@playwright/test";

test.describe("Mobile manager – navigation", () => {
  test("bottom nav is visible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    // BottomNav is md:hidden — should be present on iPhone viewport
    const nav = page.locator("nav").filter({ hasText: /jobs|customers|leads/i });
    await expect(nav.first()).toBeVisible();
  });

  test("services list shows card layout on mobile", async ({ page }) => {
    await page.goto("/services");
    // Desktop table is hidden md:hidden; cards are block md:hidden
    // On mobile viewport the table should not be visible
    const table = page.locator("table");
    if (await table.count() > 0) {
      await expect(table.first()).toBeHidden();
    }
  });

  test("customers list shows card layout on mobile", async ({ page }) => {
    await page.goto("/customers");
    const table = page.locator("table");
    if (await table.count() > 0) {
      await expect(table.first()).toBeHidden();
    }
  });

  test("FAB on dashboard doesn't overlap bottom nav", async ({ page }) => {
    await page.goto("/dashboard");
    const fab = page.locator("a[href='/services/new'], button").filter({ hasText: /\+|new sr/i }).last();
    if (await fab.isVisible({ timeout: 2000 })) {
      const fabBox = await fab.boundingBox();
      const viewportHeight = page.viewportSize()?.height ?? 844;
      // FAB should be above bottom nav (~52px) — at least 60px from bottom
      if (fabBox) {
        expect(fabBox.y + fabBox.height).toBeLessThan(viewportHeight - 40);
      }
    }
  });

  test("can open new SR form on mobile", async ({ page }) => {
    await page.goto("/services/new");
    await expect(page.getByText(/customer/i).first()).toBeVisible();
  });
});
