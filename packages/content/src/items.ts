import { TRIGGER_CONDITIONS, TRIGGER_EFFECTS } from "./codex";
import {
  type AffixDefinition,
  EQUIPMENT_SLOTS,
  type Equipment,
  type EquipmentSlot,
  type Item,
  type ItemBaseDefinition,
  type ItemSlot,
  type Rarity,
  type Rng,
  type StatAffixDefinition,
  type TriggerAffixDefinition,
  type WeaponDefinition,
  basesForSlot,
  createItemCatalog,
  getBase,
  itemSlotFor,
  offHandFits,
  rollItem,
  rollRarity,
} from "@emberheir/sim";
import {
  BOSS_TROPHIES,
  LEGENDARY_POWERS,
  POWER_TRIGGERS,
  RUNES,
  RUNEWORDS,
  UNIQUES,
} from "./legendary";
import { AXE, BOW, CROSSBOW, DAGGER, FIRE_WAND, MACE, STAFF, SWORD } from "./weapons";

/**
 * Items (docs/design/item-system-v1.md): all 10 slots, Normal to Epic. Most slots have a light
 * (Agility), a heavy (Strength) and a caster (Intelligence) base, like D2's base types. All
 * numbers are Tier 1 starting values for the balance CLI.
 */

// --- Base items ------------------------------------------------------------------------------

export const SWORD_BASE: ItemBaseDefinition = {
  id: "sword",
  name: "Sword",
  slot: "mainHand",
  weapon: SWORD,
  requirements: { strength: 5 },
  affixWeights: { physical: 1.5, elemental: 0.5 },
  maxSockets: 3,
};

export const FIRE_WAND_BASE: ItemBaseDefinition = {
  id: "fire-wand",
  name: "Fire Wand",
  slot: "mainHand",
  weapon: FIRE_WAND,
  requirements: { intelligence: 5 },
  affixWeights: { elemental: 1.5, physical: 0.5 },
  size: { w: 1, h: 2 },
  maxSockets: 2,
};

export const AXE_BASE: ItemBaseDefinition = {
  id: "axe",
  name: "Axe",
  slot: "mainHand",
  weapon: AXE,
  requirements: { strength: 7 },
  affixWeights: { physical: 1.5, ailment: 1.5, elemental: 0.5 },
  maxSockets: 3,
};

export const DAGGER_BASE: ItemBaseDefinition = {
  id: "dagger",
  name: "Dagger",
  slot: "mainHand",
  weapon: DAGGER,
  requirements: { dexterity: 6 },
  affixWeights: { crit: 1.5, ailment: 1.5, elemental: 0.5 },
  size: { w: 1, h: 2 },
  maxSockets: 2,
};

export const BOW_BASE: ItemBaseDefinition = {
  id: "bow",
  name: "Bow",
  slot: "mainHand",
  weapon: BOW,
  requirements: { dexterity: 7 },
  affixWeights: { ailment: 1.5, speed: 1.3, elemental: 0.5 },
  size: { w: 2, h: 3 },
  maxSockets: 3,
};

export const CROSSBOW_BASE: ItemBaseDefinition = {
  id: "crossbow",
  name: "Crossbow",
  slot: "mainHand",
  weapon: CROSSBOW,
  requirements: { strength: 5, dexterity: 5 },
  affixWeights: { physical: 1.5, crit: 1.3, elemental: 0.5 },
  size: { w: 2, h: 3 },
  maxSockets: 3,
};

export const MACE_BASE: ItemBaseDefinition = {
  id: "mace",
  name: "Mace",
  slot: "mainHand",
  weapon: MACE,
  requirements: { strength: 8 },
  affixWeights: { physical: 1.5, defense: 1.2, elemental: 0.5 },
  maxSockets: 3,
};

