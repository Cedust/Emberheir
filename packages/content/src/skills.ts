import type { SkillDefinition } from "@emberheir/sim";

/**
 * PoC skills: Might and Arcana (docs/design/skills-v1.md section 3). Ice Lance is in for now so
 * Chill can be tested before the Skill Tree exists. Numbers are starting values.
 */
export const POWER_STRIKE: SkillDefinition = {
  id: "power-strike",
  name: "Power Strike",
  type: "attack",
  heatCost: 25,
  tags: ["physical", "direct", "any"],
  description: "220 % Weapon Damage.",
  hits: [{ kind: "weapon", multiplier: 2.2 }],
};

export const FLURRY: SkillDefinition = {
  id: "flurry",
  name: "Flurry",
  type: "attack",
  heatCost: 50,
  tags: ["physical", "direct", "any"],
  description: "4 quick hits for 90 % Weapon Damage each. Every hit can crit.",
  hits: [{ kind: "weapon", multiplier: 0.9, count: 4 }],
};

export const EXECUTE: SkillDefinition = {
  id: "execute",
  name: "Execute",
  type: "attack",
  heatCost: 90,
  tags: ["physical", "direct", "any"],
  description: "400 % Weapon Damage, doubled against enemies below 30 % Life.",
  hits: [{ kind: "weapon", multiplier: 4, lowLifeBonus: { threshold: 0.3, multiplier: 2 } }],
};

export const FIREBOLT: SkillDefinition = {
  id: "firebolt",
  name: "Firebolt",
  type: "spell",
  heatCost: 30,
  tags: ["fire", "direct", "any"],
  description: "A cheap Fire hit. 25 % chance to Burn.",
  hits: [
    {
      kind: "spell",
      damage: { min: 16, max: 22 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 0.25 }],
    },
  ],
};

export const ICE_LANCE: SkillDefinition = {
  id: "ice-lance",
  name: "Ice Lance",
  type: "spell",
  heatCost: 35,
  tags: ["cold", "direct", "any"],
  description: "A medium Cold hit that always Chills.",
  hits: [
    {
      kind: "spell",
      damage: { min: 14, max: 20 },
      damageType: "cold",
      ailmentChances: [{ ailment: "chill", chance: 1 }],
    },
  ],
};

export const CHAIN_LIGHTNING: SkillDefinition = {
  id: "chain-lightning",
  name: "Chain Lightning",
  type: "spell",
  heatCost: 50,
  tags: ["lightning", "direct", "any"],
  description: "3 Lightning hits, each 25 % weaker. Each hit has a 30 % chance to Shock.",
  hits: [
    {
      kind: "spell",
      damage: { min: 14, max: 22 },
      damageType: "lightning",
      count: 3,
      falloff: 0.75,
      ailmentChances: [{ ailment: "shock", chance: 0.3 }],
    },
  ],
};

export const METEOR: SkillDefinition = {
  id: "meteor",
  name: "Meteor",
  type: "spell",
  heatCost: 100,
  tags: ["fire", "direct", "any"],
  description: "A huge Fire hit. 50 % chance to Burn.",
  hits: [
    {
      kind: "spell",
      damage: { min: 55, max: 75 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 0.5 }],
    },
  ],
};

// Rupture: Physical Over Time (skills-v1.md section 3).

export const LACERATE: SkillDefinition = {
  id: "lacerate",
  name: "Lacerate",
  type: "attack",
  heatCost: 25,
  tags: ["physical", "over-time", "any"],
  description: "100 % Weapon Damage. Always Bleeds.",
  hits: [{ kind: "weapon", multiplier: 1, ailmentChances: [{ ailment: "bleed", chance: 1 }] }],
};

export const VENOM_COAT: SkillDefinition = {
  id: "venom-coat",
  name: "Venom Coat",
  type: "buff",
  heatCost: 40,
  tags: ["physical", "over-time", "any"],
  description: "For 8 s, every hit Poisons.",
  hits: [],
  effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 8 }],
};

export const REND: SkillDefinition = {
  id: "rend",
  name: "Rend",
  type: "attack",
  heatCost: 60,
  tags: ["physical", "over-time", "melee"],
  description: "120 % Weapon Damage, then ends the Bleed and deals the rest at once, ×1.5.",
  hits: [{ kind: "weapon", multiplier: 1.2 }],
  effects: [{ kind: "consumeBleed", multiplier: 1.5 }],
};

export const TOXIC_BURST: SkillDefinition = {
  id: "toxic-burst",
  name: "Toxic Burst",
  type: "attack",
  heatCost: 80,
  tags: ["physical", "over-time", "any"],
  description: "100 % Weapon Damage that Poisons, then doubles the Poison stacks.",
  hits: [{ kind: "weapon", multiplier: 1, ailmentChances: [{ ailment: "poison", chance: 1 }] }],
  effects: [{ kind: "multiplyPoison", factor: 2 }],
};

// Affliction: Elemental Over Time (skills-v1.md section 3).

