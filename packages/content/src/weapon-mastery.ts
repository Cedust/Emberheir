import type {
  EchoDefinition,
  MasteryEffect,
  MasteryNode,
  MasteryPath,
  SkillDefinition,
  WeaponMasteryTree,
} from "@emberheir/sim";
import {
  BARBED_ARROW,
  FIREBOLT,
  HEAVY_BOLT,
  LACERATE,
  POWER_STRIKE,
  SKULL_CRACK,
  VENOM_COAT,
  VOID_BOLT,
} from "./skills";

/**
 * Weapon Mastery trees (docs/design/weapon-mastery-baeume-v1.md): the same ground plan for all
 * eight weapons (Refine, Heat Form, Innate Form, three paths of 6 minors and 2 notables, a ring
 * of four Keystones) with their own numbers, paths and names. All numbers are starting values.
 *
 * Positions are for the "anatomy" view at Kaelen: the weapon lies diagonally from its pommel at
 * the bottom left to its tip at the top right; Refine nodes sit on its parts, the paths grow
 * outward like engraved filigree, the Heat Forms burn in the forge below, the Keystone sockets
 * ring the pommel.
 */

// --- layout ----------------------------------------------------------------------------------

/** Pommel and tip of the weapon in layout units. */
const POMMEL = { x: -4.2, y: 3 };
const TIP = { x: 4.2, y: -3 };
const AXIS = { x: TIP.x - POMMEL.x, y: TIP.y - POMMEL.y };
const LENGTH = Math.hypot(AXIS.x, AXIS.y);
/** Unit normal of the weapon, pointing down-right (away from the upper paths). */
const NORMAL = { x: -AXIS.y / LENGTH, y: AXIS.x / LENGTH };

const round = (v: number) => Math.round(v * 100) / 100;

/** A point on the weapon at `t` (0 = pommel, 1 = tip), `off` units off its axis. */
function along(t: number, off = 0): { x: number; y: number } {
  return {
    x: round(POMMEL.x + AXIS.x * t + NORMAL.x * off),
    y: round(POMMEL.y + AXIS.y * t + NORMAL.y * off),
  };
}

/** Path starts and their outward direction (unit vectors bend a little along the way). */
const PATH_LAYOUT = [
  { start: along(0.3, -1.25), dir: { x: -0.45, y: -0.89 }, bend: -1 },
  { start: along(0.55, 1.25), dir: { x: 0.83, y: 0.56 }, bend: 1 },
  { start: along(0.8, -1.25), dir: { x: 0.2, y: -0.98 }, bend: 1 },
] as const;

function pathPosition(path: number, index: number): { x: number; y: number } {
  const { start, dir, bend } = PATH_LAYOUT[path] ?? PATH_LAYOUT[0];
  const step = 0.92;
  const k = index * step;
  // A gentle S-curve sideways to the direction, like a vine of engraving.
  const side = Math.sin(index * 0.75) * 0.45 * bend;
  return {
    x: round(start.x + dir.x * k - dir.y * side),
    y: round(start.y + dir.y * k + dir.x * side),
  };
}

// --- node builders -------------------------------------------------------------------------

interface NodeSpec {
  readonly name: string;
  readonly description: string;
  readonly effect: MasteryEffect;
}

interface PathSpec {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  readonly color: number;
  /** Two kinds of minor node; the path alternates them (a b a · N · b a b · N). */
  readonly minors: readonly [NodeSpec, NodeSpec];
  readonly notables: readonly [NodeSpec, NodeSpec];
}

interface KeystoneSpec extends NodeSpec {
  readonly id: string;
  readonly form: string;
}

interface InnateFormSpec extends NodeSpec {
  readonly id: string;
  readonly skill: SkillDefinition;
}

interface TreeSpec {
  readonly weaponId: string;
  readonly precision: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly paths: readonly [PathSpec, PathSpec, PathSpec];
  readonly innateForms: readonly [InnateFormSpec, InnateFormSpec, InnateFormSpec];
  readonly keystones: readonly [KeystoneSpec, KeystoneSpec, KeystoneSpec, KeystoneSpec];
  /** Wand and Staff: the elements the weapon can be attuned to; the first is the start. */
  readonly attunements?: readonly AttunementSpec[];
}

interface AttunementSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly damageType: "fire" | "cold" | "lightning" | "void";
  readonly ailment: "burn" | "chill" | "shock" | "corruption";
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Refine: the same four hotspots on every weapon (11 points). */
const REFINE: readonly (Omit<MasteryNode, "x" | "y"> & { readonly t: number })[] = [
  {
    id: "balance",
    name: "Balance",
    description: "+6 % Attack Speed.",
    kind: "refine",
    maxRanks: 2,
    effect: { bonuses: { attackSpeed: 0.06 } },
    t: 0.04,
  },
  {
    id: "precision",
    name: "Precision",
    description: "+5 % Precision.",
    kind: "refine",
    maxRanks: 3,
    effect: { precision: 0.05 },
    t: 0.17,
  },
  {
    id: "steady-hand",
    name: "Steady Hand",
    description: "Damage Range minimum +10 %.",
    kind: "refine",
    maxRanks: 3,
    effect: { rangeMin: 0.1 },
    t: 0.48,
  },
  {
    id: "full-swing",
    name: "Full Swing",
    description: "Damage Range maximum +15 %.",
    kind: "refine",
    maxRanks: 3,
    effect: { rangeMax: 0.15 },
    t: 0.78,
  },
];

/** Heat Forms (waffe-als-system-v1.md section 3): Steady at the start, free choice from Rank 3. */
const HEAT_FORMS: readonly (Omit<MasteryNode, "x" | "y"> & { readonly i: number })[] = [
  {
    id: "heat-steady",
    name: "Steady",
    description: "Heat comes from your hits and never cools down.",
    kind: "heatForm",
    group: "heatForm",
    default: true,
    effect: { heatForm: "steady" },
    i: 0,
  },
  {
    id: "heat-cooling",
    name: "Cooling",
    description: "+25 % Heat per Hit, but Heat cools down without hits.",
    kind: "heatForm",
    group: "heatForm",
    effect: { heatForm: "cooling", heatPerHit: 1.25 },
    i: 1,
  },
  {
    id: "heat-warming",
    name: "Warming",
    description: "Heat rises by itself, 12 per second. Hits give none.",
    kind: "heatForm",
    group: "heatForm",
    effect: { heatForm: "warming" },
    i: 2,
  },
  {
    id: "heat-smoldering",
    name: "Smoldering",
    description:
      "Heat comes from hits you take; your own hits give 30 %. Start with 20 Heat, +10 % Life.",
    kind: "heatForm",
    group: "heatForm",
    effect: {
      heatForm: "smoldering",
      heatPerHit: 0.3,
      bonuses: { heatFromHitsTaken: 1, startingHeat: 20 },
      rules: { lifeMultiplier: 1.1 },
    },
    i: 3,
  },
];

