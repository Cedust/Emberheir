import { expect, test } from "@playwright/test";
import {
  saveAfterAct1,
  saveAtEvent,
  saveAtFork,
  saveAtMarisha,
  saveAtWardensGate,
  saveWildfire,
  seedSave,
} from "./fixtures";

test("the act map: the next node is chosen in the Intermission, a Hearth has no fight", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtFork());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const map = page.getByTestId("act-map");
  await expect(map).toBeVisible();
  const paths = page.getByRole("radiogroup", { name: "Choose a path" });
  await expect(paths).toBeVisible();
  // No node is taken by default: NEXT STAGE waits for a choice.
  await expect(paths.getByRole("radio", { checked: true })).toHaveCount(0);
  const next = page.getByRole("button", { name: /NEXT STAGE/ });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await paths.getByRole("radio", { name: "Hearth" }).click();
  await expect(paths.getByRole("radio", { name: "Hearth" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(map.getByRole("button", { name: "Hearth, Stage 3" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(next).not.toHaveAttribute("aria-disabled", "true");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/map-choice.png` });

  // M opens the map big for planning; Escape closes it.
  await page.keyboard.press("m");
  await expect(page.getByTestId("act-map-big")).toBeVisible();
  if (process.env.SHOTS) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${process.env.SHOTS}/map-big.png` });
  }
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("act-map-big")).toHaveCount(0);

  // The Hearth: no fight, rest or a Flask charge.
  await next.click();
  await expect(page.getByRole("heading", { name: "HEARTH" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Battle", exact: true })).toHaveCount(0);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/map-hearth.png` });
  await page.getByRole("button", { name: "Rest" }).click();
  await expect(page.getByRole("button", { name: "Rest" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("an Event: a choice the hero cannot pay stays greyed, Walk On is free", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtEvent());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: "HEDGEHOG PEDDLER" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy a Charge" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/map-event.png` });
  await page.getByRole("button", { name: "Walk On" }).click();
  await expect(page.getByRole("button", { name: "Walk On" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Marisha on the road gambles on three slots", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtMarisha());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByRole("heading", { name: "MARISHA" })).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/map-marisha.png` });
  await page.getByRole("button", { name: "Gloves" }).click();
  await expect(page.getByRole("button", { name: "Gloves" })).toContainText("Bought");
  expect(errors).toEqual([]);
});

test("the Warden's Gate: challenge the boss or wander on through the act", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtWardensGate());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const gate = page.getByLabel("Warden's Gate");
  await expect(gate).toBeVisible();
  // The hero is below the boss: its level shows red.
  await expect(gate.locator(".gate-level.below")).toHaveText(/Level \d+/);
  await expect(page.getByRole("button", { name: /FACE THE BOSS/ })).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/wardens-gate.png` });
  await gate.getByRole("button", { name: "Wander" }).click();
  // The road starts anew at Stage 1, no gate until the boss again.
  await expect(gate).toHaveCount(0);
  await expect(page.getByTestId("act-map").locator(".map-node.current")).toHaveAttribute(
    "aria-label",
    /Stage 1$/,
  );
  await expect(page.getByRole("button", { name: /NEXT STAGE/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Training Dummy by Kaelen measures the build", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Training Dummy/ }).click();
  await expect(page.getByTestId("dummy-dps")).toHaveText(/\d/);
  await page.getByRole("radio", { name: "Striking" }).click();
  await expect(page.getByRole("region", { name: "Dummy numbers" })).toContainText("Damage taken");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/training-dummy.png` });
  expect(errors).toEqual([]);
});

test("Eldrin talks in his Road window, and says something new when poked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWildfire());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Eldrin, Scout" }).click();
  const road = page.getByRole("region", { name: "Eldrin, The Road" });
  const bubble = road.locator(".road-quote");
  const first = await bubble.innerText();
  expect(first.length).toBeGreaterThan(4);
  await road.getByRole("button", { name: "Eldrin", exact: true }).click();
  await expect(bubble).not.toHaveText(first);
  // All acts still fit under him.
  await expect(road.getByRole("radio", { name: /Act 7/ })).toBeInViewport();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/eldrin-road.png` });
  expect(errors).toEqual([]);
});
