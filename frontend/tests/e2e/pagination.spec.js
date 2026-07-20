import { test, expect } from "@playwright/test";

test.describe("pagination", () => {
  test("Next/Prev move between pages and update the URL", async ({ page }) => {
    await page.goto("/?page_size=5");

    const pagination = page.locator("#pagination");
    await expect(pagination).toBeVisible();

    const nextBtn = pagination.getByRole("button", { name: "Next →" });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(page).toHaveURL(/page=2/);

    const prevBtn = pagination.getByRole("button", { name: "← Prev" });
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click();

    await expect(page).toHaveURL(/page=1/);
  });

  test("loading a page=2 URL directly restores that page (URL -> state round-trip)", async ({ page }) => {
    await page.goto("/?page_size=5&page=2");

    const resultSummary = page.locator("#resultSummary");
    await expect(resultSummary).toContainText("6–10");
  });

  test("Prev is disabled on page 1, Next is disabled on the last page", async ({ page }) => {
    await page.goto("/?page_size=5");

    const pagination = page.locator("#pagination");
    await expect(pagination.getByRole("button", { name: "← Prev" })).toBeDisabled();

    // Jump directly to the last page and confirm Next is disabled there.
    const headerTotal = await page.locator("#headerTotal").textContent();
    const total = parseInt(headerTotal.replace(/,/g, ""), 10);
    const lastPage = Math.ceil(total / 5);
    await page.goto(`/?page_size=5&page=${lastPage}`);

    await expect(pagination.getByRole("button", { name: "Next →" })).toBeDisabled();
  });
});
