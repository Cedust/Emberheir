import { expect, test } from "@playwright/test";

// Under automation the intro is skipped; ?intro plays it.
test("the story intro types Old Nan's lines and opens the class the Heir remembers", async ({
  page,
}) => {
  await page.goto("/?intro");
  await page.getByRole("button", { name: "New Game" }).click();
  const story = page.getByRole("region", { name: "Story" });
  const line = story.getByTestId("intro-line");
  await expect(line).toContainText("This one has harvests");
  // Enter shows the whole line, the next Enter the next line, up to Old Nan's question.
  const nan = story.getByRole("dialog", { name: "Old Nan" });
  for (let i = 0; i < 40 && !(await nan.getByRole("button").first().isVisible()); i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(60);
  }
  await expect(line).toContainText("do you remember who you were?");
  await nan.getByRole("button", { name: "The fire spoke to me." }).click();
  await expect(line).toContainText("An Emberseer");
  if (process.env.SHOTS) {
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${process.env.SHOTS}/story-intro-nan.png` });
  }
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(line).toContainText("the soup won’t cook itself");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: "Emberseer" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("Skip leaves the story intro for the class select", async ({ page }) => {
  await page.goto("/?intro");
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("region", { name: "Story" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("radio", { name: "Cinderguard" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
});