export const STAFF_BASE: ItemBaseDefinition = {
  id: "staff",
  name: "Staff",
  slot: "mainHand",
  weapon: STAFF,
  requirements: { intelligence: 6, wisdom: 4 },
  affixWeights: { elemental: 1.5, ailment: 1.5, physical: 0.3 },
  size: { w: 1, h: 4 },
  maxSockets: 4,
};

export const ROUND_SHIELD: ItemBaseDefinition = {
  id: "round-shield",
  name: "Round Shield",
  slot: "offHand",
  fitsWeaponRange: "melee",
  baseStats: { armor: 4, blockChance: 0.15, blockValue: 2 },
  requirements: { strength: 6 },
  affixWeights: { defense: 1.5, elemental: 0.5 },
  maxSockets: 3,
};

export const EMBER_FOCUS: ItemBaseDefinition = {
  id: "ember-focus",
  name: "Ember Focus",
  slot: "offHand",
  fitsWeaponRange: "ranged",
  // A Focus is for casters; a Bow or Crossbow takes a Quiver.
  fitsWeapons: ["fire-wand", "staff"],
  implicit: { elementalDamage: 0.08, heatGain: 0.05 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, heat: 1.5, block: 0, physical: 0.5 },
  maxSockets: 2,
};

/** Blood Talisman (klassen-v2.md): the Reaver's off hand, for Bleed and Poison up close. */
export const BLOOD_TALISMAN: ItemBaseDefinition = {
  id: "blood-talisman",
  name: "Blood Talisman",
  slot: "offHand",
  fitsWeaponRange: "melee",
  implicit: { bleedChance: 0.05, poisonChance: 0.05 },
  requirements: { dexterity: 6 },
  affixWeights: { ailment: 1.5, physical: 1.2, block: 0 },
  maxSockets: 2,
};

/** Grimoire (klassen-v2.md): the Warlock's off hand, for curses that linger. */
export const GRIMOIRE: ItemBaseDefinition = {
  id: "grimoire",
  name: "Grimoire",
  slot: "offHand",
  fitsWeaponRange: "ranged",
  fitsWeapons: ["fire-wand", "staff"],
  implicit: { ailmentDuration: 0.1, burnChance: 0.03, corruptionChance: 0.03 },
  requirements: { wisdom: 6 },
  affixWeights: { ailment: 1.5, elemental: 1.2, block: 0, physical: 0.5 },
  maxSockets: 2,
};

/** Quiver (item-system-v1.md): the off hand of Bows and Crossbows. */
export const QUIVER: ItemBaseDefinition = {
  id: "quiver",
  name: "Quiver",
  slot: "offHand",
  fitsWeaponRange: "ranged",
  fitsWeapons: ["bow", "crossbow"],
  implicit: { attackSpeed: 0.05, critChance: 0.02 },
  requirements: { dexterity: 6 },
  affixWeights: { speed: 1.5, crit: 1.5, ailment: 1.2, block: 0 },
  size: { w: 1, h: 3 },
  maxSockets: 2,
};

export const LEATHER_JERKIN: ItemBaseDefinition = {
  id: "leather-jerkin",
  name: "Leather Jerkin",
  slot: "body",
  baseStats: { armor: 6 },
  implicit: { evasion: 0.03 },
  requirements: { agility: 6 },
  affixWeights: { speed: 1.5 },
  maxSockets: 3,
};

export const CHAIN_MAIL: ItemBaseDefinition = {
  id: "chain-mail",
  name: "Chain Mail",
  slot: "body",
  baseStats: { armor: 14 },
  // The heavy armor needs points in Strength first.
  requirements: { strength: 10 },
  affixWeights: { defense: 1.5 },
  maxSockets: 4,
};

export const SILK_ROBE: ItemBaseDefinition = {
  id: "silk-robe",
  name: "Silk Robe",
  slot: "body",
  baseStats: { armor: 3 },
  implicit: { allResistance: 0.05 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, heat: 1.5 },
  maxSockets: 3,
};