/** Keystone sockets in a half ring around the pommel. */
function keystonePosition(i: number): { x: number; y: number } {
  const angle = ((100 + i * 36) * Math.PI) / 180;
  return { x: round(POMMEL.x + Math.cos(angle) * 1.9), y: round(POMMEL.y + Math.sin(angle) * 1.9) };
}

/** Attunement orbs around the tip. */
function attunementPosition(i: number): { x: number; y: number } {
  const angle = ((-80 + i * 45) * Math.PI) / 180;
  return { x: round(TIP.x + Math.cos(angle) * 1.4), y: round(TIP.y + Math.sin(angle) * 1.4) };
}

function buildTree(spec: TreeSpec): WeaponMasteryTree {
  const nodes: MasteryNode[] = [];
  for (const { t, ...node } of REFINE) nodes.push({ ...node, ...along(t) });
  for (const { i, ...node } of HEAT_FORMS) nodes.push({ ...node, x: -1.8 + i * 1.2, y: 4.3 });
  spec.innateForms.forEach((form, i) => {
    nodes.push({
      id: form.id,
      name: form.name,
      description: form.description,
      kind: "innateForm",
      group: "innateForm",
      effect: { ...form.effect, innate: form.skill },
      // Three rune seals along the blade, beside the fuller.
      ...along(0.56 + i * 0.09, 0.85),
    });
  });
  spec.keystones.forEach((k, i) => {
    nodes.push({
      id: k.id,
      name: k.name,
      description: k.description,
      kind: "keystone",
      group: "keystone",
      form: k.form,
      effect: k.effect,
      ...keystonePosition(i),
    });
  });
  spec.attunements?.forEach((a, i) => {
    nodes.push({
      id: a.id,
      name: a.name,
      description: a.description,
      kind: "attunement",
      group: "attunement",
      ...(i === 0 ? { default: true } : {}),
      effect: { attunement: { damageType: a.damageType, ailment: a.ailment } },
      ...attunementPosition(i),
    });
  });
  spec.paths.forEach((path, p) => {
    const [a, b] = path.minors;
    const order = [a, b, a, path.notables[0], b, a, b, path.notables[1]];
    let previous: string | undefined;
    order.forEach((n, index) => {
      const notable = index === 3 || index === 7;
      const id = notable
        ? `${path.id}-${n.name.toLowerCase().replace(/[^a-z]+/g, "-")}`
        : `${path.id}-${index + 1}`;
      nodes.push({
        id,
        name: n.name,
        description: n.description,
        kind: notable ? "notable" : "minor",
        path: path.id,
        ...(previous ? { links: [previous] } : { requiresRefine: true }),
        effect: n.effect,
        ...pathPosition(p, index),
      });
      previous = id;
    });
  });
  const paths: MasteryPath[] = spec.paths.map(({ id, name, theme, color }) => ({
    id,
    name,
    theme,
    color,
  }));
  return {
    weaponId: spec.weaponId,
    precision: spec.precision,
    rangeMin: spec.rangeMin,
    rangeMax: spec.rangeMax,
    paths,
    nodes,
  };
}

// --- small helpers for the specs ------------------------------------------------------------

const minor = (name: string, description: string, effect: MasteryEffect): NodeSpec => ({
  name,
  description,
  effect,
});
const notable = minor;

/** A variant of the weapon's Innate skill. */
const form = (
  id: string,
  name: string,
  description: string,
  skill: SkillDefinition,
): InnateFormSpec => ({ id, name, description, effect: {}, skill: { ...skill, description } });

/** Path colours of the engraving: physical gold, blood red, ember, frost, storm, venom, void. */
const C = {
  gold: 0xe0b45a,
  blood: 0xc8423a,
  ember: 0xf08a3c,
  frost: 0x8ec8f0,
  storm: 0xd8d27a,
  venom: 0x8cc04a,
  void: 0xa070e0,
  steel: 0xb8c0cc,
} as const;

// --- the eight trees ------------------------------------------------------------------------

const SWORD = buildTree({
  weaponId: "sword",
  precision: 0.75,
  rangeMin: 0.4,
  rangeMax: 1.1,
  paths: [
    {
      id: "riposte",
      name: "Riposte",
      theme: "Counters",
      color: C.steel,
      minors: [
        minor("Light Feet", "+2 % Evasion.", { bonuses: { evasion: 0.02 } }),
        minor("Ready Blade", "+3 % Trigger Chance.", { bonuses: { triggerChance: 0.03 } }),
      ],
      notables: [
        notable("Counterweight", "Riposte always lands cleanly and adds a Sunder stack.", {
          weaponRules: { extraAttacksPrecise: true, extraAttackSunder: true },
        }),
        notable("Read the Blow", "After you evade or block, your next hit is a clean Crit.", {
          weaponRules: { critAfter: ["evade", "block"] },
        }),
      ],
    },
    {
      id: "edge",
      name: "Edge",
      theme: "Precision, Crit, Bleed",
      color: C.blood,
      minors: [
        minor("Keen", "+2 % Crit Chance.", { bonuses: { critChance: 0.02 } }),
        minor("True", "+2 % Precision.", { precision: 0.02 }),
      ],
      notables: [
        notable("Keen Edge", "Your Crits make the enemy Bleed.", {
          rules: { critsApplyBleed: true },
        }),
        notable("Measured Cut", "+10 % Precision, Damage Range minimum +10 %.", {
          precision: 0.1,
          rangeMin: 0.1,
        }),
      ],
    },
    {
      id: "tempo",
      name: "Tempo",
      theme: "Rhythm, Heat",
      color: C.ember,
      minors: [
        minor("Quick", "+3 % Attack Speed.", { bonuses: { attackSpeed: 0.03 } }),
        minor("Warm", "+4 % Heat Gain.", { bonuses: { heatGain: 0.04 } }),
      ],
      notables: [
        notable("Rhythm", "Every 3rd Slash gives 10 Heat.", {
          triggers: [
            {
              id: "mastery-rhythm",
              name: "Rhythm",
              condition: { kind: "everyNthAttack", n: 3 },
              effect: { kind: "heat", amount: 10 },
            },
          ],
        }),
        notable(
          "Unbroken Flow",
          "+3 % Attack Speed for every clean hit in a row (up to 5). A Glancing Blow ends it.",
          { weaponRules: { streak: { stat: "attackSpeed", amount: 0.03, max: 5 } } },
        ),
      ],
    },
  ],
  innateForms: [
    form("cleaving-strike", "Cleaving Strike", "300 % Weapon Damage. Costs 10 more Heat.", {
      ...POWER_STRIKE,
      id: "cleaving-strike",
      name: "Cleaving Strike",
      heatCost: POWER_STRIKE.heatCost + 10,
      hits: [{ kind: "weapon", multiplier: 3 }],
    }),
    form(
      "rising-strike",
      "Rising Strike",
      "220 % Weapon Damage. A clean hit gives back half its Heat.",
      {
        ...POWER_STRIKE,
        id: "rising-strike",
        name: "Rising Strike",
        effects: [{ kind: "refundHeat", fraction: 0.5 }],
      },
    ),
    form("sundering-strike", "Sundering Strike", "220 % Weapon Damage. Adds 3 Sunder stacks.", {
      ...POWER_STRIKE,
      id: "sundering-strike",
      name: "Sundering Strike",
      effects: [{ kind: "sunderStacks", stacks: 3 }],
    }),
  ],
  keystones: [
    {
      id: "perfect-parry",
      name: "Perfect Parry",
      form: "Parrying Blade",
      description: "Blocking or evading answers with a Riposte. −10 % Attack Speed.",
      effect: {
        bonuses: { attackSpeed: -0.1 },
        triggers: [
          {
            id: "perfect-parry-block",
            name: "Riposte",
            condition: { kind: "onBlock" },
            effect: { kind: "extraAttack" },
          },
          {
            id: "perfect-parry-evade",
            name: "Riposte",
            condition: { kind: "onEvade" },
            effect: { kind: "extraAttack" },
          },
        ],
      },
    },
    {
      id: "deep-cuts",
      name: "Deep Cuts",
      form: "Bleeding Edge",
      description: "Crits double the running Bleed. Damage Range minimum −20 %.",
      effect: { weaponRules: { critBleedMultiplier: 2 }, rangeMin: -0.2 },
    },
    {
      id: "flowing-blade",
      name: "Flowing Blade",
      form: "Dancing Blade",
      description:
        "Heat does not cool down while every Slash lands cleanly. Glancing Blows cost 10 Heat.",
      effect: { weaponRules: { flow: true, glancingHeat: -10 } },
    },
    {
      id: "final-verdict",
      name: "Final Verdict",
      form: "Verdict Blade",
      description: "+50 % damage to enemies below 30 % Life, −15 % above.",
      effect: { rules: { execute: { below: 0.3, bonus: 0.5, above: 0.15 } } },
    },
  ],
});

