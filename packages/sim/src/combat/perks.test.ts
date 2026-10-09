import { describe, expect, it } from "vitest";
import { type CombatEvent, Fight, runFight } from "./fight";
import { PERK, PERKS, type PerkId, perksFor } from "./perks";
import { deriveStats } from "./stats";
import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, SkillDefinition, TriggerSpec } from "./types";

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const perkEvents = (events: readonly CombatEvent[], perk: PerkId) =>
  ofType(events, "perk").filter((e) => e.perk === perk);

const NO_CRIT = { critChance: -1 };
const ALWAYS_CRIT = { critChance: 2 };

/** A fight played for `seconds`. */
function play(hero: CombatantSetup, enemy: CombatantSetup, seconds: number, seed = 1) {
  const fight = new Fight(hero, enemy, seed);
  fight.advance(seconds);
  return fight;
}

describe("Attribute Breakpoints", () => {
  it("open three Perks per attribute at 4, 7 and 10", () => {
    expect(PERKS).toHaveLength(18);
    expect(perksFor({ ...ZERO_ATTRIBUTES, strength: 3 })).toEqual([]);
    expect(perksFor({ ...ZERO_ATTRIBUTES, strength: 4, vitality: 7 })).toEqual([
      "heavyHand",
      "rally",
      "ironHide",
    ]);
    expect(perksFor({ ...ZERO_ATTRIBUTES, agility: 12 })).toEqual([
      "lightFeet",
      "sidestep",
      "doubleTime",
    ]);
  });
});

describe("the hero's attribute scale", () => {
  it("gives big steps per point, Life and Armor as percentages", () => {
    const heir = deriveStats(
      setup({
        attributeScale: "heir",
        attributes: { ...ZERO_ATTRIBUTES, strength: 5, vitality: 10, agility: 4 },
        bonuses: { armor: 100 },
      }),
    );
    expect(heir.physicalDamage).toBeCloseTo(0.4);
    expect(heir.maxLife).toBe(160);
    expect(heir.armor).toBeCloseTo(130);
    expect(heir.attackSpeed).toBeCloseTo(1.12);
    // Monsters keep the classic scale.
    const classic = deriveStats(
      setup({ attributes: { ...ZERO_ATTRIBUTES, strength: 5, vitality: 10 } }),
    );
    expect(classic.physicalDamage).toBeCloseTo(0.05);
    expect(classic.maxLife).toBe(150);
  });

  it("stat Perks: Bulwark, Attuned and Focus", () => {
    const stats = deriveStats(
      setup({ perks: ["bulwark", "attuned", "focus"], bonuses: { blockValue: 20 } }),
    );
    expect(stats.blockValue).toBeCloseTo(25);
    expect(stats.elementalPenetration).toBeCloseTo(PERK.attunedPenetration);
    expect(stats.startingHeat).toBe(PERK.focusHeat);
  });
});

