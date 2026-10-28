import { expect, test } from "@playwright/test";
import { saveCrafting, saveWithCodex, seedSave } from "./fixtures";

test("a right-click puts an item on Thoric's Anvil; Salvage is held and sparks fly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
  const services = page.getByRole("group", { name: "Services" });
  await services.getByRole("button", { name: "Salvage" }).click();
  // The worn shield waits on the Anvil until another item comes.
  await expect(page.getByTestId("craft-now")).toContainText("Round Shield");
  await page
    .getByRole("group", { name: "Inventory" })
    .getByTestId("grid-item")
    .first()
    .click({ button: "right" });
  await expect(page.getByTestId("craft-now")).toContainText("Sturdy Iron Ring");
  await expect(page.locator(".cost-bar").getByLabel(/^\+\d+ Ash$/)).toBeVisible();

  await page.locator(".cost-bar").getByRole("button", { name: "Salvage" }).hover();
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await expect(page.getByRole("status")).toContainText("Salvaged Sturdy Iron Ring");
  await expect(page.locator(".workbench-fx")).toHaveAttribute("data-pulse", "1");
  await expect(page.getByRole("group", { name: "Inventory" }).getByTestId("grid-item")).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
});

test("the crafters say something new when poked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
  const bubble = page.locator(".persona-quote");
  const first = await bubble.innerText();
  expect(first.length).toBeGreaterThan(4);
  await page.getByRole("button", { name: "Thoric", exact: true }).click();
  await expect(bubble).not.toHaveText(first);
  expect(errors).toEqual([]);
});

test("Liora's Temper offers two choices; Thoric's Reforge keeps the trigger", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveCrafting());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Liora, Mystic" }).click();
  await page
    .getByRole("group", { name: "Services" })
    .getByRole("button", { name: "Temper" })
    .click();
  await page.getByRole("button", { name: "Lucky Iron Ring" }).click();
  await page.getByTestId("craft-now").locator(".affix-line").nth(1).click();
  await page.locator(".cost-bar").getByRole("button", { name: "Temper" }).click();
  const offer = page.getByTestId("temper-offer");
  await expect(offer.locator(".temper-tile")).toHaveCount(3);
  await expect(offer).toContainText("KEEP");
  await expect(offer).not.toContainText("Lucky Iron Ring");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/temper-offer.png` });
  // The old affix sits on top and is picked; an offer is picked, then confirmed.
  await expect(offer.locator(".temper-tile").first()).toHaveAttribute("aria-pressed", "true");
  await offer.locator(".temper-tile").nth(1).click();
  await page.locator(".cost-bar").getByRole("button", { name: "Choose" }).click();
  await expect(page.getByRole("status")).toContainText("→");
  await expect(offer).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
  await page
    .getByRole("group", { name: "Services" })
    .getByRole("button", { name: "Reforge" })
    .click();
  await page.getByRole("button", { name: "Lucky Iron Ring" }).click();
  await expect(page.locator(".craft-card").last()).toContainText("STAYS");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/reforge-keeps.png` });
  await page.locator(".cost-bar").getByRole("button", { name: "Reforge" }).click();
  await expect(page.getByTestId("craft-now")).toContainText("Life below 35 %");
  expect(errors).toEqual([]);
});
