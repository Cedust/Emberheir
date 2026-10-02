import type {
  LegendaryPowerDefinition,
  RuneDefinition,
  RunewordDefinition,
  TriggerAffixDefinition,
  UniqueDefinition,
} from "@emberheir/sim";

/**
 * M8 "Legendär" (docs/design/legendary-runes-v1.md): Runes, Runewords, Legendary Powers and the
 * first Uniques. Numbers are Tier 1 starting values for the balance CLI.
 */

// --- Runes -----------------------------------------------------------------------------------

/**
 * Eight Runes, lowest rank first. Act 1 drops up to rank 3, Act 2 up to rank 5; each Prestige
 * reaches two ranks higher. Weapon bonus first, armor bonus (Off Hand, Helm, Body) second.
 */
export const RUNES: readonly RuneDefinition[] = [
  rune("ash", "Ash", 1, { physicalDamage: 0.06 }, { armor: 6 }),
  rune("moss", "Moss", 2, { lifesteal: 0.015 }, { life: 12 }),
  rune("thorn", "Thorn", 3, { bleedChance: 0.06 }, { thorns: 2 }),
  rune("venom", "Venom", 4, { poisonChance: 0.08 }, { tenacity: 0.06 }),
  rune("ember", "Ember", 5, { elementalDamage: 0.08 }, { fireResistance: 0.1 }),
  rune("rime", "Rime", 6, { chillChance: 0.08 }, { coldResistance: 0.1 }),
  rune("volt", "Volt", 7, { attackSpeed: 0.05 }, { lightningResistance: 0.1 }),
  rune("dusk", "Dusk", 8, { critChance: 0.03 }, { allResistance: 0.06 }),
];

function rune(
  id: string,
  name: string,
  rank: number,
  weapon: RuneDefinition["bonuses"]["weapon"],
  armor: RuneDefinition["bonuses"]["armor"],
): RuneDefinition {
  return { id, name, rank, bonuses: { weapon, armor } };
}

// --- Runewords -------------------------------------------------------------------------------

/** The exact Runes in order, in a Normal item with exactly that many Sockets. */
export const RUNEWORDS: readonly RunewordDefinition[] = [
  {
    id: "kindling",
    name: "Kindling",
    runes: ["ash", "moss"],
    slots: ["mainHand"],
    bonuses: { physicalDamage: 0.25, lifesteal: 0.03, life: 20 },
  },
  {
    id: "splinter",
    name: "Splinter",
    runes: ["thorn", "ash", "thorn"],
    slots: ["mainHand"],
    bonuses: { physicalDamage: 0.3, bleedChance: 0.25, attackSpeed: 0.1 },
    triggers: [{ affixId: "crushing-blow", quality: 1 }],
  },
  {
    id: "rotheart",
    name: "Rotheart",
    runes: ["venom", "moss"],
    slots: ["mainHand"],
    bonuses: { poisonChance: 0.35, ailmentDuration: 0.2 },
    rules: { dotLifesteal: 0.15 },
  },
  {
    id: "hearthfire",
    name: "Hearthfire",
    runes: ["ember", "ash", "ember"],
    slots: ["mainHand"],
    bonuses: { elementalDamage: 0.35, burnChance: 0.25, heatGain: 0.1 },
    triggers: [{ affixId: "flame-pulse", quality: 1 }],
  },
  {
    id: "bulwark",
    name: "Bulwark",
    runes: ["ash", "moss", "ash"],
    slots: ["offHand"],
    bonuses: { armor: 25, blockChance: 0.1, life: 30 },
    triggers: [{ affixId: "iron-will", quality: 1 }],
  },
  {
    id: "warden",
    name: "Warden",
    runes: ["moss", "ash"],
    slots: ["helm"],
    bonuses: { life: 30, allResistance: 0.08, tenacity: 0.1 },
  },
  {
    id: "bramble",
    name: "Bramble",
    runes: ["thorn", "moss", "thorn"],
    slots: ["body"],
    bonuses: { thorns: 6, armor: 20, life: 40 },
  },
  {
    id: "hearth",
    name: "Hearth",
    runes: ["moss", "ember"],
    slots: ["body", "helm"],
    bonuses: { life: 50, fireResistance: 0.2 },
    triggers: [{ affixId: "second-wind", quality: 0.8 }],
  },
  {
    id: "embersight",
    name: "Embersight",
    runes: ["ember", "venom"],
    slots: ["helm", "offHand"],
    bonuses: { elementalDamage: 0.2, heatGain: 0.1 },
    triggers: [{ affixId: "ember-mind", quality: 1 }],
  },
  {
    id: "stormward",
    name: "Stormward",
    runes: ["ember", "volt", "rime", "dusk"],
    slots: ["body"],
    bonuses: { allResistance: 0.2, attackSpeed: 0.15, life: 60 },
    triggers: [{ affixId: "static-charge", quality: 1 }],
  },
];

