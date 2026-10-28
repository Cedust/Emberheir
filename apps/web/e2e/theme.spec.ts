import { type Page, expect, test } from "@playwright/test";
import { saveCrafting, seedSave } from "./fixtures";

/** Relative luminance (0 dark … 1 light) of an element's background color. */
async function backgroundLight(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const m = /rgba?\((\d+),? (\d+),? (\d+)/.exec(getComputedStyle(el).backgroundColor);
      if (!m) return 0;
      return (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
    });
}

test("light mode keeps the Character Sheet's plaques and Eldrin's Omens on parchment", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await seedSave(page, saveCrafting());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  await sheet.getByRole("tab", { name: "Stats" }).click();
  expect(await backgroundLight(page, ".hero-card")).toBeGreaterThan(0.6);
  expect(await backgroundLight(page, ".stat-pages")).toBeGreaterThan(0.6);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/stats-light.png` });

  // Dark mode keeps the dark plaques.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => backgroundLight(page, ".stat-pages")).toBeLessThan(0.3);
  await page.emulateMedia({ colorScheme: "light" });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  expect(await backgroundLight(page, ".omen-choice")).toBeGreaterThan(0.6);
});
