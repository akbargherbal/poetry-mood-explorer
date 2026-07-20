import { test, expect } from "@playwright/test";

test.describe("filters", () => {
  test("selecting a poet filters results, resetFilters clears it", async ({ page }) => {
    await page.goto("/");

    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();
    const initialCount = parseInt(initialCountText.replace(/,/g, ""), 10);

    const firstPoetCheckbox = page.locator("#poetList input[type='checkbox']").first();
    await firstPoetCheckbox.check();

    await expect(headerCount).not.toHaveText(initialCountText);
    const filteredCountText = await headerCount.textContent();
    const filteredCount = parseInt(filteredCountText.replace(/,/g, ""), 10);
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    await page.locator("#resetFilters").click();
    await expect(headerCount).toHaveText(initialCountText);
  });

  test("an axis tag filter changes the result count and adds an active-filter chip", async ({ page }) => {
    await page.goto("/");

    const headerCount = page.locator("#headerCount");
    const initialCountText = await headerCount.textContent();

    const firstTagChip = page.locator("#axisFilters .tag-chip").first();
    const tagLabel = (await firstTagChip.textContent()).trim();
    await firstTagChip.click();

    await expect(headerCount).not.toHaveText(initialCountText);
    await expect(firstTagChip).toHaveClass(/active/);

    // renderActiveFilters() should have added a corresponding chip
    const activeChips = page.locator("#activeFilters .filter-chip");
    await expect(activeChips).toHaveCount(1);

    // clicking it again removes the filter and restores the count
    await firstTagChip.click();
    await expect(headerCount).toHaveText(initialCountText);
    await expect(page.locator("#activeFilters .filter-chip")).toHaveCount(0);
  });

  test("a poem-length preset sets the min/max batch inputs", async ({ page }) => {
    await page.goto("/");

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
});
