import { describe, expect, it } from "vitest";
import { MONSTER_BAND_ENDS, createEnemySetup, monsterLevelScaling } from "./monsters";
import { deriveStats } from "./stats";
import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES } from "./test-fixtures";

describe("monsters", () => {
  it("Monster Level 1 is the template itself", () => {
    expect(monsterLevelScaling(1)).toEqual({ life: 1, damage: 1 });
  });

  it("life and damage grow with the Monster Level", () => {
    const l5 = monsterLevelScaling(5);
    expect(l5.life).toBeGreaterThan(monsterLevelScaling(4).life);
    expect(l5.damage).toBeGreaterThan(monsterLevelScaling(4).damage);
  });

  it("each run's band grows faster per level than the one before", () => {
    expect(MONSTER_BAND_ENDS).toEqual([5, 15, 30, 50, 75, 105, 140]);
    const step = (level: number) =>
      monsterLevelScaling(level + 1).life - monsterLevelScaling(level).life;
    expect(step(2)).toBeCloseTo(step(4));
    expect(step(10)).toBeGreaterThan(step(4));
    expect(step(20)).toBeGreaterThan(step(10));
    expect(monsterLevelScaling(150).life).toBeGreaterThan(monsterLevelScaling(140).life);
  });

  it("builds a fight setup with its skills as rotation", () => {
    const enemy = {
      id: "e",
      name: "Enemy",
      archetype: "brute" as const,
      description: "",
      attributes: ZERO_ATTRIBUTES,
      weapon: TEST_WEAPON,
      skills: [TEST_SKILL],
      baseLife: 200,
    };
    const s = createEnemySetup(enemy, 3);
    expect(s.level).toBe(3);
    expect(s.rotation.map((r) => r.skill.id)).toEqual(["test-strike"]);
    expect(deriveStats(s).maxLife).toBe(200 * monsterLevelScaling(3).life);
    expect(s.damageMultiplier).toBe(monsterLevelScaling(3).damage);
  });
});