const MACE = buildTree({
  weaponId: "mace",
  precision: 0.65,
  rangeMin: 0.5,
  rangeMax: 1.2,
  paths: [
    {
      id: "crush",
      name: "Crush",
      theme: "Sunder",
      color: C.steel,
      minors: [
        minor("Dent", "+8 % chance per clean hit to Sunder.", {
          weaponRules: { sunder: { chance: 0.08 } },
        }),
        minor("Pierce", "+2 % Physical Penetration.", { bonuses: { physicalPenetration: 0.02 } }),
      ],
      notables: [
        notable("Armor Breaker", "+3 maximum Sunder stacks.", {
          weaponRules: { sunder: { maxStacks: 3 } },
        }),
        notable("Shatter", "+25 % damage to enemies at full Sunder.", {
          weaponRules: {
            conditionalDamage: [{ condition: { kind: "enemySundered" }, amount: 0.25 }],
          },
        }),
      ],
    },
    {
      id: "quake",
      name: "Quake",
      theme: "Stagger, Stun",
      color: C.ember,
      minors: [
        minor("Jolt", "Your stuns last 10 % longer.", { weaponRules: { stunDuration: 1.1 } }),
        minor("Weight", "+4 % Physical Damage.", { bonuses: { physicalDamage: 0.04 } }),
      ],
      notables: [
        notable("Heavy Head", "Every 3rd Smash staggers instead of every 4th.", {
          weaponTriggers: [{ id: "stagger", n: 3 }],
        }),
        notable("Aftershock", "Stunned enemies take 20 % more damage from you.", {
          weaponRules: {
            conditionalDamage: [{ condition: { kind: "enemyStunned" }, amount: 0.2 }],
          },
        }),
      ],
    },
    {
      id: "bulwark",
      name: "Bulwark",
      theme: "Block",
      color: C.gold,
      minors: [
        minor("Guard", "+2 % Block Chance.", { bonuses: { blockChance: 0.02 } }),
        minor("Plate", "+5 Armor.", { bonuses: { armor: 5 } }),
      ],
      notables: [
        notable("Iron Rhythm", "Every Block gives 10 Heat.", {
          triggers: [
            {
              id: "mastery-iron-rhythm",
              name: "Iron Rhythm",
              condition: { kind: "onBlock" },
              effect: { kind: "heat", amount: 10 },
            },
          ],
        }),
        notable("Hold the Line", "+8 % Block Chance, +15 Armor.", {
          bonuses: { blockChance: 0.08, armor: 15 },
        }),
      ],
    },
  ],
  innateForms: [
    form("concussion", "Concussion", "126 % Weapon Damage. Stuns for 1 s.", {
      ...SKULL_CRACK,
      id: "concussion",
      name: "Concussion",
      hits: [{ kind: "weapon", multiplier: 1.26 }],
      effects: [{ kind: "stun", seconds: 1 }],
    }),
    form(
      "bone-breaker",
      "Bone Breaker",
      "180 % Weapon Damage. Stuns for 0.5 s, adds 3 Sunder stacks.",
      {
        ...SKULL_CRACK,
        id: "bone-breaker",
        name: "Bone Breaker",
        effects: [...(SKULL_CRACK.effects ?? []), { kind: "sunderStacks", stacks: 3 }],
      },
    ),
    form("thunder-crack", "Thunder Crack", "180 % Weapon Damage as Lightning. Always Shocks.", {
      ...SKULL_CRACK,
      id: "thunder-crack",
      name: "Thunder Crack",
      tags: ["lightning", "direct", "any"],
      hits: [
        {
          kind: "weapon",
          multiplier: 1.8,
          damageType: "lightning",
          ailmentChances: [{ ailment: "shock", chance: 1 }],
        },
      ],
    }),
  ],
  keystones: [
    {
      id: "earthshaker",
      name: "Earthshaker",
      form: "Quaking Maul",
      description:
        "Your stuns last twice as long; stunned enemies gain no Heat. −15 % Attack Speed.",
      effect: {
        weaponRules: { stunDuration: 2, stunnedNoHeat: true },
        bonuses: { attackSpeed: -0.15 },
      },
    },
    {
      id: "anvil",
      name: "Anvil",
      form: "Anvil",
      description: "No more Glancing Blows. No more Crits.",
      effect: { weaponRules: { noGlancing: true }, rules: { critChanceMultiplier: 0 } },
    },
    {
      id: "siege",
      name: "Siege",
      form: "Siege Hammer",
      description: "+100 % damage to enemies at full Sunder. Damage Range minimum −30 %.",
      effect: {
        weaponRules: { conditionalDamage: [{ condition: { kind: "enemySundered" }, amount: 1 }] },
        rangeMin: -0.3,
      },
    },
    {
      id: "bastion",
      name: "Bastion",
      form: "Bastion Mace",
      description: "Double Block Chance. −20 % damage.",
      effect: { weaponRules: { blockMultiplier: 2, damageDealt: 0.8 } },
    },
  ],
});

