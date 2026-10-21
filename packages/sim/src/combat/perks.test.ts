import { describe, expect, it } from "vitest";
import { COMBAT } from "./constants";
import type { CombatEvent } from "./events";
import { Fight, runFight } from "./fight";
import { PERK, PERKS, type PerkId, perksFor } from "./perks";
import { deriveStats } from "./stats";
import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, TriggerSpec } from "./types";

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const perkEvents = (events: readonly CombatEvent[], perk: PerkId) =>
  ofType(events, "perk").filter((e) => e.perk === perk);

const NO_CRIT = { critChance: -1 };
const ALWAYS_CRIT = { critChance: 2 };
/** Every clean hit is a Mighty Hit. */
const MIGHTY = { ...TEST_WEAPON, precision: 1, mightyAt: 0 };

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
      "armorbreaker",
      "secondBreath",
      "thickSkin",
    ]);
    expect(perksFor({ ...ZERO_ATTRIBUTES, agility: 12 })).toEqual([
      "hawkeye",
      "opportunist",
      "doubleTime",
    ]);
    expect(new Set(perksFor({ ...ZERO_ATTRIBUTES, dexterity: 10 }))).toEqual(
      new Set(["quickReflexes", "emberDance", "trueShot"]),
    );
  });
});

describe("the hero's attribute scale", () => {
  it("gives big steps per point, Life and Armor as percentages", () => {
    const heir = deriveStats(
      setup({
        attributeScale: "heir",
        mainAttribute: "strength",
        attributes: { ...ZERO_ATTRIBUTES, strength: 5, vitality: 10, agility: 4, dexterity: 3 },
        bonuses: { armor: 100 },
      }),
    );
    // The main attribute gives damage of every type; DEX gives Evasion, AGI Crit Chance.
    expect(heir.physicalDamage).toBeCloseTo(0.4);
    expect(heir.elementalDamage).toBeCloseTo(0.4);
    expect(heir.evasion).toBeCloseTo(0.06);
    expect(heir.critChance).toBeCloseTo(COMBAT.baseCritChance + 0.06);
    expect(heir.maxLife).toBe(160);
    expect(heir.armor).toBeCloseTo(130);
    expect(heir.attackSpeed).toBeCloseTo(1.12);
    // Without its class, Strength adds no damage, only Armor.
    const other = deriveStats(
      setup({
        attributeScale: "heir",
        mainAttribute: "intelligence",
        attributes: { ...ZERO_ATTRIBUTES, strength: 5 },
      }),
    );
    expect(other.physicalDamage).toBe(0);
    // Monsters keep the classic scale.
    const classic = deriveStats(
      setup({ attributes: { ...ZERO_ATTRIBUTES, strength: 5, vitality: 10 } }),
    );
    expect(classic.physicalDamage).toBeCloseTo(0.05);
    expect(classic.maxLife).toBe(150);
  });

  it("stat Perks: Stoneguard, Attuned and Inner Fire", () => {
    const stats = deriveStats(setup({ perks: ["stoneguard", "attuned", "innerFire"] }));
    expect(stats.blockReduction).toBeCloseTo(COMBAT.blockReduction + PERK.stoneguardBlock);
    expect(stats.elementalPenetration).toBeCloseTo(PERK.attunedPenetration);
    expect(stats.physicalPenetration).toBeCloseTo(PERK.attunedPenetration);
    expect(stats.startingHeat).toBe(PERK.innerFireHeat);
  });
});

