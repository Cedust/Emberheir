import { expect, test } from "@playwright/test";
import { saveWildfire, seedSave } from "./fixtures";

test("after The Last Ember any act burns again in the Wildfire", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWildfire());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const picker = page.getByLabel("Wildfire", { exact: true });
  await expect(picker).toContainText("Wildfire off");
  await expect(picker).toContainText("best III");
  for (let i = 0; i < 4; i++) await picker.getByRole("button", { name: "Raise Wildfire" }).click();
  await expect(picker).toContainText("Wildfire IV");
  await expect(picker.getByRole("button", { name: "Raise Wildfire" })).toBeDisabled();
  // Every act is open in the Wildfire.
  await page.getByRole("radio", { name: /Act 7/ }).click();
  await page.screenshot({ path: "test-results/wildfire-camp.png" });
  await page.getByRole("button", { name: "WILDFIRE IV · ACT 7" }).click();

  const intermission = page.getByRole("region", { name: "Intermission" });
  await expect(intermission.getByLabel("Up next")).toContainText("Wildfire IV");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/wildfire-battle.png" });
  expect(errors).toEqual([]);
});

test("above Wildfire V the tier asks for Peril: Omens are chosen before setting out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWildfire(5));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const picker = page.getByLabel("Wildfire", { exact: true });
  for (let i = 0; i < 6; i++) await picker.getByRole("button", { name: "Raise Wildfire" }).click();
  await expect(picker).toContainText("Wildfire VI");
  const omens = page.getByRole("group", { name: "Wildfire Omens" });
  await expect(omens).toContainText("Peril 0 / 2");
  await expect(page.getByRole("button", { name: "NEEDS 2 PERIL" })).toBeDisabled();
  await omens.getByRole("button", { name: "Parched" }).click();
  await omens.getByRole("button", { name: "Stoneflesh" }).click();
  await expect(omens).toContainText("Peril 3 / 2");
  await page.screenshot({ path: "test-results/wildfire-omens.png" });
  await page.getByRole("button", { name: "WILDFIRE VI · ACT 2" }).click();
  await expect(page.getByRole("region", { name: "Intermission" })).toBeVisible();
  expect(errors).toEqual([]);
});