const AXE = buildTree({
  weaponId: "axe",
  precision: 0.7,
  rangeMin: 0.4,
  rangeMax: 1.2,
  paths: [
    {
      id: "butcher",
      name: "Butcher",
      theme: "Bleed",
      color: C.blood,
      minors: [
        minor("Gash", "Bleed deals 5 % more damage.", {
          rules: { ailmentDamage: { bleed: 1.05 } },
        }),
        minor("Barb", "+3 % Bleed Chance.", { bonuses: { bleedChance: 0.03 } }),
      ],
      notables: [
        notable("Open Wounds", "Bleed deals 30 % more damage.", {
          rules: { ailmentDamage: { bleed: 1.3 } },
        }),
        notable("Blood Scent", "+15 % Attack Speed against Bleeding enemies.", {
          weaponRules: {
            conditionalAttackSpeed: [
              { condition: { kind: "enemyHas", ailment: "bleed" }, amount: 0.15 },
            ],
          },
        }),
      ],
    },
    {
      id: "frenzy",
      name: "Frenzy",
      theme: "Speed at low Life",
      color: C.ember,
      minors: [
        minor("Fury", "+3 % Attack Speed.", { bonuses: { attackSpeed: 0.03 } }),
        minor("Thirst", "+1 % Lifesteal.", { bonuses: { lifesteal: 0.01 } }),
      ],
      notables: [
        notable("Berserk", "+20 % Attack Speed below 50 % Life.", {
          weaponRules: {
            conditionalAttackSpeed: [
              { condition: { kind: "lifeBelow", fraction: 0.5 }, amount: 0.2 },
            ],
          },
        }),
        notable("Bloodrush", "Every Bleed tick gives 2 Heat.", {
          weaponRules: { heatPerDotTick: { ailment: "bleed", amount: 2 } },
        }),
      ],
    },
    {
      id: "cleave",
      name: "Cleave",
      theme: "Big single hits",
      color: C.steel,
      minors: [
        minor("Heft", "Damage Range maximum +5 %.", { rangeMax: 0.05 }),
        minor("Brawn", "+4 % Physical Damage.", { bonuses: { physicalDamage: 0.04 } }),
      ],
      notables: [
        notable("Overhead Chop", "Damage Range maximum +30 %.", { rangeMax: 0.3 }),
        notable("Headsplitter", "Hits in the top quarter of the Damage Range always crit.", {
          weaponRules: { topRollCrits: 0.75 },
        }),
      ],
    },
  ],
  innateForms: [
    form(
      "gutting-lacerate",
      "Gutting Lacerate",
      "100 % Weapon Damage. Always Bleeds, 60 % stronger.",
      {
        ...LACERATE,
        id: "gutting-lacerate",
        name: "Gutting Lacerate",
        hits: [
          {
            kind: "weapon",
            multiplier: 1,
            ailmentPower: 1.6,
            ailmentChances: [{ ailment: "bleed", chance: 1 }],
          },
        ],
      },
    ),
    form(
      "rending-lacerate",
      "Rending Lacerate",
      "Two cuts of 50 % Weapon Damage. Each always Bleeds.",
      {
        ...LACERATE,
        id: "rending-lacerate",
        name: "Rending Lacerate",
        hits: [
          {
            kind: "weapon",
            multiplier: 0.5,
            count: 2,
            ailmentChances: [{ ailment: "bleed", chance: 1 }],
          },
        ],
      },
    ),
    form(
      "hemorrhage",
      "Hemorrhage",
      "100 % Weapon Damage. Always Bleeds, then the Bleed bursts at once.",
      {
        ...LACERATE,
        id: "hemorrhage",
        name: "Hemorrhage",
        effects: [{ kind: "consumeBleed", multiplier: 1 }],
      },
    ),
  ],
  keystones: [
    {
      id: "bloodbath",
      name: "Bloodbath",
      form: "Bloodbath Axe",
      description: "Clean hits keep the Bleed running. −10 % Precision.",
      effect: { weaponRules: { refreshOnHit: ["bleed"] }, precision: -0.1 },
    },
    {
      id: "rampage",
      name: "Rampage",
      form: "Rampage Axe",
      description:
        "Every Bleed tick adds 1 % damage until the fight ends. Start each fight at −20 %.",
      effect: { weaponRules: { rampage: { ailment: "bleed", perTick: 0.01 }, damageDealt: 0.8 } },
    },
    {
      id: "executioner",
      name: "Executioner",
      form: "Headsman's Axe",
      description: "+100 % damage to enemies below 25 % Life. −5 % Crit Chance.",
      effect: { rules: { execute: { below: 0.25, bonus: 1 } }, bonuses: { critChance: -0.05 } },
    },
    {
      id: "gore",
      name: "Gore",
      form: "Gore Cleaver",
      description: "Damage Range maximum +60 %, but its minimum drops to 20 %.",
      effect: { rangeMax: 0.6, rangeMinSet: 0.2 },
    },
  ],
});

