import { expect, test } from "@playwright/test";
import { saveAtHuntFork, saveHunter, seedSave } from "./fixtures";

test("a Hunt node names its quarry, the fight shows its Trail", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtHuntFork());
  await page.goto("/?dev");
  await page.getByRole("button", { name: /Continue/ }).click();

  const paths = page.getByRole("radiogroup", { name: "Choose a path" });
  const hunt = paths.getByRole("radio", { name: "Hunt: Ashen Prowler" });
  await expect(hunt).toBeVisible();
  await expect(hunt.getByTestId("node-foe")).toContainText("Tracked · 12/25");
  // Every fight shows the enemy waiting there with its Trail.
  await expect(paths.getByRole("radio", { name: "Fight" }).getByTestId("node-foe")).toContainText(
    "Ashen Brute",
  );
  await expect(paths.getByRole("radio", { name: "Elite" }).getByTestId("node-foe")).toContainText(
    "Cornered · 110/300",
  );
  await hunt.click();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/hunt-node.png` });
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();

  const battle = page.getByRole("region", { name: "Battle" });
  await expect(battle).toContainText("Ashen Prowler");
  await expect(battle.getByTestId("hunt-chip")).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/hunt-fight.png` });
  expect(errors).toEqual([]);
});

test("a win that fills a Trail: its moment, then the card with the Hunt Affix", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtHuntFork(24));
  await page.goto("/?dev");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByRole("radiogroup", { name: "Choose a path" })
    .getByRole("radio", { name: "Hunt: Ashen Prowler" })
    .click();
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await page.getByRole("button", { name: "16×" }).click();
  await expect(page.getByTestId("trail-banner")).toHaveText(/Trail II · Hunted/i, {
    timeout: 20_000,
  });
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/hunt-trail-up.png` });
  const intermission = page.getByRole("region", { name: "Intermission" });
  await expect(intermission).toContainText(/Trail II · Hunted!/i);
  // The Hunt node always gives an item pick; one card carries a Hunt Affix of the Prowler.
  await expect(page.getByTestId("item-card")).toHaveCount(3, { timeout: 15_000 });
  await expect(page.getByTestId("hunt-ribbon")).toHaveCount(1);
  await expect(page.locator(".ib-lines li.hunt")).toHaveCount(1);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/hunt-ribbon.png` });
  expect(errors).toEqual([]);
});

test("the Bestiary at the Hearthfire shows every enemy's Trail", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveHunter());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page
    .getByRole("button", { name: /Hearthfire/ })
    .first()
    .click();
  await page.getByRole("tab", { name: /Collections/ }).click();
  await page.getByLabel("Collections").getByLabel("Bestiary").click();
  const bestiary = page.getByTestId("bestiary");
  await expect(bestiary).toBeVisible();
  await bestiary.getByTestId("bestiary-cinder-caster").click();
  await expect(bestiary).toContainText(/Trail III · Cornered/i);
  await expect(bestiary).toContainText("Elemental Damage, Chance to Burn");
  // The Rotwood's enemies are not tracked yet: shadows.
  await expect(bestiary.getByTestId("bestiary-barkhide")).toHaveAttribute(
    "aria-label",
    "Not tracked yet",
  );
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bestiary.png` });
  expect(errors).toEqual([]);
});
