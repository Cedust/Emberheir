import { describe, expect, it } from "vitest";
import { COMBAT } from "./constants";
import { type CombatEvent, Fight, runFight } from "./fight";
import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, SkillDefinition, WeaponDefinition } from "./types";

/** Hero that never crits, so damage numbers are exact. */
const NO_CRIT = { critChance: -1 };

const SKILL_A: SkillDefinition = { ...TEST_SKILL, id: "a", name: "Skill A", heatCost: 20 };
const SKILL_B: SkillDefinition = { ...TEST_SKILL, id: "b", name: "Skill B", heatCost: 30 };

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe("Fight", () => {
  it("is deterministic: same seed, same fight", () => {
    const hero = setup({ attributes: { ...ZERO_ATTRIBUTES, dexterity: 20, agility: 20 } });
    const enemy = setup({ attributes: { ...ZERO_ATTRIBUTES, agility: 30 } });
    const a = runFight(hero, enemy, 42);
    const b = runFight(hero, enemy, 42);
    const c = runFight(hero, enemy, 43);
    expect(a.events).toEqual(b.events);
    expect(a.events).not.toEqual(c.events);
  });

  it("ends when a fighter dies and names the winner", () => {
    const result = runFight(setup({ bonuses: NO_CRIT }), setup({ baseLife: 25 }), 1);
    expect(result.winner).toBe("hero");
    expect(result.events.slice(-2)).toEqual([
      { t: result.duration, type: "death", side: "enemy" },
      { t: result.duration, type: "fightEnd", winner: "hero" },
    ]);
    expect(result.final.enemy.life).toBe(0);
    // 10 damage per hit at 1 attack/s: dead after the third hit.
    expect(result.duration).toBeCloseTo(3, 1);
  });

  it("ends in a draw at the time limit", () => {
    const result = runFight(dummy(), dummy(), 1);
    expect(result.winner).toBeNull();
    expect(result.duration).toBeCloseTo(COMBAT.maxFightSeconds, 5);
  });

  it("starts with the given life fraction", () => {
    const fight = new Fight(setup({ lifeFraction: 0.4 }), dummy(), 1);
    expect(fight.snapshot().hero.life).toBe(40);
  });

  describe("Rotation and Heat", () => {
    const hero = (thresholds: (number | undefined)[] = []) =>
      setup({
        bonuses: NO_CRIT,
        rotation: [SKILL_A, SKILL_B].map((skill, i) => {
          const threshold = thresholds[i];
          return threshold === undefined ? { skill } : { skill, threshold };
        }),
      });

    it("skills replace the next Default Attack once Heat reaches the cost, in slot order", () => {
      const fight = new Fight(hero(), dummy(), 1);
      fight.advance(14.01);
      const skills = ofType(fight.events, "skill");
      // 10 Heat per hit: 20 Heat after 2 hits, Skill A replaces the 3rd attack.
      expect(skills[0]).toMatchObject({ skill: "Skill A" });
      expect(skills[0]?.t).toBeCloseTo(3, 1);
      expect(skills.map((s) => s.skill)).toEqual(["Skill A", "Skill B", "Skill A", "Skill B"]);
      // One action per second: every action is either a Default Attack or a skill.
      const actions = ofType(fight.events, "hit").length;
      expect(actions).toBe(14);
    });

    it("only deducts the cost, the rest of the Heat stays", () => {
      const fight = new Fight(hero([40]), dummy(), 1);
      fight.advance(5.01);
      // Waited until 40 Heat (Trigger Threshold), paid 20.
      expect(ofType(fight.events, "skill")).toHaveLength(1);
      expect(fight.snapshot().hero.heat).toBe(20);
      expect(fight.snapshot().hero.nextSlot).toBe(1);
    });

    it("a Trigger Threshold above the cost makes the skill wait", () => {
      const fight = new Fight(hero([40]), dummy(), 1);
      fight.advance(12.01);
      const skills = ofType(fight.events, "skill");
      expect(skills[0]?.t).toBeCloseTo(5, 1);
      expect(fight.snapshot().hero.rotation.map((r) => r.threshold)).toEqual([40, 30]);
    });

    it("skill hits do not generate Heat per hit", () => {
      const fight = new Fight(hero(), dummy(), 1);
      fight.advance(3.01);
      expect(fight.snapshot().hero.heat).toBe(0);
    });

    it("Warming gains Heat over time without attacking", () => {
      const warming: WeaponDefinition = {
        ...TEST_WEAPON,
        heatBehavior: "warming",
        attacksPerSecond: 0,
      };
      const fight = new Fight(setup({ weapon: warming }), dummy(), 1);
      fight.advance(2);
      expect(fight.snapshot().hero.heat).toBeCloseTo(2 * COMBAT.warmingHeatPerSecond, 5);
    });

    it("Cooling gains Heat from hits taken and loses it without own hits", () => {
      const cooling: WeaponDefinition = {
        ...TEST_WEAPON,
        heatBehavior: "cooling",
        attacksPerSecond: 0,
      };
      const fight = new Fight(setup({ weapon: cooling }), setup({ bonuses: NO_CRIT }), 1);
      fight.advance(1.1);
      // Took a 10 damage hit = 10 % of max life = 10 Heat.
      expect(fight.snapshot().hero.heat).toBeCloseTo(10, 5);
      // Decay starts after the grace time and outpaces the next 10 Heat hit taken at 2 s.
      fight.advance(1.8);
      expect(fight.snapshot().hero.heat).toBeLessThan(10);
    });
  });

  describe("skill hits", () => {
    it("Execute-style bonus applies below the life threshold", () => {
      const execute: SkillDefinition = {
        ...TEST_SKILL,
        heatCost: 0,
        hits: [{ kind: "weapon", multiplier: 4, lowLifeBonus: { threshold: 0.3, multiplier: 2 } }],
      };
      const hero = setup({ bonuses: NO_CRIT, rotation: [{ skill: execute }] });
      const high = new Fight(hero, dummy(), 1);
      const low = new Fight(hero, dummy({ lifeFraction: 0.2 }), 1);
      high.advance(1.01);
      low.advance(1.01);
      expect(ofType(high.events, "hit")[0]?.damage).toBe(40);
      expect(ofType(low.events, "hit")[0]?.damage).toBe(80);
    });

    it("multi-hit spells apply falloff per hit and scale with skill level", () => {
      const chain: SkillDefinition = {
        ...TEST_SKILL,
        type: "spell",
        heatCost: 0,
        hits: [
          {
            kind: "spell",
            damage: { min: 40, max: 40 },
            damageType: "lightning",
            count: 3,
            falloff: 0.5,
          },
        ],
      };
      const fight = new Fight(
        setup({ bonuses: NO_CRIT, rotation: [{ skill: chain }] }),
        dummy(),
        1,
      );
      fight.advance(1.01);
      expect(ofType(fight.events, "hit").map((h) => h.damage)).toEqual([40, 20, 10]);

      const leveled = new Fight(
        setup({ bonuses: NO_CRIT, rotation: [{ skill: chain, level: 2 }] }),
        dummy(),
        1,
      );
      leveled.advance(1.01);
      expect(ofType(leveled.events, "hit")[0]?.damage).toBe(48);
    });
  });

  describe("ailments in a fight", () => {
    const igniting: WeaponDefinition = {
      ...TEST_WEAPON,
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 1 }],
    };

    it("Burn deals damage over time and shows up in the snapshot", () => {
      const fight = new Fight(setup({ weapon: igniting, bonuses: NO_CRIT }), dummy(), 1);
      fight.advance(1.01);
      expect(ofType(fight.events, "ailment")).toEqual([
        expect.objectContaining({ side: "enemy", ailment: "burn" }),
      ]);
      expect(fight.snapshot().enemy.ailments.map((a) => a.type)).toEqual(["burn"]);
      fight.advance(1);
      // 25 % of the 10 damage hit per second.
      expect(ofType(fight.events, "dot")[0]).toMatchObject({ side: "enemy", damage: 3 });
    });

    it("Chill slows the target's attacks", () => {
      const chilling: WeaponDefinition = {
        ...TEST_WEAPON,
        attacksPerSecond: 4,
        damage: { min: 0, max: 0 },
        ailmentChances: [{ ailment: "chill", chance: 1 }],
      };
      const attacker = setup({ baseLife: 100_000 });
      const count = (hero: ReturnType<typeof setup>) => {
        const fight = new Fight(hero, attacker, 1);
        fight.advance(20);
        return ofType(fight.events, "hit").filter((h) => h.side === "enemy").length;
      };
      const normal = count(
        setup({ baseLife: 100_000, weapon: { ...chilling, ailmentChances: [] } }),
      );
      const chilled = count(setup({ baseLife: 100_000, weapon: chilling }));
      expect(normal).toBe(20);
      expect(chilled).toBeLessThanOrEqual(Math.ceil(20 * (1 - COMBAT.chillSlow)));
    });

    it("Shock increases the damage the target takes", () => {
      const shocking: WeaponDefinition = {
        ...TEST_WEAPON,
        ailmentChances: [{ ailment: "shock", chance: 1 }],
      };
      const fight = new Fight(setup({ weapon: shocking, bonuses: NO_CRIT }), dummy(), 1);
      fight.advance(2.01);
      expect(ofType(fight.events, "hit").map((h) => h.damage)).toEqual([10, 12]);
    });
  });

  it("Lifesteal heals on hits, and Burn halves the healing", () => {
    const vampire = setup({ bonuses: { ...NO_CRIT, lifesteal: 0.5 }, lifeFraction: 0.5 });
    const fight = new Fight(vampire, dummy(), 1);
    fight.advance(1.01);
    expect(ofType(fight.events, "heal")).toEqual([expect.objectContaining({ amount: 5 })]);

    const burner: WeaponDefinition = {
      ...TEST_WEAPON,
      attacksPerSecond: 10,
      damage: { min: 1, max: 1 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 1 }],
    };
    const burned = new Fight(vampire, dummy({ weapon: burner, bonuses: NO_CRIT }), 1);
    burned.advance(1.01);
    const heal = ofType(burned.events, "heal")[0];
    expect(heal?.amount).toBe(3); // round(5 × 0.5)
  });

  describe("telegraphs", () => {
    const SLAM: SkillDefinition = {
      ...TEST_SKILL,
      id: "slam",
      name: "Slam",
      heatCost: 0,
      hits: [{ kind: "weapon", multiplier: 5 }],
    };
    const boss = () =>
      setup({
        name: "Boss",
        bonuses: NO_CRIT,
        baseLife: 100_000,
        telegraphs: [{ skill: SLAM, interval: 4, windup: 1.5 }],
      });

    it("announces the Heavy Attack, pauses attacks during the wind-up, then hits for free", () => {
      const fight = new Fight(dummy(), boss(), 1);
      fight.advance(4.01);
      expect(ofType(fight.events, "telegraph")).toEqual([
        { t: 4, type: "telegraph", side: "enemy", skill: "Slam", windup: 1.5 },
      ]);
      expect(fight.snapshot().enemy.telegraph).toMatchObject({ skill: "Slam", windup: 1.5 });
      const hitsBefore = ofType(fight.events, "hit").length;
      fight.advance(1.4);
      // No Default Attack while winding up.
      expect(ofType(fight.events, "hit")).toHaveLength(hitsBefore);
      fight.advance(0.2);
      const slam = ofType(fight.events, "hit").find((h) => h.source === "Slam");
      expect(slam).toMatchObject({ source: "Slam", damage: 50 });
      expect(ofType(fight.events, "skill").at(-1)).toMatchObject({ skill: "Slam", heatCost: 0 });
      expect(fight.snapshot().enemy.telegraph).toBeNull();
    });

    it("repeats every interval after the wind-up", () => {
      const fight = new Fight(dummy(), boss(), 1);
      fight.advance(12);
      expect(ofType(fight.events, "telegraph").map((e) => e.t)).toEqual([4, 9.5]);
    });
  });

  describe("rules (Keystones)", () => {
    it("damageTaken raises all damage the fighter takes", () => {
      const fight = new Fight(dummy(), setup({ bonuses: NO_CRIT }), 1);
      const fragile = new Fight(
        dummy({ rules: { damageTaken: 0.2 } }),
        setup({ bonuses: NO_CRIT }),
        1,
      );
      fight.advance(1.01);
      fragile.advance(1.01);
      expect(ofType(fight.events, "hit")[0]?.damage).toBe(10);
      expect(ofType(fragile.events, "hit")[0]?.damage).toBe(12);
    });

    it("skillCostMultiplier makes skills cheaper and defaultAttackDamage scales the attack", () => {
      const hero = setup({
        bonuses: NO_CRIT,
        rotation: [{ skill: SKILL_B }],
        rules: { skillCostMultiplier: 0.5, defaultAttackDamage: 0.5 },
      });
      const fight = new Fight(hero, dummy(), 1);
      expect(fight.snapshot().hero.rotation[0]?.heatCost).toBe(15);
      fight.advance(2.01);
      // Attack 1: 5 damage, +10 Heat. Attack 2: 10 Heat < 15, Default Attack again.
      fight.advance(1);
      const skills = ofType(fight.events, "skill");
      expect(skills[0]).toMatchObject({ skill: "Skill B", heatCost: 15 });
      expect(ofType(fight.events, "hit")[0]?.damage).toBe(5);
    });

    it("noHeatDecay keeps Cooling Heat without hits", () => {
      const idle: WeaponDefinition = {
        ...TEST_WEAPON,
        heatBehavior: "cooling",
        attacksPerSecond: 0,
      };
      const heatAfter = (noHeatDecay: boolean) => {
        const hero = setup({ weapon: idle, rules: { noHeatDecay }, bonuses: { startingHeat: 50 } });
        const fight = new Fight(hero, dummy(), 1);
        fight.advance(5);
        return fight.snapshot().hero.heat;
      };
      expect(heatAfter(true)).toBe(50);
      expect(heatAfter(false)).toBeLessThan(50);
    });

    it("attack skills scale with skill level", () => {
      const strike: SkillDefinition = { ...TEST_SKILL, heatCost: 0 };
      const fight = new Fight(
        setup({ bonuses: NO_CRIT, rotation: [{ skill: strike, level: 3 }] }),
        dummy(),
        1,
      );
      fight.advance(1.01);
      expect(ofType(fight.events, "hit")[0]?.damage).toBe(24);
    });
  });
});

