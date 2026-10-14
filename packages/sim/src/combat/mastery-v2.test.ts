import { describe, expect, it } from "vitest";
import { stepAilments } from "./ailments";
import type { CombatEvent } from "./events";
import { Fight } from "./fight";
import { TEST_SKILL, TEST_WEAPON, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, SkillDefinition, TelegraphSpec, WeaponRules } from "./types";

/** Weapon Mastery v2 (weapon-mastery-v2.md): Mighty Hits, Parry and the path mechanics. */

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const hits = (events: readonly CombatEvent[], side: "hero" | "enemy" = "hero") =>
  ofType(events, "hit").filter((h) => h.side === side);

const NO_CRIT = { critChance: -1 };
const ALL_CRIT = { critChance: 1 };

function play(hero: CombatantSetup, enemy: CombatantSetup, seconds: number, seed = 1) {
  const fight = new Fight(hero, enemy, seed);
  fight.advance(seconds);
  return fight;
}

/** A hero with the test blade (10 damage) and Weapon Mastery rules. */
const hero = (weaponRules: WeaponRules, extra: Partial<CombatantSetup> = {}) =>
  setup({ weaponRules, bonuses: NO_CRIT, ...extra });

/** An enemy that attacks once per second for 10. */
const attacker = (extra: Partial<CombatantSetup> = {}) =>
  setup({ name: "Brute", baseLife: 100_000, ...extra });

describe("Mighty Hits", () => {
  // Mighty Hits belong to Mastery weapons, which roll Precision.
  const mighty = { ...TEST_WEAPON, mightyAt: 10, precision: 1 };

  it("a clean roll at the threshold is a Mighty Hit and gets its bonuses", () => {
    const plain = play(hero({}, { weapon: mighty }), dummy(), 1.05);
    const strong = play(hero({ mightyDamage: 0.5 }, { weapon: mighty }), dummy(), 1.05);
    expect(hits(plain.events)[0]).toMatchObject({ mighty: true, damage: 10 });
    expect(hits(strong.events)[0]?.damage).toBe(15);
  });

  it("is never Mighty below the threshold or when the hit glances", () => {
    const below = play(
      hero({ mightyDamage: 1 }, { weapon: { ...mighty, mightyAt: 11 } }),
      dummy(),
      1.05,
    );
    expect(hits(below.events)[0]?.mighty).toBeUndefined();
    const glancing = { ...mighty, precision: 0 };
    const glanced = play(hero({ mightyDamage: 1 }, { weapon: glancing }), dummy(), 1.05);
    expect(hits(glanced.events)[0]).toMatchObject({ glancing: true, damage: 5 });
    expect(hits(glanced.events)[0]?.mighty).toBeUndefined();
  });

  it("Wild Shot: a Mighty roll never glances; Headsplitter: it always crits", () => {
    const glancing = { ...mighty, precision: 0 };
    const wild = play(hero({ mightyNeverGlances: true }, { weapon: glancing }), dummy(), 1.05);
    expect(hits(wild.events)[0]).toMatchObject({ mighty: true });
    expect(hits(wild.events)[0]?.glancing).toBeUndefined();
    const head = play(hero({ mightyCrit: true }, { weapon: mighty }), dummy(), 1.05);
    expect(hits(head.events)[0]).toMatchObject({ mighty: true, crit: true });
  });

  it("stuns, Sunders, Bleeds and drains Heat", () => {
    const rules: WeaponRules = {
      mightyStun: 0.3,
      mightySunder: 2,
      mightyBleed: 1.5,
      mightyHeatDrain: 15,
    };
    const fight = play(
      hero(rules, { weapon: mighty }),
      dummy({ bonuses: { startingHeat: 50 } }),
      1.05,
    );
    const snap = fight.snapshot();
    expect(ofType(fight.events, "stun")).toHaveLength(1);
    expect(snap.enemy.curses.find((c) => c.name === "Sunder")?.stacks).toBe(2);
    expect(snap.enemy.ailments.some((a) => a.type === "bleed")).toBe(true);
    expect(snap.enemy.heat).toBeLessThan(50);
  });

  it("Master of Payload: a skill hit marked Mighty always is one", () => {
    const wide = { ...TEST_WEAPON, damage: { min: 5, max: 10 }, mightyAt: 10, precision: 1 };
    const bolt: SkillDefinition = {
      ...TEST_SKILL,
      heatCost: 0,
      hits: [{ kind: "weapon", multiplier: 1, mighty: true }],
    };
    const fight = play(hero({}, { weapon: wide, rotation: [{ skill: bolt }] }), dummy(), 1.05);
    expect(hits(fight.events)[0]).toMatchObject({ source: bolt.name, mighty: true, damage: 10 });
  });
});

