import type { ActData, GameData } from "@emberheir/sim";
import { ELITE_MODIFIERS } from "./elites";
import { ACT1_ENEMIES, GORRAK } from "./enemies";
import { STARTING_ATTRIBUTES } from "./heroes";
import { ITEM_BASES, ITEM_CATALOG, POC_EQUIPMENT_SLOTS } from "./items";
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

/** Everything the game loop in `@emberheir/sim` needs for the PoC. */
export const POC_GAME_DATA: GameData = {
  items: ITEM_CATALOG,
  lootBases: ITEM_BASES.map((b) => b.id),
  equipmentSlots: POC_EQUIPMENT_SLOTS,
  starterWeapons: ["sword", "fire-wand"],
  startSkills: START_SKILLS,
  skillTree: SKILL_TREE,
  acts: [ACT1],
  eliteModifiers: ELITE_MODIFIERS,
  startingAttributes: STARTING_ATTRIBUTES,
};
