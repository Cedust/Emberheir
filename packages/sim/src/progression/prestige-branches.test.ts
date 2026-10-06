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
import { TEST_ACT, TEST_CLASSES, TEST_GAME_DATA } from "./test-fixtures";

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
  // The Fighter can grow Guard and Other; Elsewhere belongs to no class here.
  classes: TEST_CLASSES.map((c) =>
    c.id === "test-fighter" ? { ...c, branches: ["guard", "other"] } : c,
  ),
  skillTree: {
    ...TEST_GAME_DATA.skillTree,
    nodes: [...TEST_GAME_DATA.skillTree.nodes, BRANCH_NODE],
    prestigeBranches: [
      { id: "guard", name: "Guard", branch: "core", anchor: "start", theme: "" },
      { id: "elsewhere", name: "Elsewhere", branch: "arcana", anchor: "a", theme: "" },
      { id: "other", name: "Other", branch: "might", anchor: "a", theme: "" },
    ],
  },
  bossAbilities: [ABILITY("one"), ABILITY("two"), ABILITY("three")],
};

const pending = (): GameState => {
  const s = newGame(data, { seed: 2, classId: "test-fighter" });
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
    // An owned branch stays open: picking it again deepens it, up to tier III.
    expect(openBranches(after, data).map((b) => b.id)).toEqual(["guard", "other"]);
    const deep = { ...s, legacy: { ...s.legacy, branches: ["guard", "guard", "guard"] } };
    expect(openBranches(deep, data).map((b) => b.id)).toEqual(["other"]);
    expect(() => applyAction(deep, data, { type: "prestige", branchId: "guard" })).toThrow(
      /branch/,
    );
  });

  it("only the class's own branches are offered, in the class's order", () => {
    const s = pending();
    expect(() => applyAction(s, data, { type: "prestige", branchId: "elsewhere" })).toThrow(
      /branch/,
    );
    const caster = { ...s, hero: { ...s.hero, classId: "test-caster" } };
    expect(openBranches(caster, data)).toEqual([]);
    // With no branch left to take, the Prestige needs none.
    expect(applyAction(caster, data, { type: "prestige" }).legacy.branches).toEqual([]);
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

describe("Prestige branch tiers", () => {
  const t2: SkillNode = {
    ...BRANCH_NODE,
    id: "pb-guard-t2",
    links: ["pb-guard"],
    tier: 2,
    bonuses: { armor: 3 },
    triggers: [],
  };
  const upgrade: SkillNode = {
    ...t2,
    id: "pb-guard-wall",
    kind: "notable",
    links: ["pb-guard-t2"],
    bonuses: {},
    replaces: "pb-guard",
    triggers: [
      {
        id: "guard-wall",
        name: "Wall",
        condition: { kind: "fightStart" },
        effect: { kind: "barrier", fraction: 0.2 },
      },
    ],
    rules: { damageTaken: -0.1 },
  };
  const tiered: GameData = {
    ...data,
    skillTree: {
      ...data.skillTree,
      nodes: [...data.skillTree.nodes, t2, upgrade],
    },
  };
  const camp = (branches: string[], points = 9): GameState => {
    const s = pending();
    return {
      ...s,
      pendingPrestige: null,
      hero: { ...s.hero, unspentSkillPoints: points },
      progress: { ...s.progress, trainerUnlocked: true },
      legacy: { ...s.legacy, branches },
    };
  };

  it("deeper tiers open their nodes and give lower Minor nodes one more rank per tier", () => {
    const one = applyAction(camp(["guard"]), tiered, {
      type: "learnNodes",
      nodeIds: ["pb-guard"],
    });
    expect(() =>
      applyAction(one, tiered, { type: "learnNodes", nodeIds: ["pb-guard-t2"] }),
    ).toThrow(/branchLocked/);
    expect(() => applyAction(one, tiered, { type: "learnNodes", nodeIds: ["pb-guard"] })).toThrow(
      /maxed/,
    );
    const two = applyAction(
      { ...one, legacy: { ...one.legacy, branches: ["guard", "guard"] } },
      tiered,
      { type: "learnNodes", nodeIds: ["pb-guard", "pb-guard-t2"] },
    );
    expect(two.hero.learned["pb-guard"]).toBe(2);
    expect(heroSetup(two, tiered).setup.bonuses?.armor).toBe(7 * 2 + 3);
  });

  it("an upgrade replaces the triggers of the node it upgrades and brings its own rules", () => {
    const s = applyAction(camp(["guard", "guard"]), tiered, {
      type: "learnNodes",
      nodeIds: ["pb-guard", "pb-guard-t2", "pb-guard-wall"],
    });
    const { setup } = heroSetup(s, tiered);
    expect(setup.triggers?.map((t) => t.id)).toContain("guard-wall");
    expect(setup.triggers?.map((t) => t.id)).not.toContain("guard-shell");
    // Bonuses of the replaced node stay.
    expect(setup.bonuses?.armor).toBe(7 + 3);
    expect(setup.rules?.damageTaken).toBeCloseTo(-0.1);
  });
});

describe("boss abilities", () => {
  it("a boss gains one per Prestige from the second run after its act opened", () => {
    expect(bossAbilities(data, TEST_ACT, 0)).toEqual([]);
    expect(bossAbilities(data, TEST_ACT, 1)).toEqual([]);
    expect(bossAbilities(data, TEST_ACT, 3).map((m) => m.id)).toEqual(["one", "two"]);
    expect(bossAbilities(data, { ...TEST_ACT, number: 2 }, 2)).toEqual([]);
    expect(bossAbilities(data, { ...TEST_ACT, number: 2 }, 4).map((m) => m.id)).toEqual([
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
