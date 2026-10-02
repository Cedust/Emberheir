import {
  type AffixDefinition,
  type Equipment,
  type EquipmentSlot,
  type ItemBaseDefinition,
  type ItemSlot,
  type Rarity,
  type Rng,
  type StatAffixDefinition,
  type TriggerAffixDefinition,
  basesForSlot,
  createItemCatalog,
  getBase,
  rollItem,
  rollRarity,
} from "@emberheir/sim";
import { FIRE_WAND, SWORD } from "./weapons";

/**
 * PoC items (docs/design/item-system-v1.md, PoC scope in game-design-document-v1.md section 11):
 * 5 slots, Normal to Epic. All numbers are Tier 1 starting values for the balance CLI.
 */

// --- Base items ------------------------------------------------------------------------------

export const SWORD_BASE: ItemBaseDefinition = {
  id: "sword",
  name: "Sword",
  slot: "mainHand",
  weapon: SWORD,
  requirements: { strength: 5 },
  affixWeights: { physical: 1.5, elemental: 0.5 },
};

export const FIRE_WAND_BASE: ItemBaseDefinition = {
  id: "fire-wand",
  name: "Fire Wand",
  slot: "mainHand",
  weapon: FIRE_WAND,
  requirements: { intelligence: 5 },
  affixWeights: { elemental: 1.5, physical: 0.5 },
  size: { w: 1, h: 2 },
};

export const ROUND_SHIELD: ItemBaseDefinition = {
  id: "round-shield",
  name: "Round Shield",
  slot: "offHand",
  fitsWeaponRange: "melee",
  baseStats: { armor: 4, blockChance: 0.15, blockValue: 2 },
  requirements: { strength: 6 },
  affixWeights: { defense: 1.5, elemental: 0.5 },
};

export const EMBER_FOCUS: ItemBaseDefinition = {
  id: "ember-focus",
  name: "Ember Focus",
  slot: "offHand",
  fitsWeaponRange: "ranged",
  implicit: { elementalDamage: 0.08, heatGain: 0.05 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, heat: 1.5, block: 0, physical: 0.5 },
};

export const LEATHER_JERKIN: ItemBaseDefinition = {
  id: "leather-jerkin",
  name: "Leather Jerkin",
  slot: "body",
  baseStats: { armor: 6 },
  implicit: { evasion: 0.03 },
  requirements: { agility: 6 },
  affixWeights: { speed: 1.5 },
};

export const CHAIN_MAIL: ItemBaseDefinition = {
  id: "chain-mail",
  name: "Chain Mail",
  slot: "body",
  baseStats: { armor: 14 },
  // The heavy armor needs points in Strength first.
  requirements: { strength: 10 },
  affixWeights: { defense: 1.5 },
};

export const SILK_ROBE: ItemBaseDefinition = {
  id: "silk-robe",
  name: "Silk Robe",
  slot: "body",
  baseStats: { armor: 3 },
  implicit: { allResistance: 0.05 },
  requirements: { intelligence: 6 },
  affixWeights: { elemental: 1.5, heat: 1.5 },
};

export const BONE_AMULET: ItemBaseDefinition = {
  id: "bone-amulet",
  name: "Bone Amulet",
  slot: "amulet",
  implicit: { allResistance: 0.03 },
};

export const IRON_RING: ItemBaseDefinition = {
  id: "iron-ring",
  name: "Iron Ring",
  slot: "ring",
  implicit: { critChance: 0.01 },
};

