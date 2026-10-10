import { expect, test } from "@playwright/test";
import { saveWithRunes, seedSave } from "./fixtures";

test("Marisha gambles a ring, Nyssa turns three Ash into Moss", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRunes());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Marisha, Black Market" }).click();
  await page.getByRole("button", { name: "Open Shop" }).click();
  await page
    .getByRole("radiogroup", { name: "Gamble slot" })
    .getByRole("radio", { name: "Ring" })
    .click();
  await page.locator(".cost-bar").getByRole("button", { name: "Gamble" }).click();
  await expect(page.locator(".gamble-last")).toBeVisible();

  await page.getByRole("tab", { name: /Nyssa · Runesmith/ }).click();
  await page
    .getByRole("button", { name: /Combine Runes/ })
    .first()
    .click();
  const runes = page.getByRole("radiogroup", { name: "Runes" });
  await runes.getByRole("radio", { name: /^Ash/ }).click();
  await page.locator(".cost-bar").getByRole("button", { name: "Combine Runes" }).click();
  await expect(runes.getByRole("radio", { name: /^Moss/ })).toContainText("1/3");
  await expect(runes.getByRole("radio", { name: /^Ash/ })).toContainText("0/3");
  expect(errors).toEqual([]);
});