export const LEATHER_CAP: ItemBaseDefinition = {
  id: "leather-cap",
  name: "Leather Cap",
  slot: "helm",
  baseStats: { armor: 3 },
  implicit: { evasion: 0.02 },
  requirements: { agility: 6 },
  affixWeights: { speed: 1.5 },
  maxSockets: 2,
};

export const IRON_HELM: ItemBaseDefinition = {
  id: "iron-helm",
  name: "Iron Helm",
  slot: "helm",
  baseStats: { armor: 7 },
  requirements: { strength: 9 },
  affixWeights: { defense: 1.5 },
  maxSockets: 3,
};

export const CIRCLET: ItemBaseDefinition = {
  id: "circlet",
  name: "Circlet",
  slot: "helm",
  baseStats: { armor: 1 },
  implicit: { heatGain: 0.05 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, heat: 1.5 },
  maxSockets: 2,
};

export const LEATHER_GLOVES: ItemBaseDefinition = {
  id: "leather-gloves",
  name: "Leather Gloves",
  slot: "gloves",
  baseStats: { armor: 2 },
  implicit: { attackSpeed: 0.03 },
  requirements: { agility: 6 },
  affixWeights: { speed: 1.5, crit: 1.5 },
};

export const GAUNTLETS: ItemBaseDefinition = {
  id: "gauntlets",
  name: "Gauntlets",
  slot: "gloves",
  baseStats: { armor: 5 },
  requirements: { strength: 9 },
  affixWeights: { physical: 1.5, defense: 1.5 },
};

export const SILK_WRAPS: ItemBaseDefinition = {
  id: "silk-wraps",
  name: "Silk Wraps",
  slot: "gloves",
  baseStats: { armor: 1 },
  implicit: { elementalDamage: 0.04 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, physical: 0.5 },
};

export const LEATHER_BOOTS: ItemBaseDefinition = {
  id: "leather-boots",
  name: "Leather Boots",
  slot: "boots",
  baseStats: { armor: 2 },
  implicit: { evasion: 0.02 },
  requirements: { agility: 6 },
  affixWeights: { speed: 1.5 },
};

export const GREAVES: ItemBaseDefinition = {
  id: "greaves",
  name: "Greaves",
  slot: "boots",
  baseStats: { armor: 5 },
  implicit: { tenacity: 0.04 },
  requirements: { strength: 9 },
  affixWeights: { defense: 1.5 },
};

export const SILK_SLIPPERS: ItemBaseDefinition = {
  id: "silk-slippers",
  name: "Silk Slippers",
  slot: "boots",
  baseStats: { armor: 1 },
  implicit: { startingHeat: 5 },
  requirements: { intelligence: 6 },
  affixWeights: { heat: 1.5, elemental: 1.5 },
};

export const SASH: ItemBaseDefinition = {
  id: "sash",
  name: "Sash",
  slot: "belt",
  baseStats: { armor: 1 },
  implicit: { life: 6 },
  affixWeights: { life: 1.5 },
};

export const HEAVY_BELT: ItemBaseDefinition = {
  id: "heavy-belt",
  name: "Heavy Belt",
  slot: "belt",
  baseStats: { armor: 4 },
  implicit: { tenacity: 0.03 },
  requirements: { strength: 8 },
  affixWeights: { defense: 1.5 },
};

export const BONE_AMULET: ItemBaseDefinition = {
  id: "bone-amulet",
  name: "Bone Amulet",
  slot: "amulet",
  implicit: { allResistance: 0.03 },
};

export const EMBER_PENDANT: ItemBaseDefinition = {
  id: "ember-pendant",
  name: "Ember Pendant",
  slot: "amulet",
  implicit: { heatGain: 0.04 },
};

export const IRON_RING: ItemBaseDefinition = {
  id: "iron-ring",
  name: "Iron Ring",
  slot: "ring",
  implicit: { critChance: 0.01 },
};

