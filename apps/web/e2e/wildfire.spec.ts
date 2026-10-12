import { expect, test } from "@playwright/test";
import { saveWildfire, seedSave } from "./fixtures";

test("after The Last Ember any act burns again in the Wildfire", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWildfire());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const picker = page.getByLabel("Wildfire", { exact: true });
  await expect(picker).toContainText("Wildfire off");
  await expect(picker).toContainText("best III");
  for (let i = 0; i < 4; i++) await picker.getByRole("button", { name: "Raise Wildfire" }).click();
  await expect(picker).toContainText("Wildfire IV");
  await expect(picker.getByRole("button", { name: "Raise Wildfire" })).toBeDisabled();
  // Every act is open in the Wildfire.
  await page.getByRole("radio", { name: /Act 7/ }).click();
  await page.screenshot({ path: "test-results/wildfire-camp.png" });
  await page.getByRole("button", { name: "WILDFIRE IV · ACT 7" }).click();

  const intermission = page.getByRole("region", { name: "Intermission" });
  await expect(intermission.getByLabel("Up next")).toContainText("Wildfire IV");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/wildfire-battle.png" });
  expect(errors).toEqual([]);
});
