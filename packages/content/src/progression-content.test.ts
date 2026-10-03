import { describe, expect, it } from "vitest";
import {
  actsInRun,
  createEnemySetup,
  levelCap,
  neighbours,
  newGame,
  runFight,
  stageMonsterLevel,
  stagesInAct,
  type SkillTreeBranch,
} from "@emberheir/sim";
import { ELITE_MODIFIERS } from "./elites";
import { ACT1, ACT2, GAME_DATA } from "./game";
import { createHeroSetup } from "./heroes";
import { SKILL_TREE } from "./skill-tree";
import { SWORD } from "./weapons";

describe("Skill Tree", () => {
  const nodes = SKILL_TREE.nodes;

  const base = nodes.filter((n) => !n.prestigeBranch);

  it("has all five branches with unique ids and valid links", () => {
    expect(base.length).toBe(62);
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(nodes.length);
    for (const node of nodes) for (const link of node.links) expect(ids, link).toContain(link);
    expect(new Set(nodes.map((n) => n.branch))).toEqual(
      new Set(["core", "might", "arcana", "rupture", "affliction"]),
    );
  });

  it("has 3–4 Skill nodes and 1 Keystone per branch", () => {
    for (const branch of ["might", "arcana", "rupture", "affliction"] as SkillTreeBranch[]) {
      const inBranch = base.filter((n) => n.branch === branch);
      const skills = inBranch.filter((n) => n.kind === "skill" && n.skill).length;
      expect(skills).toBeGreaterThanOrEqual(3);
      expect(skills).toBeLessThanOrEqual(4);
      expect(inBranch.filter((n) => n.kind === "keystone" && n.keystone)).toHaveLength(1);
    }
  });

  it("every node can be reached from the start node", () => {
    const seen = new Set([SKILL_TREE.startNodeId]);
    const queue = [SKILL_TREE.startNodeId];
    while (queue.length) {
      for (const n of neighbours(SKILL_TREE, queue.shift() ?? "")) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(nodes.length);
  });

  it("has ten Prestige branches with one Skill and one Keystone each", () => {
    const branches = SKILL_TREE.prestigeBranches ?? [];
    expect(branches).toHaveLength(10);
    for (const b of branches) {
      const inBranch = nodes.filter((n) => n.prestigeBranch === b.id);
      expect(inBranch, b.id).toHaveLength(10);
      expect(inBranch.filter((n) => n.kind === "skill" && n.skill)).toHaveLength(1);
      expect(inBranch.filter((n) => n.kind === "keystone" && n.keystone)).toHaveLength(1);
      // It hangs off a base node of its own branch.
      const anchor = base.find((n) => n.id === b.anchor);
      expect(anchor?.branch, b.id).toBe(b.branch);
      expect(neighbours(SKILL_TREE, b.anchor).some((id) => id.startsWith(`pb-${b.id}-`))).toBe(
        true,
      );
    }
  });
});

describe("Act 1", () => {
  it("has 15 stages: the first run climbs from Monster Level 1 to Gorrak at the Level Cap", () => {
    expect(stagesInAct(ACT1)).toBe(15);
    expect(stageMonsterLevel(GAME_DATA, ACT1, 1, 0)).toBe(1);
    expect(stageMonsterLevel(GAME_DATA, ACT1, 15, 0)).toBe(levelCap(0));
    expect(ACT1.boss.telegraphs?.length).toBe(1);
  });

  it("has Elite modifiers with unique ids", () => {
    expect(new Set(ELITE_MODIFIERS.map((m) => m.id)).size).toBe(ELITE_MODIFIERS.length);
  });

  it("Gorrak announces his Slam in a fight", () => {
    const hero = createHeroSetup({ weapon: SWORD, level: 4 });
    const result = runFight(hero, createEnemySetup(ACT1.boss, 4), 1);
    expect(result.events.some((e) => e.type === "telegraph")).toBe(true);
  });

  it("a new game works with every starter weapon", () => {
    for (const starterWeapon of GAME_DATA.starterWeapons) {
      const state = newGame(GAME_DATA, { seed: 1, starterWeapon });
      expect(state.hero.equipment.mainHand?.baseId).toBe(starterWeapon);
    }
  });
});

describe("Act 2", () => {
  it("opens in the second run and picks up the level band where Act 1 ends", () => {
    expect(stagesInAct(ACT2)).toBe(15);
    expect(actsInRun(GAME_DATA, 0).map((a) => a.id)).toEqual(["ashen-fields"]);
    expect(actsInRun(GAME_DATA, 1).map((a) => a.id)).toEqual(["ashen-fields", "rotwood"]);
    expect(stageMonsterLevel(GAME_DATA, ACT2, 1, 1)).toBeGreaterThan(
      stageMonsterLevel(GAME_DATA, ACT1, 15, 1),
    );
    expect(stageMonsterLevel(GAME_DATA, ACT2, 15, 1)).toBe(levelCap(1));
  });

  it("the Mother of Rot poisons the hero and feeds to heal", () => {
    const hero = createHeroSetup({ weapon: SWORD, level: 9 });
    const result = runFight(hero, createEnemySetup(ACT2.boss, 10), 1);
    const events = result.events;
    expect(events.some((e) => e.type === "ailment" && e.ailment === "poison")).toBe(true);
    expect(events.some((e) => e.type === "telegraph" && e.skill === "Devour")).toBe(true);
    expect(events.some((e) => e.type === "heal" && e.side === "enemy")).toBe(true);
  });
});
