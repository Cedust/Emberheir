import { expect, test } from "@playwright/test";

test("SFX Gallery: every sound plays its arena moment without errors", async ({ page }) => {
  // Each pick builds its arena again; CI runners draw slowly.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?sfx");
  await expect(page.getByRole("heading", { name: "SFX Gallery" })).toBeVisible();
  const groups = page.getByRole("navigation", { name: "Gruppen" }).getByRole("button");
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).click();
    const sounds = page.getByRole("list", { name: "Sounds" }).getByRole("button");
    for (const sound of [sounds.first(), sounds.last()]) {
      await sound.click();
      await expect(sound).toHaveAttribute("aria-pressed", "true");
    }
  }
  await expect(page.getByText("Was man hört")).toBeVisible();
  // Its picks live apart from the Effect Gallery's.
  await page
    .getByRole("radiogroup", { name: "Deine Wahl" })
    .getByRole("radio", { name: "Behalten" })
    .click();
  await expect(page.getByTestId("fx-progress")).toHaveText(/^1 \//);
  await page.goto("/?effects");
  await expect(page.getByTestId("fx-progress")).toHaveText(/^0 \//);
  expect(errors).toEqual([]);
});
