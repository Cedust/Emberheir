import { expect, test } from "@playwright/test";
import { saveDeepTree, seedSave } from "./fixtures";

test("the Battle Plan has no dropdowns: skills, sockets, Heat slider and conditions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveDeepTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Battle Plan" }).click();
  await expect(page.locator(".plan-layout select")).toHaveCount(0);

  // Pick a slot, then a skill from the library.
  const slot2 = page.getByTestId("rotation-slot-1");
  // A slot that repeats an earlier slot's skill is skipped in the fight, so it shows as Empty.
  await expect(slot2).toContainText("Empty");
  await expect(page.getByText("Upgrades")).toHaveCount(0);
  await slot2.getByRole("button", { name: "Rotation Slot 2" }).click();
  const skills = page.getByRole("region", { name: "Skills" });
  await skills.getByRole("button", { name: /^Flurry/ }).click();
  await expect(slot2).toContainText("Flurry");

  // Drag a skill onto a Reaction Slot.
  await skills
    .getByRole("button", { name: /^Iron Bastion/ })
    .dragTo(page.getByRole("button", { name: "Reaction Slot 1" }));
  await expect(page.getByTestId("reaction-slot-0")).toContainText("Iron Bastion");
  await expect(page.getByTestId("reaction-slot-0")).toContainText("Life below 50 %");

  // A Modifier socket opens the Modifiers in the library.
  await slot2.getByRole("button", { name: "Modifier 1" }).click();
  await page
    .getByRole("region", { name: "Modifiers" })
    .getByRole("button", { name: /^Thrifty/ })
    .click();
  await expect(slot2.getByRole("button", { name: "Thrifty" })).toBeVisible();

  // The condition chip opens "Only if".
  await slot2.getByRole("button", { name: "Only if", exact: true }).click();
  await page
    .getByRole("region", { name: "Only if" })
    .getByRole("button", { name: "Enemy below 50 %" })
    .click();
  await expect(slot2.getByRole("button", { name: "Only if: Enemy below 50 %" })).toBeVisible();

  // The Heat slider never goes below the skill's cost.
  const heat = slot2.getByLabel("Fires at Heat");
  await heat.fill("80");
  await expect(heat).toHaveValue("80");
  await heat.fill("0");
  await expect(heat).toHaveValue("50");
  // The Heat preview can be paused.
  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  expect(errors).toEqual([]);
});
