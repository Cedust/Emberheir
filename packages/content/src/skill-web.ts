import type {
  AilmentType,
  CombatRules,
  FightMoment,
  RuleCondition,
  SkillDefinition,
  SkillNode,
  SkillTreeRegion,
  StatBonuses,
  TriggerSpec,
} from "@emberheir/sim";
import {
  CHAIN_LIGHTNING,
  CLEAVE,
  CORRUPT,
  CRUSHING_BLOW,
  ENVENOM,
  EXECUTE,
  FLURRY,
  FROST_NOVA,
  ICE_LANCE,
  IMMOLATE,
  INFERNO,
  IRON_BASTION,
  METEOR,
  RALLY,
  REND,
  SERRATED_EDGE,
  SOUL_HARVEST,
  THUNDERSTRIKE,
  TOXIC_BURST,
  VOID_RIFT,
  WITHER,
} from "./skills";

/**
 * The Ash Tree web (klassengeruest-v1.md 6). The crown holds one region per damage type and its
 * ailment: Steel (Physical, Stun), Blood (Bleed), Venom (Poison), Flame (Burn), Storm (Shock),
 * Frost (Chill) and Void (Corruption); their skills go into the Battle Plan. The trunk carries the
 * defense every build wants (Block, payback, Juggernaut), the roots Heat and the rotation.
 *
 * The crown regions and the trunk sit on a ring; every region has a hub on the inner ring and
 * three spokes running outwards, each a cluster of three nodes that ends in a Notable (or a fork
 * of two). The spokes are tied together by a middle ring, so neighbours give hybrids. Keystones
 * sit out beyond some Notables, a few points of travel away. The roots hang below the trunk and
 * join it at its middle Notable. Each class starts at the hub of its region.
 *
 *                      flame
 *            venom       │       storm
 *       blood     ╲      │      ╱     frost
 *            ─────────── ┼ ───────────
 *       steel     ╱      │      ╲     void
 *                      trunk
 *                        │
 *                      roots
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
}

interface RegionSpec {
  readonly id: Exclude<SkillTreeRegion, "core">;
  /** Direction on the ring. The ring runs in the order of `REGIONS`. */
  readonly angle: number;
  /** Off the ring: the hub joins this node of another region instead (the roots). */
  readonly attach?: string;
  /** Hub on the inner ring; a class start for the classes listed in `classStart`. */
  readonly hub: NodeSpec & { readonly classStart?: string };
  /** Spokes at -14°, 0° and +14° from the region's angle. */
  readonly spokes: readonly [SpokeSpec, SpokeSpec, SpokeSpec];
  /**
   * Travel nodes: the inner one sits on the Ash Tree's leader and joins the other regions there
   * (`LADDER`); the middle one, towards the next region on the ring, carries the Ward bud.
   */
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
  // --- the crown: one region per damage type and its ailment ---------------------------------
  {
    id: "steel",
    angle: 150,
    hub: {
      name: "Cinderguard's Oath",
      classStart: "cinderguard",
      description: "+4 % max Life, +8 % Armor. The Cinderguard starts here.",
      bonuses: { increasedLife: 0.04, increasedArmor: 0.08 },
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
        nodes: [t("Iron Skin", ARMOR), s(FLURRY), t("Hardy", LIFE)],
        notable: [
          n(
            "Colossus",
            "+8 % max Life. Within 4 s after a skill, your hits deal 30 % more damage.",
            { conditionalDamage: [more(within("skill", 4), 0.3)] },
            { increasedLife: 0.08 },
          ),
          n(
            "Killer Instinct",
            "Within 3 s after a Crit, your hits deal 20 % more damage and have +5 % Crit Chance.",
            {
              conditionalDamage: [more(within("crit", 3), 0.2)],
              conditionalCrit: [more(within("crit", 3), 0.05)],
            },
          ),
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
        nodes: [t("Thick Neck", ARMOR), s(CRUSHING_BLOW), t("Grit", LIFE)],
        notable: n(
          "Brutal Force",
          "Your hits deal 25 % more damage while you have 30 Heat or more, and 20 % more to Stunned enemies.",
          { conditionalDamage: [more(heat(30), 0.25), more({ kind: "enemyStunned" }, 0.2)] },
        ),
      },
    ],
    innerTravel: t("Drive", LIFE),
    middleTravel: t("Tempered Steel", ARMOR),
    ward: {
      turn: 0,
      nodes: [t("Thick Hide", { increasedLife: 0.04 }), t("Ironbark", { increasedArmor: 0.1 })],
      notable: { name: "Oakheart", bonuses: { increasedLife: 0.08, increasedArmor: 0.15 } },
    },
  },
  {
    id: "blood",
    angle: 190,
    hub: t("Red Mantle", { increasedLife: 0.03, increasedArmor: 0.06 }),
    spokes: [
      {
        nodes: [t("Scarred Hide", ARMOR), s(REND), t("Tough Sinew", TENACITY)],
        notable: [
          n("Exsanguinate", "Your Bleeds deal 40 % more damage to enemies below 50 % Life.", {
            ailmentDamageWhen: [{ ailment: "bleed", amount: 0.4, condition: below(0.5) }],
          }),
          n("Red Tide", "Your hits deal 35 % more damage to Bleeding enemies.", {
            conditionalDamage: [more(has("bleed"), 0.35)],
          }),
        ],
        keystones: [
          {
            turn: 5,
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
      {
        nodes: [t("Leatherback", ARMOR), s(CLEAVE), t("Thick Blood", TENACITY)],
        notable: n(
          "Bloodthirst",
          "+2 % Lifesteal. Below 50 % Life your hits deal 20 % more damage.",
          { conditionalDamage: [more({ kind: "lifeBelow", fraction: 0.5 }, 0.2)] },
          { lifesteal: 0.02 },
        ),
        keystones: [
          {
            turn: -5,
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
    ],
    innerTravel: t("Bite", EVASION),
    middleTravel: t("Thornhide", ARMOR),
    ward: {
      turn: 0,
      nodes: [t("Toughened", { increasedArmor: 0.1 }), t("Recovery", { increasedLife: 0.04 })],
      notable: {
        name: "Veteran",
        bonuses: { increasedLife: 0.08, increasedArmor: 0.1, tenacity: 0.05 },
      },
    },
  },
  {
    id: "venom",
    angle: 230,
    hub: {
      name: "Ashstrider's Edge",
      classStart: "ashstrider",
      description: "+3 % Evasion, +3 % max Life. The Ashstrider starts here.",
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
        nodes: [t("Septic", LIFE), s(WITHER), t("Bitter Blood", TENACITY)],
        notable: n(
          "Leeching Rot",
          "Heal 4 % of the damage your ailments deal. Your hits deal 10 % more damage to Poisoned enemies.",
          { dotLifesteal: 0.04, conditionalDamage: [more(has("poison"), 0.1)] },
        ),
        keystones: [
          {
            reach: [t("Rot Within", TENACITY), t("Withering", LIFE)],
            keystone: {
              name: "Slow Death",
              description:
                "Your hits deal 50 % less damage, but the ailments they cause stay as strong. Your ailments deal 25 % more damage.",
              rules: { slowDeath: { hit: 0.5 }, dotDamage: 1.25 },
            },
          },
        ],
      },
      {
        nodes: [t("Smoke Veil", EVASION), s(TOXIC_BURST), t("Wiry Blood", TENACITY)],
        notable: [
          n("Virulence", "Your Poisons deal 25 % more damage to enemies below 50 % Life.", {
            ailmentDamageWhen: [{ ailment: "poison", amount: 0.25, condition: below(0.5) }],
          }),
          {
            name: "Creeping Death",
            description: "+15 % Chance to Poison. Your Poisons deal 15 % more damage.",
            bonuses: { poisonChance: 0.15 },
            rules: { ailmentDamage: { poison: 1.15 } },
          },
        ],
      },
    ],
    innerTravel: t("Decay", LIFE),
    middleTravel: t("Mire", EVASION),
    ward: {
      turn: 0,
      nodes: [t("Light Step", { evasion: 0.03 }), t("Lean Muscle", { increasedLife: 0.04 })],
      notable: { name: "Ghost Step", bonuses: { evasion: 0.06, increasedLife: 0.06 } },
    },
  },
  {
    id: "flame",
    angle: 270,
    hub: t("Kindling", { increasedLife: 0.03, increasedBarrier: 0.06 }),
    spokes: [
      {
        nodes: [t("Soot Skin", LIFE), s(IMMOLATE), t("Ash Blood", TENACITY)],
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
            turn: -6,
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
        nodes: [t("Scorched Hide", LIFE), s(INFERNO), t("Ember Ash", TENACITY)],
        notable: [
          n("Searing Steel", "30 % of your Physical Damage is converted to Fire.", {
            conversion: [{ from: "physical", to: "fire", share: 0.3 }],
          }),
          n("Cinder Heart", "Your Burns deal 15 % more damage while you have 50 Heat or more.", {
            ailmentDamageWhen: [{ ailment: "burn", amount: 0.15, condition: heat(50) }],
          }),
        ],
      },
    ],
    innerTravel: t("Kindled Path", BARRIER),
    middleTravel: t("Black Smoke", TENACITY),
    ward: {
      turn: 0,
      nodes: [t("Ash Weave", { increasedBarrier: 0.12 }), t("Warm Blood", { increasedLife: 0.04 })],
      notable: { name: "Ember Mantle", bonuses: { increasedBarrier: 0.15, increasedLife: 0.05 } },
    },
  },
  {
    id: "storm",
    angle: 310,
    hub: t("Storm Sigil", { increasedBarrier: 0.1, increasedLife: 0.03 }),
    spokes: [
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
        nodes: [t("Mind Shield", BARRIER), s(THUNDERSTRIKE), t("Insight", LIFE)],
        notable: [
          n("Tempest", "Your hits against a Shocked enemy have +12 % Crit Chance.", {
            conditionalCrit: [more(has("shock"), 0.12)],
          }),
          n(
            "Thunderhead",
            "+15 % Chance to Shock. With 50 Heat or more your hits deal 15 % more damage.",
            { conditionalDamage: [more(heat(50), 0.15)] },
            { shockChance: 0.15 },
          ),
        ],
      },
    ],
    innerTravel: t("Glow Ward", BARRIER),
    middleTravel: t("Heat Shimmer", LIFE),
    ward: {
      turn: 0,
      nodes: [
        t("Warding Rune", { increasedBarrier: 0.12 }),
        t("Hearthguard", { increasedLife: 0.04 }),
      ],
      notable: { name: "Spellguard", bonuses: { increasedBarrier: 0.2, increasedArmor: 0.1 } },
    },
  },
  {
    id: "frost",
    angle: 350,
    hub: t("Frost Sigil", { increasedBarrier: 0.1, tenacity: 0.04 }),
    spokes: [
      {
        nodes: [t("Rime Ward", BARRIER), s(ICE_LANCE), t("Still Mind", TENACITY)],
        notable: {
          name: "Glacier",
          description: "+12 % Chill Chance. Your hits deal 15 % more damage to Chilled enemies.",
          bonuses: { chillChance: 0.12 },
          rules: { chilledDamage: 1.15 },
        },
        keystones: [
          {
            turn: 5,
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
        nodes: [t("Hoarfrost", BARRIER), s(FROST_NOVA), t("Inner Calm", TENACITY)],
        notable: [
          n(
            "Kindled Mind",
            "Your hits deal 10 % more damage to Chilled enemies and 10 % more while your Barrier holds.",
            {
              conditionalDamage: [more(has("chill"), 0.1), more({ kind: "barrierActive" }, 0.1)],
            },
          ),
          n("Deep Freeze", "Your hits against a Chilled enemy have +10 % Crit Chance.", {
            conditionalCrit: [more(has("chill"), 0.1)],
          }),
        ],
      },
      {
        nodes: [t("Ward Runes", BARRIER), t("Lucidity", TENACITY), t("Echo Ward", LIFE)],
        notable: n(
          "Heart of Winter",
          "+10 % Tenacity. Your hits deal 20 % more damage while your Barrier holds.",
          { conditionalDamage: [more({ kind: "barrierActive" }, 0.2)] },
          { tenacity: 0.1 },
        ),
      },
    ],
    innerTravel: t("Cold Path", BARRIER),
    middleTravel: t("White Breath", TENACITY),
    ward: {
      turn: 0,
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
    id: "void",
    angle: 30,
    hub: {
      name: "Emberseer's Brand",
      classStart: "emberseer",
      description: "+4 % max Life, +6 % Tenacity. The Emberseer starts here.",
      bonuses: { increasedLife: 0.04, tenacity: 0.06 },
    },
    spokes: [
      {
        nodes: [t("Umbra", BARRIER), s(CORRUPT), t("Dread", TENACITY)],
        notable: n(
          "Hollow Crown",
          "Your hits deal 10 % more damage to Corrupted enemies. Heal 3 % of the damage your ailments deal.",
          { conditionalDamage: [more(has("corruption"), 0.1)], dotLifesteal: 0.03 },
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
          n("Void Ember", "30 % of your Fire Damage is converted to Void.", {
            conversion: [{ from: "fire", to: "void", share: 0.3 }],
          }),
        ],
        keystones: [
          {
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
        nodes: [t("Gloom", BARRIER), s(VOID_RIFT), t("Foreboding", LIFE)],
        notable: [
          n(
            "Pyre Heart",
            "Your Burns deal 10 % more damage to Corrupted enemies, your Corruption 10 % more to Burning ones.",
            {
              ailmentDamageWhen: [
                { ailment: "burn", amount: 0.1, condition: has("corruption") },
                { ailment: "corruption", amount: 0.1, condition: has("burn") },
              ],
            },
          ),
          n("Entropy", "Your Corruption deals 20 % more damage while you have 50 Heat or more.", {
            ailmentDamageWhen: [{ ailment: "corruption", amount: 0.2, condition: heat(50) }],
          }),
        ],
      },
    ],
    innerTravel: t("Dark Path", BARRIER),
    middleTravel: t("Black Mire", TENACITY),
    ward: {
      turn: 0,
      nodes: [t("Grave Hide", { increasedLife: 0.04 }), t("Stubborn", { tenacity: 0.08 })],
      notable: { name: "Deathless", bonuses: { increasedLife: 0.1, tenacity: 0.1 } },
    },
  },
  // --- the trunk: defense for everyone (Block, payback and the Warden's Juggernaut) ----------
  {
    id: "trunk",
    angle: 90,
    hub: t("Heartwood", { increasedLife: 0.04, increasedArmor: 0.06 }),
    spokes: [
      {
        nodes: [
          t("Bulwark", { blockChance: 0.03 }),
          s(IRON_BASTION),
          t("Stone Skin", { allResistance: 0.04 }),
        ],
        notable: [
          {
            name: "Shield Wall",
            description: "When you Block, gain Barrier worth 5 % of your max Life.",
            triggers: [
              {
                id: "trunk-shield-wall",
                name: "Shield Wall",
                condition: { kind: "onBlock" },
                cooldown: 2,
                effect: { kind: "barrier", fraction: 0.05 },
              },
            ],
          },
          {
            name: "Shield Bash",
            description: "When you Block, stun the enemy for 0.5 s.",
            triggers: [
              {
                id: "trunk-shield-bash",
                name: "Shield Bash",
                condition: { kind: "onBlock" },
                cooldown: 3,
                effect: { kind: "stun", seconds: 0.5 },
              },
            ],
          },
        ],
        keystones: [
          {
            turn: -4,
            reach: [t("Old Bark", ARMOR), t("Deep Grain", LIFE)],
            keystone: {
              name: "Juggernaut",
              description: "You take 15 % less damage. Your Default Attack deals 20 % less damage.",
              rules: { damageTaken: -0.15, defaultAttackDamage: 0.8 },
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
        nodes: [t("Plating", ARMOR), t("Stalwart", TENACITY), t("Fortress", { blockChance: 0.03 })],
        notable: [
          {
            name: "Retaliation",
            description:
              "When you are hit, send 30 % of it back (at most 3 % of the attacker's Life).",
            triggers: [
              {
                id: "trunk-retaliation",
                name: "Retaliation",
                condition: { kind: "whenHit" },
                effect: { kind: "reflect", fraction: 0.3, cap: 0.03, damageType: "physical" },
              },
            ],
          },
          {
            name: "Unbreakable",
            description: "Once per fight, below 35 % Life: Barrier worth 30 % of your max Life.",
            triggers: [
              {
                id: "trunk-unbreakable",
                name: "Unbreakable",
                condition: { kind: "lifeBelow", threshold: 0.35 },
                oncePerFight: true,
                effect: { kind: "barrier", fraction: 0.3 },
              },
            ],
          },
        ],
      },
    ],
    innerTravel: t("Sinew", TENACITY),
    middleTravel: t("Scar Tissue", ARMOR),
    ward: {
      turn: 0,
      nodes: [t("Bark Skin", { increasedArmor: 0.1 }), t("Old Growth", { increasedLife: 0.04 })],
      notable: {
        name: "Stoneskin",
        description: "+15 % Armor, +5 % max Life.",
        bonuses: { increasedArmor: 0.15, increasedLife: 0.05 },
      },
    },
  },
  // --- the roots: Heat and the rotation (the Tactician's Rally and Grand Strategy) -----------
  {
    id: "roots",
    angle: 90,
    attach: "trunk-iron-will",
    hub: t("Taproot", { increasedLife: 0.03, tenacity: 0.04 }),
    spokes: [
      {
        nodes: [
          {
            name: "Battle Scars",
            description:
              "While wielding a Melee Weapon: enemy hits build Heat (Heat from Hits Taken).",
            bonuses: { heatFromHitsTaken: 1 },
            weaponRange: "melee",
          },
          s(RALLY),
          t("Grudge", LIFE),
        ],
        notable: {
          name: "Unbroken",
          description:
            "While wielding a Melee Weapon: +50 % Heat from Hits Taken. With 50 Heat or more your hits deal 40 % more damage.",
          bonuses: { heatFromHitsTaken: 0.5 },
          weaponRange: "melee",
          rules: { conditionalDamage: [more(heat(50), 0.4)] },
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
      {
        nodes: [t("Steady Pulse", TENACITY), t("Warm Hide", LIFE), t("First Light", BARRIER)],
        notable: [
          n(
            "Battle Trance",
            "Start every fight with 25 Heat. With 80 Heat or more your hits deal 20 % more damage.",
            { conditionalDamage: [more(heat(80), 0.2)] },
            { startingHeat: 25 },
          ),
          {
            name: "Refund",
            description: "Skills have a 25 % chance to give back 15 Heat.",
            triggers: [
              {
                id: "roots-refund",
                name: "Refund",
                condition: { kind: "onSkillUse" },
                chance: 0.25,
                effect: { kind: "heat", amount: 15 },
              },
            ],
          },
        ],
        keystones: [
          {
            turn: -6,
            reach: [t("Deep Roots", TENACITY), t("Long Count", LIFE)],
            keystone: {
              name: "Grand Strategy",
              description: "Skills cost 20 % less Heat. You take 10 % more damage.",
              rules: { skillCostMultiplier: 0.8, damageTaken: 0.1 },
            },
          },
          {
            turn: 6,
            reach: [t("Lodestone", BARRIER), t("Echo Root", TENACITY), t("Upflow", LIFE)],
            keystone: {
              name: "Arcane Conduit",
              description:
                "Your skills spend all your Heat and deal 1 % more damage for every Heat above their cost. Your Default Attack deals 30 % less damage.",
              rules: { arcaneConduit: true, defaultAttackDamage: 0.7 },
            },
          },
        ],
      },
      {
        nodes: [t("Kiln Wall", ARMOR), t("Steady Breath", TENACITY), t("Hearth Blood", LIFE)],
        notable: n(
          "Stoked",
          "Start every fight with 15 Heat. Within 3 s after a skill, your hits deal 20 % more damage.",
          { conditionalDamage: [more(within("skill", 3), 0.2)] },
          { startingHeat: 15 },
        ),
      },
    ],
    innerTravel: t("Root Warmth", LIFE),
    middleTravel: t("Ember Vein", TENACITY),
    ward: {
      turn: 0,
      nodes: [t("Side Step", { evasion: 0.03 }), t("Wiry", { increasedLife: 0.04 })],
      notable: { name: "Shadow Dancer", bonuses: { evasion: 0.08, increasedLife: 0.05 } },
    },
  },
];

/** Radii of the rings: hub, the three cluster nodes, Notable; Keystone paths continue outwards. */
const HUB_RADIUS = 2.6;
const SPOKE_RADII = [3.7, 4.8, 5.9] as const;
const NOTABLE_RADIUS = 7;
const MIDDLE_TRAVEL_RADIUS = 6.4;
const RADIUS_STEP = 1.1;
const SPOKE_TURN = 13;
/**
 * The middle travel node forks off the last spoke, outwards and a little to its side, so the
 * Ward bud grows on as a side branch of that spoke (Timo 2026-10-19: no twig growing back).
 */
const MIDDLE_TRAVEL_TURN = 20;
/** The Ward bud: two nodes and its Notable, outwards from the middle travel node. */
const WARD_RADII = [8.1, 9.15, 10.25] as const;
const WARD_TURN = 21;
const FORK_TURN = 3.2;
/** Angle to the travel nodes of a region off the ring (twice the turn to them). */
const DEFAULT_GAP = 40;
/** Rune Sockets hang off the middle travel node, outwards beside the Ward bud. */
const SOCKET_RADIUS = 7.3;
const SOCKET_TURN = 26;

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
  ): SkillNode => ({
    id: `${region.id}-${slug(spec.name)}`,
    name: spec.name,
    branch: region.id,
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

  const innerOf = (regionId: string) => {
    const region = REGIONS.find((r) => r.id === regionId);
    return region ? id(region, region.innerTravel) : "";
  };
  // The ladder up the leader: each rung's travel nodes join each other and the rung above, on
  // the same side (a rung of one joins both).
  const ladderLinks = (regionId: string): string[] => {
    const k = LADDER.findIndex((rung) => rung.includes(regionId as TreeRegionId));
    const rung = LADDER[k];
    const above = LADDER[k + 1];
    if (!rung) return [];
    const side = rung.indexOf(regionId as TreeRegionId);
    const links = side === 0 && rung[1] ? [innerOf(rung[1])] : [];
    if (above) {
      const up = rung.length === above.length ? [above[side]] : above;
      links.push(...up.filter((r): r is TreeRegionId => !!r).map(innerOf));
    }
    return links;
  };

  const ring = REGIONS.filter((r) => !r.attach);
  for (const region of REGIONS) {
    const r = ring.indexOf(region);
    const next = r >= 0 ? (ring[(r + 1) % ring.length] as RegionSpec) : undefined;
    // Travel nodes sit halfway to the next region on the ring.
    const gap = next ? (((next.angle - region.angle) % 360) + 360) % 360 : DEFAULT_GAP;
    const travel = region.angle + gap / 2;
    const hubId = id(region, region.hub);
    const innerId = id(region, region.innerTravel);
    const middleId = id(region, region.middleTravel);
    const firstNodes = region.spokes.map((spoke) => id(region, spoke.nodes[0]));
    // The trunk's own hub is the ladder's foot; every crown region climbs it by its inner
    // travel node.
    const foot = region.id === LADDER[0]?.[0];
    const hub = plain(region, region.hub, "minor", polar(HUB_RADIUS, region.angle), [
      innerId,
      ...firstNodes,
      ...(region.attach ? [region.attach] : []),
      ...(foot ? ladderLinks(region.id) : []),
    ]);
    add(region.hub.classStart ? { ...hub, classStart: region.hub.classStart } : hub);
    if (region.hub.classStart) classStarts[region.hub.classStart] = hubId;
    add(
      plain(
        region,
        region.innerTravel,
        "minor",
        polar(HUB_RADIUS, travel),
        foot ? [] : ladderLinks(region.id),
      ),
    );
    add(
      plain(
        region,
        region.middleTravel,
        "minor",
        polar(MIDDLE_TRAVEL_RADIUS, region.angle + MIDDLE_TRAVEL_TURN),
        [id(region, region.ward.nodes[0])],
      ),
    );

    region.spokes.forEach((spoke, i) => {
      const angle = region.angle + (i - 1) * SPOKE_TURN;
      const branch = region.id;
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
        } else add(plain(region, spec, "minor", at, links));
      });
      const fork = notables.length > 1 ? `${region.id}-${i}` : undefined;
      notables.forEach((spec, k) => {
        const turn = notables.length > 1 ? (k === 0 ? -FORK_TURN : FORK_TURN) : 0;
        const node = plain(region, spec, "notable", polar(NOTABLE_RADIUS, angle + turn), []);
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
          add(plain(region, spec, "minor", at, links));
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

    // A Rune Socket (neuausrichtung-v1.md 4.2) on a short twig off the middle travel node.
    add({
      id: `${region.id}-rune-socket`,
      name: "Rune Socket",
      branch: region.id,
      region: region.id,
      kind: "socket",
      description: "Holds a Rune from your pouch and gives its web effect. Kaelen sets it.",
      links: [middleId],
      ...polar(SOCKET_RADIUS, region.angle + SOCKET_TURN),
    });

    // The Ward bud grows on out of the middle travel node.
    const wardAngle = region.angle + WARD_TURN + region.ward.turn;
    const wardIds = [...region.ward.nodes, region.ward.notable].map((n) => id(region, n));
    region.ward.nodes.forEach((spec, k) => {
      add(
        plain(region, spec, "minor", polar(WARD_RADII[k] ?? NOTABLE_RADIUS, wardAngle), [
          wardIds[k + 1] ?? "",
        ]),
      );
    });
    add(plain(region, region.ward.notable, "notable", polar(WARD_RADII[2], wardAngle), []));
  }
  return { nodes, classStarts };
}

type TreeRegionId = Exclude<SkillTreeRegion, "core">;

/**
 * The ladder up the Ash Tree's leader (tree-shape.ts), from the trunk's hub at its top up: each
 * crown region's inner travel node sits where its bough leaves the leader, left and right at the
 * same height. Any two regions meet over a few rungs instead of going round the ring (Timo
 * 2026-10-19: shorter ways from the class starts).
 */
const LADDER: readonly (readonly TreeRegionId[])[] = [
  ["trunk"],
  ["steel", "void"],
  ["blood", "frost"],
  ["venom", "storm"],
  ["flame"],
];

const WEB = buildWeb();

/** The crown regions' inner travel nodes, which sit on the leader, by region. */
export const LEADER_NODES: Readonly<Record<string, TreeRegionId>> = Object.fromEntries(
  REGIONS.filter((r) => r.id !== "trunk" && LADDER.some((rung) => rung.includes(r.id))).map((r) => [
    `${r.id}-${slug(r.innerTravel.name)}`,
    r.id,
  ]),
);

/** The web's nodes (Prestige branches come on top, see `masteries.ts`). */
export const WEB_NODES: readonly SkillNode[] = WEB.nodes;

/** Start node per class id. */
export const CLASS_STARTS: Readonly<Record<string, string>> = WEB.classStarts;
