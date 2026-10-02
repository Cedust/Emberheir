import { describe, expect, it } from "vitest";
import {
  ailmentDuration,
  applyAilment,
  chillFactor,
  clearAilment,
  damageTakenBonus,
  healingFactor,
  multiplyPoison,
  poisonStacks,
  remainingBleedDamage,
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
    ticks.push(...r.ticks.map((t) => t.damage));
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
    expect(ticks).toEqual([20, 20, 20, 10, 10]);
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
    expect(poisonStacks(multiplyPoison(s, 2))).toBe(4);
    expect(multiplyPoison({}, 2)).toEqual({});
  });
});
