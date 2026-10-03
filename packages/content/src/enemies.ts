import type { EnemyDefinition } from "@emberheir/sim";
import {
  ARC_DASH,
  ASHFALL,
  AVALANCHE,
  CONSUME,
  FORKED_BOLT,
  HARVEST_SWING,
  HEX,
  LAST_HARVEST,
  RIFT_SNAP,
  SOUL_REAP,
  THUNDERCLAP,
  VOID_LANCE,
  BLIGHT_SPIT,
  CINDER_SPIT,
  DEVOUR,
  ERUPTION,
  FIREBALL,
  FLAME_DASH,
  GLACIAL_MEND,
  GORRAK_SLAM,
  HEAVY_SWING,
  ICE_BOLT,
  MOSS_MEND,
  OBSIDIAN_SHELL,
  POUNCE,
  QUICK_CUTS,
  RAKE,
  ROT_SPRAY,
} from "./skills";
import {
  CINDER_LANCE,
  COPPER_FISTS,
  GLOOM_THREADS,
  HARVEST_SCYTHE,
  HERALD_SPEAR,
  HOLLOW_FIST,
  HOUND_FANGS,
  MAW_JAWS,
  REVENANT_BLADE,
  RIFT_CLAWS,
  SEER_EYE,
  STORM_ROD,
  STORM_TALONS,
  THUNDER_MAUL,
  WRAITH_FLAME,
  BRANCH_FLAIL,
  CINDER_ROD,
  EMBER_CLAWS,
  FROST_FANGS,
  GLACIER_MAUL,
  ICE_SHARDS,
  MAGMA_FIST,
  OBSIDIAN_GLAIVE,
  PIT_MAUL,
  PYRE_STAFF,
  RIME_WAND,
  ROT_LASH,
  RUSTY_CLEAVER,
  SPORE_SAC,
  THORN_CLAWS,
  TWIN_SHIVS,
  TYRANT_BRAND,
  WARDEN_HALBERD,
  WARDEN_STAFF,
} from "./weapons";

/**
 * Act 1 (Ashen Fields) enemies, one per PoC archetype (docs/design/gegner-bosse-v1.md
 * section 3). Values are for Monster Level 1. Playtest 1: life −36 % for the rarer Act 1 loot.
 */
export const ASHEN_BRUTE: EnemyDefinition = {
  id: "ashen-brute",
  name: "Ashen Brute",
  archetype: "brute",
  description: "Lots of Life and Armor, slow and heavy hits.",
  attributes: { strength: 8, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 10 },
  weapon: RUSTY_CLEAVER,
  skills: [HEAVY_SWING],
  baseLife: 344,
};

