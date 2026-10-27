import { expect, test } from "@playwright/test";
import { saveBossHoard, saveBountyDone, saveShrine, saveThiefFight, seedSave } from "./fixtures";

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
  await expect(page.getByRole("status")).toContainText("Thornsong");
  // The act's Home Rune shows as such (act-beute-entwurf-v1.md).
  const drops = page.getByTestId("rune-drops");
  await expect(drops).toContainText("Moss Rune");
  await expect(drops.locator(".rune-drop.home")).toContainText("Thorn Rune");
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

test("Ember Shrine: steal one of three Boons, it shows under the hero in the next fight", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveShrine());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  // The Waymark won before the boss shows its Hearth Embers.
  await expect(page.getByRole("status").filter({ hasText: "Hearth Embers" })).toBeVisible();
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

test("Bounty: a done bounty opens Eldrin's Cache, one item goes into the inventory", async ({
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
  const cache = page.getByLabel("Eldrin's Cache");
  await expect(cache).toContainText("ELDRIN'S CACHE · ELITE HUNT");
  await expect(cache.getByLabel(/Ember Coal/)).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bounty-cache.png` });
  // Taking one card closes the Cache; the other cards turn to Ash.
  await cache
    .getByRole("button", { name: /^Take: / })
    .first()
    .click();
  await expect(cache).toHaveCount(0);
  // Eldrin offers two new bounties for the next trip.
  await expect(page.getByLabel("Bounty done")).toHaveCount(0);
  const offer = page.getByRole("radiogroup", { name: "Bounty" });
  await expect(offer.getByRole("radio")).toHaveCount(2);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bounty-offer.png` });
  await page.keyboard.press("Escape");
  // Wait until Eldrin's window is gone: a click during its closing animation brought the same
  // window back, paid note and all.
  await expect(page.getByLabel("Eldrin, The Road")).toHaveCount(0);
  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  await expect(page.getByRole("radiogroup", { name: "Bounty" })).toContainText("BOUNTY ·");
  expect(errors).toEqual([]);
});
