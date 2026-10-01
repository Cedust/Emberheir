import { describe, expect, it } from "vitest";
import { createEnemySetup, monsterLevelScaling } from "./monsters";
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
