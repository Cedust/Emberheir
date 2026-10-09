import { expect, test } from "@playwright/test";
import { saveAfterHarvestBoss, saveDeepTree, saveWebTree, seedSave } from "./fixtures";

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
  // The Warrior's four paths in class order, Warden as its tier II.
  await expect(bloodline.locator(".branch-pick")).toHaveCount(4);
  const deepen = bloodline.locator(".branch-pick").nth(2);
  await expect(deepen).toContainText("DEEPEN · TIER II");
  await expect(deepen).toContainText("Greater Juggernaut");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/bloodline.png` });
  await deepen.click();
  await page.getByRole("button", { name: "Deepen Warden" }).click();
  await expect(page.getByRole("region", { name: "Inheritance" })).toContainText("Warden II");
});

test("The Skill Tree zooms with the mouse wheel and a two-finger pinch", async ({ page }) => {
  await seedSave(page, saveDeepTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  const canvas = page.getByTestId("skill-tree-canvas").locator("canvas");
  await expect(canvas).toBeVisible();
  const zoom = async () => Number(await canvas.getAttribute("data-zoom"));
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no canvas");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const start = await zoom();
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await expect.poll(zoom).toBeGreaterThan(start);

  // Two fingers move apart: zoom in; together: zoom out.
  const cdp = await page.context().newCDPSession(page);
  const pinch = async (from: number, to: number) => {
    const points = (d: number) => [
      { x: cx - d, y: cy, id: 1 },
      { x: cx + d, y: cy, id: 2 },
    ];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(from) });
    for (let i = 1; i <= 8; i++) {
      const d = from + ((to - from) * i) / 8;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(d) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const beforePinch = await zoom();
  await pinch(40, 160);
  await expect.poll(zoom).toBeGreaterThan(beforePinch * 1.5);
  const zoomedIn = await zoom();
  await pinch(160, 40);
  await expect.poll(zoom).toBeLessThan(zoomedIn / 1.5);
});

test("The web: a path at once, a fork closes its other side, a node is forgotten", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWebTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  const tree = page.getByRole("group", { name: "Skill Tree" });
  const detail = page.getByRole("region", { name: "Node details" });

  // Colossus sits four nodes out from the Warrior's start: the whole path is learned at once.
  await tree.getByRole("button", { name: "Colossus" }).press("Enter");
  await expect(detail).toContainText("Fork: only this or Whirlwind");
  await detail.getByRole("button", { name: "Learn path · 4 Points" }).click();
  await expect(page.getByText("4 new nodes pending")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  // The other side of the fork is sealed.
  await tree.getByRole("button", { name: "Whirlwind" }).press("Enter");
  await expect(detail).toContainText("The other path of this fork is learned");

  // Colossus is forgotten for Gold: the fork opens again.
  await tree.getByRole("button", { name: "Colossus" }).press("Enter");
  await detail.getByRole("button", { name: /Forget · \d+ Gold/ }).click();
  await detail.getByRole("button", { name: "Yes, forget" }).click();
  await tree.getByRole("button", { name: "Whirlwind" }).press("Enter");
  await expect(detail.getByRole("button", { name: "Learn · 1 Point" })).toBeEnabled();
  if (process.env.SHOTS) {
    await page.getByRole("button", { name: "Fit" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-web.png` });
  }
  expect(errors).toEqual([]);
});
