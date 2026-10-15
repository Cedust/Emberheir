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

test("the Supply Wagon has stash tabs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRings());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  const tabs = page.getByRole("tablist", { name: "Stash tabs" });
  const stash = page.getByRole("group", { name: "Stash" });
  const bag = page.getByRole("group", { name: "Inventory" });
  await expect(tabs.getByRole("tab")).toHaveCount(4);

  // E opens the next tab; a right-click stores into the open tab only.
  await page.keyboard.press("e");
  await expect(tabs.getByRole("tab", { name: "II", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await bag.getByTestId("grid-item").first().click({ button: "right" });
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  await tabs.getByRole("tab", { name: "I", exact: true }).click();
  await expect(stash.getByTestId("grid-item")).toHaveCount(0);

  // The wagon opens on the last tab again, and the item stays there after a reload.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  await tabs.getByRole("tab", { name: "II", exact: true }).click();
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("the Supply Wagon takes worn gear straight into the stash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRings());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  const stash = page.getByRole("group", { name: "Stash" });
  const bag = page.getByRole("group", { name: "Inventory" });
  const emptyRings = page.getByRole("button", { name: "Ring: empty" });
  const worn = page.getByRole("button", { name: /^Ring: (?!empty)/ });

  // Put both Rings on, from the bag.
  await bag.getByTestId("grid-item").first().dragTo(emptyRings.first());
  await bag.getByTestId("grid-item").first().dragTo(emptyRings.first());
  await expect(emptyRings).toHaveCount(0);

  // A right-click sends a worn Ring into the stash, dragging the other one too.
  await worn.first().click({ button: "right" });
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  await expect(emptyRings).toHaveCount(1);
  await worn.first().dragTo(stash, { targetPosition: { x: 200, y: 200 } });
  await expect(stash.getByTestId("grid-item")).toHaveCount(2);
  await expect(emptyRings).toHaveCount(2);
  await expect(bag.getByTestId("grid-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});