const DAGGER = buildTree({
  weaponId: "dagger",
  precision: 0.8,
  rangeMin: 0.5,
  rangeMax: 1,
  paths: [
    {
      id: "venom",
      name: "Venom",
      theme: "Poison stacks",
      color: C.venom,
      minors: [
        minor("Sting", "+3 % Poison Chance.", { bonuses: { poisonChance: 0.03 } }),
        minor("Linger", "Poison lasts 5 % longer.", {
          weaponRules: { ailmentDurationBy: { poison: 0.05 } },
        }),
      ],
      notables: [
        notable("Virulence", "+3 maximum Poison stacks.", { weaponRules: { poisonMaxStacks: 3 } }),
        notable("Seeping", "Poison lasts 30 % longer.", {
          weaponRules: { ailmentDurationBy: { poison: 0.3 } },
        }),
      ],
    },
    {
      id: "assassin",
      name: "Assassin",
      theme: "Crit",
      color: C.blood,
      minors: [
        minor("Mark", "+1.5 % Crit Chance.", { bonuses: { critChance: 0.015 } }),
        minor("Aim", "+2 % Precision.", { precision: 0.02 }),
      ],
      notables: [
        notable("Find the Gap", "+8 % Crit Chance.", { bonuses: { critChance: 0.08 } }),
        notable("Twist the Blade", "Crits add 2 Poison stacks.", {
          weaponRules: { critPoisonStacks: 2 },
        }),
      ],
    },
    {
      id: "flurry",
      name: "Flurry",
      theme: "Speed",
      color: C.storm,
      minors: [
        minor("Quick", "+3 % Attack Speed.", { bonuses: { attackSpeed: 0.03 } }),
        minor("Nimble", "+2 % Evasion.", { bonuses: { evasion: 0.02 } }),
      ],
      notables: [
        notable("Quick Hands", "+12 % Attack Speed.", { bonuses: { attackSpeed: 0.12 } }),
        notable("Double Stab", "15 % chance to stab a second time at once.", {
          triggers: [
            {
              id: "mastery-double-stab",
              name: "Double Stab",
              condition: { kind: "onHit" },
              chance: 0.15,
              effect: { kind: "extraAttack" },
            },
          ],
        }),
      ],
    },
  ],
  innateForms: [
    form("virulent-coat", "Virulent Coat", "For 6 s, every hit Poisons. Costs 10 less Heat.", {
      ...VENOM_COAT,
      id: "virulent-coat",
      name: "Virulent Coat",
      heatCost: VENOM_COAT.heatCost - 10,
      effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 6 }],
    }),
    form("paralytic-coat", "Paralytic Coat", "For 8 s, every hit Poisons and often Chills.", {
      ...VENOM_COAT,
      id: "paralytic-coat",
      name: "Paralytic Coat",
      effects: [
        { kind: "buff", stat: "poisonChance", amount: 1, duration: 8 },
        { kind: "buff", stat: "chillChance", amount: 0.5, duration: 8 },
      ],
    }),
    form("lingering-coat", "Lingering Coat", "For 12 s, every hit Poisons. Costs 5 more Heat.", {
      ...VENOM_COAT,
      id: "lingering-coat",
      name: "Lingering Coat",
      heatCost: VENOM_COAT.heatCost + 5,
      effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 12 }],
    }),
  ],
  keystones: [
    {
      id: "thousand-cuts",
      name: "Thousand Cuts",
      form: "Needle",
      description: "+40 % Attack Speed. Damage Range maximum drops to 80 %.",
      effect: { bonuses: { attackSpeed: 0.4 }, rangeMaxCap: 0.8 },
    },
    {
      id: "assassinate",
      name: "Assassinate",
      form: "Assassin's Dirk",
      description: "The first clean hit of every fight crits for +200 %. −10 % Attack Speed.",
      effect: { weaponRules: { openerDamage: 2 }, bonuses: { attackSpeed: -0.1 } },
    },
    {
      id: "toxic-bloom",
      name: "Toxic Bloom",
      form: "Venom Fang",
      description:
        "At 10 Poison stacks all of them burst for 150 % of their rest. Then no Poison for 3 s.",
      effect: { weaponRules: { poisonBurst: { stacks: 10, multiplier: 1.5, lockout: 3 } } },
    },
    {
      id: "shadowstep",
      name: "Shadowstep",
      form: "Shadow Kris",
      description: "After an Evade your next Stab is a clean Crit. −20 % Life.",
      effect: { weaponRules: { critAfter: ["evade"] }, rules: { lifeMultiplier: 0.8 } },
    },
  ],
});

const BOW = buildTree({
  weaponId: "bow",
  precision: 0.75,
  rangeMin: 0.4,
  rangeMax: 1.1,
  paths: [
    {
      id: "barbs",
      name: "Barbs",
      theme: "Bleed",
      color: C.blood,
      minors: [
        minor("Barb", "+3 % Bleed Chance.", { bonuses: { bleedChance: 0.03 } }),
        minor("Draw", "+4 % Physical Damage.", { bonuses: { physicalDamage: 0.04 } }),
      ],
      notables: [
        notable("Serrated Heads", "+15 % Bleed Chance.", { bonuses: { bleedChance: 0.15 } }),
        notable("Bloodtrail", "+10 % damage to Bleeding enemies.", {
          weaponRules: {
            conditionalDamage: [{ condition: { kind: "enemyHas", ailment: "bleed" }, amount: 0.1 }],
          },
        }),
      ],
    },
    {
      id: "toxin",
      name: "Toxin",
      theme: "Poison",
      color: C.venom,
      minors: [
        minor("Dip", "+3 % Poison Chance.", { bonuses: { poisonChance: 0.03 } }),
        minor("Linger", "+4 % Ailment Duration.", { bonuses: { ailmentDuration: 0.04 } }),
      ],
      notables: [
        notable("Dipped Arrows", "+15 % Poison Chance.", { bonuses: { poisonChance: 0.15 } }),
        notable("Festering", "Every Poison stack lets your hits ignore 2 % of the enemy's Armor.", {
          weaponRules: { poisonArmorShred: 0.02 },
        }),
      ],
    },
    {
      id: "volley",
      name: "Volley",
      theme: "More arrows",
      color: C.storm,
      minors: [
        minor("Nock", "+3 % Attack Speed.", { bonuses: { attackSpeed: 0.03 } }),
        minor("Sight", "+2 % Precision.", { precision: 0.02 }),
      ],
      notables: [
        notable("Split Shot", "20 % chance to loose a second arrow for 60 % Weapon Damage.", {
          triggers: [
            {
              id: "mastery-split-shot",
              name: "Split Shot",
              condition: { kind: "onHit" },
              chance: 0.2,
              effect: { kind: "weaponHit", multiplier: 0.6 },
            },
          ],
        }),
        notable("Steady Aim", "+10 % Precision while you were not hit for 3 s.", {
          weaponRules: { steadyAim: { seconds: 3, precision: 0.1 } },
        }),
      ],
    },
  ],
  innateForms: [
    form("hooked-arrow", "Hooked Arrow", "100 % Weapon Damage. Always Bleeds, 30 % stronger.", {
      ...BARBED_ARROW,
      id: "hooked-arrow",
      name: "Hooked Arrow",
      hits: [
        {
          kind: "weapon",
          multiplier: 1,
          ailmentPower: 1.3,
          ailmentChances: [{ ailment: "bleed", chance: 1 }],
        },
      ],
    }),
    form("toxic-arrow", "Toxic Arrow", "Two hits of 50 % Weapon Damage. Each always Poisons.", {
      ...BARBED_ARROW,
      id: "toxic-arrow",
      name: "Toxic Arrow",
      hits: [
        {
          kind: "weapon",
          multiplier: 0.5,
          count: 2,
          ailmentChances: [{ ailment: "poison", chance: 1 }],
        },
      ],
    }),
    form(
      "split-arrow",
      "Split Arrow",
      "Three arrows of 50 % Weapon Damage. 25 % chance each to Bleed or Poison.",
      {
        ...BARBED_ARROW,
        id: "split-arrow",
        name: "Split Arrow",
        hits: [
          {
            kind: "weapon",
            multiplier: 0.5,
            count: 3,
            ailmentChances: [
              { ailment: "bleed", chance: 0.25 },
              { ailment: "poison", chance: 0.25 },
            ],
          },
        ],
      },
    ),
  ],
  keystones: [
    {
      id: "rain-of-arrows",
      name: "Rain of Arrows",
      form: "Storm Bow",
      description: "Every Shoot looses two more arrows for 40 % Weapon Damage each. −25 % damage.",
      effect: {
        weaponRules: { damageDealt: 0.75 },
        triggers: [0, 1].map((i) => ({
          id: `mastery-rain-${i}`,
          name: "Rain of Arrows",
          condition: { kind: "onHit" as const },
          effect: { kind: "weaponHit" as const, multiplier: 0.4 },
        })),
      },
    },
    {
      id: "patient-draw",
      name: "Patient Draw",
      form: "Longbow",
      description:
        "+1 % damage for every second since your last skill (up to +30 %). −15 % Attack Speed.",
      effect: {
        weaponRules: { patience: { perSecond: 0.01, max: 0.3 } },
        bonuses: { attackSpeed: -0.15 },
      },
    },
    {
      id: "hunters-mark",
      name: "Hunter's Mark",
      form: "Marking Bow",
      description:
        "Your first clean hit marks the enemy: +20 % damage for the fight. Until then Glancing Blows deal nothing.",
      effect: { weaponRules: { mark: { bonus: 0.2 } } },
    },
    {
      id: "wild-shot",
      name: "Wild Shot",
      form: "Wild Bow",
      description: "Damage Range maximum +80 %. −15 % Precision.",
      effect: { rangeMax: 0.8, precision: -0.15 },
    },
  ],
});

