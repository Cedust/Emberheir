import { describe, expect, it } from "vitest";
import {
  createEnemySetup,
  neighbours,
  newGame,
  runFight,
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

  it("has Core, Might, Arcana and Rupture with unique ids and valid links", () => {
    expect(nodes.length).toBe(50);
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(nodes.length);
    for (const node of nodes) for (const link of node.links) expect(ids, link).toContain(link);
    expect(new Set(nodes.map((n) => n.branch))).toEqual(
      new Set(["core", "might", "arcana", "rupture"]),
    );
  });

  it("has 3–4 Skill nodes and 1 Keystone per branch", () => {
    for (const branch of ["might", "arcana", "rupture"] as SkillTreeBranch[]) {
      const inBranch = nodes.filter((n) => n.branch === branch);
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
});

describe("Act 1", () => {
  it("has 15 stages at Monster Level 1–3 and Gorrak above them", () => {
    expect(stagesInAct(ACT1)).toBe(15);
    const normal = ACT1.monsterLevels.slice(0, 14);
    expect(Math.min(...normal)).toBe(1);
    expect(Math.max(...normal)).toBe(3);
    expect(ACT1.monsterLevels[14]).toBeGreaterThan(3);
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
  it("picks up the level band where Act 1 ends", () => {
    expect(stagesInAct(ACT2)).toBe(15);
    expect(ACT2.monsterLevels[0]).toBeGreaterThan(ACT1.monsterLevels[13] ?? 0);
    expect(ACT2.monsterLevels[14]).toBeGreaterThan(ACT2.monsterLevels[13] ?? 0);
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
