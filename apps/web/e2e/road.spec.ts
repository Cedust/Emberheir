import { expect, test } from "@playwright/test";
import { saveAfterAct1, saveAtFork, seedSave } from "./fixtures";

test("a fork of the road: the path is chosen in the Intermission", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtFork());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const paths = page.getByRole("radiogroup", { name: "Choose a path" });
  await expect(paths).toBeVisible();
  // The Shrine path is taken when none is chosen.
  await expect(paths.getByRole("radio", { name: "Shrine" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await paths.getByRole("radio", { name: "Hearth" }).click();
  await expect(paths.getByRole("radio", { name: "Hearth" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByLabel("Up next")).toContainText("+25 % Life");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/route-choice.png` });
  expect(errors).toEqual([]);
});

test("Kaelen's Training Dummy measures the build", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Training Dummy" }).click();
  await expect(page.getByTestId("dummy-dps")).toHaveText(/\d/);
  await page.getByRole("radio", { name: "Striking" }).click();
  await expect(page.getByRole("region", { name: "Dummy numbers" })).toContainText("Damage taken");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/training-dummy.png` });
  expect(errors).toEqual([]);
});
