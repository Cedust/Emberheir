import { expect, test } from "@playwright/test";
import { saveWithCodex, seedSave } from "./fixtures";

test("Old Nan's Trigger Codex marks a Quarry, Liora kindles a trigger onto a ring", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWithCodex());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await page.getByRole("button", { name: "Old Nan, Hearthkeeper" }).click();
  await page.getByRole("button", { name: "Trigger Codex" }).click();
  const codex = page.getByRole("dialog", { name: "Trigger Codex" });
  await expect(codex).toContainText("4 / 26");
  await codex.getByRole("listitem", { name: /^On Crit, Mastery T2/ }).click();
  await codex.getByRole("button", { name: "Mark as Quarry" }).click();
  await expect(page.getByTestId("quarry-pity")).toHaveText("0 / 5");
  // Unknown parts show where they live.
  await expect(codex.getByRole("listitem", { name: "Unknown, Rotwood" }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Liora, Mystic" }).click();
  await page.getByRole("button", { name: /Open/ }).click();
  await page.getByRole("button", { name: /^Kindle/ }).click();
  await page.getByRole("button", { name: "Sturdy Iron Ring" }).click();
  await page
    .getByRole("radiogroup", { name: "Condition" })
    .getByRole("radio", { name: /On Crit/ })
    .click();
  await page
    .getByRole("radiogroup", { name: "Effect" })
    .getByRole("radio", { name: /Stoneskin/ })
    .click();
  // Tier = lower Mastery (2), capped by the T2 ring.
  await expect(page.locator(".after-line.kindled")).toContainText("T2");
  await page.locator(".cost-bar").getByRole("button", { name: "Kindle" }).click();
  await expect(page.getByRole("status")).toContainText("Kindled");
  await expect(page.getByTestId("craft-now")).toContainText("Barrier");
  expect(errors).toEqual([]);
});
