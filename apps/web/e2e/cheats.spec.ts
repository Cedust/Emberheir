import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("Cheat Mode: level, Heirloom Points, acorns, an item and the next act", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/?cheat");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Cheats/ }).click();
  const panel = page.getByRole("dialog", { name: "Cheats" });

  // The second run allows Weapon Rank 7: it sets level 20; ten Bonus Heirloom Points come on top.
  const ranks = panel.getByRole("radiogroup", { name: "Weapon Rank" });
  await expect(ranks.getByRole("radio")).toHaveCount(8);
  await ranks.getByRole("radio", { name: "7" }).click();
  await expect(panel.getByLabel("Level", { exact: true })).toHaveValue("20");
  await panel.getByLabel("Bonus Heirloom Points").fill("10");
  await panel.getByLabel("Bonus Heirloom Points").press("Enter");
  await expect(panel).toContainText("17 free");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/cheats.png` });

  await panel.getByRole("tab", { name: "Currency" }).click();
  await panel.getByRole("button", { name: "+10,000" }).first().click();
  await expect(panel.getByLabel("Acorns")).not.toHaveValue("0");

  await panel.getByRole("tab", { name: "Items" }).click();
  await panel.getByRole("radio", { name: "Legendary" }).click();
  await panel.getByRole("button", { name: "Give item" }).click();
  await expect(panel.locator(".cheat-item .rarity-legendary")).toHaveCount(1);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/cheats-items.png` });

  await panel.getByRole("tab", { name: "Progress" }).click();
  await panel.getByRole("button", { name: /Clear the run/ }).click();
  await expect(page.getByRole("dialog", { name: "Cheats" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Cheat Mode is off without ?cheat outside PR previews", async ({ page }) => {
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cheats/ })).toHaveCount(0);
});

test("Cheat Mode: become one of the 24 builds at its last stage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/?cheat");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Cheats/ }).click();
  const panel = page.getByRole("dialog", { name: "Cheats" });
  await panel.getByRole("tab", { name: "Builds" }).click();
  await expect(panel.getByRole("radiogroup", { name: /builds/ }).getByRole("radio")).toHaveCount(
    24,
  );
  await panel.getByRole("radio", { name: "Toxin Bow" }).click();
  await panel
    .getByRole("radiogroup", { name: "Main Mastery" })
    .getByRole("radio", { name: "Skirmisher" })
    .click();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/cheats-builds.png` });
  await panel.getByRole("button", { name: "Become this Heir" }).click();
  await expect(page.getByRole("dialog", { name: "Cheats" })).toHaveCount(0);
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: /Character/ })).toContainText("Skirmisher");
  await expect(page.getByRole("dialog", { name: /Character/ })).toContainText("100");
  expect(errors).toEqual([]);
});
