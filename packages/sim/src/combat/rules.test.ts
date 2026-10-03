import { describe, expect, it } from "vitest";
import { mergeRules } from "./rules";

describe("mergeRules", () => {
  it("adds, multiplies, switches on, collects and keeps the strongest Execute", () => {
    const merged = mergeRules(
      { damageTaken: 0.2, skillCostMultiplier: 0.5, critsApplyBleed: true },
      undefined,
      {
        damageTaken: 0.1,
        skillCostMultiplier: 0.5,
        ailmentEcho: [{ from: "burn", to: "shock" }],
        execute: { below: 0.3, bonus: 0.2 },
      },
      { ailmentEcho: [{ from: "burn", to: "shock" }], execute: { below: 0.2, bonus: 0.4 } },
    );
    expect(merged.damageTaken).toBeCloseTo(0.3);
    expect(merged.skillCostMultiplier).toBe(0.25);
    expect(merged.critsApplyBleed).toBe(true);
    expect(merged.noHeatDecay).toBe(false);
    expect(merged.ailmentEcho).toEqual([{ from: "burn", to: "shock" }]);
    expect(merged.execute).toEqual({ below: 0.2, bonus: 0.4 });
  });
});
