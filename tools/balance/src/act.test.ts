import { POC_GAME_DATA } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { playAct, playGenerations } from "./act";

describe("act autopilot", () => {
  it("plays Act 1 to the end and reports it", () => {
    const report = playAct(POC_GAME_DATA, {
      seed: 1,
      starterWeapon: "sword",
      actId: "ashen-fields",
      maxAttempts: 20,
    });
    expect(report.fights).toBeGreaterThanOrEqual(15);
    expect(report.fightSeconds.length).toBeGreaterThan(0);
  });

  it("prestiges after Gorrak and plays the next generation", () => {
    const [first, second] = playGenerations(POC_GAME_DATA, {
      seed: 2,
      starterWeapon: "fire-wand",
      actId: "ashen-fields",
      maxAttempts: 30,
      generations: 2,
    });
    expect(first?.cleared).toBe(true);
    expect(second?.generation).toBe(2);
    expect(second?.fights).toBeGreaterThanOrEqual(15);
  });
});
