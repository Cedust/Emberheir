import { TEST_WEAPON } from "../combat/test-fixtures";
import { createItemCatalog } from "./generate";
import type {
  AffixDefinition,
  ItemBaseDefinition,
  LegendaryPowerDefinition,
  RuneDefinition,
  RunewordDefinition,
  TriggerConditionPart,
  TriggerEffectPart,
  UniqueDefinition,
} from "./types";

/** Small item catalog for unit tests. Not exported from the package. */

export const TEST_SWORD: ItemBaseDefinition = {
  id: "test-sword",
  name: "Test Sword",
  slot: "mainHand",
  weapon: { ...TEST_WEAPON, range: "melee", implicit: { evasion: 0.05 } },
  requirements: { strength: 5 },
  affixWeights: { elemental: 0 },
};

export const TEST_WAND: ItemBaseDefinition = {
  id: "test-wand",
  name: "Test Wand",
  slot: "mainHand",
  weapon: { ...TEST_WEAPON, id: "test-wand", range: "ranged", damageType: "fire" },
};

export const TEST_SHIELD: ItemBaseDefinition = {
  id: "test-shield",
  name: "Test Shield",
  slot: "offHand",
  fitsWeaponRange: "melee",
  baseStats: { armor: 10, blockChance: 0.2, blockValue: 3 },
  requirements: { strength: 8 },
  maxSockets: 2,
};

/** A weapon with Sockets for Runeword tests. */
export const TEST_AXE: ItemBaseDefinition = {
  id: "test-axe",
  name: "Test Axe",
  slot: "mainHand",
  weapon: { ...TEST_WEAPON, id: "test-axe", range: "melee" },
  maxSockets: 2,
};

export const TEST_RUNES: readonly RuneDefinition[] = [
  {
    id: "ash",
    name: "Ash",
    rank: 1,
    bonuses: { weapon: { physicalDamage: 0.1 }, armor: { armor: 5 } },
  },
  {
    id: "moss",
    name: "Moss",
    rank: 2,
    bonuses: { weapon: { lifesteal: 0.02 }, armor: { life: 10 } },
  },
  {
    id: "thorn",
    name: "Thorn",
    rank: 3,
    bonuses: { weapon: { bleedChance: 0.1 }, armor: { thorns: 2 } },
  },
];

export const TEST_RUNEWORDS: readonly RunewordDefinition[] = [
  {
    id: "splinter",
    name: "Splinter",
    runes: ["ash", "thorn"],
    slots: ["mainHand"],
    bonuses: { attackSpeed: 0.2 },
    attributes: { strength: 3 },
    triggers: [{ affixId: "searing-crit", quality: 1 }],
    rules: { critsApplyBleed: true },
  },
  {
    id: "bulwark",
    name: "Bulwark",
    runes: ["moss", "ash"],
    slots: ["offHand"],
    bonuses: { life: 30 },
  },
];

export const TEST_POWERS: readonly LegendaryPowerDefinition[] = [
  {
    id: "echo",
    name: "Echo",
    description: "Your Bleed also Poisons.",
    slots: ["ring", "mainHand"],
    rules: { ailmentEcho: [{ from: "bleed", to: "poison" }] },
    bonuses: { life: 7 },
  },
];

export const TEST_UNIQUES: readonly UniqueDefinition[] = [
  {
    id: "band",
    name: "The Test Band",
    baseId: "test-ring",
    affixes: [
      { affixId: "life", quality: { min: 0.5, max: 0.5 } },
      { affixId: "crit", quality: { min: 0.8, max: 1 } },
    ],
    powerId: "echo",
    minItemLevel: 1,
    flavor: "Round.",
  },
];

export const TEST_RING: ItemBaseDefinition = {
  id: "test-ring",
  name: "Test Ring",
  slot: "ring",
  implicit: { critChance: 0.01 },
};

export const TEST_AFFIXES: readonly AffixDefinition[] = [
  {
    kind: "stat",
    id: "strength",
    stat: "strength",
    suffix: "of the Ox",
    slots: ["mainHand", "offHand", "ring"],
    weight: 10,
    tags: ["attribute"],
    value: { min: 1, max: 5 },
    perTier: 1,
  },
  {
    kind: "stat",
    id: "life",
    stat: "life",
    suffix: "of Vigor",
    slots: ["offHand", "ring"],
    weight: 10,
    tags: ["life"],
    value: { min: 10, max: 20 },
    perTier: 1,
  },
  {
    kind: "stat",
    id: "crit",
    stat: "critChance",
    suffix: "of Precision",
    slots: ["mainHand", "ring"],
    weight: 10,
    tags: ["crit"],
    value: { min: 0.02, max: 0.04 },
    perTier: 0.5,
  },
  {
    kind: "stat",
    id: "elemental",
    stat: "elementalDamage",
    prefix: "Arcane",
    slots: ["mainHand", "ring"],
    weight: 10,
    tags: ["elemental"],
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
  },
  {
    kind: "stat",
    id: "added",
    stat: "addedWeaponDamage",
    prefix: "Jagged",
    slots: ["mainHand"],
    weight: 10,
    tags: [],
    value: { min: 2, max: 6 },
    perTier: 1,
  },
  {
    kind: "trigger",
    id: "second-wind",
    name: "Second Wind",
    slots: ["ring", "offHand"],
    weight: 10,
    tags: ["life"],
    condition: { kind: "lifeBelow", threshold: 0.35 },
    oncePerFight: true,
    effect: { kind: "heal" },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0,
    parts: { condition: "life-below", effect: "heal" },
  },
  {
    kind: "trigger",
    id: "searing-crit",
    name: "Searing Crit",
    slots: ["mainHand", "ring"],
    weight: 10,
    tags: [],
    condition: { kind: "onCrit" },
    cooldown: 1,
    effect: { kind: "ailment", ailment: "burn" },
    rolls: "chance",
    value: { min: 0.2, max: 0.4 },
    perTier: 0,
    parts: { condition: "on-crit", effect: "burn" },
  },
];

export const TEST_CONDITIONS: readonly TriggerConditionPart[] = [
  {
    id: "life-below",
    name: "Low Life",
    condition: { kind: "lifeBelow", threshold: 0.35 },
    oncePerFight: true,
    home: { archetypes: ["brute"] },
  },
  {
    id: "on-crit",
    name: "On Crit",
    condition: { kind: "onCrit" },
    chance: 0.5,
    cooldown: 1,
    home: { archetypes: ["skirmisher"] },
  },
];

export const TEST_EFFECTS: readonly TriggerEffectPart[] = [
  {
    id: "heal",
    name: "Mend",
    effect: { kind: "heal" },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
    cooldown: 10,
    home: { boss: true },
  },
  {
    id: "burn",
    name: "Burn",
    effect: { kind: "ailment", ailment: "burn" },
    rolls: "chance",
    value: { min: 0.2, max: 0.4 },
    perTier: 0,
    home: { actId: "test-act" },
  },
];

export const TEST_CATALOG = createItemCatalog({
  bases: [TEST_SWORD, TEST_WAND, TEST_SHIELD, TEST_RING, TEST_AXE],
  affixes: TEST_AFFIXES,
  rareNames: { first: ["Ash"], second: ["Bite"] },
  runes: TEST_RUNES,
  runewords: TEST_RUNEWORDS,
  powers: TEST_POWERS,
  uniques: TEST_UNIQUES,
  conditions: TEST_CONDITIONS,
  effects: TEST_EFFECTS,
});
