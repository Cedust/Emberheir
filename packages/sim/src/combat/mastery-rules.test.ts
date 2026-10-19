import { describe, expect, it } from "vitest";
import type { CombatEvent } from "./events";
import { Fight } from "./fight";
import { mergeRules } from "./rules";
import { TEST_SKILL, TEST_WEAPON, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, SkillDefinition } from "./types";

/** The building blocks of the Masteries (klassengeruest-v1.md 5). */

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const NO_CRIT = { critChance: -1 };

function play(hero: CombatantSetup, seconds: number) {
  const fight = new Fight(hero, dummy(), 1);
  fight.advance(seconds);
  return fight;
}

const cheap = (skill: SkillDefinition): SkillDefinition => ({ ...skill, heatCost: 10 });

describe("Mastery rules", () => {
  it("merge: skill damage, ailment chance and duration add up, the crit flag switches on", () => {
    const merged = mergeRules(
      { skillDamage: 0.15, ailmentChance: 0.1, ailmentDuration: 0.2 },
      { skillDamage: 0.3, ailmentChance: 0.1, critsApplyAilment: true },
    );
    expect(merged.skillDamage).toBeCloseTo(0.45);
    expect(merged.ailmentChance).toBeCloseTo(0.2);
    expect(merged.ailmentDuration).toBeCloseTo(0.2);
    expect(merged.critsApplyAilment).toBe(true);
  });

  it("Skill Damage raises skill hits, not the Default Attack", () => {
    const hero = (rules = {}) =>
      setup({ rotation: [{ skill: cheap(TEST_SKILL) }], bonuses: NO_CRIT, rules });
    const hits = (f: Fight, source: string) =>
      ofType(f.events, "hit").find((h) => h.source === source && !h.glancing)?.damage ?? 0;
    const plain = play(hero(), 4.05);
    const strong = play(hero({ skillDamage: 0.5 }), 4.05);
    expect(hits(strong, TEST_SKILL.name)).toBeCloseTo(hits(plain, TEST_SKILL.name) * 1.5, 0);
    expect(hits(strong, TEST_WEAPON.defaultAttack)).toBe(hits(plain, TEST_WEAPON.defaultAttack));
  });

  it("Ailment Chance raises every ailment chance the hits carry", () => {
    const weapon = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 0 }] };
    const bleeds = (rules = {}) =>
      ofType(play(setup({ weapon, rules }), 10.05).events, "ailment").length;
    expect(bleeds()).toBe(0);
    expect(bleeds({ ailmentChance: 1 })).toBeGreaterThan(0);
  });

  it("Ailment Duration makes own ailments last longer", () => {
    const weapon = {
      ...TEST_WEAPON,
      attacksPerSecond: 0.2,
      ailmentChances: [{ ailment: "chill" as const, chance: 1 }],
    };
    const chillTime = (rules = {}) => {
      const fight = play(setup({ weapon, rules }), 9.5);
      const expired = ofType(fight.events, "ailmentExpired")[0];
      const applied = ofType(fight.events, "ailment")[0];
      return (expired?.t ?? 99) - (applied?.t ?? 0);
    };
    expect(chillTime({ ailmentDuration: 0.5 })).toBeGreaterThan(chillTime() * 1.4);
  });

  it("crits apply the weapon's ailment when the rule is on", () => {
    const weapon = { ...TEST_WEAPON, damageType: "cold" as const };
    const chills = (rules = {}) =>
      ofType(play(setup({ weapon, rules, bonuses: { critChance: 2 } }), 3.05).events, "ailment")
        .length;
    expect(chills()).toBe(0);
    expect(chills({ critsApplyAilment: true })).toBeGreaterThan(0);
  });

  it("infused hits take the weapon's damage type and ailment", () => {
    const infused: SkillDefinition = {
      ...TEST_SKILL,
      heatCost: 10,
      hits: [
        {
          kind: "weapon",
          multiplier: 1,
          infused: true,
          ailmentChances: [{ ailment: "bleed", chance: 1 }],
        },
        {
          kind: "spell",
          damage: { min: 5, max: 5 },
          damageType: "void",
          infused: true,
          ailmentChances: [{ ailment: "corruption", chance: 1 }],
        },
      ],
    };
    const weapon = { ...TEST_WEAPON, damageType: "fire" as const };
    const fight = play(setup({ weapon, rotation: [{ skill: infused }], bonuses: NO_CRIT }), 3.05);
    const skillHits = ofType(fight.events, "hit").filter((h) => h.source === TEST_SKILL.name);
    expect(skillHits.length).toBeGreaterThan(0);
    expect(skillHits.every((h) => h.damageType === "fire")).toBe(true);
    const ailments = new Set(ofType(fight.events, "ailment").map((a) => a.ailment));
    expect([...ailments]).toEqual(["burn"]);
  });
});
