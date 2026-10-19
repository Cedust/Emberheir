import { describe, expect, it } from "vitest";
import { resolveHit } from "./damage";
import type { CombatEvent } from "./events";
import { Fight } from "./fight";
import { mergeRules } from "./rules";
import { Rng } from "../rng";
import { deriveStats } from "./stats";
import { TEST_WEAPON, dummy, setup } from "./test-fixtures";
import type { CombatRules, CombatantSetup } from "./types";

/** Skill Web v3 (neuausrichtung-v1.md 4): conditional Notables and Conversion. */

const hits = (events: readonly CombatEvent[]) =>
  events.filter(
    (e): e is Extract<CombatEvent, { type: "hit" }> => e.type === "hit" && e.side === "hero",
  );

const NO_CRIT = { critChance: -1 };

function play(hero: CombatantSetup, enemy: CombatantSetup, seconds: number) {
  const fight = new Fight(hero, enemy, 1);
  fight.advance(seconds);
  return fight;
}

const hero = (rules: CombatRules, extra: Partial<CombatantSetup> = {}) =>
  setup({ rules, bonuses: NO_CRIT, ...extra });

describe("conditional Notables", () => {
  it("deal more only while the condition holds (here: against a Bleeding enemy)", () => {
    const bleeding = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const rules: CombatRules = {
      conditionalDamage: [{ condition: { kind: "enemyHas", ailment: "bleed" }, amount: 0.5 }],
    };
    const fight = play(hero(rules, { weapon: bleeding }), dummy(), 2.05);
    expect(hits(fight.events).map((h) => h.damage)).toEqual([10, 15]);
  });

  it("several bonuses add up in the more pool", () => {
    const rules: CombatRules = {
      conditionalDamage: [
        { condition: { kind: "enemyBelow", fraction: 2 }, amount: 0.5 },
        { condition: { kind: "enemyBelow", fraction: 2 }, amount: 1 },
      ],
    };
    expect(hits(play(hero(rules), dummy(), 1.05).events)[0]?.damage).toBe(25);
  });

  it("Heat at least: the hit after enough Heat is stronger", () => {
    const rules: CombatRules = {
      conditionalDamage: [{ condition: { kind: "heatAtLeast", amount: 10 }, amount: 1 }],
    };
    // Steady: every Poke gives 10 Heat, so the second one has it.
    expect(hits(play(hero(rules), dummy(), 2.05).events).map((h) => h.damage)).toEqual([10, 20]);
  });

  it("within N s after a Crit: more Crit Chance and damage", () => {
    const rules: CombatRules = {
      conditionalDamage: [
        { condition: { kind: "within", event: "crit", seconds: 1.5 }, amount: 1 },
      ],
    };
    const fight = play(hero(rules, { bonuses: { critChance: 1 } }), dummy(), 2.05);
    // The first Crit deals 15; the next one comes within 1 s and is doubled.
    expect(hits(fight.events).map((h) => h.damage)).toEqual([15, 30]);
    const crit: CombatRules = {
      conditionalCrit: [{ condition: { kind: "barrierActive" }, amount: 2 }],
    };
    const warded = play(hero(crit, { bonuses: { ...NO_CRIT, barrier: 50 } }), dummy(), 1.05);
    expect(hits(warded.events)[0]?.crit).toBe(true);
  });

  it("ailments deal more while their condition holds", () => {
    const bleeding = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const rules: CombatRules = {
      ailmentDamageWhen: [
        { ailment: "bleed", amount: 1, condition: { kind: "enemyBelow", fraction: 2 } },
      ],
    };
    const dot = (f: Fight) => f.events.find((e) => e.type === "dot");
    const plain = play(hero({}, { weapon: bleeding }), dummy(), 2.05);
    const strong = play(hero(rules, { weapon: bleeding }), dummy(), 2.05);
    expect(dot(strong)?.type === "dot" && dot(plain)?.type === "dot").toBe(true);
    const d = (f: Fight) => (dot(f) as Extract<CombatEvent, { type: "dot" }>).damage;
    expect(d(strong)).toBe(d(plain) * 2);
  });

  it("merge collects the lists", () => {
    const a: CombatRules = { conversion: [{ from: "physical", to: "fire", share: 0.3 }] };
    const merged = mergeRules(a, a, {
      conditionalDamage: [{ condition: { kind: "barrierActive" }, amount: 0.1 }],
    });
    expect(merged.conversion).toHaveLength(2);
    expect(merged.conditionalDamage).toHaveLength(1);
  });
});

