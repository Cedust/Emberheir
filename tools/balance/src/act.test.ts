import { GAME_DATA } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { playAct, playGenerations } from "./act";
import { BUILDS } from "./builds";

/** These play whole runs (Bounties, Hunts, Caches): seconds locally, more on a busy CI runner. */
const RUN_TIMEOUT = 30_000;

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
  }, RUN_TIMEOUT);

  it("each run is one act longer: prestiges after the newest act's boss and starts again", () => {
    const reports = playGenerations(GAME_DATA, {
      seed: 2,
      starterWeapon: "wand",
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
    // Every stage of the act: a fight or a quiet node of the map.
    expect((reports[1]?.fights ?? 0) + (reports[1]?.visits ?? 0)).toBeGreaterThanOrEqual(15);
  }, RUN_TIMEOUT);
});

describe("autopilot builds", () => {
  it("at least three per class, every goal a node of the tree", () => {
    const ids = new Set(GAME_DATA.skillTree.nodes.map((n) => n.id));
    for (const c of GAME_DATA.classes) {
      const builds = BUILDS.filter((b) => b.classId === c.id);
      expect(builds.length, c.id).toBeGreaterThanOrEqual(3);
      for (const b of builds) expect(c.weapons, b.id).toContain(b.weapon);
    }
    const goals = BUILDS.flatMap((b) => b.nodes.filter((n) => !n.startsWith("@")));
    expect(goals.filter((n) => !ids.has(n))).toEqual([]);
  });
});
