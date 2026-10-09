import { expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, seedSave } from "./fixtures";

test("The harvest boss falls: the caravan saves every item, wake as the next generation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterHarvestBoss());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("region", { name: "Victory" })).toContainText("GORRAK FALLS");
  await page.getByRole("button", { name: "Pack the Caravan" }).click();

  // A new Prestige branch for the Skill Tree.
  const bloodline = page.getByRole("region", { name: "Bloodline" });
  await expect(bloodline.getByRole("button", { pressed: true })).toHaveCount(1);
  // Only the Warrior's four paths grow: Duelist, Butcher, Warden, Tactician.
  await expect(bloodline.locator(".branch-pick")).toHaveCount(4);
  await bloodline.getByRole("button", { name: /Warden/ }).click();
  await page.getByRole("button", { name: "Take Warden" }).click();

  // Rekindle: two new points, and up to two may move.
  const rekindle = page.getByRole("region", { name: "Rekindle" });
  await expect(rekindle.getByTestId("rekindle-left")).toContainText("2 points left");
  await rekindle.getByRole("button", { name: "Remove Strength" }).click();
  await rekindle.getByRole("button", { name: "Add Agility" }).click();
  await rekindle.getByRole("button", { name: "Add Agility" }).click();
  await expect(rekindle.getByTestId("perks")).toContainText("Quick Reflexes");
  await expect(rekindle.getByTestId("rekindle-left")).toContainText("1 point left · 1 move left");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/rekindle.png` });
  await page.getByRole("button", { name: "Let It Burn" }).click();

  const heir = page.getByRole("region", { name: "Inheritance" });
  await expect(heir).toContainText("GENERATION 2");
  await expect(heir).toContainText("Rotation Slot 2");
  await expect(heir).toContainText("Warden");
  await expect(heir).toContainText("NEW ACT");
  await expect(heir).toContainText("Rotwood");
  await expect(heir).toContainText("5 → 15");
  await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();

  // A reload keeps the new generation.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  const camp = page.getByRole("region", { name: "Camp" });
  await expect(camp).toContainText("Generation 2");

  await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
  await page.getByRole("button", { name: "Open Legacy" }).click();
  const legacy = page.getByRole("region", { name: "Legacy" });
  // Round Shield and Body Armor came through the fire (the weapon is no item: Weapon Mastery).
  await expect(legacy).toContainText("2 / 10 Heirlooms");
  await expect(legacy).toContainText("Gorrak fell at Level 5");
  await page.keyboard.press("Escape");

  // Rotation Slot 2 and Reaction Slot 1 are open at Kaelen.
  await page.keyboard.press("t");
  // Warden grows into the Skill Tree.
  const tree = page.getByRole("group", { name: "Skill Tree" });
  await expect(tree.getByRole("button", { name: "Bulwark" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Battle Plan" }).click();
  await expect(page.getByRole("button", { name: "Rotation Slot 2" })).toBeEnabled();
  await expect(page.getByTestId("reaction-slot-0")).toBeVisible();

  // Ashen Rebirth: the Harvest's Phoenix Ash sets every point above the Class Array anew.
  await page.getByRole("tab", { name: "Ashen Rebirth" }).click();
  await expect(page.getByTestId("phoenix-ash")).toContainText("1");
  await page.getByRole("button", { name: "Burn All" }).click();
  await expect(page.getByText("8 points free")).toBeVisible();
  for (const a of ["Dexterity", "Dexterity", "Intelligence"]) {
    await page.getByRole("button", { name: `Add ${a}` }).click();
  }
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/rebirth.png` });
  expect(errors).toEqual([]);
});
