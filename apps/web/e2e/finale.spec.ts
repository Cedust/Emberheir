import { expect, test } from "@playwright/test";
import { saveBeforeFinalPrestige, saveEnding, saveFinaleCamp, seedSave } from "./fixtures";

test("Final Prestige: nothing burns, the Inheritance points to The Last Ember", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveBeforeFinalPrestige());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("region", { name: "Victory" })).toContainText("nothing burns");
  await page.getByRole("button", { name: "Keep Everything" }).click();
  // The last branch and the last Harvest points, then the Inheritance.
  await page.getByRole("button", { name: /^(Take|Deepen) / }).click();
  await expect(page.getByRole("region", { name: "Attributes" })).toBeVisible();
  await page.getByRole("button", { name: "Keep Everything" }).click();
  const heir = page.getByRole("region", { name: "Inheritance" });
  await expect(heir).toContainText("THE LAST EMBER");
  await expect(heir).toContainText("Everything you own is yours to keep");
  await heir.getByRole("button", { name: "Wake at the Hearthfire" }).click();
  await expect(page.getByRole("button", { name: /THE LAST EMBER/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("The Last Ember: the gauntlet starts with Gorrak's echo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveFinaleCamp());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: /THE LAST EMBER/ }).click();
  const hall = page.getByRole("region", { name: "Intermission" });
  await expect(hall).toContainText("The Last Ember");
  await expect(page.getByRole("region", { name: "Up next" })).toContainText(
    "Echo of Gorrak, the Pit Brute",
  );
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  const battle = page.getByRole("region", { name: "Battle" });
  await expect(battle).toContainText("Echo of Gorrak, the Pit Brute");
  await expect(battle).toContainText("Warden Echo");
  expect(errors).toEqual([]);
});

test("Ending: Old Nan gets her quiet, then back to the Camp", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveEnding());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const end = page.getByRole("status", { name: "The End" });
  await expect(end).toContainText("THE FIRE IS HOME");
  await expect(end).toContainText("remember my name after all");
  await expect(end).toContainText("2,841");
  await end.getByRole("button", { name: "Back to the Hearthfire" }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();
  expect(errors).toEqual([]);
});
