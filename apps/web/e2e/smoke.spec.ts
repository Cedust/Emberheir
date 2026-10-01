import { expect, test } from "@playwright/test";

test("start page shows the game title", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveTitle("Emberheir");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emberheir");
  expect(errors).toEqual([]);
});

test("a debug fight runs to the end and fills the log", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Start fight" }).click();
  await expect(page.getByRole("meter", { name: "Life" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Skip to end" }).click();

  await expect(page.getByTestId("fight-result")).toHaveText(/Victory|Defeat|Draw/);
  const log = page.getByTestId("combat-log");
  await expect(log).toContainText("Slash hits");
  await expect(log).toContainText(/wins|draw/);
  expect(errors).toEqual([]);
});
