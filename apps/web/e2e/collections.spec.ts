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

test("a full Lineage hangs the ancestor portrait", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("emberheir.lineage", JSON.stringify({ finishers: [1, 2, 3, 4, 5] }));
  });
  await seedSave(page, saveCollector());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByTestId("ancestor-portrait")).toBeAttached();
  await page.screenshot({ path: "test-results/camp-ancestor.png" });
  await page
    .getByRole("button", { name: /Hearthfire/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Open Legacy/i }).click();
  await page.getByRole("tab", { name: /Collections/ }).click();
  const lineage = page.getByLabel("Lineage", { exact: true });
  await expect(lineage).toContainText("Step 5 of 5");
  await expect(lineage).toContainText("+10 % Life");
  await page.screenshot({ path: "test-results/lineage.png" });
  expect(errors).toEqual([]);
});
