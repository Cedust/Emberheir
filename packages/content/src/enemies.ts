import type { EnemyDefinition } from "@emberheir/sim";
import {
  AVALANCHE,
  BLIGHT_SPIT,
  CINDER_SPIT,
  DEVOUR,
  ERUPTION,
  FIREBALL,
  FLAME_DASH,
  GLACIAL_MEND,
  GORRAK_SLAM,
  HEAVY_SWING,
  ICE_BOLT,
  MOSS_MEND,
  OBSIDIAN_SHELL,
  POUNCE,
  QUICK_CUTS,
  RAKE,
  ROT_SPRAY,
} from "./skills";
import {
  BRANCH_FLAIL,
  CINDER_ROD,
  EMBER_CLAWS,
  FROST_FANGS,
  GLACIER_MAUL,
  ICE_SHARDS,
  MAGMA_FIST,
  OBSIDIAN_GLAIVE,
  PIT_MAUL,
  PYRE_STAFF,
  RIME_WAND,
  ROT_LASH,
  RUSTY_CLEAVER,
  SPORE_SAC,
  THORN_CLAWS,
  TWIN_SHIVS,
  TYRANT_BRAND,
  WARDEN_HALBERD,
  WARDEN_STAFF,
} from "./weapons";

/**
 * Act 1 (Ashen Fields) enemies, one per PoC archetype (docs/design/gegner-bosse-v1.md
 * section 3). Values are for Monster Level 1. Playtest 1: life −36 % for the rarer Act 1 loot.
 */
export const ASHEN_BRUTE: EnemyDefinition = {
  id: "ashen-brute",
  name: "Ashen Brute",
  archetype: "brute",
  description: "Lots of Life and Armor, slow and heavy hits.",
  attributes: { strength: 8, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 10 },
  weapon: RUSTY_CLEAVER,
  skills: [HEAVY_SWING],
  baseLife: 344,
};

