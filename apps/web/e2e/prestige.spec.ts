import { expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, seedSave } from "./fixtures";

test("The harvest boss falls: seal a slot, let it burn, wake as the next generation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterHarvestBoss());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("region", { name: "Victory" })).toContainText("GORRAK FALLS");
  await page.getByRole("button", { name: "Hold On to What Matters" }).click();

  const seal = page.getByRole("region", { name: "The Harvest Begins" });
  await expect(seal).toBeVisible();
  await expect(page.getByTestId("seal-text")).toHaveText("1 Seal left to place");
  await seal.getByRole("button", { name: /^Body Armor:/ }).click();
  await seal.getByRole("button", { name: "Seal This Slot" }).click();
  await expect(page.getByTestId("seal-text")).toContainText("All Seals placed");
  await expect(seal).toContainText("1 sealed item (Heirlooms)");
  await page.getByRole("button", { name: "Let It Burn" }).click();

  const heir = page.getByRole("region", { name: "Inheritance" });
  await expect(heir).toContainText("GENERATION 2");
  await expect(heir).toContainText("Rotation Slot 2");
  await expect(heir).toContainText("NEW ACT");
  await expect(heir).toContainText("Rotwood");
  await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();

  // A reload keeps the new generation.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  const camp = page.getByRole("region", { name: "Camp" });
  await expect(camp).toContainText("Generation 2");

  await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
  await page.getByRole("button", { name: "Open Legacy" }).click();
  const legacy = page.getByRole("region", { name: "Legacy" });
  await expect(legacy).toContainText("1 / 10 Heirlooms");
  await expect(legacy).toContainText("Sealed the Body Armor.");
  await page.keyboard.press("Escape");

  // The Supply Wagon burned; Rotation Slot 2 is open at Kaelen.
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  await page.getByRole("button", { name: "Open Stash" }).click();
  await expect(page.getByRole("note")).toContainText("Burned in the harvest");
  await page.keyboard.press("Escape");
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Battle Plan" }).click();
  await expect(page.getByRole("button", { name: "Rotation Slot 2" })).toBeEnabled();
  expect(errors).toEqual([]);
});
