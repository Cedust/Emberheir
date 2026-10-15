import { expect, test } from "@playwright/test";
import { saveAshborn, saveCrucible, saveGreater, saveWildfire, seedSave } from "./fixtures";

test("after The Last Ember any act burns again in the Wildfire", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWildfire());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  const trip = page.getByRole("region", { name: "Eldrin, The Road" });
  const picker = trip.getByLabel("Wildfire", { exact: true });
  await expect(picker).toContainText("Wildfire off");
  await expect(picker).toContainText("best III");
  for (let i = 0; i < 4; i++) await picker.getByRole("button", { name: "Raise Wildfire" }).click();
  await expect(picker).toContainText("Wildfire IV");
  await expect(picker.getByRole("button", { name: "Raise Wildfire" })).toBeDisabled();
  // Every act is open in the Wildfire.
  await trip.getByRole("radio", { name: /Act 7/ }).click();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/wildfire-camp.png` });
  await trip.getByRole("button", { name: "WILDFIRE IV · ACT 7" }).click();

  const intermission = page.getByRole("region", { name: "Intermission" });
  await expect(intermission.getByLabel("Up next")).toContainText("Wildfire IV");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  if (process.env.SHOTS) {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/wildfire-battle.png` });
  }
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

  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  const trip = page.getByRole("region", { name: "Eldrin, The Road" });
  const picker = trip.getByLabel("Wildfire", { exact: true });
  for (let i = 0; i < 6; i++) await picker.getByRole("button", { name: "Raise Wildfire" }).click();
  await expect(picker).toContainText("Wildfire VI");
  const omens = trip.getByRole("group", { name: "Wildfire Omens" });
  await expect(omens).toContainText("Peril 0 / 2");
  await expect(trip.getByRole("button", { name: "NEEDS 2 PERIL" })).toBeDisabled();
  await omens.getByRole("button", { name: "Parched" }).click();
  await omens.getByRole("button", { name: "Stoneflesh" }).click();
  await expect(omens).toContainText("Peril 3 / 2");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/wildfire-omens.png` });
  await trip.getByRole("button", { name: "WILDFIRE VI · ACT 2" }).click();
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
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/ashborn.png` });
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
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/greater-affix.png` });
  expect(errors).toEqual([]);
});

test("salvaging a Legendary teaches its Power; Liora binds it in the Ember Crucible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveCrucible());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
  await page.getByRole("button", { name: /^Salvage/ }).click();
  await page.getByRole("button", { name: "Headsman's Band" }).click();
  await expect(page.locator(".after-line.kindled")).toContainText("Power Codex: Executioner · T10");
  await page.locator(".cost-bar").getByRole("button", { name: "Salvage" }).click();

  await page.getByRole("tab", { name: /Liora/ }).click();
  await page.getByRole("button", { name: /^Ember Crucible/ }).click();
  const strike = page.getByRole("region", { name: "Strike slot" });
  await strike.getByRole("button", { name: "Executioner" }).click();
  await expect(strike.getByRole("button", { name: "Executioner" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("region", { name: "Ward slot" })
    .getByRole("button", { name: "Leech Bloom" })
    .click();
  await expect(page.getByRole("region", { name: "Ember slot" })).toContainText("Wildfire V");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/crucible.png` });
  expect(errors).toEqual([]);
});
