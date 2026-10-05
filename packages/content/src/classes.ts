import type { HeroClass } from "@emberheir/sim";

/**
 * The five classes (docs/design/klassen-v2.md). A class picks the start kit, start attributes
 * (sum 36 like the old neutral 6 × 6), a small Class Trait, the look and three recommended
 * Prestige branches. Items, branches and weapons stay open to every class.
 */
export const CLASSES: readonly HeroClass[] = [
  {
    id: "warrior",
    name: "Warrior",
    weapons: ["sword", "mace"],
    offHand: "round-shield",
    startingAttributes: {
      strength: 9,
      dexterity: 5,
      agility: 6,
      intelligence: 4,
      wisdom: 4,
      vitality: 8,
    },
    trait: { name: "Iron Blood", description: "+10 % Life.", rules: { lifeMultiplier: 1.1 } },
    recommendedBranches: ["duelist", "warden", "tactician"],
    titles: { duelist: "Blademaster", warden: "Ironclad", tactician: "Warlord" },
    text: "Fights up close with Sword or Mace and wins through brute force: heavy direct hits, thick armor and a shield to take the blows. Keep swinging, or the Heat cools down.",
  },
  {
    id: "reaver",
    name: "Reaver",
    weapons: ["axe", "dagger"],
    offHand: "blood-talisman",
    startingAttributes: {
      strength: 8,
      dexterity: 7,
      agility: 7,
      intelligence: 4,
      wisdom: 4,
      vitality: 6,
    },
    trait: {
      name: "Bloodletter",
      description: "+15 % Bleed and Poison Damage.",
      rules: { ailmentDamage: { bleed: 1.15, poison: 1.15 } },
    },
    recommendedBranches: ["butcher", "venomancer", "duelist"],
    titles: { butcher: "Ravager", venomancer: "Viper", duelist: "Cutthroat" },
    text: "Fights up close with Axe or Dagger and wins with dirty tricks: every cut bleeds, every stab poisons. The wounds do the killing while the Reaver keeps striking.",
  },
  {
    id: "hunter",
    name: "Hunter",
    weapons: ["bow", "crossbow"],
    offHand: "quiver",
    startingAttributes: {
      strength: 6,
      dexterity: 9,
      agility: 8,
      intelligence: 4,
      wisdom: 4,
      vitality: 5,
    },
    trait: { name: "Keen Eye", description: "+5 % Crit Chance.", bonuses: { critChance: 0.05 } },
    recommendedBranches: ["marksman", "venomancer", "tactician"],
    titles: { marksman: "Deadeye", venomancer: "Stalker", tactician: "Ranger" },
    text: "Fights from range with Bow or Crossbow. Bolts punch through armor in single heavy shots, arrows leave bleeding and poisoned wounds. Patient, precise, deadly on a critical hit.",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    weapons: ["fire-wand"],
    offHand: "ember-focus",
    startingAttributes: {
      strength: 4,
      dexterity: 5,
      agility: 6,
      intelligence: 9,
      wisdom: 7,
      vitality: 5,
    },
    trait: { name: "Spark", description: "+10 Starting Heat.", bonuses: { startingHeat: 10 } },
    recommendedBranches: ["stormcaller", "frostbinder", "tactician"],
    titles: { stormcaller: "Tempest", frostbinder: "Rimeweaver", tactician: "Archmage" },
    text: "Fights from range with a Wand and wins with raw elements: fire, frost and lightning in big, sudden bursts. The Heat builds on its own, so the next spell is always coming.",
  },
  {
    id: "warlock",
    name: "Warlock",
    weapons: ["staff"],
    offHand: "grimoire",
    startingAttributes: {
      strength: 4,
      dexterity: 5,
      agility: 5,
      intelligence: 8,
      wisdom: 9,
      vitality: 5,
    },
    trait: {
      name: "Lingering",
      description: "+15 % Ailment Duration.",
      bonuses: { ailmentDuration: 0.15 },
    },
    recommendedBranches: ["pyromancer", "void-lord", "venomancer"],
    titles: { pyromancer: "Ashcaller", "void-lord": "Nightbinder", venomancer: "Plaguelord" },
    text: "Fights from range with a Staff and wins with curses: lingering fire, creeping Void and slow decay. The longer the fight lasts, the surer the enemy dies.",
  },
];

/** Title epithet per Prestige branch, for branches outside the class's own three. */
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
