import { ASHEN_BRUTE, SWORD, createHeroSetup } from "@emberheir/content";
import { createEnemySetup } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { simulateMatchup } from "./simulate";

describe("simulateMatchup", () => {
  it("counts every run and is reproducible", () => {
    const hero = createHeroSetup({ weapon: SWORD });
    const enemy = createEnemySetup(ASHEN_BRUTE, 1);
    const a = simulateMatchup(hero, enemy, 20, 5);
    expect(a.wins + a.losses + a.draws).toBe(20);
    expect(a.avgDuration).toBeGreaterThan(0);
    expect(simulateMatchup(hero, enemy, 20, 5)).toEqual(a);
  });
});