describe("Parry", () => {
  it("turns enemy attacks into Glancing Blows and fires On Parry", () => {
    const rules: WeaponRules = { parry: 1 };
    const triggers = [
      {
        id: "iron-wall",
        name: "Iron Wall",
        condition: { kind: "onParry" as const },
        effect: { kind: "heat" as const, amount: 8 },
      },
    ];
    const fight = play(dummy({ weaponRules: rules, triggers, bonuses: NO_CRIT }), attacker(), 1.05);
    const taken = hits(fight.events, "enemy")[0];
    expect(taken).toMatchObject({ parried: true, glancing: true, damage: 5 });
    expect(ofType(fight.events, "trigger").some((t) => t.name === "Iron Wall")).toBe(true);
  });

  it("Read the Blow: after a Parry the next own hit is a clean Crit", () => {
    const rules: WeaponRules = { parry: 1, critAfter: ["parry"] };
    const fight = play(
      hero(rules, { weapon: { ...TEST_WEAPON, precision: 0.5 } }),
      attacker(),
      2.05,
    );
    expect(hits(fight.events).some((h) => h.crit)).toBe(true);
  });
});

describe("extra attacks", () => {
  const riposte = [
    {
      id: "riposte",
      name: "Riposte",
      condition: { kind: "onHit" as const },
      effect: { kind: "extraAttack" as const },
    },
  ];
  const onHitHeat = [
    {
      id: "spark",
      name: "Spark",
      condition: { kind: "onHit" as const },
      effect: { kind: "heat" as const, amount: 1 },
    },
  ];

  it("Extra-Attack Damage raises Ripostes and Split Shots, not the Default Attack", () => {
    const split = [
      {
        id: "split",
        name: "Split Shot",
        condition: { kind: "onHit" as const },
        effect: { kind: "weaponHit" as const, multiplier: 0.6, extra: true },
      },
    ];
    const fight = play(hero({ extraAttackDamage: 0.5 }, { triggers: split }), dummy(), 1.05);
    const [first, second] = hits(fight.events);
    expect(first?.damage).toBe(10);
    expect(second?.damage).toBe(9);
  });

  it("Path Masters: extra attacks fire triggers, the ones they cause do not", () => {
    const plain = play(hero({}, { triggers: [...riposte, ...onHitHeat] }), dummy(), 1.05);
    const master = play(
      hero({ extraAttacksTrigger: true }, { triggers: [...riposte, ...onHitHeat] }),
      dummy(),
      1.05,
    );
    const sparks = (f: Fight) =>
      ofType(f.events, "trigger").filter((t) => t.name === "Spark").length;
    expect(sparks(plain)).toBe(1);
    expect(sparks(master)).toBe(2);
    // The second Riposte (from the first one) does not chain on.
    expect(hits(master.events)).toHaveLength(3);
  });

  it("Thousand Needles: extra attacks always Poison", () => {
    const fight = play(
      hero({ extraAttackAilments: ["poison"] }, { triggers: riposte }),
      dummy(),
      1.05,
    );
    expect(ofType(fight.events, "ailment").filter((a) => a.ailment === "poison")).toHaveLength(1);
  });

  it("Spring Trap: every Nth Glancing Blow fires a free Bolt", () => {
    const fight = play(
      hero({ glancingExtraAttack: 2 }, { weapon: { ...TEST_WEAPON, precision: 0 } }),
      dummy(),
      2.05,
    );
    expect(ofType(fight.events, "trigger").filter((t) => t.name === "Spring Trap")).toHaveLength(1);
  });
});

describe("streaks and Crits", () => {
  it("Clean Line: after N clean hits the next one deals more", () => {
    const fight = play(
      hero({ cleanLine: { hits: 2, bonus: 1 } }, { weapon: { ...TEST_WEAPON, precision: 1 } }),
      dummy(),
      3.05,
    );
    expect(hits(fight.events).map((h) => h.damage)).toEqual([10, 10, 20]);
  });

  it("Ambush: every hit in the first seconds crits", () => {
    const fight = play(
      hero({ ambush: 2 }, { weapon: { ...TEST_WEAPON, precision: 1 } }),
      dummy(),
      3.05,
    );
    expect(hits(fight.events).map((h) => h.crit)).toEqual([true, false, false]);
  });

  it("Repeater: a volley of bolts shares one Crit roll", () => {
    const fight = play(
      hero({ volley: { count: 3, multiplier: 0.4 } }, { bonuses: { critChance: 0.5 } }),
      dummy(),
      6.05,
      3,
    );
    const shots = hits(fight.events);
    expect(shots).toHaveLength(18);
    for (let v = 0; v < 6; v++) {
      const crits = new Set(shots.slice(v * 3, v * 3 + 3).map((h) => h.crit));
      expect(crits.size).toBe(1);
    }
  });

  it("Armor Shred breaks Barrier, Arc Chain jumps off Shocked enemies", () => {
    const shocking = { ...TEST_WEAPON, ailmentChances: [{ ailment: "shock" as const, chance: 1 }] };
    const fight = play(
      hero({ critBarrierShred: 0.5, arcChain: 0.3 }, { weapon: shocking, bonuses: ALL_CRIT }),
      dummy({ bonuses: { barrier: 1000 } }),
      2.05,
    );
    expect(hits(fight.events).some((h) => h.source === "Arc Chain")).toBe(true);
    expect(fight.snapshot().enemy.barrier).toBeLessThan(1000 - 30);
  });
});

