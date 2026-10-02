import { describe, expect, it } from "vitest";
import { COMBAT } from "./constants";
import { deriveStats, heroBaseLife, sumBonuses } from "./stats";
import { TEST_WEAPON, ZERO_ATTRIBUTES, setup } from "./test-fixtures";

describe("deriveStats", () => {
  it("gives base values with zero attributes", () => {
    const s = deriveStats(setup());
    expect(s.maxLife).toBe(100);
    expect(s.critChance).toBe(COMBAT.baseCritChance);
    expect(s.attackSpeed).toBe(1);
    expect(s.armor).toBe(0);
    expect(s.evasion).toBe(0);
  });

  it("gives each attribute its two effects", () => {
    const one = (attr: keyof typeof ZERO_ATTRIBUTES) =>
      deriveStats(setup({ attributes: { ...ZERO_ATTRIBUTES, [attr]: 10 } }));

    expect(one("strength")).toMatchObject({ physicalDamage: 0.1, armor: 10 });
    expect(one("dexterity").critChance).toBeCloseTo(0.07);
    expect(one("dexterity").triggerChance).toBeCloseTo(0.05);
    expect(one("agility").attackSpeed).toBeCloseTo(1.1);
    expect(one("agility").evasion).toBeCloseTo(0.04);
    expect(one("intelligence").elementalDamage).toBeCloseTo(0.1);
    expect(one("intelligence").resistance).toBeCloseTo(0.02);
    expect(one("wisdom")).toMatchObject({ heatGain: 0.1, ailmentDuration: 0.1 });
    expect(one("vitality").maxLife).toBe(150);
    expect(one("vitality").tenacity).toBeCloseTo(0.05);
  });

  it("adds the weapon implicit and other bonuses", () => {
    const s = deriveStats(
      setup({
        weapon: { ...TEST_WEAPON, implicit: { evasion: 0.05 } },
        bonuses: { evasion: 0.1, life: 20 },
      }),
    );
    expect(s.evasion).toBeCloseTo(0.15);
    expect(s.maxLife).toBe(120);
  });

  it("caps Evasion, Block, Resistance and Tenacity", () => {
    const s = deriveStats(
      setup({
        bonuses: { evasion: 2, blockChance: 2, allResistance: 2, tenacity: 2, critChance: 5 },
      }),
    );
    expect(s.evasion).toBe(COMBAT.maxEvasion);
    expect(s.blockChance).toBe(COMBAT.maxBlockChance);
    expect(s.resistance).toBe(COMBAT.maxResistance);
    expect(s.tenacity).toBe(COMBAT.maxTenacity);
    expect(s.critChance).toBe(1);
  });

  it("adds each element's own Resistance to All Resistance, under the same cap", () => {
    const s = deriveStats(
      setup({
        attributes: { ...ZERO_ATTRIBUTES, intelligence: 10 },
        bonuses: { allResistance: 0.1, fireResistance: 0.2, coldResistance: 2 },
      }),
    );
    expect(s.resistance).toBeCloseTo(0.12);
    expect(s.fireResistance).toBeCloseTo(0.32);
    expect(s.coldResistance).toBe(COMBAT.maxResistance);
    expect(s.lightningResistance).toBeCloseTo(0.12);
    expect(s.voidResistance).toBeCloseTo(0.12);
  });

  it("uses the hero life curve when no base life is given", () => {
    const noBaseLife = {
      name: "Heir",
      level: 3,
      attributes: ZERO_ATTRIBUTES,
      weapon: TEST_WEAPON,
      rotation: [],
    };
    expect(deriveStats(noBaseLife).maxLife).toBe(heroBaseLife(3));
    expect(heroBaseLife(3)).toBe(COMBAT.heroBaseLife + 2 * COMBAT.heroLifePerLevel);
  });
});

describe("sumBonuses", () => {
  it("adds sets and treats missing keys as 0", () => {
    const total = sumBonuses({ armor: 5 }, undefined, { armor: 3, lifesteal: 0.02 });
    expect(total.armor).toBe(8);
    expect(total.lifesteal).toBe(0.02);
    expect(total.life).toBe(0);
  });
});
