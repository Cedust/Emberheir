import type { WeaponDefinition } from "@emberheir/sim";

/**
 * PoC weapons (docs/design/waffen-v1.md): Sword (Cooling) and Wand (Warming), the two most
 * different Heat behaviors. Numbers are starting values for the balance CLI.
 *
 * Playtest 1: fights read too busy, so every weapon attacks a third slower (hero and enemies)
 * and hits harder by the same factor. DPS and fight length stay the same.
 *
 * Playtest 2: still too fast, the start should feel weak and slow (0.5 to 0.75 attacks per
 * second). Every weapon attacks a quarter slower again, this time without more damage, and keeps
 * its Heat per Hit, so fights and the Heat rhythm run at three quarters of the old pace.
 */
export const SWORD: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  defaultAttack: "Slash",
  damage: { min: 10, max: 17 },
  damageType: "physical",
  attacksPerSecond: 0.6,
  heatBehavior: "cooling",
  // Heat per Hit = 9 Heat/s target rate ÷ 0.6 attacks/s.
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
  // M7: +10 %, the Wand died far more often than the Sword. Prestige rework: +15 % for the
  // Level Band up to 20.
  damage: { min: 10, max: 16 },
  damageType: "fire",
  // Playtest 1: still felt too busy at 1.0 (Warming also fires Firebolt often), so 0.7.
  attacksPerSecond: 0.52,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: { elementalDamage: 0.1 },
};

/** Axe (waffen-v1.md): mid-slow Hack with a Bleed chance. Rupture's Bleed weapon. */
export const AXE: WeaponDefinition = {
  id: "axe",
  name: "Axe",
  defaultAttack: "Hack",
  damage: { min: 12, max: 21 },
  damageType: "physical",
  attacksPerSecond: 0.49,
  heatBehavior: "cooling",
  // 9 Heat/s ÷ 0.49 attacks/s.
  heatPerHit: 18,
  range: "melee",
  implicit: { physicalDamage: 0.1 },
  ailmentChances: [{ ailment: "bleed", chance: 0.25 }],
};

/** Dagger (waffen-v1.md): very fast Stab with a Poison chance and extra Crit Chance. */
export const DAGGER: WeaponDefinition = {
  id: "dagger",
  name: "Dagger",
  defaultAttack: "Stab",
  damage: { min: 8, max: 12 },
  damageType: "physical",
  attacksPerSecond: 0.94,
  heatBehavior: "cooling",
  // 9 Heat/s ÷ 0.94 attacks/s.
  heatPerHit: 10,
  range: "melee",
  implicit: { critChance: 0.05 },
  ailmentChances: [{ ailment: "poison", chance: 0.2 }],
};

/**
 * Bow (waffen-v1.md): Physical · Ranged · Over Time. A quick Shoot that can Bleed or Poison.
 * Steady Heat: fills with own hits only and never cools down.
 */
export const BOW: WeaponDefinition = {
  id: "bow",
  name: "Bow",
  defaultAttack: "Shoot",
  damage: { min: 8, max: 14 },
  damageType: "physical",
  attacksPerSecond: 0.75,
  heatBehavior: "steady",
  // 9 Heat/s ÷ 0.75 attacks/s.
  heatPerHit: 12,
  range: "ranged",
  implicit: { bleedChance: 0.04, poisonChance: 0.04 },
  ailmentChances: [
    { ailment: "bleed", chance: 0.1 },
    { ailment: "poison", chance: 0.1 },
  ],
};

/** Crossbow (waffen-v1.md): Physical · Ranged · Direct. Very slow Bolts that pierce Armor. */
export const CROSSBOW: WeaponDefinition = {
  id: "crossbow",
  name: "Crossbow",
  defaultAttack: "Bolt",
  damage: { min: 21, max: 32 },
  damageType: "physical",
  attacksPerSecond: 0.34,
  heatBehavior: "steady",
  // 9 Heat/s ÷ 0.34 attacks/s.
  heatPerHit: 27,
  range: "ranged",
  implicit: { physicalPenetration: 0.2 },
};

/**
 * Mace (waffen-v1.md): Physical · Melee · Direct, control. A slow Smash; every 4th Default
 * Attack stuns the enemy for a moment.
 */
