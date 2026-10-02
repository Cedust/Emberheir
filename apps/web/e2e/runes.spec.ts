import { expect, test } from "@playwright/test";
import { saveWithRunes, seedSave } from "./fixtures";

test("Marisha sells a socketed base, Eldrin turns three Ash into Moss", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRunes());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Marisha, Merchant" }).click();
  await page.getByRole("button", { name: "Open Shop" }).click();
  const stock = page.getByRole("radiogroup", { name: "Stock" });
  await expect(stock.locator(".offer")).toHaveCount(6);
  await stock.locator(".offer").first().locator("button").first().click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(stock.locator(".offer").first()).toContainText("Sold");

  await page.getByRole("tab", { name: /Eldrin · Runesmith/ }).click();
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
