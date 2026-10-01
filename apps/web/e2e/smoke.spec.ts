import { expect, test } from "@playwright/test";

test("start page shows the game title", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveTitle("Emberheir");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emberheir");
  expect(errors).toEqual([]);
});