export const GARNET_RING: ItemBaseDefinition = {
  id: "garnet-ring",
  name: "Garnet Ring",
  slot: "ring",
  implicit: { life: 6 },
};

export const ITEM_BASES: readonly ItemBaseDefinition[] = [
  SWORD_BASE,
  FIRE_WAND_BASE,
  AXE_BASE,
  DAGGER_BASE,
  BOW_BASE,
  CROSSBOW_BASE,
  MACE_BASE,
  STAFF_BASE,
  ROUND_SHIELD,
  EMBER_FOCUS,
  QUIVER,
  BLOOD_TALISMAN,
  GRIMOIRE,
  LEATHER_JERKIN,
  CHAIN_MAIL,
  SILK_ROBE,
  LEATHER_CAP,
  IRON_HELM,
  CIRCLET,
  LEATHER_GLOVES,
  GAUNTLETS,
  SILK_WRAPS,
  LEATHER_BOOTS,
  GREAVES,
  SILK_SLIPPERS,
  SASH,
  HEAVY_BELT,
  BONE_AMULET,
  EMBER_PENDANT,
  IRON_RING,
  GARNET_RING,
];

// --- Stat affixes ----------------------------------------------------------------------------

const ARMOR_SLOTS: readonly ItemSlot[] = ["helm", "body", "gloves", "boots", "belt"];
const JEWELRY: readonly ItemSlot[] = ["amulet", "ring"];
const ALL_SLOTS: readonly ItemSlot[] = ["mainHand", "offHand", ...ARMOR_SLOTS, ...JEWELRY];

const stat = (affix: Omit<StatAffixDefinition, "kind" | "weight"> & { weight?: number }) =>
  ({ kind: "stat", weight: 10, ...affix }) satisfies StatAffixDefinition;

const attribute = (
  id: StatAffixDefinition["stat"],
  suffix: string,
  tag: string,
): StatAffixDefinition =>
  stat({
    id,
    stat: id,
    suffix,
    slots: ALL_SLOTS,
    tags: ["attribute", tag],
    value: { min: 1, max: 4 },
    perTier: 0.75,
  });

