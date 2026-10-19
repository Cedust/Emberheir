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
  it("follows armor / (armor + 20 × attacker level)", () => {
    expect(armorReduction(20, 1)).toBeCloseTo(0.5);
    expect(armorReduction(20, 3)).toBeCloseTo(0.25);
    expect(armorReduction(0, 1)).toBe(0);
  });

  it("is reduced by Physical Penetration and capped", () => {
    expect(armorReduction(40, 1, 0.5)).toBeCloseTo(0.5);
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
      ailmentDamage: 100,
      crit: false,
      blocked: false,
      deflected: false,
      glancing: false,
      parried: false,
    });
  });

  it("applies Damage % by type", () => {
    const attacker = stats({ critChance: -1, physicalDamage: 0.5, elementalDamage: 0.2 });
    expect(resolveHit(input({ attacker }), rng())).toMatchObject({ damage: 150 });
    expect(resolveHit(input({ attacker, type: "fire" }), rng())).toMatchObject({ damage: 120 });
  });

  it("the more pool adds up and stays out of the ailments, like the Crit", () => {
    const attacker = stats({ critChance: 1 });
    const out = resolveHit(input({ attacker, more: 1, cleanMore: 0.5 }), rng());
    // 100 × (1 + 1 + 0.5) × 1.5 = 375; the ailments grow from the 100 before both.
    expect(out).toMatchObject({ damage: 375, ailmentDamage: 100, crit: true });
  });

  it("damage taken stays out of the ailment damage", () => {
    expect(resolveHit(input({ defenderDamageTaken: 0.5 }), rng())).toMatchObject({
      damage: 150,
      ailmentDamage: 100,
    });
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

  it("Deflects spells with the Evasion chance for less damage", () => {
    const r = rng();
    const evader = stats({ evasion: 1 }); // capped at 50 %
    let deflected = 0;
    for (let i = 0; i < 1000; i++) {
      const out = resolveHit(input({ defender: evader, evadable: false, deflects: true }), r);
      if (out.kind === "hit" && out.deflected) {
        deflected++;
        expect(out.damage).toBe(100 * COMBAT.deflectDamage);
      }
    }
    expect(deflected / 1000).toBeCloseTo(COMBAT.maxEvasion, 1);
    const plain = resolveHit(input({ defender: stats(), evadable: false, deflects: true }), r);
    expect(plain).toMatchObject({ kind: "hit", deflected: false, damage: 100 });
    // Monsters do not Deflect.
    for (let i = 0; i < 50; i++) {
      const monster = resolveHit(input({ defender: evader, evadable: false }), r);
      expect(monster).toMatchObject({ deflected: false, damage: 100 });
    }
    // Attacks are dodged, never Deflected.
    const attack = resolveHit(input({ defender: evader }), r);
    expect(attack.kind === "evaded" || !attack.deflected).toBe(true);
  });

  it("reduces physical damage by Armor and elemental damage by Resistance", () => {
    const defender = stats({ armor: 20, allResistance: 0.3 });
    expect(resolveHit(input({ defender }), rng())).toMatchObject({ damage: 50 });
    expect(resolveHit(input({ defender, type: "cold" }), rng())).toMatchObject({ damage: 70 });
  });

  it("uses the element's own Resistance on top of All Resistance", () => {
    const defender = stats({ allResistance: 0.1, fireResistance: 0.4 });
    expect(resolveHit(input({ defender, type: "fire" }), rng())).toMatchObject({ damage: 50 });
    expect(resolveHit(input({ defender, type: "void" }), rng())).toMatchObject({ damage: 90 });
  });

  it("a block stops a fixed share of the hit, so it holds against the biggest hits", () => {
    const defender = stats({ blockChance: 1 });
    // Block chance is capped at 75 %, so look for a blocked hit.
    const r = rng();
    const results = Array.from({ length: 20 }, () => resolveHit(input({ defender }), r));
    expect(results).toContainEqual({
      kind: "hit",
      damage: 100 * (1 - COMBAT.blockReduction),
      ailmentDamage: 100 * (1 - COMBAT.blockReduction),
      crit: false,
      blocked: true,
      deflected: false,
      glancing: false,
      parried: false,
    });
    const huge = Array.from({ length: 20 }, () =>
      resolveHit(input({ defender, baseDamage: 10_000 }), r),
    );
    expect(huge).toContainEqual(
      expect.objectContaining({ blocked: true, damage: 10_000 * (1 - COMBAT.blockReduction) }),
    );
  });

  it("evades elemental attacks but never blocks elemental hits", () => {
    const r = rng();
    const evader = stats({ evasion: 1 });
    const kinds = Array.from(
      { length: 200 },
      () => resolveHit(input({ defender: evader, type: "fire" }), r).kind,
    );
    expect(kinds).toContain("evaded");
    const wall = stats({ blockChance: 1 });
    for (let i = 0; i < 200; i++) {
      expect(resolveHit(input({ defender: wall, type: "fire" }), r)).toMatchObject({
        kind: "hit",
        blocked: false,
      });
    }
  });

  it("adds Shock's damage taken bonus and the extra multiplier", () => {
    expect(resolveHit(input({ defenderDamageTaken: 0.2, multiplier: 2 }), rng())).toMatchObject({
      damage: 240,
    });
  });

  it("always deals at least 1 on an unblocked hit", () => {
    expect(resolveHit(input({ baseDamage: 0.1 }), rng())).toMatchObject({ damage: 1 });
  });

  it("turns a failed Precision roll into a Glancing Blow: half damage, never a Crit", () => {
    const attacker = stats({ critChance: 1 });
    expect(resolveHit(input({ attacker, precision: 0 }), rng())).toMatchObject({
      damage: 50,
      crit: false,
      glancing: true,
    });
    expect(resolveHit(input({ precision: 0, glancingDamage: 0.3 }), rng())).toMatchObject({
      damage: 30,
    });
    expect(resolveHit(input({ precision: 1 }), rng())).toMatchObject({ glancing: false });
  });

  it("lands a forced Crit cleanly whatever the Precision", () => {
    const attacker = stats({ critChance: 0 });
    expect(resolveHit(input({ attacker, precision: 0, forceCrit: true }), rng())).toMatchObject({
      damage: 150,
      crit: true,
      glancing: false,
    });
  });

  it("lets Crits ignore extra Armor with Crit Penetration", () => {
    const attacker = stats({ critChance: 1 });
    const defender = stats({ armor: 20 });
    const plain = resolveHit(input({ attacker, defender }), rng());
    const pierced = resolveHit(input({ attacker, defender, critPenetration: 1 }), rng());
    expect(plain).toMatchObject({ damage: 75 });
    expect(pierced).toMatchObject({ damage: 150 });
  });
});
