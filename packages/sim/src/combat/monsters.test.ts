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
    expect(MONSTER_BAND_ENDS).toEqual([10, 20, 30, 45, 60, 75, 90]);
    const step = (level: number) =>
      monsterLevelScaling(level + 1).life - monsterLevelScaling(level).life;
    expect(step(15)).toBeGreaterThan(step(5));
    expect(step(25)).toBeGreaterThan(step(15));
    expect(step(80)).toBeGreaterThan(step(50));
    expect(monsterLevelScaling(100).life).toBeGreaterThan(monsterLevelScaling(90).life);
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
    expect(deriveStats(s).maxLife).toBe(Math.round(200 * monsterLevelScaling(3).life));
    expect(s.damageMultiplier).toBe(monsterLevelScaling(3).damage);
  });
});
