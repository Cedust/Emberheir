import { describe, expect, it } from "vitest";
import {
  type SkillTreeDefinition,
  forgetBlockReason,
  KEYSTONE,
  activeKeystones,
  keystoneLimit,
  keystoneRules,
  learnBudget,
  startingNodes,
  learnBlockReason,
  learnPath,
  learnNodes,
  neighbours,
  nodeRanks,
  treeBonuses,
  treeSkills,
} from "./skill-tree";
import { TEST_TREE, TREE_SKILL } from "./test-fixtures";

const budget = (skillPoints: number, keystones = 1) => ({ skillPoints, keystones });

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

  it("Keystones cost 3 Skill Points and take one of the Keystone places", () => {
    const learned = { a: 1, b: 1 };
    expect(learnBlockReason(TEST_TREE, learned, "k", budget(2))).toBe("noSkillPoints");
    expect(learnBlockReason(TEST_TREE, learned, "k", budget(5, 0))).toBe("keystoneLimit");
    const result = learnNodes(TEST_TREE, learned, ["k"], budget(KEYSTONE.skillPoints));
    expect(result.budget).toEqual(budget(0, 0));
    expect(activeKeystones(TEST_TREE, result.learned)).toBe(1);
    expect(learnBudget(TEST_TREE, result.learned, 4, 0)).toEqual(budget(4, 0));
    expect(learnBudget(TEST_TREE, result.learned, 4, 2)).toEqual(budget(4, 1));
    expect(keystoneRules(TEST_TREE, result.learned)).toMatchObject({
      damageTaken: 0.2,
      noHeatDecay: true,
    });
  });

  it("the Keystone limit grows at Prestige 2, 4 and 6", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(keystoneLimit)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("a Keystone's next tier replaces it without taking another place", () => {
    const k = TEST_TREE.nodes.find((n) => n.id === "k");
    if (!k) throw new Error("k");
    const tree: SkillTreeDefinition = {
      ...TEST_TREE,
      nodes: [...TEST_TREE.nodes, { ...k, id: "k2", links: ["k"], x: 4, replaces: "k" }],
    };
    const learned = { a: 1, b: 1, k: 1 };
    expect(learnBlockReason(tree, learned, "k2", budget(3, 0))).toBeUndefined();
    const result = learnNodes(tree, learned, ["k2"], budget(3, 0));
    expect(activeKeystones(tree, result.learned)).toBe(1);
  });

  it("weapon-range nodes only count with the matching weapon", () => {
    const learned = { r: 1 };
    expect(treeBonuses(TEST_TREE, learned, "ranged").elementalDamage).toBe(0.5);
    expect(treeBonuses(TEST_TREE, learned, "melee").elementalDamage).toBe(0);
  });

  it("forks: learning one side closes the other until it is forgotten", () => {
    const tree: SkillTreeDefinition = {
      classStarts: { hero: "s" },
      nodes: [
        {
          id: "s",
          name: "S",
          branch: "might",
          kind: "minor",
          description: "",
          links: ["x", "y"],
          x: 0,
          y: 0,
          classStart: "hero",
        },
        {
          id: "x",
          name: "X",
          branch: "might",
          kind: "notable",
          description: "",
          links: [],
          x: 1,
          y: 0,
          fork: "f",
        },
        {
          id: "y",
          name: "Y",
          branch: "might",
          kind: "notable",
          description: "",
          links: [],
          x: -1,
          y: 0,
          fork: "f",
        },
      ],
    };
    const learned = startingNodes(tree, "hero");
    expect(learned).toEqual({ s: 1 });
    expect(learnBlockReason(tree, learned, "x", budget(1))).toBeUndefined();
    const after = learnNodes(tree, learned, ["x"], budget(1)).learned;
    expect(learnBlockReason(tree, after, "y", budget(1))).toBe("forkTaken");
    expect(learnPath(tree, after, "y")).toBeUndefined();
    expect(forgetBlockReason(tree, after, "x", "s")).toBeUndefined();
    expect(forgetBlockReason(tree, after, "s", "s")).toBe("start");
    // A class's start node only counts as learned for that class.
    expect(nodeRanks(tree, {}, "s")).toBe(0);
  });

  it("finds the cheapest path to a node, Keystones only as the goal", () => {
    expect(learnPath(TEST_TREE, {}, "k")).toEqual(["a", "b", "k"]);
    expect(learnPath(TEST_TREE, {}, "r")).toEqual(["r"]);
    expect(learnPath(TEST_TREE, { a: 1 }, "b")).toEqual(["b"]);
    expect(learnPath(TEST_TREE, {}, "start")).toEqual([]);
  });
});
