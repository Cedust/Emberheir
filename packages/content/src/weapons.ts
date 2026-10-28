import type { WeaponDefinition } from "@emberheir/sim";

/**
 * PoC weapons (docs/design/waffen-v1.md): Sword (Cooling) and Wand (Warming), the two most
 * different Heat behaviors. Numbers are starting values for the balance CLI.
 *
 * Playtest 1: fights read too busy, so every weapon attacks a third slower (hero and enemies)
 * and hits harder by the same factor. DPS and fight length stay the same.
 *
 * Playtest 2 (after the real-time fix): Timo chose a wider spread per weapon, from the Dagger at
 * 1.1 down to the Crossbow at 0.5 (Speed 110 to 50, 1 attack per second is Speed 100). Heat per Hit keeps 12 Heat/s.
 */
export const SWORD: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  defaultAttack: "Slash",
  // Step 4 (Timo 2026-10-20): the three Cinderguard weapons each have their own Speed and Power,
  // at about the same damage per second (Fury's old +20 % on every hit moved into the weapons).
  // Sword: fast and light (was 14-23 at 0.8/s). Phase 5 (Timo 2026-10-21): Speed in steps of 15 by
  // Speed pip, the average hit by Power pip (see WEAPON_PIPS); was 13-20 at 0.9/s.
  damage: { min: 12, max: 18 },
  damageType: "physical",
  attacksPerSecond: 0.95,
  heatBehavior: "cooling",
  // Heat per Hit = 12 Heat/s target rate ÷ 0.95 attacks/s.
  heatPerHit: 13,
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

export const WAND: WeaponDefinition = {
  id: "wand",
  // Attunement picks the element now (Weapon Mastery), so the weapon is just "Wand".
  name: "Wand",
  defaultAttack: "Spark",
  // Step 6 (Timo 2026-10-20): Wand and Staff have their own Speed and Power, at the same damage
  // per second. Wand: fast and light (was 10-16 at 0.75/s). The caster's Default Attack was the
  // weakest in the game (weapon share 10 %), so both gained about 40 % damage per second.
  // Round Speed (Timo 2026-10-21): Speed 100 instead of 90, damage lowered by the same factor
  // (was 12-19 at 0.9/s). Phase 5: Speed 95 like the Sword, same average hit (was 11-17 at 1.0/s).
  damage: { min: 12, max: 18 },
  // Sorcerer without Fire (2026-10-17): Lightning by default, Attunement can make it Cold.
  damageType: "lightning",
  // Warming Heat comes per second, so the faster Spark needs no other Heat.
  attacksPerSecond: 0.95,
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
  // Step 4 (see the Sword): in between (was 15-26 at 0.7/s). Phase 5: Speed 80 like the Bow, same
  // average hit (was 14-25 at 0.75/s).
  damage: { min: 14, max: 22 },
  damageType: "physical",
  attacksPerSecond: 0.8,
  heatBehavior: "cooling",
  // 12 Heat/s ÷ 0.8 attacks/s.
  heatPerHit: 15,
  range: "melee",
  implicit: { physicalDamage: 0.1 },
  ailmentChances: [{ ailment: "bleed", chance: 0.25 }],
};

