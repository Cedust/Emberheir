import { describe, expect, it } from "vitest";
import { applyAilment, chillFactor, damageTakenBonus, stepAilments } from "./ailments";
import { COMBAT } from "./constants";
import type { CombatEvent, PayoffKind } from "./events";
import { Fight } from "./fight";
import { mergeRules } from "./rules";
import { TEST_SKILL, TEST_WEAPON, dummy, setup } from "./test-fixtures";
import type { AilmentType, CombatantSetup, SkillDefinition } from "./types";

/** Ailments v2 (ailments-v2.md) and the Class Traits (neuausrichtung-v1.md 2.1). */

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const payoffs = (events: readonly CombatEvent[], kind: PayoffKind) =>
  ofType(events, "payoff").filter((e) => e.payoff === kind);

const NO_CRIT = { critChance: -1 };

const always = (ailment: AilmentType, extra: Partial<typeof TEST_WEAPON> = {}) => ({
  ...TEST_WEAPON,
  ailmentChances: [{ ailment, chance: 1 }],
  ...extra,
});

function play(hero: CombatantSetup, enemy: CombatantSetup, seconds: number) {
  const fight = new Fight(hero, enemy, 1);
  fight.advance(seconds);
  return fight;
}

describe("Ailment Effect", () => {
  it("makes DoTs deal more, not last longer", () => {
    const plain = applyAilment({}, "bleed", 3, 100);
    const strong = applyAilment({}, "bleed", 3, 100, undefined, 0.5);
    expect(strong.bleed?.damagePerSecond).toBeCloseTo((plain.bleed?.damagePerSecond ?? 0) * 1.5);
    expect(strong.bleed?.remaining).toBe(plain.bleed?.remaining);
  });

  it("makes Chill slow more, up to its cap", () => {
    expect(chillFactor(applyAilment({}, "chill", 2, 1))).toBeCloseTo(1 - COMBAT.chillSlow);
    expect(chillFactor(applyAilment({}, "chill", 2, 1, undefined, 0.5))).toBeCloseTo(
      1 - COMBAT.chillSlow * 1.5,
    );
    expect(chillFactor(applyAilment({}, "chill", 2, 1, undefined, 5))).toBeCloseTo(
      1 - COMBAT.chillMaxSlow,
    );
  });

  it("Shock stacks up to three and Ailment Effect raises it up to its cap", () => {
    let s = {};
    for (let i = 0; i < 5; i++) s = applyAilment(s, "shock", 3, 1);
    expect(damageTakenBonus(s)).toBeCloseTo(COMBAT.shockDamageTaken * COMBAT.shockMaxStacks);
    let strong = {};
    for (let i = 0; i < 3; i++) strong = applyAilment(strong, "shock", 3, 1, undefined, 5);
    expect(damageTakenBonus(strong)).toBeCloseTo(COMBAT.shockMaxDamageTaken);
    // A stack wears off with the whole Shock, not one by one.
    expect(stepAilments(s, 3.1).states.shock).toBeUndefined();
  });
});

