import { describe, expect, it } from "vitest";
import {
  ailmentDuration,
  applyAilment,
  chillFactor,
  damageTakenBonus,
  healingFactor,
  stepAilments,
} from "./ailments";
import { COMBAT } from "./constants";

describe("ailmentDuration", () => {
  it("scales with Ailment Duration and Tenacity", () => {
    expect(ailmentDuration("burn", 0, 0)).toBe(COMBAT.burnDurationSeconds);
    expect(ailmentDuration("chill", 0.5, 0)).toBeCloseTo(COMBAT.chillDurationSeconds * 1.5);
    expect(ailmentDuration("shock", 0, 0.5)).toBeCloseTo(COMBAT.shockDurationSeconds * 0.5);
  });
});

/** Steps in 0.05 s ticks and collects all burn ticks. */
function run(states: ReturnType<typeof applyAilment>, seconds: number) {
  const ticks: number[] = [];
  const expired: string[] = [];
  let s = states;
  for (let i = 0; i < Math.round(seconds / 0.05); i++) {
    const r = stepAilments(s, 0.05);
    s = r.states;
    ticks.push(...r.burnTicks);
    expired.push(...r.expired);
  }
  return { states: s, ticks, expired };
}

describe("Burn", () => {
  it("ticks once per second for its duration, then expires", () => {
    const burning = applyAilment({}, "burn", 4, 40);
    const { states, ticks, expired } = run(burning, 5);
    expect(ticks).toEqual([10, 10, 10, 10]);
    expect(expired).toEqual(["burn"]);
    expect(states.burn).toBeUndefined();
  });

  it("refreshes its duration and keeps the stronger damage", () => {
    let s = applyAilment({}, "burn", 4, 40);
    s = run(s, 3).states;
    s = applyAilment(s, "burn", 4, 20);
    expect(s.burn).toMatchObject({ damagePerSecond: 10, remaining: 4 });
    s = applyAilment(s, "burn", 4, 80);
    expect(s.burn?.damagePerSecond).toBe(20);
  });

  it("halves healing received", () => {
    expect(healingFactor({})).toBe(1);
    expect(healingFactor(applyAilment({}, "burn", 4, 10))).toBe(1 - COMBAT.burnHealingReduction);
  });
});

describe("Chill and Shock", () => {
  it("Chill slows Attack Speed and Heat Gain while it lasts", () => {
    const chilled = applyAilment({}, "chill", 2, 0);
    expect(chillFactor(chilled)).toBe(1 - COMBAT.chillSlow);
    const after = run(chilled, 2);
    expect(after.expired).toEqual(["chill"]);
    expect(chillFactor(after.states)).toBe(1);
  });

  it("Shock increases damage taken while it lasts", () => {
    const shocked = applyAilment({}, "shock", 3, 0);
    expect(damageTakenBonus(shocked)).toBe(COMBAT.shockDamageTaken);
    expect(damageTakenBonus(run(shocked, 3).states)).toBe(0);
  });

  it("ignores zero durations (e.g. full Tenacity)", () => {
    expect(applyAilment({}, "shock", 0, 0)).toEqual({});
  });
});
