import { expect, test } from "@playwright/test";
import { saveWithRings, seedSave } from "./fixtures";

test("Rings aim at the other slot, items drag & drop, discard gives nothing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithRings());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "Character" });
  const grid = dialog.getByRole("group", { name: "Inventory grid" });
  const ringA = grid.getByTestId("grid-item").first();

  // The shortcut aims Equip at Ring 2 although Ring 1 is free.
  await ringA.click();
  const ringSwitch = dialog.getByTestId("ring-switch");
  await expect(ringSwitch.locator(".on")).toHaveText("Ring 1");
  await ringSwitch.click();
  await expect(ringSwitch.locator(".on")).toHaveText("Ring 2");
  await dialog.getByRole("button", { name: "Equip", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /^Ring: / }).nth(1)).not.toHaveAccessibleName(
    "Ring: empty",
  );
  await expect(dialog.getByRole("button", { name: "Ring: empty" })).toHaveCount(1);

  // Drag the Sword inside the grid, then the other Ring onto the free Ring slot.
  const sword = grid.getByTestId("grid-item").nth(1);
  // The stage is scaled: aim at column 7 by the grid's real size, grab the Sword's top cell.
  const box = (await grid.boundingBox()) ?? { width: 440, height: 176 };
  await sword.dragTo(grid, {
    sourcePosition: { x: 4, y: 4 },
    targetPosition: { x: (box.width / 10) * 6.5, y: (box.height / 4) * 0.5 },
  });
  await expect(grid.getByTestId("grid-item").last()).toHaveCSS("left", `${44 * 6}px`);
  await grid
    .getByTestId("grid-item")
    .first()
    .dragTo(dialog.getByRole("button", { name: "Ring: empty" }));
  await expect(dialog.getByRole("button", { name: "Ring: empty" })).toHaveCount(0);

  // Discard asks once more and gives no Dust.
  const dust = await dialog.locator(".w-dust b").textContent();
  await grid.getByTestId("grid-item").first().click();
  await dialog.getByRole("button", { name: "Discard" }).click();
  await dialog.getByRole("button", { name: "Really discard?" }).click();
  await expect(grid.getByTestId("grid-item")).toHaveCount(0);
  await expect(dialog.locator(".w-dust b")).toHaveText(dust ?? "");
  expect(errors).toEqual([]);
});