export const MACE: WeaponDefinition = {
  id: "mace",
  name: "Mace",
  defaultAttack: "Smash",
  damage: { min: 14, max: 23 },
  damageType: "physical",
  attacksPerSecond: 0.45,
  heatBehavior: "cooling",
  // 9 Heat/s ÷ 0.45 attacks/s.
  heatPerHit: 20,
  range: "melee",
  implicit: { physicalPenetration: 0.1 },
  triggers: [
    {
      id: "stagger",
      name: "Stagger",
      condition: { kind: "everyNthAttack", n: 4 },
      effect: { kind: "stun", seconds: 0.5 },
    },
  ],
};

/**
 * Staff (waffen-v1.md): Elemental · Ranged · Over Time. A slow Void Channel with a 30 % chance
 * to Corrupt. Warming Heat like the Wand.
 */
export const STAFF: WeaponDefinition = {
  id: "staff",
  name: "Staff",
  defaultAttack: "Channel",
  damage: { min: 12, max: 20 },
  damageType: "void",
  attacksPerSecond: 0.41,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: { ailmentDuration: 0.15 },
  ailmentChances: [{ ailment: "corruption", chance: 0.3 }],
};

export const HERO_WEAPONS: readonly WeaponDefinition[] = [
  SWORD,
  FIRE_WAND,
  AXE,
  DAGGER,
  BOW,
  CROSSBOW,
  MACE,
  STAFF,
];

// Enemy weapons. Enemies follow the same rules as the hero, including Heat.
// Playtest 1: Act 1 drops less Rare and Epic gear, so enemy damage went down by ~40 %.
// M6: all 10 gear slots make the hero tougher, so Act 1 enemies hit 12 % harder again.

export const RUSTY_CLEAVER: WeaponDefinition = {
  id: "rusty-cleaver",
  name: "Rusty Cleaver",
  defaultAttack: "Cleave",
  damage: { min: 1.01, max: 1.51 },
  damageType: "physical",
  attacksPerSecond: 0.3,
  heatBehavior: "cooling",
  heatPerHit: 30,
  range: "melee",
  implicit: {},
};

export const TWIN_SHIVS: WeaponDefinition = {
  id: "twin-shivs",
  name: "Twin Shivs",
  defaultAttack: "Stab",
  damage: { min: 0.48, max: 0.76 },
  damageType: "physical",
  attacksPerSecond: 0.83,
  heatBehavior: "cooling",
  heatPerHit: 11,
  range: "melee",
  implicit: {},
};

export const CINDER_ROD: WeaponDefinition = {
  id: "cinder-rod",
  name: "Cinder Rod",
  defaultAttack: "Ember",
  damage: { min: 0.48, max: 1.01 },
  damageType: "fire",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
};

export const PIT_MAUL: WeaponDefinition = {
  id: "pit-maul",
  name: "Pit Maul",
  defaultAttack: "Smash",
  damage: { min: 2.74, max: 3.7 },
  damageType: "physical",
  attacksPerSecond: 0.38,
  heatBehavior: "cooling",
  heatPerHit: 24,
  range: "melee",
  implicit: {},
};

// Act 2 (Rotwood) enemy weapons: Bleed and Poison.

export const THORN_CLAWS: WeaponDefinition = {
  id: "thorn-claws",
  name: "Thorn Claws",
  defaultAttack: "Claw",
  damage: { min: 0.61, max: 0.94 },
  damageType: "physical",
  attacksPerSecond: 0.75,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "bleed", chance: 0.15 }],
};

export const SPORE_SAC: WeaponDefinition = {
  id: "spore-sac",
  name: "Spore Sac",
  defaultAttack: "Spore",
  damage: { min: 0.55, max: 0.99 },
  damageType: "physical",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "poison", chance: 0.3 }],
};

export const BRANCH_FLAIL: WeaponDefinition = {
  id: "branch-flail",
  name: "Branch Flail",
  defaultAttack: "Lash",
  damage: { min: 1.32, max: 1.98 },
  damageType: "physical",
  attacksPerSecond: 0.34,
  heatBehavior: "cooling",
  heatPerHit: 27,
  range: "melee",
  implicit: {},
};

export const WARDEN_STAFF: WeaponDefinition = {
  id: "warden-staff",
  name: "Warden Staff",
  defaultAttack: "Strike",
  damage: { min: 0.83, max: 1.26 },
  damageType: "physical",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
};

export const ROT_LASH: WeaponDefinition = {
  id: "rot-lash",
  name: "Rot Lash",
  defaultAttack: "Lash",
  damage: { min: 1.65, max: 2.42 },
  damageType: "physical",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "poison", chance: 0.4 }],
};