/** Dagger (waffen-v1.md): very fast Stab with a Poison chance and extra Crit Chance. */
export const DAGGER: WeaponDefinition = {
  id: "dagger",
  name: "Dagger",
  defaultAttack: "Stab",
  // Phase 5: average hit by Power pip (was 11-17).
  damage: { min: 11, max: 15 },
  damageType: "physical",
  attacksPerSecond: 1.1,
  heatBehavior: "cooling",
  // 12 Heat/s ÷ 1.1 attacks/s.
  heatPerHit: 11,
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
  // Step 5 (Timo 2026-10-20): the three Ashstrider weapons each have their own Speed and Power,
  // at about the same damage per second. Bow: in between (was 13-22 at 0.9/s). Phase 5: average
  // hit by Power pip (was 15-24).
  damage: { min: 14, max: 22 },
  damageType: "physical",
  attacksPerSecond: 0.8,
  heatBehavior: "steady",
  // 12 Heat/s ÷ 0.8 attacks/s.
  heatPerHit: 15,
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
  // Phase 5: average hit by Power pip (was 21-32).
  damage: { min: 23, max: 34 },
  damageType: "physical",
  attacksPerSecond: 0.5,
  heatBehavior: "steady",
  // 12 Heat/s ÷ 0.5 attacks/s.
  heatPerHit: 24,
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
  // Step 4 (Timo 2026-10-20): the three Cinderguard weapons each have their own Speed and Power.
  // Mace: slow and heavy (was 14-23 at 0.65/s). Round Speed (Timo 2026-10-21): Speed 65 like the
  // Staff instead of 60, damage lowered by the same factor (was 18-27 at 0.6/s). Phase 5: average
  // hit by Power pip, like the Staff (was 17-25).
  damage: { min: 18, max: 26 },
  damageType: "physical",
  attacksPerSecond: 0.65,
  heatBehavior: "cooling",
  // 12 Heat/s ÷ 0.65 attacks/s.
  heatPerHit: 18,
  range: "melee",
  implicit: { physicalPenetration: 0.1 },
  triggers: [
    {
      id: "stagger",
      name: "Stagger",
      condition: { kind: "everyNthAttack", n: 4 },
      // Step 7: only the Mace's own stun breaks the swing; other stuns pause it.
      effect: { kind: "stun", seconds: 0.5, breaksSwing: true },
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
  // Step 6 (see the Wand): slow and heavy (was 12-20 at 0.6/s). Phase 5: average hit by Power pip,
  // like the Mace (was 15-25).
  damage: { min: 18, max: 26 },
  damageType: "void",
  attacksPerSecond: 0.65,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: { ailmentEffect: 0.15 },
  ailmentChances: [{ ailment: "corruption", chance: 0.3 }],
};

export const HERO_WEAPONS: readonly WeaponDefinition[] = [
  SWORD,
  WAND,
  AXE,
  DAGGER,
  BOW,
  CROSSBOW,
  MACE,
  STAFF,
];

/**
 * The five pips on the class select's weapon card, Speed and Power (Timo 2026-10-21: fixed per
 * weapon, so a small change in numbers never moves a weapon's place on the card). Speed and
 * Power always add up to 6. Phase 5 (Timo 2026-10-21): the pips set the numbers too. Speed pip 5 to 1
 * = Speed 110, 95, 80, 65, 50; Power pip 1 to 5 = an average hit of 13, 15, 18, 22, 28.5. Same
 * pips, same Speed and hit: the weapons differ in Damage Range, Heat Form and their extras.
 */
export const WEAPON_PIPS: Readonly<
  Record<string, { readonly speed: number; readonly power: number }>
> = {
  dagger: { speed: 5, power: 1 },
  sword: { speed: 4, power: 2 },
  wand: { speed: 4, power: 2 },
  bow: { speed: 3, power: 3 },
  axe: { speed: 3, power: 3 },
  staff: { speed: 2, power: 4 },
  mace: { speed: 2, power: 4 },
  crossbow: { speed: 1, power: 5 },
};

// Enemy weapons. Enemies follow the same rules as the hero, including Heat.
// Playtest 1: Act 1 drops less Rare and Epic gear, so enemy damage went down by ~40 %.
// M6: all 10 gear slots make the hero tougher, so Act 1 enemies hit 12 % harder again.

export const RUSTY_CLEAVER: WeaponDefinition = {
  id: "rusty-cleaver",
  name: "Rusty Cleaver",
  defaultAttack: "Cleave",
  damage: { min: 1.01, max: 1.51 },
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
  damage: { min: 0.48, max: 0.76 },
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
  damage: { min: 0.48, max: 1.01 },
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
  damage: { min: 2.74, max: 3.7 },
  damageType: "physical",
  attacksPerSecond: 0.5,
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
  attacksPerSecond: 1,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 0.45,
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
  // Rot magic: the Rotwood brings a first Void threat before the Ember Wastes.
  damageType: "void",
  attacksPerSecond: 0.55,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 1,
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
  attacksPerSecond: 0.45,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 0.55,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
};

// Boss blades hit Physical (half as hard, Armor is weaker than Resistance), the boss's
// spells bring the element: every boss mixes (Timo).
export const TYRANT_BRAND: WeaponDefinition = {
  id: "tyrant-brand",
  name: "Tyrant's Brand",
  defaultAttack: "Brand",
  damage: { min: 1.21, max: 1.71 },
  damageType: "physical",
  attacksPerSecond: 0.55,
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
  attacksPerSecond: 1.05,
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
  attacksPerSecond: 0.42,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 0.7,
  heatBehavior: "cooling",
  heatPerHit: 17,
  range: "melee",
  implicit: {},
};

// Physical blade, elemental spells (see Tyrant's Brand).
export const WARDEN_HALBERD: WeaponDefinition = {
  id: "warden-halberd",
  name: "Warden's Halberd",
  defaultAttack: "Sweep",
  damage: { min: 1.32, max: 1.84 },
  damageType: "physical",
  attacksPerSecond: 0.5,
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
  attacksPerSecond: 1.05,
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
  attacksPerSecond: 0.45,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 0.55,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
};

// Physical blade, elemental spells (see Tyrant's Brand).
export const HERALD_SPEAR: WeaponDefinition = {
  id: "herald-spear",
  name: "Herald's Spear",
  defaultAttack: "Lance",
  damage: { min: 1.17, max: 1.67 },
  damageType: "physical",
  attacksPerSecond: 0.55,
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
  attacksPerSecond: 1.05,
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
  attacksPerSecond: 0.45,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 0.75,
  heatBehavior: "warming",
  heatPerHit: 0,
  range: "ranged",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 0.35 }],
};

// Physical blade, elemental spells (see Tyrant's Brand).
export const MAW_JAWS: WeaponDefinition = {
  id: "maw-jaws",
  name: "Maw",
  defaultAttack: "Bite",
  damage: { min: 1.25, max: 1.8 },
  damageType: "physical",
  attacksPerSecond: 0.55,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [{ ailment: "corruption", chance: 1 }],
};

// Act 7 (Emberfall) enemy weapons: everything at once.

// Emberfall gets as much magic as Physical threat: the Revenant and the Hound hit Physical, the
// Wraith and the Knight Fire. Step 7: the Revenant hit Fire too, so three of four Act 7 foes went
// past Armor straight into the hero's Fire Resistance (−60 % Ember Penalty in run 7).
export const REVENANT_BLADE: WeaponDefinition = {
  id: "revenant-blade",
  name: "Revenant Blade",
  defaultAttack: "Cleave",
  damage: { min: 1.67, max: 2.46 },
  damageType: "physical",
  attacksPerSecond: 0.5,
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
  attacksPerSecond: 0.6,
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
  attacksPerSecond: 1.05,
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
  attacksPerSecond: 0.7,
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
  // Was 2.95-4.15: the Harvester's Physical share is smaller now (see SOUL_REAP).
  damage: { min: 1.9, max: 2.7 },
  damageType: "physical",
  attacksPerSecond: 0.55,
  heatBehavior: "cooling",
  heatPerHit: 22,
  range: "melee",
  implicit: {},
  ailmentChances: [
    { ailment: "bleed", chance: 0.25 },
    { ailment: "poison", chance: 0.25 },
  ],
};
