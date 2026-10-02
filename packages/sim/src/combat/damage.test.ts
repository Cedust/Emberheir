import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { COMBAT } from "./constants";
import { type HitInput, armorReduction, resistanceReduction, resolveHit } from "./damage";
import { type DerivedStats, deriveStats } from "./stats";
import { setup } from "./test-fixtures";
import type { StatBonuses } from "./types";

const stats = (bonuses: StatBonuses = {}): DerivedStats => deriveStats(setup({ bonuses }));

/** No crit, no evasion, no block, no mitigation unless a test adds it. */
function input(overrides: Partial<HitInput> = {}): HitInput {
  return {
    baseDamage: 100,
    type: "physical",
    evadable: true,
    attacker: stats({ critChance: -1 }),
    attackerLevel: 1,
    multiplier: 1,
    defender: stats(),
    defenderDamageTaken: 0,
    ...overrides,
  };
}

describe("armorReduction", () => {
  it("follows armor / (armor + 40 × attacker level)", () => {
    expect(armorReduction(40, 1)).toBeCloseTo(0.5);
    expect(armorReduction(40, 3)).toBeCloseTo(0.25);
    expect(armorReduction(0, 1)).toBe(0);
  });

  it("is reduced by Physical Penetration and capped", () => {
    expect(armorReduction(80, 1, 0.5)).toBeCloseTo(0.5);
    expect(armorReduction(1_000_000, 1)).toBe(COMBAT.maxArmorReduction);
  });
});

describe("resistanceReduction", () => {
  it("is capped at 75 % and lowered by penetration", () => {
    expect(resistanceReduction(0.9)).toBe(0.75);
    expect(resistanceReduction(0.9, 0.25)).toBeCloseTo(0.5);
    expect(resistanceReduction(0.1, 0.25)).toBe(0);
  });
});

describe("resolveHit", () => {
  const rng = () => new Rng(1);

  it("deals base damage with nothing else in play", () => {
    expect(resolveHit(input(), rng())).toEqual({
      kind: "hit",
      damage: 100,
      crit: false,
      blocked: false,
    });
  });

  it("applies Damage % by type", () => {
    const attacker = stats({ critChance: -1, physicalDamage: 0.5, elementalDamage: 0.2 });
    expect(resolveHit(input({ attacker }), rng())).toMatchObject({ damage: 150 });
    expect(resolveHit(input({ attacker, type: "fire" }), rng())).toMatchObject({ damage: 120 });
  });

  it("crits for exactly 150 %", () => {
    const attacker = stats({ critChance: 1 });
    expect(resolveHit(input({ attacker }), rng())).toMatchObject({ damage: 150, crit: true });
  });

  it("lets attacks be evaded but not spells", () => {
    const defender = stats({ evasion: 1 }); // capped at 50 %
    let evaded = 0;
    const r = rng();
    for (let i = 0; i < 1000; i++) {
      if (resolveHit(input({ defender }), r).kind === "evaded") evaded++;
    }
    expect(evaded / 1000).toBeCloseTo(COMBAT.maxEvasion, 1);
    for (let i = 0; i < 100; i++) {
      expect(resolveHit(input({ defender, evadable: false }), r).kind).toBe("hit");
    }
  });

  it("reduces physical damage by Armor and elemental damage by Resistance", () => {
    const defender = stats({ armor: 40, allResistance: 0.3 });
    expect(resolveHit(input({ defender }), rng())).toMatchObject({ damage: 50 });
    expect(resolveHit(input({ defender, type: "cold" }), rng())).toMatchObject({ damage: 70 });
  });

  it("uses the element's own Resistance on top of All Resistance", () => {
    const defender = stats({ allResistance: 0.1, fireResistance: 0.4 });
    expect(resolveHit(input({ defender, type: "fire" }), rng())).toMatchObject({ damage: 50 });
    expect(resolveHit(input({ defender, type: "void" }), rng())).toMatchObject({ damage: 90 });
  });

  it("subtracts Block Value from blocked hits, down to 0", () => {
    const defender = stats({ blockChance: 1, blockValue: 30 });
    // Block chance is capped at 75 %, so look for a blocked hit.
    const r = rng();
    const results = Array.from({ length: 20 }, () => resolveHit(input({ defender }), r));
    expect(results).toContainEqual({ kind: "hit", damage: 70, crit: false, blocked: true });
    const wall = stats({ blockChance: 1, blockValue: 500 });
    const walled = Array.from({ length: 20 }, () => resolveHit(input({ defender: wall }), r));
    expect(walled).toContainEqual({ kind: "hit", damage: 0, crit: false, blocked: true });
  });

  it("adds Shock's damage taken bonus and the extra multiplier", () => {
    expect(resolveHit(input({ defenderDamageTaken: 0.2, multiplier: 2 }), rng())).toMatchObject({
      damage: 240,
    });
  });

  it("always deals at least 1 on an unblocked hit", () => {
    expect(resolveHit(input({ baseDamage: 0.1 }), rng())).toMatchObject({ damage: 1 });
  });
});
