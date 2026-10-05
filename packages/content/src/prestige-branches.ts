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
 * Prestige branches (skill-tree-v1.md section 3): one is unlocked per Prestige, in the
 * Inheritance step. Each deepens a base branch and hangs off one of its nodes. All share one
 * shape of ten nodes (16 Skill Points + 1 Keystone):
 *
 *   entry ─ a1 ─ a2 (notable) ─┐       ┌─ a3 (notable) ─ keystone
 *       └── b1 ─ skill ────────┴─ mid ─┴─ b3 (notable) ─ b4
 *
 * Coordinates are local to the branch panel. Numbers are starting values.
 */

interface NodeSpec {
  readonly name: string;
  readonly description: string;
  readonly bonuses?: StatBonuses;
  readonly triggers?: readonly TriggerSpec[];
  readonly weaponRange?: "melee" | "ranged";
}

interface BranchSpec extends PrestigeBranchDefinition {
  readonly entry: NodeSpec;
  readonly a1: NodeSpec;
  readonly b1: NodeSpec;
  readonly a2: NodeSpec;
  readonly skill: SkillDefinition;
  readonly mid: NodeSpec;
  readonly a3: NodeSpec;
  readonly b3: NodeSpec;
  readonly b4: NodeSpec;
  readonly keystone: NodeSpec & { readonly rules: CombatRules };
}

type Slot = "entry" | "a1" | "b1" | "a2" | "skill" | "mid" | "a3" | "b3" | "b4" | "keystone";

const SHAPE: Record<
  Slot,
  {
    readonly kind: SkillNodeKind;
    readonly x: number;
    readonly y: number;
    readonly ranks: number;
    readonly links: readonly Slot[];
  }
> = {
  entry: { kind: "minor", x: 0, y: 1, ranks: 2, links: ["a1", "b1"] },
  a1: { kind: "minor", x: 1, y: 0, ranks: 2, links: ["a2"] },
  b1: { kind: "minor", x: 1, y: 2, ranks: 2, links: ["skill"] },
  a2: { kind: "notable", x: 2, y: 0, ranks: 1, links: ["mid"] },
  skill: { kind: "skill", x: 2, y: 2, ranks: 3, links: ["mid"] },
  mid: { kind: "minor", x: 3, y: 1, ranks: 2, links: ["a3", "b3"] },
  a3: { kind: "notable", x: 4, y: 0, ranks: 1, links: ["keystone"] },
  b3: { kind: "notable", x: 4, y: 2, ranks: 1, links: ["b4"] },
  b4: { kind: "minor", x: 5, y: 2, ranks: 2, links: [] },
  keystone: { kind: "keystone", x: 5, y: 0, ranks: 1, links: [] },
};

const SLOTS = Object.keys(SHAPE) as Slot[];
const nodeId = (branch: string, slot: Slot) => `pb-${branch}-${slot}`;

function buildBranch(spec: BranchSpec): SkillNode[] {
  return SLOTS.map((slot) => {
    const shape = SHAPE[slot];
    const links = shape.links.map((l) => nodeId(spec.id, l));
    const base = {
      id: nodeId(spec.id, slot),
      branch: spec.branch,
      kind: shape.kind,
      links: slot === "entry" ? [spec.anchor, ...links] : links,
      x: shape.x,
      y: shape.y,
      prestigeBranch: spec.id,
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
    const node = spec[slot];
    return {
      ...base,
      name: node.name,
      description: node.description,
      ...(node.bonuses ? { bonuses: node.bonuses } : {}),
      ...(node.triggers ? { triggers: node.triggers } : {}),
      ...(node.weaponRange ? { weaponRange: node.weaponRange } : {}),
      ...(slot === "keystone" ? { keystone: spec.keystone.rules } : {}),
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
  },
  {
    id: "marksman",
    name: "Marksman",
    branch: "might",
    anchor: "might-killer-instinct",
    theme: "Ranged attacks, every Nth shot.",
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
  },
  {
    id: "butcher",
    name: "Butcher",
    branch: "rupture",
    anchor: "rupture-butcher",
    theme: "Big Bleeds from big hits.",
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
  },
  {
    id: "venomancer",
    name: "Venomancer",
    branch: "rupture",
    anchor: "rupture-venomancer",
    theme: "Poison stacks that bite back.",
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
  },
  {
    id: "stormcaller",
    name: "Stormcaller",
    branch: "arcana",
    anchor: "arcana-storm-weaver",
    theme: "Lightning, Shock and sudden bolts.",
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
  },
  {
    id: "frostbinder",
    name: "Frostbinder",
    branch: "arcana",
    anchor: "arcana-frost",
    theme: "Chill, control and Barrier.",
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
  },
  {
    id: "pyromancer",
    name: "Pyromancer",
    branch: "affliction",
    anchor: "affliction-pyromancer",
    theme: "Burn and anti-heal.",
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
  },
  {
    id: "void-lord",
    name: "Void Lord",
    branch: "affliction",
    anchor: "affliction-void-lord",
    theme: "Corruption for long fights.",
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
  },
  {
    id: "warden",
    name: "Warden",
    branch: "core",
    anchor: "core-iron-will",
    theme: "Block, Barrier and payback.",
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
  },
  {
    id: "tactician",
    name: "Tactician",
    branch: "core",
    anchor: "core-spark",
    theme: "Heat and Rotation tricks.",
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
  },
];

export const PRESTIGE_BRANCHES: readonly PrestigeBranchDefinition[] = BRANCHES.map(
  ({ id, name, branch, anchor, theme }) => ({ id, name, branch, anchor, theme }),
);

export const PRESTIGE_BRANCH_NODES: readonly SkillNode[] = BRANCHES.flatMap(buildBranch);