const CROSSBOW = buildTree({
  weaponId: "crossbow",
  precision: 0.6,
  rangeMin: 0.6,
  rangeMax: 1.3,
  paths: [
    {
      id: "pierce",
      name: "Pierce",
      theme: "Armor Penetration",
      color: C.steel,
      minors: [
        minor("Point", "+2 % Physical Penetration.", { bonuses: { physicalPenetration: 0.02 } }),
        minor("Bolt", "+4 % Physical Damage.", { bonuses: { physicalDamage: 0.04 } }),
      ],
      notables: [
        notable("Bodkin", "+15 % Physical Penetration.", {
          bonuses: { physicalPenetration: 0.15 },
        }),
        notable("Through and Through", "Every clean hit adds a Sunder stack.", {
          weaponRules: { sunder: { chance: 1 } },
        }),
      ],
    },
    {
      id: "payload",
      name: "Payload",
      theme: "Big hits, Crit",
      color: C.ember,
      minors: [
        minor("Tension", "Damage Range maximum +5 %.", { rangeMax: 0.05 }),
        minor("Sight", "+1.5 % Crit Chance.", { bonuses: { critChance: 0.015 } }),
      ],
      notables: [
        notable("Heavy Draw", "Damage Range maximum +30 %.", { rangeMax: 0.3 }),
        notable("Killshot", "Crits ignore 50 % of the enemy's Armor.", {
          weaponRules: { critPenetration: 0.5 },
        }),
      ],
    },
    {
      id: "reload",
      name: "Reload",
      theme: "Speed, Heat",
      color: C.storm,
      minors: [
        minor("Crank", "+3 % Attack Speed.", { bonuses: { attackSpeed: 0.03 } }),
        minor("Wind", "+4 % Heat Gain.", { bonuses: { heatGain: 0.04 } }),
      ],
      notables: [
        notable("Quick Crank", "+10 % Attack Speed.", { bonuses: { attackSpeed: 0.1 } }),
        notable("Loaded Spring", "Every Glancing Blow gives 10 Heat.", {
          weaponRules: { glancingHeat: 10 },
        }),
      ],
    },
  ],
  innateForms: [
    form("ballista-bolt", "Ballista Bolt", "380 % Weapon Damage that ignores 50 % Armor.", {
      ...HEAVY_BOLT,
      id: "ballista-bolt",
      name: "Ballista Bolt",
      hits: [{ kind: "weapon", multiplier: 3.8, penetration: 0.5 }],
    }),
    form("explosive-bolt", "Explosive Bolt", "240 % Weapon Damage as Fire. Always Burns.", {
      ...HEAVY_BOLT,
      id: "explosive-bolt",
      name: "Explosive Bolt",
      tags: ["fire", "direct", "any"],
      hits: [
        {
          kind: "weapon",
          multiplier: 2.4,
          damageType: "fire",
          ailmentChances: [{ ailment: "burn", chance: 1 }],
        },
      ],
    }),
    form(
      "pinning-bolt",
      "Pinning Bolt",
      "240 % Weapon Damage that ignores 30 % Armor. Stuns for 0.7 s.",
      {
        ...HEAVY_BOLT,
        id: "pinning-bolt",
        name: "Pinning Bolt",
        effects: [{ kind: "stun", seconds: 0.7 }],
      },
    ),
  ],
  keystones: [
    {
      id: "deadeye",
      name: "Deadeye",
      form: "Deadeye Arbalest",
      description: "Every 5th Bolt lands cleanly and crits. Your Crit Chance is halved otherwise.",
      effect: { weaponRules: { everyNthCrit: 5 }, rules: { critChanceMultiplier: 0.5 } },
    },
    {
      id: "siege-engine",
      name: "Siege Engine",
      form: "Siege Arbalest",
      description: "+60 % damage. −30 % Attack Speed.",
      effect: { weaponRules: { damageDealt: 1.6 }, bonuses: { attackSpeed: -0.3 } },
    },
    {
      id: "repeater",
      name: "Repeater",
      form: "Repeater",
      description: "+50 % Attack Speed. −30 % damage.",
      effect: { weaponRules: { damageDealt: 0.7 }, bonuses: { attackSpeed: 0.5 } },
    },
    {
      id: "harpoon",
      name: "Harpoon",
      form: "Harpoon",
      description: "Enemies you fight gain 25 % less Heat. Damage Range maximum −20 %.",
      effect: { weaponRules: { enemyHeatGain: [{ amount: -0.25 }] }, rangeMax: -0.2 },
    },
  ],
});

