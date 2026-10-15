import { expect, test } from "@playwright/test";
import { saveAfterAct1, seedSave } from "./fixtures";

test("the Overview shows the pinned Stats panels, up to three, and keeps them", async ({
  page,
}) => {
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  const overview = sheet.getByRole("region", { name: "Overview" });
  await sheet.getByRole("tab", { name: "Overview" }).click();
  // Default pins: Damage, Defense and Heat.
  await expect(overview.getByRole("button", { name: "Unpin from Overview" })).toHaveCount(3);
  await expect(overview).toContainText("Heat");

  await sheet.getByRole("tab", { name: "Stats" }).click();
  await sheet.getByRole("tab", { name: "Defense" }).click();
  // Three are pinned: the other stars are closed.
  const resist = sheet.getByRole("button", { name: "Pin to Overview" }).nth(1);
  await expect(resist).toHaveAttribute("aria-disabled", "true");
  await sheet.getByRole("tab", { name: "Heat" }).click();
  await sheet.getByRole("button", { name: "Unpin from Overview" }).click();
  await sheet.getByRole("tab", { name: "Offense" }).click();
  await sheet.getByRole("button", { name: "Pin to Overview" }).last().click();

  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  await sheet.getByRole("tab", { name: "Overview" }).click();
  await expect(overview).toContainText("Ailments");
  await expect(overview).not.toContainText("Starts at");
});
