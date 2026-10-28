import { GAME_DATA } from "@emberheir/content";
import { newGame, serializeGame } from "@emberheir/sim";
import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("the Overview shows the pinned Stats panels, up to three, and keeps them", async ({
  page,
}) => {
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  const overview = sheet.getByRole("region", { name: "Overview" });
  await sheet.getByRole("tab", { name: "Overview" }).click();
  // Default pins: Damage, Defense and Heat.
  await expect(overview.getByRole("button", { name: "Unpin from Overview" })).toHaveCount(3);
  await expect(overview).toContainText("Heat");

  await sheet.getByRole("tab", { name: "Stats" }).click();
  await sheet.getByRole("tab", { name: "Defense" }).click();
  // Three are pinned: the other stars are closed.
  const resist = sheet.getByRole("button", { name: "Pin to Overview" }).nth(1);
  await expect(resist).toHaveAttribute("aria-disabled", "true");
  await sheet.getByRole("tab", { name: "Heat" }).click();
  await sheet.getByRole("button", { name: "Unpin from Overview" }).click();
  await sheet.getByRole("tab", { name: "Offense" }).click();
  await sheet.getByRole("button", { name: "Pin to Overview" }).last().click();

  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  await sheet.getByRole("tab", { name: "Overview" }).click();
  await expect(overview).toContainText("Ailments");
  await expect(overview).not.toContainText("Starts at");
});

test("the Speed note names the hero's own weapon and its start Speed", async ({ page }) => {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard", weapon: "axe" });
  await seedSave(page, serializeGame(base));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  await sheet.getByRole("tab", { name: "Overview" }).click();
  await sheet.locator(".hero-pill", { hasText: "Speed" }).first().hover();
  await expect(page.getByText("Your Axe starts at 80")).toBeVisible();
});

test("a new Heir's class chips show only the Class Trait", async ({ page }) => {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  await seedSave(page, serializeGame(base));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const chips = page.getByRole("dialog", { name: "Character" }).locator(".class-chips");
  // A new Heir: only the Class Trait, no Heirloom path, Mastery or Lineage yet.
  await expect(chips.locator(".class-chip")).toHaveCount(1);
  await expect(chips).toContainText("Fury");
  await chips.locator(".class-chip").first().hover();
  await expect(page.getByTestId("note-tooltip")).toContainText("Class Trait · Cinderguard");
  await expect(page.getByRole("dialog", { name: "Character" })).toContainText("Cinderguard");
});

test("the class chips show the Masteries with their tiers and the lit Lineage flames", async ({
  page,
}) => {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  await seedSave(
    page,
    serializeGame({
      ...base,
      // Winning the finale lights the class's Lineage flame.
      legacy: {
        ...base.legacy,
        finaleWon: true,
        branches: ["vanquisher", "vanquisher", "berserker"],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const chips = page.getByRole("dialog", { name: "Character" }).locator(".class-chips");
  await expect(chips.locator(".class-chip-mastery")).toHaveCount(2);
  await expect(chips.locator(".class-chip-mastery").first()).toContainText("II");
  await expect(chips.locator(".class-chip-lineage .lit")).toHaveCount(1);
});

test("the Class Trait shows on the status rail while it holds stacks", async ({ page }) => {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const act = GAME_DATA.acts[0];
  if (!act) throw new Error("No Act 1");
  await seedSave(
    page,
    serializeGame({
      ...base,
      hero: { ...base.hero, level: 8 },
      run: {
        actId: act.id,
        stage: 5,
        lifeFraction: 1,
        phase: "fight",
        encounter: { enemyId: "ashen-brute", level: 8, boss: false, eliteModifiers: [], seed: 11 },
        rewards: null,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  const trait = page.getByTestId("status-rail").locator(".rail-status.trait");
  await expect(trait).toBeVisible({ timeout: 30_000 });
  await trait.hover();
  await expect(page.getByTestId("note-tooltip")).toContainText("Class Trait");
});
