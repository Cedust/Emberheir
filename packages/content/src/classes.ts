import type { HeroClass } from "@emberheir/sim";

/**
 * The five classes (docs/design/klassen-v2.md). A class picks the start kit, its Class Array of
 * attributes (attribute-v1.md: 1 each plus 8, sum 14; 6 free points follow), a small Class Trait, the look and its four Prestige
 * branches: two of its own plus the Core branches Warden and Tactician (the Reaver trades Warden
 * for Duelist). Items and weapons stay open to every class.
 */
export const CLASSES: readonly HeroClass[] = [
  {
    id: "warrior",
    name: "Warrior",
    weapons: ["sword", "mace"],
    offHand: "round-shield",
    startingAttributes: {
      strength: 5,
      dexterity: 2,
      agility: 2,
      intelligence: 1,
      wisdom: 1,
      vitality: 3,
    },
    trait: {
      name: "Iron Blood",
      description:
        "Announced Heavy Attacks deal 45 % less damage to you, and each one you stand through gives 25 Heat.",
      rules: { ironBlood: { damageTaken: 0.55, heat: 25 } },
    },
    lineage: { name: "Iron Lineage", stat: "Life", percent: 5, lifeMultiplier: 1.05 },
    branches: ["duelist", "butcher", "warden", "tactician"],
    titles: {
      duelist: "Blademaster",
      butcher: "Headsman",
      warden: "Ironclad",
      tactician: "Warlord",
    },
    text: "Fights up close with Sword or Mace and wins through brute force: heavy direct hits, thick armor and a shield to take the blows. Keep swinging, or the Heat cools down.",
  },
  {
    id: "reaver",
    name: "Reaver",
    weapons: ["axe", "dagger"],
    offHand: "blood-talisman",
    startingAttributes: {
      strength: 3,
      dexterity: 3,
      agility: 3,
      intelligence: 1,
      wisdom: 1,
      vitality: 3,
    },
    trait: {
      name: "Bloodletter",
      description: "+15 % Ailment Effect for Bleed and Poison.",
      rules: { ailmentDamage: { bleed: 1.15, poison: 1.15 } },
    },
    lineage: { name: "Red Lineage", stat: "Lifesteal", percent: 2, bonuses: { lifesteal: 0.02 } },
    branches: ["butcher", "venomancer", "duelist", "tactician"],
    titles: {
      butcher: "Ravager",
      venomancer: "Viper",
      duelist: "Cutthroat",
      tactician: "Shadowblade",
    },
    text: "Fights up close with Axe or Dagger and wins with dirty tricks: every cut bleeds, every stab poisons. The wounds do the killing while the Reaver keeps striking.",
  },
  {
    id: "hunter",
    name: "Hunter",
    weapons: ["bow", "crossbow"],
    offHand: "quiver",
    startingAttributes: {
      strength: 2,
      dexterity: 4,
      agility: 3,
      intelligence: 1,
      wisdom: 1,
      vitality: 3,
    },
    trait: {
      name: "Keen Eye",
      description:
        "Your first hit of each fight, and every hit while the enemy winds up a Heavy Attack, is a clean Crit.",
      rules: { keenEye: true },
    },
    lineage: {
      name: "Keen Lineage",
      stat: "Crit Chance",
      percent: 3,
      bonuses: { critChance: 0.03 },
    },
    branches: ["marksman", "venomancer", "warden", "tactician"],
    titles: { marksman: "Deadeye", venomancer: "Stalker", warden: "Sentinel", tactician: "Ranger" },
    text: "Fights from range with Bow or Crossbow. Bolts punch through armor in single heavy shots, arrows leave bleeding and poisoned wounds. Patient, precise, deadly on a critical hit.",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    weapons: ["fire-wand"],
    offHand: "ember-focus",
    startingAttributes: {
      strength: 1,
      dexterity: 2,
      agility: 1,
      intelligence: 4,
      wisdom: 3,
      vitality: 3,
    },
    trait: {
      name: "Spark",
      description:
        "After each skill, your next Default Attack deals 20 % more damage and always applies the ailment of its element.",
      rules: { spark: { damage: 0.2 } },
    },
    lineage: {
      name: "Storm Lineage",
      stat: "Elemental Damage",
      percent: 5,
      bonuses: { elementalDamage: 0.05 },
    },
    branches: ["stormcaller", "frostbinder", "warden", "tactician"],
    titles: {
      stormcaller: "Tempest",
      frostbinder: "Rimeweaver",
      warden: "Battlemage",
      tactician: "Archmage",
    },
    text: "Fights from range with a Wand and wins with raw elements: fire, frost and lightning in big, sudden bursts. The Heat builds on its own, so the next spell is always coming.",
  },
  {
    id: "warlock",
    name: "Warlock",
    weapons: ["staff"],
    offHand: "grimoire",
    startingAttributes: {
      strength: 1,
      dexterity: 2,
      agility: 1,
      intelligence: 3,
      wisdom: 4,
      vitality: 3,
    },
    trait: {
      name: "Lingering",
      description:
        "Your ailments deal 1 % more damage for every second of the fight (up to +25 % after 25 s).",
      rules: { lingering: { perSecond: 0.01, max: 0.25 } },
    },
    lineage: {
      name: "Hollow Lineage",
      stat: "Ailment Effect",
      percent: 10,
      bonuses: { ailmentEffect: 0.1 },
    },
    branches: ["pyromancer", "void-lord", "warden", "tactician"],
    titles: {
      pyromancer: "Ashcaller",
      "void-lord": "Nightbinder",
      warden: "Gravewarden",
      tactician: "Hexmaster",
    },
    text: "Fights from range with a Staff and wins with curses: lingering fire, creeping Void and slow decay. The longer the fight lasts, the surer the enemy dies.",
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