export const IMMOLATE: SkillDefinition = {
  id: "immolate",
  name: "Immolate",
  type: "spell",
  heatCost: 30,
  tags: ["fire", "over-time", "any"],
  description: "A small Fire hit that sets a strong Burn.",
  hits: [
    {
      kind: "spell",
      damage: { min: 9, max: 13 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 1 }],
      ailmentPower: 3,
    },
  ],
};

export const CORRUPT: SkillDefinition = {
  id: "corrupt",
  name: "Corrupt",
  type: "spell",
  heatCost: 40,
  tags: ["void", "over-time", "any"],
  description: "A Void hit that Corrupts. The Corruption starts four steps stronger.",
  hits: [
    {
      kind: "spell",
      damage: { min: 12, max: 18 },
      damageType: "void",
      ailmentChances: [{ ailment: "corruption", chance: 1 }],
      ailmentPower: 2,
    },
  ],
  effects: [{ kind: "advanceCorruption", ticks: 4 }],
};

export const WITHER: SkillDefinition = {
  id: "wither",
  name: "Wither",
  type: "curse",
  heatCost: 35,
  tags: ["over-time", "any"],
  description: "Curse: the enemy takes 30 % more damage over time for 8 s.",
  hits: [],
  effects: [{ kind: "curse", dotDamageTaken: 0.3, duration: 8 }],
};

export const SOUL_HARVEST: SkillDefinition = {
  id: "soul-harvest",
  name: "Soul Harvest",
  type: "spell",
  heatCost: 70,
  tags: ["void", "over-time", "any"],
  description: "Deals 4 seconds of all damage over time at once. The ailments keep running.",
  hits: [],
  effects: [{ kind: "detonateDots", seconds: 4 }],
};

/** Skills the hero can put into the Battle Plan. */
export const HERO_SKILLS: readonly SkillDefinition[] = [
  POWER_STRIKE,
  FLURRY,
  EXECUTE,
  FIREBOLT,
  ICE_LANCE,
  CHAIN_LIGHTNING,
  METEOR,
  LACERATE,
  VENOM_COAT,
  REND,
  TOXIC_BURST,
  IMMOLATE,
  CORRUPT,
  WITHER,
  SOUL_HARVEST,
];

/** Every weapon brings one Start Skill that is equipped automatically. */
export const START_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  sword: POWER_STRIKE,
  "fire-wand": FIREBOLT,
  axe: LACERATE,
  dagger: VENOM_COAT,
  bow: LACERATE,
  crossbow: POWER_STRIKE,
};

// Enemy skills.

export const HEAVY_SWING: SkillDefinition = {
  id: "heavy-swing",
  name: "Heavy Swing",
  type: "attack",
  heatCost: 50,
  tags: ["physical", "direct", "melee"],
  description: "200 % Weapon Damage.",
  hits: [{ kind: "weapon", multiplier: 2 }],
};

export const QUICK_CUTS: SkillDefinition = {
  id: "quick-cuts",
  name: "Quick Cuts",
  type: "attack",
  heatCost: 30,
  tags: ["physical", "direct", "melee"],
  description: "3 hits for 80 % Weapon Damage each.",
  hits: [{ kind: "weapon", multiplier: 0.8, count: 3 }],
};

export const CINDER_SPIT: SkillDefinition = {
  id: "cinder-spit",
  name: "Cinder Spit",
  type: "spell",
  heatCost: 50,
  tags: ["fire", "over-time", "any"],
  description: "A Fire hit with a 60 % chance to Burn.",
  hits: [
    {
      kind: "spell",
      damage: { min: 1.34, max: 2.69 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 0.6 }],
    },
  ],
};

/** Rotwood: claws that open wounds. */
export const RAKE: SkillDefinition = {
  id: "rake",
  name: "Rake",
  type: "attack",
  heatCost: 35,
  tags: ["physical", "over-time", "melee"],
  description: "2 hits for 90 % Weapon Damage, each Bleeds.",
  hits: [
    {
      kind: "weapon",
      multiplier: 0.9,
      count: 2,
      ailmentChances: [{ ailment: "bleed", chance: 1 }],
    },
  ],
};

/** Rotwood: a glob of rot that Poisons three times. */
export const BLIGHT_SPIT: SkillDefinition = {
  id: "blight-spit",
  name: "Blight Spit",
  type: "spell",
  heatCost: 45,
  tags: ["physical", "over-time", "any"],
  description: "3 small hits, each Poisons.",
  hits: [
    {
      kind: "spell",
      damage: { min: 0.99, max: 1.54 },
      damageType: "physical",
      count: 3,
      ailmentChances: [{ ailment: "poison", chance: 1 }],
    },
  ],
};

/** Rotwood Warden: heals itself, which Burn halves. */
export const MOSS_MEND: SkillDefinition = {
  id: "moss-mend",
  name: "Moss Mend",
  type: "buff",
  heatCost: 80,
  tags: ["life"],
  description: "Heals 8 % of its Life.",
  hits: [],
  effects: [{ kind: "heal", fraction: 0.08 }],
};