const WAND = buildTree({
  weaponId: "fire-wand",
  precision: 0.7,
  rangeMin: 0.4,
  rangeMax: 1.1,
  attunements: [
    {
      id: "attune-fire",
      name: "Fire",
      description: "Spark and your Innate deal Fire Damage and Burn.",
      damageType: "fire",
      ailment: "burn",
    },
    {
      id: "attune-cold",
      name: "Cold",
      description: "Spark and your Innate deal Cold Damage and Chill.",
      damageType: "cold",
      ailment: "chill",
    },
    {
      id: "attune-lightning",
      name: "Lightning",
      description: "Spark and your Innate deal Lightning Damage and Shock.",
      damageType: "lightning",
      ailment: "shock",
    },
  ],
  paths: [
    {
      id: "pyre",
      name: "Pyre",
      theme: "Burn",
      color: C.ember,
      minors: [
        minor("Kindling", "+3 % Burn Chance.", { bonuses: { burnChance: 0.03 } }),
        minor("Heat", "+4 % Elemental Damage.", { bonuses: { elementalDamage: 0.04 } }),
      ],
      notables: [
        notable("Kindle", "+20 % Burn Chance.", { bonuses: { burnChance: 0.2 } }),
        notable("Wildfire", "Burn deals 30 % more damage.", {
          rules: { ailmentDamage: { burn: 1.3 } },
        }),
      ],
    },
    {
      id: "rime",
      name: "Rime",
      theme: "Chill, control",
      color: C.frost,
      minors: [
        minor("Frost", "+3 % Chill Chance.", { bonuses: { chillChance: 0.03 } }),
        minor("Hold", "+4 % Ailment Duration.", { bonuses: { ailmentDuration: 0.04 } }),
      ],
      notables: [
        notable("Bitter Cold", "Chill lasts 40 % longer.", {
          weaponRules: { ailmentDurationBy: { chill: 0.4 } },
        }),
        notable("Shatterpoint", "+25 % damage to Chilled enemies.", {
          weaponRules: {
            conditionalDamage: [
              { condition: { kind: "enemyHas", ailment: "chill" }, amount: 0.25 },
            ],
          },
        }),
      ],
    },
    {
      id: "storm",
      name: "Storm",
      theme: "Shock, Crit",
      color: C.storm,
      minors: [
        minor("Static", "+3 % Shock Chance.", { bonuses: { shockChance: 0.03 } }),
        minor("Spark", "+1.5 % Crit Chance.", { bonuses: { critChance: 0.015 } }),
      ],
      notables: [
        notable("Static Field", "+20 % Shock Chance.", { bonuses: { shockChance: 0.2 } }),
        notable("Arc", "Every Crit gives 8 Heat.", {
          triggers: [
            {
              id: "mastery-arc",
              name: "Arc",
              condition: { kind: "onCrit" },
              effect: { kind: "heat", amount: 8 },
            },
          ],
        }),
      ],
    },
  ],
  innateForms: [
    form("lance", "Lance", "One bolt with 70 % more damage. Costs 10 more Heat.", {
      ...FIREBOLT,
      id: "fire-lance",
      name: "Fire Lance",
      heatCost: FIREBOLT.heatCost + 10,
      hits: FIREBOLT.hits.map((h) =>
        h.kind === "spell"
          ? { ...h, damage: { min: h.damage.min * 1.7, max: h.damage.max * 1.7 } }
          : h,
      ),
    }),
    form("barrage", "Barrage", "Three bolts of 45 % each.", {
      ...FIREBOLT,
      id: "fire-barrage",
      name: "Fire Barrage",
      hits: FIREBOLT.hits.map((h) =>
        h.kind === "spell"
          ? { ...h, count: 3, damage: { min: h.damage.min * 0.45, max: h.damage.max * 0.45 } }
          : h,
      ),
    }),
    form("seeking-bolt", "Seeking Bolt", "Never a Glancing Blow.", {
      ...FIREBOLT,
      id: "seeking-firebolt",
      name: "Seeking Firebolt",
      hits: FIREBOLT.hits.map((h) => (h.kind === "spell" ? { ...h, precise: true } : h)),
    }),
  ],
  keystones: [
    {
      id: "prism",
      name: "Prism",
      form: "Prism Wand",
      description:
        "Spark cycles through Fire, Cold and Lightning and can inflict each ailment. −15 % damage.",
      effect: { weaponRules: { prism: true, damageDealt: 0.85 } },
    },
    {
      id: "glass-cannon",
      name: "Glass Cannon",
      form: "Glass Wand",
      description: "+40 % Elemental Damage. −25 % Life.",
      effect: { bonuses: { elementalDamage: 0.4 }, rules: { lifeMultiplier: 0.75 } },
    },
    {
      id: "focused-will",
      name: "Focused Will",
      form: "Scepter",
      description: "No more Glancing Blows. −20 % Attack Speed.",
      effect: { weaponRules: { noGlancing: true }, bonuses: { attackSpeed: -0.2 } },
    },
    {
      id: "wild-magic",
      name: "Wild Magic",
      form: "Chaos Wand",
      description: "20 % chance for a second Spark at once. −10 % Precision.",
      effect: {
        precision: -0.1,
        triggers: [
          {
            id: "mastery-wild-magic",
            name: "Wild Magic",
            condition: { kind: "onHit" },
            chance: 0.2,
            effect: { kind: "extraAttack" },
          },
        ],
      },
    },
  ],
});

const STAFF = buildTree({
  weaponId: "staff",
  precision: 0.65,
  rangeMin: 0.5,
  rangeMax: 1.1,
  attunements: [
    {
      id: "attune-void",
      name: "Void",
      description: "Channel and your Innate deal Void Damage and Corrupt.",
      damageType: "void",
      ailment: "corruption",
    },
    {
      id: "attune-fire",
      name: "Fire",
      description: "Channel and your Innate deal Fire Damage and Burn.",
      damageType: "fire",
      ailment: "burn",
    },
  ],
  paths: [
    {
      id: "smolder",
      name: "Smolder",
      theme: "Burn",
      color: C.ember,
      minors: [
        minor("Ember", "+3 % Burn Chance.", { bonuses: { burnChance: 0.03 } }),
        minor("Glow", "+4 % Elemental Damage.", { bonuses: { elementalDamage: 0.04 } }),
      ],
      notables: [
        notable("Slow Burn", "Burn lasts 40 % longer.", {
          weaponRules: { ailmentDurationBy: { burn: 0.4 } },
        }),
        notable("Cinders", "Burn deals 25 % more damage.", {
          rules: { ailmentDamage: { burn: 1.25 } },
        }),
      ],
    },
    {
      id: "hollow",
      name: "Hollow",
      theme: "Corruption",
      color: C.void,
      minors: [
        minor("Taint", "+3 % Corruption Chance.", { bonuses: { corruptionChance: 0.03 } }),
        minor("Dusk", "+4 % Ailment Duration.", { bonuses: { ailmentDuration: 0.04 } }),
      ],
      notables: [
        notable("Deepening Dark", "Corruption deals 30 % more damage.", {
          rules: { ailmentDamage: { corruption: 1.3 } },
        }),
        notable("Grasp", "Corrupted enemies gain 10 % less Heat.", {
          weaponRules: {
            enemyHeatGain: [
              { amount: -0.1, condition: { kind: "enemyHas", ailment: "corruption" } },
            ],
          },
        }),
      ],
    },
    {
      id: "channel",
      name: "Channel",
      theme: "Heat, duration",
      color: C.frost,
      minors: [
        minor("Breath", "+4 % Heat Gain.", { bonuses: { heatGain: 0.04 } }),
        minor("Patience", "+3 % Ailment Duration.", { bonuses: { ailmentDuration: 0.03 } }),
      ],
      notables: [
        notable("Long Breath", "+20 % Ailment Duration.", { bonuses: { ailmentDuration: 0.2 } }),
        notable("Overflow", "Above 80 Heat, skills cost 15 % less.", {
          weaponRules: { overflow: { above: 80, discount: 0.15 } },
        }),
      ],
    },
  ],
  innateForms: [
    form("void-lance", "Void Lance", "A Void hit with 60 % more damage. Always Corrupts.", {
      ...VOID_BOLT,
      id: "void-lance",
      name: "Void Lance",
      hits: VOID_BOLT.hits.map((h) =>
        h.kind === "spell"
          ? {
              ...h,
              damage: { min: h.damage.min * 1.6, max: h.damage.max * 1.6 },
              ailmentChances: [{ ailment: "corruption", chance: 1 }],
            }
          : h,
      ),
    }),
    form("rift-bolt", "Rift Bolt", "A Void hit that always Corrupts and Burns.", {
      ...VOID_BOLT,
      id: "rift-bolt",
      name: "Rift Bolt",
      hits: VOID_BOLT.hits.map((h) =>
        h.kind === "spell"
          ? {
              ...h,
              ailmentChances: [
                { ailment: "corruption", chance: 1 },
                { ailment: "burn", chance: 1 },
              ],
            }
          : h,
      ),
    }),
    form("draining-bolt", "Draining Bolt", "A Void hit. 50 % chance to Corrupt. Heals 4 % Life.", {
      ...VOID_BOLT,
      id: "draining-bolt",
      name: "Draining Bolt",
      effects: [{ kind: "heal", fraction: 0.04 }],
    }),
  ],
  keystones: [
    {
      id: "endless-night",
      name: "Endless Night",
      form: "Nightstaff",
      description: "Corruption lasts ten times as long. −30 % hit damage.",
      effect: { weaponRules: { ailmentDurationBy: { corruption: 9 }, damageDealt: 0.7 } },
    },
    {
      id: "pyre",
      name: "Pyre",
      form: "Pyre Staff",
      description: "Burn deals 60 % more damage but lasts 40 % shorter.",
      effect: {
        rules: { ailmentDamage: { burn: 1.6 } },
        weaponRules: { ailmentDurationBy: { burn: -0.4 } },
      },
    },
    {
      id: "siphon",
      name: "Siphon",
      form: "Siphon Staff",
      description: "Your ailments heal you for 5 % of their damage. −15 % damage over time.",
      effect: { rules: { dotLifesteal: 0.05, dotDamage: 0.85 } },
    },
    {
      id: "eclipse",
      name: "Eclipse",
      form: "Eclipse Staff",
      description:
        "+10 % damage for every ailment on the enemy. Channel inflicts no ailments of its own.",
      effect: { weaponRules: { damagePerAilment: 0.1, noDefaultAilments: true } },
    },
  ],
});

