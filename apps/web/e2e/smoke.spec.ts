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
  await expect(cards).toHaveCount(10);
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

  // A fixed new-game seed, so the first fight is always won.
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  // ?dev shows the Skip button in fights.
  await page.goto("/?dev");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();

  await page.getByRole("button", { name: /SET OUT/ }).click();
  await expect(page.getByRole("region", { name: "Intermission" })).toBeVisible();
  await expect(page.getByTestId("done-card")).toContainText("Stage 1 ahead");
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();

  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Life" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Skip fight" }).click();
  await expect(page.getByTestId("fight-result")).toHaveText("VICTORY");

  // The rewards follow on their own after the banner.
  await expect(page.getByTestId("auto-rewards")).toContainText("XP");
  await expect(page.getByTestId("item-card")).toHaveCount(3);

  // Between stages the Battle Plan shows its damage share and can be changed.
  const plan = page.getByRole("region", { name: "Battle Plan" });
  await expect(plan).toContainText("%");
  await plan.getByRole("button", { name: "Edit Battle Plan" }).click();
  await expect(page.getByRole("tab", { name: "Battle Plan" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByTestId("rotation-slot-0")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByTestId("item-card").first().getByRole("button", { name: "Take" }).click();
  await expect(page.getByTestId("done-card")).toContainText("Taken:");

  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByTestId("done-card")).toContainText("Taken:");
  await page.keyboard.press("c");
  const character = page.getByRole("dialog", { name: "Character" });
  await expect(character).toBeVisible();
  await expect(character).toContainText("Warrior");
  const taken = character.getByRole("group", { name: "Inventory grid" }).getByTestId("grid-item");
  await expect(taken).toHaveCount(1);
  // Hovering an item shows its Diablo-style tooltip; the paperdoll has all 10 slots.
  await taken.hover();
  await expect(page.getByTestId("item-tooltip")).toBeVisible();
  await expect(
    character.getByRole("button", { name: /^(Helm|Gloves|Boots|Belt|Ring):/ }),
  ).toHaveCount(6);
  await character.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Retreat to Camp" }).click();
  await expect(page.getByRole("status", { name: "RETREAT" })).toBeVisible();
  await page.getByRole("button", { name: "Wake at the Hearthfire" }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();

  // Thoric's forge and the Supply Wagon open from the Camp; Esc goes back.
  await page.getByRole("button", { name: "Thoric, Blacksmith" }).click();
  await page.getByRole("button", { name: "Open Forge" }).click();
  await expect(page.getByRole("region", { name: "Thoric, Blacksmith" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Supply Wagon, Stash" }).click();
  await page.getByRole("button", { name: "Open Stash" }).click();
  await expect(page.getByRole("group", { name: "Stash" })).toBeVisible();
  expect(errors).toEqual([]);
});
