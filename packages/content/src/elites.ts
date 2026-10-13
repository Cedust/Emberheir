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
    lootTags: ["speed"],
  },
  {
    id: "stone-skin",
    name: "Stone Skin",
    description: "+25 Armor, +15 % All Resistance.",
    bonuses: { armor: 25, allResistance: 0.15 },
    lootTags: ["defense", "resistance"],
  },
  {
    id: "vampiric",
    name: "Vampiric",
    description: "Heals for 25 % of the damage it deals.",
    bonuses: { lifesteal: 0.25 },
    lootTags: ["life"],
  },
  {
    id: "thorns",
    name: "Thorns",
    description: "Deals 3 damage back for every hit it takes.",
    bonuses: { thorns: 3 },
    lootTags: ["defense", "block"],
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
    lootTags: ["speed", "offense"],
  },
  ...actModifiers(),
];

/**
 * Elites mit Thema (neuausrichtung-v1.md 6.1, elites-routen-v1.md): every act has three
 * modifiers of its own. An Elite of the act rolls one of them first, then general ones. Each asks
 * the Battle Plan a question and steers the loot (`lootTags`). Emberfall mixes all of them.
 */
function actModifiers(): EliteModifier[] {
  return [
    // Ashen Fields (Physical): armor, brawling, a shell to break.
    {
      id: "ironhide",
      act: "ashen-fields",
      name: "Ironhide",
      description: "+40 Armor, +20 % Tenacity.",
      bonuses: { armor: 40, tenacity: 0.2 },
      lootTags: ["defense"],
    },
    {
      id: "brawler",
      act: "ashen-fields",
      name: "Brawler",
      description: "Every 4th attack strikes twice.",
      triggers: [
        {
          id: "brawler",
          name: "Brawler",
          condition: { kind: "everyNthAttack", n: 4 },
          effect: { kind: "extraAttack" },
        },
      ],
      lootTags: ["physical", "offense"],
    },
    {
      id: "ash-cloak",
      act: "ashen-fields",
      name: "Ash Cloak",
      description: "Starts the fight behind Barrier worth 25 % of its Life.",
      triggers: [
        {
          id: "ash-cloak",
          name: "Ash Cloak",
          condition: { kind: "fightStart" },
          effect: { kind: "barrier", fraction: 0.25 },
        },
      ],
      lootTags: ["barrier"],
    },
    // Rotwood (Bleed, Poison): spores, roots that heal, bark that bites.
    {
      id: "sporeburst",
      act: "rotwood",
      name: "Sporeburst",
      description: "Every 4th hit it takes sprays Poison on you.",
      triggers: [
        {
          id: "sporeburst",
          name: "Sporeburst",
          condition: { kind: "everyNthHitTaken", n: 4 },
          effect: { kind: "ailment", ailment: "poison" },
        },
      ],
      lootTags: ["ailment"],
    },
    {
      id: "rootbound",
      act: "rotwood",
      name: "Rootbound",
      description: "Heals 3 % of its Life every 2 s.",
      triggers: [
        {
          id: "rootbound",
          name: "Rootbound",
          condition: { kind: "everySeconds", seconds: 2 },
          effect: { kind: "heal", fraction: 0.03 },
        },
      ],
      lootTags: ["life"],
    },
    {
      id: "thornbark",
      act: "rotwood",
      name: "Thornbark",
      description: "Deals 5 damage back for every hit it takes, +30 % Chance to Bleed.",
      bonuses: { thorns: 5, bleedChance: 0.3 },
      lootTags: ["physical", "ailment"],
    },
    // Ember Wastes (Fire): burning hits, a molten heart, a fast fire.
    {
      id: "cinderborn",
      act: "ember-wastes",
      name: "Cinderborn",
      description: "+35 % Chance to Burn.",
      bonuses: { burnChance: 0.35 },
      lootTags: ["elemental", "resistance"],
    },
    {
      id: "molten-core",
      act: "ember-wastes",
      name: "Molten Core",
      description: "Once, below 50 % Life: Barrier worth 30 % of its Life.",
      triggers: [
        {
          id: "molten-core",
          name: "Molten Core",
          condition: { kind: "lifeBelow", threshold: 0.5 },
          oncePerFight: true,
          effect: { kind: "barrier", fraction: 0.3 },
        },
      ],
      lootTags: ["barrier", "defense"],
    },
    {
      id: "wildfire-heart",
      act: "ember-wastes",
      name: "Wildfire Heart",
      description: "+50 % Heat Gain: it uses its skills far more often.",
      bonuses: { heatGain: 0.5 },
      lootTags: ["heat"],
    },
    // Frost Peaks (Cold): chilling hits, a shell of ice, a numbing blow.
    {
      id: "rimebound",
      act: "frost-peaks",
      name: "Rimebound",
      description: "+35 % Chance to Chill.",
      bonuses: { chillChance: 0.35 },
      lootTags: ["elemental", "resistance"],
    },
    {
      id: "ice-shell",
      act: "frost-peaks",
      name: "Ice Shell",
      description: "Every 8 s: Barrier worth 10 % of its Life.",
      triggers: [
        {
          id: "ice-shell",
          name: "Ice Shell",
          condition: { kind: "everySeconds", seconds: 8 },
          effect: { kind: "barrier", fraction: 0.1 },
        },
      ],
      lootTags: ["barrier", "defense"],
    },
    {
      id: "numbing-blow",
      act: "frost-peaks",
      name: "Numbing Blow",
      description: "Every 6th attack stuns you for 0.6 s.",
      triggers: [
        {
          id: "numbing-blow",
          name: "Numbing Blow",
          condition: { kind: "everyNthAttack", n: 6 },
          effect: { kind: "stun", seconds: 0.6 },
        },
      ],
      lootTags: ["defense", "speed"],
    },
    // Storm Spires (Lightning): shocking hits, a charged skin, a blink.
    {
      id: "stormcharged",
      act: "storm-spires",
      name: "Stormcharged",
      description: "+35 % Chance to Shock.",
      bonuses: { shockChance: 0.35 },
      lootTags: ["elemental", "crit"],
    },
    {
      id: "static-skin",
      act: "storm-spires",
      name: "Static Skin",
      description: "Every 4th hit it takes arcs back as Lightning (at most 6 % of your Life).",
      triggers: [
        {
          id: "static-skin",
          name: "Static Skin",
          condition: { kind: "everyNthHitTaken", n: 4 },
          effect: { kind: "reflect", fraction: 0.6, cap: 0.06, damageType: "lightning" },
        },
      ],
      lootTags: ["resistance", "block"],
    },
    {
      id: "blinking",
      act: "storm-spires",
      name: "Blinking",
      description: "+20 % Evasion.",
      bonuses: { evasion: 0.2 },
      lootTags: ["crit", "speed"],
    },
    // Void Rift (Void): corrupting hits, a hunger, a rift of Heat.
    {
      id: "voidtouched",
      act: "void-rift",
      name: "Voidtouched",
      description: "+35 % Chance to Corrupt.",
      bonuses: { corruptionChance: 0.35 },
      lootTags: ["ailment", "elemental"],
    },
    {
      id: "hungering",
      act: "void-rift",
      name: "Hungering",
      description: "Heals for 15 % of the damage it deals, +15 % Tenacity.",
      bonuses: { lifesteal: 0.15, tenacity: 0.15 },
      lootTags: ["life"],
    },
    {
      id: "rift-surge",
      act: "void-rift",
      name: "Rift Surge",
      description: "Every 6 s it gains 30 Heat.",
      triggers: [
        {
          id: "rift-surge",
          name: "Rift Surge",
          condition: { kind: "everySeconds", seconds: 6 },
          effect: { kind: "heat", amount: 30 },
        },
      ],
      lootTags: ["heat", "offense"],
    },
  ];
}

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
