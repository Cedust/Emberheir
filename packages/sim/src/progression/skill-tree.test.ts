import { describe, expect, it } from "vitest";
import {
  keystoneRules,
  learnBlockReason,
  learnNodes,
  neighbours,
  nodeRanks,
  treeBonuses,
  treeSkills,
} from "./skill-tree";
import { TEST_TREE, TREE_SKILL } from "./test-fixtures";

const budget = (skillPoints: number, harvesterEmber = 0) => ({ skillPoints, harvesterEmber });

describe("Skill Tree", () => {
  it("links are two-way and the start node is always learned", () => {
    expect(neighbours(TEST_TREE, "b").sort()).toEqual(["a", "k"]);
    expect(nodeRanks(TEST_TREE, {}, "start")).toBe(1);
    expect(treeBonuses(TEST_TREE, {}, "melee").life).toBe(5);
  });

  it("only nodes next to a learned node can be learned", () => {
    expect(learnBlockReason(TEST_TREE, {}, "a", budget(1))).toBeUndefined();
    expect(learnBlockReason(TEST_TREE, {}, "b", budget(1))).toBe("notConnected");
    expect(learnBlockReason(TEST_TREE, {}, "a", budget(0))).toBe("noSkillPoints");
    expect(learnBlockReason(TEST_TREE, {}, "start", budget(1))).toBe("maxed");
  });

  it("learns in order, spends points and raises Skill node ranks", () => {
    const result = learnNodes(TEST_TREE, {}, ["a", "b", "b"], budget(4));
    expect(result.learned).toEqual({ a: 1, b: 2 });
    expect(result.budget).toEqual(budget(1));
    expect(treeSkills(TEST_TREE, result.learned)).toEqual([{ skill: TREE_SKILL, ranks: 2 }]);
    expect(() => learnNodes(TEST_TREE, {}, ["a", "b"], budget(1))).toThrow(/noSkillPoints/);
  });

  it("Keystones cost Harvester's Ember instead of Skill Points", () => {
    const learned = { a: 1, b: 1 };
    expect(learnBlockReason(TEST_TREE, learned, "k", budget(5, 0))).toBe("noEmber");
    const result = learnNodes(TEST_TREE, learned, ["k"], budget(0, 1));
    expect(result.budget).toEqual(budget(0, 0));
    expect(keystoneRules(TEST_TREE, result.learned)).toMatchObject({
      damageTaken: 0.2,
      noHeatDecay: true,
    });
  });

  it("weapon-range nodes only count with the matching weapon", () => {
    const learned = { r: 1 };
    expect(treeBonuses(TEST_TREE, learned, "ranged").elementalDamage).toBe(0.5);
    expect(treeBonuses(TEST_TREE, learned, "melee").elementalDamage).toBe(0);
  });
});
