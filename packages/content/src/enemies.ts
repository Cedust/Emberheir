import type { EnemyDefinition } from "@emberheir/sim";
import {
  BLIGHT_SPIT,
  CINDER_SPIT,
  DEVOUR,
  GORRAK_SLAM,
  HEAVY_SWING,
  MOSS_MEND,
  QUICK_CUTS,
  RAKE,
  ROT_SPRAY,
} from "./skills";
import {
  BRANCH_FLAIL,
  CINDER_ROD,
  PIT_MAUL,
  ROT_LASH,
  RUSTY_CLEAVER,
  SPORE_SAC,
  THORN_CLAWS,
  TWIN_SHIVS,
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
