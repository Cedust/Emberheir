import { expect, test } from "@playwright/test";

test("Effect Gallery: every battle effect plays without errors", async ({ page }) => {
  // About a hundred effects, each building its arena: longer than the default test time.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?effects");
  await expect(page.getByRole("heading", { name: "Effect Gallery" })).toBeVisible();
  const groups = page.getByRole("navigation", { name: "Gruppen" }).getByRole("button");
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).click();
    const effects = page.getByRole("list", { name: "Effekte" }).getByRole("button");
    for (let i = 0; i < (await effects.count()); i++) {
      await effects.nth(i).click();
      await expect(effects.nth(i)).toHaveAttribute("aria-pressed", "true");
    }
  }
  await page.waitForTimeout(500);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/effects.png` });
  expect(errors).toEqual([]);
});
