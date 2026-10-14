import type {
  AilmentType,
  CombatRules,
  FightMoment,
  RuleCondition,
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
 * Coordinates are polar around the middle of the ring (0° = right, 90° = down); `tree-shape.ts`
 * then sets each region onto the Ash Tree. Numbers are starting values.
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
  /**
   * Ward bud (balance-grundlagen-v1.md B): a short defense twig growing out from the middle
   * travel node towards the next region: two small nodes and a Notable with % Life and the
   * neighbours' layer (Armor, Barrier or Evasion). It adds to the web, nothing was replaced.
   */
  readonly ward: {
    /** Turn against the middle ring, in degrees, so the bud finds a free spot on the tree. */
    readonly turn: number;
    readonly nodes: readonly [NodeSpec, NodeSpec];
    readonly notable: NodeSpec;
  };
}

const STAT_TEXT: Record<keyof StatBonuses, readonly [string, "pct" | "flat"]> = {
  life: ["Life", "flat"],
  increasedLife: ["max Life", "pct"],
  armor: ["Armor", "flat"],
  increasedArmor: ["Armor", "pct"],
  barrier: ["Barrier", "flat"],
  increasedBarrier: ["Barrier", "pct"],
  physicalDamage: ["Physical Damage", "pct"],
  elementalDamage: ["Elemental Damage", "pct"],
  critChance: ["Crit Chance", "pct"],
  triggerChance: ["Trigger Chance", "pct"],
  attackSpeed: ["Attack Speed", "pct"],
  evasion: ["Evasion", "pct"],
  blockChance: ["Block Chance", "pct"],
  allResistance: ["All Resistance", "pct"],
  fireResistance: ["Fire Resistance", "pct"],
  coldResistance: ["Cold Resistance", "pct"],
  lightningResistance: ["Lightning Resistance", "pct"],
  voidResistance: ["Void Resistance", "pct"],
  heatGain: ["Heat Gain", "pct"],
  startingHeat: ["Starting Heat", "flat"],
  heatFromHitsTaken: ["Heat from Hits Taken", "pct"],
  ailmentEffect: ["Ailment Effect", "pct"],
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

/** "+6 % Physical Damage, +8 % Armor." */
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

const s = (skill: SkillDefinition): SkillSpec => ({ skill });

// Travel nodes give small Defense only (neuausrichtung-v1.md 4.2): the way to a Notable costs
// nothing and makes the hero a little tougher.
const LIFE = { increasedLife: 0.015 };
const ARMOR = { increasedArmor: 0.03 };
const BARRIER = { increasedBarrier: 0.04 };
const EVASION = { evasion: 0.01 };
const TENACITY = { tenacity: 0.02 };

/** A travel node. */
const t = (name: string, bonuses: StatBonuses): NodeSpec => ({ name, bonuses });

/** A Notable with its own text: "if, then" or a rule, never a plain number. */
const n = (
  name: string,
  description: string,
  rules: CombatRules,
  bonuses?: StatBonuses,
): NodeSpec => ({ name, description, rules, ...(bonuses ? { bonuses } : {}) });

/** "Your hits deal X more damage while …" */
const more = (condition: RuleCondition, amount: number) => ({ condition, amount });
const has = (ailment: AilmentType): RuleCondition => ({ kind: "enemyHas", ailment });
const below = (fraction: number): RuleCondition => ({ kind: "enemyBelow", fraction });
const within = (event: FightMoment, seconds: number): RuleCondition => ({
  kind: "within",
  event,
  seconds,
});
const heat = (amount: number): RuleCondition => ({ kind: "heatAtLeast", amount });
const stacks = (ailment: AilmentType, count: number): RuleCondition => ({
  kind: "enemyStacks",
  ailment,
  count,
});

const REGIONS: readonly RegionSpec[] = [
  {
    id: "might",
    branch: "might",
    angle: -135,
    hub: {
      name: "Warrior's Oath",
      classStart: "warrior",
      description: "+4 % max Life, +8 % Armor. The Warrior starts here.",
      bonuses: { increasedLife: 0.04, increasedArmor: 0.08 },
    },
    spokes: [
      {
        nodes: [t("Thick Neck", ARMOR), s(CRUSHING_BLOW), t("Grit", LIFE)],
        notable: n(
          "Brutal Force",
          "Your hits deal 25 % more damage while you have 30 Heat or more, and 20 % more to Stunned enemies.",
          { conditionalDamage: [more(heat(30), 0.25), more({ kind: "enemyStunned" }, 0.2)] },
        ),
      },
      {
        nodes: [t("Iron Skin", ARMOR), t("Steadfast", TENACITY), t("Hardy", LIFE)],
        notable: [
          n(
            "Colossus",
            "+8 % max Life. Within 4 s after a skill, your hits deal 30 % more damage.",
            { conditionalDamage: [more(within("skill", 4), 0.3)] },
            { increasedLife: 0.08 },
          ),
          n("Whirlwind", "Within 3 s after a Crit, your hits deal 25 % more damage.", {
            conditionalDamage: [more(within("crit", 3), 0.25)],
          }),
        ],
        keystones: [
          {
            reach: [t("Iron Resolve", TENACITY), t("Bulk", ARMOR)],
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
          t("Grudge", LIFE),
        ],
        notable: {
          name: "Unbroken",
          description:
            "While wielding a Melee Weapon: +50 % Heat from Hits Taken. Below 50 % Life your hits deal 25 % more damage.",
          bonuses: { heatFromHitsTaken: 0.5 },
          weaponRange: "melee",
          rules: { conditionalDamage: [more({ kind: "lifeBelow", fraction: 0.5 }, 0.25)] },
        },
        keystones: [
          {
            reach: [t("Swift Recovery", LIFE), t("Scarred", ARMOR)],
            keystone: {
              name: "Glass Focus",
              description: "Heat no longer cools down. You take 20 % more damage.",
              rules: { noHeatDecay: true, damageTaken: 0.2 },
            },
          },
        ],
      },
    ],
    innerTravel: t("Drive", LIFE),
    middleTravel: t("Tempered Steel", ARMOR),
    ward: {
      turn: -3,
      nodes: [t("Thick Hide", { increasedLife: 0.04 }), t("Ironbark", { increasedArmor: 0.1 })],
      notable: { name: "Oakheart", bonuses: { increasedLife: 0.08, increasedArmor: 0.15 } },
    },
  },
  {
    id: "might-arcana",
    branch: "core",
    angle: -90,
    hub: t("Forge Heart", { increasedLife: 0.03, increasedBarrier: 0.06 }),
    spokes: [
      {
        nodes: [t("Ember Skin", BARRIER), t("Steady Pulse", TENACITY), t("Warm Hide", LIFE)],
        notable: [
          n(
            "Battle Trance",
            "Start every fight with 25 Heat. With 80 Heat or more your hits deal 20 % more damage.",
            { conditionalDamage: [more(heat(80), 0.2)] },
            { startingHeat: 25 },
          ),
          n("Searing Steel", "30 % of your Physical Damage is converted to Fire.", {
            conversion: [{ from: "physical", to: "fire", share: 0.3 }],
          }),
        ],
      },
      {
        nodes: [t("First Light", BARRIER), t("Kiln Wall", ARMOR), t("Hearth Blood", LIFE)],
        notable: n(
          "Stoked",
          "Start every fight with 15 Heat. Within 3 s after a skill, your hits deal 20 % more damage.",
          { conditionalDamage: [more(within("skill", 3), 0.2)] },
          { startingHeat: 15 },
        ),
      },
      {
        nodes: [t("Arcing Ward", BARRIER), t("Steady Mind", TENACITY), t("Focus Ward", LIFE)],
        notable: n(
          "Arcane Edge",
          "20 % of your Physical Damage is converted to Lightning. Your hits deal 20 % more damage to Shocked enemies.",
          {
            conversion: [{ from: "physical", to: "lightning", share: 0.2 }],
            conditionalDamage: [more(has("shock"), 0.2)],
          },
        ),
        keystones: [
          {
            reach: [t("Measured Breath", TENACITY)],
            keystone: {
              name: "Spellblade",
              description:
                "Your skills also strike with your weapon for 100 % Weapon Damage. Your Default Attack deals 60 % less damage.",
              rules: { spellblade: { multiplier: 1 }, defaultAttackDamage: 0.4 },
            },
          },
        ],
      },
    ],
    innerTravel: t("Ward Flux", BARRIER),
    middleTravel: t("Charged Skin", LIFE),
    ward: {
      turn: 6,
      nodes: [
        t("Warding Rune", { increasedBarrier: 0.12 }),
        t("Hearthguard", { increasedLife: 0.04 }),
      ],
      notable: { name: "Spellguard", bonuses: { increasedBarrier: 0.2, increasedArmor: 0.1 } },
    },
  },
  {
    id: "arcana",
    branch: "arcana",
    angle: -45,
    hub: {
      name: "Sorcerer's Sigil",
      classStart: "sorcerer",
      description: "+10 % Barrier, +3 % max Life. The Sorcerer starts here.",
      bonuses: { increasedBarrier: 0.1, increasedLife: 0.03 },
    },
    spokes: [
      {
        nodes: [t("Static Ward", BARRIER), s(CHAIN_LIGHTNING), t("Clear Mind", TENACITY)],
        notable: n(
          "Storm Weaver",
          "Your hits deal 8 % more damage for every Shock stack on the enemy (up to 3).",
          {
            conditionalDamage: [1, 2, 3].map((c) => more(stacks("shock", c), 0.08)),
          },
        ),
      },
      {
        nodes: [t("Mind Shield", BARRIER), t("Insight", LIFE), t("Inner Calm", TENACITY)],
        notable: [
          n("Tempest", "Your hits against a Shocked enemy have +12 % Crit Chance.", {
            conditionalCrit: [more(has("shock"), 0.12)],
          }),
          {
            name: "Glacier",
            description: "+12 % Chill Chance. Your hits deal 25 % more damage to Chilled enemies.",
            bonuses: { chillChance: 0.12 },
            rules: { chilledDamage: 1.25 },
          },
        ],
        keystones: [
          {
            turn: -6,
            reach: [t("Lucidity", BARRIER), t("Echo Ward", LIFE)],
            keystone: {
              name: "Arcane Conduit",
              description:
                "Your skills spend all your Heat and deal 1 % more damage for every Heat above their cost. Your Default Attack deals 30 % less damage.",
              rules: { arcaneConduit: true, defaultAttackDamage: 0.7 },
            },
          },
          {
            turn: 6,
            reach: [t("Grounding", TENACITY), t("Frost Skin", BARRIER), t("Upwelling", LIFE)],
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
        nodes: [t("Rime Ward", BARRIER), s(ICE_LANCE), t("Still Mind", TENACITY)],
        notable: n(
          "Kindled Mind",
          "Your hits deal 15 % more damage to Chilled enemies and 10 % more while your Barrier holds.",
          {
            conditionalDamage: [more(has("chill"), 0.15), more({ kind: "barrierActive" }, 0.1)],
          },
        ),
      },
    ],
    innerTravel: t("Glow Ward", BARRIER),
    middleTravel: t("Heat Shimmer", LIFE),
    ward: {
      turn: 2,
      nodes: [
        t("Ward Weave", { increasedBarrier: 0.12 }),
        t("Quick Ward", { increasedLife: 0.04 }),
      ],
      notable: {
        name: "Ever-Ward",
        description: "+20 % Barrier. Your Barrier recharges 30 % faster.",
        bonuses: { increasedBarrier: 0.2 },
        rules: { barrierRecharge: 1.3 },
      },
    },
  },
  {
    id: "arcana-affliction",
    branch: "core",
    angle: 0,
    hub: t("Cinder Mantle", { increasedLife: 0.03, tenacity: 0.04 }),
    spokes: [
      {
        nodes: [t("Soot Skin", LIFE), t("Smoke Veil", EVASION), t("Ash Blood", TENACITY)],
        notable: [
          {
            name: "Firestarter",
            description: "+15 % Chance to Burn. Your Burns deal 20 % more damage.",
            bonuses: { burnChance: 0.15 },
            rules: { ailmentDamage: { burn: 1.2 } },
          },
          n("Smoulder", "Your Burns deal 15 % more damage to enemies below 50 % Life.", {
            ailmentDamageWhen: [{ ailment: "burn", amount: 0.15, condition: below(0.5) }],
          }),
        ],
      },
      {
        nodes: [t("Heat Ward", BARRIER), s(METEOR), t("Ember Hide", LIFE)],
        notable: n("Pyroclasm", "Your hits deal 25 % more damage to Burning enemies.", {
          conditionalDamage: [more(has("burn"), 0.25)],
        }),
        keystones: [
          {
            reach: [t("Ashfall", LIFE), t("Charred Skin", ARMOR)],
            keystone: {
              name: "Black Flame",
              description:
                "Your Burns also Corrupt, and your Corruption cuts healing like Burn. Your Default Attack deals 25 % less damage.",
              rules: {
                ailmentEcho: [{ from: "burn", to: "corruption" }],
                corruptionStopsHeal: true,
                defaultAttackDamage: 0.75,
              },
            },
          },
        ],
      },
      {
        nodes: [t("Ashen Skin", TENACITY), t("Ward Runes", BARRIER), t("Foreboding", LIFE)],
        notable: [
          n(
            "Heart of Embers",
            "+10 % Tenacity. Your hits deal 20 % more damage while your Barrier holds.",
            { conditionalDamage: [more({ kind: "barrierActive" }, 0.2)] },
            { tenacity: 0.1 },
          ),
          n("Void Ember", "30 % of your Fire Damage is converted to Void.", {
            conversion: [{ from: "fire", to: "void", share: 0.3 }],
          }),
        ],
      },
    ],
    innerTravel: t("Kindled Path", BARRIER),
    middleTravel: t("Black Smoke", TENACITY),
    ward: {
      turn: 8,
      nodes: [t("Ash Weave", { increasedBarrier: 0.12 }), t("Warm Blood", { increasedLife: 0.04 })],
      notable: { name: "Ember Mantle", bonuses: { increasedBarrier: 0.15, increasedLife: 0.05 } },
    },
  },
  {
    id: "affliction",
    branch: "affliction",
    angle: 45,
    hub: {
      name: "Warlock's Brand",
      classStart: "warlock",
      description: "+4 % max Life, +6 % Tenacity. The Warlock starts here.",
      bonuses: { increasedLife: 0.04, tenacity: 0.06 },
    },
    spokes: [
      {
        nodes: [t("Scorched Hide", LIFE), s(IMMOLATE), t("Ember Ash", TENACITY)],
        notable: n(
          "Pyre Heart",
          "Your Burns deal 10 % more damage to Corrupted enemies, your Corruption 10 % more to Burning ones.",
          {
            ailmentDamageWhen: [
              { ailment: "burn", amount: 0.1, condition: has("corruption") },
              { ailment: "corruption", amount: 0.1, condition: has("burn") },
            ],
          },
        ),
      },
      {
        nodes: [t("Blight", LIFE), s(SOUL_HARVEST), t("Grim Ward", BARRIER)],
        notable: [
          n(
            "Hungering Void",
            "Your Corruption deals 15 % more damage to enemies below 50 % Life.",
            { ailmentDamageWhen: [{ ailment: "corruption", amount: 0.15, condition: below(0.5) }] },
          ),
          n("Cinder Heart", "Your Burns deal 15 % more damage while you have 50 Heat or more.", {
            ailmentDamageWhen: [{ ailment: "burn", amount: 0.15, condition: heat(50) }],
          }),
        ],
        keystones: [
          {
            turn: -6,
            reach: [t("Rot Within", TENACITY), t("Withering", LIFE)],
            keystone: {
              name: "Slow Death",
              description:
                "Your hits deal 50 % less damage, but the ailments they cause stay as strong. Your ailments deal 25 % more damage.",
              rules: { slowDeath: { hit: 0.5 }, dotDamage: 1.25 },
            },
          },
          {
            turn: 6,
            reach: [t("Ash Oath", LIFE), t("Grave Cold", TENACITY), t("Soul Ember", BARRIER)],
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
        nodes: [t("Umbra", BARRIER), s(CORRUPT), t("Dread", TENACITY)],
        notable: n(
          "Hollow Crown",
          "Your hits deal 10 % more damage to Corrupted enemies. Heal 3 % of the damage your ailments deal.",
          { conditionalDamage: [more(has("corruption"), 0.1)], dotLifesteal: 0.03 },
        ),
      },
    ],
    innerTravel: t("Decay", LIFE),
    middleTravel: t("Mire", TENACITY),
    ward: {
      turn: 8,
      nodes: [t("Grave Hide", { increasedLife: 0.04 }), t("Stubborn", { tenacity: 0.08 })],
      notable: { name: "Deathless", bonuses: { increasedLife: 0.1, tenacity: 0.1 } },
    },
  },
  {
    id: "affliction-rupture",
    branch: "core",
    angle: 90,
    hub: t("Rampart", { increasedArmor: 0.08, tenacity: 0.04 }),
    spokes: [
      {
        nodes: [t("Septic", LIFE), s(WITHER), t("Bitter Blood", TENACITY)],
        notable: n(
          "Leeching Rot",
          "Heal 4 % of the damage your ailments deal. Your hits deal 10 % more damage to Poisoned enemies.",
          { dotLifesteal: 0.04, conditionalDamage: [more(has("poison"), 0.1)] },
        ),
        keystones: [
          {
            turn: -6,
            reach: [t("Fester", LIFE), t("Pestilence", TENACITY)],
            keystone: {
              name: "Blood and Bile",
              description:
                "Your Bleeds also Poison and your Poisons also make the enemy Bleed. Your hits deal 10 % less damage.",
              rules: {
                ailmentEcho: [
                  { from: "bleed", to: "poison" },
                  { from: "poison", to: "bleed" },
                ],
                hitDamage: 0.9,
              },
            },
          },
        ],
      },
      {
        nodes: [t("Iron Hide", ARMOR), t("Resolve", TENACITY), t("Ashguard", LIFE)],
        notable: n(
          "Iron Will",
          "+15 % Tenacity, +10 % Armor. Within 3 s after you Block, your hits deal 25 % more damage.",
          { conditionalDamage: [more(within("block", 3), 0.25)] },
          { tenacity: 0.15, increasedArmor: 0.1 },
        ),
      },
      {
        nodes: [t("Leatherback", ARMOR), s(TOXIC_BURST), t("Thick Blood", TENACITY)],
        notable: [
          {
            name: "Stoneskin",
            description: "+15 % Armor, +5 % max Life.",
            bonuses: { increasedArmor: 0.15, increasedLife: 0.05 },
          },
          n(
            "Bloodthirst",
            "+2 % Lifesteal. Below 50 % Life your hits deal 20 % more damage.",
            { conditionalDamage: [more({ kind: "lifeBelow", fraction: 0.5 }, 0.2)] },
            { lifesteal: 0.02 },
          ),
        ],
      },
    ],
    innerTravel: t("Sinew", TENACITY),
    middleTravel: t("Scar Tissue", ARMOR),
    ward: {
      turn: 8,
      nodes: [t("Light Step", { evasion: 0.03 }), t("Lean Muscle", { increasedLife: 0.04 })],
      notable: { name: "Ghost Step", bonuses: { evasion: 0.06, increasedLife: 0.06 } },
    },
  },
  {
    id: "rupture",
    branch: "rupture",
    angle: 135,
    hub: {
      name: "Reaver's Edge",
      classStart: "reaver",
      description: "+3 % Evasion, +3 % max Life. The Reaver starts here.",
      bonuses: { evasion: 0.03, increasedLife: 0.03 },
    },
    spokes: [
      {
        nodes: [t("Supple", EVASION), s(ENVENOM), t("Lithe", LIFE)],
        notable: n(
          "Venom Heart",
          "Your hits deal 1.5 % more damage for every Poison stack on the enemy (up to 10). Heal 2 % of the damage your ailments deal.",
          {
            conditionalDamage: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) =>
              more(stacks("poison", c), 0.015),
            ),
            dotLifesteal: 0.02,
          },
        ),
      },
      {
        nodes: [t("Scarred Hide", ARMOR), s(REND), t("Tough Sinew", TENACITY)],
        notable: [
          n("Exsanguinate", "Your Bleeds deal 25 % more damage to enemies below 50 % Life.", {
            ailmentDamageWhen: [{ ailment: "bleed", amount: 0.25, condition: below(0.5) }],
          }),
          n("Red Tide", "Your hits deal 35 % more damage to Bleeding enemies.", {
            conditionalDamage: [more(has("bleed"), 0.35)],
          }),
        ],
        keystones: [
          {
            turn: -6,
            reach: [t("Hard Lessons", LIFE), t("Battle Hardened", ARMOR)],
            keystone: {
              name: "Blood Price",
              description: "Your Crits always Bleed. Your Crit Chance is halved.",
              rules: { critsApplyBleed: true, critChanceMultiplier: 0.5 },
            },
          },
        ],
      },
      {
        nodes: [t("Quick Step", EVASION), s(SERRATED_EDGE), t("Wary", TENACITY)],
        notable: n(
          "Flayer",
          "Your hits deal 25 % more damage to Bleeding enemies and 15 % more to enemies below 50 % Life.",
          { conditionalDamage: [more(has("bleed"), 0.25), more(below(0.5), 0.15)] },
        ),
      },
    ],
    innerTravel: t("Bite", EVASION),
    middleTravel: t("Thornhide", ARMOR),
    ward: {
      turn: 8,
      nodes: [t("Side Step", { evasion: 0.03 }), t("Wiry", { increasedLife: 0.04 })],
      notable: { name: "Shadow Dancer", bonuses: { evasion: 0.08, increasedLife: 0.05 } },
    },
  },
  {
    id: "rupture-might",
    branch: "core",
    angle: 180,
    hub: {
      name: "Hunter's Eye",
      classStart: "hunter",
      description: "+3 % Evasion, +6 % Armor. The Hunter starts here.",
      bonuses: { evasion: 0.03, increasedArmor: 0.06 },
    },
    spokes: [
      {
        nodes: [t("Camouflage", EVASION), s(EXECUTE), t("Cold Blood", TENACITY)],
        notable: {
          name: "Coup de Grace",
          description: "Hits deal 25 % more damage to an enemy below 30 % Life.",
          rules: { execute: { below: 0.3, bonus: 0.25 } },
        },
        keystones: [
          {
            reach: [t("Stalker", EVASION)],
            keystone: {
              name: "Final Mercy",
              description:
                "Hits deal 60 % more damage to an enemy below 35 % Life, 15 % less while it is above.",
              rules: { execute: { below: 0.35, bonus: 0.6, above: 0.15 } },
            },
          },
        ],
      },
      {
        branch: "might",
        nodes: [t("Leather Guard", ARMOR), t("Steady Stance", TENACITY), t("Hunter's Hide", LIFE)],
        notable: n(
          "Killer Instinct",
          "Within 3 s after a Crit, your hits deal 20 % more damage and have +5 % Crit Chance.",
          {
            conditionalDamage: [more(within("crit", 3), 0.2)],
            conditionalCrit: [more(within("crit", 3), 0.05)],
          },
        ),
      },
      {
        nodes: [t("Fleet", EVASION), t("Sure Footing", TENACITY), t("Weathered", LIFE)],
        notable: [
          n(
            "Killer's Eye",
            "Against an enemy winding up a Heavy Attack your hits have +15 % Crit Chance and deal 20 % more damage.",
            {
              conditionalCrit: [more({ kind: "enemyWindup" }, 0.15)],
              conditionalDamage: [more({ kind: "enemyWindup" }, 0.2)],
            },
          ),
          n("Exploit Weakness", "Within 2 s after you Evade, your hits deal 30 % more damage.", {
            conditionalDamage: [more(within("evade", 2), 0.3)],
          }),
        ],
      },
    ],
    innerTravel: t("Whetted", EVASION),
    middleTravel: t("Hunter's Path", LIFE),
    ward: {
      turn: 1,
      nodes: [t("Toughened", { increasedArmor: 0.1 }), t("Recovery", { increasedLife: 0.04 })],
      notable: {
        name: "Veteran",
        bonuses: { increasedLife: 0.08, increasedArmor: 0.1, tenacity: 0.05 },
      },
    },
  },
];

/** Radii of the rings: hub, the three cluster nodes, Notable; Keystone paths continue outwards. */
const HUB_RADIUS = 2.6;
const SPOKE_RADII = [3.7, 4.8, 5.9] as const;
const NOTABLE_RADIUS = 7;
const MIDDLE_TRAVEL_RADIUS = 6.4;
const RADIUS_STEP = 1.1;
const SPOKE_TURN = 14;
/** The Ward bud: two nodes and its Notable, outwards from the middle travel node. */
const WARD_RADII = [7.7, 8.75, 9.85] as const;
const FORK_TURN = 4.5;
/** Rune Sockets sit on the travel line between the inner and the middle ring. */
const SOCKET_RADIUS = 4.6;

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
        [id(next, next.spokes[0].nodes[2]), id(region, region.ward.nodes[0])],
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

    // A Rune Socket (neuausrichtung-v1.md 4.2) between the inner and the middle ring.
    add({
      id: `${region.id}-rune-socket`,
      name: "Rune Socket",
      branch: region.branch,
      region: region.id,
      kind: "socket",
      description: "Holds a Rune from your pouch and gives its web effect. Kaelen sets it.",
      links: [middleId],
      ...polar(SOCKET_RADIUS, region.angle + 22.5),
    });

    // The Ward bud grows out of the middle travel node, between this region and the next.
    const wardAngle = region.angle + 22.5 + region.ward.turn;
    const wardIds = [...region.ward.nodes, region.ward.notable].map((n) => id(region, n));
    region.ward.nodes.forEach((spec, k) => {
      add(
        plain(region, spec, "minor", polar(WARD_RADII[k] ?? NOTABLE_RADIUS, wardAngle), [
          wardIds[k + 1] ?? "",
        ]),
      );
    });
    add(plain(region, region.ward.notable, "notable", polar(WARD_RADII[2], wardAngle), []));
  });
  return { nodes, classStarts };
}

const WEB = buildWeb();

/** The web's nodes (Prestige branches come on top, see `prestige-branches.ts`). */
export const WEB_NODES: readonly SkillNode[] = WEB.nodes;

/** Start node per class id. */
export const CLASS_STARTS: Readonly<Record<string, string>> = WEB.classStarts;
