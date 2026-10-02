import { type Page, expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, seedSave } from "./fixtures";

/**
 * Resolution independence: the game fills the whole window, nothing scrolls, and 1080p and 4K
 * show the same picture (positions scale exactly with the screen height).
 */
const SCREENS = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "1440p", width: 2560, height: 1440 },
  { name: "4K", width: 3840, height: 2160 },
  { name: "16:10", width: 1680, height: 1050 },
  { name: "21:9", width: 2560, height: 1080 },
  { name: "laptop", width: 1366, height: 768 },
];

/** Problems on the current screen: page scroll, a scrolling panel or a stage that misses the window. */
async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1) {
      out.push("the page scrolls");
    }
    const stage = document.querySelector(".stage");
    if (!stage) return ["no stage"];
    const r = stage.getBoundingClientRect();
    if (Math.abs(r.width - innerWidth) > 1 || Math.abs(r.height - innerHeight) > 1) {
      out.push(`stage ${Math.round(r.width)}×${Math.round(r.height)} does not fill the window`);
    }
    for (const el of stage.querySelectorAll<HTMLElement>("*")) {
      const cs = getComputedStyle(el);
      const scrolls = /(auto|scroll)/.test(cs.overflowX + cs.overflowY);
      if (
        scrolls &&
        (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      ) {
        out.push(`.${el.className} scrolls`);
      }
    }
    return out;
  });
}

async function newGame(page: Page) {
  // A fixed new-game seed, so the first fight always plays out the same way.
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/?dev");
  expect(await layoutProblems(page), "title").toEqual([]);
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /^Sword/ }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();
}

for (const screen of SCREENS) {
  test(`${screen.name}: every main view fits without scrolling`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await newGame(page);
    const check = async (view: string) =>
      expect(await layoutProblems(page), `${screen.name} ${view}`).toEqual([]);

    await check("camp");
    await page.keyboard.press("c");
    await expect(page.getByRole("dialog", { name: "Character" })).toBeVisible();
    await check("character");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
    await page.getByRole("button", { name: "Open Forge" }).click();
    await check("forge");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
    await page.getByRole("button", { name: "Open Stash" }).click();
    await check("stash");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Marisha, Merchant" }).click();
    await page.getByRole("button", { name: "Open Shop" }).click();
    await check("shop");
    await page.getByRole("button", { name: /^Gamble/ }).click();
    await check("gamble");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /SET OUT/ }).click();
    await expect(page.getByRole("region", { name: "Intermission" })).toBeVisible();
    await check("intermission");
    await page.getByRole("button", { name: /NEXT STAGE/ }).click();
    await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
    await check("battle");
    await page.getByRole("button", { name: "Skip fight" }).click();
    await expect(page.getByTestId("item-card")).toHaveCount(3);
    await check("rewards");
    expect(errors).toEqual([]);
  });
}

test("1080p and 4K show the same picture", async ({ page }) => {
  const at = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    // The stage rescales on the resize event; measure once it fills the new window.
    await expect
      .poll(() =>
        page.evaluate(() => document.querySelector(".stage")?.getBoundingClientRect().width),
      )
      .toBeCloseTo(width, 0);
    await expect(page.getByRole("button", { name: /SET OUT/ })).toBeVisible();
    const box = await page.getByRole("button", { name: /SET OUT/ }).boundingBox();
    if (!box) throw new Error("no SET OUT button");
    return [box.x / width, box.y / height, box.width / width, box.height / height];
  };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await newGame(page);
  const fullHd = await at(1920, 1080);
  const uhd = await at(3840, 2160);
  fullHd.forEach((v, i) => expect(uhd[i]).toBeCloseTo(v, 3));
});

for (const screen of SCREENS) {
  test(`${screen.name}: the Prestige flow and Legacy fit without scrolling`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await seedSave(page, saveAfterHarvestBoss());
    await page.goto("/");
    await page.getByRole("button", { name: /Continue/ }).click();
    const check = async (view: string) =>
      expect(await layoutProblems(page), `${screen.name} ${view}`).toEqual([]);

    await expect(page.getByRole("region", { name: "Victory" })).toBeVisible();
    await check("victory");
    await page.getByRole("button", { name: "Hold On to What Matters" }).click();
    await check("seal");
    await page.getByRole("button", { name: /^Body Armor:/ }).click();
    await page.getByRole("button", { name: "Seal This Slot" }).click();
    await page.getByRole("button", { name: "Let It Burn" }).click();
    await expect(page.getByRole("region", { name: "Inheritance" })).toBeVisible();
    await check("inheritance");
    await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();
    await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
    await page.getByRole("button", { name: "Open Legacy" }).click();
    await expect(page.getByRole("region", { name: "Legacy" })).toBeVisible();
    await check("legacy");
    expect(errors).toEqual([]);
  });
}
