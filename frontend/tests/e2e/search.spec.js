import { test, expect } from "@playwright/test";

// Per §3.3's selector policy: stick to the stable element IDs in
// templates/index.html (#searchInput, #headerCount, etc.), never Tailwind
// utility classes or Arabic text content.

test.describe("search", () => {
  test("typing narrows the header count", async ({ page }) => {
    await page.goto("/");

    const headerCount = page.locator("#headerCount");
    await expect(headerCount).not.toHaveText("0");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);
    expect(initialCount).toBeGreaterThan(0);

    // A fairly specific search term should narrow (not necessarily to zero,
    // but strictly fewer than the unfiltered total).
    await page.fill("#searchInput", "zzz_no_such_verse_xyz123");

    // The input is debounced (350ms in app.js) before triggering a refetch.
    await expect(headerCount).toHaveText("0", { timeout: 3000 });
  });

  test("clearing the search restores the full count", async ({ page }) => {
    await page.goto("/");
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();

    await page.fill("#searchInput", "zzz_no_such_verse_xyz123");
    await expect(headerCount).toHaveText("0", { timeout: 3000 });

    await page.fill("#searchInput", "");
    await expect(headerCount).toHaveText(initialCountText, { timeout: 3000 });
  });

  test("search term is reflected in the URL and the active-filters chip", async ({ page }) => {
    await page.goto("/");
    await page.fill("#searchInput", "test");

    // wait for the debounced refresh() to run and sync the URL
    await expect(page).toHaveURL(/q=test/, { timeout: 3000 });

    const chip = page.locator("#activeFilters .filter-chip", { hasText: "test" });
    await expect(chip).toBeVisible();
  });
});
