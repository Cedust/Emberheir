import type { EnemyDefinition } from "@emberheir/sim";
import { CINDER_SPIT, GORRAK_SLAM, HEAVY_SWING, QUICK_CUTS } from "./skills";
import { CINDER_ROD, PIT_MAUL, RUSTY_CLEAVER, TWIN_SHIVS } from "./weapons";

/**
 * Act 1 (Ashen Fields) enemies, one per PoC archetype (docs/design/gegner-bosse-v1.md
 * section 3). Values are for Monster Level 1. Playtest 1: life −25 % for the rarer Act 1 loot.
 */
export const ASHEN_BRUTE: EnemyDefinition = {
  id: "ashen-brute",
  name: "Ashen Brute",
  archetype: "brute",
  description: "Lots of Life and Armor, slow and heavy hits.",
  attributes: { strength: 8, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 10 },
  weapon: RUSTY_CLEAVER,
  skills: [HEAVY_SWING],
  baseLife: 405,
};

export const ASHEN_SKIRMISHER: EnemyDefinition = {
  id: "ashen-skirmisher",
  name: "Ashen Skirmisher",
  archetype: "skirmisher",
  description: "Fast and hard to hit.",
  attributes: { strength: 4, dexterity: 8, agility: 15, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: TWIN_SHIVS,
  skills: [QUICK_CUTS],
  baseLife: 340,
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
  baseLife: 315,
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
  baseLife: 390,
  boss: true,
  telegraphs: [{ skill: GORRAK_SLAM, interval: 10, windup: 2 }],
};
