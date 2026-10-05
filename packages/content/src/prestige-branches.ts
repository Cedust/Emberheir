import type {
  CombatRules,
  PrestigeBranchDefinition,
  SkillDefinition,
  SkillNode,
  SkillNodeKind,
  StatBonuses,
  TriggerSpec,
} from "@emberheir/sim";
import {
  CLEAVE,
  FEINT,
  FROST_NOVA,
  INFERNO,
  IRON_BASTION,
  PIERCING_SHOT,
  PLAGUE_CLOUD,
  RALLY,
  THUNDERSTRIKE,
  VOID_RIFT,
} from "./skills";

/**
 * Prestige branches (skill-tree-v1.md section 3, skilltree-v2.md): one is picked per Prestige, in
 * the Bloodline step: a new branch, or a deeper tier of an owned one. Each deepens a base branch
 * and grows out of the tree at one of its nodes. Tier I has ten nodes (16 Skill Points + 1
 * Keystone); tiers II and III each add three nodes and lift the Keystone (Greater, Supreme):
 *
 *   entry ─ a1 ─ a2 (notable) ─┐       ┌─ a3 (notable) ─ keystone ─ keystone II ─ keystone III
 *       └── b1 ─ skill ────────┴─ mid ─┴─ b3 (notable) ─ b4 ─ t2a ─┬─ t2n (notable)
 *                                                                  └─ t2b ─ t3a ─┬─ t3n (notable)
 *                                                                                └─ t3b
 *
 * The branch runs outwards from the middle of the tree along `angle`. Numbers are starting values.
 */

interface NodeSpec {
  readonly name: string;
  readonly description: string;
  readonly bonuses?: StatBonuses;
  readonly triggers?: readonly TriggerSpec[];
  readonly weaponRange?: "melee" | "ranged";
  /** Slot of a lower tier this node upgrades (its triggers and rules stop). */
  readonly replaces?: Slot;
  readonly rules?: CombatRules;
}

interface KeystoneSpec {
  readonly name: string;
  readonly description: string;
  readonly rules: CombatRules;
}

/** A deeper tier: two Minor nodes, a Notable and the stronger Keystone. */
interface TierSpec {
  readonly a: NodeSpec;
  readonly notable: NodeSpec;
  readonly b: NodeSpec;
  readonly keystone: KeystoneSpec;
}

interface BranchSpec extends PrestigeBranchDefinition {
  /** Direction the branch grows out of the tree, in degrees (0 = right, 90 = down). */
  readonly angle: number;
  readonly entry: NodeSpec;
  readonly a1: NodeSpec;
  readonly b1: NodeSpec;
  readonly a2: NodeSpec;
  readonly skill: SkillDefinition;
  readonly mid: NodeSpec;
  readonly a3: NodeSpec;
  readonly b3: NodeSpec;
  readonly b4: NodeSpec;
  readonly keystone: KeystoneSpec;
  readonly t2: TierSpec;
  readonly t3: TierSpec;
}

type Slot =
  | "entry"
  | "a1"
  | "b1"
  | "a2"
  | "skill"
  | "mid"
  | "a3"
  | "b3"
  | "b4"
  | "keystone"
  | "keystone-2"
  | "t2a"
  | "t2n"
  | "t2b"
  | "keystone-3"
  | "t3a"
  | "t3n"
  | "t3b";

/** Layout along the branch (x outwards, y across) and the links of every slot. */
const SHAPE: Record<
  Slot,
  {
    readonly kind: SkillNodeKind;
    readonly tier: 1 | 2 | 3;
    readonly x: number;
    readonly y: number;
    readonly ranks: number;
    readonly links: readonly Slot[];
  }
> = {
  entry: { kind: "minor", tier: 1, x: 0, y: 1, ranks: 2, links: ["a1", "b1"] },
  a1: { kind: "minor", tier: 1, x: 1, y: 0, ranks: 2, links: ["a2"] },
  b1: { kind: "minor", tier: 1, x: 1, y: 2, ranks: 2, links: ["skill"] },
  a2: { kind: "notable", tier: 1, x: 2, y: 0, ranks: 1, links: ["mid"] },
  skill: { kind: "skill", tier: 1, x: 2, y: 2, ranks: 3, links: ["mid"] },
  mid: { kind: "minor", tier: 1, x: 3, y: 1, ranks: 2, links: ["a3", "b3"] },
  a3: { kind: "notable", tier: 1, x: 4, y: 0, ranks: 1, links: ["keystone"] },
  b3: { kind: "notable", tier: 1, x: 4, y: 2, ranks: 1, links: ["b4"] },
  b4: { kind: "minor", tier: 1, x: 5, y: 2, ranks: 2, links: ["t2a"] },
  keystone: { kind: "keystone", tier: 1, x: 5, y: 0, ranks: 1, links: ["keystone-2"] },
  "keystone-2": { kind: "keystone", tier: 2, x: 6, y: -0.5, ranks: 1, links: ["keystone-3"] },
  t2a: { kind: "minor", tier: 2, x: 6, y: 2, ranks: 2, links: ["t2n", "t2b"] },
  t2n: { kind: "notable", tier: 2, x: 7, y: 1.2, ranks: 1, links: [] },
  t2b: { kind: "minor", tier: 2, x: 7, y: 2.8, ranks: 2, links: ["t3a"] },
  "keystone-3": { kind: "keystone", tier: 3, x: 7, y: -1, ranks: 1, links: [] },
  t3a: { kind: "minor", tier: 3, x: 8, y: 2.2, ranks: 2, links: ["t3n", "t3b"] },
  t3n: { kind: "notable", tier: 3, x: 9, y: 1.4, ranks: 1, links: [] },
  t3b: { kind: "minor", tier: 3, x: 9, y: 3, ranks: 2, links: [] },
};

const SLOTS = Object.keys(SHAPE) as Slot[];
const nodeId = (branch: string, slot: Slot) => `pb-${branch}-${slot}`;

/** Distance of a branch's entry node from the middle of the tree, and the node spacing. */
const START_RADIUS = 8.2;
const STEP = 1.1;