describe("Sunder and stored damage", () => {
  it("Siege Engine: a clean Bolt sets off every Sunder stack", () => {
    const rules: WeaponRules = { siegeEngine: { perStack: 0.5 }, mightySunder: 2 };
    const fight = play(
      hero(rules, { weapon: { ...TEST_WEAPON, mightyAt: 10, precision: 1 } }),
      dummy(),
      2.05,
    );
    expect(hits(fight.events).map((h) => h.damage)).toEqual([10, 20]);
  });

  it("Impale: clean hits store damage, the Innate releases it", () => {
    const innate: SkillDefinition = { ...TEST_SKILL, heatCost: 30 };
    const rules: WeaponRules = { store: { clean: 0.5 }, innateId: innate.id };
    const clean = { ...TEST_WEAPON, precision: 1 };
    const fight = play(
      hero(rules, { rotation: [{ skill: innate }], weapon: clean }),
      dummy(),
      4.05,
    );
    const impale = hits(fight.events).find((h) => h.source === "Impale");
    // Three Pokes (30) and the Innate itself (20), half of it each.
    expect(impale?.damage).toBe(25);
  });

  it("Master of the Wall: blocked damage comes back with the Innate", () => {
    const innate: SkillDefinition = { ...TEST_SKILL, heatCost: 0 };
    const rules: WeaponRules = { store: { blocked: 1 }, innateId: innate.id };
    const blocker = hero(rules, {
      bonuses: { ...NO_CRIT, blockChance: 1 },
      rotation: [{ skill: innate }],
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0.5 },
    });
    const fight = play(blocker, attacker(), 2.05);
    expect(hits(fight.events).some((h) => h.source === "Master of the Wall")).toBe(true);
  });
});

describe("Heat and the Battle Plan", () => {
  const innate: SkillDefinition = { ...TEST_SKILL, heatCost: 40 };

  it("Building Edge: the Innate costs less per clean hit since the last skill", () => {
    const rules: WeaponRules = { innateDiscountPerHit: 10, innateId: innate.id };
    const fight = play(
      hero(rules, { rotation: [{ skill: innate }], weapon: { ...TEST_WEAPON, precision: 1 } }),
      dummy(),
      3.05,
    );
    // Hits 1 and 2 give 20 Heat; the Innate then costs 40 − 2 × 10 = 20.
    expect(ofType(fight.events, "skill")[0]).toMatchObject({ heatCost: 20 });
  });

  it("Whirl: quick Default Attacks make the next Innate free", () => {
    const rules: WeaponRules = { whirl: { stabs: 2, seconds: 3 }, innateId: innate.id };
    const fight = play(hero(rules, { rotation: [{ skill: innate }] }), dummy(), 3.05);
    expect(ofType(fight.events, "skill")[0]).toMatchObject({ heatCost: 0 });
  });

  it("Master of Tempo: the Innate repeats the next Rotation skill for free", () => {
    const free: SkillDefinition = { ...innate, heatCost: 0 };
    const other: SkillDefinition = { ...TEST_SKILL, id: "other", name: "Other", heatCost: 90 };
    const rules: WeaponRules = { repeatFirstSlot: { cooldown: 8 }, innateId: free.id };
    const fight = play(
      hero(rules, { rotation: [{ skill: free }, { skill: other }] }),
      dummy(),
      1.05,
    );
    expect(ofType(fight.events, "skill").map((s) => [s.skill, s.via])).toEqual([
      ["Test Strike", undefined],
      ["Other", "echo"],
    ]);
  });

  it("Echoing Chant: every Nth skill repeats itself, weaker", () => {
    const free: SkillDefinition = { ...TEST_SKILL, heatCost: 0 };
    const fight = play(
      hero({ echoChant: { every: 2, power: 0.3 } }, { rotation: [{ skill: free }] }),
      dummy(),
      2.05,
    );
    expect(ofType(fight.events, "skill").map((s) => s.via)).toEqual([
      undefined,
      undefined,
      "reverb",
    ]);
  });
});