// --- Legendary Powers ------------------------------------------------------------------------

/** Trigger affixes only Legendary Powers grant (weight 0: they never roll on their own). */
export const POWER_TRIGGERS: readonly TriggerAffixDefinition[] = [
  {
    kind: "trigger",
    id: "ember-shell",
    name: "Ember Shell",
    slots: [],
    weight: 0,
    tags: [],
    condition: { kind: "fightStart" },
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.25, max: 0.25 },
    perTier: 0.1,
  },
  {
    kind: "trigger",
    id: "storm-step",
    name: "Storm Step",
    slots: [],
    weight: 0,
    tags: [],
    condition: { kind: "onEvade" },
    cooldown: 1,
    effect: {
      kind: "spellHit",
      name: "Storm Step",
      damage: { min: 8, max: 14 },
      damageType: "lightning",
    },
    rolls: "magnitude",
    value: { min: 1, max: 1 },
    perTier: 1,
  },
  {
    kind: "trigger",
    id: "last-stand",
    name: "Last Stand",
    slots: [],
    weight: 0,
    tags: [],
    condition: { kind: "lifeBelow", threshold: 0.35 },
    oncePerFight: true,
    effect: { kind: "barrier" },
    rolls: "magnitude",
    value: { min: 0.4, max: 0.4 },
    perTier: 0.1,
  },
];

/** Rule-changing powers, one fixed per Legendary item (D3 style). */
export const LEGENDARY_POWERS: readonly LegendaryPowerDefinition[] = [
  {
    id: "blood-echo",
    name: "Blood Echo",
    description: "Your Bleed also Poisons.",
    slots: ["mainHand", "gloves"],
    rules: { ailmentEcho: [{ from: "bleed", to: "poison" }] },
  },
  {
    id: "wildfire",
    name: "Wildfire",
    description: "Your Burn also Shocks.",
    slots: ["mainHand", "offHand", "amulet"],
    rules: { ailmentEcho: [{ from: "burn", to: "shock" }] },
  },
  {
    id: "frostbrand",
    name: "Frostbrand",
    description: "Your Shock also Chills.",
    slots: ["mainHand", "gloves"],
    rules: { ailmentEcho: [{ from: "shock", to: "chill" }] },
  },
  {
    id: "executioner",
    name: "Executioner",
    description: "+40 % damage to enemies below 30 % Life.",
    slots: ["mainHand", "gloves", "ring"],
    rules: { execute: { below: 0.3, bonus: 0.4 } },
  },
  {
    id: "leech-bloom",
    name: "Leech Bloom",
    description: "Your Bleed, Poison and Burn heal you for 20 % of their damage.",
    slots: ["body", "amulet", "ring"],
    rules: { dotLifesteal: 0.2 },
  },
  {
    id: "undying-heat",
    name: "Undying Heat",
    description: "Cooling Heat no longer cools down.",
    slots: ["helm", "belt"],
    rules: { noHeatDecay: true },
  },
  {
    id: "smoldering-focus",
    name: "Smoldering Focus",
    description: "Skills cost 20 % less Heat.",
    slots: ["offHand", "helm", "amulet"],
    rules: { skillCostMultiplier: 0.8 },
  },
  {
    id: "heavy-hand",
    name: "Heavy Hand",
    description: "Your Default Attack deals 30 % more damage.",
    slots: ["mainHand", "gloves"],
    rules: { defaultAttackDamage: 1.3 },
  },
  {
    id: "sanguine-crit",
    name: "Sanguine Crit",
    description: "Every Crit makes the enemy Bleed.",
    slots: ["ring", "amulet"],
    rules: { critsApplyBleed: true },
  },
  {
    id: "ember-shell",
    name: "Ember Shell",
    description: "Every fight starts with a Barrier of 25 % of your Life.",
    slots: ["body", "offHand", "belt"],
    trigger: { affixId: "ember-shell", quality: 1 },
  },
  {
    id: "storm-step",
    name: "Storm Step",
    description: "Every evade strikes the enemy with lightning.",
    slots: ["boots"],
    bonuses: { evasion: 0.03 },
    trigger: { affixId: "storm-step", quality: 1 },
  },
  {
    id: "last-stand",
    name: "Last Stand",
    description: "Once per fight, below 35 % Life: a Barrier of 40 % of your Life.",
    slots: ["belt", "body"],
    trigger: { affixId: "last-stand", quality: 1 },
  },
  {
    id: "quickened-heat",
    name: "Quickened Heat",
    description: "+15 % Heat Gain and +10 % Attack Speed.",
    slots: ["boots", "gloves"],
    bonuses: { heatGain: 0.15, attackSpeed: 0.1 },
  },
];

