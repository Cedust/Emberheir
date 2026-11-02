import { expect, test } from "@playwright/test";
import { saveWithCodex, seedSave } from "./fixtures";

test("each kind of sound switches off on its own and stays off", async ({ page }) => {
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Sound" }).click();
  const hoverOff = page
    .getByRole("radiogroup", { name: "Hover" })
    .getByRole("radio", { name: "Off" });
  await hoverOff.click();
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("40");
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Sound" }).click();
  await expect(hoverOff).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("radiogroup", { name: "Clicks" }).getByRole("radio", { name: "On" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("slider", { name: "Volume", exact: true })).toHaveValue("40");
});

test("Music has its own switch and volume, apart from Sound", async ({ page }) => {
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Sound" }).click();
  await page.getByRole("slider", { name: "Music Volume" }).fill("70");
  await page.getByRole("radiogroup", { name: "Music" }).getByRole("radio", { name: "Off" }).click();
  await expect(page.getByRole("slider", { name: "Music Volume" })).toBeDisabled();
  await expect(page.getByRole("slider", { name: "Volume", exact: true })).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("tab", { name: "Sound" }).click();
  await expect(page.getByRole("slider", { name: "Music Volume" })).toHaveValue("70");
});
