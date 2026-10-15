import { expect, test } from "@playwright/test";
import { saveBeforeGatekeeper, seedSave } from "./fixtures";

test("a Gatekeeper guards the Waymark of the newest act", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveBeforeGatekeeper());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const intermission = page.getByRole("region", { name: "Intermission" });
  await expect(intermission.getByLabel("Up next")).toContainText("Gatekeeper");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  const plaque = page.getByLabel(/plaque$/).last();
  await expect(plaque.getByText("GATEKEEPER")).toBeVisible();
  await page.screenshot({ path: "test-results/gatekeeper.png" });
  expect(errors).toEqual([]);
});
