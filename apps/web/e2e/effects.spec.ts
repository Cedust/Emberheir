import { expect, test } from "@playwright/test";

test("Effect Gallery: the first and last effect of every group play without errors", async ({
  page,
}) => {
  // Each pick builds its arena again; CI runners draw slowly.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?effects");
  await expect(page.getByRole("heading", { name: "Effect Gallery" })).toBeVisible();
  const groups = page.getByRole("navigation", { name: "Gruppen" }).getByRole("button");
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).click();
    const effects = page.getByRole("list", { name: "Effekte" }).getByRole("button");
    for (const effect of [effects.first(), effects.last()]) {
      await effect.click();
      await expect(effect).toHaveAttribute("aria-pressed", "true");
    }
  }
  // Timo's own pick: it counts, survives a reload and goes into the export.
  await page
    .getByRole("radiogroup", { name: "Deine Wahl" })
    .getByRole("radio", { name: "Entfernen" })
    .click();
  await page.getByLabel("Anmerkung").fill("zu viel");
  await page.getByLabel("Anmerkung").blur();
  await expect(page.getByTestId("fx-progress")).toHaveText(/^1 \//);
  await page.reload();
  await expect(page.getByTestId("fx-progress")).toHaveText(/^1 \//);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportieren (JSON)" }).click();
  const file = await (await download).path();
  const { readFile } = await import("node:fs/promises");
  const out = JSON.parse(await readFile(file, "utf8")) as {
    decided: number;
    effects: { choice: string | null; note?: string }[];
  };
  expect(out.decided).toBe(1);
  expect(out.effects.find((e) => e.choice === "remove")?.note).toBe("zu viel");
  await page.waitForTimeout(500);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/effects.png` });
  expect(errors).toEqual([]);
});
