import { type ActData, EQUIPMENT_SLOTS, type GameData } from "@emberheir/sim";
import { ELITE_MODIFIERS } from "./elites";
import { ACT1_ENEMIES, ACT2_ENEMIES, GORRAK, MOTHER_OF_ROT } from "./enemies";
import { STARTING_ATTRIBUTES } from "./heroes";
import { ITEM_BASES, ITEM_CATALOG } from "./items";
import { SKILL_TREE } from "./skill-tree";
import { START_SKILLS } from "./skills";

/**
 * Act 1 for the run (game-design-document-v1.md section 11): 15 stages, Monster Level 1–3 in the
 * first run, Gorrak one level above the last stage. Spoils after stage 5 and 10.
 */
export const ACT1: ActData = {
  id: "ashen-fields",
  number: 1,
  name: "Ashen Fields",
  monsterLevels: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4],
  enemies: ACT1_ENEMIES,
  boss: GORRAK,
  spoilsStages: [5, 10],
  essence: { id: "ash-essence", name: "Ash Essence", affixId: "all-resistance" },
};

/**
 * Act 2 for the run: Rotwood, Bleed and Poison. Its Monster Levels pick up where Act 1 ends
 * (the run's level band, gegner-bosse-v1.md section 7), the Mother of Rot one level above.
 */
export const ACT2: ActData = {
  id: "rotwood",
  number: 2,
  name: "Rotwood",
  monsterLevels: [5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 10],
  enemies: ACT2_ENEMIES,
  boss: MOTHER_OF_ROT,
  spoilsStages: [5, 10],
  essence: { id: "rot-essence", name: "Rot Essence", affixId: "tenacity" },
};

/** Everything the game loop in `@emberheir/sim` needs. */
export const GAME_DATA: GameData = {
  items: ITEM_CATALOG,
  lootBases: ITEM_BASES.map((b) => b.id),
  equipmentSlots: EQUIPMENT_SLOTS,
  starterWeapons: ["sword", "fire-wand"],
  startSkills: START_SKILLS,
  skillTree: SKILL_TREE,
  acts: [ACT1, ACT2],
  eliteModifiers: ELITE_MODIFIERS,
  startingAttributes: STARTING_ATTRIBUTES,
};
