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
  await page.getByRole("button", { name: "Combat Lab" }).click();
  await page.getByRole("button", { name: "Start fight" }).click();
  await expect(page.getByRole("meter", { name: "Life" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Skip to end" }).click();

  await expect(page.getByTestId("fight-result")).toHaveText(/Victory|Defeat|Draw/);
  const log = page.getByTestId("combat-log");
  await expect(log).toContainText("Slash hits");
  await expect(log).toContainText(/wins|draw/);
  expect(errors).toEqual([]);
});

test("rolled gear shows item tooltips and goes into the fight", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Combat Lab" }).click();
  const cards = page.getByTestId("item-card");
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText("Main Hand");
  const firstName = await cards.first().locator(".item-name").textContent();

  await page.getByLabel("Rarity").selectOption("epic");
  await expect(cards.first()).toContainText(/Every|On |When |Life below/);
  await page.getByRole("button", { name: "Roll gear" }).click();
  await expect(cards.first().locator(".item-name")).not.toHaveText(firstName ?? "");

  await page.getByRole("button", { name: "Start fight" }).click();
  await page.getByRole("button", { name: "Skip to end" }).click();
  await expect(page.getByTestId("fight-result")).toHaveText(/Victory|Defeat|Draw/);
  expect(errors).toEqual([]);
});

test("a new game: set out, win a fight, pick loot, and the save survives a reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /^Sword/ }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();

  await page.getByRole("button", { name: "Set Out" }).click();
  await expect(page.getByRole("heading", { name: "Stage 1 of 15" })).toBeVisible();
  await page.getByRole("button", { name: "Next Fight" }).click();
  await page.getByRole("button", { name: "Skip to end" }).click();
  await expect(page.getByTestId("fight-result")).toHaveText("Victory");
  await page.getByRole("button", { name: "Claim Rewards" }).click();

  await expect(page.getByTestId("auto-rewards")).toContainText("XP");
  await expect(page.getByTestId("item-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Take" }).first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Stage 2 of 15" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Stage 2 of 15" })).toBeVisible();
  await page.getByRole("button", { name: "Character" }).first().click();
  await expect(page.getByRole("dialog", { name: "Character" })).toBeVisible();
  await expect(page.locator(".inv-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Retreat" }).click();
  await expect(page.getByRole("status", { name: "Retreat" })).toBeVisible();
  expect(errors).toEqual([]);
});