describe("Perks in the fight", () => {
  it("Armorbreaker: Mighty Hits add Sunder, other hits do not", () => {
    const plain = play(setup({ perks: ["armorbreaker"], bonuses: ALWAYS_CRIT }), dummy(), 3.05);
    expect(perkEvents(plain.events, "armorbreaker")).toHaveLength(0);
    const fight = play(setup({ perks: ["armorbreaker"], weapon: MIGHTY }), dummy(), 3.05);
    expect(perkEvents(fight.events, "armorbreaker")).toHaveLength(3);
    expect(fight.snapshot().enemy.curses[0]).toMatchObject({ name: "Sunder", stacks: 3 });
  });

  it("Armorbreaker: its Sunder lowers Resistance too", () => {
    const hits = play(
      setup({ perks: ["armorbreaker"], weapon: { ...MIGHTY, damageType: "fire" } }),
      dummy({ bonuses: { allResistance: 0.5 } }),
      4.05,
    ).events.filter((e) => e.type === "hit");
    const damage = hits.map((h) => (h.type === "hit" ? h.damage : 0));
    expect(damage[3]).toBeGreaterThan(damage[0] ?? 0);
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

  it("Hawkeye: more Precision", () => {
    const glancing = (perks: PerkId[]) =>
      ofType(
        play(setup({ perks, weapon: { ...TEST_WEAPON, precision: 0.5 } }), dummy(), 200).events,
        "hit",
      ).filter((h) => h.glancing).length;
    expect(glancing(["hawkeye"])).toBeLessThan(glancing([]));
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
    const fight = play(
      setup({ perks: ["opportunist"], weapon: { ...TEST_WEAPON, precision: 0 } }),
      dummy(),
      5.05,
    );
    expect(perkEvents(fight.events, "opportunist")).toHaveLength(5);
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

  it("Surge: elemental hits get a chance of their ailment, every ailment a better one", () => {
    const fire = { ...TEST_WEAPON, damageType: "fire" as const };
    const burns = (perks: PerkId[]) =>
      ofType(play(setup({ perks, weapon: fire }), dummy(), 100).events, "ailment").length;
    expect(burns([])).toBe(0);
    expect(burns(["surge"])).toBeGreaterThan(3);
    const bleeding = {
      ...TEST_WEAPON,
      ailmentChances: [{ ailment: "bleed" as const, chance: 0.1 }],
    };
    const bleeds = (perks: PerkId[]) =>
      ofType(play(setup({ perks, weapon: bleeding }), dummy(), 200).events, "ailment").length;
    expect(bleeds(["surge"])).toBeGreaterThan(bleeds([]) * 1.4);
  });

  it("Barrier Burst: a broken Barrier hits back once, again after it was full", () => {
    const hero = dummy({
      perks: ["barrierBurst"],
      bonuses: { barrier: 40 },
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0, damageType: "cold" },
    });
    const enemy = setup({
      weapon: { ...TEST_WEAPON, damage: { min: 30, max: 30 } },
      bonuses: NO_CRIT,
      baseLife: 100_000,
    });
    const fight = play(hero, enemy, 3.05);
    const max = deriveStats(hero).barrier;
    const bursts = ofType(fight.events, "hit").filter((h) => h.source === "Barrier Burst");
    // The Barrier breaks on the 2nd hit and gets no time to fill up again: one burst.
    expect(bursts).toHaveLength(1);
    expect(bursts[0]).toMatchObject({ side: "hero", damageType: "cold" });
    expect(bursts[0]?.damage).toBe(Math.round(max * PERK.barrierBurst));
    expect(ofType(fight.events, "ailment").some((a) => a.ailment === "chill")).toBe(true);
  });

  it("Quick Reflexes: the first enemy attack of a fight misses", () => {
    const fight = play(dummy({ perks: ["quickReflexes"] }), setup({ bonuses: NO_CRIT }), 2.05);
    const enemyHits = ofType(fight.events, "hit").filter((h) => h.side === "enemy");
    expect(ofType(fight.events, "evade")).toHaveLength(1);
    expect(enemyHits).toHaveLength(1);
    expect(perkEvents(fight.events, "quickReflexes")).toHaveLength(1);
  });

  it("Ember Dance: Heat on Evade", () => {
    const hero = dummy({
      perks: ["emberDance"],
      bonuses: { evasion: 1 },
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0, heatBehavior: "steady" },
    });
    const fight = play(hero, setup(), 10.05);
    const evades = ofType(fight.events, "evade").length;
    expect(evades).toBeGreaterThan(0);
    expect(perkEvents(fight.events, "emberDance")).toHaveLength(evades);
    expect(fight.snapshot().hero.heat).toBeCloseTo(evades * PERK.emberDanceHeat);
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
    expect(perkEvents(fight.events, "afterglow")).toHaveLength(1);
    // Inner Fire shows itself when the fight opens.
    const focused = play(setup({ perks: ["innerFire"] }), dummy(), 0.05);
    expect(perkEvents(focused.events, "innerFire")).toHaveLength(1);
  });

  it("Clarity: the built-in payoffs hit harder (Poison Overflow)", () => {
    const poison = {
      ...TEST_WEAPON,
      attacksPerSecond: 6,
      ailmentChances: [{ ailment: "poison" as const, chance: 1 }],
    };
    const overflow = (perks: PerkId[]) =>
      play(setup({ perks, weapon: poison, bonuses: NO_CRIT }), dummy(), 40)
        .events.filter((e) => e.type === "payoff" && e.payoff === "overflow")
        .reduce((sum, e) => sum + (e.type === "payoff" ? (e.damage ?? 0) : 0), 0);
    expect(overflow([])).toBeGreaterThan(0);
    expect(overflow(["clarity"])).toBeGreaterThan(overflow([]) * 1.15);
  });

  it("Second Breath: once per fight below 30 % Life", () => {
    const hero = dummy({ perks: ["secondBreath"], baseLife: 100 });
    const enemy = setup({
      weapon: { ...TEST_WEAPON, damage: { min: 30, max: 30 } },
      bonuses: NO_CRIT,
    });
    const result = runFight(hero, enemy, 1);
    expect(perkEvents(result.events, "secondBreath")).toHaveLength(1);
    expect(ofType(result.events, "heal")[0]?.amount).toBe(15);
  });

  it("Thick Skin: less damage from ailments", () => {
    const poisoner = setup({
      weapon: { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed", chance: 1 }] },
      bonuses: NO_CRIT,
    });
    const dots = (perks: PerkId[]) =>
      ofType(play(dummy({ perks }), poisoner, 3.05).events, "dot").reduce(
        (sum, d) => sum + d.damage,
        0,
      );
    expect(dots(["thickSkin"])).toBeLessThan(dots([]));
  });

  it("Undying: once per fight a deadly blow leaves 1 Life", () => {
    const hero = dummy({ perks: ["undying"], baseLife: 10 });
    const enemy = setup({
      weapon: { ...TEST_WEAPON, damage: { min: 50, max: 50 } },
      bonuses: NO_CRIT,
    });
    const result = runFight(hero, enemy, 1);
    expect(perkEvents(result.events, "undying")).toHaveLength(1);
    expect(result.winner).toBe("enemy");
    expect(result.duration).toBeCloseTo(2, 1);
  });
});
