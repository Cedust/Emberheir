import type { HeroClass } from "@emberheir/sim";

/**
 * The three classes (docs/design/klassengeruest-v1.md 2): main attribute, weapon family, focus
 * and Class Trait. A class picks its Class Array of attributes (sum 14; 6 free points follow at
 * creation), the start off hand, the look and its three Masteries. Items stay open to every class.
 */
export const CLASSES: readonly HeroClass[] = [
  {
    id: "cinderguard",
    name: "Cinderguard",
    mainAttribute: "strength",
    focus: "Strong attacks",
    weapons: ["sword", "axe", "mace"],
    offHand: "round-shield",
    startingAttributes: {
      strength: 5,
      dexterity: 1,
      agility: 2,
      intelligence: 1,
      wisdom: 2,
      vitality: 3,
    },
    trait: {
      name: "Fury",
      description: "Every hit you land deals 2 % more damage than the last, up to +20 %.",
      rules: { fury: { perHit: 0.02, max: 0.2 } },
    },
    lineage: { name: "Iron Lineage", stat: "Life", percent: 5, lifeMultiplier: 1.05 },
    branches: ["duelist", "butcher", "warden", "tactician"],
    titles: {
      duelist: "Vanquisher",
      butcher: "Ravager",
      warden: "Ironclad",
      tactician: "Berserker",
    },
    text: "Fights up close with Sword, Axe or Mace. Every blow lands harder than the last.",
  },
  {
    id: "ashstrider",
    name: "Ashstrider",
    mainAttribute: "dexterity",
    focus: "Critical hits",
    weapons: ["bow", "crossbow", "dagger"],
    offHand: "quiver",
    offHandFor: { dagger: "blood-talisman" },
    startingAttributes: {
      strength: 1,
      dexterity: 5,
      agility: 3,
      intelligence: 1,
      wisdom: 1,
      vitality: 3,
    },
    trait: {
      name: "Hunter's Mark",
      description:
        "Your hits on an enemy that carries one of your ailments have +10 % Crit Chance.",
      rules: { huntersMark: { critChance: 0.1 } },
    },
    lineage: {
      name: "Keen Lineage",
      stat: "Crit Chance",
      percent: 3,
      bonuses: { critChance: 0.03 },
    },
    branches: ["marksman", "venomancer", "duelist", "tactician"],
    titles: {
      marksman: "Deadeye",
      venomancer: "Trickster",
      duelist: "Skirmisher",
      tactician: "Skirmisher",
    },
    text: "Fights with Bow, Crossbow or Dagger. Finds the weak spot and strikes it, again and again.",
  },
  {
    id: "emberseer",
    name: "Emberseer",
    mainAttribute: "intelligence",
    focus: "Ailments",
    weapons: ["wand", "staff"],
    offHand: "ember-focus",
    startingAttributes: {
      strength: 1,
      dexterity: 1,
      agility: 1,
      intelligence: 5,
      wisdom: 3,
      vitality: 3,
    },
    trait: {
      name: "Overcharge",
      description:
        "Every skill gives a Charge. At 3 Charges they break loose as a Nova of your element: 150 % Weapon Damage, always applies its ailment.",
      rules: { overcharge: { charges: 3, multiplier: 1.5 } },
    },
    lineage: {
      name: "Hollow Lineage",
      stat: "Ailment Effect",
      percent: 10,
      bonuses: { ailmentEffect: 0.1 },
    },
    branches: ["void-lord", "stormcaller", "frostbinder", "pyromancer"],
    titles: {
      "void-lord": "Warlock",
      stormcaller: "Archmage",
      frostbinder: "Spellweaver",
      pyromancer: "Warlock",
    },
    text: "Fights with Wand or Staff. Every spell feeds the next, until the charge breaks loose.",
  },
];

/** Title epithet per Prestige branch, for old saves that took a branch outside the class. */
export const BRANCH_EPITHETS: Readonly<Record<string, string>> = {
  duelist: "of the Blade",
  marksman: "of the Hunt",
  butcher: "of Blood",
  venomancer: "of Venom",
  stormcaller: "of the Storm",
  frostbinder: "of Frost",
  pyromancer: "of Flame",
  "void-lord": "of the Void",
  warden: "of Iron",
  tactician: "of Command",
};