export const STAT_AFFIXES: readonly StatAffixDefinition[] = [
  attribute("strength", "of the Ox", "physical"),
  attribute("dexterity", "of the Fox", "crit"),
  attribute("agility", "of the Hare", "speed"),
  attribute("intelligence", "of the Owl", "elemental"),
  attribute("wisdom", "of the Sage", "heat"),
  attribute("vitality", "of the Bear", "life"),
  stat({
    id: "life",
    stat: "life",
    suffix: "of Vigor",
    slots: ["offHand", ...ARMOR_SLOTS, ...JEWELRY],
    tags: ["life", "defense"],
    weight: 14,
    value: { min: 8, max: 20 },
    perTier: 1,
  }),
  stat({
    id: "armor",
    stat: "armor",
    prefix: "Sturdy",
    slots: ["offHand", ...ARMOR_SLOTS],
    tags: ["defense"],
    weight: 12,
    value: { min: 4, max: 12 },
    perTier: 1,
  }),
  stat({
    id: "physical-damage",
    stat: "physicalDamage",
    prefix: "Brutal",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["physical", "offense"],
    value: { min: 0.08, max: 0.2 },
    perTier: 0.15,
  }),
  stat({
    id: "elemental-damage",
    stat: "elementalDamage",
    prefix: "Arcane",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["elemental", "offense"],
    value: { min: 0.08, max: 0.2 },
    perTier: 0.15,
  }),
  stat({
    id: "added-weapon-damage",
    stat: "addedWeaponDamage",
    prefix: "Jagged",
    slots: ["mainHand"],
    tags: ["offense"],
    weight: 14,
    value: { min: 3, max: 7 },
    perTier: 1,
  }),
  stat({
    id: "attack-speed",
    stat: "attackSpeed",
    suffix: "of Haste",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["speed", "offense"],
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "crit-chance",
    stat: "critChance",
    suffix: "of Precision",
    slots: ["mainHand", "helm", "gloves", ...JEWELRY],
    tags: ["crit", "offense"],
    value: { min: 0.01, max: 0.04 },
    perTier: 0.1,
  }),
  stat({
    id: "evasion",
    stat: "evasion",
    suffix: "of Shadows",
    slots: ["offHand", "helm", "body", "boots"],
    tags: ["defense", "speed"],
    value: { min: 0.02, max: 0.05 },
    perTier: 0.1,
  }),
  stat({
    id: "block-chance",
    stat: "blockChance",
    suffix: "of the Wall",
    slots: ["offHand"],
    tags: ["defense", "block"],
    value: { min: 0.03, max: 0.08 },
    perTier: 0.1,
  }),
  stat({
    id: "all-resistance",
    stat: "allResistance",
    prefix: "Shimmering",
    slots: ["offHand", ...ARMOR_SLOTS, ...JEWELRY],
    tags: ["defense", "resistance"],
    value: { min: 0.04, max: 0.1 },
    perTier: 0.15,
  }),
  ...(
    [
      ["fire", "Ruby"],
      ["cold", "Sapphire"],
      ["lightning", "Amber"],
      ["void", "Obsidian"],
    ] as const
  ).map(([element, prefix]) =>
    stat({
      id: `${element}-resistance`,
      stat: `${element}Resistance`,
      prefix,
      slots: ["offHand", "helm", "body", "boots", "belt", ...JEWELRY],
      tags: ["defense", "resistance"],
      weight: 8,
      value: { min: 0.08, max: 0.18 },
      perTier: 0.15,
    }),
  ),
  stat({
    id: "physical-penetration",
    stat: "physicalPenetration",
    prefix: "Piercing",
    slots: ["mainHand", "gloves", "amulet"],
    tags: ["physical", "offense"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "elemental-penetration",
    stat: "elementalPenetration",
    prefix: "Eldritch",
    slots: ["mainHand", "offHand", "amulet"],
    tags: ["elemental", "offense"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "heat-gain",
    stat: "heatGain",
    prefix: "Kindled",
    slots: ["mainHand", "offHand", "helm", ...JEWELRY],
    tags: ["heat"],
    value: { min: 0.05, max: 0.12 },
    perTier: 0.1,
  }),
  stat({
    id: "starting-heat",
    stat: "startingHeat",
    suffix: "of the Spark",
    slots: ["offHand", "boots", "belt", "amulet"],
    tags: ["heat"],
    value: { min: 5, max: 15 },
    perTier: 0.2,
  }),
  stat({
    id: "ailment-duration",
    stat: "ailmentDuration",
    suffix: "of Lingering",
    slots: ["mainHand", "offHand", "gloves", "amulet"],
    tags: ["ailment"],
    value: { min: 0.08, max: 0.2 },
    perTier: 0.15,
  }),
  stat({
    id: "tenacity",
    stat: "tenacity",
    suffix: "of Resolve",
    slots: ["helm", "body", "boots", "belt", "ring"],
    tags: ["defense"],
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "lifesteal",
    stat: "lifesteal",
    suffix: "of the Leech",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["life", "offense"],
    weight: 6,
    value: { min: 0.01, max: 0.03 },
    perTier: 0.1,
  }),
  stat({
    id: "trigger-chance",
    stat: "triggerChance",
    suffix: "of Chance",
    slots: ["gloves", ...JEWELRY],
    tags: ["trigger"],
    value: { min: 0.05, max: 0.15 },
    perTier: 0.1,
  }),
  stat({
    id: "thorns",
    stat: "thorns",
    prefix: "Thorned",
    slots: ["offHand", "body", "belt"],
    tags: ["defense"],
    weight: 6,
    value: { min: 2, max: 4 },
    perTier: 1,
  }),
  stat({
    id: "burn-chance",
    stat: "burnChance",
    prefix: "Smoldering",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "chill-chance",
    stat: "chillChance",
    prefix: "Chilling",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "bleed-chance",
    stat: "bleedChance",
    prefix: "Serrated",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "physical"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "poison-chance",
    stat: "poisonChance",
    prefix: "Venomous",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "physical"],
    weight: 6,
    value: { min: 0.05, max: 0.12 },
    perTier: 0.1,
  }),
  stat({
    id: "shock-chance",
    stat: "shockChance",
    prefix: "Static",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "corruption-chance",
    stat: "corruptionChance",
    prefix: "Blighted",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 5,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
];

// --- Trigger affixes -------------------------------------------------------------------------

const trigger = (affix: Omit<TriggerAffixDefinition, "kind" | "weight"> & { weight?: number }) =>
  ({ kind: "trigger", weight: 10, ...affix }) satisfies TriggerAffixDefinition;

export const TRIGGER_AFFIXES: readonly TriggerAffixDefinition[] = [
  trigger({
    id: "crushing-blow",
    name: "Crushing Blow",
    slots: ["mainHand", "gloves", "ring"],
    tags: ["offense", "physical"],
    condition: { kind: "everyNthAttack", n: 4 },
    effect: { kind: "weaponHit" },
    rolls: "magnitude",
    value: { min: 0.8, max: 1.4 },
    perTier: 0,
    parts: { condition: "every-4th-attack", effect: "weapon-hit" },
  }),
  trigger({
    id: "searing-crit",
    name: "Searing Crit",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["crit", "elemental", "ailment"],
    condition: { kind: "onCrit" },
    effect: { kind: "ailment", ailment: "burn" },
    rolls: "chance",
    cooldown: 1,
    value: { min: 0.25, max: 0.5 },
    perTier: 0,
    parts: { condition: "on-crit", effect: "burn" },
  }),
  trigger({
    id: "frostbite",
    name: "Frostbite",
    slots: ["offHand", "helm", "body", "amulet"],
    tags: ["defense", "elemental"],
    condition: { kind: "whenHit" },
    effect: { kind: "ailment", ailment: "chill" },
    rolls: "chance",
    cooldown: 3,
    value: { min: 0.15, max: 0.3 },
    perTier: 0,
    parts: { condition: "when-hit", effect: "chill" },
  }),
  trigger({
    id: "stoneskin",
    name: "Stoneskin",
    slots: ["offHand", "body", "belt", "amulet"],
    tags: ["defense"],
    condition: { kind: "whenHit" },
    chance: 0.2,
    cooldown: 8,
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.06, max: 0.12 },
    perTier: 0.1,
    parts: { condition: "when-hit", effect: "barrier" },
  }),
  trigger({
    id: "second-wind",
    name: "Second Wind",
    slots: ["body", "belt", ...JEWELRY],
    tags: ["life", "defense"],
    condition: { kind: "lifeBelow", threshold: 0.35 },
    oncePerFight: true,
    effect: { kind: "heal" },
    rolls: "magnitude",
    value: { min: 0.12, max: 0.22 },
    perTier: 0.1,
    parts: { condition: "low-life", effect: "heal" },
  }),
  trigger({
    id: "ember-guard",
    name: "Ember Guard",
    slots: ["offHand", "body", "amulet"],
    tags: ["block", "heat"],
    condition: { kind: "onBlock" },
    cooldown: 1,
    effect: { kind: "heat" },
    rolls: "magnitude",
    value: { min: 6, max: 12 },
    perTier: 0.1,
    parts: { condition: "on-block", effect: "heat" },
  }),
  trigger({
    id: "fleetfoot",
    name: "Fleetfoot",
    slots: ["boots", "body", ...JEWELRY],
    tags: ["speed", "defense"],
    condition: { kind: "onEvade" },
    cooldown: 1,
    effect: { kind: "buff", stat: "attackSpeed", duration: 4, maxStacks: 2 },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
    parts: { condition: "on-evade", effect: "attack-speed" },
  }),
  trigger({
    id: "flame-pulse",
    name: "Flame Pulse",
    slots: ["mainHand", "offHand", ...JEWELRY],
    tags: ["elemental", "offense"],
    condition: { kind: "everySeconds", seconds: 6 },
    effect: {
      kind: "spellHit",
      name: "Flame Pulse",
      damage: { min: 6, max: 10 },
      damageType: "fire",
    },
    rolls: "magnitude",
    value: { min: 1, max: 1.5 },
    perTier: 1,
    parts: { condition: "every-6s", effect: "flame-pulse" },
  }),
  trigger({
    id: "battle-focus",
    name: "Battle Focus",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["crit", "offense"],
    condition: { kind: "onSkillUse" },
    effect: { kind: "buff", stat: "critChance", duration: 4, maxStacks: 3 },
    rolls: "magnitude",
    value: { min: 0.04, max: 0.08 },
    perTier: 0.1,
    parts: { condition: "on-skill-use", effect: "crit-chance" },
  }),
  trigger({
    id: "ember-mind",
    name: "Ember Mind",
    slots: ["helm", "amulet"],
    tags: ["heat"],
    condition: { kind: "onSkillUse" },
    cooldown: 3,
    effect: { kind: "heat" },
    rolls: "magnitude",
    value: { min: 5, max: 10 },
    perTier: 0.1,
    parts: { condition: "on-skill-use", effect: "heat" },
  }),
  trigger({
    id: "iron-will",
    name: "Iron Will",
    slots: ["helm", "belt", "offHand"],
    tags: ["defense"],
    condition: { kind: "lifeBelow", threshold: 0.5 },
    oncePerFight: true,
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.18 },
    perTier: 0.1,
    parts: { condition: "half-life", effect: "barrier" },
  }),
  trigger({
    id: "static-charge",
    name: "Static Charge",
    slots: ["helm", "boots", "body"],
    tags: ["defense", "elemental"],
    condition: { kind: "whenHit" },
    effect: { kind: "ailment", ailment: "shock" },
    rolls: "chance",
    cooldown: 3,
    value: { min: 0.15, max: 0.3 },
    perTier: 0,
    parts: { condition: "when-hit", effect: "shock" },
  }),
  trigger({
    id: "quickstep",
    name: "Quickstep",
    slots: ["boots"],
    tags: ["speed", "defense"],
    condition: { kind: "everySeconds", seconds: 8 },
    effect: { kind: "buff", stat: "evasion", duration: 3 },
    rolls: "magnitude",
    value: { min: 0.1, max: 0.2 },
    perTier: 0.1,
    parts: { condition: "every-8s", effect: "evasion" },
  }),
  trigger({
    id: "rending-strikes",
    name: "Rending Strikes",
    slots: ["mainHand", "gloves", "ring"],
    tags: ["offense", "physical", "ailment"],
    condition: { kind: "onHit" },
    effect: { kind: "ailment", ailment: "bleed" },
    rolls: "chance",
    cooldown: 1,
    value: { min: 0.06, max: 0.12 },
    perTier: 0,
    parts: { condition: "on-hit", effect: "bleed" },
  }),
  trigger({
    id: "venom-sting",
    name: "Venom Sting",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["crit", "physical", "ailment"],
    condition: { kind: "onCrit" },
    effect: { kind: "ailment", ailment: "poison" },
    rolls: "chance",
    cooldown: 1,
    value: { min: 0.25, max: 0.5 },
    perTier: 0,
    parts: { condition: "on-crit", effect: "poison" },
  }),
  trigger({
    id: "opening-ward",
    name: "Opening Ward",
    slots: ["offHand", "helm", "body"],
    tags: ["defense"],
    condition: { kind: "fightStart" },
    oncePerFight: true,
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.08, max: 0.15 },
    perTier: 0.1,
    parts: { condition: "fight-start", effect: "barrier" },
  }),
  trigger({
    id: "riposte-guard",
    name: "Riposte",
    slots: ["offHand", "gloves"],
    tags: ["block", "offense"],
    condition: { kind: "onBlock" },
    cooldown: 2,
    effect: { kind: "extraAttack" },
    rolls: "chance",
    value: { min: 0.3, max: 0.6 },
    perTier: 0,
    parts: { condition: "on-block", effect: "extra-attack" },
  }),
];

