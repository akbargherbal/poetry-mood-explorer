import { test, expect } from "@playwright/test";

// Per §3.3's selector policy: stick to the stable element IDs in
// templates/index.html (#searchInput, #headerCount, etc.), never Tailwind
// utility classes or Arabic text content.

test.describe("search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // On load, app.js fires /api/meta then /api/search + /api/stats before
    // headerCount gets its real value; until then it still shows the static
    // "—" placeholder baked into index.html. Waiting for actual digits here
    // (rather than e.g. `not.toHaveText("0")`, which "—" also satisfies)
    // avoids racing that initial fetch, which can take several seconds
    // against the full dataset on a slow/non-threaded dev server.
    await expect(page.locator("#headerCount")).toHaveText(/\d/, { timeout: 15000 });
  });

  test("typing narrows the header count", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);
    expect(initialCount).toBeGreaterThan(0);

    // A fairly specific search term should narrow (not necessarily to zero,
    // but strictly fewer than the unfiltered total).
    await page.fill("#searchInput", "zzz_no_such_verse_xyz123");

    // The input is debounced (350ms in app.js) before triggering a refetch;
    // give the actual fetch generous room too since it can be slow.
    await expect(headerCount).toHaveText("0", { timeout: 10000 });
  });

  test("clearing the search restores the full count", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();

    await page.fill("#searchInput", "zzz_no_such_verse_xyz123");
    await expect(headerCount).toHaveText("0", { timeout: 10000 });

    await page.fill("#searchInput", "");
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
  });

  test("search term is reflected in the URL and the active-filters chip", async ({ page }) => {
    await page.fill("#searchInput", "test");

    // wait for the debounced refresh() to run and sync the URL
    await expect(page).toHaveURL(/q=test/, { timeout: 10000 });

    const chip = page.locator("#activeFilters .filter-chip", { hasText: "test" });
    await expect(chip).toBeVisible();
  });
});