export const ASHEN_SKIRMISHER: EnemyDefinition = {
  id: "ashen-skirmisher",
  name: "Ashen Skirmisher",
  archetype: "skirmisher",
  description: "Fast and hard to hit.",
  attributes: { strength: 4, dexterity: 8, agility: 15, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: TWIN_SHIVS,
  skills: [QUICK_CUTS],
  baseLife: 289,
  bonuses: { evasion: 0.12 },
};

/**
 * The Ember Thief (Spielspaß Teil 3 C): a rare guest on normal stages from Act 2 on, carrying a
 * sack of stolen loot. Little Life and a weak blade, but it runs away after 15 seconds.
 */
export const EMBER_THIEF: EnemyDefinition = {
  id: "ember-thief",
  name: "Ember Thief",
  archetype: "skirmisher",
  description: "Runs off with a sack of loot. Catch it.",
  attributes: { strength: 0, dexterity: 4, agility: 12, intelligence: 0, wisdom: 0, vitality: 2 },
  weapon: { ...TWIN_SHIVS, id: "thief-knife", damage: { min: 1, max: 3 } },
  skills: [],
  baseLife: 175,
  bonuses: { evasion: 0.1 },
};

export const CINDER_CASTER: EnemyDefinition = {
  id: "cinder-caster",
  name: "Cinder Caster",
  archetype: "caster",
  description: "Fire damage and Burn, but little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 10, wisdom: 6, vitality: 4 },
  weapon: CINDER_ROD,
  skills: [CINDER_SPIT],
  baseLife: 268,
};

export const ACT1_ENEMIES: readonly EnemyDefinition[] = [
  ASHEN_BRUTE,
  ASHEN_SKIRMISHER,
  CINDER_CASTER,
];

/**
 * Act 1 boss (docs/design/gegner-bosse-v1.md section 6): a slow brute whose Slam is announced
 * every 10 s. It teaches Telegraphs and defensive play.
 */
export const GORRAK: EnemyDefinition = {
  id: "gorrak",
  name: "Gorrak, the Pit Brute",
  archetype: "brute",
  description: "Announces a crushing Slam every 10 seconds.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 14 },
  weapon: PIT_MAUL,
  skills: [HEAVY_SWING],
  baseLife: 332,
  boss: true,
  telegraphs: [{ skill: GORRAK_SLAM, interval: 10, windup: 2 }],
};

/**
 * Act 2 (Rotwood) enemies: Bleed and Poison (docs/design/gegner-bosse-v1.md sections 1 and 3).
 * Four archetypes, each asks a new question: Tenacity, big hits against Thorns, Burn against
 * healing. Values are for Monster Level 1 like Act 1.
 */
export const ROTWOOD_STALKER: EnemyDefinition = {
  id: "rotwood-stalker",
  name: "Rotwood Stalker",
  archetype: "skirmisher",
  description: "Fast claws that open bleeding wounds.",
  attributes: { strength: 4, dexterity: 8, agility: 14, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: THORN_CLAWS,
  skills: [RAKE],
  baseLife: 240,
  bonuses: { evasion: 0.1 },
};

export const BLIGHT_SPITTER: EnemyDefinition = {
  id: "blight-spitter",
  name: "Blight Spitter",
  archetype: "afflicter",
  description: "Piles Poison on you from afar.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 6, wisdom: 8, vitality: 4 },
  weapon: SPORE_SAC,
  skills: [BLIGHT_SPIT],
  baseLife: 215,
};

export const BARKHIDE: EnemyDefinition = {
  id: "barkhide",
  name: "Barkhide",
  archetype: "thornback",
  description: "Thorny bark hurts every hand that strikes it.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 10 },
  weapon: BRANCH_FLAIL,
  skills: [HEAVY_SWING],
  baseLife: 290,
  bonuses: { armor: 15, thorns: 1 },
};

export const MOSSBOUND_WARDEN: EnemyDefinition = {
  id: "mossbound-warden",
  name: "Mossbound Warden",
  archetype: "warden",
  description: "Blocks and heals itself. Burn halves the healing.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: WARDEN_STAFF,
  skills: [MOSS_MEND],
  baseLife: 250,
  bonuses: { blockChance: 0.15, blockValue: 1 },
};

export const ACT2_ENEMIES: readonly EnemyDefinition[] = [
  ROTWOOD_STALKER,
  BLIGHT_SPITTER,
  BARKHIDE,
  MOSSBOUND_WARDEN,
];

/**
 * Act 2 boss (docs/design/gegner-bosse-v1.md section 6): piles Poison on the hero and feeds on
 * the rot every 14 s to heal. It teaches Tenacity and Anti-Heal (Burn).
 */
export const MOTHER_OF_ROT: EnemyDefinition = {
  id: "mother-of-rot",
  name: "Mother of Rot",
  archetype: "afflicter",
  description: "Piles Poison on you and feeds to heal every 14 seconds.",
  attributes: { strength: 6, dexterity: 4, agility: 2, intelligence: 6, wisdom: 8, vitality: 14 },
  weapon: ROT_LASH,
  skills: [ROT_SPRAY],
  baseLife: 300,
  boss: true,
  telegraphs: [{ skill: DEVOUR, interval: 14, windup: 2.5 }],
};

/**
 * Act 3 (Ember Wastes) enemies: Fire and Burn. Fire Resistance is the answer the act asks for.
 * Values are for Monster Level 1 like Act 1.
 */
export const CINDER_IMP: EnemyDefinition = {
  id: "cinder-imp",
  name: "Cinder Imp",
  archetype: "skirmisher",
  description: "Quick, burning claws.",
  attributes: { strength: 4, dexterity: 8, agility: 14, intelligence: 4, wisdom: 2, vitality: 6 },
  weapon: EMBER_CLAWS,
  skills: [FLAME_DASH],
  baseLife: 265,
  bonuses: { evasion: 0.1, fireResistance: 0.3 },
};

export const MAGMA_BRUTE: EnemyDefinition = {
  id: "magma-brute",
  name: "Magma Brute",
  archetype: "brute",
  description: "Molten fists, a crust like armor.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 2, wisdom: 2, vitality: 12 },
  weapon: MAGMA_FIST,
  skills: [HEAVY_SWING],
  baseLife: 360,
  bonuses: { armor: 20, fireResistance: 0.4 },
};

export const FLAME_CALLER: EnemyDefinition = {
  id: "flame-caller",
  name: "Flame Caller",
  archetype: "caster",
  description: "Hurls Fireballs from afar. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 6, vitality: 4 },
  weapon: PYRE_STAFF,
  skills: [FIREBALL],
  baseLife: 240,
  bonuses: { fireResistance: 0.3 },
};

export const OBSIDIAN_GUARD: EnemyDefinition = {
  id: "obsidian-guard",
  name: "Obsidian Guard",
  archetype: "warden",
  description: "Blocks, hardens its shell and hides behind a Barrier when hurt.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: OBSIDIAN_GLAIVE,
  skills: [OBSIDIAN_SHELL],
  baseLife: 285,
  bonuses: { blockChance: 0.15, blockValue: 1, fireResistance: 0.3 },
  triggers: [
    {
      id: "obsidian-barrier",
      name: "Obsidian Barrier",
      condition: { kind: "lifeBelow", threshold: 0.5 },
      oncePerFight: true,
      effect: { kind: "barrier", fraction: 0.15 },
    },
  ],
};

export const ACT3_ENEMIES: readonly EnemyDefinition[] = [
  CINDER_IMP,
  MAGMA_BRUTE,
  FLAME_CALLER,
  OBSIDIAN_GUARD,
];

/**
 * Act 3 boss (docs/design/gegner-bosse-v1.md section 6): a Fire Aura burns the hero all fight
 * long, an Eruption is announced every 12 s, and below 30 % Life it Enrages. It teaches Fire
 * Resistance and saving a burst for the end.
 */
export const CINDER_TYRANT: EnemyDefinition = {
  id: "cinder-tyrant",
  name: "Cinder Tyrant",
  archetype: "brute",
  description: "A Fire Aura, an Eruption every 12 seconds, and Enrage below 30 % Life.",
  attributes: { strength: 10, dexterity: 4, agility: 2, intelligence: 6, wisdom: 4, vitality: 14 },
  weapon: TYRANT_BRAND,
  skills: [FIREBALL],
  baseLife: 370,
  boss: true,
  bonuses: { fireResistance: 0.4 },
  telegraphs: [{ skill: ERUPTION, interval: 12, windup: 2 }],
  triggers: [
    {
      id: "fire-aura",
      name: "Fire Aura",
      condition: { kind: "everySeconds", seconds: 2 },
      effect: {
        kind: "spellHit",
        name: "Fire Aura",
        damage: { min: 0.6, max: 0.9 },
        damageType: "fire",
      },
    },
    {
      id: "tyrant-enrage",
      name: "Enrage",
      condition: { kind: "lifeBelow", threshold: 0.3 },
      oncePerFight: true,
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.5, duration: 999 },
    },
  ],
};

/**
 * Act 4 (Frost Peaks) enemies: Cold and Chill. Chill slows the hero's attacks and Heat, so Cold
 * Resistance, Tenacity and Heat Gain help.
 */
export const FROST_WOLF: EnemyDefinition = {
  id: "frost-wolf",
  name: "Frost Wolf",
  archetype: "skirmisher",
  description: "Fast bites that Chill.",
  attributes: { strength: 6, dexterity: 6, agility: 14, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: FROST_FANGS,
  skills: [POUNCE],
  baseLife: 290,
  bonuses: { evasion: 0.1, coldResistance: 0.3 },
};

export const ICE_GOLEM: EnemyDefinition = {
  id: "ice-golem",
  name: "Ice Golem",
  archetype: "thornback",
  description: "Jagged ice hurts every hand that strikes it.",
  attributes: { strength: 10, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 12 },
  weapon: GLACIER_MAUL,
  skills: [HEAVY_SWING],
  baseLife: 360,
  bonuses: { armor: 20, thorns: 1, coldResistance: 0.4 },
};

export const RIME_WITCH: EnemyDefinition = {
  id: "rime-witch",
  name: "Rime Witch",
  archetype: "caster",
  description: "Ice Bolts that always Chill. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 6, vitality: 4 },
  weapon: RIME_WAND,
  skills: [ICE_BOLT],
  baseLife: 260,
  bonuses: { coldResistance: 0.3 },
};

export const FROST_WARDEN: EnemyDefinition = {
  id: "frost-warden",
  name: "Frost Warden",
  archetype: "warden",
  description: "Blocks, heals, and raises a wall of ice every 10 seconds.",
  attributes: { strength: 6, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 8 },
  weapon: ICE_SHARDS,
  skills: [GLACIAL_MEND],
  baseLife: 305,
  bonuses: { blockChance: 0.15, blockValue: 1, coldResistance: 0.3 },
  triggers: [
    {
      id: "ice-wall",
      name: "Ice Wall",
      condition: { kind: "everySeconds", seconds: 10 },
      effect: { kind: "barrier", fraction: 0.08 },
    },
  ],
};

export const ACT4_ENEMIES: readonly EnemyDefinition[] = [
  FROST_WOLF,
  ICE_GOLEM,
  RIME_WITCH,
  FROST_WARDEN,
];

/**
 * Act 4 boss (docs/design/gegner-bosse-v1.md section 6): Chills the hero with every swing,
 * hides behind a big Barrier at 75 / 50 / 25 % Life and brings down an Avalanche every 12 s.
 * It teaches Heat management and breaking a Barrier.
 */
export const RIME_WARDEN: EnemyDefinition = {
  id: "rime-warden",
  name: "Rime Warden",
  archetype: "warden",
  description: "Chills you, hides behind ice at 75, 50 and 25 % Life, Avalanche every 12 seconds.",
  attributes: { strength: 8, dexterity: 4, agility: 2, intelligence: 6, wisdom: 6, vitality: 14 },
  weapon: WARDEN_HALBERD,
  skills: [ICE_BOLT],
  baseLife: 385,
  boss: true,
  bonuses: { blockChance: 0.1, blockValue: 1, coldResistance: 0.4 },
  telegraphs: [{ skill: AVALANCHE, interval: 12, windup: 2.5 }],
  triggers: [0.75, 0.5, 0.25].map((threshold) => ({
    id: `ice-barrier-${threshold * 100}`,
    name: "Ice Barrier",
    condition: { kind: "lifeBelow", threshold } as const,
    oncePerFight: true,
    effect: { kind: "barrier", fraction: 0.15 } as const,
  })),
};

/**
 * Act 5 (Storm Spires) enemies: Lightning and Shock. Shock makes every hit hurt more, so
 * Lightning Resistance and Tenacity are the answers.
 */
export const STORM_SPRITE: EnemyDefinition = {
  id: "storm-sprite",
  name: "Storm Sprite",
  archetype: "skirmisher",
  description: "Darts in, crackling.",
  attributes: { strength: 4, dexterity: 8, agility: 16, intelligence: 4, wisdom: 2, vitality: 6 },
  weapon: STORM_TALONS,
  skills: [ARC_DASH],
  baseLife: 260,
  bonuses: { evasion: 0.12, lightningResistance: 0.3 },
};

export const THUNDER_BRUTE: EnemyDefinition = {
  id: "thunder-brute",
  name: "Thunder Brute",
  archetype: "brute",
  description: "Slow, crushing blows that Shock.",
  attributes: { strength: 12, dexterity: 2, agility: 0, intelligence: 2, wisdom: 2, vitality: 12 },
  weapon: THUNDER_MAUL,
  skills: [HEAVY_SWING],
  baseLife: 340,
  bonuses: { armor: 22, lightningResistance: 0.4 },
};

export const STORM_CALLER: EnemyDefinition = {
  id: "storm-caller",
  name: "Storm Caller",
  archetype: "caster",
  description: "Forked lightning from afar. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 6, vitality: 4 },
  weapon: STORM_ROD,
  skills: [FORKED_BOLT],
  baseLife: 245,
  bonuses: { lightningResistance: 0.3 },
};

export const STATIC_GOLEM: EnemyDefinition = {
  id: "static-golem",
  name: "Static Golem",
  archetype: "thornback",
  description: "Every 5th hit it takes jumps back at you.",
  attributes: { strength: 8, dexterity: 2, agility: 0, intelligence: 4, wisdom: 2, vitality: 12 },
  weapon: COPPER_FISTS,
  skills: [HEAVY_SWING],
  baseLife: 340,
  bonuses: { armor: 18, thorns: 1, lightningResistance: 0.4 },
  triggers: [
    {
      id: "static-discharge",
      name: "Static Discharge",
      condition: { kind: "everyNthHitTaken", n: 5 },
      effect: { kind: "reflect", fraction: 0.4, cap: 0.04, damageType: "lightning" },
    },
  ],
};

export const ACT5_ENEMIES: readonly EnemyDefinition[] = [
  STORM_SPRITE,
  THUNDER_BRUTE,
  STORM_CALLER,
  STATIC_GOLEM,
];

/**
 * Act 5 boss (docs/design/gegner-bosse-v1.md section 6): Shocks you, reflects every 5th hit and
 * claps thunder every 11 s. It teaches tempo against big hits.
 */
export const STORM_HERALD: EnemyDefinition = {
  id: "storm-herald",
  name: "Storm Herald",
  archetype: "caster",
  description: "Shocks you, sends every 5th hit back, Thunderclap every 11 seconds.",
  attributes: { strength: 8, dexterity: 6, agility: 4, intelligence: 10, wisdom: 6, vitality: 14 },
  weapon: HERALD_SPEAR,
  skills: [FORKED_BOLT],
  baseLife: 410,
  boss: true,
  bonuses: { lightningResistance: 0.4 },
  telegraphs: [{ skill: THUNDERCLAP, interval: 11, windup: 2 }],
  triggers: [
    {
      id: "herald-mirror",
      name: "Storm Mirror",
      condition: { kind: "everyNthHitTaken", n: 5 },
      effect: { kind: "reflect", fraction: 0.8, cap: 0.08, damageType: "lightning" },
    },
  ],
};

/**
 * Act 6 (Void Rift) enemies: Void and Corruption. Corruption grows the longer it sits on you,
 * so killing fast and Tenacity both help.
 */
export const RIFT_STALKER: EnemyDefinition = {
  id: "rift-stalker",
  name: "Rift Stalker",
  archetype: "skirmisher",
  description: "Claws that leave a little nothing behind.",
  attributes: { strength: 6, dexterity: 8, agility: 14, intelligence: 2, wisdom: 2, vitality: 6 },
  weapon: RIFT_CLAWS,
  skills: [QUICK_CUTS],
  baseLife: 275,
  bonuses: { evasion: 0.12, voidResistance: 0.3 },
};

export const HOLLOW_BRUTE: EnemyDefinition = {
  id: "hollow-brute",
  name: "Hollow Brute",
  archetype: "brute",
  description: "Empty inside, heavy outside.",
  attributes: { strength: 12, dexterity: 2, agility: 0, intelligence: 0, wisdom: 2, vitality: 14 },
  weapon: HOLLOW_FIST,
  skills: [HEAVY_SWING],
  baseLife: 385,
  bonuses: { armor: 24, voidResistance: 0.4 },
};

export const VOID_SEER: EnemyDefinition = {
  id: "void-seer",
  name: "Void Seer",
  archetype: "caster",
  description: "Void Lances that always Corrupt. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 12, wisdom: 8, vitality: 4 },
  weapon: SEER_EYE,
  skills: [VOID_LANCE],
  baseLife: 255,
  bonuses: { voidResistance: 0.3 },
};

export const GLOOM_WEAVER: EnemyDefinition = {
  id: "gloom-weaver",
  name: "Gloom Weaver",
  archetype: "afflicter",
  description: "Hexes you so every ailment hurts more.",
  attributes: { strength: 0, dexterity: 4, agility: 2, intelligence: 8, wisdom: 10, vitality: 6 },
  weapon: GLOOM_THREADS,
  skills: [HEX],
  baseLife: 270,
  bonuses: { voidResistance: 0.3 },
};

export const ACT6_ENEMIES: readonly EnemyDefinition[] = [
  RIFT_STALKER,
  HOLLOW_BRUTE,
  VOID_SEER,
  GLOOM_WEAVER,
];

/**
 * Act 6 boss (docs/design/gegner-bosse-v1.md section 6): every bite Corrupts, Consume makes the
 * Corruption jump ahead, Rift Snap every 12 s, Enrage below 30 %. It teaches killing fast.
 */
export const VOIDBORN_MAW: EnemyDefinition = {
  id: "voidborn-maw",
  name: "Voidborn Maw",
  archetype: "afflicter",
  description: "Every bite Corrupts and the Corruption keeps growing. Rift Snap every 12 seconds.",
  attributes: { strength: 10, dexterity: 4, agility: 2, intelligence: 8, wisdom: 8, vitality: 14 },
  weapon: MAW_JAWS,
  skills: [CONSUME],
  baseLife: 430,
  boss: true,
  bonuses: { voidResistance: 0.4 },
  telegraphs: [{ skill: RIFT_SNAP, interval: 12, windup: 2 }],
  triggers: [
    {
      id: "maw-hunger",
      name: "Hunger",
      condition: { kind: "lifeBelow", threshold: 0.3 },
      oncePerFight: true,
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.4, duration: 999 },
    },
  ],
};

/**
 * Act 7 (Emberfall) enemies: the end of the world, every element at once. Only 10 stages
 * (stage 91–100), then the Harvester.
 */
export const ASH_REVENANT: EnemyDefinition = {
  id: "ash-revenant",
  name: "Ash Revenant",
  archetype: "brute",
  description: "A fallen Heir. Bleeds and Burns.",
  attributes: { strength: 12, dexterity: 4, agility: 2, intelligence: 2, wisdom: 2, vitality: 14 },
  weapon: REVENANT_BLADE,
  skills: [HEAVY_SWING],
  baseLife: 400,
  bonuses: { armor: 24, allResistance: 0.15 },
};

export const EMBER_WRAITH: EnemyDefinition = {
  id: "ember-wraith",
  name: "Ember Wraith",
  archetype: "caster",
  description: "Grey fire that Burns and Corrupts. Little Life.",
  attributes: { strength: 0, dexterity: 4, agility: 4, intelligence: 12, wisdom: 8, vitality: 4 },
  weapon: WRAITH_FLAME,
  skills: [FIREBALL],
  baseLife: 265,
  bonuses: { allResistance: 0.15 },
};

export const HARROW_HOUND: EnemyDefinition = {
  id: "harrow-hound",
  name: "Harrow Hound",
  archetype: "skirmisher",
  description: "The Harvester's hound. Bleeds and Poisons.",
  attributes: { strength: 6, dexterity: 8, agility: 16, intelligence: 0, wisdom: 2, vitality: 6 },
  weapon: HOUND_FANGS,
  skills: [RAKE],
  baseLife: 285,
  bonuses: { evasion: 0.12, allResistance: 0.15 },
};

export const CINDER_KNIGHT: EnemyDefinition = {
  id: "cinder-knight",
  name: "Cinder Knight",
  archetype: "warden",
  description: "Blocks, hardens, and burns behind a Barrier when hurt.",
  attributes: { strength: 8, dexterity: 2, agility: 2, intelligence: 4, wisdom: 6, vitality: 10 },
  weapon: CINDER_LANCE,
  skills: [OBSIDIAN_SHELL],
  baseLife: 330,
  bonuses: { blockChance: 0.18, blockValue: 1, allResistance: 0.15 },
  triggers: [
    {
      id: "cinder-ward",
      name: "Cinder Ward",
      condition: { kind: "lifeBelow", threshold: 0.5 },
      oncePerFight: true,
      effect: { kind: "barrier", fraction: 0.15 },
    },
  ],
};

export const ACT7_ENEMIES: readonly EnemyDefinition[] = [
  ASH_REVENANT,
  EMBER_WRAITH,
  HARROW_HOUND,
  CINDER_KNIGHT,
];

/**
 * The Ashen Harvester (gegner-bosse-v1.md section 6): three phases, each echoing two of the
 * Act bosses before it.
 * - Phase 1 (full Life): Gorrak's Slam and the Mother's Poison.
 * - Phase 2 (below 66 %): the Tyrant's Fire Aura and the Warden's Ice Barrier.
 * - Phase 3 (below 33 %): the Herald's mirror, the Maw's Corruption and an Enrage.
 */
export const ASHEN_HARVESTER: EnemyDefinition = {
  id: "ashen-harvester",
  name: "The Ashen Harvester",
  archetype: "harvester",
  description: "Three phases. Every Act boss you beat comes back in it.",
  attributes: { strength: 12, dexterity: 6, agility: 4, intelligence: 10, wisdom: 8, vitality: 16 },
  weapon: HARVEST_SCYTHE,
  skills: [SOUL_REAP],
  baseLife: 520,
  boss: true,
  bonuses: { allResistance: 0.2 },
  telegraphs: [
    { skill: HARVEST_SWING, interval: 10, windup: 2 },
    { skill: ASHFALL, interval: 12, windup: 2, belowLife: 0.66 },
    { skill: LAST_HARVEST, interval: 11, windup: 2, belowLife: 0.33 },
  ],
  triggers: [
    {
      id: "harvest-aura",
      name: "Ash Aura",
      condition: { kind: "everySeconds", seconds: 2 },
      belowLife: 0.66,
      effect: {
        kind: "spellHit",
        name: "Ash Aura",
        damage: { min: 0.6, max: 0.9 },
        damageType: "fire",
      },
    },
    {
      id: "harvest-ice",
      name: "Rime Shell",
      condition: { kind: "lifeBelow", threshold: 0.66 },
      oncePerFight: true,
      effect: { kind: "barrier", fraction: 0.15 },
    },
    {
      id: "harvest-mirror",
      name: "Storm Mirror",
      condition: { kind: "everyNthHitTaken", n: 5 },
      belowLife: 0.33,
      effect: { kind: "reflect", fraction: 0.6, cap: 0.06, damageType: "lightning" },
    },
    {
      id: "harvest-hunger",
      name: "Endless Hunger",
      condition: { kind: "everySeconds", seconds: 3 },
      belowLife: 0.33,
      effect: { kind: "ailment", ailment: "corruption" },
    },
    {
      id: "harvest-enrage",
      name: "Reaping Frenzy",
      condition: { kind: "lifeBelow", threshold: 0.33 },
      oncePerFight: true,
      effect: { kind: "buff", stat: "attackSpeed", amount: 0.4, duration: 999 },
    },
  ],
};