describe("built-in payoffs", () => {
  it("Overflow: a Poison stack pushed off at the cap bursts for its rest", () => {
    const fast = always("poison", { attacksPerSecond: 8 });
    const fight = play(setup({ weapon: fast, bonuses: NO_CRIT }), dummy(), 4);
    const bursts = payoffs(fight.events, "overflow");
    expect(bursts.length).toBeGreaterThan(0);
    expect(ofType(fight.events, "hit").some((h) => h.source === "Overflow")).toBe(true);
  });

  it("Combust: a Fire hit on a burning enemy sets off part of the Burn, which keeps burning", () => {
    const fire = always("burn", { damageType: "fire" });
    const fight = play(setup({ weapon: fire, bonuses: NO_CRIT }), dummy(), 2.05);
    const combust = payoffs(fight.events, "combust");
    // The first hit lights the Burn, the second one combusts it.
    expect(combust).toHaveLength(1);
    expect(combust[0]?.damage).toBeGreaterThan(0);
    expect(fight.snapshot().enemy.ailments.some((a) => a.type === "burn")).toBe(true);
    // A Physical hit does not combust.
    const plain = play(setup({ weapon: always("burn"), bonuses: NO_CRIT }), dummy(), 2.05);
    expect(payoffs(plain.events, "combust")).toHaveLength(0);
  });

  it("Immolate combusts three times over", () => {
    const immolate: SkillDefinition = {
      ...TEST_SKILL,
      id: "immolate",
      name: "Immolate",
      type: "spell",
      heatCost: 0,
      hits: [
        {
          kind: "spell",
          damage: { min: 10, max: 10 },
          damageType: "fire",
          ailmentChances: [{ ailment: "burn", chance: 1 }],
        },
      ],
      effects: [{ kind: "combust", times: 3 }],
    };
    const hero = setup({ rotation: [{ skill: immolate }], bonuses: NO_CRIT });
    const fight = play(hero, dummy(), 1.05);
    // The hit lights the Burn (nothing to combust yet), then Immolate sets it off at once.
    const combust = payoffs(fight.events, "combust");
    expect(combust).toHaveLength(1);
    expect(combust[0]?.damage).toBeGreaterThan(0);
  });

  it("Collapse: Corruption at full growth bursts and falls back to half growth", () => {
    let s = applyAilment({}, "corruption", 30, 100);
    const ticks = [];
    for (let i = 0; i < 14; i++) {
      const step = stepAilments(s, 1);
      s = step.states;
      ticks.push(...step.ticks);
    }
    const collapse = ticks.find((t) => t.collapse);
    expect(collapse).toBeDefined();
    const full = 100 * COMBAT.corruptionDamagePerSecond * (1 + COMBAT.corruptionRampPerTick * 12);
    expect(collapse?.damage).toBeCloseTo(full * COMBAT.collapseSeconds);
    expect(s.corruption?.ramp).toBeLessThan(COMBAT.corruptionMaxRamp);
  });
});