// --- Uniques ---------------------------------------------------------------------------------

const q = (min: number, max = 1) => ({ min, max });

/** Hand-made items with fixed affixes. Bosses and Marisha's gambles can give them. */
export const UNIQUES: readonly UniqueDefinition[] = [
  {
    id: "gorraks-knuckles",
    name: "Gorrak's Knuckles",
    baseId: "gauntlets",
    affixes: [
      { affixId: "strength", quality: q(0.7) },
      { affixId: "armor", quality: q(0.6) },
      { affixId: "life", quality: q(0.6) },
    ],
    powerId: "heavy-hand",
    minItemLevel: 1,
    flavor: "Still warm. Still angry.",
  },
  {
    id: "cinderwick",
    name: "Cinderwick",
    baseId: "fire-wand",
    affixes: [
      { affixId: "elemental-damage", quality: q(0.6) },
      { affixId: "burn-chance", quality: q(0.7) },
      { affixId: "heat-gain", quality: q(0.5) },
    ],
    powerId: "wildfire",
    minItemLevel: 1,
    flavor: "It never goes out. Nan tried.",
  },
  {
    id: "nans-lucky-ring",
    name: "Nan's Lucky Ring",
    baseId: "garnet-ring",
    affixes: [
      { affixId: "life", quality: q(0.6) },
      { affixId: "all-resistance", quality: q(0.6) },
      { affixId: "crit-chance", quality: q(0.6) },
    ],
    powerId: "sanguine-crit",
    minItemLevel: 1,
    flavor: "She says it's lucky. She also says she's four hundred.",
  },
  {
    id: "heirloom-blade",
    name: "The Heirloom Blade",
    baseId: "sword",
    affixes: [
      { affixId: "physical-damage", quality: q(0.6) },
      { affixId: "added-weapon-damage", quality: q(0.6) },
      { affixId: "crit-chance", quality: q(0.5) },
    ],
    powerId: "executioner",
    minItemLevel: 3,
    flavor: "Every Heir before you swung it. Most of them missed.",
  },
  {
    id: "ashwalkers",
    name: "Ashwalkers",
    baseId: "leather-boots",
    affixes: [
      { affixId: "agility", quality: q(0.6) },
      { affixId: "evasion", quality: q(0.6) },
      { affixId: "life", quality: q(0.5) },
    ],
    powerId: "storm-step",
    minItemLevel: 3,
    flavor: "They leave footprints that smoke.",
  },
  {
    id: "rotfang",
    name: "Rotfang",
    baseId: "dagger",
    affixes: [
      { affixId: "poison-chance", quality: q(0.7) },
      { affixId: "crit-chance", quality: q(0.6) },
      { affixId: "attack-speed", quality: q(0.5) },
    ],
    powerId: "blood-echo",
    minItemLevel: 5,
    flavor: "Pulled from the Mother of Rot. It was not hers.",
  },
  {
    id: "barkhide-bulwark",
    name: "Barkhide Bulwark",
    baseId: "round-shield",
    affixes: [
      { affixId: "block-chance", quality: q(0.7) },
      { affixId: "armor", quality: q(0.7) },
      { affixId: "thorns", quality: q(0.6) },
    ],
    powerId: "ember-shell",
    minItemLevel: 5,
    flavor: "The bark still grows. Slowly. Toward you.",
  },
  {
    id: "mossgrown-mail",
    name: "Mossgrown Mail",
    baseId: "chain-mail",
    affixes: [
      { affixId: "life", quality: q(0.7) },
      { affixId: "tenacity", quality: q(0.7) },
      { affixId: "poison-chance", quality: q(0.5) },
    ],
    powerId: "leech-bloom",
    minItemLevel: 6,
    flavor: "Something lives in the left sleeve. It is friendly.",
  },
];
