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
