import type {
  LegendaryPowerDefinition,
  RuneDefinition,
  RunewordDefinition,
  TriggerAffixDefinition,
  UniqueDefinition,
} from "@emberheir/sim";
import {
  CINDER_TYRANT,
  GORRAK,
  MOTHER_OF_ROT,
  RIME_WARDEN,
  STORM_HERALD,
  VOIDBORN_MAW,
  ASHEN_HARVESTER,
} from "./enemies";

/** The Warden of each act: its trophies say who dropped them. */
const WARDENS: Readonly<Record<string, string>> = {
  "ashen-fields": GORRAK.name,
  rotwood: MOTHER_OF_ROT.name,
  "ember-wastes": CINDER_TYRANT.name,
  "frost-peaks": RIME_WARDEN.name,
  "storm-spires": STORM_HERALD.name,
  "void-rift": VOIDBORN_MAW.name,
  emberfall: ASHEN_HARVESTER.name,
};

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
  // Id "ash" from before the currency of that name; the Rune is called Bark.
  rune("ash", "Bark", 1, { physicalDamage: 0.06 }, { armor: 6 }),
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

/** A trigger only a Legendary Power grants: fixed magnitude `value`, `perTier` more per tier. */
function powerTrigger(
  id: string,
  name: string,
  condition: TriggerAffixDefinition["condition"],
  effect: TriggerAffixDefinition["effect"],
  value: number,
  perTier: number,
): TriggerAffixDefinition {
  return {
    kind: "trigger",
    id,
    name,
    slots: [],
    weight: 0,
    tags: [],
    condition,
    effect,
    rolls: "magnitude",
    value: { min: value, max: value },
    perTier,
  };
}

// --- Runewords -------------------------------------------------------------------------------

