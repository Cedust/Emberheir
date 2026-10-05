import { describe, expect, it } from "vitest";
import { setup } from "../combat/test-fixtures";
import { PROGRESSION } from "./constants";
import { applyEliteModifiers, eliteChance, eliteModifierCount } from "./elites";

describe("Elites", () => {
  it("chance rises per stage and act (loot-rewards-v1.md section 6)", () => {
    expect(eliteChance(1, 3)).toBeCloseTo(0.06);
    expect(eliteChance(1, 14)).toBeCloseTo(0.115);
    expect(eliteChance(6, 14)).toBeCloseTo(0.215);
    expect(eliteChance(100, 15)).toBe(PROGRESSION.eliteChanceCap);
  });

  it("never show up on the first stages of an act", () => {
    expect(eliteChance(1, 1)).toBe(0);
    expect(eliteChance(1, PROGRESSION.eliteFreeStages)).toBe(0);
    expect(eliteChance(5, 1)).toBe(0);
  });

  it("get more modifiers with higher Monster Levels, at most 3", () => {
    expect(eliteModifierCount(1)).toBe(1);
    expect(eliteModifierCount(3)).toBe(1);
    expect(eliteModifierCount(26)).toBe(2);
    expect(eliteModifierCount(99)).toBe(3);
  });

  it("are tougher and carry their modifiers", () => {
    const elite = applyEliteModifiers(setup({ baseLife: 100 }), [
      { id: "x", name: "X", description: "", bonuses: { armor: 7 } },
      {
        id: "y",
        name: "Y",
        description: "",
        triggers: [
          {
            id: "t",
            name: "T",
            condition: { kind: "fightStart" },
            effect: { kind: "heat", amount: 1 },
          },
        ],
      },
    ]);
    expect(elite.baseLife).toBeCloseTo(100 * PROGRESSION.eliteLifeMultiplier);
    expect(elite.damageMultiplier).toBeCloseTo(PROGRESSION.eliteDamageMultiplier);
    expect(elite.bonuses?.armor).toBe(7);
    expect(elite.triggers).toHaveLength(1);
  });
});