// Act 3 (Ember Wastes) enemy weapons: Fire and Burn.

export const EMBER_CLAWS: WeaponDefinition = {
  id: "ember-claws",
  name: "Ember Claws",
  defaultAttack: "Scorch",
  damage: { min: 0.66, max: 1.01 },
  damageType: "fire",
  attacksPerSecond: 0.75,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "burn", chance: 0.2 }],
};

export const MAGMA_FIST: WeaponDefinition = {
  id: "magma-fist",
  name: "Magma Fist",
  defaultAttack: "Pound",
  damage: { min: 1.54, max: 2.31 },
  damageType: "fire",
  attacksPerSecond: 0.34,
  heatBehavior: "cooling",
  heatPerHit: 27,
  range: "melee",
  implicit: {},
};

export const PYRE_STAFF: WeaponDefinition = {
  id: "pyre-staff",
  name: "Pyre Staff",
  defaultAttack: "Flame",
  damage: { min: 0.66, max: 1.21 },
  damageType: "fire",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "burn", chance: 0.35 }],
};

export const OBSIDIAN_GLAIVE: WeaponDefinition = {
  id: "obsidian-glaive",
  name: "Obsidian Glaive",
  defaultAttack: "Cut",
  damage: { min: 0.94, max: 1.43 },
  damageType: "physical",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
};

export const TYRANT_BRAND: WeaponDefinition = {
  id: "tyrant-brand",
  name: "Tyrant's Brand",
  defaultAttack: "Brand",
  damage: { min: 2.42, max: 3.41 },
  damageType: "fire",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "burn", chance: 0.3 }],
};

// Act 4 (Frost Peaks) enemy weapons: Cold and Chill.

export const FROST_FANGS: WeaponDefinition = {
  id: "frost-fangs",
  name: "Frost Fangs",
  defaultAttack: "Bite",
  damage: { min: 0.71, max: 1.09 },
  damageType: "cold",
  attacksPerSecond: 0.79,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "chill", chance: 0.15 }],
};

export const GLACIER_MAUL: WeaponDefinition = {
  id: "glacier-maul",
  name: "Glacier Maul",
  defaultAttack: "Crush",
  damage: { min: 1.67, max: 2.47 },
  damageType: "physical",
  attacksPerSecond: 0.32,
  heatBehavior: "cooling",
  heatPerHit: 28,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "chill", chance: 0.2 }],
};

export const RIME_WAND: WeaponDefinition = {
  id: "rime-wand",
  name: "Rime Wand",
  defaultAttack: "Frost",
  damage: { min: 0.69, max: 1.32 },
  damageType: "cold",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "chill", chance: 0.25 }],
};

export const ICE_SHARDS: WeaponDefinition = {
  id: "ice-shards",
  name: "Ice Shards",
  defaultAttack: "Shard",
  damage: { min: 0.8, max: 1.21 },
  damageType: "cold",
  attacksPerSecond: 0.52,
  heatBehavior: "cooling",
  heatPerHit: 17,
  range: "melee",
  implicit: {},
};

export const WARDEN_HALBERD: WeaponDefinition = {
  id: "warden-halberd",
  name: "Warden's Halberd",
  defaultAttack: "Sweep",
  damage: { min: 2.64, max: 3.68 },
  damageType: "cold",
  attacksPerSecond: 0.38,
  heatBehavior: "cooling",
  heatPerHit: 24,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "chill", chance: 0.35 }],
};

// Act 5 (Storm Spires) enemy weapons: Lightning and Shock.

export const STORM_TALONS: WeaponDefinition = {
  id: "storm-talons",
  name: "Storm Talons",
  defaultAttack: "Rake",
  damage: { min: 0.69, max: 1.06 },
  damageType: "lightning",
  attacksPerSecond: 0.79,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "shock", chance: 0.1 }],
};

export const THUNDER_MAUL: WeaponDefinition = {
  id: "thunder-maul",
  name: "Thunder Maul",
  defaultAttack: "Pound",
  damage: { min: 1.62, max: 2.39 },
  damageType: "physical",
  attacksPerSecond: 0.34,
  heatBehavior: "cooling",
  heatPerHit: 26,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "shock", chance: 0.12 }],
};

export const STORM_ROD: WeaponDefinition = {
  id: "storm-rod",
  name: "Storm Rod",
  defaultAttack: "Zap",
  damage: { min: 0.67, max: 1.28 },
  damageType: "lightning",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "shock", chance: 0.15 }],
};

