import { expect, test } from "@playwright/test";
import { saveWithCodex, seedSave } from "./fixtures";

test("each kind of sound switches off on its own and stays off", async ({ page }) => {
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  const hoverOff = page
    .getByRole("radiogroup", { name: "Hover" })
    .getByRole("radio", { name: "Off" });
  await hoverOff.click();
  await page.getByRole("slider", { name: "Volume" }).fill("40");
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(hoverOff).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("radiogroup", { name: "Clicks" }).getByRole("radio", { name: "On" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("slider", { name: "Volume" })).toHaveValue("40");
});
