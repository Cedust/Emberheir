import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("the UI kit preview shows every piece and Q/E flip its tabs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?uikit");
  const tabs = page.getByRole("tablist", { name: "Kit pages" });
  await expect(tabs.getByRole("tab", { name: /Window/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("e");
  await expect(tabs.getByRole("tab", { name: /Buttons/ })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Ash: 380").hover();
  await expect(page.getByTestId("note-tooltip")).toContainText("craft with it");
  await page.keyboard.press("q");
  await page.keyboard.press("q");
  await expect(tabs.getByRole("tab", { name: /Items/ })).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

test("one key scheme in the Camp: B, L, Q/E and Esc", async ({ page }) => {
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.keyboard.press("b");
  const kaelen = page.getByRole("dialog", { name: "Kaelen" });
  await expect(kaelen.getByRole("tab", { name: "Battle Plan" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("q");
  await expect(kaelen.getByRole("tab", { name: "Heirloom" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(kaelen).toHaveCount(0);

  await page.keyboard.press("l");
  await page.keyboard.press("e");
  await expect(page.getByRole("tab", { name: /Collections/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
  await expect(page.getByRole("dialog", { name: "Character" })).toBeVisible();
});

test("the UI kit's Items page shows every icon inside its frames", async ({ page }) => {
  await page.goto("/?uikit");
  await page.getByRole("tab", { name: /Items/ }).click();
  const items = page.getByTestId("kit-item");
  await expect(items.first()).toBeVisible();
  // In every painted socket the icon stays inside the brass rim.
  const outside = await page.$$eval(
    ".kit-item .item-tile",
    (tiles) =>
      tiles.filter((tile) => {
        const art = tile.querySelector(".item-art");
        if (!art) return false;
        const rim = parseFloat(getComputedStyle(tile).getPropertyValue("--rim")) || 11;
        const t = tile.getBoundingClientRect();
        const a = art.getBoundingClientRect();
        const k = t.width / (tile as HTMLElement).offsetWidth;
        return (
          a.left < t.left + rim * k - 0.5 ||
          a.right > t.right - rim * k + 0.5 ||
          a.top < t.top + rim * k - 0.5 ||
          a.bottom > t.bottom - rim * k + 0.5
        );
      }).length,
  );
  expect(outside).toBe(0);
});
