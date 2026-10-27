import { expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, seedSave } from "./fixtures";

test("The harvest boss falls: one Harvest window, wake as the next generation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterHarvestBoss());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("region", { name: "Victory" })).toContainText("GORRAK FALLS");
  await page.getByRole("button", { name: "Pack the Caravan" }).click();

  // The Harvest: one window with the first Mastery pick and everything the next run brings.
  const harvest = page.getByRole("region", { name: "The Harvest" });
  const mastery = harvest.getByRole("group", { name: "Mastery" });
  await expect(mastery.getByRole("button", { pressed: true })).toHaveCount(1);
  // The Cinderguard's three: Vanquisher, Berserker, Ravager.
  await expect(mastery.locator(".branch-pick")).toHaveCount(3);
  await mastery.getByRole("button", { name: /Ravager/ }).click();
  const gains = harvest.getByRole("list", { name: "You gain" });
  await expect(gains).toContainText("Act 2 · Rotwood");
  await expect(gains).toContainText("20 → 30");
  await expect(gains).toContainText("Rotation Slot 2");
  await expect(gains).toContainText("Attribute Points");
  await expect(gains).toContainText("Draughts");
  await expect(gains).toContainText("Ember Penalty");
  // Every line explains itself.
  await gains.getByText("Skill Points").hover();
  await expect(page.getByText("Spend them in the Ash Tree at Kaelen.")).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/harvest.png` });
  await harvest.getByRole("button", { name: "Let It Burn" }).click();

  // A reload keeps the new generation.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  // Liora brews her first Draughts (draughts-einfuehrung-v1.md).
  const liora = page.getByRole("dialog", { name: "Liora, Mystic" });
  await expect(liora).toContainText("brew you a Draught");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/liora-draughts.png` });
  }
  await liora.getByRole("button", { name: /pick one at Eldrin/ }).click();
  await expect(liora).toBeHidden();
  const camp = page.getByRole("region", { name: "Camp" });
  await expect(camp).toContainText("Generation 2");

  await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
  const legacy = page.getByRole("region", { name: "Legacy" });
  // Round Shield and Body Armor came through the fire (the weapon is no item: the Heirloom).
  await expect(legacy).toContainText("2 / 10 worn");
  await expect(legacy).toContainText("Gorrak fell at Level 5");
  await page.keyboard.press("Escape");

  // Rotation Slot 2 and Reaction Slot 1 are open at Kaelen.
  await page.keyboard.press("t");
  // Ravager grows into the Ash Tree.
  const tree = page.getByRole("group", { name: "Ash Tree" });
  await expect(tree.getByRole("button", { name: "Gore Hide" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Battle Plan" }).click();
  await expect(page.getByRole("button", { name: "Rotation Slot 2" })).toBeEnabled();
  await expect(page.getByTestId("reaction-slot-0")).toBeVisible();

  // Old Nan gives every point above the Class Array back, for Acorns (neuausrichtung-v1.md 7.3);
  // the two Harvest points still wait unspent.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Old Nan, Hearthkeeper" }).click();
  const reset = page.getByRole("button", { name: /Reset Attributes.*336 Acorns/ });
  await reset.click();
  await page.getByRole("button", { name: /6 points back\?/ }).click();
  // They are spent anew in the Character Sheet.
  await page.keyboard.press("c");
  await expect(page.getByTestId("attribute-points")).toContainText("8 Attribute Points");
  for (const a of ["Dexterity", "Dexterity", "Intelligence"]) {
    await page.getByRole("button", { name: `Add ${a}` }).click();
  }
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/attribute-respec.png` });
  expect(errors).toEqual([]);
});
