import { expect, test } from "@playwright/test";
import type { GameState } from "@emberheir/sim";
import { saveAfterAct1, seedSave } from "./fixtures";

/** After Act 1 with Acorns for the brew and a Cinder Caster beaten (Fire is learned). */
function saveWithBrew(): string {
  const state = JSON.parse(saveAfterAct1()) as GameState;
  return JSON.stringify({
    ...state,
    wallet: { ...state.wallet, acorns: 500 },
    legacy: { ...state.legacy, hunts: { "cinder-caster": 1 } },
  });
}

test("after the first Prestige a Draught is brewed for the trip and shows in the arena", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithBrew());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  // Draughts are brewed for the trip at Eldrin.
  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  const draughts = page.getByRole("group", { name: "Draught" });
  // Fire is learned from the Cinder Caster; Frost is not shown before a Cold foe is beaten.
  const fire = draughts.getByRole("button", { name: "Fire Draught" });
  await expect(fire).toHaveCount(1);
  await expect(draughts.getByRole("button", { name: "Frost Draught" })).toHaveCount(0);
  // The tooltip lists the bonuses as bullets.
  await fire.hover();
  await expect(page.getByTestId("note-tooltip").locator("li")).toHaveText([
    "+20 % Fire Resistance",
    "+5 % max Fire Resistance",
  ]);
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/draught-tooltip.png` });
  const iron = draughts.getByRole("button", { name: "Iron Draught" });
  await expect(iron).toHaveAttribute("aria-pressed", "false");
  await iron.click();
  await expect(iron).toHaveAttribute("aria-pressed", "true");
  await iron.hover();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/draught-camp.png` });

  // The Character sheet explains the Ember Penalty of this run.
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  await sheet.getByRole("tab", { name: "Stats" }).click();
  await sheet.getByRole("tab", { name: "Defense" }).click();
  await expect(sheet).toContainText("Ember Penalty");
  await sheet.getByText("Ember Penalty").hover();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/ember-penalty.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByText("Ember Penalty this run")).toHaveCount(0);

  // The Skill Web's Ward buds: defense between the regions.
  await page.keyboard.press("t");
  const tree = page.getByRole("group", { name: "Ash Tree" });
  await expect(tree.getByRole("button", { name: "Oakheart" })).toHaveCount(1);
  if (process.env.SHOTS) {
    await tree.getByRole("button", { name: "Oakheart" }).press("Enter");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/ward-buds.png` });
  }
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /SET OUT · ACT 2/i }).click();
  await expect(page.getByRole("region", { name: "Intermission" })).toContainText("Rotwood");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/flask-road.png` });
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  // The brewed Draught's vial takes the Flask charge it cost.
  await expect(page.getByRole("img", { name: "Iron Draught" })).toBeVisible();
  if (process.env.SHOTS) {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/draught-battle.png` });
  }
  expect(errors).toEqual([]);
});
