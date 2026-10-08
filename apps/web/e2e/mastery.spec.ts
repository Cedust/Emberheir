import { expect, test } from "@playwright/test";
import { saveMastery, seedSave } from "./fixtures";

test("Weapon Mastery: the painted weapon, its points, a Keystone and the Echo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveMastery());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Weapon Mastery" }).click();

  await expect(page.getByTestId("mastery-canvas").locator("canvas")).toBeVisible();
  const plate = page.getByTestId("weapon-name");
  await expect(plate).toContainText("ASCENDANT · RANK 13");
  await expect(plate).toContainText("Ascendant Sword of Ashfall Wrath");
  await expect(page.getByTestId("mastery-points")).toContainText("3 Mastery Points");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/mastery.png` });
  }

  // Two more points open the Keystone ring; the Keystone names the weapon.
  const tree = page.getByRole("group", { name: "Weapon Mastery" });
  const detail = page.getByRole("region", { name: "Node details" });
  for (const node of ["Steady Hand", "Balance"]) {
    await tree.getByRole("button", { name: node }).press("Enter");
    await detail.getByRole("button", { name: /Learn/ }).click();
  }
  await tree.getByRole("button", { name: "Perfect Parry" }).press("Enter");
  await detail.getByRole("button", { name: /Choose/ }).click();
  await expect(plate).toContainText("Ascendant Parrying Blade of Ashfall Wrath");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByTestId("mastery-points")).toContainText("0 Mastery Points");

  // Another Echo.
  const echo = page.getByRole("region", { name: "Echo" });
  await echo.getByRole("button", { name: /Whispering Brood/ }).click();
  await expect(plate).toContainText("of Whispering Brood");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/mastery-keystone.png` });
  }
  expect(errors).toEqual([]);
});

test("Weapon Mastery pans with a drag and zooms with the wheel and a pinch", async ({ page }) => {
  await seedSave(page, saveMastery());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Weapon Mastery" }).click();
  const canvas = page.getByTestId("mastery-canvas").locator("canvas");
  await expect(canvas).toBeVisible();
  const zoom = async () => Number(await canvas.getAttribute("data-zoom"));
  const pan = async () => (await canvas.getAttribute("data-pan")) ?? "";
  const box = await canvas.boundingBox();
  if (!box) throw new Error("no canvas");
  // An empty spot near the bottom right edge.
  const cx = box.x + box.width * 0.9;
  const cy = box.y + box.height * 0.9;

  // Drag: the view moves with the mouse.
  const before = await pan();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 120, cy - 60, { steps: 6 });
  await page.mouse.up();
  await expect.poll(pan).not.toBe(before);

  const start = await zoom();
  await page.mouse.wheel(0, -400);
  await expect.poll(zoom).toBeGreaterThan(start);

  await page.getByRole("button", { name: "Fit" }).click();
  await expect.poll(zoom).toBe(start);

  const cdp = await page.context().newCDPSession(page);
  const pinch = async (from: number, to: number) => {
    const points = (d: number) => [
      { x: cx - 100 - d, y: cy - 60, id: 1 },
      { x: cx - 100 + d, y: cy - 60, id: 2 },
    ];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(from) });
    for (let i = 1; i <= 8; i++) {
      const d = from + ((to - from) * i) / 8;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(d) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  await pinch(30, 90);
  await expect.poll(zoom).toBeGreaterThan(start * 1.5);
  const zoomedIn = await zoom();
  await pinch(90, 30);
  await expect.poll(zoom).toBeLessThan(zoomedIn / 1.5);
});
