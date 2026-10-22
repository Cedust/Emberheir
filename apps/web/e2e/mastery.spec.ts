import { expect, test } from "@playwright/test";
import { GAME_DATA } from "@emberheir/content";
import { newGame, serializeGame } from "@emberheir/sim";
import { saveMastery, seedSave } from "./fixtures";

test("Heirloom: the painted weapon, its points, a Keystone and the Echo", async ({ page }) => {
  // CI's software renderer starts the Pixi tree slowly and the Echo rows wait for it to settle.
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seedSave(page, saveMastery());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Heirloom" }).click();

  await expect(page.getByTestId("mastery-canvas").locator("canvas")).toBeVisible({
    timeout: 15_000,
  });
  const plate = page.getByTestId("weapon-name");
  await expect(plate).toContainText("ASCENDANT · RANK 13");
  await expect(plate).toContainText("Ascendant Sword of Ashfall Wrath");
  await expect(page.getByTestId("mastery-points")).toContainText("3 Heirloom Points");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/mastery.png` });
  }

  // Two more points open the Keystone ring; the Keystone names the weapon.
  const tree = page.getByRole("group", { name: "Heirloom" });
  const detail = page.getByRole("region", { name: "Node details" });
  for (const node of ["Steady Hand", "Balance"]) {
    await tree.getByRole("button", { name: node }).press("Enter");
    await detail.getByRole("button", { name: /Learn/ }).click();
  }
  await tree.getByRole("button", { name: "Perfect Parry" }).press("Enter");
  await detail.getByRole("button", { name: /Choose/ }).click();
  await expect(plate).toContainText("Ascendant Parrying Blade of Ashfall Wrath");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByTestId("mastery-points")).toContainText("0 Heirloom Points");

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

test("Heirloom pans with a drag and zooms with the wheel and a pinch", async ({ page }) => {
  // Every touch waits for a frame, and CI's software GL draws the forge slowly (like the Skill
  // Tree camera tests); the views also load on demand, so the canvas may take a moment.
  test.slow();
  await seedSave(page, saveMastery());
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Heirloom" }).click();
  const canvas = page.getByTestId("mastery-canvas").locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
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

test("the weapon's tooltip on the paperdoll, the Damage plaque and the class select", async ({
  page,
}) => {
  await seedSave(page, saveMastery(["steady-hand", "balance"]));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("c");
  const sheet = page.getByRole("dialog", { name: "Character" });
  const tip = page.getByTestId("weapon-tooltip");

  await sheet.getByTestId("weapon-slot").hover();
  await expect(tip).toContainText("Ascendant Sword of Ashfall Wrath");
  await expect(tip).toContainText("Heirloom Sword · Melee");
  await expect(tip).toContainText("Cooling");
  await expect(tip).toContainText("Echo IV");
  await expect(tip).toContainText("Exalted at Rank 16");
  if (process.env.SHOTS) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${process.env.SHOTS}/weapon-tooltip.png` });
  }

  await sheet.getByRole("tab", { name: "Overview" }).click();
  await sheet.getByTestId("weapon-medallion").first().hover();
  await expect(tip).toContainText("Ascendant Sword of Ashfall Wrath");
});

test("class select: every weapon on the rack has its tooltip", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  const tip = page.getByTestId("weapon-tooltip");
  await page.getByRole("radio", { name: "Axe" }).hover();
  await expect(tip).toContainText("Crude Axe");
  await expect(tip).toContainText("Innate · Lv 1");
  if (process.env.SHOTS) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${process.env.SHOTS}/weapon-tooltip-class-select.png` });
  }
});

test("Attunement: a Wand's Default Attack takes another element, free", async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = newGame(GAME_DATA, { seed: 42, classId: "emberseer", weapon: "wand" });
  await seedSave(
    page,
    serializeGame({ ...base, progress: { ...base.progress, trainerUnlocked: true } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.keyboard.press("t");
  await page.getByRole("tab", { name: "Heirloom" }).click();
  const picker = page.getByRole("region", { name: "Attunement" });
  await expect(picker.getByRole("button", { name: "Like your path" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const shock = picker.getByRole("button", { name: "Lightning · Shock" });
  await shock.click();
  await expect(shock).toHaveAttribute("aria-pressed", "true");
  if (process.env.SHOTS) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${process.env.SHOTS}/attunement.png` });
  }
  expect(errors).toEqual([]);
});