/** The exact Runes in order, in a Normal item with exactly that many Sockets. */
export const RUNEWORDS: readonly RunewordDefinition[] = [
  {
    id: "kindling",
    name: "Kindling",
    runes: ["ash", "moss"],
    slots: ["offHand", "helm"],
    bonuses: { physicalDamage: 0.25, lifesteal: 0.03, life: 20 },
  },
  {
    id: "splinter",
    name: "Splinter",
    runes: ["thorn", "ash", "thorn"],
    slots: ["offHand", "helm"],
    bonuses: { physicalDamage: 0.3, bleedChance: 0.25, attackSpeed: 0.1 },
    triggers: [{ affixId: "crushing-blow", quality: 1 }],
  },
  {
    id: "rotheart",
    name: "Rotheart",
    runes: ["venom", "moss"],
    slots: ["offHand", "helm"],
    bonuses: { poisonChance: 0.35, ailmentDuration: 0.2 },
    rules: { dotLifesteal: 0.15 },
  },
  {
    id: "hearthfire",
    name: "Hearthfire",
    runes: ["ember", "ash", "ember"],
    slots: ["offHand", "helm"],
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
  // Boss trophies (Teil 3): each Warden drops its own mechanic.
  powerTrigger(
    "counter-slam",
    "Counter Slam",
    { kind: "everyNthHitTaken", n: 5 },
    {
      kind: "weaponHit",
    },
    2,
    0.3,
  ),
  powerTrigger(
    "thorn-flurry",
    "Thorn Flurry",
    { kind: "everyNthAttack", n: 3 },
    {
      kind: "extraAttack",
    },
    1,
    0,
  ),
  powerTrigger(
    "tyrants-wrath",
    "Tyrant's Wrath",
    { kind: "lifeBelow", threshold: 0.3 },
    { kind: "buff", stat: "attackSpeed", duration: 6 },
    0.5,
    0.1,
  ),
  powerTrigger(
    "eruption",
    "Eruption",
    { kind: "everySeconds", seconds: 12 },
    { kind: "spellHit", name: "Eruption", damage: { min: 30, max: 45 }, damageType: "fire" },
    1,
    0.6,
  ),
  {
    ...powerTrigger(
      "ice-barrier",
      "Ice Barrier",
      { kind: "lifeBelow", threshold: 0.5 },
      {
        kind: "barrier",
      },
      0.3,
      0.05,
    ),
    cooldown: 10,
  },
  powerTrigger(
    "avalanche",
    "Avalanche",
    { kind: "everyNthAttack", n: 10 },
    {
      kind: "weaponHit",
    },
    3,
    0.4,
  ),
  {
    ...powerTrigger(
      "heralds-bolt",
      "Herald's Bolt",
      { kind: "onCrit" },
      {
        kind: "spellHit",
        name: "Herald's Bolt",
        damage: { min: 14, max: 22 },
        damageType: "lightning",
      },
      1,
      0.6,
    ),
    cooldown: 1,
  },
  powerTrigger(
    "tailwind",
    "Tailwind",
    { kind: "onEvade" },
    { kind: "buff", stat: "attackSpeed", duration: 4, maxStacks: 3 },
    0.08,
    0.01,
  ),
  {
    ...powerTrigger(
      "rift-pulse",
      "Rift Pulse",
      { kind: "onSkillUse" },
      { kind: "spellHit", name: "Rift Pulse", damage: { min: 18, max: 28 }, damageType: "void" },
      1,
      0.6,
    ),
    chance: 0.4,
  },
];

/** Rule-changing powers, one fixed per Legendary item (D3 style). */
export const LEGENDARY_POWERS: readonly LegendaryPowerDefinition[] = [
  {
    id: "blood-echo",
    name: "Blood Echo",
    description: "Your Bleed also Poisons.",
    slots: ["gloves"],
    rules: { ailmentEcho: [{ from: "bleed", to: "poison" }] },
  },
  {
    id: "wildfire",
    name: "Wildfire",
    description: "Your Burn also Shocks.",
    slots: ["offHand", "amulet"],
    rules: { ailmentEcho: [{ from: "burn", to: "shock" }] },
  },
  {
    id: "frostbrand",
    name: "Frostbrand",
    description: "Your Shock also Chills.",
    slots: ["gloves"],
    rules: { ailmentEcho: [{ from: "shock", to: "chill" }] },
  },
  {
    id: "executioner",
    name: "Executioner",
    description: "+40 % damage to enemies below 30 % Life.",
    slots: ["gloves", "ring"],
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
    slots: ["gloves"],
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
  // --- Boss trophies (Teil 3 "Boss-Trophäen") ---
  {
    id: "counter-slam",
    uniqueOnly: true,
    name: "Counter Slam",
    description: "Every 5th hit taken: a Counter Slam for 200 % weapon damage.",
    slots: ["body"],
    trigger: { affixId: "counter-slam", quality: 1 },
  },
  {
    id: "mothers-brood",
    uniqueOnly: true,
    name: "Mother's Brood",
    description: "Your Bleed, Poison, Burn and Corruption deal 30 % more damage.",
    slots: ["belt"],
    rules: { dotDamage: 1.3 },
  },
  {
    id: "thorn-flurry",
    uniqueOnly: true,
    name: "Thorn Flurry",
    description: "Every 3rd attack strikes again.",
    slots: ["gloves"],
    trigger: { affixId: "thorn-flurry", quality: 1 },
  },
  {
    id: "tyrants-wrath",
    uniqueOnly: true,
    name: "Tyrant's Wrath",
    description: "Below 30 % Life: +50 % Attack Speed for 6 s.",
    slots: ["helm"],
    bonuses: { fireResistance: 0.15 },
    trigger: { affixId: "tyrants-wrath", quality: 1 },
  },
  {
    id: "eruption",
    uniqueOnly: true,
    name: "Eruption",
    description: "Every 12 s: an Eruption of fire.",
    slots: ["amulet"],
    trigger: { affixId: "eruption", quality: 1 },
  },
  {
    id: "ice-barrier",
    uniqueOnly: true,
    name: "Ice Barrier",
    description: "Below 50 % Life: a Barrier of 30 % of your Life (every 10 s at most).",
    slots: ["offHand"],
    trigger: { affixId: "ice-barrier", quality: 1 },
  },
  {
    id: "avalanche",
    uniqueOnly: true,
    name: "Avalanche",
    description: "Every 10th attack is an Avalanche for 300 % weapon damage.",
    slots: ["gloves"],
    bonuses: { chillChance: 0.15 },
    trigger: { affixId: "avalanche", quality: 1 },
  },
  {
    id: "heralds-bolt",
    uniqueOnly: true,
    name: "Herald's Bolt",
    description: "Every Crit calls down a bolt of lightning.",
    slots: ["ring"],
    trigger: { affixId: "heralds-bolt", quality: 1 },
  },
  {
    id: "tailwind",
    uniqueOnly: true,
    name: "Tailwind",
    description: "Every evade: +8 % Attack Speed for 4 s, up to 3 times.",
    slots: ["boots"],
    bonuses: { evasion: 0.03 },
    trigger: { affixId: "tailwind", quality: 1 },
  },
  {
    id: "endless-hunger",
    uniqueOnly: true,
    name: "Endless Hunger",
    description: "Your Corruption also Poisons; your ailments heal you for 10 % of their damage.",
    slots: ["amulet"],
    rules: { ailmentEcho: [{ from: "corruption", to: "poison" }], dotLifesteal: 0.1 },
  },
  {
    id: "rift-pulse",
    uniqueOnly: true,
    name: "Rift Pulse",
    description: "Skills have a 40 % chance to send out a Rift Pulse.",
    slots: ["gloves"],
    trigger: { affixId: "rift-pulse", quality: 1 },
  },
  {
    id: "last-harvest",
    uniqueOnly: true,
    name: "Last Harvest",
    description: "+60 % damage to enemies below 35 % Life.",
    slots: ["belt"],
    rules: { execute: { below: 0.35, bonus: 0.6 } },
  },
  {
    id: "stolen-fire",
    uniqueOnly: true,
    name: "Stolen Fire",
    description: "Skills cost 25 % less Heat; your ailments deal 20 % more damage.",
    slots: ["amulet"],
    rules: { skillCostMultiplier: 0.75, dotDamage: 1.2 },
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
    bossOf: "ashen-fields",
    droppedBy: GORRAK.name,
  },
  {
    id: "cinderwick",
    name: "Cinderwick",
    baseId: "ember-focus",
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
    name: "The Heirloom Grips",
    baseId: "gauntlets",
    affixes: [
      { affixId: "physical-damage", quality: q(0.6) },
      { affixId: "attack-speed", quality: q(0.6) },
      { affixId: "crit-chance", quality: q(0.5) },
    ],
    powerId: "executioner",
    minItemLevel: 3,
    flavor: "Every Heir before you wore them. Most of them still missed.",
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
    baseId: "leather-gloves",
    affixes: [
      { affixId: "poison-chance", quality: q(0.7) },
      { affixId: "crit-chance", quality: q(0.6) },
      { affixId: "attack-speed", quality: q(0.5) },
    ],
    powerId: "blood-echo",
    minItemLevel: 5,
    flavor: "Pulled from the Mother of Rot. It was not hers.",
    bossOf: "rotwood",
    droppedBy: MOTHER_OF_ROT.name,
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

/** Boss trophies: each Warden drops two or three of its own (about 10 % per kill). */
export const BOSS_TROPHIES: readonly UniqueDefinition[] = [
  trophy(
    "ashmaw-pauldron",
    "Ashmaw Pauldron",
    "chain-mail",
    "ashen-fields",
    "counter-slam",
    [
      ["armor", 0.7],
      ["life", 0.6],
      ["strength", 0.6],
    ],
    "Gorrak wore it to every fight. It remembers all of them.",
  ),
  trophy(
    "rotmothers-cradle",
    "Rotmother's Cradle",
    "sash",
    "rotwood",
    "mothers-brood",
    [
      ["poison-chance", 0.7],
      ["ailment-duration", 0.6],
      ["life", 0.5],
    ],
    "Something inside it still hums a lullaby.",
  ),
  trophy(
    "thornsong",
    "Thornsong",
    "leather-gloves",
    "rotwood",
    "thorn-flurry",
    [
      ["bleed-chance", 0.7],
      ["attack-speed", 0.6],
      ["crit-chance", 0.5],
    ],
    "It sings when it cuts. Badly.",
  ),
  trophy(
    "tyrants-crown",
    "Tyrant's Crown",
    "iron-helm",
    "ember-wastes",
    "tyrants-wrath",
    [
      ["life", 0.7],
      ["armor", 0.6],
      ["fire-resistance", 0.7],
    ],
    "Heavy is the head. Hot, too.",
  ),
  trophy(
    "eruption-core",
    "Eruption Core",
    "ember-pendant",
    "ember-wastes",
    "eruption",
    [
      ["elemental-damage", 0.7],
      ["burn-chance", 0.6],
      ["intelligence", 0.6],
    ],
    "Keep it away from the wagon.",
  ),
  trophy(
    "wardenshell",
    "Wardenshell",
    "round-shield",
    "frost-peaks",
    "ice-barrier",
    [
      ["block-chance", 0.7],
      ["cold-resistance", 0.7],
      ["life", 0.6],
    ],
    "Cold to the touch. Colder to the blow.",
  ),
  trophy(
    "avalanche-bow",
    "Avalanche Grips",
    "gauntlets",
    "frost-peaks",
    "avalanche",
    [
      ["physical-damage", 0.7],
      ["chill-chance", 0.6],
      ["dexterity", 0.6],
    ],
    "Draw slowly. The mountain is listening.",
  ),
  trophy(
    "heraldic-coil",
    "Heraldic Coil",
    "iron-ring",
    "storm-spires",
    "heralds-bolt",
    [
      ["crit-chance", 0.7],
      ["lightning-resistance", 0.6],
      ["attack-speed", 0.5],
    ],
    "It announces you. Loudly.",
  ),
  trophy(
    "stormcallers-greaves",
    "Stormcaller's Greaves",
    "greaves",
    "storm-spires",
    "tailwind",
    [
      ["agility", 0.7],
      ["evasion", 0.6],
      ["life", 0.5],
    ],
    "The wind follows them like a dog.",
  ),
  trophy(
    "maws-hunger",
    "Maw's Hunger",
    "bone-amulet",
    "void-rift",
    "endless-hunger",
    [
      ["corruption-chance", 0.7],
      ["ailment-duration", 0.6],
      ["void-resistance", 0.6],
    ],
    "It is never full. Neither are you, now.",
  ),
  trophy(
    "riftwalker-wraps",
    "Riftwalker Wraps",
    "silk-wraps",
    "void-rift",
    "rift-pulse",
    [
      ["elemental-damage", 0.7],
      ["heat-gain", 0.6],
      ["wisdom", 0.6],
    ],
    "Your hands are somewhere else. Mostly.",
  ),
  trophy(
    "reapers-due",
    "Reaper's Due",
    "heavy-belt",
    "emberfall",
    "last-harvest",
    [
      ["life", 0.8],
      ["physical-damage", 0.6],
      ["all-resistance", 0.6],
    ],
    "Everything is harvested in the end.",
  ),
  trophy(
    "the-stolen-flame",
    "The Stolen Flame",
    "ember-pendant",
    "emberfall",
    "stolen-fire",
    [
      ["elemental-damage", 0.8],
      ["heat-gain", 0.7],
      ["corruption-chance", 0.6],
    ],
    "The first Heir took it. Every Heir since has paid for it.",
  ),
];

function trophy(
  id: string,
  name: string,
  baseId: string,
  bossOf: string,
  powerId: string,
  affixes: readonly (readonly [string, number])[],
  flavor: string,
): UniqueDefinition {
  return {
    id,
    name,
    baseId,
    affixes: affixes.map(([affixId, min]) => ({ affixId, quality: q(min) })),
    powerId,
    minItemLevel: 1,
    flavor,
    bossOf,
    ...(WARDENS[bossOf] ? { droppedBy: WARDENS[bossOf] } : {}),
  };
}
