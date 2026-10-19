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

  it("adds damage bonuses into their pool and multiplies penalties, also when merged again", () => {
    const merged = mergeRules(
      { hitDamage: 1.2, dotDamage: 1.25, defaultAttackDamage: 0.8, ailmentDamage: { bleed: 1.5 } },
      { hitDamage: 1.3, dotDamage: 0.9, defaultAttackDamage: 1.4, ailmentDamage: { bleed: 0.5 } },
    );
    expect(merged.hitDamage).toBeUndefined();
    expect(merged.hitMore).toBeCloseTo(0.5);
    expect(merged.dotDamage).toBe(0.9);
    expect(merged.dotMore).toBeCloseTo(0.25);
    expect(merged.defaultAttackDamage).toBe(0.8);
    expect(merged.defaultAttackMore).toBeCloseTo(0.4);
    expect(merged.ailmentDamage).toEqual({ bleed: 0.5 });
    expect(merged.ailmentMore?.bleed).toBeCloseTo(0.5);
    const again = mergeRules(merged, { hitDamage: 1.1 });
    expect(again.hitMore).toBeCloseTo(0.6);
    expect(again.dotDamage).toBe(0.9);
    expect(again.defaultAttackDamage).toBe(0.8);
  });
});