describe("Bleed, Poison and skill effects", () => {
  const always = (ailment: "bleed" | "poison"): WeaponDefinition => ({
    ...TEST_WEAPON,
    ailmentChances: [{ ailment, chance: 1 }],
  });

  it("Bleed ticks for half the hit per second", () => {
    const fight = new Fight(setup({ weapon: always("bleed"), bonuses: NO_CRIT }), dummy(), 1);
    const events = fight.advance(2.5);
    const dots = ofType(events, "dot");
    expect(dots.every((d) => d.ailment === "bleed" && d.damage === 5)).toBe(true);
    expect(dots.length).toBeGreaterThan(0);
  });

  it("Poison stacks with every hit and reports the stacks", () => {
    const fight = new Fight(setup({ weapon: always("poison"), bonuses: NO_CRIT }), dummy(), 1);
    fight.advance(3.2);
    const poison = fight.snapshot().enemy.ailments.find((a) => a.type === "poison");
    expect(poison?.stacks).toBe(3);
    const stacks = ofType(fight.events, "ailment").map((e) => e.stacks);
    expect(stacks).toEqual([1, 2, 3]);
  });

  it("gear Chance to Bleed adds Bleed to hits that have none", () => {
    const fight = new Fight(setup({ bonuses: { ...NO_CRIT, bleedChance: 1 } }), dummy(), 1);
    fight.advance(1.1);
    expect(ofType(fight.events, "ailment").map((e) => e.ailment)).toEqual(["bleed"]);
  });

  it("a buff skill raises a stat for a while (Venom Coat)", () => {
    const coat: SkillDefinition = {
      ...TEST_SKILL,
      id: "coat",
      name: "Coat",
      type: "buff",
      heatCost: 10,
      hits: [],
      effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 3 }],
    };
    const fight = new Fight(setup({ bonuses: NO_CRIT, rotation: [{ skill: coat }] }), dummy(), 1);
    // One hit for the Heat, then Coat on the second action at 2 s.
    fight.advance(2.5);
    expect(fight.snapshot().hero.stats.poisonChance).toBe(1);
    fight.advance(1);
    expect(ofType(fight.events, "ailment").some((e) => e.ailment === "poison")).toBe(true);
    expect(fight.snapshot().hero.buffs[0]).toMatchObject({ name: "Coat", stat: "poisonChance" });
    // Not cast again while the buff runs, so the Heat is not wasted.
    expect(ofType(fight.events, "skill")).toHaveLength(1);
  });

  it("Rend ends the Bleed and deals the rest at once, multiplied", () => {
    const rend: SkillDefinition = {
      ...TEST_SKILL,
      id: "rend",
      name: "Rend",
      heatCost: 10,
      hits: [],
      effects: [{ kind: "consumeBleed", multiplier: 1.5 }],
    };
    const hero = setup({ weapon: always("bleed"), bonuses: NO_CRIT, rotation: [{ skill: rend }] });
    const fight = new Fight(hero, dummy(), 1);
    fight.advance(2.05);
    const rendHit = ofType(fight.events, "hit").find((h) => h.source === "Rend");
    // Bleed from the first hit (5/s for 3 s), 1 tick gone at the moment of Rend: 2 ticks × 5 × 1.5.
    expect(rendHit?.damage).toBe(15);
    expect(fight.snapshot().enemy.ailments.some((a) => a.type === "bleed")).toBe(false);
  });

  it("Toxic Burst doubles the Poison stacks", () => {
    const burst: SkillDefinition = {
      ...TEST_SKILL,
      id: "burst",
      name: "Burst",
      heatCost: 20,
      hits: [],
      effects: [{ kind: "multiplyPoison", factor: 2 }],
    };
    const hero = setup({
      weapon: always("poison"),
      bonuses: NO_CRIT,
      rotation: [{ skill: burst }],
    });
    const fight = new Fight(hero, dummy(), 1);
    fight.advance(3.05);
    // Two Poison hits, then Burst on the third action.
    expect(fight.snapshot().enemy.ailments.find((a) => a.type === "poison")?.stacks).toBe(4);
  });

  it("a heal skill heals the caster, halved by Burn", () => {
    const mend: SkillDefinition = {
      ...TEST_SKILL,
      id: "mend",
      name: "Mend",
      heatCost: 0,
      hits: [],
      effects: [{ kind: "heal", fraction: 0.2 }],
    };
    const healer = setup({
      lifeFraction: 0.5,
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0 },
      telegraphs: [{ skill: mend, interval: 1, windup: 0.5 }],
    });
    const plain = new Fight(dummy(), healer, 1);
    plain.advance(1.6);
    expect(ofType(plain.events, "heal")[0]?.amount).toBe(20);

    const burner = dummy({
      weapon: { ...TEST_WEAPON, attacksPerSecond: 1, damage: { min: 1, max: 1 } },
      bonuses: { burnChance: 1, critChance: -1 },
    });
    const burnt = new Fight(burner, healer, 1);
    burnt.advance(1.6);
    expect(ofType(burnt.events, "heal")[0]?.amount).toBe(10);
  });

  it("enemies can bring their own triggers", () => {
    const fight = new Fight(
      dummy(),
      setup({
        lifeFraction: 0.5,
        weapon: { ...TEST_WEAPON, attacksPerSecond: 0 },
        triggers: [
          {
            id: "regrow",
            name: "Regrow",
            condition: { kind: "everySeconds", seconds: 1 },
            effect: { kind: "heal", fraction: 0.1 },
          },
        ],
      }),
      1,
    );
    fight.advance(1.1);
    expect(ofType(fight.events, "heal")[0]?.amount).toBe(10);
  });
});