export const ASHEN_SKIRMISHER: EnemyDefinition = {
  id: "ashen-skirmisher",
  name: "Ashen Skirmisher",
  archetype: "skirmisher",
  description: "Fast and hard to hit.",
  attributes: { strength: 4, dexterity: 8, agility: 15, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: TWIN_SHIVS,
  skills: [QUICK_CUTS],
  baseLife: 289,
  bonuses: { evasion: 0.12 },
};

export const CINDER_CASTER: EnemyDefinition = {
  id: "cinder-caster",
  name: "Cinder Caster",
  archetype: "caster",
  description: "Fire damage and Burn, but little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 10, wisdom: 6, vitality: 4 },
  weapon: CINDER_ROD,
  skills: [CINDER_SPIT],
  baseLife: 268,
};

export const ACT1_ENEMIES: readonly EnemyDefinition[] = [
  ASHEN_BRUTE,
  ASHEN_SKIRMISHER,
  CINDER_CASTER,
];

/**
 * Act 1 boss (docs/design/gegner-bosse-v1.md section 6): a slow brute whose Slam is announced
 * every 10 s. It teaches Telegraphs and defensive play.
 */
export const GORRAK: EnemyDefinition = {
  id: "gorrak",
  name: "Gorrak, the Pit Brute",
  archetype: "brute",
  description: "Announces a crushing Slam every 10 seconds.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 14 },
  weapon: PIT_MAUL,
  skills: [HEAVY_SWING],
  baseLife: 332,
  boss: true,
  telegraphs: [{ skill: GORRAK_SLAM, interval: 10, windup: 2 }],
};

/**
 * Act 2 (Rotwood) enemies: Bleed and Poison (docs/design/gegner-bosse-v1.md sections 1 and 3).
 * Four archetypes, each asks a new question: Tenacity, big hits against Thorns, Burn against
 * healing. Values are for Monster Level 1 like Act 1.
 */
export const ROTWOOD_STALKER: EnemyDefinition = {
  id: "rotwood-stalker",
  name: "Rotwood Stalker",
  archetype: "skirmisher",
  description: "Fast claws that open bleeding wounds.",
  attributes: { strength: 4, dexterity: 8, agility: 14, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: THORN_CLAWS,
  skills: [RAKE],
  baseLife: 240,
  bonuses: { evasion: 0.1 },
};

export const BLIGHT_SPITTER: EnemyDefinition = {
  id: "blight-spitter",
  name: "Blight Spitter",
  archetype: "afflicter",
  description: "Piles Poison on you from afar.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 6, wisdom: 8, vitality: 4 },
  weapon: SPORE_SAC,
  skills: [BLIGHT_SPIT],
  baseLife: 215,
};

export const BARKHIDE: EnemyDefinition = {
  id: "barkhide",
  name: "Barkhide",
  archetype: "thornback",
  description: "Thorny bark hurts every hand that strikes it.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 10 },
  weapon: BRANCH_FLAIL,
  skills: [HEAVY_SWING],
  baseLife: 290,
  bonuses: { armor: 15, thorns: 1 },
};

export const MOSSBOUND_WARDEN: EnemyDefinition = {
  id: "mossbound-warden",
  name: "Mossbound Warden",
  archetype: "warden",
  description: "Blocks and heals itself. Burn halves the healing.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: WARDEN_STAFF,
  skills: [MOSS_MEND],
  baseLife: 250,
  bonuses: { blockChance: 0.15, blockValue: 1 },
};

export const ACT2_ENEMIES: readonly EnemyDefinition[] = [
  ROTWOOD_STALKER,
  BLIGHT_SPITTER,
  BARKHIDE,
  MOSSBOUND_WARDEN,
];

/**
 * Act 2 boss (docs/design/gegner-bosse-v1.md section 6): piles Poison on the hero and feeds on
 * the rot every 14 s to heal. It teaches Tenacity and Anti-Heal (Burn).
 */
export const MOTHER_OF_ROT: EnemyDefinition = {
  id: "mother-of-rot",
  name: "Mother of Rot",
  archetype: "afflicter",
  description: "Piles Poison on you and feeds to heal every 14 seconds.",
  attributes: { strength: 6, dexterity: 4, agility: 2, intelligence: 6, wisdom: 8, vitality: 14 },
  weapon: ROT_LASH,
  skills: [ROT_SPRAY],
  baseLife: 300,
  boss: true,
  telegraphs: [{ skill: DEVOUR, interval: 14, windup: 2.5 }],
};

/**
 * Act 3 (Ember Wastes) enemies: Fire and Burn. Fire Resistance is the answer the act asks for.
 * Values are for Monster Level 1 like Act 1.
 */
export const CINDER_IMP: EnemyDefinition = {
  id: "cinder-imp",
  name: "Cinder Imp",
  archetype: "skirmisher",
  description: "Quick, burning claws.",
  attributes: { strength: 4, dexterity: 8, agility: 14, intelligence: 4, wisdom: 2, vitality: 6 },
  weapon: EMBER_CLAWS,
  skills: [FLAME_DASH],
  baseLife: 265,
  bonuses: { evasion: 0.1, fireResistance: 0.3 },
};

export const MAGMA_BRUTE: EnemyDefinition = {
  id: "magma-brute",
  name: "Magma Brute",
  archetype: "brute",
  description: "Molten fists, a crust like armor.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 2, wisdom: 2, vitality: 12 },
  weapon: MAGMA_FIST,
  skills: [HEAVY_SWING],
  baseLife: 360,
  bonuses: { armor: 20, fireResistance: 0.4 },
};

export const FLAME_CALLER: EnemyDefinition = {
  id: "flame-caller",
  name: "Flame Caller",
  archetype: "caster",
  description: "Hurls Fireballs from afar. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 6, vitality: 4 },
  weapon: PYRE_STAFF,
  skills: [FIREBALL],
  baseLife: 240,
  bonuses: { fireResistance: 0.3 },
};

export const OBSIDIAN_GUARD: EnemyDefinition = {
  id: "obsidian-guard",
  name: "Obsidian Guard",
  archetype: "warden",
  description: "Blocks, hardens its shell and hides behind a Barrier when hurt.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: OBSIDIAN_GLAIVE,
  skills: [OBSIDIAN_SHELL],
  baseLife: 285,
  bonuses: { blockChance: 0.15, blockValue: 1, fireResistance: 0.3 },
  triggers: [
    {
      id: "obsidian-barrier",
      name: "Obsidian Barrier",
      condition: { kind: "lifeBelow", threshold: 0.5 },
      oncePerFight: true,
      effect: { kind: "barrier", fraction: 0.15 },
    },
  ],
};

export const ACT3_ENEMIES: readonly EnemyDefinition[] = [
  CINDER_IMP,
  MAGMA_BRUTE,
  FLAME_CALLER,
  OBSIDIAN_GUARD,
];

/**
 * Act 3 boss (docs/design/gegner-bosse-v1.md section 6): a Fire Aura burns the hero all fight
 * long, an Eruption is announced every 12 s, and below 30 % Life it Enrages. It teaches Fire
 * Resistance and saving a burst for the end.
 */
export const CINDER_TYRANT: EnemyDefinition = {
  id: "cinder-tyrant",
  name: "Cinder Tyrant",
  archetype: "brute",
  description: "A Fire Aura, an Eruption every 12 seconds, and Enrage below 30 % Life.",
  attributes: { strength: 10, dexterity: 4, agility: 2, intelligence: 6, wisdom: 4, vitality: 14 },
  weapon: TYRANT_BRAND,
  skills: [FIREBALL],
  baseLife: 370,
  boss: true,
  bonuses: { fireResistance: 0.4 },
  telegraphs: [{ skill: ERUPTION, interval: 12, windup: 2 }],
  triggers: [
    {
      id: "fire-aura",
      name: "Fire Aura",
      condition: { kind: "everySeconds", seconds: 2 },
      effect: {
        kind: "spellHit",
        name: "Fire Aura",
        damage: { min: 0.6, max: 0.9 },
        damageType: "fire",
      },
    },
    {
      id: "tyrant-enrage",
      name: "Enrage",
      condition: { kind: "lifeBelow", threshold: 0.3 },
      oncePerFight: true,
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.5, duration: 999 },
    },
  ],
};

/**
 * Act 4 (Frost Peaks) enemies: Cold and Chill. Chill slows the hero's attacks and Heat, so Cold
 * Resistance, Tenacity and Heat Gain help.
 */
export const FROST_WOLF: EnemyDefinition = {
  id: "frost-wolf",
  name: "Frost Wolf",
  archetype: "skirmisher",
  description: "Fast bites that Chill.",
  attributes: { strength: 6, dexterity: 6, agility: 14, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: FROST_FANGS,
  skills: [POUNCE],
  baseLife: 290,
  bonuses: { evasion: 0.1, coldResistance: 0.3 },
};

export const ICE_GOLEM: EnemyDefinition = {
  id: "ice-golem",
  name: "Ice Golem",
  archetype: "thornback",
  description: "Jagged ice hurts every hand that strikes it.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 12 },
  weapon: GLACIER_MAUL,
  skills: [HEAVY_SWING],
  baseLife: 360,
  bonuses: { armor: 20, thorns: 1, coldResistance: 0.4 },
};

export const RIME_WITCH: EnemyDefinition = {
  id: "rime-witch",
  name: "Rime Witch",
  archetype: "caster",
  description: "Ice Bolts that always Chill. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 6, vitality: 4 },
  weapon: RIME_WAND,
  skills: [ICE_BOLT],
  baseLife: 260,
  bonuses: { coldResistance: 0.3 },
};

export const FROST_WARDEN: EnemyDefinition = {
  id: "frost-warden",
  name: "Frost Warden",
  archetype: "warden",
  description: "Blocks, heals, and raises a wall of ice every 10 seconds.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: ICE_SHARDS,
  skills: [GLACIAL_MEND],
  baseLife: 305,
  bonuses: { blockChance: 0.15, blockValue: 1, coldResistance: 0.3 },
  triggers: [
    {
      id: "ice-wall",
      name: "Ice Wall",
      condition: { kind: "everySeconds", seconds: 10 },
      effect: { kind: "barrier", fraction: 0.08 },
    },
  ],
};

export const ACT4_ENEMIES: readonly EnemyDefinition[] = [
  FROST_WOLF,
  ICE_GOLEM,
  RIME_WITCH,
  FROST_WARDEN,
];

/**
 * Act 4 boss (docs/design/gegner-bosse-v1.md section 6): Chills the hero with every swing,
 * hides behind a big Barrier at 75 / 50 / 25 % Life and brings down an Avalanche every 12 s.
 * It teaches Heat management and breaking a Barrier.
 */
export const RIME_WARDEN: EnemyDefinition = {
  id: "rime-warden",
  name: "Rime Warden",
  archetype: "warden",
  description: "Chills you, hides behind ice at 75, 50 and 25 % Life, Avalanche every 12 seconds.",
  attributes: { strength: 8, dexterity: 4, agility: 2, intelligence: 6, wisdom: 6, vitality: 14 },
  weapon: WARDEN_HALBERD,
  skills: [ICE_BOLT],
  baseLife: 385,
  boss: true,
  bonuses: { blockChance: 0.1, blockValue: 1, coldResistance: 0.4 },
  telegraphs: [{ skill: AVALANCHE, interval: 12, windup: 2.5 }],
  triggers: [0.75, 0.5, 0.25].map((threshold) => ({
    id: `ice-barrier-${threshold * 100}`,
    name: "Ice Barrier",
    condition: { kind: "lifeBelow", threshold } as const,
    oncePerFight: true,
    effect: { kind: "barrier", fraction: 0.15 } as const,
  })),
};
