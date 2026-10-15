import { expect, test } from "@playwright/test";
import { saveAshborn, saveGreater, saveWildfire, seedSave } from "./fixtures";

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

test("after level 100 XP becomes Ashborn: points in the Character Sheet, reset at Old Nan", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAshborn());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.keyboard.press("c");
  await page.getByRole("tab", { name: "Ashborn" }).click();
  await expect(page.getByTestId("ashborn-points")).toContainText("2 Ashborn Points");
  await page.getByRole("button", { name: "Add Damage" }).click();
  await page.getByRole("button", { name: "Add Resistances" }).click();
  await expect(page.getByTestId("ashborn-points")).toContainText("0 Ashborn Points");
  await expect(page.getByRole("button", { name: "Add Life", exact: true })).toBeDisabled();
  await page.screenshot({ path: "test-results/ashborn.png" });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Old Nan, Hearthkeeper" }).click();
  await page.getByRole("button", { name: /Reset Ashborn/ }).click();
  await page.getByRole("button", { name: /5 points back\?/ }).click();
  await page.keyboard.press("c");
  await page.getByRole("tab", { name: "Ashborn" }).click();
  await expect(page.getByTestId("ashborn-points")).toContainText("5 Ashborn Points");
  expect(errors).toEqual([]);
});

test("Liora awakens a Greater Affix with Cinderglass and intensifies it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveGreater());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Liora, Mystic" }).click();
  await page.getByRole("button", { name: /Open/ }).click();
  await page.getByRole("button", { name: /^Awaken/ }).click();
  await page.getByRole("button", { name: "Glowing Iron Ring" }).click();
  await expect(page.locator(".cost-bar")).toContainText("3 Cinderglass");
  await page.locator(".cost-bar").getByRole("button", { name: "Awaken" }).click();
  await expect(page.getByRole("status")).toContainText("Greater I:");
  await page.getByRole("button", { name: /^Intensify/ }).click();
  await expect(page.locator(".cost-bar")).toContainText("2 Cinderglass");
  await page.locator(".cost-bar").getByRole("button", { name: "Intensify" }).click();
  await expect(page.getByRole("status")).toContainText("Greater II:");
  await expect(page.getByTestId("craft-now")).toContainText("Greater II");
  await page.screenshot({ path: "test-results/greater-affix.png" });
  expect(errors).toEqual([]);
});
