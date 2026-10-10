import { GAME_DATA } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { BUILDS, playAct, playGenerations } from "./act";

describe("act autopilot", () => {
  it("plays Act 1 to the end and reports it", () => {
    const report = playAct(GAME_DATA, {
      seed: 1,
      starterWeapon: "sword",
      upToAct: 1,
      maxAttempts: 20,
    });
    expect(report.act).toBe(1);
    expect(report.fights).toBeGreaterThanOrEqual(15);
    expect(report.fightSeconds.length).toBeGreaterThan(0);
  });

  it("each run is one act longer: prestiges after the newest act's boss and starts again", () => {
    const reports = playGenerations(GAME_DATA, {
      seed: 2,
      starterWeapon: "fire-wand",
      upToAct: 2,
      maxAttempts: 30,
      generations: 2,
    });
    expect(reports.map((r) => [r.generation, r.act])).toEqual([
      [1, 1],
      [2, 1],
      [2, 2],
    ]);
    expect(reports[0]?.cleared).toBe(true);
    expect(reports[1]?.fights).toBeGreaterThanOrEqual(15);
  });
});

describe("autopilot builds", () => {
  it("three per class, every goal a node of the tree", () => {
    const ids = new Set(GAME_DATA.skillTree.nodes.map((n) => n.id));
    for (const c of GAME_DATA.classes) {
      const builds = BUILDS.filter((b) => b.classId === c.id);
      expect(builds, c.id).toHaveLength(3);
      for (const b of builds) expect(c.weapons, b.id).toContain(b.weapon);
    }
    const goals = BUILDS.flatMap((b) => b.nodes.filter((n) => n !== "@branches"));
    expect(goals.filter((n) => !ids.has(n))).toEqual([]);
  });
});
