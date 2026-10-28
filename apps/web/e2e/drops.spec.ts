import { type Page, expect, test } from "@playwright/test";
import {
  saveBossHoard,
  saveBountyDone,
  saveRichLoot,
  saveShrine,
  saveThiefFight,
  seedSave,
} from "./fixtures";

test("Boss Hoard: six cards turn over, take two, the trophy goes up on the Trophy Wall", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveBossHoard());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const hall = page.getByRole("region", { name: "Intermission" });
  await expect(hall).toContainText("Boss Hoard · choose 2 of 6");
  // The cards lie face down, then turn over one by one.
  await expect(page.getByTestId("hoard-card")).toHaveCount(6, { timeout: 10_000 });
  await expect(page.getByTestId("notification-trophy")).toContainText("Thornsong");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/notifications.png` });
  // The act's Home Rune shows as such (act-beute-entwurf-v1.md).
  const drops = page.getByTestId("rune-drops");
  await expect(drops.getByLabel("Moss Rune")).toBeVisible();
  await expect(drops.locator(".rune-drop.home")).toHaveAccessibleName("Thorn Rune");
  await expect(drops.locator(".rune-drop.home")).toContainText("Home Rune");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/home-rune-drop.png` });

  const cards = page.getByTestId("hoard-card");
  await cards.nth(0).click();
  await page.getByTestId("item-card").getByRole("button", { name: "Take" }).click();
  await expect(hall).toContainText("choose 1 of 6");
  await expect(cards.nth(0)).toContainText("Taken");
  await cards.nth(2).click();
  await expect(page.getByTestId("item-card")).toContainText("Thornsong");
  await page.getByTestId("item-card").getByRole("button", { name: "Take" }).click();
  await expect(page.getByTestId("hoard-card")).toHaveCount(0);

  // Back in the Camp, the Trophy Wall shows Thornsong.
  await page.getByRole("button", { name: /RETURN TO CAMP/ }).click();
  await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();
  await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
  await page.getByRole("tab", { name: /Collections/ }).click();
  await expect(page.getByTestId("trophy-thornsong")).toBeEnabled();
  await expect(page.getByTestId("trophy-tyrants-crown")).toBeDisabled();
  expect(errors).toEqual([]);
});

/** Where the item pick overlaps the hero column, the Equipped panel or the footer. */
async function lootOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const box = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
    const left = box(".intermission-left .hero-card") ?? box(".intermission-left");
    const right = box(".intermission-right");
    const footer = box(".intermission-footer");
    if (!left || !right || !footer) return ["missing parts"];
    const out: string[] = [];
    for (const card of document.querySelectorAll(
      ".intermission-center .loot-card, .intermission-center .hoard-face",
    )) {
      const r = card.getBoundingClientRect();
      if (r.left < left.right - 1) out.push("a card covers the hero column");
      if (r.right > right.left + 1) out.push("a card covers the Equipped panel");
      if (r.bottom > footer.top + 1) out.push("a card runs under the footer");
    }
    for (const button of document.querySelectorAll(".intermission-center button")) {
      if (button.getBoundingClientRect().bottom > footer.top + 1) {
        out.push("a button runs under the footer");
      }
    }
    return [...new Set(out)];
  });
}

for (const screen of [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "16:10", width: 1280, height: 800 },
]) {
  test(`the richest Boss Hoard fits on ${screen.name}`, async ({ page }) => {
    await page.setViewportSize(screen);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedSave(page, saveRichLoot("hoard"));
    await page.goto("/");
    await page.getByRole("button", { name: /Continue/ }).click();
    const cards = page.getByTestId("hoard-card");
    await expect(cards).toHaveCount(6);
    // Every card in full next to the Hoard, the long Uniques too.
    for (let i = 0; i < 6; i++) {
      // A plain click event: with the arena drawing behind the Hoard, Playwright's own click can
      // wait seconds per card for a quiet frame (scroll into view, stable box).
      await cards.nth(i).dispatchEvent("click");
      await expect(cards.nth(i)).toHaveAttribute("aria-pressed", "true");
      expect(await lootOverlaps(page), `Hoard card ${i + 1}`).toEqual([]);
    }
  });

  test(`the richest item pick fits on ${screen.name}`, async ({ page }) => {
    await page.setViewportSize(screen);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedSave(page, saveRichLoot("pick"));
    await page.goto("/");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByTestId("item-card")).toHaveCount(3);
    expect(await lootOverlaps(page)).toEqual([]);
    await expect(page.getByRole("button", { name: /Salvage All/ })).toBeVisible();
  });
}

test("Ember Shrine: steal one of three Boons, it shows under the hero in the next fight", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveShrine());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  // The Waymark won before the boss shows its Hearth Embers.
  await expect(page.getByTestId("notification-hearth")).toContainText("Hearth Embers");
  const hall = page.getByRole("region", { name: "Intermission" });
  await expect(hall).toContainText("EMBER SHRINE");
  await expect(page.getByTestId("shrine").locator(".boon-card")).toHaveCount(3);
  // Brutality is held already: taking it again raises it to rank II.
  await expect(page.getByTestId("boon-brutality")).toContainText("+15 % Physical Damage");
  await expect(page.getByRole("button", { name: /NEXT STAGE/ })).toBeDisabled();
  await page.getByTestId("boon-crushing-blow").click();
  await expect(page.getByTestId("done-card")).toContainText("Boon: Crushing Blow");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(
    page.getByRole("region", { name: "Battle" }).getByTestId("boon-bar").locator(".boon-chip"),
  ).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("Ember Thief: a countdown shows how long until it runs off", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveThiefFight());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  const battle = page.getByRole("region", { name: "Battle" });
  await expect(battle).toContainText("Ember Thief");
  await expect(page.getByTestId("thief-timer")).toContainText(/Flees in \d+s/);
  expect(errors).toEqual([]);
});

test("Bounty: a done bounty is turned in at Eldrin, the item goes into the inventory", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveBountyDone());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByLabel("Bounty done").first()).toBeVisible();
  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  const note = page.getByLabel("Bounty", { exact: true });
  await expect(note).toContainText("BOUNTY DONE · ELITE HUNT");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bounty-done.png` });
  await note.getByRole("button", { name: "Turn In" }).click();
  await expect(note).toContainText("BOUNTY PAID");
  await expect(note.getByLabel("2 Ember Coal")).toBeVisible();
  await expect(note).toContainText("in your inventory");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bounty-paid.png` });
  // Eldrin hands out a new bounty for the next trip.
  await expect(page.getByLabel("Bounty done")).toHaveCount(0);
  await page.keyboard.press("Escape");
  // Wait until Eldrin's window is gone: a click during its closing animation brought the same
  // window back, paid note and all.
  await expect(page.getByLabel("Eldrin, The Road")).toHaveCount(0);
  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  await expect(page.getByLabel("Bounty", { exact: true })).toContainText("BOUNTY ·");
  expect(errors).toEqual([]);
});