export const COPPER_FISTS: WeaponDefinition = {
  id: "copper-fists",
  name: "Copper Fists",
  defaultAttack: "Jolt",
  damage: { min: 1.17, max: 1.75 },
  damageType: "lightning",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
};

export const HERALD_SPEAR: WeaponDefinition = {
  id: "herald-spear",
  name: "Herald's Spear",
  defaultAttack: "Lance",
  damage: { min: 2.34, max: 3.33 },
  damageType: "lightning",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "shock", chance: 0.3 }],
};

// Act 6 (Void Rift) enemy weapons: Void and Corruption.

export const RIFT_CLAWS: WeaponDefinition = {
  id: "rift-claws",
  name: "Rift Claws",
  defaultAttack: "Tear",
  damage: { min: 0.8, max: 1.22 },
  damageType: "void",
  attacksPerSecond: 0.79,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 0.15 }],
};

export const HOLLOW_FIST: WeaponDefinition = {
  id: "hollow-fist",
  name: "Hollow Fist",
  defaultAttack: "Crush",
  damage: { min: 1.67, max: 2.48 },
  damageType: "physical",
  attacksPerSecond: 0.34,
  heatBehavior: "cooling",
  heatPerHit: 26,
  range: "melee",
  implicit: {},
};

export const SEER_EYE: WeaponDefinition = {
  id: "seer-eye",
  name: "Seer's Eye",
  defaultAttack: "Gaze",
  damage: { min: 0.76, max: 1.46 },
  damageType: "void",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 0.25 }],
};

export const GLOOM_THREADS: WeaponDefinition = {
  id: "gloom-threads",
  name: "Gloom Threads",
  defaultAttack: "Lash",
  damage: { min: 0.72, max: 1.1 },
  damageType: "void",
  attacksPerSecond: 0.56,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 0.35 }],
};

export const MAW_JAWS: WeaponDefinition = {
  id: "maw-jaws",
  name: "Maw",
  defaultAttack: "Bite",
  damage: { min: 2.5, max: 3.6 },
  damageType: "void",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 1 }],
};

// Act 7 (Emberfall) enemy weapons: everything at once.

export const REVENANT_BLADE: WeaponDefinition = {
  id: "revenant-blade",
  name: "Revenant Blade",
  defaultAttack: "Cleave",
  damage: { min: 1.67, max: 2.46 },
  damageType: "physical",
  attacksPerSecond: 0.38,
  heatBehavior: "cooling",
  heatPerHit: 24,
  range: "melee",
  implicit: {},
  ailmentChances: [
    { ailment: "bleed", chance: 0.2 },
    { ailment: "burn", chance: 0.2 },
  ],
};

export const WRAITH_FLAME: WeaponDefinition = {
  id: "wraith-flame",
  name: "Wraith Flame",
  defaultAttack: "Flicker",
  damage: { min: 0.7, max: 1.32 },
  damageType: "fire",
  attacksPerSecond: 0.45,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [
    { ailment: "burn", chance: 0.2 },
    { ailment: "corruption", chance: 0.15 },
  ],
};

export const HOUND_FANGS: WeaponDefinition = {
  id: "hound-fangs",
  name: "Harrow Fangs",
  defaultAttack: "Maul",
  damage: { min: 0.74, max: 1.13 },
  damageType: "physical",
  attacksPerSecond: 0.79,
  heatBehavior: "cooling",
  heatPerHit: 12,
  range: "melee",
  implicit: {},
  ailmentChances: [
    { ailment: "bleed", chance: 0.15 },
    { ailment: "poison", chance: 0.15 },
  ],
};

export const CINDER_LANCE: WeaponDefinition = {
  id: "cinder-lance",
  name: "Cinder Lance",
  defaultAttack: "Thrust",
  damage: { min: 0.84, max: 1.25 },
  damageType: "fire",
  attacksPerSecond: 0.52,
  heatBehavior: "cooling",
  heatPerHit: 17,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "chill", chance: 0.15 }],
};

export const HARVEST_SCYTHE: WeaponDefinition = {
  id: "harvest-scythe",
  name: "Harvest Scythe",
  defaultAttack: "Reap",
  damage: { min: 2.55, max: 3.61 },
  damageType: "physical",
  attacksPerSecond: 0.41,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [
    { ailment: "bleed", chance: 0.25 },
    { ailment: "poison", chance: 0.25 },
  ],
};
