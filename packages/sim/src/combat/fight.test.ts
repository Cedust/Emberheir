import { describe, expect, it } from "vitest";
import { COMBAT } from "./constants";
import { type CombatEvent, Fight, runFight } from "./fight";
import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES, dummy, setup } from "./test-fixtures";
import type { SkillDefinition, WeaponDefinition } from "./types";

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
      fight.advance(0.6);
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
});