function slotSpec(spec: BranchSpec, slot: Slot): NodeSpec | KeystoneSpec {
  switch (slot) {
    case "keystone-2":
      return spec.t2.keystone;
    case "keystone-3":
      return spec.t3.keystone;
    case "t2a":
      return spec.t2.a;
    case "t2n":
      return spec.t2.notable;
    case "t2b":
      return spec.t2.b;
    case "t3a":
      return spec.t3.a;
    case "t3n":
      return spec.t3.notable;
    case "t3b":
      return spec.t3.b;
    case "skill":
      throw new Error("Skill slots have no NodeSpec");
    default:
      return spec[slot];
  }
}

function buildBranch(spec: BranchSpec): SkillNode[] {
  const a = (spec.angle * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const at = (x: number, y: number) => {
    const along = START_RADIUS + x * STEP;
    const across = (y - 1) * STEP;
    const round = (v: number) => Math.round(v * 100) / 100;
    return { x: round(dx * along - dy * across), y: round(dy * along + dx * across) };
  };
  return SLOTS.map((slot) => {
    const shape = SHAPE[slot];
    const links = shape.links.map((l) => nodeId(spec.id, l));
    const base = {
      id: nodeId(spec.id, slot),
      branch: spec.branch,
      kind: shape.kind,
      links: slot === "entry" ? [spec.anchor, ...links] : links,
      ...at(shape.x, shape.y),
      prestigeBranch: spec.id,
      ...(shape.tier > 1 ? { tier: shape.tier } : {}),
      ...(shape.ranks > 1 ? { maxRanks: shape.ranks } : {}),
    };
    if (slot === "skill") {
      return {
        ...base,
        name: spec.skill.name,
        description: `Unlocks ${spec.skill.name}. Each rank adds a Skill Level.`,
        skill: spec.skill,
      };
    }
    const node = slotSpec(spec, slot);
    if ("rules" in node && shape.kind === "keystone") {
      const replaces =
        slot === "keystone-2" ? "keystone" : slot === "keystone-3" ? "keystone-2" : undefined;
      return {
        ...base,
        name: node.name,
        description: node.description,
        keystone: node.rules,
        ...(replaces ? { replaces: nodeId(spec.id, replaces) } : {}),
      };
    }
    const plain = node as NodeSpec;
    return {
      ...base,
      name: plain.name,
      description: plain.description,
      ...(plain.bonuses ? { bonuses: plain.bonuses } : {}),
      ...(plain.triggers ? { triggers: plain.triggers } : {}),
      ...(plain.weaponRange ? { weaponRange: plain.weaponRange } : {}),
      ...(plain.rules ? { rules: plain.rules } : {}),
      ...(plain.replaces ? { replaces: nodeId(spec.id, plain.replaces) } : {}),
    };
  });
}

const BRANCHES: readonly BranchSpec[] = [
  {
    id: "duelist",
    name: "Duelist",
    branch: "might",
    anchor: "might-brutal-force",
    theme: "Melee Crits and counters on Block.",
    angle: -160,
    entry: {
      name: "Fencer's Stance",
      description: "While wielding a Melee Weapon: +2 % Crit Chance per rank.",
      bonuses: { critChance: 0.02 },
      weaponRange: "melee",
    },
    a1: {
      name: "Parry",
      description: "+3 % Block Chance per rank.",
      bonuses: { blockChance: 0.03 },
    },
    b1: {
      name: "Lunge",
      description: "+6 % Physical Damage per rank.",
      bonuses: { physicalDamage: 0.06 },
    },
    a2: {
      name: "Riposte",
      description: "When you Block, strike back for 150 % Weapon Damage.",
      triggers: [
        {
          id: "duelist-riposte",
          name: "Riposte",
          condition: { kind: "onBlock" },
          cooldown: 1,
          effect: { kind: "weaponHit", multiplier: 1.5 },
        },
      ],
    },
    skill: FEINT,
    mid: {
      name: "Footwork",
      description: "+4 % Attack Speed per rank.",
      bonuses: { attackSpeed: 0.04 },
    },
    a3: {
      name: "Bloodrush",
      description: "Crits give +8 % Attack Speed for 3 s, up to 3 times.",
      triggers: [
        {
          id: "duelist-bloodrush",
          name: "Bloodrush",
          condition: { kind: "onCrit" },
          effect: { kind: "buff", stat: "attackSpeed", amount: 0.08, duration: 3, maxStacks: 3 },
        },
      ],
    },
    b3: {
      name: "En Garde",
      description: "+6 % Block Chance, +10 % Tenacity.",
      bonuses: { blockChance: 0.06, tenacity: 0.1 },
    },
    b4: {
      name: "Steel Nerves",
      description: "+4 % Physical Penetration per rank.",
      bonuses: { physicalPenetration: 0.04 },
    },
    keystone: {
      name: "Blade Dancer",
      description: "Your Crit Chance is 50 % higher. You take 15 % more damage.",
      rules: { critChanceMultiplier: 1.5, damageTaken: 0.15 },
    },
    t2: {
      a: {
        name: "Blade Edge",
        description: "+3 % Crit Chance per rank.",
        bonuses: { critChance: 0.03 },
      },
      notable: {
        name: "Counterstance",
        description: "Riposte strikes for 200 % Weapon Damage, every 0.5 s at most.",
        replaces: "a2",
        triggers: [
          {
            id: "duelist-counterstance",
            name: "Riposte",
            condition: { kind: "onBlock" },
            cooldown: 0.5,
            effect: { kind: "weaponHit", multiplier: 2 },
          },
        ],
      },
      b: {
        name: "Light Feet",
        description: "+3 % Evasion per rank.",
        bonuses: { evasion: 0.03 },
      },
      keystone: {
        name: "Greater Blade Dancer",
        description: "Your Crit Chance is 75 % higher. You take 15 % more damage.",
        rules: { critChanceMultiplier: 1.75, damageTaken: 0.15 },
      },
    },
    t3: {
      a: {
        name: "Fencer's Grace",
        description: "+4 % Attack Speed per rank.",
        bonuses: { attackSpeed: 0.04 },
      },
      notable: {
        name: "Flourish",
        description: "Crits give +10 % Physical Damage for 3 s, up to 3 times.",
        triggers: [
          {
            id: "duelist-flourish",
            name: "Flourish",
            condition: { kind: "onCrit" },
            effect: {
              kind: "buff",
              stat: "physicalDamage",
              amount: 0.1,
              duration: 3,
              maxStacks: 3,
            },
          },
        ],
      },
      b: {
        name: "Cold Steel",
        description: "+5 % Physical Penetration per rank.",
        bonuses: { physicalPenetration: 0.05 },
      },
      keystone: {
        name: "Supreme Blade Dancer",
        description: "Your Crit Chance is doubled. You take 15 % more damage.",
        rules: { critChanceMultiplier: 2, damageTaken: 0.15 },
      },
    },
  },
  {
    id: "marksman",
    name: "Marksman",
    branch: "might",
    anchor: "might-killer-instinct",
    theme: "Ranged attacks, every Nth shot.",
    angle: -122,
    entry: {
      name: "Steady Aim",
      description: "While wielding a Ranged Weapon: +5 % Attack Speed per rank.",
      bonuses: { attackSpeed: 0.05 },
      weaponRange: "ranged",
    },
    a1: {
      name: "Eagle Eye",
      description: "+2 % Crit Chance per rank.",
      bonuses: { critChance: 0.02 },
    },
    b1: {
      name: "Fletching",
      description: "+6 % Physical Damage per rank.",
      bonuses: { physicalDamage: 0.06 },
    },
    a2: {
      name: "Volley",
      description: "While wielding a Ranged Weapon: every 4th attack fires a second shot.",
      weaponRange: "ranged",
      triggers: [
        {
          id: "marksman-volley",
          name: "Volley",
          condition: { kind: "everyNthAttack", n: 4 },
          effect: { kind: "extraAttack" },
        },
      ],
    },
    skill: PIERCING_SHOT,
    mid: {
      name: "Quickdraw",
      description: "+5 % Heat Gain per rank.",
      bonuses: { heatGain: 0.05 },
    },
    a3: {
      name: "Deadeye",
      description: "+5 % Crit Chance, +8 % Trigger Chance.",
      bonuses: { critChance: 0.05, triggerChance: 0.08 },
    },
    b3: {
      name: "Pinning Shot",
      description: "Every 6th attack stuns the enemy for 0.6 s.",
      triggers: [
        {
          id: "marksman-pin",
          name: "Pinning Shot",
          condition: { kind: "everyNthAttack", n: 6 },
          effect: { kind: "stun", seconds: 0.6 },
        },
      ],
    },
    b4: {
      name: "Keen Edge",
      description: "+4 % Physical Penetration per rank.",
      bonuses: { physicalPenetration: 0.04 },
    },
    keystone: {
      name: "Patient Hunter",
      description: "Your Default Attack deals 40 % more damage. Skills cost 30 % more Heat.",
      rules: { defaultAttackDamage: 1.4, skillCostMultiplier: 1.3 },
    },
    t2: {
      a: {
        name: "Long Draw",
        description: "+6 % Physical Damage per rank.",
        bonuses: { physicalDamage: 0.06 },
      },
      notable: {
        name: "Hail of Arrows",
        description: "While wielding a Ranged Weapon: every 3rd attack fires a second shot.",
        replaces: "a2",
        weaponRange: "ranged",
        triggers: [
          {
            id: "marksman-hail",
            name: "Volley",
            condition: { kind: "everyNthAttack", n: 3 },
            effect: { kind: "extraAttack" },
          },
        ],
      },
      b: {
        name: "Fletcher's Eye",
        description: "+3 % Crit Chance per rank.",
        bonuses: { critChance: 0.03 },
      },
      keystone: {
        name: "Greater Patient Hunter",
        description: "Your Default Attack deals 55 % more damage. Skills cost 30 % more Heat.",
        rules: { defaultAttackDamage: 1.55, skillCostMultiplier: 1.3 },
      },
    },
    t3: {
      a: {
        name: "Rapid Nock",
        description: "+4 % Attack Speed per rank.",
        bonuses: { attackSpeed: 0.04 },
      },
      notable: {
        name: "Kill Shot",
        description: "Hits deal 40 % more damage to enemies below 35 % Life.",
        rules: { execute: { below: 0.35, bonus: 0.4 } },
      },
      b: {
        name: "Broadhead",
        description: "+4 % Chance to Bleed per rank.",
        bonuses: { bleedChance: 0.04 },
      },
      keystone: {
        name: "Supreme Patient Hunter",
        description: "Your Default Attack deals 70 % more damage. Skills cost 30 % more Heat.",
        rules: { defaultAttackDamage: 1.7, skillCostMultiplier: 1.3 },
      },
    },
  },
  {
    id: "butcher",
    name: "Butcher",
    branch: "rupture",
    anchor: "rupture-butcher",
    theme: "Big Bleeds from big hits.",
    angle: 160,
    entry: {
      name: "Cleaver",
      description: "+5 % Chance to Bleed per rank.",
      bonuses: { bleedChance: 0.05 },
    },
    a1: {
      name: "Hack",
      description: "+6 % Physical Damage per rank.",
      bonuses: { physicalDamage: 0.06 },
    },
    b1: {
      name: "Gore",
      description: "+10 % Ailment Duration per rank.",
      bonuses: { ailmentDuration: 0.1 },
    },
    a2: {
      name: "Hemorrhage",
      description: "Every 3rd attack Bleeds.",
      triggers: [
        {
          id: "butcher-hemorrhage",
          name: "Hemorrhage",
          condition: { kind: "everyNthAttack", n: 3 },
          effect: { kind: "ailment", ailment: "bleed" },
        },
      ],
    },
    skill: CLEAVE,
    mid: {
      name: "Meat Hook",
      description: "+2 % Lifesteal per rank.",
      bonuses: { lifesteal: 0.02 },
    },
    a3: {
      name: "Blood Frenzy",
      description: "Using a skill gives +10 % Physical Damage for 4 s, up to 3 times.",
      triggers: [
        {
          id: "butcher-frenzy",
          name: "Blood Frenzy",
          condition: { kind: "onSkillUse" },
          effect: { kind: "buff", stat: "physicalDamage", amount: 0.1, duration: 4, maxStacks: 3 },
        },
      ],
    },
    b3: {
      name: "Slaughter",
      description: "While wielding a Melee Weapon: +12 % Chance to Bleed, +10 % Physical Damage.",
      bonuses: { bleedChance: 0.12, physicalDamage: 0.1 },
      weaponRange: "melee",
    },
    b4: { name: "Thick Hide", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    keystone: {
      name: "Exsanguinate",
      description:
        "Hits deal 40 % more damage to enemies below 35 % Life. You take 10 % more damage.",
      rules: { execute: { below: 0.35, bonus: 0.4 }, damageTaken: 0.1 },
    },
    t2: {
      a: {
        name: "Rending",
        description: "+5 % Chance to Bleed per rank.",
        bonuses: { bleedChance: 0.05 },
      },
      notable: {
        name: "Gash",
        description: "Crits always Bleed.",
        triggers: [
          {
            id: "butcher-gash",
            name: "Gash",
            condition: { kind: "onCrit" },
            effect: { kind: "ailment", ailment: "bleed" },
          },
        ],
      },
      b: {
        name: "Iron Gut",
        description: "+20 Armor per rank.",
        bonuses: { armor: 20 },
      },
      keystone: {
        name: "Greater Exsanguinate",
        description:
          "Hits deal 55 % more damage to enemies below 35 % Life. You take 10 % more damage.",
        rules: { execute: { below: 0.35, bonus: 0.55 }, damageTaken: 0.1 },
      },
    },
    t3: {
      a: {
        name: "Carver",
        description: "+8 % Physical Damage per rank.",
        bonuses: { physicalDamage: 0.08 },
      },
      notable: {
        name: "Bloodbath",
        description: "Every 2nd attack Bleeds.",
        replaces: "a2",
        triggers: [
          {
            id: "butcher-bloodbath",
            name: "Hemorrhage",
            condition: { kind: "everyNthAttack", n: 2 },
            effect: { kind: "ailment", ailment: "bleed" },
          },
        ],
      },
      b: {
        name: "Leech",
        description: "+2 % Lifesteal per rank.",
        bonuses: { lifesteal: 0.02 },
      },
      keystone: {
        name: "Supreme Exsanguinate",
        description:
          "Hits deal 70 % more damage to enemies below 40 % Life. You take 10 % more damage.",
        rules: { execute: { below: 0.4, bonus: 0.7 }, damageTaken: 0.1 },
      },
    },
  },
  {
    id: "venomancer",
    name: "Venomancer",
    branch: "rupture",
    anchor: "rupture-venomancer",
    theme: "Poison stacks that bite back.",
    angle: 122,
    entry: {
      name: "Toxin",
      description: "+5 % Chance to Poison per rank.",
      bonuses: { poisonChance: 0.05 },
    },
    a1: {
      name: "Viper",
      description: "+4 % Attack Speed per rank.",
      bonuses: { attackSpeed: 0.04 },
    },
    b1: {
      name: "Lingering Venom",
      description: "+10 % Ailment Duration per rank.",
      bonuses: { ailmentDuration: 0.1 },
    },
    a2: {
      name: "Paralytic",
      description: "Every 5th attack stuns the enemy for 0.4 s.",
      triggers: [
        {
          id: "venom-paralytic",
          name: "Paralytic",
          condition: { kind: "everyNthAttack", n: 5 },
          effect: { kind: "stun", seconds: 0.4 },
        },
      ],
    },
    skill: PLAGUE_CLOUD,
    mid: {
      name: "Fangs",
      description: "+6 % Physical Damage per rank.",
      bonuses: { physicalDamage: 0.06 },
    },
    a3: {
      name: "Venom Blood",
      description: "When you are hit, Poison the attacker.",
      triggers: [
        {
          id: "venom-blood",
          name: "Venom Blood",
          condition: { kind: "whenHit" },
          cooldown: 0.5,
          effect: { kind: "ailment", ailment: "poison" },
        },
      ],
    },
    b3: {
      name: "Virulence",
      description: "+12 % Chance to Poison, +10 % Ailment Duration.",
      bonuses: { poisonChance: 0.12, ailmentDuration: 0.1 },
    },
    b4: { name: "Antivenom", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    keystone: {
      name: "Plaguebearer",
      description:
        "Your ailments deal 30 % more damage and heal you for 5 % of it. Your Default Attack deals 30 % less.",
      rules: { dotDamage: 1.3, dotLifesteal: 0.05, defaultAttackDamage: 0.7 },
    },
    t2: {
      a: {
        name: "Neurotoxin",
        description: "+5 % Chance to Poison per rank.",
        bonuses: { poisonChance: 0.05 },
      },
      notable: {
        name: "Festering",
        description: "Every 5 s, Poison the enemy.",
        triggers: [
          {
            id: "venom-festering",
            name: "Festering",
            condition: { kind: "everySeconds", seconds: 5 },
            effect: { kind: "ailment", ailment: "poison" },
          },
        ],
      },
      b: {
        name: "Viper Blood",
        description: "+5 % Tenacity per rank.",
        bonuses: { tenacity: 0.05 },
      },
      keystone: {
        name: "Greater Plaguebearer",
        description:
          "Your ailments deal 40 % more damage and heal you for 6 % of it. Your Default Attack deals 30 % less.",
        rules: { dotDamage: 1.4, dotLifesteal: 0.06, defaultAttackDamage: 0.7 },
      },
    },
    t3: {
      a: {
        name: "Corrosive",
        description: "+10 % Ailment Duration per rank.",
        bonuses: { ailmentDuration: 0.1 },
      },
      notable: {
        name: "Pandemic",
        description: "Using a skill Poisons the enemy.",
        triggers: [
          {
            id: "venom-pandemic",
            name: "Pandemic",
            condition: { kind: "onSkillUse" },
            effect: { kind: "ailment", ailment: "poison" },
          },
        ],
      },
      b: {
        name: "Fang Speed",
        description: "+4 % Attack Speed per rank.",
        bonuses: { attackSpeed: 0.04 },
      },
      keystone: {
        name: "Supreme Plaguebearer",
        description:
          "Your ailments deal 50 % more damage and heal you for 8 % of it. Your Default Attack deals 30 % less.",
        rules: { dotDamage: 1.5, dotLifesteal: 0.08, defaultAttackDamage: 0.7 },
      },
    },
  },
  {
    id: "stormcaller",
    name: "Stormcaller",
    branch: "arcana",
    anchor: "arcana-storm-weaver",
    theme: "Lightning, Shock and sudden bolts.",
    angle: -58,
    entry: {
      name: "Static",
      description: "+5 % Chance to Shock per rank.",
      bonuses: { shockChance: 0.05 },
    },
    a1: {
      name: "Conductivity",
      description: "+6 % Elemental Damage per rank.",
      bonuses: { elementalDamage: 0.06 },
    },
    b1: { name: "Surge", description: "+5 % Heat Gain per rank.", bonuses: { heatGain: 0.05 } },
    a2: {
      name: "Overload",
      description: "Crits Shock the enemy.",
      triggers: [
        {
          id: "storm-overload",
          name: "Overload",
          condition: { kind: "onCrit" },
          effect: { kind: "ailment", ailment: "shock" },
        },
      ],
    },
    skill: THUNDERSTRIKE,
    mid: {
      name: "Arc",
      description: "+3 % Elemental Penetration per rank.",
      bonuses: { elementalPenetration: 0.03 },
    },
    a3: {
      name: "Storm Surge",
      description: "Every 6 s, an extra hit for 120 % Weapon Damage.",
      triggers: [
        {
          id: "storm-surge",
          name: "Storm Surge",
          condition: { kind: "everySeconds", seconds: 6 },
          effect: { kind: "weaponHit", multiplier: 1.2 },
        },
      ],
    },
    b3: {
      name: "Galvanize",
      description: "+12 % Chance to Shock, +5 % Trigger Chance.",
      bonuses: { shockChance: 0.12, triggerChance: 0.05 },
    },
    b4: {
      name: "Insulation",
      description: "+8 % Lightning Resistance per rank.",
      bonuses: { lightningResistance: 0.08 },
    },
    keystone: {
      name: "Eye of the Storm",
      description: "Your Burn and Chill also Shock. Your Default Attack deals 20 % less damage.",
      rules: {
        ailmentEcho: [
          { from: "burn", to: "shock" },
          { from: "chill", to: "shock" },
        ],
        defaultAttackDamage: 0.8,
      },
    },
    t2: {
      a: {
        name: "Charge",
        description: "+6 % Elemental Damage per rank.",
        bonuses: { elementalDamage: 0.06 },
      },
      notable: {
        name: "Chain Reaction",
        description: "Hits have a 15 % chance to strike again for 80 % Weapon Damage.",
        triggers: [
          {
            id: "storm-chain",
            name: "Chain Reaction",
            condition: { kind: "onHit" },
            chance: 0.15,
            cooldown: 1,
            effect: { kind: "weaponHit", multiplier: 0.8 },
          },
        ],
      },
      b: {
        name: "Grounding",
        description: "+8 % Lightning Resistance per rank.",
        bonuses: { lightningResistance: 0.08 },
      },
      keystone: {
        name: "Greater Eye of the Storm",
        description: "Your Burn and Chill also Shock. Your Default Attack deals 10 % less damage.",
        rules: {
          ailmentEcho: [
            { from: "burn", to: "shock" },
            { from: "chill", to: "shock" },
          ],
          defaultAttackDamage: 0.9,
        },
      },
    },
    t3: {
      a: {
        name: "Ionize",
        description: "+3 % Elemental Penetration per rank.",
        bonuses: { elementalPenetration: 0.03 },
      },
      notable: {
        name: "Thunderhead",
        description: "Every 4 s, an extra hit for 120 % Weapon Damage.",
        replaces: "a3",
        triggers: [
          {
            id: "storm-thunderhead",
            name: "Storm Surge",
            condition: { kind: "everySeconds", seconds: 4 },
            effect: { kind: "weaponHit", multiplier: 1.2 },
          },
        ],
      },
      b: {
        name: "Static Field",
        description: "+5 % Chance to Shock per rank.",
        bonuses: { shockChance: 0.05 },
      },
      keystone: {
        name: "Supreme Eye of the Storm",
        description:
          "Your Burn, Chill and Corruption also Shock. Your Default Attack deals 10 % less damage.",
        rules: {
          ailmentEcho: [
            { from: "burn", to: "shock" },
            { from: "chill", to: "shock" },
            { from: "corruption", to: "shock" },
          ],
          defaultAttackDamage: 0.9,
        },
      },
    },
  },
  {
    id: "frostbinder",
    name: "Frostbinder",
    branch: "arcana",
    anchor: "arcana-frost",
    theme: "Chill, control and Barrier.",
    angle: -22,
    entry: {
      name: "Rime",
      description: "+5 % Chance to Chill per rank.",
      bonuses: { chillChance: 0.05 },
    },
    a1: {
      name: "Glacial Ward",
      description: "+4 % All Resistance per rank.",
      bonuses: { allResistance: 0.04 },
    },
    b1: {
      name: "Cold Focus",
      description: "+6 % Elemental Damage per rank.",
      bonuses: { elementalDamage: 0.06 },
    },
    a2: {
      name: "Frost Armor",
      description: "Start every fight with Barrier worth 15 % of your max Life.",
      triggers: [
        {
          id: "frost-armor",
          name: "Frost Armor",
          condition: { kind: "fightStart" },
          effect: { kind: "barrier", fraction: 0.15 },
        },
      ],
    },
    skill: FROST_NOVA,
    mid: {
      name: "Permafrost",
      description: "+10 % Ailment Duration per rank.",
      bonuses: { ailmentDuration: 0.1 },
    },
    a3: {
      name: "Ice Shell",
      description: "Once per fight, below 50 % Life: Barrier worth 25 % of your max Life.",
      triggers: [
        {
          id: "frost-shell",
          name: "Ice Shell",
          condition: { kind: "lifeBelow", threshold: 0.5 },
          oncePerFight: true,
          effect: { kind: "barrier", fraction: 0.25 },
        },
      ],
    },
    b3: {
      name: "Shatter",
      description: "+12 % Chance to Chill, +5 % Elemental Penetration.",
      bonuses: { chillChance: 0.12, elementalPenetration: 0.05 },
    },
    b4: { name: "Hoarfrost", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    keystone: {
      name: "Winter's Grasp",
      description: "Your Burn and Shock also Chill. Your Default Attack deals 20 % less damage.",
      rules: {
        ailmentEcho: [
          { from: "burn", to: "chill" },
          { from: "shock", to: "chill" },
        ],
        defaultAttackDamage: 0.8,
      },
    },
    t2: {
      a: {
        name: "Hoarfrost Edge",
        description: "+6 % Elemental Damage per rank.",
        bonuses: { elementalDamage: 0.06 },
      },
      notable: {
        name: "Glacial Prison",
        description: "Every 5th attack freezes the enemy for 0.5 s.",
        triggers: [
          {
            id: "frost-prison",
            name: "Glacial Prison",
            condition: { kind: "everyNthAttack", n: 5 },
            effect: { kind: "stun", seconds: 0.5 },
          },
        ],
      },
      b: {
        name: "Frozen Blood",
        description: "+5 % Tenacity per rank.",
        bonuses: { tenacity: 0.05 },
      },
      keystone: {
        name: "Greater Winter's Grasp",
        description: "Your Burn and Shock also Chill. Your Default Attack deals 10 % less damage.",
        rules: {
          ailmentEcho: [
            { from: "burn", to: "chill" },
            { from: "shock", to: "chill" },
          ],
          defaultAttackDamage: 0.9,
        },
      },
    },
    t3: {
      a: {
        name: "Deep Cold",
        description: "+10 % Ailment Duration per rank.",
        bonuses: { ailmentDuration: 0.1 },
      },
      notable: {
        name: "Cryo Shell",
        description: "Start every fight with Barrier worth 25 % of your max Life.",
        replaces: "a2",
        triggers: [
          {
            id: "frost-cryo",
            name: "Frost Armor",
            condition: { kind: "fightStart" },
            effect: { kind: "barrier", fraction: 0.25 },
          },
        ],
      },
      b: {
        name: "Rimecraft",
        description: "+5 % Chance to Chill per rank.",
        bonuses: { chillChance: 0.05 },
      },
      keystone: {
        name: "Supreme Winter's Grasp",
        description:
          "Your Burn, Shock and Bleed also Chill. Your Default Attack deals 10 % less damage.",
        rules: {
          ailmentEcho: [
            { from: "burn", to: "chill" },
            { from: "shock", to: "chill" },
            { from: "bleed", to: "chill" },
          ],
          defaultAttackDamage: 0.9,
        },
      },
    },
  },
  {
    id: "pyromancer",
    name: "Pyromancer",
    branch: "affliction",
    anchor: "affliction-pyromancer",
    theme: "Burn and anti-heal.",
    angle: 22,
    entry: {
      name: "Ember",
      description: "+5 % Chance to Burn per rank.",
      bonuses: { burnChance: 0.05 },
    },
    a1: {
      name: "Heat Wave",
      description: "+6 % Elemental Damage per rank.",
      bonuses: { elementalDamage: 0.06 },
    },
    b1: {
      name: "Kindled",
      description: "Start every fight with +6 Heat per rank.",
      bonuses: { startingHeat: 6 },
    },
    a2: {
      name: "Wildfire",
      description: "Skills have a 30 % chance to Burn.",
      triggers: [
        {
          id: "pyro-wildfire",
          name: "Wildfire",
          condition: { kind: "onSkillUse" },
          chance: 0.3,
          effect: { kind: "ailment", ailment: "burn" },
        },
      ],
    },
    skill: INFERNO,
    mid: {
      name: "Smolder",
      description: "+10 % Ailment Duration per rank.",
      bonuses: { ailmentDuration: 0.1 },
    },
    a3: {
      name: "Burning Blood",
      description: "When you are hit, 25 % chance to Burn the attacker.",
      triggers: [
        {
          id: "pyro-blood",
          name: "Burning Blood",
          condition: { kind: "whenHit" },
          chance: 0.25,
          cooldown: 1,
          effect: { kind: "ailment", ailment: "burn" },
        },
      ],
    },
    b3: {
      name: "Combustion",
      description: "+12 % Chance to Burn, +5 % Elemental Penetration.",
      bonuses: { burnChance: 0.12, elementalPenetration: 0.05 },
    },
    b4: {
      name: "Ash Skin",
      description: "+8 % Fire Resistance per rank.",
      bonuses: { fireResistance: 0.08 },
    },
    keystone: {
      name: "Pyre",
      description: "Your ailments deal 25 % more damage. You take 10 % more damage.",
      rules: { dotDamage: 1.25, damageTaken: 0.1 },
    },
    t2: {
      a: {
        name: "Stoke",
        description: "+5 % Chance to Burn per rank.",
        bonuses: { burnChance: 0.05 },
      },
      notable: {
        name: "Firestorm",
        description: "Skills have a 60 % chance to Burn.",
        replaces: "a2",
        triggers: [
          {
            id: "pyro-firestorm",
            name: "Wildfire",
            condition: { kind: "onSkillUse" },
            chance: 0.6,
            effect: { kind: "ailment", ailment: "burn" },
          },
        ],
      },
      b: {
        name: "Cinder Skin",
        description: "+4 % All Resistance per rank.",
        bonuses: { allResistance: 0.04 },
      },
      keystone: {
        name: "Greater Pyre",
        description: "Your ailments deal 35 % more damage. You take 10 % more damage.",
        rules: { dotDamage: 1.35, damageTaken: 0.1 },
      },
    },
    t3: {
      a: {
        name: "Kindler",
        description: "Start every fight with +6 Heat per rank.",
        bonuses: { startingHeat: 6 },
      },
      notable: {
        name: "Conflagration",
        description: "Hits have a 20 % chance to Burn.",
        triggers: [
          {
            id: "pyro-conflagration",
            name: "Conflagration",
            condition: { kind: "onHit" },
            chance: 0.2,
            cooldown: 1,
            effect: { kind: "ailment", ailment: "burn" },
          },
        ],
      },
      b: {
        name: "Blaze",
        description: "+6 % Elemental Damage per rank.",
        bonuses: { elementalDamage: 0.06 },
      },
      keystone: {
        name: "Supreme Pyre",
        description: "Your ailments deal 45 % more damage. You take 10 % more damage.",
        rules: { dotDamage: 1.45, damageTaken: 0.1 },
      },
    },
  },
  {
    id: "void-lord",
    name: "Void Lord",
    branch: "affliction",
    anchor: "affliction-void-lord",
    theme: "Corruption for long fights.",
    angle: 58,
    entry: {
      name: "Gloom",
      description: "+4 % Chance to Corrupt per rank.",
      bonuses: { corruptionChance: 0.04 },
    },
    a1: {
      name: "Abyss",
      description: "+6 % Elemental Damage per rank.",
      bonuses: { elementalDamage: 0.06 },
    },
    b1: {
      name: "Long Night",
      description: "+10 % Ailment Duration per rank.",
      bonuses: { ailmentDuration: 0.1 },
    },
    a2: {
      name: "Entropy",
      description: "Every 4 s, Corrupt the enemy.",
      triggers: [
        {
          id: "void-entropy",
          name: "Entropy",
          condition: { kind: "everySeconds", seconds: 4 },
          effect: { kind: "ailment", ailment: "corruption" },
        },
      ],
    },
    skill: VOID_RIFT,
    mid: {
      name: "Hollow",
      description: "+4 % All Resistance per rank.",
      bonuses: { allResistance: 0.04 },
    },
    a3: {
      name: "Devour Light",
      description: "Using a skill heals 3 % of your max Life.",
      triggers: [
        {
          id: "void-devour",
          name: "Devour Light",
          condition: { kind: "onSkillUse" },
          effect: { kind: "heal", fraction: 0.03 },
        },
      ],
    },
    b3: {
      name: "Eternal Night",
      description: "+12 % Chance to Corrupt, +15 % Ailment Duration.",
      bonuses: { corruptionChance: 0.12, ailmentDuration: 0.15 },
    },
    b4: { name: "Endless", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    keystone: {
      name: "Event Horizon",
      description:
        "Your ailments deal 20 % more damage and heal you for 8 % of it. Your Default Attack deals 30 % less.",
      rules: { dotDamage: 1.2, dotLifesteal: 0.08, defaultAttackDamage: 0.7 },
    },
    t2: {
      a: {
        name: "Umbra",
        description: "+4 % Chance to Corrupt per rank.",
        bonuses: { corruptionChance: 0.04 },
      },
      notable: {
        name: "Singularity",
        description: "Every 3 s, Corrupt the enemy.",
        replaces: "a2",
        triggers: [
          {
            id: "void-singularity",
            name: "Entropy",
            condition: { kind: "everySeconds", seconds: 3 },
            effect: { kind: "ailment", ailment: "corruption" },
          },
        ],
      },
      b: {
        name: "Void Ward",
        description: "+4 % All Resistance per rank.",
        bonuses: { allResistance: 0.04 },
      },
      keystone: {
        name: "Greater Event Horizon",
        description:
          "Your ailments deal 30 % more damage and heal you for 10 % of it. Your Default Attack deals 30 % less.",
        rules: { dotDamage: 1.3, dotLifesteal: 0.1, defaultAttackDamage: 0.7 },
      },
    },
    t3: {
      a: {
        name: "Abyssal",
        description: "+6 % Elemental Damage per rank.",
        bonuses: { elementalDamage: 0.06 },
      },
      notable: {
        name: "Hunger",
        description: "Using a skill heals 5 % of your max Life.",
        replaces: "a3",
        triggers: [
          {
            id: "void-hunger",
            name: "Devour Light",
            condition: { kind: "onSkillUse" },
            effect: { kind: "heal", fraction: 0.05 },
          },
        ],
      },
      b: {
        name: "Night Eternal",
        description: "+10 % Ailment Duration per rank.",
        bonuses: { ailmentDuration: 0.1 },
      },
      keystone: {
        name: "Supreme Event Horizon",
        description:
          "Your ailments deal 40 % more damage and heal you for 12 % of it. Your Default Attack deals 30 % less.",
        rules: { dotDamage: 1.4, dotLifesteal: 0.12, defaultAttackDamage: 0.7 },
      },
    },
  },
  {
    id: "warden",
    name: "Warden",
    branch: "core",
    anchor: "core-iron-will",
    theme: "Block, Barrier and payback.",
    angle: 90,
    entry: {
      name: "Bulwark",
      description: "+3 % Block Chance per rank.",
      bonuses: { blockChance: 0.03 },
    },
    a1: {
      name: "Stone Skin",
      description: "+4 % All Resistance per rank.",
      bonuses: { allResistance: 0.04 },
    },
    b1: { name: "Plating", description: "+15 Armor per rank.", bonuses: { armor: 15 } },
    a2: {
      name: "Shield Bash",
      description: "When you Block, stun the enemy for 0.5 s.",
      triggers: [
        {
          id: "warden-bash",
          name: "Shield Bash",
          condition: { kind: "onBlock" },
          cooldown: 3,
          effect: { kind: "stun", seconds: 0.5 },
        },
      ],
    },
    skill: IRON_BASTION,
    mid: { name: "Stalwart", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    a3: {
      name: "Retaliation",
      description: "When you are hit, send 30 % of it back (at most 3 % of the attacker's Life).",
      triggers: [
        {
          id: "warden-retaliation",
          name: "Retaliation",
          condition: { kind: "whenHit" },
          effect: { kind: "reflect", fraction: 0.3, cap: 0.03, damageType: "physical" },
        },
      ],
    },
    b3: {
      name: "Unbreakable",
      description: "Once per fight, below 35 % Life: Barrier worth 30 % of your max Life.",
      triggers: [
        {
          id: "warden-unbreakable",
          name: "Unbreakable",
          condition: { kind: "lifeBelow", threshold: 0.35 },
          oncePerFight: true,
          effect: { kind: "barrier", fraction: 0.3 },
        },
      ],
    },
    b4: {
      name: "Fortress",
      description: "+3 % Block Chance per rank.",
      bonuses: { blockChance: 0.03 },
    },
    keystone: {
      name: "Juggernaut",
      description: "You take 15 % less damage. Your Default Attack deals 20 % less damage.",
      rules: { damageTaken: -0.15, defaultAttackDamage: 0.8 },
    },
    t2: {
      a: {
        name: "Bastion",
        description: "+3 % Block Chance per rank.",
        bonuses: { blockChance: 0.03 },
      },
      notable: {
        name: "Shield Wall",
        description: "When you Block, gain Barrier worth 5 % of your max Life.",
        triggers: [
          {
            id: "warden-wall",
            name: "Shield Wall",
            condition: { kind: "onBlock" },
            cooldown: 2,
            effect: { kind: "barrier", fraction: 0.05 },
          },
        ],
      },
      b: {
        name: "Reinforced",
        description: "+20 Armor per rank.",
        bonuses: { armor: 20 },
      },
      keystone: {
        name: "Greater Juggernaut",
        description: "You take 20 % less damage. Your Default Attack deals 20 % less damage.",
        rules: { damageTaken: -0.2, defaultAttackDamage: 0.8 },
      },
    },
    t3: {
      a: {
        name: "Stoneheart",
        description: "+20 Life per rank.",
        bonuses: { life: 20 },
      },
      notable: {
        name: "Vengeance",
        description: "When you are hit, send 50 % of it back (at most 5 % of the attacker's Life).",
        replaces: "a3",
        triggers: [
          {
            id: "warden-vengeance",
            name: "Retaliation",
            condition: { kind: "whenHit" },
            effect: { kind: "reflect", fraction: 0.5, cap: 0.05, damageType: "physical" },
          },
        ],
      },
      b: {
        name: "Rampart",
        description: "+3 % Block Chance per rank.",
        bonuses: { blockChance: 0.03 },
      },
      keystone: {
        name: "Supreme Juggernaut",
        description: "You take 25 % less damage. Your Default Attack deals 20 % less damage.",
        rules: { damageTaken: -0.25, defaultAttackDamage: 0.8 },
      },
    },
  },
  {
    id: "tactician",
    name: "Tactician",
    branch: "core",
    anchor: "core-spark",
    theme: "Heat and Rotation tricks.",
    angle: -90,
    entry: {
      name: "Planning",
      description: "Start every fight with +5 Heat per rank.",
      bonuses: { startingHeat: 5 },
    },
    a1: { name: "Tempo", description: "+5 % Heat Gain per rank.", bonuses: { heatGain: 0.05 } },
    b1: {
      name: "Drill",
      description: "+3 % Trigger Chance per rank.",
      bonuses: { triggerChance: 0.03 },
    },
    a2: {
      name: "Opening Gambit",
      description: "Start every fight with +25 Heat.",
      triggers: [
        {
          id: "tactician-gambit",
          name: "Opening Gambit",
          condition: { kind: "fightStart" },
          effect: { kind: "heat", amount: 25 },
        },
      ],
    },
    skill: RALLY,
    mid: {
      name: "Momentum",
      description: "+4 % Attack Speed per rank.",
      bonuses: { attackSpeed: 0.04 },
    },
    a3: {
      name: "Refund",
      description: "Skills have a 25 % chance to give back 15 Heat.",
      triggers: [
        {
          id: "tactician-refund",
          name: "Refund",
          condition: { kind: "onSkillUse" },
          chance: 0.25,
          effect: { kind: "heat", amount: 15 },
        },
      ],
    },
    b3: {
      name: "Battle Rhythm",
      description: "+10 Starting Heat, +8 % Heat Gain.",
      bonuses: { startingHeat: 10, heatGain: 0.08 },
    },
    b4: { name: "Discipline", description: "+5 % Tenacity per rank.", bonuses: { tenacity: 0.05 } },
    keystone: {
      name: "Grand Strategy",
      description: "Skills cost 20 % less Heat. You take 10 % more damage.",
      rules: { skillCostMultiplier: 0.8, damageTaken: 0.1 },
    },
    t2: {
      a: {
        name: "Foresight",
        description: "Start every fight with +5 Heat per rank.",
        bonuses: { startingHeat: 5 },
      },
      notable: {
        name: "Second Wind",
        description: "Once per fight, below 40 % Life: gain 40 Heat.",
        triggers: [
          {
            id: "tactician-wind",
            name: "Second Wind",
            condition: { kind: "lifeBelow", threshold: 0.4 },
            oncePerFight: true,
            effect: { kind: "heat", amount: 40 },
          },
        ],
      },
      b: {
        name: "Cadence",
        description: "+5 % Heat Gain per rank.",
        bonuses: { heatGain: 0.05 },
      },
      keystone: {
        name: "Greater Grand Strategy",
        description: "Skills cost 25 % less Heat. You take 10 % more damage.",
        rules: { skillCostMultiplier: 0.75, damageTaken: 0.1 },
      },
    },
    t3: {
      a: {
        name: "Precision",
        description: "+3 % Trigger Chance per rank.",
        bonuses: { triggerChance: 0.03 },
      },
      notable: {
        name: "Masterplan",
        description: "Skills have a 40 % chance to give back 15 Heat.",
        replaces: "a3",
        triggers: [
          {
            id: "tactician-masterplan",
            name: "Refund",
            condition: { kind: "onSkillUse" },
            chance: 0.4,
            effect: { kind: "heat", amount: 15 },
          },
        ],
      },
      b: {
        name: "Quickstep",
        description: "+4 % Attack Speed per rank.",
        bonuses: { attackSpeed: 0.04 },
      },
      keystone: {
        name: "Supreme Grand Strategy",
        description: "Skills cost 30 % less Heat. You take 10 % more damage.",
        rules: { skillCostMultiplier: 0.7, damageTaken: 0.1 },
      },
    },
  },
];

export const PRESTIGE_BRANCHES: readonly PrestigeBranchDefinition[] = BRANCHES.map(
  ({ id, name, branch, anchor, theme }) => ({ id, name, branch, anchor, theme }),
);

export const PRESTIGE_BRANCH_NODES: readonly SkillNode[] = BRANCHES.flatMap(buildBranch);
