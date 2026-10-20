import { expect, test } from "@playwright/test";

test("Effect Gallery: the first and last effect of every group play without errors", async ({
  page,
}) => {
  // Each pick builds its arena again; CI runners draw slowly.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?effects");
  await expect(page.getByRole("heading", { name: "Effect Gallery" })).toBeVisible();
  const groups = page.getByRole("navigation", { name: "Gruppen" }).getByRole("button");
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).click();
    const effects = page.getByRole("list", { name: "Effekte" }).getByRole("button");
    for (const effect of [effects.first(), effects.last()]) {
      await effect.click();
      await expect(effect).toHaveAttribute("aria-pressed", "true");
    }
  }
  await page.waitForTimeout(500);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/effects.png` });
  expect(errors).toEqual([]);
});
