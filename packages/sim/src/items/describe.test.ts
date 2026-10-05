import { describe, expect, it } from "vitest";
import { ZERO_ATTRIBUTES } from "../combat/test-fixtures";
import { describeItem, describeStat, describeTrigger, formatPercent, speedValue } from "./describe";
import { TEST_CATALOG } from "./test-fixtures";

describe("item text", () => {
  it("formats stats", () => {
    expect(formatPercent(0.125)).toBe("12.5");
    expect(describeStat("strength", 3)).toBe("+3 Strength");
    expect(describeStat("critChance", 0.035)).toBe("+3.5 % Crit Chance");
    expect(describeStat("burnChance", 0.05)).toBe("+5 % Chance to Burn");
    expect(describeStat("addedWeaponDamage", 5)).toBe("+3–5 Weapon Damage");
  });

  it("shows Attack Speed as a Speed value, the Sword is 100", () => {
    expect(speedValue(0.8)).toBe(100);
    expect(speedValue(1)).toBe(125);
    expect(speedValue(0.8 * 1.1)).toBe(110);
    expect(speedValue(0.4)).toBe(50);
  });

  it("formats triggers as Condition: Chance → Effect (limit)", () => {
    expect(
      describeTrigger({
        id: "x",
        name: "Searing Crit",
        condition: { kind: "onCrit" },
        chance: 0.25,
        cooldown: 1,
        effect: { kind: "ailment", ailment: "burn" },
      }),
    ).toBe("On Crit: 25 % chance to Burn the enemy (Cooldown 1 s)");
    expect(
      describeTrigger({
        id: "y",
        name: "Second Wind",
        condition: { kind: "lifeBelow", threshold: 0.35 },
        oncePerFight: true,
        effect: { kind: "heal", fraction: 0.2 },
      }),
    ).toBe("Life below 35 %: Heal 20 % of Max Life (once per fight)");
    expect(
      describeTrigger({
        id: "z",
        name: "Crushing Blow",
        condition: { kind: "everyNthAttack", n: 4 },
        effect: { kind: "weaponHit", multiplier: 1.2 },
      }),
    ).toBe("Every 4th Attack: Strike again for 120 % Weapon Damage");
  });

  it("builds a tooltip with base values, implicit, affixes and requirements", () => {
    const tooltip = describeItem(
      {
        id: "1",
        baseId: "test-sword",
        name: "Ash Bite",
        rarity: "rare",
        itemLevel: 5,
        tier: 1,
        affixes: [
          { affixId: "searing-crit", quality: 0 },
          { affixId: "strength", quality: 1 },
        ],
      },
      TEST_CATALOG,
      ZERO_ATTRIBUTES,
    );
    expect(tooltip.rarityName).toBe("Rare");
    expect(tooltip.slotName).toBe("Main Hand");
    expect(tooltip.baseLines[0]).toBe("10–10 Physical Damage");
    expect(tooltip.implicitLines).toEqual(["+5 % Evasion"]);
    expect(tooltip.affixLines).toEqual([
      { text: "+5 Strength", kind: "stat" },
      { text: "On Crit: 20 % chance to Burn the enemy (Cooldown 1 s)", kind: "trigger" },
    ]);
    expect(tooltip.requirements).toEqual([
      { attribute: "strength", name: "Strength", value: 5, met: false },
    ]);
  });
});
