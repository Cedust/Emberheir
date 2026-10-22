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
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/camp-banners.png` });

  await page
    .getByRole("button", { name: /Hearthfire/ })
    .first()
    .click();
  await page.getByRole("tab", { name: /Collections/ }).click();
  const goals = page.getByLabel("Collections");
  await expect(goals.getByLabel("Trophy Wall")).toContainText("is raised");
  await expect(goals.getByLabel("Trigger Codex")).toContainText("0 /");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/collections.png` });
  expect(errors).toEqual([]);
});

test("a full Lineage hangs the ancestor portrait", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "emberheir.lineage",
      JSON.stringify({
        finishers: [1, 2, 3],
        classes: ["cinderguard", "ashstrider", "emberseer"],
      }),
    );
  });
  await seedSave(page, saveCollector());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByTestId("ancestor-portrait")).toBeAttached();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/camp-ancestor.png` });
  await page
    .getByRole("button", { name: /Hearthfire/ })
    .first()
    .click();
  await page.getByRole("tab", { name: "Lineage" }).click();
  const lineage = page.getByLabel("Lineage", { exact: true });
  await expect(lineage.getByLabel("3 of 3")).toBeVisible();
  await expect(lineage).toContainText("Emberheir");
  await expect(lineage).toContainText("+1 Strength");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/lineage.png` });
  expect(errors).toEqual([]);
});

test("the Lineage gives a new Heir its points, glowing, and they can be switched off", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "emberheir.lineage",
      JSON.stringify({ finishers: [1, 2], classes: ["cinderguard", "emberseer"] }),
    );
  });
  await page.goto("/?dev");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  const lineage = page.getByRole("group", { name: "Lineage" });
  const strength = lineage.getByRole("button", { name: /Strength/ });
  await expect(strength).toHaveAttribute("aria-pressed", "true");
  await expect(lineage.getByRole("button", { name: /Intelligence/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("attr-strength").locator(".notch.inherited")).toHaveCount(1);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/lineage-create.png` });
  await strength.click();
  await expect(strength).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("attr-strength").locator(".notch.inherited")).toHaveCount(0);
  expect(errors).toEqual([]);
});
