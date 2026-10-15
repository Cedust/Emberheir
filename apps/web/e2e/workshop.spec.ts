import { expect, test } from "@playwright/test";
import { saveWithCodex, seedSave } from "./fixtures";

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
