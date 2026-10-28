import { type Locator, type Page, expect, test } from "@playwright/test";
import { saveWithRings, seedSave } from "./fixtures";

// An iPad Pro 11" in landscape (tablet-plan-v1.md): fingers instead of a mouse.
test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true, isMobile: true });

/** Holds a finger on the middle of `target` for a long press. */
async function longPress(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error("nothing to press");
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(700);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function openWagon(page: Page) {
  await seedSave(page, saveWithRings());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).tap();
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).tap();
  return {
    stash: page.getByRole("group", { name: "Stash" }),
    bag: page.getByRole("group", { name: "Inventory" }),
  };
}

test("a long press shows an item's tooltip, its button moves the item", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { stash, bag } = await openWagon(page);
  await expect(page.locator("html")).toHaveAttribute("data-input", "touch");
  const before = await bag.getByTestId("grid-item").count();

  await longPress(page, bag.getByTestId("grid-item").first());
  const tip = page.getByTestId("item-tooltip");
  await expect(tip).toBeVisible();
  // Key caps mean nothing without a keyboard.
  await expect(tip.getByText("Right-click")).toBeHidden();
  await tip.getByTestId("tip-action").tap();
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  await expect(bag.getByTestId("grid-item")).toHaveCount(before - 1);
  await expect(tip).toBeHidden();

  // The next tap outside closes a tooltip a long press opened.
  await longPress(page, stash.getByTestId("grid-item").first());
  await expect(tip).toBeVisible();
  await page.getByRole("tablist", { name: "Stash tabs" }).tap({ position: { x: 4, y: 4 } });
  await expect(tip).toBeHidden();
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("tapping an item picks it up, tapping a free spot puts it down", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { stash, bag } = await openWagon(page);
  const before = await bag.getByTestId("grid-item").count();

  await bag.getByTestId("grid-item").first().tap();
  await stash.tap({ position: { x: 30, y: 30 } });
  await expect(stash.getByTestId("grid-item")).toHaveCount(1);
  await expect(bag.getByTestId("grid-item")).toHaveCount(before - 1);
  expect(errors).toEqual([]);
});

test("an upright tablet asks to be turned sideways", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/");
  await expect(page.getByText("Turn your tablet sideways")).toBeVisible();
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(page.getByText("Turn your tablet sideways")).toBeHidden();
});
