import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES } from "../combat/test-fixtures";
import type { EnemyDefinition } from "../combat/monsters";
import type { SkillDefinition } from "../combat/types";
import { TEST_CATALOG } from "../items/test-fixtures";
import type { ActData, GameData } from "./game";
import type { SkillTreeDefinition } from "./skill-tree";

/** Small game data for unit tests. Not exported from the package. */

export const WEAK_ENEMY: EnemyDefinition = {
  id: "weakling",
  name: "Weakling",
  archetype: "brute",
  description: "",
  attributes: ZERO_ATTRIBUTES,
  weapon: { ...TEST_WEAPON, id: "stick", damage: { min: 1, max: 1 }, attacksPerSecond: 0.5 },
  skills: [],
  baseLife: 15,
};

export const DEADLY_ENEMY: EnemyDefinition = {
  ...WEAK_ENEMY,
  id: "killer",
  name: "Killer",
  weapon: { ...TEST_WEAPON, id: "axe", damage: { min: 500, max: 500 }, attacksPerSecond: 2 },
  baseLife: 100_000,
};

export const TEST_BOSS: EnemyDefinition = { ...WEAK_ENEMY, id: "boss", name: "Boss", boss: true };

export const TEST_ACT: ActData = {
  id: "test-act",
  number: 1,
  name: "Test Act",
  monsterLevels: [1, 1, 2],
  enemies: [WEAK_ENEMY],
  boss: TEST_BOSS,
  spoilsStages: [2],
  essence: { id: "test-essence", name: "Test Essence", affixId: "life" },
};

export const DEADLY_ACT: ActData = {
  ...TEST_ACT,
  id: "deadly-act",
  number: 2,
  enemies: [DEADLY_ENEMY],
  runesmith: true,
};

/** The last act of the test run: its boss starts the Prestige. */
export const FINAL_ACT: ActData = { ...TEST_ACT, id: "final-act", number: 3 };

export const SWORD_SKILL: SkillDefinition = { ...TEST_SKILL, id: "sword-skill", name: "Cut" };
export const TREE_SKILL: SkillDefinition = { ...TEST_SKILL, id: "tree-skill", name: "Bash" };

/** start → a (+life) → b (skill, 3 ranks) → k (keystone); start → r (ranged only). */
export const TEST_TREE: SkillTreeDefinition = {
  startNodeId: "start",
  nodes: [
    {
      id: "start",
      name: "Start",
      branch: "core",
      kind: "minor",
      description: "",
      links: ["a", "r"],
      x: 0,
      y: 0,
      bonuses: { life: 5 },
    },
    {
      id: "a",
      name: "A",
      branch: "might",
      kind: "minor",
      description: "",
      links: ["b"],
      x: 1,
      y: 0,
      bonuses: { life: 10 },
    },
    {
      id: "b",
      name: "B",
      branch: "might",
      kind: "skill",
      description: "",
      links: ["k"],
      x: 2,
      y: 0,
      maxRanks: 3,
      skill: TREE_SKILL,
    },
    {
      id: "k",
      name: "K",
      branch: "might",
      kind: "keystone",
      description: "",
      links: [],
      x: 3,
      y: 0,
      keystone: { damageTaken: 0.2, noHeatDecay: true },
    },
    {
      id: "r",
      name: "R",
      branch: "arcana",
      kind: "notable",
      description: "",
      links: [],
      x: -1,
      y: 0,
      weaponRange: "ranged",
      bonuses: { elementalDamage: 0.5 },
    },
  ],
};

export const TEST_GAME_DATA: GameData = {
  items: TEST_CATALOG,
  lootBases: ["test-sword", "test-shield", "test-ring"],
  equipmentSlots: ["mainHand", "offHand", "ring1"],
  starterWeapons: ["test-sword", "test-wand"],
  startSkills: { "test-blade": SWORD_SKILL },
  skillTree: TEST_TREE,
  acts: [TEST_ACT, DEADLY_ACT, FINAL_ACT],
  eliteModifiers: [
    { id: "tough", name: "Tough", description: "", bonuses: { armor: 5 } },
    { id: "fast", name: "Fast", description: "", bonuses: { attackSpeed: 0.5 } },
  ],
  startingAttributes: { ...ZERO_ATTRIBUTES, strength: 6, vitality: 6 },
};