describe("Conversion", () => {
  const stats = (overrides = {}) => ({
    ...deriveStats(setup()),
    critChance: 0,
    ...overrides,
  });

  it("deals the converted share as the new type: Armor stops only the rest", () => {
    const attacker = stats({ elementalDamage: 1 });
    const defender = stats({ armor: 1e6, fireResistance: 0 });
    const input = {
      baseDamage: 100,
      type: "physical" as const,
      evadable: false,
      attacker,
      attackerLevel: 1,
      multiplier: 1,
      defender,
      defenderDamageTaken: 0,
    };
    const plain = resolveHit(input, new Rng(1));
    const converted = resolveHit({ ...input, conversion: { to: "fire", share: 0.5 } }, new Rng(1));
    expect(plain).toMatchObject({ damage: 10 });
    // 50 Physical (90 % stopped) + 50 Fire with +100 % Elemental Damage.
    expect(converted).toMatchObject({ damage: 105 });
  });

  it("a converted Fire share combusts a Burn", () => {
    const burning = { ...TEST_WEAPON, ailmentChances: [{ ailment: "burn" as const, chance: 1 }] };
    const rules: CombatRules = { conversion: [{ from: "physical", to: "fire", share: 0.3 }] };
    const fight = play(hero(rules, { weapon: burning }), dummy(), 2.05);
    expect(fight.events.some((e) => e.type === "payoff" && e.payoff === "combust")).toBe(true);
  });
});

describe("Skill Web v3 Keystones", () => {
  const strike = {
    id: "strike",
    name: "Strike",
    type: "attack" as const,
    heatCost: 10,
    tags: [],
    description: "",
    hits: [{ kind: "weapon" as const, multiplier: 1 }],
  };

  it("Spellblade: a skill also strikes with the weapon", () => {
    const rules: CombatRules = { spellblade: { multiplier: 1 } };
    const fight = play(hero(rules, { rotation: [{ skill: strike }] }), dummy(), 2.05);
    expect(hits(fight.events).some((h) => h.source === "Strike (Spellblade)")).toBe(true);
  });

  it("Arcane Conduit: a skill spends all Heat and grows with it", () => {
    const rules: CombatRules = { arcaneConduit: true };
    const fight = play(
      hero(rules, { rotation: [{ skill: strike }], bonuses: { ...NO_CRIT, startingHeat: 60 } }),
      dummy(),
      1.05,
    );
    const cast = fight.events.find((e) => e.type === "skill");
    expect(cast).toMatchObject({ heatCost: 60 });
    // 10 Weapon Damage × (1 + 50 extra Heat / 100).
    expect(hits(fight.events)[0]?.damage).toBe(15);
  });

  it("Black Flame: a Corrupted enemy heals half", () => {
    const corrupting = {
      ...TEST_WEAPON,
      ailmentChances: [{ ailment: "corruption" as const, chance: 1 }],
    };
    const healer = [
      {
        id: "mend",
        name: "Mend",
        condition: { kind: "everySeconds" as const, seconds: 1.5 },
        effect: { kind: "heal" as const, fraction: 0.01 },
      },
    ];
    const enemy = dummy({ triggers: healer, baseLife: 1000 });
    const healed = (rules: CombatRules) =>
      play(hero(rules, { weapon: { ...corrupting, damage: { min: 100, max: 100 } } }), enemy, 2)
        .events.filter((e) => e.type === "heal" && e.side === "enemy")
        .map((e) => (e.type === "heal" ? e.amount : 0));
    expect(healed({})).toEqual([10]);
    expect(healed({ corruptionStopsHeal: true })).toEqual([5]);
  });

  it("Slow Death: weaker hits, ailments as strong as before", () => {
    const bleeding = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const plain = play(hero({}, { weapon: bleeding }), dummy(), 2.05);
    const slow = play(hero({ slowDeath: { hit: 0.5 } }, { weapon: bleeding }), dummy(), 2.05);
    expect(hits(slow.events)[0]?.damage).toBe(5);
    const dot = (f: Fight) => f.events.find((e) => e.type === "dot");
    expect(dot(slow)).toEqual(dot(plain));
  });
});
