import { expect, test } from "@playwright/test";
import { saveMastery, seedSave } from "./fixtures";

test("Weapon Mastery: the painted weapon, its points, a Keystone and the Echo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveMastery());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Weapon Mastery" }).click();

  await expect(page.getByTestId("mastery-canvas").locator("canvas")).toBeVisible();
  const plate = page.getByTestId("weapon-name");
  await expect(plate).toContainText("ASCENDANT · RANK 13");
  await expect(plate).toContainText("Ascendant Sword of Ashfall Wrath");
  await expect(page.getByTestId("mastery-points")).toContainText("3 Mastery Points");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/mastery.png` });
  }

  // Two more points open the Keystone ring; the Keystone names the weapon.
  const tree = page.getByRole("group", { name: "Weapon Mastery" });
  const detail = page.getByRole("region", { name: "Node details" });
  for (const node of ["Steady Hand", "Balance"]) {
    await tree.getByRole("button", { name: node }).press("Enter");
    await detail.getByRole("button", { name: /Learn/ }).click();
  }
  await tree.getByRole("button", { name: "Perfect Parry" }).press("Enter");
  await detail.getByRole("button", { name: /Choose/ }).click();
  await expect(plate).toContainText("Ascendant Parrying Blade of Ashfall Wrath");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByTestId("mastery-points")).toContainText("0 Mastery Points");

  // Another Echo.
  const echo = page.getByRole("region", { name: "Echo" });
  await echo.getByRole("button", { name: /Whispering Brood/ }).click();
  await expect(plate).toContainText("of Whispering Brood");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/mastery-keystone.png` });
  }
  expect(errors).toEqual([]);
});
