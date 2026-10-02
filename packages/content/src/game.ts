import { type ActData, EQUIPMENT_SLOTS, type GameData } from "@emberheir/sim";
import { STAGES_PER_ACT } from "./acts";
import { ELITE_MODIFIERS } from "./elites";
import {
  ACT1_ENEMIES,
  ACT2_ENEMIES,
  ACT3_ENEMIES,
  ACT4_ENEMIES,
  CINDER_TYRANT,
  GORRAK,
  MOTHER_OF_ROT,
  RIME_WARDEN,
} from "./enemies";
import { STARTING_ATTRIBUTES } from "./heroes";
import { ITEM_BASES, ITEM_CATALOG } from "./items";
import { SKILL_TREE } from "./skill-tree";
import { START_SKILLS } from "./skills";

/**
 * Act 1 (game-design-document-v1.md section 11): 15 stages, Gorrak at the end, Spoils after stage
 * 5 and 10. Monster Levels come from the run's level band (prestige-acts-v1.md section 4).
 */
export const ACT1: ActData = {
  id: "ashen-fields",
  number: 1,
  name: "Ashen Fields",
  stages: STAGES_PER_ACT,
  enemies: ACT1_ENEMIES,
  boss: GORRAK,
  spoilsStages: [5, 10],
  essence: { id: "ash-essence", name: "Ash Essence", affixId: "all-resistance" },
};

/** Act 2: Rotwood, Bleed and Poison. Opens with the first Prestige. */
export const ACT2: ActData = {
  id: "rotwood",
  number: 2,
  name: "Rotwood",
  stages: STAGES_PER_ACT,
  enemies: ACT2_ENEMIES,
  boss: MOTHER_OF_ROT,
  runesmith: true,
  spoilsStages: [5, 10],
  essence: { id: "rot-essence", name: "Rot Essence", affixId: "tenacity" },
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
  spoilsStages: [5, 10],
  essence: { id: "cinder-essence", name: "Cinder Essence", affixId: "fire-resistance" },
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
  spoilsStages: [5, 10],
  essence: { id: "frost-essence", name: "Frost Essence", affixId: "cold-resistance" },
  favoredAffixes: { "cold-resistance": 4, "heat-gain": 1.5 },
};

/** Everything the game loop in `@emberheir/sim` needs. */
export const GAME_DATA: GameData = {
  items: ITEM_CATALOG,
  lootBases: ITEM_BASES.map((b) => b.id),
  equipmentSlots: EQUIPMENT_SLOTS,
  starterWeapons: ["sword", "fire-wand"],
  startSkills: START_SKILLS,
  skillTree: SKILL_TREE,
  acts: [ACT1, ACT2, ACT3, ACT4],
  eliteModifiers: ELITE_MODIFIERS,
  startingAttributes: STARTING_ATTRIBUTES,
};