export const ITEM_BASES: readonly ItemBaseDefinition[] = [
  SWORD_BASE,
  FIRE_WAND_BASE,
  ROUND_SHIELD,
  EMBER_FOCUS,
  LEATHER_JERKIN,
  CHAIN_MAIL,
  SILK_ROBE,
  BONE_AMULET,
  IRON_RING,
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
    suffix: "of Iron",
    slots: ["offHand", ...ARMOR_SLOTS],
    tags: ["defense"],
    weight: 12,
    value: { min: 4, max: 12 },
    perTier: 1,
  }),
  stat({
    id: "physical-damage",
    stat: "physicalDamage",
    suffix: "of Ruin",
    slots: ["mainHand", "gloves", ...JEWELRY],
    tags: ["physical", "offense"],
    value: { min: 0.08, max: 0.2 },
    perTier: 0.15,
  }),
  stat({
    id: "elemental-damage",
    stat: "elementalDamage",
    suffix: "of the Pyre",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["elemental", "offense"],
    value: { min: 0.08, max: 0.2 },
    perTier: 0.15,
  }),
  stat({
    id: "added-weapon-damage",
    stat: "addedWeaponDamage",
    suffix: "of Edges",
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
    suffix: "of Warding",
    slots: ["offHand", ...ARMOR_SLOTS, ...JEWELRY],
    tags: ["defense", "resistance"],
    value: { min: 0.04, max: 0.1 },
    perTier: 0.15,
  }),
  stat({
    id: "heat-gain",
    stat: "heatGain",
    suffix: "of Kindling",
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
    suffix: "of Brambles",
    slots: ["offHand", "body", "belt"],
    tags: ["defense"],
    weight: 6,
    value: { min: 2, max: 4 },
    perTier: 1,
  }),
  stat({
    id: "burn-chance",
    stat: "burnChance",
    suffix: "of Embers",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "chill-chance",
    stat: "chillChance",
    suffix: "of Frost",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
    value: { min: 0.04, max: 0.1 },
    perTier: 0.1,
  }),
  stat({
    id: "shock-chance",
    stat: "shockChance",
    suffix: "of Storms",
    slots: ["mainHand", "offHand", "gloves", ...JEWELRY],
    tags: ["ailment", "elemental"],
    weight: 6,
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
  }),
];

export const AFFIXES: readonly AffixDefinition[] = [...STAT_AFFIXES, ...TRIGGER_AFFIXES];

/** Name parts for Rare and Epic items. */
export const RARE_NAMES = {
  first: ["Ash", "Cinder", "Ember", "Soot", "Grim", "Hollow", "Pyre", "Smolder", "Char", "Dusk"],
  second: ["Bite", "Ward", "Fang", "Coil", "Veil", "Brand", "Mark", "Shroud", "Grasp", "Edge"],
} as const;

export const ITEM_CATALOG = createItemCatalog({
  bases: ITEM_BASES,
  affixes: AFFIXES,
  rareNames: RARE_NAMES,
});

// --- PoC gear -------------------------------------------------------------------------------

/** The 5 equipment slots of the PoC. */
export const POC_EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  "mainHand",
  "offHand",
  "body",
  "amulet",
  "ring1",
];

export interface GearRollOptions {
  /** Base id of the main-hand weapon, e.g. "sword". */
  readonly weaponBaseId: string;
  /** One rarity for all items, or "mixed" for a random rarity per item. */
  readonly rarity: Rarity | "mixed";
  readonly itemLevel: number;
}

/**
 * Rolls a full PoC gear set: the chosen weapon, an off hand that fits it, a random Body Armor,
 * an Amulet and a Ring. Used by the balance CLI and the debug page.
 */
export function rollPocGear(options: GearRollOptions, rng: Rng): Equipment {
  const weapon = getBase(ITEM_CATALOG, options.weaponBaseId).weapon;
  if (!weapon) throw new Error(`"${options.weaponBaseId}" is not a weapon`);
  const rarity = () => (options.rarity === "mixed" ? rollRarity(rng) : options.rarity);
  const randomBase = (slot: ItemSlot, filter: (b: ItemBaseDefinition) => boolean = () => true) => {
    const bases = basesForSlot(ITEM_CATALOG, slot).filter(filter);
    const base = bases[rng.int(0, bases.length - 1)];
    if (!base) throw new Error(`No item base for slot ${slot}`);
    return base.id;
  };
  const roll = (baseId: string) =>
    rollItem(ITEM_CATALOG, { baseId, itemLevel: options.itemLevel, rarity: rarity() }, rng);

  return {
    mainHand: roll(options.weaponBaseId),
    offHand: roll(randomBase("offHand", (b) => b.fitsWeaponRange === weapon.range)),
    body: roll(randomBase("body")),
    amulet: roll(randomBase("amulet")),
    ring1: roll(randomBase("ring")),
  };
}
