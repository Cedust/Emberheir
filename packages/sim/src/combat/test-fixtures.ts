import type { Attributes, CombatantSetup, SkillDefinition, WeaponDefinition } from "./types";

/** Shared building blocks for combat unit tests. Not exported from the package. */

export const ZERO_ATTRIBUTES: Attributes = {
  strength: 0,
  dexterity: 0,
  agility: 0,
  intelligence: 0,
  wisdom: 0,
  vitality: 0,
};

export const TEST_WEAPON: WeaponDefinition = {
  id: "test-blade",
  name: "Test Blade",
  defaultAttack: "Poke",
  damage: { min: 10, max: 10 },
  damageType: "physical",
  attacksPerSecond: 1,
  heatBehavior: "steady",
  heatPerHit: 10,
  range: "melee",
  implicit: {},
};

export const TEST_SKILL: SkillDefinition = {
  id: "test-strike",
  name: "Test Strike",
  type: "attack",
  heatCost: 20,
  tags: [],
  description: "",
  hits: [{ kind: "weapon", multiplier: 2 }],
};

export function setup(overrides: Partial<CombatantSetup> = {}): CombatantSetup {
  return {
    name: "Dummy",
    level: 1,
    attributes: ZERO_ATTRIBUTES,
    weapon: TEST_WEAPON,
    rotation: [],
    baseLife: 100,
    ...overrides,
  };
}

/** A fighter that never attacks and cannot die quickly: a training dummy. */
export function dummy(overrides: Partial<CombatantSetup> = {}): CombatantSetup {
  return setup({
    name: "Training Dummy",
    weapon: { ...TEST_WEAPON, attacksPerSecond: 0 },
    baseLife: 100_000,
    ...overrides,
  });
}
