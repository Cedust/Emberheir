import { expect, test } from "@playwright/test";
import { saveCollector, seedSave } from "./fixtures";

test("full collections raise their banners in the Camp", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveCollector());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByTestId("banner-trophies")).toBeAttached();
  await expect(page.getByTestId("banner-runewords")).toBeAttached();
  await expect(page.getByTestId("banner-codex")).toHaveCount(0);
  await page.screenshot({ path: "test-results/camp-banners.png" });

  await page
    .getByRole("button", { name: /Hearthfire/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Open Legacy/i }).click();
  await page.getByRole("tab", { name: /Collections/ }).click();
  const goals = page.getByLabel("Collections");
  await expect(goals.getByLabel("Trophy Wall")).toContainText("is raised");
  await expect(goals.getByLabel("Trigger Codex")).toContainText("0 /");
  await page.screenshot({ path: "test-results/collections.png" });
  expect(errors).toEqual([]);
});
