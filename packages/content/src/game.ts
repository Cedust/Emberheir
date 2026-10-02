import { type ActData, EQUIPMENT_SLOTS, type GameData } from "@emberheir/sim";
import { STAGES_PER_ACT } from "./acts";
import { ELITE_MODIFIERS } from "./elites";
import { ACT1_ENEMIES, ACT2_ENEMIES, GORRAK, MOTHER_OF_ROT } from "./enemies";
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
