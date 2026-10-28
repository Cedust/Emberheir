import { expect, test } from "@playwright/test";
import { unseal } from "../src/game/saveCodec";
import { saveAfterHarvestBoss, saveDeepTree, saveWebTree, seedSave } from "./fixtures";

test("The Ash Tree grows with the Masteries and their tiers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveDeepTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");

  // One tree: Vanquisher up to tier III, Berserker and Ravager at tier I, the others hidden.
  await expect(page.getByTestId("skill-tree-canvas").locator("canvas")).toBeVisible();
  const tree = page.getByRole("group", { name: "Ash Tree" });
  await expect(tree.getByRole("button", { name: "Supreme Executioner" })).toHaveCount(1);
  await expect(tree.getByRole("button", { name: "Gore Hide" })).toHaveCount(1);
  await expect(tree.getByRole("button", { name: "Vanquish" })).toHaveCount(0);
  await expect(tree.getByRole("button", { name: "Malediction" })).toHaveCount(0);

  // A deeper tier lists the node it replaces.
  await tree.getByRole("button", { name: "Greater Executioner" }).press("Enter");
  const detail = page.getByRole("region", { name: "Node details" });
  await expect(detail).toContainText("VANQUISHER II");
  await expect(detail).toContainText("Replaces Executioner");

  if (process.env.SHOTS) {
    await page.getByRole("button", { name: "Fit" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-fit.png` });
    await tree.getByRole("button", { name: "Earthsplitter" }).press("Enter");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-vanquisher.png` });
  }
  expect(errors).toEqual([]);
});

test("The Mastery step deepens the main Mastery", async ({ page }) => {
  const save = JSON.parse(saveAfterHarvestBoss());
  save.legacy = { ...save.legacy, prestige: 1, branches: ["vanquisher"] };
  await seedSave(page, JSON.stringify(save));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Pack the Caravan" }).click();

  const mastery = page.getByRole("group", { name: "Mastery" });
  // The Cinderguard's three in class order, Vanquisher as its tier II.
  await expect(mastery.locator(".branch-pick")).toHaveCount(3);
  const deepen = mastery.locator(".branch-pick").nth(0);
  await expect(deepen).toContainText("Vanquisher II");
  await expect(deepen).toContainText("Greater Executioner");
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/mastery.png` });
  await deepen.click();
  await page.getByRole("button", { name: "Let It Burn" }).click();
  await expect(page.getByRole("region", { name: "Camp" })).toBeVisible();
  expect(
    JSON.parse(unseal(await page.evaluate(() => localStorage.getItem("emberheir.slot.0") ?? "")))
      .legacy?.branches,
  ).toEqual(["vanquisher", "vanquisher"]);
});

test("The Ash Tree zooms with the mouse wheel and a two-finger pinch", async ({ page }) => {
  // Every touch waits for a frame, and the painted Ash Tree renders slowly on CI's software GL.
  test.slow();
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
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWebTree());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  const tree = page.getByRole("group", { name: "Ash Tree" });
  const detail = page.getByRole("region", { name: "Node details" });

  // Colossus sits four nodes out from the Cinderguard's start: the whole path is learned at once.
  await tree.getByRole("button", { name: "Colossus" }).press("Enter");
  await expect(detail).toContainText("Fork: only this or Killer Instinct");
  await detail.getByRole("button", { name: "Learn path · 4 Skill Points" }).click();
  await expect(page.getByText("4 new nodes pending")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  // The other side of the fork is sealed.
  await tree.getByRole("button", { name: "Killer Instinct" }).press("Enter");
  await expect(detail).toContainText("The other side is learned");

  // Colossus is forgotten for Acorns: the fork opens again.
  await tree.getByRole("button", { name: "Colossus" }).press("Enter");
  // Forget is held, not clicked.
  // Held until it fires: a busy renderer stretches the hold past its 0.9 s.
  const forget = detail.getByRole("button", { name: /Forget · \d+ Acorns/ });
  await forget.hover();
  await page.mouse.down();
  await expect(forget).toBeHidden({ timeout: 10_000 });
  await page.mouse.up();
  await tree.getByRole("button", { name: "Killer Instinct" }).press("Enter");
  await expect(detail.getByRole("button", { name: "Learn · 1 Skill Point" })).toBeEnabled();
  if (process.env.SHOTS) {
    await page.getByRole("button", { name: "Fit" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-web.png` });
  }
  expect(errors).toEqual([]);
});

test("A Rune Socket of the web takes a Rune from the pouch", async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveWebTree({ rime: 2 }));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  const tree = page.getByRole("group", { name: "Ash Tree" });
  const detail = page.getByRole("region", { name: "Node details" });

  // The Cinderguard's socket: its path is learned at once, then the Rune goes in.
  await tree.getByRole("button", { name: "Rune Socket" }).first().press("Enter");
  await detail.getByRole("button", { name: /Learn path/ }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await detail.getByRole("button", { name: /Rime ×2/ }).click();
  await expect(detail).toContainText("Chilled enemies");
  await expect(detail.getByRole("button", { name: "Take out" })).toBeVisible();
  await expect(detail.getByRole("button", { name: /Rime ×1/ })).toBeVisible();
  if (process.env.SHOTS) {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${process.env.SHOTS}/tree-socket.png` });
  }
  expect(errors).toEqual([]);
});
