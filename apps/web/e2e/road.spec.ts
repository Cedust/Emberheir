import { expect, test } from "@playwright/test";
import { saveAfterAct1, saveAtFork, saveWildfire, seedSave } from "./fixtures";

test("a fork of the road: the path is chosen in the Intermission", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveAtFork());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();

  const paths = page.getByRole("radiogroup", { name: "Choose a path" });
  await expect(paths).toBeVisible();
  // No path is taken by default: NEXT STAGE waits for a choice.
  await expect(paths.getByRole("radio", { checked: true })).toHaveCount(0);
  const next = page.getByRole("button", { name: /NEXT STAGE/ });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await paths.getByRole("radio", { name: "Hearth Path" }).click();
  await expect(paths.getByRole("radio", { name: "Hearth Path" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByLabel("Up next")).toContainText("Hearth Path");
  await expect(next).not.toHaveAttribute("aria-disabled", "true");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/route-choice.png` });
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
