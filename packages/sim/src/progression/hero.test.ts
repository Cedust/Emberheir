import { describe, expect, it } from "vitest";
import { deriveStats } from "../combat/stats";
import { TEST_WEAPON } from "../combat/test-fixtures";
import { TEST_CATALOG } from "../items/test-fixtures";
import { buildHeroSetup } from "./hero";

const ATTRIBUTES = {
  strength: 0,
  dexterity: 0,
  agility: 0,
  intelligence: 0,
  wisdom: 0,
  vitality: 0,
};

const build = (heatBehavior: "cooling" | "steady", heatPerHit = 0) =>
  buildHeroSetup(
    {
      level: 1,
      attributes: ATTRIBUTES,
      equipment: {},
      fallbackWeapon: { ...TEST_WEAPON, heatBehavior },
      rotation: () => [],
      bonuses: () => ({ heatPerHit }),
    },
    TEST_CATALOG,
  ).setup;

describe("buildHeroSetup", () => {
  it("Cooling weapons start without Heat per Hit, the Skill Tree adds it", () => {
    expect(deriveStats(build("cooling")).heatPerHit).toBe(0);
    expect(deriveStats(build("cooling", 0.6)).heatPerHit).toBeCloseTo(0.6);
  });

  it("Steady weapons keep their full Heat per Hit", () => {
    expect(deriveStats(build("steady")).heatPerHit).toBe(1);
  });
});
