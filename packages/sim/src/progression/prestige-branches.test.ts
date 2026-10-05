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
      resonance: {
        core: [
          { at: 2, description: "", bonuses: { armor: 100 } },
          { at: 3, description: "", rules: { damageTaken: -0.2 }, requires: "pb-guard-wall" },
        ],
      },
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
    // Two tiers of Core branches also reach Resonance 2 (+100 Armor).
    expect(heroSetup(two, tiered).setup.bonuses?.armor).toBe(7 * 2 + 3 + 100);
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
    expect(setup.bonuses?.armor).toBe(7 + 3 + 100);
    expect(setup.rules?.damageTaken).toBeCloseTo(-0.1);
  });

  it("Resonance counts the tiers of every branch on the same base branch", () => {
    expect(heroSetup(camp(["guard"]), tiered).setup.bonuses?.armor ?? 0).toBe(0);
    expect(heroSetup(camp(["guard", "guard"]), tiered).setup.bonuses?.armor).toBe(100);
    // The third step needs its node learned.
    const three = camp(["guard", "guard", "guard"]);
    expect(heroSetup(three, tiered).setup.rules?.damageTaken ?? 0).toBe(0);
    const learned = applyAction(three, tiered, {
      type: "learnNodes",
      nodeIds: ["pb-guard", "pb-guard-t2", "pb-guard-wall"],
    });
    expect(heroSetup(learned, tiered).setup.rules?.damageTaken).toBeCloseTo(-0.3);
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