describe("Class Traits", () => {
  it("Fury: Default Attacks build it, the Innate spends all of it for 10 % more per Fury", () => {
    const innate = { ...TEST_SKILL, id: "test-innate" };
    const cinderguard = setup({
      rules: { fury: { perStack: 0.1, maxStacks: 10 } },
      bonuses: NO_CRIT,
      weapon: { ...TEST_WEAPON, damage: { min: 100, max: 100 } },
      weaponRules: { innateId: innate.id },
      rotation: [{ skill: innate }],
    });
    const fight = play(cinderguard, dummy(), 8.05);
    const hits = ofType(fight.events, "hit").filter((h) => h.side === "hero");
    const first = hits.findIndex((h) => h.source === innate.name);
    const second = hits.findIndex((h, i) => i > first && h.source === innate.name);
    expect(first).toBeGreaterThan(0);
    // Each Default Attack before the cast is one Fury; the cast resets it.
    expect(hits[first]?.damage).toBe(Math.round(200 * (1 + 0.1 * first)));
    expect(hits[second]?.damage).toBe(Math.round(200 * (1 + 0.1 * (second - first - 1))));
    expect(payoffs(fight.events, "fury").length).toBeGreaterThan(0);
  });

  it("Hunter's Mark: clean Default Attacks mark the enemy, the next Crit spends the Marks", () => {
    const ashstrider = setup({
      rules: { huntersMark: { perStack: 0.1, maxStacks: 10 } },
      bonuses: NO_CRIT,
      weapon: { ...TEST_WEAPON, damage: { min: 100, max: 100 }, precision: 1 },
      // Every 4th Default Attack crits, the others never do.
      weaponRules: { everyNthCrit: 4 },
    });
    const fight = play(ashstrider, dummy(), 10.05);
    const hits = ofType(fight.events, "hit").filter((h) => h.side === "hero");
    const plain = hits[0]?.damage ?? 0;
    const crits = hits.filter((h) => h.crit);
    expect(crits.length).toBeGreaterThan(1);
    // Three clean hits before every Crit: 3 Marks, +30 % on top of the Crit.
    for (const c of crits) {
      expect(c.damage).toBe(Math.round(plain * COMBAT.critMultiplier * 1.3));
    }
    expect(payoffs(fight.events, "huntersMark").length).toBe(crits.length);
  });

  it("Overcharge: every third skill sets off a Nova of the weapon's element with its ailment", () => {
    const spell: SkillDefinition = {
      ...TEST_SKILL,
      id: "spell",
      heatCost: 10,
      hits: [{ kind: "spell", damage: { min: 1, max: 1 }, damageType: "cold" }],
    };
    const emberseer = setup({
      rules: { overcharge: { charges: 3, multiplier: 1.5 } },
      weapon: { ...TEST_WEAPON, damageType: "void", heatPerHit: 10, attacksPerSecond: 2 },
      rotation: [{ skill: spell }],
      bonuses: NO_CRIT,
    });
    const fight = play(emberseer, dummy(), 6.05);
    const novas = ofType(fight.events, "hit").filter((h) => h.source === "Overcharge");
    expect(payoffs(fight.events, "overcharge")).toHaveLength(novas.length);
    expect(novas.length).toBeGreaterThanOrEqual(1);
    expect(novas[0]?.damage).toBe(15);
    expect(novas[0]?.damageType).toBe("void");
    expect(ofType(fight.events, "ailment").some((a) => a.ailment === "corruption")).toBe(true);
  });

  it("Spark: the Default Attack after a skill hits harder and sets its element's ailment", () => {
    const spell: SkillDefinition = {
      ...TEST_SKILL,
      id: "spell",
      heatCost: 10,
      hits: [{ kind: "spell", damage: { min: 1, max: 1 }, damageType: "fire" }],
    };
    const sorcerer = setup({
      rules: { spark: { damage: 0.5 } },
      weapon: { ...TEST_WEAPON, damageType: "lightning", heatPerHit: 10 },
      rotation: [{ skill: spell }],
      bonuses: NO_CRIT,
    });
    const fight = play(sorcerer, dummy(), 3.05);
    const attacks = ofType(fight.events, "hit").filter(
      (h) => h.source === TEST_WEAPON.defaultAttack,
    );
    expect(payoffs(fight.events, "spark")).toHaveLength(1);
    expect(attacks.map((h) => h.damage)).toEqual([10, 15]);
    expect(ofType(fight.events, "ailment").some((a) => a.ailment === "shock")).toBe(true);
  });

  it("Lingering: ailments deal more the longer the fight runs, up to the cap", () => {
    const bleeder = (rules?: CombatantSetup["rules"]) =>
      setup({ weapon: always("bleed"), bonuses: NO_CRIT, ...(rules ? { rules } : {}) });
    const dots = (hero: CombatantSetup, seconds: number) =>
      ofType(play(hero, dummy(), seconds).events, "dot").at(-1)?.damage ?? 0;
    const lingering = { lingering: { perSecond: 0.01, max: 0.4 } };
    expect(dots(bleeder(lingering), 20.5)).toBeGreaterThan(dots(bleeder(), 20.5));
    expect(dots(bleeder(lingering), 80.5)).toBe(Math.round(dots(bleeder(), 80.5) * 1.4));
  });

  it("merge from one source: the class", () => {
    const fury = { perStack: 0.1, maxStacks: 10 };
    const rules = mergeRules({ fury }, { fury: { perStack: 1, maxStacks: 1 } }, undefined);
    expect(rules.fury).toEqual(fury);
    expect(mergeRules({}).overcharge).toBeUndefined();
  });
});
