import type {
  CombatRules,
  SkillDefinition,
  SkillNode,
  SkillTreeBranch,
  SkillTreeRegion,
  StatBonuses,
  TriggerSpec,
} from "@emberheir/sim";
import {
  CHAIN_LIGHTNING,
  CORRUPT,
  CRUSHING_BLOW,
  ENVENOM,
  EXECUTE,
  FLURRY,
  ICE_LANCE,
  IMMOLATE,
  METEOR,
  REND,
  SERRATED_EDGE,
  SOUL_HARVEST,
  TOXIC_BURST,
  WITHER,
} from "./skills";

/**
 * The Skill Tree web (level-v2.md section 7). Eight regions sit on a ring: the four branches and
 * the bridges between them. Every region has a hub on the inner ring and three spokes running
 * outwards; each spoke is a cluster of three nodes that ends in a Notable (or a fork of two). The
 * spokes are tied together by a middle ring, so hybrids grow inside the tree. Keystones sit out
 * beyond some Notables, a few points of travel away. Each class starts at the hub of its region.
 *
 *            might-arcana
 *      might      │       arcana
 *          ╲      │      ╱
 *  rupture-might ─┼─ arcana-affliction
 *          ╱      │      ╲
 *    rupture      │       affliction
 *          affliction-rupture
 *
 * Coordinates are polar around the middle of the tree (0° = right, 90° = down). Numbers are
 * starting values.
 */

type WeaponRange = "melee" | "ranged";

interface NodeSpec {
  readonly name: string;
  /** Generated from the bonuses when left out. */
  readonly description?: string;
  readonly bonuses?: StatBonuses;
  readonly rules?: CombatRules;
  readonly triggers?: readonly TriggerSpec[];
  readonly weaponRange?: WeaponRange;
}

interface SkillSpec {
  readonly skill: SkillDefinition;
}

interface KeystoneSpec {
  readonly name: string;
  readonly description: string;
  readonly rules: CombatRules;
}

/** A Keystone out beyond a spoke's Notable: `reach` travel nodes, then the Keystone. */
interface KeystonePath {
  readonly reach: readonly NodeSpec[];
  /** Turn of the path against the spoke, in degrees, so two paths do not overlap. */
  readonly turn?: number;
  readonly keystone: KeystoneSpec;
}

interface SpokeSpec {
  /** The cluster: three nodes from the hub outwards. One of them may be a Skill. */
  readonly nodes: readonly [NodeSpec | SkillSpec, NodeSpec | SkillSpec, NodeSpec | SkillSpec];
  /** The Notable at the tip, or two of them as a fork (only one can be learned). */
  readonly notable: NodeSpec | readonly [NodeSpec, NodeSpec];
  readonly keystones?: readonly KeystonePath[];
  /** Branch colour of the spoke when it differs from the region's (Prestige anchors). */
  readonly branch?: SkillTreeBranch;
}

interface RegionSpec {
  readonly id: SkillTreeRegion;
  readonly branch: SkillTreeBranch;
  readonly angle: number;
  /** Hub on the inner ring; a class start for the classes listed in `classStart`. */
  readonly hub: NodeSpec & { readonly classStart?: string };
  /** Spokes at -14°, 0° and +14° from the region's angle. */
  readonly spokes: readonly [SpokeSpec, SpokeSpec, SpokeSpec];
  /** Travel nodes towards the next region: on the inner ring and on the middle ring. */
  readonly innerTravel: NodeSpec;
  readonly middleTravel: NodeSpec;
}

