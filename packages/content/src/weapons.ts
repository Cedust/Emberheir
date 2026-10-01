import type { WeaponDefinition } from "@emberheir/sim";

/**
 * PoC weapons (docs/design/waffen-v1.md): Sword (Cooling) and Wand (Warming), the two most
 * different Heat behaviors. Numbers are starting values for the balance CLI.
 */
export const SWORD: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  defaultAttack: "Slash",
  damage: { min: 7, max: 11 },
  damageType: "physical",
  attacksPerSecond: 1.2,
  heatBehavior: "cooling",
  // Heat per Hit = 12 Heat/s target rate ÷ 1.2 attacks/s.
  heatPerHit: 10,
  range: "melee",
  implicit: { evasion: 0.05 },
};

export const FIRE_WAND: WeaponDefinition = {
  id: "fire-wand",
  name: "Fire Wand",
  defaultAttack: "Spark",
  damage: { min: 4, max: 6 },
  damageType: "fire",
  attacksPerSecond: 1.5,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: { elementalDamage: 0.1 },
};

export const HERO_WEAPONS: readonly WeaponDefinition[] = [SWORD, FIRE_WAND];

// Enemy weapons. Enemies follow the same rules as the hero, including Heat.

export const RUSTY_CLEAVER: WeaponDefinition = {
  id: "rusty-cleaver",
  name: "Rusty Cleaver",
  defaultAttack: "Cleave",
  damage: { min: 2, max: 3 },
  damageType: "physical",
  attacksPerSecond: 0.6,
  heatBehavior: "cooling",
  heatPerHit: 20,
  range: "melee",
  implicit: {},
};

export const TWIN_SHIVS: WeaponDefinition = {
  id: "twin-shivs",
  name: "Twin Shivs",
  defaultAttack: "Stab",
  damage: { min: 1, max: 1.5 },
  damageType: "physical",
  attacksPerSecond: 1.6,
  heatBehavior: "cooling",
  heatPerHit: 7.5,
  range: "melee",
  implicit: {},
};

export const CINDER_ROD: WeaponDefinition = {
  id: "cinder-rod",
  name: "Cinder Rod",
  defaultAttack: "Ember",
  damage: { min: 1, max: 2 },
  damageType: "fire",
  attacksPerSecond: 0.9,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
};
