import { TEST_WEAPON } from "../combat/test-fixtures";
import { createItemCatalog } from "./generate";
import type { AffixDefinition, ItemBaseDefinition } from "./types";

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
};

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
  },
];

export const TEST_CATALOG = createItemCatalog({
  bases: [TEST_SWORD, TEST_WAND, TEST_SHIELD, TEST_RING],
  affixes: TEST_AFFIXES,
  rareNames: { first: ["Ash"], second: ["Bite"] },
});
