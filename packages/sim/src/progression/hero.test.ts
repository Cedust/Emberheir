import { describe, expect, it } from "vitest";
import { deriveStats } from "../combat/stats";
import { TEST_WEAPON } from "../combat/test-fixtures";
import { TEST_CATALOG } from "../items/test-fixtures";
import { buildHeroSetup } from "./hero";

const ATTRIBUTES = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  agility: 0,
  wisdom: 0,
  vitality: 0,
};

const build = (heatFromHitsTaken = 0) =>
  buildHeroSetup(
    {
      level: 1,
      attributes: ATTRIBUTES,
      equipment: {},
      fallbackWeapon: { ...TEST_WEAPON, heatBehavior: "cooling" },
      rotation: () => [],
      bonuses: () => ({ heatFromHitsTaken }),
    },
    TEST_CATALOG,
  ).setup;

describe("buildHeroSetup", () => {
  it("the hero gets Heat from Hits Taken only from the Skill Tree", () => {
    expect(deriveStats(build()).heatFromHitsTaken).toBe(0);
    expect(deriveStats(build(1.5)).heatFromHitsTaken).toBeCloseTo(1.5);
  });
});
