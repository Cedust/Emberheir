import type { EliteModifier } from "@emberheir/sim";

/**
 * Elite modifiers (docs/design/gegner-bosse-v1.md section 4). An Elite gets 1 of them in Act 1;
 * more with higher Monster Levels. Numbers are starting values.
 */
export const ELITE_MODIFIERS: readonly EliteModifier[] = [
  {
    id: "extra-fast",
    name: "Extra Fast",
    description: "+40 % Attack Speed, +20 % Heat Gain.",
    bonuses: { attackSpeed: 0.4, heatGain: 0.2 },
  },
  {
    id: "stone-skin",
    name: "Stone Skin",
    description: "+25 Armor, +15 % All Resistance.",
    bonuses: { armor: 25, allResistance: 0.15 },
  },
  {
    id: "vampiric",
    name: "Vampiric",
    description: "Heals for 25 % of the damage it deals.",
    bonuses: { lifesteal: 0.25 },
  },
  {
    id: "thorns",
    name: "Thorns",
    description: "Deals 3 damage back for every hit it takes.",
    bonuses: { thorns: 3 },
  },
  {
    id: "enraged",
    name: "Enraged",
    description: "Below 30 % Life: +60 % Attack Speed until the fight ends.",
    triggers: [
      {
        id: "enrage",
        name: "Enrage",
        condition: { kind: "lifeBelow", threshold: 0.3 },
        oncePerFight: true,
        effect: { kind: "buff", stat: "attackSpeed", amount: 0.6, duration: 999 },
      },
    ],
  },
];

/**
 * Boss abilities (roadmap M10): an act boss learns one more per Prestige after the run its act
 * opened in, so old bosses keep up with the Heir. Each act starts at a different place in the list.
 */
export const BOSS_ABILITIES: readonly EliteModifier[] = [
  {
    id: "boss-hardened",
    name: "Hardened",
    description: "+15 % All Resistance, +10 % Tenacity.",
    bonuses: { allResistance: 0.15, tenacity: 0.1 },
  },
  {
    id: "boss-frenzied",
    name: "Frenzied",
    description: "+25 % Attack Speed.",
    bonuses: { attackSpeed: 0.25 },
  },
  {
    id: "boss-ashen-shell",
    name: "Ashen Shell",
    description: "Starts the fight with Barrier worth 15 % of its Life.",
    triggers: [
      {
        id: "boss-ashen-shell",
        name: "Ashen Shell",
        condition: { kind: "fightStart" },
        effect: { kind: "barrier", fraction: 0.15 },
      },
    ],
  },
  {
    id: "boss-leeching",
    name: "Leeching",
    description: "Heals for 10 % of the damage it deals.",
    bonuses: { lifesteal: 0.1 },
  },
  {
    id: "boss-ember-brand",
    name: "Ember Brand",
    description: "Every 8 s it Burns you.",
    triggers: [
      {
        id: "boss-ember-brand",
        name: "Ember Brand",
        condition: { kind: "everySeconds", seconds: 8 },
        effect: { kind: "ailment", ailment: "burn" },
      },
    ],
  },
  {
    id: "boss-unstoppable",
    name: "Unstoppable",
    description: "+40 % Tenacity: Stuns and ailments wear off fast.",
    bonuses: { tenacity: 0.4 },
  },
  {
    id: "boss-second-wind",
    name: "Second Wind",
    description: "Once, below 40 % Life: heals 15 % of its Life.",
    triggers: [
      {
        id: "boss-second-wind",
        name: "Second Wind",
        condition: { kind: "lifeBelow", threshold: 0.4 },
        oncePerFight: true,
        effect: { kind: "heal", fraction: 0.15 },
      },
    ],
  },
  {
    id: "boss-retribution",
    name: "Retribution",
    description: "Every 6th hit it takes is sent back (at most 5 % of your Life).",
    triggers: [
      {
        id: "boss-retribution",
        name: "Retribution",
        condition: { kind: "everyNthHitTaken", n: 6 },
        effect: { kind: "reflect", fraction: 0.5, cap: 0.05, damageType: "physical" },
      },
    ],
  },
  {
    id: "boss-cruel",
    name: "Cruel",
    description: "+10 % Crit Chance.",
    bonuses: { critChance: 0.1 },
  },
  {
    id: "boss-kindled",
    name: "Kindled",
    description: "+30 % Heat Gain: it uses its skills more often.",
    bonuses: { heatGain: 0.3 },
  },
];
