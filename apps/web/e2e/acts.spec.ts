import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("after Gorrak the road leads on: pick an act and set out", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const camp = page.getByRole("region", { name: "Camp" });
  await expect(camp).toContainText("Camp at the Rotwood");
  const road = page.getByRole("radiogroup");
  await expect(road.getByRole("radio")).toHaveCount(2);
  await expect(road.getByRole("radio", { name: /Rotwood/ })).toBeChecked();

  // Revisit Act 1, then go on to the Rotwood.
  await road.getByRole("radio", { name: /Ashen Fields/ }).click();
  await expect(page.getByRole("button", { name: /SET OUT · ACT 1/i })).toBeVisible();
  await road.getByRole("radio", { name: /Rotwood/ }).click();
  await page.getByRole("button", { name: /SET OUT · ACT 2/i }).click();
  await expect(page.getByRole("region", { name: "Intermission" })).toContainText("Rotwood");
  expect(errors).toEqual([]);
});
