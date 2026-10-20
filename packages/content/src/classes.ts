import type { HeroClass } from "@emberheir/sim";

/**
 * The three classes (docs/design/klassengeruest-v1.md 2): main attribute, weapon family, focus
 * and Class Trait. A class picks its Class Array of attributes (sum 14; 6 free points follow at
 * creation), the start off hand (by weapon, Timo 2026-10-19), the look and its three Masteries.
 * Items stay open to every class.
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
      description:
        "Every Default Attack you land and every hit you take gives 1 Fury (up to 10). Your Innate spends all of it and deals 25 % more damage per Fury.",
      rules: { fury: { perStack: 0.25, maxStacks: 10 } },
    },
    lineage: { name: "Iron Lineage", stat: "Life", percent: 5, lifeMultiplier: 1.05 },
    branches: ["vanquisher", "berserker", "ravager"],
    titles: { vanquisher: "Vanquisher", berserker: "Berserker", ravager: "Ravager" },
    text: "Fights up close with Sword, Axe or Mace. Every swing feeds the Fury of the next big blow.",
  },
  {
    id: "ashstrider",
    name: "Ashstrider",
    mainAttribute: "dexterity",
    focus: "Clean hits",
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
        "Your attacks on an enemy that carries one of your ailments have +10 % Precision: more clean hits, fewer Glancing Blows.",
      rules: { huntersMark: { precision: 0.1 } },
    },
    lineage: {
      name: "Keen Lineage",
      stat: "Crit Chance",
      percent: 3,
      bonuses: { critChance: 0.03 },
    },
    branches: ["deadeye", "skirmisher", "trickster"],
    titles: { deadeye: "Deadeye", skirmisher: "Skirmisher", trickster: "Trickster" },
    text: "Fights with Bow, Crossbow or Dagger. Finds the weak spot and strikes it, again and again.",
  },
  {
    id: "emberseer",
    name: "Emberseer",
    mainAttribute: "intelligence",
    focus: "Ailments",
    weapons: ["wand", "staff"],
    offHand: "ember-focus",
    offHandFor: { staff: "grimoire" },
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
    branches: ["archmage", "spellweaver", "warlock"],
    titles: { archmage: "Archmage", spellweaver: "Spellweaver", warlock: "Warlock" },
    text: "Fights with Wand or Staff. Every spell feeds the next, until the charge breaks loose.",
  },
];

/**
 * Title epithet per Mastery: the main Mastery is the title (klassengeruest-v1.md 5), so this only
 * names a Mastery outside the hero's class (cheats, tests).
 */
export const BRANCH_EPITHETS: Readonly<Record<string, string>> = {
  vanquisher: "the Vanquisher",
  berserker: "the Berserker",
  ravager: "the Ravager",
  deadeye: "the Deadeye",
  skirmisher: "the Skirmisher",
  trickster: "the Trickster",
  archmage: "the Archmage",
  spellweaver: "the Spellweaver",
  warlock: "the Warlock",
};
