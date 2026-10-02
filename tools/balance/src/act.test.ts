import { GAME_DATA } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { playAct, playGenerations } from "./act";

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

  it("plays the acts in order, prestiges after the last boss and starts again", () => {
    const reports = playGenerations(GAME_DATA, {
      seed: 2,
      starterWeapon: "fire-wand",
      upToAct: 2,
      maxAttempts: 30,
      generations: 2,
    });
    expect(reports.map((r) => [r.generation, r.act])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ]);
    expect(reports.slice(0, 2).every((r) => r.cleared)).toBe(true);
    expect(reports[2]?.fights).toBeGreaterThanOrEqual(15);
  });
});
