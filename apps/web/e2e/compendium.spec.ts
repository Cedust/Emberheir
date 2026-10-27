import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("the Compendium unfolds a chapter's pages and hides what the Heir has not seen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Old Nan, Hearthkeeper" }).click();
  await page.getByRole("button", { name: "Compendium" }).click();
  const book = page.getByRole("dialog", { name: "Compendium" });
  await expect(book.getByRole("heading", { name: "Runs and Acts" })).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/compendium.png` });

  // Picking a chapter unfolds its pages and opens the first one; the others fold away.
  const loot = book.getByRole("button", { name: "Loot" });
  await loot.click();
  await expect(loot).toHaveAttribute("aria-expanded", "true");
  await expect(book.getByRole("button", { name: "The Journey" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(book.getByRole("heading", { name: "Item Picks" })).toBeVisible();
  await book.getByRole("button", { name: "Currencies" }).click();
  await expect(book.getByRole("heading", { name: "Currencies" })).toBeVisible();
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/compendium-currencies.png` });

  // The arrow keys turn the pages, across chapters too.
  await page.keyboard.press("ArrowDown");
  await expect(book.getByRole("heading", { name: "Enemy Types" })).toBeVisible();
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/compendium-enemies.png` });

  await book.getByRole("button", { name: "Your Heir" }).click();
  await book.getByRole("button", { name: "Attributes" }).click();
  if (process.env.SHOTS)
    await page.screenshot({ path: `${process.env.SHOTS}/compendium-attributes.png` });

  // Run 2: Omens are known, the finale is not.
  await book.getByRole("button", { name: "The Journey" }).click();
  await expect(book.getByRole("button", { name: "Omens" })).toBeVisible();
  await expect(book.getByRole("button", { name: "Beyond the Harvest" })).toHaveCount(0);
  await expect(book.getByRole("button", { name: "Locked" })).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(book).toHaveCount(0);
  expect(errors).toEqual([]);
});