const STAT_TEXT: Record<keyof StatBonuses, readonly [string, "pct" | "flat"]> = {
  life: ["Life", "flat"],
  armor: ["Armor", "flat"],
  physicalDamage: ["Physical Damage", "pct"],
  elementalDamage: ["Elemental Damage", "pct"],
  critChance: ["Crit Chance", "pct"],
  triggerChance: ["Trigger Chance", "pct"],
  attackSpeed: ["Attack Speed", "pct"],
  evasion: ["Evasion", "pct"],
  blockChance: ["Block Chance", "pct"],
  blockValue: ["Block Value", "flat"],
  allResistance: ["All Resistance", "pct"],
  fireResistance: ["Fire Resistance", "pct"],
  coldResistance: ["Cold Resistance", "pct"],
  lightningResistance: ["Lightning Resistance", "pct"],
  voidResistance: ["Void Resistance", "pct"],
  heatGain: ["Heat Gain", "pct"],
  startingHeat: ["Starting Heat", "flat"],
  heatFromHitsTaken: ["Heat from Hits Taken", "pct"],
  ailmentDuration: ["Ailment Duration", "pct"],
  tenacity: ["Tenacity", "pct"],
  lifesteal: ["Lifesteal", "pct"],
  physicalPenetration: ["Physical Penetration", "pct"],
  elementalPenetration: ["Elemental Penetration", "pct"],
  thorns: ["Thorns", "flat"],
  burnChance: ["Chance to Burn", "pct"],
  chillChance: ["Chance to Chill", "pct"],
  shockChance: ["Chance to Shock", "pct"],
  corruptionChance: ["Chance to Corrupt", "pct"],
  bleedChance: ["Chance to Bleed", "pct"],
  poisonChance: ["Chance to Poison", "pct"],
};

/** "+6 % Physical Damage, +12 Armor." */
export function describeBonuses(bonuses: StatBonuses, weaponRange?: WeaponRange): string {
  const parts = (Object.entries(bonuses) as [keyof StatBonuses, number][]).map(([stat, v]) => {
    if (stat === "startingHeat") return `Start every fight with +${v} Heat`;
    const [label, unit] = STAT_TEXT[stat];
    return unit === "pct" ? `+${Math.round(v * 1000) / 10} % ${label}` : `+${v} ${label}`;
  });
  const prefix = weaponRange
    ? `While wielding a ${weaponRange === "melee" ? "Melee" : "Ranged"} Weapon: `
    : "";
  return `${prefix}${parts.join(", ")}.`;
}

/** A small node: a bonus that fits its region, text from the numbers. */
const m = (name: string, bonuses: StatBonuses, weaponRange?: WeaponRange): NodeSpec => ({
  name,
  bonuses,
  ...(weaponRange ? { weaponRange } : {}),
});
const s = (skill: SkillDefinition): SkillSpec => ({ skill });

