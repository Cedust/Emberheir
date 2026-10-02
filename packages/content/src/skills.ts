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

/** Skills the hero can put into the Battle Plan in the PoC. */
export const HERO_SKILLS: readonly SkillDefinition[] = [
  POWER_STRIKE,
  FLURRY,
  EXECUTE,
  FIREBOLT,
  ICE_LANCE,
  CHAIN_LIGHTNING,
  METEOR,
];

/** Every weapon brings one Start Skill that is equipped automatically. */
export const START_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  sword: POWER_STRIKE,
  "fire-wand": FIREBOLT,
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
      damage: { min: 1.2, max: 2.4 },
      damageType: "fire",
      ailmentChances: [{ ailment: "burn", chance: 0.6 }],
    },
  ],
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
