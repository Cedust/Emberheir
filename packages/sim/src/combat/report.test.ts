import { describe, expect, it } from "vitest";
import type { CombatEvent } from "./fight";
import { AILMENT_SOURCE, damageShare, fightReport } from "./report";

const hit = (side: "hero" | "enemy", source: string, damage: number): CombatEvent => ({
  t: 0,
  type: "hit",
  side,
  source,
  damage,
  damageType: "physical",
  crit: false,
  blocked: false,
});

describe("fightReport", () => {
  it("sums damage per source, DoTs on the enemy and Reaction casts", () => {
    const report = fightReport([
      hit("hero", "Slash", 30),
      hit("hero", "Power Strike", 50),
      hit("hero", "Slash", 10),
      hit("enemy", "Claw", 99),
      { t: 1, type: "dot", side: "enemy", ailment: "bleed", damage: 10 },
      { t: 1, type: "dot", side: "hero", ailment: "burn", damage: 7 },
      { t: 2, type: "skill", side: "hero", skill: "Guard", heatCost: 10, via: "reaction" },
      { t: 3, type: "skill", side: "hero", skill: "Guard", heatCost: 10, via: "reaction" },
      { t: 3, type: "skill", side: "hero", skill: "Power Strike", heatCost: 20 },
    ]);
    expect(report.total).toBe(100);
    expect(report.damage[0]).toEqual({ source: "Power Strike", damage: 50 });
    expect(damageShare(report, "Slash")).toBe(0.4);
    expect(damageShare(report, AILMENT_SOURCE)).toBe(0.1);
    expect(report.reactions).toEqual([{ skill: "Guard", casts: 2 }]);
    expect(damageShare(fightReport([]), "Slash")).toBe(0);
  });
});
