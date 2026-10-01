import { POC_GAME_DATA } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { playAct } from "./act";

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
});
