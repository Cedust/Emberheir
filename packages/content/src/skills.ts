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
      damage: { min: 14, max: 19 },
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
];

/** Every weapon brings one Start Skill that is equipped automatically. */
export const START_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  sword: POWER_STRIKE,
  "fire-wand": FIREBOLT,
  axe: LACERATE,
  dagger: VENOM_COAT,
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