const REGIONS: readonly RegionSpec[] = [
  {
    id: "might",
    branch: "might",
    angle: -135,
    hub: {
      name: "Warrior's Oath",
      classStart: "warrior",
      description: "+6 % Physical Damage, +12 Armor. The Warrior starts here.",
      bonuses: { physicalDamage: 0.06, armor: 12 },
    },
    spokes: [
      {
        nodes: [m("Brawn", { physicalDamage: 0.06 }), s(CRUSHING_BLOW), m("Grit", { armor: 12 })],
        notable: {
          name: "Brutal Force",
          bonuses: { physicalDamage: 0.2, armor: 10 },
          weaponRange: "melee",
        },
      },
      {
        nodes: [
          m("Haste", { attackSpeed: 0.04 }),
          m("Heft", { physicalDamage: 0.06 }),
          m("Ferocity", { physicalDamage: 0.06 }),
        ],
        notable: [
          { name: "Colossus", bonuses: { physicalDamage: 0.25, armor: 15 } },
          { name: "Whirlwind", bonuses: { attackSpeed: 0.12, triggerChance: 0.04 } },
        ],
        keystones: [
          {
            reach: [m("Iron Resolve", { tenacity: 0.05 }), m("Bulk", { armor: 15 })],
            keystone: {
              name: "Unyielding",
              description: "Your max Life is 30 % higher. You cannot Crit.",
              rules: { lifeMultiplier: 1.3, critChanceMultiplier: 0 },
            },
          },
        ],
      },
      {
        nodes: [
          {
            name: "Battle Scars",
            description:
              "While wielding a Melee Weapon: enemy hits build Heat (Heat from Hits Taken).",
            bonuses: { heatFromHitsTaken: 1 },
            weaponRange: "melee",
          },
          s(FLURRY),
          m("Grudge", { heatFromHitsTaken: 0.5 }, "melee"),
        ],
        notable: {
          name: "Unbroken",
          bonuses: { heatFromHitsTaken: 0.5, armor: 10 },
          weaponRange: "melee",
        },
        keystones: [
          {
            reach: [
              m("Swift Blades", { attackSpeed: 0.04 }),
              m("War Cry", { physicalDamage: 0.06 }),
            ],
            keystone: {
              name: "Glass Focus",
              description: "Heat no longer cools down. You take 20 % more damage.",
              rules: { noHeatDecay: true, damageTaken: 0.2 },
            },
          },
        ],
      },
    ],
    innerTravel: m("Drive", { attackSpeed: 0.04 }),
    middleTravel: m("Tempered Steel", { physicalDamage: 0.04, heatGain: 0.03 }),
  },
  {
    id: "might-arcana",
    branch: "core",
    angle: -90,
    hub: m("Kindling", { heatGain: 0.05 }),
    spokes: [
      {
        nodes: [
          m("Spark", { startingHeat: 6 }),
          m("Flow", { heatGain: 0.05 }),
          m("Quickening", { attackSpeed: 0.04 }),
        ],
        notable: [
          { name: "Battle Trance", bonuses: { startingHeat: 30 } },
          { name: "Overflow", bonuses: { heatGain: 0.15 } },
        ],
      },
      {
        nodes: [
          m("First Spark", { startingHeat: 6 }),
          m("Tinder", { heatGain: 0.05 }),
          m("Fervor", { triggerChance: 0.03 }),
        ],
        notable: {
          name: "Stoked",
          bonuses: { startingHeat: 15, triggerChance: 0.08 },
        },
      },
      {
        nodes: [
          m("Arcing Blade", { elementalDamage: 0.06 }),
          m("Honed Mind", { physicalDamage: 0.04, elementalDamage: 0.04 }),
          m("Concentration", { heatGain: 0.05 }),
        ],
        notable: { name: "Arcane Edge", bonuses: { physicalDamage: 0.12, elementalDamage: 0.12 } },
        keystones: [
          {
            reach: [m("Cadence", { attackSpeed: 0.04 })],
            keystone: {
              name: "Spellblade",
              description:
                "Your Default Attack deals 40 % more damage. Skills cost 25 % more Heat.",
              rules: { defaultAttackDamage: 1.4, skillCostMultiplier: 1.25 },
            },
          },
        ],
      },
    ],
    innerTravel: m("Flux", { elementalDamage: 0.05 }),
    middleTravel: m("Charged Air", { heatGain: 0.03, elementalDamage: 0.04 }),
  },
  {
    id: "arcana",
    branch: "arcana",
    angle: -45,
    hub: {
      name: "Sorcerer's Spark",
      classStart: "sorcerer",
      description:
        "+6 % Elemental Damage, start every fight with +6 Heat. The Sorcerer starts here.",
      bonuses: { elementalDamage: 0.06, startingHeat: 6 },
    },
    spokes: [
      {
        nodes: [
          m("Crackle", { shockChance: 0.05 }),
          s(CHAIN_LIGHTNING),
          m("Intensity", { elementalDamage: 0.06 }),
        ],
        notable: {
          name: "Storm Weaver",
          bonuses: { shockChance: 0.08, elementalPenetration: 0.05 },
        },
      },
      {
        nodes: [
          m("Mindfire", { elementalDamage: 0.06 }),
          m("Insight", { allResistance: 0.05 }),
          m("Attunement", { elementalPenetration: 0.03 }),
        ],
        notable: [
          { name: "Tempest", bonuses: { shockChance: 0.12, elementalPenetration: 0.05 } },
          { name: "Glacier", bonuses: { chillChance: 0.12, allResistance: 0.08 } },
        ],
        keystones: [
          {
            turn: -6,
            reach: [m("Lucidity", { heatGain: 0.05 }), m("Resonance", { elementalDamage: 0.06 })],
            keystone: {
              name: "Arcane Conduit",
              description:
                "Skills cost 30 % less Heat. Your Default Attack deals 50 % less damage.",
              rules: { skillCostMultiplier: 0.7, defaultAttackDamage: 0.5 },
            },
          },
          {
            turn: 6,
            reach: [
              m("Galvanize", { shockChance: 0.05 }),
              m("Rimecall", { chillChance: 0.05 }),
              m("Upwelling", { elementalDamage: 0.06 }),
            ],
            keystone: {
              name: "Elemental Overload",
              description:
                "Your Chill also Shocks and your Shock also Chills. You take 10 % more damage.",
              rules: {
                ailmentEcho: [
                  { from: "chill", to: "shock" },
                  { from: "shock", to: "chill" },
                ],
                damageTaken: 0.1,
              },
            },
          },
        ],
      },
      {
        nodes: [m("Frost", { chillChance: 0.05 }), s(ICE_LANCE), m("Clarity", { heatGain: 0.05 })],
        notable: {
          name: "Kindled Mind",
          bonuses: { elementalDamage: 0.2, heatGain: 0.1 },
          weaponRange: "ranged",
        },
      },
    ],
    innerTravel: m("Glow", { elementalDamage: 0.05 }),
    middleTravel: m("Searing Wind", { elementalDamage: 0.04, burnChance: 0.03 }),
  },
  {
    id: "arcana-affliction",
    branch: "core",
    angle: 0,
    hub: m("Ember Ward", { allResistance: 0.05 }),
    spokes: [
      {
        nodes: [
          m("Sparks", { burnChance: 0.05 }),
          m("Fervent Mind", { elementalDamage: 0.06 }),
          m("Lingering Heat", { ailmentDuration: 0.08 }),
        ],
        notable: [
          {
            name: "Firestarter",
            description: "+15 % Chance to Burn. Your Burns deal 20 % more damage.",
            bonuses: { burnChance: 0.15 },
            rules: { ailmentDamage: { burn: 1.2 } },
          },
          { name: "Smoulder", bonuses: { ailmentDuration: 0.3 } },
        ],
      },
      {
        nodes: [
          m("Scorch", { elementalDamage: 0.06 }),
          s(METEOR),
          m("Embers", { burnChance: 0.05 }),
        ],
        notable: { name: "Pyroclasm", bonuses: { elementalDamage: 0.15, burnChance: 0.1 } },
        keystones: [
          {
            reach: [
              m("Ashfall", { burnChance: 0.05 }),
              m("Conflagrate", { elementalDamage: 0.06 }),
            ],
            keystone: {
              name: "Black Flame",
              description: "Your Burns also Corrupt. Your Default Attack deals 25 % less damage.",
              rules: {
                ailmentEcho: [{ from: "burn", to: "corruption" }],
                defaultAttackDamage: 0.75,
              },
            },
          },
        ],
      },
      {
        nodes: [
          m("Ashen Skin", { fireResistance: 0.08, coldResistance: 0.08 }),
          m("Ward Runes", { allResistance: 0.05 }),
          m("Foreboding", { ailmentDuration: 0.08 }),
        ],
        notable: { name: "Heart of Embers", bonuses: { allResistance: 0.1, tenacity: 0.1 } },
      },
    ],
    innerTravel: m("Kindled Path", { burnChance: 0.05 }),
    middleTravel: m("Black Smoke", { ailmentDuration: 0.05, burnChance: 0.03 }),
  },
  {
    id: "affliction",
    branch: "affliction",
    angle: 45,
    hub: {
      name: "Warlock's Brand",
      classStart: "warlock",
      description: "+5 % Chance to Corrupt, +8 % Ailment Duration. The Warlock starts here.",
      bonuses: { corruptionChance: 0.05, ailmentDuration: 0.08 },
    },
    spokes: [
      {
        nodes: [
          m("Kindle", { burnChance: 0.05 }),
          s(IMMOLATE),
          m("Ember Ash", { elementalDamage: 0.06 }),
        ],
        notable: { name: "Pyromancer", bonuses: { burnChance: 0.1, elementalDamage: 0.1 } },
      },
      {
        nodes: [
          m("Blight", { corruptionChance: 0.05 }),
          s(SOUL_HARVEST),
          m("Malice", { ailmentDuration: 0.08 }),
        ],
        notable: [
          {
            name: "Hungering Void",
            description: "Your Corruption deals 30 % more damage.",
            rules: { ailmentDamage: { corruption: 1.3 } },
          },
          {
            name: "Cinder Heart",
            description: "Your Burns deal 30 % more damage.",
            rules: { ailmentDamage: { burn: 1.3 } },
          },
        ],
        keystones: [
          {
            turn: -6,
            reach: [
              m("Rot Within", { ailmentDuration: 0.08 }),
              m("Withering", { elementalDamage: 0.06 }),
            ],
            keystone: {
              name: "Slow Death",
              description:
                "Your ailments deal 50 % more damage over time. Your Default Attack deals 30 % less.",
              rules: { dotDamage: 1.5, defaultAttackDamage: 0.7 },
            },
          },
          {
            turn: 6,
            reach: [
              m("Ash Pact", { corruptionChance: 0.05 }),
              m("Grave Cold", { tenacity: 0.05 }),
              m("Soul Ember", { ailmentDuration: 0.08 }),
            ],
            keystone: {
              name: "Pact of Ash",
              description:
                "Heal 8 % of the damage your ailments deal. Your max Life is 20 % lower.",
              rules: { dotLifesteal: 0.08, lifeMultiplier: 0.8 },
            },
          },
        ],
      },
      {
        nodes: [
          m("Umbra", { corruptionChance: 0.05 }),
          s(CORRUPT),
          m("Dread", { ailmentDuration: 0.08 }),
        ],
        notable: { name: "Void Lord", bonuses: { corruptionChance: 0.1, ailmentDuration: 0.15 } },
      },
    ],
    innerTravel: m("Decay", { ailmentDuration: 0.08 }),
    middleTravel: m("Mire", { ailmentDuration: 0.05, poisonChance: 0.03 }),
  },
  {
    id: "affliction-rupture",
    branch: "core",
    angle: 90,
    hub: m("Rampart", { armor: 12 }),
    spokes: [
      {
        nodes: [
          m("Septic", { poisonChance: 0.05 }),
          s(WITHER),
          m("Rot", { ailmentDuration: 0.08 }),
        ],
        notable: {
          name: "Leeching Rot",
          description: "Heal 4 % of the damage your ailments deal. +10 % Ailment Duration.",
          bonuses: { ailmentDuration: 0.1 },
          rules: { dotLifesteal: 0.04 },
        },
        keystones: [
          {
            turn: -6,
            reach: [
              m("Fester", { poisonChance: 0.05 }),
              m("Pestilence", { ailmentDuration: 0.08 }),
            ],
            keystone: {
              name: "Plague Bearer",
              description: "Your Poisons deal 50 % more damage. Your Bleeds deal 50 % less.",
              rules: { ailmentDamage: { poison: 1.5, bleed: 0.5 } },
            },
          },
        ],
      },
      {
        nodes: [
          m("Iron Hide", { armor: 12 }),
          m("Resolve", { tenacity: 0.05 }),
          m("Ashguard", { allResistance: 0.05 }),
        ],
        notable: { name: "Iron Will", bonuses: { tenacity: 0.15, armor: 15, allResistance: 0.05 } },
      },
      {
        nodes: [
          m("Toxin", { poisonChance: 0.05 }),
          s(TOXIC_BURST),
          m("Thick Blood", { tenacity: 0.05 }),
        ],
        notable: [
          { name: "Stoneskin", bonuses: { armor: 20, allResistance: 0.08 } },
          { name: "Bloodthirst", bonuses: { lifesteal: 0.02 } },
        ],
      },
    ],
    innerTravel: m("Sinew", { tenacity: 0.05 }),
    middleTravel: m("Scar Tissue", { armor: 8, poisonChance: 0.03 }),
  },
  {
    id: "rupture",
    branch: "rupture",
    angle: 135,
    hub: {
      name: "Reaver's Edge",
      classStart: "reaver",
      description: "+5 % Chance to Bleed, +5 % Physical Damage. The Reaver starts here.",
      bonuses: { bleedChance: 0.05, physicalDamage: 0.05 },
    },
    spokes: [
      {
        nodes: [
          m("Venom Gland", { poisonChance: 0.05 }),
          s(ENVENOM),
          m("Patience", { ailmentDuration: 0.08 }),
        ],
        notable: { name: "Venomancer", bonuses: { poisonChance: 0.1, ailmentDuration: 0.15 } },
      },
      {
        nodes: [
          m("Cruelty", { bleedChance: 0.05 }),
          s(REND),
          m("Lingering Wounds", { ailmentDuration: 0.08 }),
        ],
        notable: [
          {
            name: "Exsanguinate",
            description: "Your Bleeds deal 35 % more damage.",
            rules: { ailmentDamage: { bleed: 1.35 } },
          },
          { name: "Bloodletter", bonuses: { bleedChance: 0.15, ailmentDuration: 0.2 } },
        ],
        keystones: [
          {
            turn: -6,
            reach: [
              m("Open Wounds", { bleedChance: 0.05 }),
              m("Savagery", { physicalDamage: 0.06 }),
            ],
            keystone: {
              name: "Blood Price",
              description: "Your Crits always Bleed. Your Crit Chance is halved.",
              rules: { critsApplyBleed: true, critChanceMultiplier: 0.5 },
            },
          },
          {
            turn: 6,
            reach: [
              m("Deep Cut", { bleedChance: 0.05 }),
              m("Red Mist", { attackSpeed: 0.04 }),
              m("Blood Rush", { physicalDamage: 0.06 }),
            ],
            keystone: {
              name: "Hemomancer",
              description: "Your Bleeds deal 50 % more damage. Your Poisons deal 50 % less.",
              rules: { ailmentDamage: { bleed: 1.5, poison: 0.5 } },
            },
          },
        ],
      },
      {
        nodes: [
          m("Serrate", { physicalDamage: 0.06 }),
          s(SERRATED_EDGE),
          m("Sharpened", { critChance: 0.015 }),
        ],
        notable: {
          name: "Butcher",
          bonuses: { bleedChance: 0.1, physicalDamage: 0.1 },
          weaponRange: "melee",
        },
      },
    ],
    innerTravel: m("Bite", { bleedChance: 0.05 }),
    middleTravel: m("Barbs", { bleedChance: 0.03, critChance: 0.01 }),
  },
  {
    id: "rupture-might",
    branch: "core",
    angle: 180,
    hub: {
      name: "Hunter's Eye",
      classStart: "hunter",
      description: "+1.5 % Crit Chance, +4 % Attack Speed. The Hunter starts here.",
      bonuses: { critChance: 0.015, attackSpeed: 0.04 },
    },
    spokes: [
      {
        nodes: [
          m("Pinpoint", { critChance: 0.015 }),
          s(EXECUTE),
          m("Cold Blood", { physicalPenetration: 0.03 }),
        ],
        notable: {
          name: "Coup de Grace",
          description: "Hits deal 25 % more damage to an enemy below 30 % Life.",
          rules: { execute: { below: 0.3, bonus: 0.25 } },
        },
        keystones: [
          {
            reach: [m("Stalker", { critChance: 0.015 })],
            keystone: {
              name: "Headsman",
              description:
                "Hits deal 60 % more damage to an enemy below 35 % Life, 15 % less while it is above.",
              rules: { execute: { below: 0.35, bonus: 0.6, above: 0.15 } },
            },
          },
        ],
      },
      {
        branch: "might",
        nodes: [
          m("Keenness", { critChance: 0.015 }),
          m("Draw Weight", { physicalDamage: 0.08 }, "ranged"),
          m("Whetstone", { critChance: 0.015 }),
        ],
        notable: { name: "Killer Instinct", bonuses: { critChance: 0.03, triggerChance: 0.05 } },
      },
      {
        nodes: [
          m("Swift Shots", { attackSpeed: 0.04 }),
          m("Serrations", { bleedChance: 0.05 }),
          m("Sharp Eye", { critChance: 0.015 }),
        ],
        notable: [
          { name: "Killer's Eye", bonuses: { critChance: 0.05 } },
          { name: "Opportunist", bonuses: { triggerChance: 0.1, attackSpeed: 0.04 } },
        ],
      },
    ],
    innerTravel: m("Whetted", { physicalDamage: 0.05 }),
    middleTravel: m("Hunter's Path", { critChance: 0.01, attackSpeed: 0.03 }),
  },
];

