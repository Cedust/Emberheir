import { describe, expect, it } from "vitest";
import {
  actsInRun,
  createEnemySetup,
  heroSetup,
  bossLevel,
  neighbours,
  newGame,
  runFight,
  stageMonsterLevel,
  stagesInAct,
} from "@emberheir/sim";
import { BRANCH_EPITHETS, CLASSES } from "./classes";
import { ELITE_MODIFIERS } from "./elites";
import { ACT1, ACT2, GAME_DATA } from "./game";
import { createHeroSetup } from "./heroes";
import { SKILL_TREE } from "./skill-tree";
import { SWORD } from "./weapons";

describe("Skill Tree", () => {
  const nodes = SKILL_TREE.nodes;

  const base = nodes.filter((n) => !n.prestigeBranch);
  const regions = new Set(base.map((n) => n.region));

  it("is a web of eight regions with unique ids and valid links", () => {
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(nodes.length);
    for (const node of nodes) for (const link of node.links) expect(ids, link).toContain(link);
    expect(regions).toEqual(
      new Set([
        "might",
        "might-arcana",
        "arcana",
        "arcana-affliction",
        "affliction",
        "affliction-rupture",
        "rupture",
        "rupture-might",
      ]),
    );
  });

  it("is much bigger than the 100 Skill Points (level-v2.md section 7)", () => {
    const points = base
      .filter((n) => n.kind !== "keystone" && !n.classStart)
      .reduce((sum, n) => sum + (n.maxRanks ?? 1), 0);
    expect(points).toBeGreaterThanOrEqual(160);
    expect(base.filter((n) => n.kind === "notable").length).toBeGreaterThanOrEqual(30);
    expect(base.filter((n) => n.kind === "skill" && n.skill)).toHaveLength(14);
    expect(base.filter((n) => n.kind === "keystone" && n.keystone)).toHaveLength(12);
    // No flat Life on the web: Life comes from the level and Vitality.
    expect(base.filter((n) => n.bonuses?.life)).toEqual([]);
  });

  it("has eight forks of two Notables each", () => {
    const forks = new Map<string, number>();
    for (const n of base) if (n.fork) forks.set(n.fork, (forks.get(n.fork) ?? 0) + 1);
    expect(forks.size).toBe(8);
    for (const count of forks.values()) expect(count).toBe(2);
  });

  it("gives every class its own start node", () => {
    const starts = SKILL_TREE.classStarts ?? {};
    for (const c of CLASSES) {
      const start = base.find((n) => n.id === starts[c.id]);
      expect(start?.classStart, c.id).toBe(c.id);
    }
    expect(new Set(Object.values(starts)).size).toBe(CLASSES.length);
  });

  it("enemy hits build Heat only through the Heat from Hits Taken nodes", () => {
    const nodes = base.filter((n) => (n.bonuses?.heatFromHitsTaken ?? 0) > 0);
    expect(nodes.map((n) => n.id)).toEqual([
      "might-battle-scars",
      "might-grudge",
      "might-unbroken",
    ]);
    expect(nodes.every((n) => n.weaponRange === "melee")).toBe(true);
  });

  it("every node can be reached from every class start", () => {
    for (const start of Object.values(SKILL_TREE.classStarts ?? {})) {
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        for (const n of neighbours(SKILL_TREE, queue.shift() ?? "")) {
          if (!seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      expect(seen.size, start).toBe(nodes.length);
    }
  });

  it("grows as the Ash Tree: crown above, roots below, no two nodes on top of each other", () => {
    const nodes = SKILL_TREE.nodes;
    for (const [i, a] of nodes.entries()) {
      for (const b of nodes.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} / ${b.id}`).toBeGreaterThan(0.6);
      }
    }
    const crown = nodes.filter((n) => n.region === "might" || n.region === "arcana");
    const roots = nodes.filter((n) => n.region === "rupture" || n.region === "affliction");
    expect(Math.max(...crown.map((n) => n.y))).toBeLessThan(Math.min(...roots.map((n) => n.y)));
  });

  it("has ten Prestige branches with one Skill and one Keystone each, 8 / 5 / 6 points", () => {
    const branches = SKILL_TREE.prestigeBranches ?? [];
    expect(branches).toHaveLength(10);
    for (const b of branches) {
      const inBranch = nodes.filter((n) => n.prestigeBranch === b.id);
      const tier = (t: number) => inBranch.filter((n) => (n.tier ?? 1) === t);
      expect(tier(1), b.id).toHaveLength(9);
      expect(tier(2), b.id).toHaveLength(5);
      expect(tier(3), b.id).toHaveLength(4);
      // Skill Points to fill each tier: its nodes plus one more rank of the branch's Skill.
      const cost = (t: number) =>
        tier(t)
          .filter((n) => n.kind !== "keystone")
          .reduce((sum, n) => sum + (n.maxRanks ?? 1), 0) + (t > 1 ? 1 : 0);
      expect([cost(1), cost(2), cost(3)], b.id).toEqual([8, 5, 6]);
      expect(inBranch.filter((n) => n.kind === "skill" && n.skill)).toHaveLength(1);
      expect(inBranch.filter((n) => n.kind === "keystone" && n.keystone)).toHaveLength(3);
      // Every upgrade replaces a node of the same branch.
      for (const n of inBranch.filter((x) => x.replaces)) {
        expect(
          inBranch.some((x) => x.id === n.replaces),
          n.id,
        ).toBe(true);
      }
      // It hangs off a Notable of the web in its own branch colour.
      const anchor = base.find((n) => n.id === b.anchor);
      expect(anchor?.branch, b.id).toBe(b.branch);
      expect(anchor?.kind, b.id).toBe("notable");
      expect(neighbours(SKILL_TREE, b.anchor).some((id) => id.startsWith(`pb-${b.id}-`))).toBe(
        true,
      );
    }
  });
});

describe("Act 1", () => {
  it("has 15 stages: the first run climbs from Monster Level 1 to Gorrak at the boss level", () => {
    expect(stagesInAct(ACT1)).toBe(15);
    expect(stageMonsterLevel(GAME_DATA, ACT1, 1, 0)).toBe(1);
    expect(stageMonsterLevel(GAME_DATA, ACT1, 15, 0)).toBe(bossLevel(0));
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

  it("a new game works with every class and start weapon, gear usable from the start", () => {
    for (const heroClass of GAME_DATA.classes) {
      for (const weapon of heroClass.weapons) {
        const state = newGame(GAME_DATA, { seed: 1, classId: heroClass.id, weapon });
        expect(state.hero.weaponId).toBe(weapon);
        expect(state.hero.equipment.offHand?.baseId).toBe(heroClass.offHand);
        const { gear } = heroSetup(state, GAME_DATA);
        expect(gear.inactive, `${heroClass.id} with ${weapon}`).toEqual([]);
      }
    }
  });

  it("classes: start attributes add up to 36, four branches with Tactician, titles", () => {
    const branches = new Set((SKILL_TREE.prestigeBranches ?? []).map((b) => b.id));
    for (const c of CLASSES) {
      expect(
        Object.values(c.startingAttributes).reduce((a, b) => a + b, 0),
        c.id,
      ).toBe(36);
      expect(c.branches, c.id).toHaveLength(4);
      expect(c.branches.at(-1), c.id).toBe("tactician");
      for (const b of c.branches) {
        expect(branches.has(b), b).toBe(true);
        expect(c.titles[b], `${c.id} ${b}`).toBeTruthy();
      }
    }
    for (const b of branches) expect(BRANCH_EPITHETS[b], b).toBeTruthy();
  });
});

describe("Act 2", () => {
  it("opens in the second run and picks up the level band where Act 1 ends", () => {
    expect(stagesInAct(ACT2)).toBe(15);
    expect(actsInRun(GAME_DATA, 0).map((a) => a.id)).toEqual(["ashen-fields"]);
    expect(actsInRun(GAME_DATA, 1).map((a) => a.id)).toEqual(["ashen-fields", "rotwood"]);
    expect(stageMonsterLevel(GAME_DATA, ACT2, 1, 1)).toBeGreaterThanOrEqual(
      stageMonsterLevel(GAME_DATA, ACT1, 15, 1),
    );
    expect(stageMonsterLevel(GAME_DATA, ACT2, 15, 1)).toBe(bossLevel(1));
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
