import type { WeaponDefinition } from "@emberheir/sim";

/**
 * PoC weapons (docs/design/waffen-v1.md): Sword (Cooling) and Wand (Warming), the two most
 * different Heat behaviors. Numbers are starting values for the balance CLI.
 *
 * Playtest 1: fights read too busy, so every weapon attacks a third slower (hero and enemies)
 * and hits harder by the same factor. DPS and fight length stay the same.
 */
export const SWORD: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  defaultAttack: "Slash",
  damage: { min: 10, max: 17 },
  damageType: "physical",
  attacksPerSecond: 0.8,
  heatBehavior: "cooling",
  // Heat per Hit = 12 Heat/s target rate ÷ 0.8 attacks/s.
  heatPerHit: 15,
  range: "melee",
  implicit: { evasion: 0.05 },
  // Counter identity (docs/design/waffen-v1.md section 3).
  triggers: [
    {
      id: "riposte",
      name: "Riposte",
      condition: { kind: "whenHit" },
      chance: 0.15,
      effect: { kind: "extraAttack" },
    },
  ],
};

export const FIRE_WAND: WeaponDefinition = {
  id: "fire-wand",
  name: "Fire Wand",
  defaultAttack: "Spark",
  damage: { min: 8, max: 13 },
  damageType: "fire",
  // Playtest 1: still felt too busy at 1.0 (Warming also fires Firebolt often), so 0.7.
  attacksPerSecond: 0.7,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: { elementalDamage: 0.1 },
};

export const HERO_WEAPONS: readonly WeaponDefinition[] = [SWORD, FIRE_WAND];

// Enemy weapons. Enemies follow the same rules as the hero, including Heat.
// Playtest 1: Act 1 drops less Rare and Epic gear, so enemy damage went down by ~40 %.

export const RUSTY_CLEAVER: WeaponDefinition = {
  id: "rusty-cleaver",
  name: "Rusty Cleaver",
  defaultAttack: "Cleave",
  damage: { min: 0.9, max: 1.35 },
  damageType: "physical",
  attacksPerSecond: 0.4,
  heatBehavior: "cooling",
  heatPerHit: 30,
  range: "melee",
  implicit: {},
};

export const TWIN_SHIVS: WeaponDefinition = {
  id: "twin-shivs",
  name: "Twin Shivs",
  defaultAttack: "Stab",
  damage: { min: 0.43, max: 0.68 },
  damageType: "physical",
  attacksPerSecond: 1.1,
  heatBehavior: "cooling",
  heatPerHit: 11,
  range: "melee",
  implicit: {},
};

export const CINDER_ROD: WeaponDefinition = {
  id: "cinder-rod",
  name: "Cinder Rod",
  defaultAttack: "Ember",
  damage: { min: 0.43, max: 0.9 },
  damageType: "fire",
  attacksPerSecond: 0.6,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
};

export const PIT_MAUL: WeaponDefinition = {
  id: "pit-maul",
  name: "Pit Maul",
  defaultAttack: "Smash",
  damage: { min: 2.45, max: 3.3 },
  damageType: "physical",
  attacksPerSecond: 0.5,
  heatBehavior: "cooling",
  heatPerHit: 24,
  range: "melee",
  implicit: {},
};
