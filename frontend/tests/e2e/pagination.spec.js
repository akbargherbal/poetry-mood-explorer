import { test, expect } from "@playwright/test";

// Each test here navigates to a different query-string URL (to exercise the
// URL -> state round-trip), so the initial-load wait is inlined per test
// rather than shared via beforeEach — see search.spec.js for why a bare
// page.goto isn't enough on its own before reading page state.
async function gotoAndWaitForLoad(page, url) {
  await page.goto(url);
  await expect(page.locator("#headerCount")).toHaveText(/\d/, { timeout: 15000 });
}

test.describe("pagination", () => {
  test("Next/Prev move between pages and update the URL", async ({ page }) => {
    await gotoAndWaitForLoad(page, "/?page_size=5");

    const pagination = page.locator("#pagination");
    await expect(pagination).toBeVisible();

    const nextBtn = pagination.getByRole("button", { name: "Next →" });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(page).toHaveURL(/page=2/, { timeout: 10000 });

    const prevBtn = pagination.getByRole("button", { name: "← Prev" });
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click();

    await expect(page).toHaveURL(/page=1/, { timeout: 10000 });
  });

  test("loading a page=2 URL directly restores that page (URL -> state round-trip)", async ({ page }) => {
    await gotoAndWaitForLoad(page, "/?page_size=5&page=2");

    const resultSummary = page.locator("#resultSummary");
    await expect(resultSummary).toContainText("6–10");
  });

  test("Prev is disabled on page 1, Next is disabled on the last page", async ({ page }) => {
    await gotoAndWaitForLoad(page, "/?page_size=5");

    const pagination = page.locator("#pagination");
    await expect(pagination.getByRole("button", { name: "← Prev" })).toBeDisabled();

    // Jump directly to the last page and confirm Next is disabled there.
    const headerTotal = await page.locator("#headerTotal").textContent();
    const total = parseInt(headerTotal.replace(/,/g, ""), 10);
    const lastPage = Math.ceil(total / 5);
    await gotoAndWaitForLoad(page, `/?page_size=5&page=${lastPage}`);

    await expect(page.locator("#pagination").getByRole("button", { name: "Next →" })).toBeDisabled();
  });
});