export const AFFIXES: readonly AffixDefinition[] = [
  ...STAT_AFFIXES,
  ...TRIGGER_AFFIXES,
  ...POWER_TRIGGERS,
];

/** Name parts for Rare and Epic items. */
export const RARE_NAMES = {
  first: ["Ash", "Cinder", "Ember", "Soot", "Grim", "Hollow", "Pyre", "Smolder", "Char", "Dusk"],
  second: ["Bite", "Ward", "Fang", "Coil", "Veil", "Brand", "Mark", "Shroud", "Grasp", "Edge"],
} as const;

export const ITEM_CATALOG = createItemCatalog({
  bases: ITEM_BASES,
  affixes: AFFIXES,
  rareNames: RARE_NAMES,
  runes: RUNES,
  runewords: RUNEWORDS,
  powers: LEGENDARY_POWERS,
  uniques: [...UNIQUES, ...BOSS_TROPHIES],
  conditions: TRIGGER_CONDITIONS,
  effects: TRIGGER_EFFECTS,
});

// --- Gear sets ------------------------------------------------------------------------------

export interface GearRollOptions {
  /** Base id of the main-hand weapon, e.g. "sword". */
  readonly weaponBaseId: string;
  /** One rarity for all items, or "mixed" for a random rarity per item. */
  readonly rarity: Rarity | "mixed";
  readonly itemLevel: number;
}

