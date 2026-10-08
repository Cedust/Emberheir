import { TEST_SKILL, TEST_WEAPON, ZERO_ATTRIBUTES } from "../combat/test-fixtures";
import type { EnemyDefinition } from "../combat/monsters";
import type { SkillDefinition } from "../combat/types";
import { TEST_CATALOG } from "../items/test-fixtures";
import type { BoonDefinition, BoonFamilyDefinition } from "./boons";
import type { HeroClass } from "./classes";
import type { ActData, GameData } from "./game";
import type { SkillTreeDefinition } from "./skill-tree";
import type { EchoDefinition, MasteryNode, WeaponMasteryTree } from "./weapon-mastery";

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
  stages: 3,
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

const node = (n: Partial<MasteryNode> & Pick<MasteryNode, "id" | "kind">): MasteryNode => ({
  name: n.id,
  description: "",
  effect: {},
  x: 0,
  y: 0,
  ...n,
});

/**
 * refine (+5 % Precision, 3 ranks) → p1 (+10 Life) → p2 (notable); Heat Forms (Steady default,
 * Cooling); one Innate Form; two Keystones.
 */
export const TEST_MASTERY: WeaponMasteryTree = {
  weaponId: "test-sword",
  precision: 0.7,
  rangeMin: 0.4,
  rangeMax: 1.1,
  paths: [{ id: "edge", name: "Edge", theme: "", color: 0xffffff }],
  nodes: [
    node({ id: "refine", kind: "refine", maxRanks: 3, effect: { precision: 0.05 } }),
    node({ id: "swing", kind: "refine", maxRanks: 3, effect: { rangeMax: 0.1 } }),
    node({ id: "grip", kind: "refine", maxRanks: 3, effect: { rangeMin: 0.05 } }),
    node({
      id: "p1",
      kind: "minor",
      path: "edge",
      requiresRefine: true,
      effect: { bonuses: { life: 10 } },
    }),
    node({
      id: "p2",
      kind: "notable",
      path: "edge",
      links: ["p1"],
      effect: { weaponRules: { glancingDamage: 0.25 } },
    }),
    node({
      id: "steady",
      kind: "heatForm",
      group: "heatForm",
      default: true,
      effect: { heatForm: "steady" },
    }),
    node({
      id: "cooling",
      kind: "heatForm",
      group: "heatForm",
      effect: { heatForm: "cooling", heatPerHit: 1.25 },
    }),
    node({
      id: "form",
      kind: "innateForm",
      group: "innateForm",
      effect: { innate: { ...TEST_SKILL, id: "form-skill", name: "Form" } },
    }),
    node({
      id: "ks1",
      kind: "keystone",
      group: "keystone",
      form: "Test Blade",
      effect: { weaponRules: { noGlancing: true } },
    }),
    node({ id: "ks2", kind: "keystone", group: "keystone", form: "Other Blade", effect: {} }),
  ],
};

export const TEST_ECHO: EchoDefinition = {
  id: "test-echo",
  name: "Test Echo",
  actId: "test-act",
  color: 0xffffff,
  description: (stage) => `+${stage * 10} Life`,
  effect: (stage) => ({ bonuses: { life: stage * 10 } }),
};

const TEST_ATTRIBUTES = { ...ZERO_ATTRIBUTES, strength: 6, vitality: 6 };

/** A melee class with the test sword and a caster with the test wand; no off hands. */
export const TEST_CLASSES: readonly HeroClass[] = [
  {
    id: "test-fighter",
    name: "Fighter",
    weapons: ["test-sword"],
    startingAttributes: TEST_ATTRIBUTES,
    trait: { name: "Tough", description: "" },
    branches: ["test-branch"],
    titles: { "test-branch": "Champion" },
    text: "",
  },
  {
    id: "test-caster",
    name: "Caster",
    weapons: ["test-wand"],
    startingAttributes: TEST_ATTRIBUTES,
    trait: { name: "Spark", description: "" },
    branches: [],
    titles: {},
    text: "",
  },
];

export const TEST_GAME_DATA: GameData = {
  items: TEST_CATALOG,
  lootBases: ["test-shield", "test-ring"],
  equipmentSlots: ["offHand", "ring1"],
  classes: TEST_CLASSES,
  branchEpithets: { "test-branch": "of Tests", "other-branch": "of Others" },
  startSkills: { "test-blade": SWORD_SKILL },
  weaponMastery: {
    "test-sword": TEST_MASTERY,
    "test-wand": { ...TEST_MASTERY, weaponId: "test-wand" },
  },
  echoes: [TEST_ECHO],
  skillTree: TEST_TREE,
  acts: [TEST_ACT, DEADLY_ACT, FINAL_ACT],
  eliteModifiers: [
    { id: "tough", name: "Tough", description: "", bonuses: { armor: 5 } },
    { id: "fast", name: "Fast", description: "", bonuses: { attackSpeed: 0.5 } },
  ],
  startingAttributes: TEST_ATTRIBUTES,
};

export const TEST_BOON_FAMILIES: readonly BoonFamilyDefinition[] = [
  { id: "hearth", name: "Hearth", damageTypes: [], color: "#c9a063" },
  { id: "ash", name: "Ash", warden: "Boss", damageTypes: ["physical"], color: "#9a8f80" },
  { id: "cinder", name: "Cinder", warden: "Killer", damageTypes: ["fire"], color: "#e0502a" },
];

export const TEST_BOONS: readonly BoonDefinition[] = [
  {
    id: "banked-coals",
    name: "Banked Coals",
    family: "hearth",
    slot: "heat",
    text: "Start every fight with # Heat",
    value: 30,
    bonuses: { startingHeat: 30 },
  },
  {
    id: "grit",
    name: "Grit",
    family: "ash",
    slot: "passive",
    text: "+# Armor",
    value: 10,
    bonuses: { armor: 10 },
  },
  {
    id: "crushing-blow",
    name: "Crushing Blow",
    family: "ash",
    slot: "strike",
    text: "Every 4th attack strikes for # % weapon damage",
    value: 100,
    trigger: {
      name: "Crushing Blow",
      condition: { kind: "everyNthAttack", n: 4 },
      effect: { kind: "weaponHit", multiplier: 1 },
    },
  },
  {
    id: "kindled-strikes",
    name: "Kindled Strikes",
    family: "cinder",
    slot: "strike",
    text: "+# % Chance to Burn",
    value: 20,
    bonuses: { burnChance: 0.2 },
  },
  {
    id: "second-wind",
    name: "Second Wind",
    family: "hearth",
    slot: "reaction",
    text: "Below 35 % Life: heal # % Life once",
    value: 15,
    trigger: {
      name: "Second Wind",
      condition: { kind: "lifeBelow", threshold: 0.35 },
      oncePerFight: true,
      effect: { kind: "heal", fraction: 0.15 },
    },
  },
  {
    id: "iron-hearth",
    name: "Iron Hearth",
    family: "ash",
    slot: "passive",
    text: "Skills cost # % less Heat",
    value: 10,
    rules: { skillCostMultiplier: 0.9 },
    fusion: ["ash", "hearth"],
  },
];

/** Test data with Shrines: Ash opens in the first act, Cinder in the second. */
export const TEST_BOON_DATA: GameData = {
  ...TEST_GAME_DATA,
  acts: [{ ...TEST_ACT, boonFamily: "ash" }, { ...DEADLY_ACT, boonFamily: "cinder" }, FINAL_ACT],
  boons: TEST_BOONS,
  boonFamilies: TEST_BOON_FAMILIES,
};
