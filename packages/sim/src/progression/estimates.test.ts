import { describe, expect, it } from "vitest";
import { deriveStats } from "../combat/stats";
import type { Item } from "../items/types";
import { compareItem, estimateDps, estimateRotation, heatPerSecond } from "./estimates";
import { heroSetup, newGame } from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

const data = TEST_GAME_DATA;
const start = () => newGame(data, { seed: 2, starterWeapon: "test-sword" });

describe("estimates", () => {
  it("DPS and Heat per second follow the derived stats", () => {
    const { setup } = heroSetup(start(), data);
    const stats = deriveStats(setup);
    expect(estimateDps(setup)).toBeGreaterThan(0);
    const faster = { ...stats, attackSpeed: stats.attackSpeed * 2 };
    expect(estimateDps(setup, faster)).toBeCloseTo(estimateDps(setup, stats) * 2);
    expect(heatPerSecond(setup, faster)).toBeCloseTo(heatPerSecond(setup, stats) * 2);
  });

  it("DPS counts the DoTs the hits cause", () => {
    const { setup } = heroSetup(start(), data);
    const stats = deriveStats(setup);
    const plain = estimateDps(setup, stats);
    // Bleed: one at a time, half the hit per second.
    const bleeding = estimateDps(setup, { ...stats, bleedChance: 1 });
    expect(bleeding).toBeGreaterThan(plain);
    expect(bleeding - plain).toBeLessThanOrEqual((plain / stats.attackSpeed) * 0.5 + 1e-9);
    // Poison stacks, so more hits keep adding.
    expect(estimateDps(setup, { ...stats, poisonChance: 1 })).toBeGreaterThan(plain);
  });

  it("one rotation: cheap skills fire back to back, expensive ones wait", () => {
    // 10 Heat/s: a 20 cost skill waits 2 s; with threshold 60 the second fires right after.
    const steps = estimateRotation(
      [
        { heatCost: 20, threshold: 60 },
        { heatCost: 40, threshold: 40 },
      ],
      10,
    );
    expect(steps.map((s) => s.slot)).toEqual([0, 1]);
    expect(steps[1]?.wait).toBeLessThan(0.3);
    expect(steps[0]?.wait).toBeGreaterThan(5);
    expect(estimateRotation([], 10)).toEqual([]);
    expect(estimateRotation([{ heatCost: 20, threshold: 20 }], 0)).toEqual([]);
  });

  it("compares an item with the equipped one", () => {
    const s = start();
    const ring: Item = {
      id: "r",
      baseId: "test-ring",
      name: "Ring",
      rarity: "magic",
      itemLevel: 1,
      tier: 1,
      affixes: [{ affixId: "life", quality: 1 }],
    };
    const cmp = compareItem(s, data, ring);
    expect(cmp.slot).toBe("ring1");
    expect(cmp.replaces).toBeUndefined();
    expect(cmp.changes.map((c) => c.stat)).toContain("maxLife");
    expect(cmp.dps.after).toBeGreaterThan(cmp.dps.before); // the ring's implicit adds Crit Chance
  });
});