/** Bases that suit a weapon: an off hand that fits it, armor for the weapon's main attribute. */
function suitsWeapon(base: ItemBaseDefinition, weapon: WeaponDefinition): boolean {
  if (base.slot === "offHand" && !offHandFits(base, weapon)) return false;
  const required = Object.keys(base.requirements ?? {});
  const own =
    weapon.damageType === "physical"
      ? ["strength", "agility", "dexterity"]
      : ["intelligence", "wisdom"];
  return required.every((a) => own.includes(a));
}

/**
 * Rolls a full gear set for all 10 slots: the chosen weapon plus a random fitting base in every
 * other slot. Used by the balance CLI and the debug page.
 */
export function rollGear(options: GearRollOptions, rng: Rng): Equipment {
  const weapon = getBase(ITEM_CATALOG, options.weaponBaseId).weapon;
  if (!weapon) throw new Error(`"${options.weaponBaseId}" is not a weapon`);
  const rarity = () => (options.rarity === "mixed" ? rollRarity(rng) : options.rarity);
  const randomBase = (slot: ItemSlot) => {
    const all = basesForSlot(ITEM_CATALOG, slot);
    const fitting = all.filter((b) => suitsWeapon(b, weapon));
    const bases = fitting.length ? fitting : all;
    const base = bases[rng.int(0, bases.length - 1)];
    if (!base) throw new Error(`No item base for slot ${slot}`);
    return base.id;
  };
  const roll = (baseId: string) =>
    rollItem(ITEM_CATALOG, { baseId, itemLevel: options.itemLevel, rarity: rarity() }, rng);

  const gear: Partial<Record<EquipmentSlot, Item>> = { mainHand: roll(options.weaponBaseId) };
  for (const slot of EQUIPMENT_SLOTS) {
    if (slot !== "mainHand") gear[slot] = roll(randomBase(itemSlotFor(slot)));
  }
  return gear;
}
