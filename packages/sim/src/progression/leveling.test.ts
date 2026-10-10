import { describe, expect, it } from "vitest";
import { MONSTER_BAND_ENDS } from "../combat/monsters";
import { PROGRESSION } from "./constants";
import {
  autoRewards,
  bossLevel,
  gainXp,
  levelCap,
  xpForKill,
  xpLevelFactor,
  xpToNextLevel,
} from "./leveling";

describe("leveling", () => {
  it("follows the XP table and stops at the Level Cap", () => {
    expect(xpToNextLevel(1)).toBe(PROGRESSION.xpToNextLevel[0]);
    expect(xpToNextLevel(levelCap(0))).toBe(Infinity);
  });

  it("puts the Level Cap 10 above each run's boss, up to 100", () => {
    const caps = Array.from({ length: 8 }, (_, p) => levelCap(p));
    expect(caps).toEqual([20, 30, 40, 55, 70, 85, 100, 100]);
    // The Monster Level bands end at the bosses.
    expect(MONSTER_BAND_ENDS).toEqual(caps.slice(0, 7).map((c) => c - 10));
    expect(bossLevel(6)).toBe(90);
  });

  it("has XP for every level up to the last Level Cap", () => {
    expect(PROGRESSION.xpToNextLevel.length).toBeGreaterThanOrEqual(
      levelCap(PROGRESSION.finalPrestige) - 1,
    );
    for (let i = 1; i < PROGRESSION.xpToNextLevel.length; i++) {
      expect(PROGRESSION.xpToNextLevel[i]).toBeGreaterThan(PROGRESSION.xpToNextLevel[i - 1] ?? 0);
    }
  });

  it("gains several levels at once and keeps the leftover XP", () => {
    const [a = 0, b = 0] = PROGRESSION.xpToNextLevel;
    expect(gainXp(1, 0, a + b + 5)).toEqual({ level: 3, xp: 5, levelsGained: 2 });
    expect(gainXp(1, 10, a - 11)).toEqual({ level: 1, xp: a - 1, levelsGained: 0 });
  });

  it("caps the level and drops XP at the cap", () => {
    const cap = levelCap(0);
    expect(gainXp(cap - 1, 0, 1_000_000)).toEqual({ level: cap, xp: 0, levelsGained: 1 });
  });

  it("gives 10 % less XP per level above the enemy, at least 10 %", () => {
    expect(xpLevelFactor(1, 3)).toBeCloseTo(1.1);
    expect(xpLevelFactor(1, 60)).toBe(PROGRESSION.xpMaxFactor);
    expect(xpLevelFactor(4, 2)).toBeCloseTo(0.8);
    expect(xpLevelFactor(30, 1)).toBe(PROGRESSION.xpMinFactor);
    expect(xpForKill(2, "normal", 2)).toBe(PROGRESSION.xpBase + PROGRESSION.xpPerMonsterLevel);
    expect(xpForKill(1, "boss", 1)).toBe(PROGRESSION.xpBase * PROGRESSION.bossRewardMultiplier.xp);
  });

  it("Elites and Bosses give more Gold and Dust", () => {
    const normal = autoRewards(3, "normal");
    const elite = autoRewards(3, "elite");
    const boss = autoRewards(3, "boss");
    expect(elite.gold).toBeGreaterThan(normal.gold);
    expect(boss.gold).toBeGreaterThan(elite.gold);
    expect(boss.dust).toBeGreaterThan(normal.dust);
  });
});
