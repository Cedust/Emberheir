import { expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, saveDeepTree, seedSave } from "./fixtures";

test("The Skill Tree grows with the Prestige branches and their tiers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveDeepTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");

  // One tree: Duelist up to tier III, Warden and Tactician at tier I, the other branches hidden.
  await expect(page.getByTestId("skill-tree-canvas").locator("canvas")).toBeVisible();
  const tree = page.getByRole("group", { name: "Skill Tree" });
  await expect(tree.getByRole("button", { name: "Supreme Blade Dancer" })).toHaveCount(1);
  await expect(tree.getByRole("button", { name: "Bulwark" })).toHaveCount(1);
  await expect(tree.getByRole("button", { name: "Shield Wall" })).toHaveCount(0);
  await expect(tree.getByRole("button", { name: "Cleaver" })).toHaveCount(0);

  // A deeper tier lists the node it replaces.
  await tree.getByRole("button", { name: "Counterstance" }).press("Enter");
  const detail = page.getByRole("region", { name: "Node details" });
  await expect(detail).toContainText("DUELIST II");
  await expect(detail).toContainText("Replaces Riposte");

  // Five tiers on Core and Might branches: Resonance 3 and 3.
  await expect(page.getByRole("region", { name: "Resonance" })).toContainText("Might");
  if (process.env.SHOTS) {
    await page.getByRole("button", { name: "Fit" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-fit.png` });
    await tree.getByRole("button", { name: "Greater Blade Dancer" }).press("Enter");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-duelist.png` });
  }
  expect(errors).toEqual([]);
});

test("The Bloodline step deepens an owned branch", async ({ page }) => {
  const save = JSON.parse(saveAfterHarvestBoss());
  save.legacy = { ...save.legacy, prestige: 1, branches: ["warden"] };
  await seedSave(page, JSON.stringify(save));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Pack the Caravan" }).click();

  const bloodline = page.getByRole("region", { name: "Bloodline" });
  // Ten choices: Warden II first, then the nine branches not taken yet.
  await expect(bloodline.locator(".branch-pick")).toHaveCount(10);
  const deepen = bloodline.locator(".branch-pick").first();
  await expect(deepen).toContainText("DEEPEN · TIER II");
  await expect(deepen).toContainText("Greater Juggernaut");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bloodline.png` });
  await deepen.click();
  await page.getByRole("button", { name: "Deepen Warden" }).click();
  await expect(page.getByRole("region", { name: "Inheritance" })).toContainText("Warden II");
});
