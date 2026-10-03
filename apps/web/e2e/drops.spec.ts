import { expect, test } from "@playwright/test";
import { saveBossHoard, seedSave } from "./fixtures";

test("Boss Hoard: six cards turn over, take two, the trophy goes up on the Trophy Wall", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveBossHoard());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const hall = page.getByRole("region", { name: "Intermission" });
  await expect(hall).toContainText("Boss Hoard · choose 2 of 6");
  // The cards lie face down, then turn over one by one.
  await expect(page.getByTestId("hoard-card")).toHaveCount(6, { timeout: 10_000 });
  await expect(page.getByRole("status")).toContainText("Thornsong");

  const cards = page.getByTestId("hoard-card");
  await cards.nth(0).click();
  await page.getByTestId("item-card").getByRole("button", { name: "Take" }).click();
  await expect(hall).toContainText("choose 1 of 6");
  await expect(cards.nth(0)).toContainText("Taken");
  await cards.nth(2).click();
  await expect(page.getByTestId("item-card")).toContainText("Thornsong");
  await page.getByTestId("item-card").getByRole("button", { name: "Take" }).click();
  await expect(page.getByTestId("hoard-card")).toHaveCount(0);

  // Back in the Camp, the Trophy Wall shows Thornsong.
  await page.getByRole("button", { name: /RETURN TO CAMP/ }).click();
  await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();
  await page.getByRole("button", { name: "Hearthfire, Legacy" }).click();
  await page.getByRole("button", { name: "Open Legacy" }).click();
  await page.getByRole("tab", { name: /Trophy Wall/ }).click();
  await expect(page.getByTestId("trophy-thornsong")).toBeEnabled();
  await expect(page.getByTestId("trophy-tyrants-crown")).toBeDisabled();
  expect(errors).toEqual([]);
});