/** Mother of Rot: a spray that piles Poison on the hero. */
export const ROT_SPRAY: SkillDefinition = {
  id: "rot-spray",
  name: "Rot Spray",
  type: "spell",
  heatCost: 50,
  tags: ["physical", "over-time", "any"],
  description: "4 hits, each Poisons.",
  hits: [
    {
      kind: "spell",
      damage: { min: 0.99, max: 1.43 },
      damageType: "physical",
      count: 4,
      ailmentChances: [{ ailment: "poison", chance: 1 }],
    },
  ],
};

/** Mother of Rot's telegraph: she feeds on the rot and heals, unless she burns. */
export const DEVOUR: SkillDefinition = {
  id: "devour",
  name: "Devour",
  type: "buff",
  heatCost: 0,
  tags: ["life"],
  description: "An announced feast that heals 10 % of her Life.",
  hits: [],
  effects: [{ kind: "heal", fraction: 0.1 }],
};

/** Gorrak's telegraphed Heavy Attack: announced 2 s ahead, every 10 s. */
export const GORRAK_SLAM: SkillDefinition = {
  id: "gorrak-slam",
  name: "Slam",
  type: "attack",
  heatCost: 0,
  tags: ["physical", "direct", "melee"],
  description: "A huge, announced blow for 400 % Weapon Damage.",
  hits: [{ kind: "weapon", multiplier: 4 }],
};

// Act 3 (Ember Wastes) enemy skills.

/** Cinder Imp: a flurry of burning swipes. */
export const FLAME_DASH: SkillDefinition = {
  id: "flame-dash",
  name: "Flame Dash",
  type: "attack",
  heatCost: 30,
  tags: ["fire", "over-time", "melee"],
  description: "3 hits for 80 % Weapon Damage, each with a 30 % chance to Burn.",
  hits: [
    {
      kind: "weapon",
      multiplier: 0.8,
      count: 3,
      ailmentChances: [{ ailment: "burn", chance: 0.3 }],
    },
  ],
};

export const FIREBALL: SkillDefinition = {
  id: "fireball",
  name: "Fireball",
  type: "spell",
  heatCost: 45,
  tags: ["fire", "direct", "any"],
  description: "A big Fire hit. 80 % chance to Burn.",
  hits: [
    {
      kind: "spell",
      damage: { min: 1.8, max: 3 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 0.8 }],
    },
  ],
};

/** Obsidian Guard: hardens its shell. */
export const OBSIDIAN_SHELL: SkillDefinition = {
  id: "obsidian-shell",
  name: "Obsidian Shell",
  type: "buff",
  heatCost: 70,
  tags: ["defense"],
  description: "+40 Armor for 6 s.",
  hits: [],
  effects: [{ kind: "buff", stat: "armor", amount: 40, duration: 6 }],
};

/** Cinder Tyrant's telegraph: the ground bursts open. */
export const ERUPTION: SkillDefinition = {
  id: "eruption",
  name: "Eruption",
  type: "spell",
  heatCost: 0,
  tags: ["fire", "direct", "any"],
  description: "An announced burst of fire that always Burns.",
  hits: [
    {
      kind: "spell",
      damage: { min: 5, max: 7 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 1 }],
    },
  ],
};

// Act 4 (Frost Peaks) enemy skills.

/** Frost Wolf: a leap with chilling teeth. */
export const POUNCE: SkillDefinition = {
  id: "pounce",
  name: "Pounce",
  type: "attack",
  heatCost: 35,
  tags: ["cold", "direct", "melee"],
  description: "2 hits for 100 % Weapon Damage, each with a 50 % chance to Chill.",
  hits: [
    {
      kind: "weapon",
      multiplier: 1,
      count: 2,
      ailmentChances: [{ ailment: "chill", chance: 0.5 }],
    },
  ],
};

export const ICE_BOLT: SkillDefinition = {
  id: "ice-bolt",
  name: "Ice Bolt",
  type: "spell",
  heatCost: 45,
  tags: ["cold", "direct", "any"],
  description: "A Cold hit that always Chills.",
  hits: [
    {
      kind: "spell",
      damage: { min: 1.6, max: 2.8 },
      damageType: "cold",
      ailmentChances: [{ ailment: "chill", chance: 1 }],
    },
  ],
};

/** Frost Warden: mends cracks in its ice. */
export const GLACIAL_MEND: SkillDefinition = {
  id: "glacial-mend",
  name: "Glacial Mend",
  type: "buff",
  heatCost: 80,
  tags: ["life"],
  description: "Heals 6 % of its Life.",
  hits: [],
  effects: [{ kind: "heal", fraction: 0.06 }],
};

/** Rime Warden's telegraph: a wall of snow comes down. */
export const AVALANCHE: SkillDefinition = {
  id: "avalanche",
  name: "Avalanche",
  type: "attack",
  heatCost: 0,
  tags: ["cold", "direct", "melee"],
  description: "An announced blow for 350 % Weapon Damage that always Chills.",
  hits: [{ kind: "weapon", multiplier: 3.5, ailmentChances: [{ ailment: "chill", chance: 1 }] }],
};
