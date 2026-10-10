import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import {
  affixWeight,
  resolveTrigger,
  rollQuality,
  roundStat,
  statAffixValue,
  tierForItemLevel,
  unlockedStages,
} from "./affixes";
import { TEST_AFFIXES, TEST_SWORD } from "./test-fixtures";
import type { StatAffixDefinition, TriggerAffixDefinition } from "./types";

const affix = <T extends "stat" | "trigger">(id: string) =>
  TEST_AFFIXES.find((a) => a.id === id) as T extends "stat"
    ? StatAffixDefinition
    : TriggerAffixDefinition;

describe("tiers and stages", () => {
  it("Item Tier follows Item Level: 1–10 = T1, 11–20 = T2, capped at T10", () => {
    expect([1, 10, 11, 20, 21, 95, 100, 140].map(tierForItemLevel)).toEqual([
      1, 1, 2, 2, 3, 10, 10, 10,
    ]);
  });

  it("the Item Level's position in its tier unlocks affix stages", () => {
    expect([1, 3, 4, 6, 7, 10, 11, 14, 17].map(unlockedStages)).toEqual([
      1, 1, 2, 2, 3, 3, 1, 2, 3,
    ]);
  });

  it("quality stays inside the unlocked stages", () => {
    const rng = new Rng(3);
    for (let i = 0; i < 200; i++) {
      expect(rollQuality(1, "rare", rng)).toBeLessThan(1 / 3);
      const q = rollQuality(10, "rare", rng);
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThan(1);
    }
  });

  it("Magic items roll higher on average (best of two)", () => {
    const avg = (rarity: "magic" | "rare") => {
      const rng = new Rng(9);
      let sum = 0;
      for (let i = 0; i < 2000; i++) sum += rollQuality(10, rarity, rng);
      return sum / 2000;
    };
    expect(avg("magic")).toBeGreaterThan(avg("rare") + 0.1);
  });
});

describe("affix values", () => {
  it("lerps by quality and grows per tier; quality is kept when the tier rises", () => {
    const strength = affix<"stat">("strength");
    expect(statAffixValue(strength, 1, 0)).toBe(1);
    expect(statAffixValue(strength, 1, 1)).toBe(5);
    expect(statAffixValue(strength, 1, 0.5)).toBe(3);
    // perTier 1: T3 is three times the T1 value.
    expect(statAffixValue(strength, 3, 0.5)).toBe(9);
  });

  it("rounds percentages to 0.5 % and flat values to whole numbers", () => {
    expect(roundStat("critChance", 0.0337)).toBe(0.035);
    expect(roundStat("critChance", 0.0001)).toBe(0.005);
    expect(roundStat("life", 12.4)).toBe(12);
    expect(roundStat("armor", 0.2)).toBe(1);
  });

  it("base weighting multiplies the affix weight per tag", () => {
    expect(affixWeight(affix<"stat">("crit"), TEST_SWORD)).toBe(10);
    expect(affixWeight(affix<"stat">("elemental"), TEST_SWORD)).toBe(0);
  });

  it("resolves trigger affixes: rolled magnitude or rolled chance", () => {
    const rally = resolveTrigger(affix<"trigger">("second-wind"), 1, 1);
    expect(rally).toEqual({
      id: "second-wind",
      name: "Second Wind",
      condition: { kind: "lifeBelow", threshold: 0.35 },
      chance: 1,
      oncePerFight: true,
      effect: { kind: "heal", fraction: 0.2 },
    });
    const searing = resolveTrigger(affix<"trigger">("searing-crit"), 1, 0.5);
    expect(searing.chance).toBeCloseTo(0.3);
    expect(searing.cooldown).toBe(1);
    expect(searing.effect).toEqual({ kind: "ailment", ailment: "burn" });
  });
});
