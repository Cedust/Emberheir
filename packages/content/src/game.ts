import { BOON_FAMILIES, BOONS_CONTENT } from "./boons";
import { type ActData, EQUIPMENT_SLOTS, type GameData } from "@emberheir/sim";
import { STAGES_PER_ACT } from "./acts";
import { BOUNTIES } from "./bounties";
import { BOSS_ABILITIES, ELITE_MODIFIERS } from "./elites";
import {
  ACT1_ENEMIES,
  ACT2_ENEMIES,
  ACT3_ENEMIES,
  ACT4_ENEMIES,
  ACT5_ENEMIES,
  ACT6_ENEMIES,
  ACT7_ENEMIES,
  ASHEN_HARVESTER,
  HARVESTER_CORE,
  CINDER_TYRANT,
  GORRAK,
  MOTHER_OF_ROT,
  RIME_WARDEN,
  STORM_HERALD,
  VOIDBORN_MAW,
  EMBER_THIEF,
} from "./enemies";
import { STARTING_ATTRIBUTES } from "./heroes";
import { ITEM_BASES, ITEM_CATALOG } from "./items";
import { SKILL_TREE } from "./skill-tree";
import { START_SKILLS } from "./skills";
import { BRANCH_EPITHETS, CLASSES } from "./classes";
import { ECHOES, WEAPON_MASTERY } from "./weapon-mastery";

/**
 * Act 1 (game-design-document-v1.md section 11): 15 stages, Gorrak at the end, Ember Shrines
 * after stage 5 and 10. Monster Levels come from the run's level band (prestige-acts-v1.md section 4).
 */
export const ACT1: ActData = {
  id: "ashen-fields",
  number: 1,
  name: "Ashen Fields",
  stages: STAGES_PER_ACT,
  enemies: ACT1_ENEMIES,
  boss: GORRAK,
  boonFamily: "ash",
  shrineStages: [5, 10],
};

/** Act 2: Rotwood, Bleed and Poison. Opens with the first Prestige. */
export const ACT2: ActData = {
  id: "rotwood",
  number: 2,
  name: "Rotwood",
  stages: STAGES_PER_ACT,
  enemies: ACT2_ENEMIES,
  boss: MOTHER_OF_ROT,
  boonFamily: "rot",
  runesmith: true,
  shrineStages: [5, 10],
  favoredAffixes: { tenacity: 3, "poison-chance": 1.5 },
};

/**
 * Act 3: the Ember Wastes, Fire and Burn. Opens with the second Prestige; the act's loot favors
 * Fire Resistance (gegner-bosse-v1.md section 9).
 */
export const ACT3: ActData = {
  id: "ember-wastes",
  number: 3,
  name: "Ember Wastes",
  stages: STAGES_PER_ACT,
  enemies: ACT3_ENEMIES,
  boss: CINDER_TYRANT,
  boonFamily: "cinder",
  shrineStages: [5, 10],
  favoredAffixes: { "fire-resistance": 4, "burn-chance": 1.5 },
};

/** Act 4: the Frost Peaks, Cold and Chill. Opens with the third Prestige; loot favors Cold Resistance. */
export const ACT4: ActData = {
  id: "frost-peaks",
  number: 4,
  name: "Frost Peaks",
  stages: STAGES_PER_ACT,
  enemies: ACT4_ENEMIES,
  boss: RIME_WARDEN,
  boonFamily: "rime",
  shrineStages: [5, 10],
  favoredAffixes: { "cold-resistance": 4, "heat-gain": 1.5 },
};

/** Act 5: the Storm Spires, Lightning and Shock. Opens with the fourth Prestige. */
export const ACT5: ActData = {
  id: "storm-spires",
  number: 5,
  name: "Storm Spires",
  stages: STAGES_PER_ACT,
  enemies: ACT5_ENEMIES,
  boss: STORM_HERALD,
  boonFamily: "storm",
  shrineStages: [5, 10],
  favoredAffixes: { "lightning-resistance": 4, tenacity: 1.5 },
};

/** Act 6: the Void Rift, Void and Corruption. Opens with the fifth Prestige. */
export const ACT6: ActData = {
  id: "void-rift",
  number: 6,
  name: "Void Rift",
  stages: STAGES_PER_ACT,
  enemies: ACT6_ENEMIES,
  boss: VOIDBORN_MAW,
  boonFamily: "void",
  shrineStages: [5, 10],
  favoredAffixes: { "void-resistance": 4, "corruption-chance": 1.5 },
};

/**
 * Act 7: Emberfall, the end of the world (stages 91–100). Only 10 stages, then The Ashen
 * Harvester. Opens with the sixth Prestige; from then on every run ends with the Harvester.
 */
export const ACT7: ActData = {
  id: "emberfall",
  number: 7,
  name: "Emberfall",
  stages: 10,
  enemies: ACT7_ENEMIES,
  boss: ASHEN_HARVESTER,
  shrineStages: [4, 7],
  favoredAffixes: { "all-resistance": 2, life: 1.5 },
};

/**
 * The Last Ember (M11): after the final Prestige, a gauntlet of the six Warden echoes and the
 * Harvester's Core. Stages 1–6 are the echoes (picked by the sim), stage 7 is the Core.
 */
export const LAST_EMBER: ActData = {
  id: "last-ember",
  number: 8,
  name: "The Last Ember",
  stages: 7,
  enemies: [],
  boss: HARVESTER_CORE,
  shrineStages: [],
};

/** Everything the game loop in `@emberheir/sim` needs. */
export const GAME_DATA: GameData = {
  items: ITEM_CATALOG,
  // Weapons never drop: the hero's weapon is Weapon Mastery (waffe-als-system-v1.md).
  lootBases: ITEM_BASES.filter((b) => !b.weapon).map((b) => b.id),
  equipmentSlots: EQUIPMENT_SLOTS,
  classes: CLASSES,
  branchEpithets: BRANCH_EPITHETS,
  startSkills: START_SKILLS,
  weaponMastery: WEAPON_MASTERY,
  echoes: ECHOES,
  skillTree: SKILL_TREE,
  acts: [ACT1, ACT2, ACT3, ACT4, ACT5, ACT6, ACT7],
  eliteModifiers: ELITE_MODIFIERS,
  bossAbilities: BOSS_ABILITIES,
  startingAttributes: STARTING_ATTRIBUTES,
  boons: BOONS_CONTENT,
  bounties: BOUNTIES,
  thief: EMBER_THIEF,
  finale: LAST_EMBER,
  boonFamilies: BOON_FAMILIES,
};
