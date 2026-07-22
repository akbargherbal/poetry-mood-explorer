import { test, expect } from "@playwright/test";

test.describe("filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Wait past the initial /api/meta + /api/search + /api/stats round-trip
    // (see search.spec.js for why a plain page.goto isn't enough) before any
    // test reads a "before" count off headerCount.
    await expect(page.locator("#headerCount")).toHaveText(/\d/, { timeout: 15000 });
  });

  test("selecting a poet filters results, resetFilters clears it", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    const firstPoetCheckbox = page.locator("#poetList input[type='checkbox']").first();
    await firstPoetCheckbox.check();

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCountText = await headerCount.textContent();
    const filteredCount = parseInt(filteredCountText.replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    await page.locator("#resetFilters").click();
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
  });

  test("an axis tag filter changes the result count and adds an active-filter chip", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();

    const firstTagChip = page.locator("#axisFilters .tag-chip").first();
    await firstTagChip.click();

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    await expect(firstTagChip).toHaveClass(/active/);

    // renderActiveFilters() should have added a corresponding chip
    const activeChips = page.locator("#activeFilters .filter-chip");
    await expect(activeChips).toHaveCount(1);

    // clicking it again removes the filter and restores the count
    await firstTagChip.click();
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
    await expect(page.locator("#activeFilters .filter-chip")).toHaveCount(0);
  });

  test("a poem-length preset sets the min/max batch inputs", async ({ page }) => {
    const presets = page.locator("#poemLengthPresets .length-pill");
    const presetCount = await presets.count();
    test.skip(presetCount === 0, "no poem-length presets in this dataset's meta");

    const firstPreset = presets.first();
    const presetText = await firstPreset.textContent();
    // label markup is "<label> <span class='range'>min-max</span>"
    const match = presetText.match(/(\d+)\s*-\s*(\d+)/);
    expect(match).not.toBeNull();
    const [, expectedMin, expectedMax] = match;

    await firstPreset.click();

    await expect(page.locator("#poemBatchesMin")).toHaveValue(expectedMin);
    await expect(page.locator("#poemBatchesMax")).toHaveValue(expectedMax);
    await expect(firstPreset).toHaveClass(/active/);
  });

  test("typing a manual poem-length range narrows results and adds a filter chip", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    await page.fill("#poemBatchesMin", "1");
    // Give the first debounced fetch its own full cycle (350ms debounce +
    // network round-trip) before typing the second value. Filling min alone
    // often can't be detected via a header-count change (the minimum poem
    // length is 1, so a min=1 filter is frequently a no-op on the count) —
    // and firing both fills back-to-back lets their two independent
    // debounced fetches resolve out of order, letting the stale min-only
    // response silently overwrite the correctly-filtered result.
    await page.waitForTimeout(1500);

    await page.fill("#poemBatchesMax", "2");

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCount = parseInt((await headerCount.textContent()).replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);

    const chip = page.locator("#activeFilters .filter-chip", { hasText: "batches" });
    await expect(chip).toBeVisible();

    // clicking the chip's remove button clears the range and restores the count
    await chip.locator("button").click();
    await expect(page.locator("#poemBatchesMin")).toHaveValue("");
    await expect(page.locator("#poemBatchesMax")).toHaveValue("");
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
  });

  test("excluding a poem by number removes it and shows a removable chip", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    // Grab a real poem number off the first result card rather than
    // hardcoding one, so this doesn't depend on a specific dataset row.
    const poemLabel = await page.locator("#results .batch-card").first().locator("text=/poem #/").textContent();
    const poemNo = poemLabel.match(/poem #(\S+)/)[1];

    await page.fill("#excludePoemInput", poemNo);
    await page.locator("#addExcludePoemBtn").click();

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCount = parseInt((await headerCount.textContent()).replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);

    const chip = page.locator("#activeFilters .filter-chip", { hasText: `#${poemNo}` });
    await expect(chip).toBeVisible();

    await chip.locator("button").click();
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
  });

  test("excluding a poet rank removes their batches", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    await page.fill("#excludeRankInput", "1");
    await page.locator("#addExcludeRankBtn").click();

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCount = parseInt((await headerCount.textContent()).replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);

    await expect(page.locator("#activeFilters .filter-chip", { hasText: "#1" })).toBeVisible();
  });

  test("toggling first-batch-only collapses results to one card per poem", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    await page.locator("#firstBatchOnly").check();

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCount = parseInt((await headerCount.textContent()).replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    await expect(page.locator("#activeFilters .filter-chip", { hasText: "One card per poem" })).toBeVisible();

    await page.locator("#firstBatchOnly").uncheck();
    await expect(headerCount).toHaveText(initialCountText, { timeout: 10000 });
  });

  test("an axis confidence range narrows results", async ({ page }) => {
    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    // Scope to the first axis block (mood) so this doesn't depend on which
    // axis renders first if the AXES order ever changes.
    const firstAxisBlock = page.locator(".axis-block").first();
    await firstAxisBlock.locator(".conf-min-input").fill("0");
    await firstAxisBlock.locator(".conf-max-input").fill("1");

    await expect(headerCount).not.toHaveText(initialCountText, { timeout: 10000 });
    const filteredCount = parseInt((await headerCount.textContent()).replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});