/** Radii of the rings: hub, the three cluster nodes, Notable; Keystone paths continue outwards. */
const HUB_RADIUS = 2.6;
const SPOKE_RADII = [3.7, 4.8, 5.9] as const;
const NOTABLE_RADIUS = 7;
const MIDDLE_TRAVEL_RADIUS = 6.4;
const RADIUS_STEP = 1.1;
const SPOKE_TURN = 14;
const FORK_TURN = 4.5;

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const polar = (radius: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round(Math.cos(a) * radius), y: round(Math.sin(a) * radius) };
};

const isSkill = (spec: NodeSpec | SkillSpec): spec is SkillSpec => "skill" in spec;

function buildWeb(): { nodes: SkillNode[]; classStarts: Record<string, string> } {
  const nodes: SkillNode[] = [];
  const classStarts: Record<string, string> = {};
  const add = (node: SkillNode) => {
    if (nodes.some((n) => n.id === node.id)) throw new Error(`Duplicate skill node "${node.id}"`);
    nodes.push(node);
    return node.id;
  };
  const plain = (
    region: RegionSpec,
    spec: NodeSpec,
    kind: "minor" | "notable",
    at: { x: number; y: number },
    links: string[],
    branch: SkillTreeBranch = region.branch,
  ): SkillNode => ({
    id: `${region.id}-${slug(spec.name)}`,
    name: spec.name,
    branch,
    region: region.id,
    kind,
    description: spec.description ?? describeBonuses(spec.bonuses ?? {}, spec.weaponRange),
    links,
    ...at,
    ...(spec.bonuses ? { bonuses: spec.bonuses } : {}),
    ...(spec.rules ? { rules: spec.rules } : {}),
    ...(spec.triggers ? { triggers: spec.triggers } : {}),
    ...(spec.weaponRange ? { weaponRange: spec.weaponRange } : {}),
  });
  const id = (region: RegionSpec, spec: NodeSpec | SkillSpec) =>
    `${region.id}-${slug(isSkill(spec) ? spec.skill.name : spec.name)}`;

  REGIONS.forEach((region, r) => {
    const next = REGIONS[(r + 1) % REGIONS.length] as RegionSpec;
    const hubId = id(region, region.hub);
    const innerId = id(region, region.innerTravel);
    const middleId = id(region, region.middleTravel);
    const firstNodes = region.spokes.map((spoke) => id(region, spoke.nodes[0]));
    const hub = plain(region, region.hub, "minor", polar(HUB_RADIUS, region.angle), [
      innerId,
      ...firstNodes,
    ]);
    add(region.hub.classStart ? { ...hub, classStart: region.hub.classStart } : hub);
    if (region.hub.classStart) classStarts[region.hub.classStart] = hubId;
    add(
      plain(region, region.innerTravel, "minor", polar(HUB_RADIUS, region.angle + 22.5), [
        id(next, next.hub),
      ]),
    );
    add(
      plain(
        region,
        region.middleTravel,
        "minor",
        polar(MIDDLE_TRAVEL_RADIUS, region.angle + 22.5),
        [id(next, next.spokes[0].nodes[2])],
      ),
    );

    region.spokes.forEach((spoke, i) => {
      const angle = region.angle + (i - 1) * SPOKE_TURN;
      const branch = spoke.branch ?? region.branch;
      const notables = Array.isArray(spoke.notable)
        ? (spoke.notable as readonly [NodeSpec, NodeSpec])
        : [spoke.notable as NodeSpec];
      const notableIds = notables.map((n) => id(region, n));
      // The cluster: s1 → s2 → s3 → Notable(s); s3 also ties into the middle ring.
      spoke.nodes.forEach((spec, k) => {
        const at = polar(SPOKE_RADII[k] ?? NOTABLE_RADIUS, angle);
        const links =
          k < 2
            ? [id(region, spoke.nodes[k + 1] as NodeSpec | SkillSpec)]
            : [
                ...notableIds,
                i < 2 ? id(region, (region.spokes[i + 1] as SpokeSpec).nodes[2]) : middleId,
              ];
        if (isSkill(spec)) {
          add({
            id: id(region, spec),
            name: spec.skill.name,
            branch,
            region: region.id,
            kind: "skill",
            description: `Unlocks ${spec.skill.name}. Each rank adds a Skill Level.`,
            links,
            ...at,
            maxRanks: 3,
            skill: spec.skill,
          });
        } else add(plain(region, spec, "minor", at, links, branch));
      });
      const fork = notables.length > 1 ? `${region.id}-${i}` : undefined;
      notables.forEach((spec, k) => {
        const turn = notables.length > 1 ? (k === 0 ? -FORK_TURN : FORK_TURN) : 0;
        const node = plain(
          region,
          spec,
          "notable",
          polar(NOTABLE_RADIUS, angle + turn),
          [],
          branch,
        );
        add(fork ? { ...node, fork } : node);
      });
      // Keystones out beyond the Notable: every Notable of the spoke leads onto the path.
      for (const path of spoke.keystones ?? []) {
        const turn = path.turn ?? 0;
        const ids = path.reach.map((n) => id(region, n));
        const keystoneId = `${region.id}-${slug(path.keystone.name)}`;
        path.reach.forEach((spec, k) => {
          const at = polar(NOTABLE_RADIUS + (k + 1) * RADIUS_STEP, angle + turn);
          const links = [ids[k + 1] ?? keystoneId, ...(k === 0 ? notableIds : [])];
          add(plain(region, spec, "minor", at, links, branch));
        });
        add({
          id: keystoneId,
          name: path.keystone.name,
          branch,
          region: region.id,
          kind: "keystone",
          description: path.keystone.description,
          links: [],
          ...polar(NOTABLE_RADIUS + (path.reach.length + 1) * RADIUS_STEP, angle + turn),
          keystone: path.keystone.rules,
        });
      }
    });
  });
  return { nodes, classStarts };
}

const WEB = buildWeb();

/** The web's nodes (Prestige branches come on top, see `prestige-branches.ts`). */
export const WEB_NODES: readonly SkillNode[] = WEB.nodes;

/** Start node per class id. */
export const CLASS_STARTS: Readonly<Record<string, string>> = WEB.classStarts;