describe("telegraphs", () => {
  const heavy: TelegraphSpec = {
    skill: {
      ...TEST_SKILL,
      id: "heavy",
      name: "Heavy",
      heatCost: 0,
      hits: [{ kind: "weapon", multiplier: 5 }],
    },
    interval: 1,
    windup: 2,
  };

  it("Interrupt: a stun during the wind-up breaks the Heavy Attack", () => {
    const stunner = [
      {
        id: "stun",
        name: "Stun",
        condition: { kind: "onHit" as const },
        effect: { kind: "stun" as const, seconds: 0.2 },
      },
    ];
    const fight = play(
      hero(
        { interrupt: { cooldown: 10 } },
        { triggers: stunner, weapon: { ...TEST_WEAPON, attacksPerSecond: 0.5 } },
      ),
      attacker({ telegraphs: [heavy], weapon: { ...TEST_WEAPON, attacksPerSecond: 0 } }),
      3.5,
    );
    expect(ofType(fight.events, "trigger").some((t) => t.name === "Interrupt")).toBe(true);
    expect(hits(fight.events, "enemy").some((h) => h.source === "Heavy")).toBe(false);
  });

  it("Frozen Solid: three Chills in a row freeze the enemy", () => {
    const chilling = { ...TEST_WEAPON, ailmentChances: [{ ailment: "chill" as const, chance: 1 }] };
    const fight = play(
      hero({ frozenSolid: { chills: 3, seconds: 6, freeze: 1 } }, { weapon: chilling }),
      dummy(),
      3.05,
    );
    expect(ofType(fight.events, "trigger").some((t) => t.name === "Frozen Solid")).toBe(true);
    expect(ofType(fight.events, "stun")).toHaveLength(1);
  });
});

describe("ailments", () => {
  it("Hooked Rend: only a share of the Bleed bursts, the rest bleeds on", () => {
    const rend: SkillDefinition = {
      ...TEST_SKILL,
      heatCost: 0,
      hits: [{ kind: "weapon", multiplier: 1, ailmentChances: [{ ailment: "bleed", chance: 1 }] }],
      effects: [{ kind: "consumeBleed", multiplier: 1, share: 0.5 }],
    };
    const fight = play(hero({}, { rotation: [{ skill: rend }] }), dummy(), 1.05);
    expect(fight.snapshot().enemy.ailments.some((a) => a.type === "bleed")).toBe(true);
  });

  it("Thousand Cuts: every clean hit Poisons, Poison Chance no longer counts", () => {
    const fight = play(
      hero({ thousandCuts: true }, { bonuses: { ...NO_CRIT, poisonChance: 1 } }),
      dummy(),
      3.05,
    );
    expect(fight.snapshot().enemy.ailments.find((a) => a.type === "poison")?.stacks).toBe(3);
  });

  it("Hamstring: a Bleeding enemy attacks slower", () => {
    const bleeding = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const rules: WeaponRules = {
      enemyAttackSpeed: [{ condition: { kind: "enemyHas", ailment: "bleed" }, amount: -0.5 }],
    };
    const fight = play(hero(rules, { weapon: bleeding, baseLife: 100_000 }), attacker(), 2.05);
    expect(fight.snapshot().enemy.attackRate).toBeCloseTo(0.5);
  });

  it("Smother: a burning enemy cannot heal", () => {
    const burning = { ...TEST_WEAPON, ailmentChances: [{ ailment: "burn" as const, chance: 1 }] };
    const healer = [
      {
        id: "mend",
        name: "Mend",
        condition: { kind: "everySeconds" as const, seconds: 1 },
        effect: { kind: "heal" as const, fraction: 0.5 },
      },
    ];
    const fight = play(
      hero({ noHealWhileBurning: true }, { weapon: burning }),
      dummy({ triggers: healer, baseLife: 1000 }),
      3.05,
    );
    expect(ofType(fight.events, "heal").filter((h) => h.side === "enemy")).toHaveLength(0);
  });

  it("Hollow: Corruption grows faster and Collapses deeper", () => {
    const start = { corruption: { damagePerSecond: 10, remaining: 20, nextTickIn: 1, ramp: 0 } };
    const plain = stepAilments(start, 3);
    const fast = stepAilments(start, 3, { ramp: 1 });
    expect(fast.states.corruption?.ramp).toBe(6);
    expect(plain.states.corruption?.ramp).toBe(3);
  });

  it("Ailment Effect by type: only that ailment of the weapon grows", () => {
    const bleeding = { ...TEST_WEAPON, ailmentChances: [{ ailment: "bleed" as const, chance: 1 }] };
    const plain = play(hero({}, { weapon: bleeding }), dummy(), 2.05);
    const strong = play(
      hero({ ailmentEffectBy: { bleed: 0.5 } }, { weapon: bleeding }),
      dummy(),
      2.05,
    );
    const dot = (f: Fight) => ofType(f.events, "dot")[0]?.damage ?? 0;
    expect(dot(strong)).toBeGreaterThan(dot(plain) * 1.4);
  });
});