describe("Perks in the fight", () => {
  it("Heavy Hand: Crits add Sunder", () => {
    const fight = play(setup({ perks: ["heavyHand"], bonuses: ALWAYS_CRIT }), dummy(), 3.05);
    expect(perkEvents(fight.events, "heavyHand")).toHaveLength(3);
    expect(fight.snapshot().enemy.curses[0]).toMatchObject({ name: "Sunder", stacks: 3 });
  });

  it("Titan: a big hit stuns, then waits for its cooldown", () => {
    const enemy = setup({ baseLife: 50, weapon: { ...TEST_WEAPON, attacksPerSecond: 0 } });
    const fight = play(setup({ perks: ["titan"], bonuses: NO_CRIT }), enemy, 3.05);
    expect(perkEvents(fight.events, "titan")).toHaveLength(1);
    expect(ofType(fight.events, "stun")[0]?.seconds).toBeCloseTo(PERK.titanStun);
    // A small hit does nothing.
    const tough = play(setup({ perks: ["titan"], bonuses: NO_CRIT }), dummy(), 3.05);
    expect(perkEvents(tough.events, "titan")).toHaveLength(0);
  });

  it("Steady Hand: more Precision", () => {
    const glancing = (perks: PerkId[]) =>
      ofType(
        play(setup({ perks, weapon: { ...TEST_WEAPON, precision: 0.5 } }), dummy(), 200).events,
        "hit",
      ).filter((h) => h.glancing).length;
    expect(glancing(["steadyHand"])).toBeLessThan(glancing([]));
  });

  it("Opportunist: Glancing Blows fire On Hit triggers", () => {
    const trigger: TriggerSpec = {
      id: "t",
      name: "Spark",
      condition: { kind: "onHit" },
      effect: { kind: "heat", amount: 1 },
    };
    const count = (perks: PerkId[]) =>
      ofType(
        play(
          setup({ perks, triggers: [trigger], weapon: { ...TEST_WEAPON, precision: 0 } }),
          dummy(),
          5.05,
        ).events,
        "trigger",
      ).length;
    expect(count([])).toBe(0);
    expect(count(["opportunist"])).toBe(5);
  });

  it("True Shot: every 5th attack is a clean Crit", () => {
    const fight = play(
      setup({ perks: ["trueShot"], bonuses: NO_CRIT, weapon: { ...TEST_WEAPON, precision: 0 } }),
      dummy(),
      10.05,
    );
    const hits = ofType(fight.events, "hit");
    expect(hits.filter((h) => h.crit)).toHaveLength(2);
    expect(hits[4]).toMatchObject({ crit: true });
    expect(hits[4]?.glancing).toBeUndefined();
  });

  it("Overload: elemental hits get a chance of their ailment", () => {
    const fire = { ...TEST_WEAPON, damageType: "fire" as const };
    const burns = (perks: PerkId[]) =>
      ofType(play(setup({ perks, weapon: fire }), dummy(), 100).events, "ailment").length;
    expect(burns([])).toBe(0);
    expect(burns(["overload"])).toBeGreaterThan(3);
  });

  it("Archmage: the first Spell of a fight deals double damage", () => {
    const spell: SkillDefinition = {
      ...TEST_SKILL,
      type: "spell",
      heatCost: 0,
      hits: [{ kind: "spell", damage: { min: 20, max: 20 }, damageType: "fire" }],
    };
    const hero = (perks: PerkId[]) => setup({ perks, rotation: [{ skill: spell }], bonuses: NO_CRIT });
    const spellHits = (perks: PerkId[]) =>
      ofType(play(hero(perks), dummy(), 2.05).events, "hit").map((h) => h.damage);
    expect(spellHits([])).toEqual([20, 20]);
    expect(spellHits(["archmage"])).toEqual([40, 20]);
  });

  it("Light Feet: the first enemy attack of a fight misses", () => {
    const fight = play(dummy({ perks: ["lightFeet"] }), setup({ bonuses: NO_CRIT }), 2.05);
    const enemyHits = ofType(fight.events, "hit").filter((h) => h.side === "enemy");
    expect(ofType(fight.events, "evade")).toHaveLength(1);
    expect(enemyHits).toHaveLength(1);
    expect(perkEvents(fight.events, "lightFeet")).toHaveLength(1);
  });

  it("Sidestep: Heat on Evade", () => {
    const hero = dummy({
      perks: ["sidestep"],
      bonuses: { evasion: 1 },
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0, heatBehavior: "steady" },
    });
    const fight = play(hero, setup(), 10.05);
    const evades = ofType(fight.events, "evade").length;
    expect(evades).toBeGreaterThan(0);
    expect(perkEvents(fight.events, "sidestep")).toHaveLength(evades);
    expect(fight.snapshot().hero.heat).toBeCloseTo(evades * PERK.sidestepHeat);
  });

  it("Double Time: every 4th attack strikes twice", () => {
    const fight = play(setup({ perks: ["doubleTime"], bonuses: NO_CRIT }), dummy(), 8.05);
    expect(ofType(fight.events, "hit")).toHaveLength(10);
    expect(perkEvents(fight.events, "doubleTime")).toHaveLength(2);
  });

  it("Afterglow: skills refund part of their Heat Cost", () => {
    const skill = { ...TEST_SKILL, heatCost: 20 };
    const hero = setup({
      perks: ["afterglow"],
      rotation: [{ skill }],
      bonuses: { ...NO_CRIT, startingHeat: 20 },
    });
    const fight = play(hero, dummy(), 1.05);
    expect(fight.snapshot().hero.heat).toBeCloseTo(skill.heatCost * PERK.afterglowRefund);
  });

  it("Clarity: own ailments last longer", () => {
    const bleed = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const remaining = (perks: PerkId[]) =>
      play(setup({ perks, weapon: bleed }), dummy(), 1.05).snapshot().enemy.ailments[0]?.remaining ??
      0;
    expect(remaining(["clarity"]) - remaining([])).toBeCloseTo(PERK.claritySeconds);
  });

  it("Rally: once per fight below 30 % Life", () => {
    const hero = dummy({ perks: ["rally"], baseLife: 100 });
    const enemy = setup({ weapon: { ...TEST_WEAPON, damage: { min: 30, max: 30 } }, bonuses: NO_CRIT });
    const result = runFight(hero, enemy, 1);
    expect(perkEvents(result.events, "rally")).toHaveLength(1);
    expect(ofType(result.events, "heal")[0]?.amount).toBe(15);
  });

  it("Iron Hide: less damage from ailments", () => {
    const poisoner = setup({
      weapon: { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed", chance: 1 }] },
      bonuses: NO_CRIT,
    });
    const dots = (perks: PerkId[]) =>
      ofType(play(dummy({ perks }), poisoner, 3.05).events, "dot").reduce(
        (sum, d) => sum + d.damage,
        0,
      );
    expect(dots(["ironHide"])).toBeLessThan(dots([]));
  });

  it("Undying: once per fight a deadly blow leaves 1 Life", () => {
    const hero = dummy({ perks: ["undying"], baseLife: 10 });
    const enemy = setup({ weapon: { ...TEST_WEAPON, damage: { min: 50, max: 50 } }, bonuses: NO_CRIT });
    const result = runFight(hero, enemy, 1);
    expect(perkEvents(result.events, "undying")).toHaveLength(1);
    expect(result.winner).toBe("enemy");
    expect(result.duration).toBeCloseTo(2, 1);
  });
});
