import { expect, test } from "@playwright/test";
import { saveWithRings, seedSave } from "./fixtures";

test("the Supply Wagon moves items with a right-click", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRings());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  const stash = page.getByRole("group", { name: "Stash" });
  const bag = page.getByRole("group", { name: "Inventory" });
  await expect(stash.getByTestId("grid-item")).toHaveCount(0);
  const before = await bag.getByTestId("grid-item").count();

  // Right-click sends a bag item into the stash, and back again.
  await bag.getByTestId("grid-item").first().click({ button: "right" });
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  await expect(bag.getByTestId("grid-item")).toHaveCount(before - 1);
  await stash.getByTestId("grid-item").first().click({ button: "right" });
  await expect(stash.getByTestId("grid-item")).toHaveCount(0);
  expect(errors).toEqual([]);
});
