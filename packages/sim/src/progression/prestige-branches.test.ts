import { describe, expect, it } from "vitest";
import type { EliteModifier } from "./elites";
import {
  type GameData,
  type GameState,
  applyAction,
  bossAbilities,
  enemySetup,
  heroSetup,
  newGame,
  openBranches,
} from "./game";
import type { SkillNode } from "./skill-tree";
import { TEST_ACT, TEST_GAME_DATA } from "./test-fixtures";

const BRANCH_NODE: SkillNode = {
  id: "pb-guard",
  name: "Guard",
  branch: "core",
  kind: "minor",
  description: "",
  links: ["start"],
  x: 0,
  y: 0,
  prestigeBranch: "guard",
  bonuses: { armor: 7 },
  triggers: [
    {
      id: "guard-shell",
      name: "Shell",
      condition: { kind: "fightStart" },
      effect: { kind: "barrier", fraction: 0.1 },
    },
  ],
};

const ABILITY = (id: string): EliteModifier => ({
  id,
  name: id,
  description: "",
  bonuses: { armor: 1 },
});

const data: GameData = {
  ...TEST_GAME_DATA,
  skillTree: {
    ...TEST_GAME_DATA.skillTree,
    nodes: [...TEST_GAME_DATA.skillTree.nodes, BRANCH_NODE],
    prestigeBranches: [
      { id: "guard", name: "Guard", branch: "core", anchor: "start", theme: "" },
      { id: "other", name: "Other", branch: "might", anchor: "a", theme: "" },
    ],
  },
  bossAbilities: [ABILITY("one"), ABILITY("two"), ABILITY("three")],
};

const pending = (): GameState => {
  const s = newGame(data, { seed: 2, starterWeapon: "test-sword" });
  return {
    ...s,
    hero: { ...s.hero, unspentSkillPoints: 2 },
    pendingPrestige: { actId: "test-act", stage: 3, enemyName: "Boss" },
  };
};

describe("Prestige branches", () => {
  it("are chosen at the Prestige and stay", () => {
    const s = pending();
    expect(openBranches(s, data).map((b) => b.id)).toEqual(["guard", "other"]);
    expect(() => applyAction(s, data, { type: "prestige" })).toThrow(/branch/);
    expect(() => applyAction(s, data, { type: "prestige", branchId: "nope" })).toThrow(/branch/);
    const after = applyAction(s, data, { type: "prestige", branchId: "guard" });
    expect(after.legacy.branches).toEqual(["guard"]);
    expect(openBranches(after, data).map((b) => b.id)).toEqual(["other"]);
  });

  it("their nodes are locked until the branch is unlocked, then give bonuses and triggers", () => {
    const locked = { ...pending(), pendingPrestige: null };
    const camp = { ...locked, progress: { ...locked.progress, trainerUnlocked: true } };
    expect(() => applyAction(camp, data, { type: "learnNodes", nodeIds: ["pb-guard"] })).toThrow(
      /branchLocked/,
    );
    const open = { ...camp, legacy: { ...camp.legacy, branches: ["guard"] } };
    const learned = applyAction(open, data, { type: "learnNodes", nodeIds: ["pb-guard"] });
    const { setup } = heroSetup(learned, data);
    expect(setup.bonuses?.armor).toBe(7);
    expect(setup.triggers?.map((t) => t.id)).toContain("guard-shell");
  });
});

describe("boss abilities", () => {
  it("a boss gains one per Prestige after its act opened, from its own start in the list", () => {
    expect(bossAbilities(data, TEST_ACT, 0)).toEqual([]);
    expect(bossAbilities(data, TEST_ACT, 2).map((m) => m.id)).toEqual(["one", "two"]);
    expect(bossAbilities(data, { ...TEST_ACT, number: 2 }, 1)).toEqual([]);
    expect(bossAbilities(data, { ...TEST_ACT, number: 2 }, 3).map((m) => m.id)).toEqual([
      "two",
      "three",
    ]);
    expect(bossAbilities(data, TEST_ACT, 9)).toHaveLength(3);
  });

  it("the Harvester has none: its phases already grow with the run", () => {
    const harvester = { ...TEST_ACT, boss: { ...TEST_ACT.boss, archetype: "harvester" as const } };
    expect(bossAbilities(data, harvester, 9)).toEqual([]);
  });

  it("apply like Elite modifiers", () => {
    const encounter = {
      enemyId: TEST_ACT.boss.id,
      level: 5,
      boss: true,
      eliteModifiers: ["one", "two"],
      seed: 1,
    };
    const plain = enemySetup({ ...encounter, eliteModifiers: [] }, TEST_ACT.id, data);
    const strong = enemySetup(encounter, TEST_ACT.id, data);
    expect((strong.bonuses?.armor ?? 0) - (plain.bonuses?.armor ?? 0)).toBe(2);
  });
});
