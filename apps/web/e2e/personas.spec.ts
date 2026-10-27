import { expect, test } from "@playwright/test";
import { saveFirstCamp, seedSave } from "./fixtures";

test("the first Camp holds only Nan, Thoric and Eldrin; Marisha's Story Blip shows once", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveFirstCamp(["marisha-1"]));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const blip = page.getByRole("dialog", { name: "Marisha, Black Market" });
  await expect(blip).toBeVisible();
  await expect(blip).toContainText("A customer!");
  if (process.env.SHOTS) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${process.env.SHOTS}/story-blip.png` });
  }
  await blip.getByRole("button", { name: /Show me/ }).click();
  await expect(blip).toBeHidden();
  await expect(page.locator(".blip-stage")).toHaveCount(0);

  await expect(page.getByRole("button", { name: /Thoric/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Old Nan/ })).toBeVisible();
  for (const name of [/Marisha/, /Kaelen/, /Training Dummy/, /Liora/, /Nyssa/]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/first-camp.png` });
  // Reloaded, the scene stays gone.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("button", { name: /Thoric/ })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Marisha, Black Market" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