describe("Blood Price", () => {
  it("halves Crit Chance and makes every Crit Bleed", () => {
    const hero = setup({
      bonuses: { critChance: 0.95 },
      rules: { critsApplyBleed: true, critChanceMultiplier: 0.5 },
    });
    const fight = new Fight(hero, dummy(), 3);
    expect(fight.snapshot().hero.stats.critChance).toBeCloseTo(0.5);
    fight.advance(10);
    const crits = ofType(fight.events, "hit").filter((h) => h.crit).length;
    const bleeds = ofType(fight.events, "ailment").filter((e) => e.ailment === "bleed").length;
    expect(crits).toBeGreaterThan(0);
    expect(bleeds).toBe(crits);
  });
});

describe("Legendary Power rules", () => {
  it("Ailment Echo: inflicting one ailment also inflicts another", () => {
    const hero = setup({
      bonuses: { ...NO_CRIT, bleedChance: 1 },
      rules: { ailmentEcho: [{ from: "bleed", to: "poison" }] },
    });
    const fight = new Fight(hero, dummy(), 1);
    fight.advance(1.1);
    expect(ofType(fight.events, "ailment").map((e) => e.ailment)).toEqual(["poison", "bleed"]);
  });

  it("Execute: more damage against an enemy below the threshold", () => {
    const hero = (rules?: CombatantSetup["rules"]) =>
      setup({ bonuses: NO_CRIT, ...(rules ? { rules } : {}) });
    const low = dummy({ lifeFraction: 0.2 });
    const plain = new Fight(hero(), low, 1);
    const sharp = new Fight(hero({ execute: { below: 0.3, bonus: 0.5 } }), low, 1);
    plain.advance(1.1);
    sharp.advance(1.1);
    expect(ofType(plain.events, "hit")[0]?.damage).toBe(10);
    expect(ofType(sharp.events, "hit")[0]?.damage).toBe(15);
    // Above the threshold nothing changes.
    const full = new Fight(hero({ execute: { below: 0.3, bonus: 0.5 } }), dummy(), 1);
    full.advance(1.1);
    expect(ofType(full.events, "hit")[0]?.damage).toBe(10);
  });

  it("DoT Lifesteal: your ailment ticks heal you", () => {
    const hero = setup({
      bonuses: { ...NO_CRIT, bleedChance: 1 },
      rules: { dotLifesteal: 1 },
      lifeFraction: 0.5,
    });
    const fight = new Fight(hero, dummy(), 1);
    fight.advance(2.5);
    const heals = ofType(fight.events, "heal").filter((e) => e.side === "hero");
    const dots = ofType(fight.events, "dot");
    expect(dots.length).toBeGreaterThan(0);
    expect(heals.map((h) => h.amount)).toEqual(dots.map((d) => d.damage));
  });
});
