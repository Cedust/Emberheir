import { describe, expect, it } from "vitest";
import {
  advanceCorruption,
  ailmentDuration,
  applyAilment,
  chillFactor,
  clearAilment,
  damageTakenBonus,
  dotDamagePerSecond,
  healingFactor,
  multiplyPoison,
  poisonStacks,
  remainingBleedDamage,
  remainingPoisonDamage,
  stepAilments,
} from "./ailments";
import { COMBAT } from "./constants";

describe("ailmentDuration", () => {
  it("is the base, shortened by Tenacity (Ailment Effect makes ailments stronger, not longer)", () => {
    expect(ailmentDuration("burn", 0)).toBe(COMBAT.burnDurationSeconds);
    expect(ailmentDuration("shock", 0.5)).toBeCloseTo(COMBAT.shockDurationSeconds * 0.5);
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
    ticks.push(...r.ticks.map((t) => t.damage));
    expired.push(...r.expired);
  }
  return { states: s, ticks, expired };
}

describe("Burn", () => {
  it("ticks once per second for its duration, then expires", () => {
    const burning = applyAilment({}, "burn", 4, 40);
    const { states, ticks, expired } = run(burning, 5);
    const tick = 40 * COMBAT.burnDamagePerSecond;
    expect(ticks).toEqual([tick, tick, tick, tick]);
    expect(expired).toEqual(["burn"]);
    expect(states.burn).toBeUndefined();
  });

  it("refreshes its duration and keeps the stronger damage", () => {
    let s = applyAilment({}, "burn", 4, 40);
    s = run(s, 3).states;
    s = applyAilment(s, "burn", 4, 20);
    expect(s.burn).toMatchObject({
      damagePerSecond: 40 * COMBAT.burnDamagePerSecond,
      remaining: 4,
    });
    s = applyAilment(s, "burn", 4, 80);
    expect(s.burn?.damagePerSecond).toBeCloseTo(80 * COMBAT.burnDamagePerSecond);
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

describe("Bleed", () => {
  it("is short and strong: half the hit per second for 3 s", () => {
    const bleeding = applyAilment({}, "bleed", COMBAT.bleedDurationSeconds, 40);
    const { ticks, expired } = run(bleeding, 4);
    expect(ticks).toEqual([20, 20, 20]);
    expect(expired).toEqual(["bleed"]);
  });

  it("tells the damage still to come and can be cleared", () => {
    let s = applyAilment({}, "bleed", 3, 40);
    expect(remainingBleedDamage(s)).toBe(60);
    s = run(s, 1.5).states;
    expect(remainingBleedDamage(s)).toBe(40);
    expect(clearAilment(s, "bleed").bleed).toBeUndefined();
    expect(remainingBleedDamage({})).toBe(0);
  });
});

describe("Poison", () => {
  it("stacks, and every stack runs out on its own", () => {
    let s = applyAilment({}, "poison", 5, 100);
    s = run(s, 2).states;
    s = applyAilment(s, "poison", 5, 100);
    expect(poisonStacks(s)).toBe(2);
    const { ticks, expired } = run(s, 6);
    // Ticks at 3 s, 4 s, 5 s with both stacks, then only the second stack until 7 s.
    const one = 100 * COMBAT.poisonDamagePerSecond;
    expect(ticks).toEqual([2 * one, 2 * one, 2 * one, one, one]);
    expect(expired).toEqual(["poison"]);
  });

  it("caps the stacks, dropping the oldest", () => {
    let s = {};
    for (let i = 0; i < COMBAT.poisonMaxStacks + 5; i++) s = applyAilment(s, "poison", 5, i);
    expect(poisonStacks(s)).toBe(COMBAT.poisonMaxStacks);
  });

  it("can be multiplied (Toxic Burst)", () => {
    let s = applyAilment({}, "poison", 5, 100);
    s = applyAilment(s, "poison", 5, 100);
    expect(poisonStacks(multiplyPoison(s, 2).states)).toBe(4);
    expect(multiplyPoison({}, 2)).toEqual({ states: {}, overflow: 0 });
  });

  it("returns the stacks over the cap as overflow damage", () => {
    let s = {};
    for (let i = 0; i < 3; i++) s = applyAilment(s, "poison", 5, 100);
    const { states, overflow } = multiplyPoison(s, 2, 4);
    expect(poisonStacks(states)).toBe(4);
    expect(overflow).toBeCloseTo(remainingPoisonDamage(s) * (2 / 3));
    expect(poisonStacks(multiplyPoison(s, 2, 10).states)).toBe(6);
  });
});

describe("Corruption", () => {
  it("grows with every tick and keeps its growth when refreshed", () => {
    const corrupted = applyAilment({}, "corruption", 6, 100);
    const first = run(corrupted, 3);
    // The base per second, +25 % of the base per tick.
    const base = 100 * COMBAT.corruptionDamagePerSecond;
    const grown = (ticks: number) => base * (1 + COMBAT.corruptionRampPerTick * ticks);
    first.ticks.forEach((t, i) => expect(t).toBeCloseTo(grown(i)));
    const refreshed = applyAilment(first.states, "corruption", 6, 50);
    expect(refreshed.corruption?.ramp).toBe(3);
    expect(refreshed.corruption?.remaining).toBe(6);
    expect(run(refreshed, 1).ticks[0]).toBeCloseTo(grown(3));
  });

  it("stops growing at the cap and can jump ahead (Corrupt)", () => {
    const corrupted = advanceCorruption(applyAilment({}, "corruption", 6, 100), 99);
    expect(corrupted.corruption?.ramp).toBe(COMBAT.corruptionMaxRamp);
    expect(advanceCorruption({}, 3)).toEqual({});
  });
});

describe("dotDamagePerSecond", () => {
  it("adds up every DoT and every Poison stack", () => {
    let states = applyAilment({}, "bleed", 3, 10); // 5/s
    states = applyAilment(states, "poison", 5, 10); // 10 × Poison per second
    states = applyAilment(states, "poison", 5, 10);
    states = advanceCorruption(applyAilment(states, "corruption", 6, 100), 4); // base × 2
    expect(dotDamagePerSecond(states)).toBeCloseTo(
      5 + 200 * COMBAT.corruptionDamagePerSecond + 2 * 10 * COMBAT.poisonDamagePerSecond,
    );
  });
});