/** Weapon Mastery tree per weapon id. */
export const WEAPON_MASTERY: Readonly<Record<string, WeaponMasteryTree>> = Object.fromEntries(
  [SWORD, MACE, AXE, DAGGER, BOW, CROSSBOW, WAND, STAFF].map((t) => [t.weaponId, t]),
);

// --- Echoes ---------------------------------------------------------------------------------

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
export const echoStageName = (stage: number) => ROMAN[stage] ?? String(stage);

/** Linear growth from stage I to VII. */
const grow = (first: number, last: number) => (stage: number) =>
  first + ((last - first) * (Math.max(1, Math.min(7, stage)) - 1)) / 6;

const wrath = grow(2, 3.5);
const brood = grow(0.3, 0.6);
const crown = grow(0.5, 0.8);
const breath = grow(3, 4.5);
const thunder = grow(1, 1.75);
const hunger = grow(0.1, 0.22);
const dawn = grow(0.6, 1);

/**
 * Echoes (section 4 of the trees doc): the first win over an act boss leaves its Echo on the
 * weapon; every later run's win raises it a stage. Effects are the old boss trophy powers.
 */
export const ECHOES: readonly EchoDefinition[] = [
  {
    id: "ashfall-wrath",
    name: "Ashfall Wrath",
    actId: "ashen-fields",
    color: 0xa8a29a,
    description: (s) => `Every 5th hit you take: a counter for ${pct(wrath(s))} Weapon Damage.`,
    effect: (s) => ({
      triggers: [
        {
          id: "echo-ashfall-wrath",
          name: "Ashfall Wrath",
          condition: { kind: "everyNthHitTaken", n: 5 },
          effect: { kind: "weaponHit", multiplier: wrath(s) },
        },
      ],
    }),
  },
  {
    id: "whispering-brood",
    name: "Whispering Brood",
    actId: "rotwood",
    color: 0x7aa24a,
    description: (s) =>
      `Your Bleed, Poison, Burn and Corruption deal ${pct(brood(s))} more damage.`,
    effect: (s) => ({ rules: { dotDamage: 1 + brood(s) } }),
  },
  {
    id: "crowned-cinder",
    name: "Crowned Cinder",
    actId: "ember-wastes",
    color: 0xe0502a,
    description: (s) => `Below 30 % Life: +${pct(crown(s))} Attack Speed for 6 s.`,
    effect: (s) => ({
      triggers: [
        {
          id: "echo-crowned-cinder",
          name: "Crowned Cinder",
          condition: { kind: "lifeBelow", threshold: 0.3 },
          effect: { kind: "buff", stat: "attackSpeed", amount: crown(s), duration: 6 },
        },
      ],
    }),
  },
  {
    id: "winters-last-breath",
    name: "Winter's Last Breath",
    actId: "frost-peaks",
    color: 0x9cd0f0,
    description: (s) => `Every 10th attack is an Avalanche for ${pct(breath(s))} Weapon Damage.`,
    effect: (s) => ({
      triggers: [
        {
          id: "echo-winters-last-breath",
          name: "Avalanche",
          condition: { kind: "everyNthAttack", n: 10 },
          effect: { kind: "weaponHit", multiplier: breath(s) },
        },
      ],
    }),
  },
  {
    id: "first-thunder",
    name: "First Thunder",
    actId: "storm-spires",
    color: 0xf0e08a,
    description: (s) => `Every Crit calls down lightning for ${pct(thunder(s))} Weapon Damage.`,
    effect: (s, weaponDamage) => ({
      triggers: [
        {
          id: "echo-first-thunder",
          name: "First Thunder",
          condition: { kind: "onCrit" },
          cooldown: 1,
          effect: {
            kind: "spellHit",
            name: "First Thunder",
            damage: {
              min: weaponDamage * thunder(s) * 0.8,
              max: weaponDamage * thunder(s) * 1.2,
            },
            damageType: "lightning",
          },
        },
      ],
    }),
  },
  {
    id: "hollow-hunger",
    name: "Hollow Hunger",
    actId: "void-rift",
    color: 0x9a6ae0,
    description: (s) => `Your ailments heal you for ${pct(hunger(s))} of their damage.`,
    effect: (s) => ({ rules: { dotLifesteal: hunger(s) } }),
  },
  {
    id: "stolen-dawn",
    name: "Stolen Dawn",
    actId: "emberfall",
    color: 0xf0b860,
    description: (s) => `+${pct(dawn(s))} damage to enemies below 35 % Life.`,
    effect: (s) => ({ rules: { execute: { below: 0.35, bonus: dawn(s) } } }),
  },
];
