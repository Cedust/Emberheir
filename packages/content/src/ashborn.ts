import type { AshbornValue } from "@emberheir/sim";

/**
 * The four Ashborn Boards (neuausrichtung-v1.md 7.3): Onslaught (offense), Aegis (defense),
 * Mending (sustain), Ignite (Heat and triggers). Each value takes at most 15 points. Starting
 * values: 15 points in one value are worth about a strong affix.
 */
export const ASHBORN_VALUES: readonly AshbornValue[] = [
  // Onslaught
  {
    id: "damage",
    name: "Damage",
    board: "onslaught",
    text: "+2 % Physical and Elemental Damage",
    perPoint: { bonuses: { physicalDamage: 0.02, elementalDamage: 0.02 } },
  },
  {
    id: "crit",
    name: "Crit Chance",
    board: "onslaught",
    text: "+0.4 % Crit Chance",
    perPoint: { bonuses: { critChance: 0.004 } },
  },
  {
    id: "attack-speed",
    name: "Attack Speed",
    board: "onslaught",
    text: "+1 % Attack Speed",
    perPoint: { bonuses: { attackSpeed: 0.01 } },
  },
  {
    id: "ailment-effect",
    name: "Ailment Effect",
    board: "onslaught",
    text: "+2 % Ailment Effect",
    perPoint: { bonuses: { ailmentEffect: 0.02 } },
  },
  {
    id: "penetration",
    name: "Penetration",
    board: "onslaught",
    text: "+0.6 % Physical and Elemental Penetration",
    perPoint: { bonuses: { physicalPenetration: 0.006, elementalPenetration: 0.006 } },
  },
  // Aegis
  {
    id: "life",
    name: "Life",
    board: "aegis",
    text: "+2 % max Life",
    perPoint: { bonuses: { increasedLife: 0.02 } },
  },
  {
    id: "defenses",
    name: "Defenses",
    board: "aegis",
    text: "+3 % Armor and Barrier, +0.3 % Evasion",
    perPoint: { bonuses: { increasedArmor: 0.03, increasedBarrier: 0.03, evasion: 0.003 } },
  },
  {
    id: "resistance",
    name: "Resistances",
    board: "aegis",
    text: "+1 % to all Resistances",
    perPoint: { bonuses: { allResistance: 0.01 } },
  },
  {
    id: "max-resistance",
    name: "Max Resistance",
    board: "aegis",
    text: "+1/3 % to every max Resistance (+5 % at 15)",
    perPoint: { maxResistance: 0.05 / 15 },
  },
  {
    id: "tenacity",
    name: "Tenacity",
    board: "aegis",
    text: "+2 % Tenacity",
    perPoint: { bonuses: { tenacity: 0.02 } },
  },
  {
    id: "block",
    name: "Block",
    board: "aegis",
    text: "+0.5 % Block Chance",
    perPoint: { bonuses: { blockChance: 0.005 } },
  },
  // Mending
  {
    id: "lifesteal",
    name: "Lifesteal",
    board: "mending",
    text: "+0.2 % Lifesteal",
    perPoint: { bonuses: { lifesteal: 0.002 } },
  },
  {
    id: "dot-healing",
    name: "Ailment Healing",
    board: "mending",
    text: "Heal 0.5 % of the damage your ailments deal",
    perPoint: { dotLifesteal: 0.005 },
  },
  {
    id: "barrier-recharge",
    name: "Barrier Recharge",
    board: "mending",
    text: "Barrier recharges 4 % faster",
    perPoint: { barrierRecharge: 0.04 },
  },
  {
    id: "flask",
    name: "Flask",
    board: "mending",
    text: "The Ember Flask heals 3 % more",
    perPoint: { flaskHeal: 0.03 },
  },
  // Ignite
  {
    id: "heat-gain",
    name: "Heat Gain",
    board: "ignite",
    text: "+2 % Heat Gain",
    perPoint: { bonuses: { heatGain: 0.02 } },
  },
  {
    id: "starting-heat",
    name: "Starting Heat",
    board: "ignite",
    text: "+2 Starting Heat",
    perPoint: { bonuses: { startingHeat: 2 } },
  },
  {
    id: "trigger-chance",
    name: "Trigger Chance",
    board: "ignite",
    text: "+1 % Trigger Chance",
    perPoint: { bonuses: { triggerChance: 0.01 } },
  },
  {
    id: "skill-cost",
    name: "Skill Cost",
    board: "ignite",
    text: "Skills cost 1 % less Heat",
    perPoint: { skillCost: 0.01 },
  },
];
