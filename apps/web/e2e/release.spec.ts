import { readFileSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { createHero, saveAfterAct1, seedSave } from "./fixtures";

/** Holds a Hold-to-confirm button until it fires (a busy renderer stretches the 0.9 s). */
async function hold(page: Page, button: Locator): Promise<void> {
  await button.hover();
  await page.mouse.down();
  await expect(button).toBeHidden({ timeout: 10_000 });
  await page.mouse.up();
}

test("Old Nan greets a new Heir once, and No more tips turns them off", async ({ page }) => {
  // Under automation every tip counts as seen until a list is stored: this test wants them.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("tips")) {
      localStorage.setItem("emberheir.tipsSeen", "[]");
      sessionStorage.setItem("tips", "1");
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await createHero(page);

  const nan = page.getByRole("dialog", { name: "Old Nan, First Steps" });
  await expect(nan).toContainText("Set Out when you are ready");
  await nan.getByRole("button", { name: "Got it." }).click();
  await expect(nan).toBeHidden();

  // Seen tips stay seen after a reload.
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();
  await expect(nan).toBeHidden();

  await page.getByRole("button", { name: /SET OUT/ }).click();
  await expect(nan).toContainText("mind your Flask");
  await page.keyboard.press("2");
  await expect(nan).toBeHidden();

  // The first fight would have its own tip; Tips are Off now.
  await page.getByRole("button", { name: /NEXT STAGE/ }).click();
  await expect(page.getByRole("region", { name: "Battle" })).toBeVisible();
  await expect(nan).toBeHidden();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByRole("radiogroup", { name: "Tips" }).getByRole("radio", { name: "Off" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("the title shows the version and the Credits name Cedust with a link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".build-info")).toContainText(/^v\d+\.\d+\.\d+/);
  await page.getByRole("button", { name: "Credits" }).click();
  await expect(page.getByText("Kindled by")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cedust" })).toHaveAttribute(
    "href",
    "https://github.com/Cedust",
  );
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
});

test("a crash shows the crash screen with Reload instead of an empty page", async ({ page }) => {
  page.on("pageerror", () => {});
  await page.goto("/?crashtest");
  const crash = page.getByRole("alert", { name: "The fire flickered" });
  await expect(crash).toBeVisible();
  await expect(crash).toContainText("Crash test");
  await expect(crash.getByRole("button", { name: "Reload" })).toBeVisible();
});

test("every Heir goes into a sealed backup file and comes back from it", async ({ page }) => {
  await seedSave(page, saveAfterAct1());
  await page.goto("/");
  // The save game in the browser is sealed: no plain text.
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("emberheir.slot.0") ?? "");
  expect(stored.startsWith("EH1.")).toBe(true);
  expect(stored).not.toContain("cinderguard");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Quit to Title" }).click();
  await page.getByRole("button", { name: "Characters" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await (await download).path();
  expect(readFileSync(file, "utf8").startsWith("EH1.")).toBe(true);

  // Delete the Heir, then bring it back from the file.
  await page.getByRole("button", { name: "Delete" }).click();
  await hold(
    page,
    page.getByRole("alertdialog", { name: "Delete" }).getByRole("button", { name: "Delete" }),
  );
  await expect(page.getByRole("button", { name: /Continue/ })).toBeHidden();
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByLabel("Backup file").setInputFiles(file);
  await expect(page.getByRole("alertdialog", { name: "Import" })).toContainText("1 Heir");
  await hold(page, page.getByRole("button", { name: "Replace" }));
  await expect(page.getByRole("button", { name: /Continue/ })).toContainText("Level 15");
});

test("a save changed by hand shows as damaged and can be deleted", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("emberheir.slot.2", "EH1.bm90LWEtcmVhbC1zYXZl");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Characters" }).click();
  await page.getByRole("option", { name: /Damaged save/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await hold(
    page,
    page.getByRole("alertdialog", { name: "Delete" }).getByRole("button", { name: "Delete" }),
  );
  await expect(page.getByRole("option", { name: /Damaged save/ })).toBeHidden();
});
