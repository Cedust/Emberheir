import type {
  CombatRules,
  PrestigeBranchDefinition,
  SkillDefinition,
  SkillNode,
  SkillNodeKind,
  StatBonuses,
  TriggerSpec,
} from "@emberheir/sim";
import { describeBonuses } from "./skill-web";

/**
 * Masteries (klassengeruest-v1.md 5): each class has three, one per fighting style, and every
 * one works with all three builds of the class's weapons. Burst = big hits, skills, Heat spent;
 * Tempo = many quick hits, the Default Attack, On Hit; Ailment = chance, strength and duration of
 * every ailment. The first Harvest picks the main Mastery (Tier I: title, Mastery skill and
 * Keystone); every later Harvest deepens it (up to Tier V) or takes Tier I of another one.
 *
 * Each Mastery grows out of the Ash Tree at a Notable. Filling a tier costs 8 / 5 / 6 / 4 / 4
 * Skill Points: tier I has eight nodes and the Keystone, tiers II and III add a few nodes and lift
 * the Keystone (Greater, Supreme), tiers IV and V add a Notable each; every deeper tier gives the
 * Mastery skill one more rank.
 *
 *   entry ─ a1 ─ a2 (notable) ─┐       ┌─ a3 (notable) ─ keystone ─ keystone II ─ keystone III
 *       └── b1 ─ skill ────────┴─ mid ─┴─ b3 (notable) ─ b4 (II) ─ t2a ─┬─ t2n
 *                                                                       └─ t2b ─ t3a ─┬─ t3n
 *                                                     t5n ┬─ t5a ─ t4b ─┬─ t4n        └─ t3b
 *                                                     t5b ┘             └─ t4a ───────────┘
 *
 * Mastery skills are infused: they take the damage type and the ailment of the Heirloom path.
 * Numbers are starting values for the balance CLI.
 */

interface NodeSpec {
  readonly name: string;
  readonly description: string;
  readonly bonuses?: StatBonuses;
  readonly triggers?: readonly TriggerSpec[];
  readonly rules?: CombatRules;
}

interface KeystoneSpec {
  readonly name: string;
  readonly description: string;
  readonly rules: CombatRules;
}

interface MasterySpec extends PrestigeBranchDefinition {
  /** Direction the Mastery grows out of the tree, in degrees (0 = right, 90 = down). */
  readonly angle: number;
  readonly skill: SkillDefinition;
  /** Tier I Notables a2, a3, b3. */
  readonly notables: readonly [NodeSpec, NodeSpec, NodeSpec];
  /** Keystone I, II (Greater) and III (Supreme). */
  readonly keystones: readonly [KeystoneSpec, KeystoneSpec, KeystoneSpec];
  /** The Notables of tiers II to V. */
  readonly deeper: readonly [NodeSpec, NodeSpec, NodeSpec, NodeSpec];
  /** Names and Defense of the 13 travel nodes, in the order of `TRAVEL_SLOTS`. */
  readonly travel: readonly (readonly [string, StatBonuses])[];
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
  | "t3b"
  | "t4a"
  | "t4n"
  | "t4b"
  | "t5a"
  | "t5n"
  | "t5b";

/** Layout along the Mastery (x outwards, y across) and the links of every slot. */
const SHAPE: Record<
  Slot,
  {
    readonly kind: SkillNodeKind;
    readonly tier: 1 | 2 | 3 | 4 | 5;
    readonly x: number;
    readonly y: number;
    readonly ranks: number;
    readonly links: readonly Slot[];
  }
> = {
  entry: { kind: "minor", tier: 1, x: 0, y: 1, ranks: 1, links: ["a1", "b1"] },
  a1: { kind: "minor", tier: 1, x: 1, y: 0, ranks: 1, links: ["a2"] },
  b1: { kind: "minor", tier: 1, x: 1, y: 2, ranks: 1, links: ["skill"] },
  a2: { kind: "notable", tier: 1, x: 2, y: 0, ranks: 1, links: ["mid"] },
  skill: { kind: "skill", tier: 1, x: 2, y: 2, ranks: 1, links: ["mid"] },
  mid: { kind: "minor", tier: 1, x: 3, y: 1, ranks: 1, links: ["a3", "b3"] },
  a3: { kind: "notable", tier: 1, x: 4, y: 0, ranks: 1, links: ["keystone"] },
  b3: { kind: "notable", tier: 1, x: 4, y: 2, ranks: 1, links: ["b4"] },
  b4: { kind: "minor", tier: 2, x: 5, y: 2, ranks: 1, links: ["t2a"] },
  keystone: { kind: "keystone", tier: 1, x: 5, y: 0, ranks: 1, links: ["keystone-2"] },
  "keystone-2": { kind: "keystone", tier: 2, x: 6, y: -0.5, ranks: 1, links: ["keystone-3"] },
  t2a: { kind: "minor", tier: 2, x: 6, y: 2, ranks: 1, links: ["t2n", "t2b"] },
  t2n: { kind: "notable", tier: 2, x: 7, y: 1.2, ranks: 1, links: [] },
  t2b: { kind: "minor", tier: 2, x: 7, y: 2.8, ranks: 1, links: ["t3a"] },
  "keystone-3": { kind: "keystone", tier: 3, x: 7, y: -1, ranks: 1, links: [] },
  t3a: { kind: "minor", tier: 3, x: 8, y: 2.2, ranks: 2, links: ["t3n", "t3b"] },
  t3n: { kind: "notable", tier: 3, x: 9, y: 1.4, ranks: 1, links: [] },
  t3b: { kind: "minor", tier: 3, x: 9, y: 3, ranks: 2, links: ["t4a"] },
  t4a: { kind: "minor", tier: 4, x: 10, y: 3.4, ranks: 1, links: ["t4n", "t4b"] },
  t4n: { kind: "notable", tier: 4, x: 11, y: 2.6, ranks: 1, links: [] },
  t4b: { kind: "minor", tier: 4, x: 11, y: 4.2, ranks: 1, links: ["t5a"] },
  t5a: { kind: "minor", tier: 5, x: 12, y: 3.6, ranks: 1, links: ["t5n", "t5b"] },
  t5n: { kind: "notable", tier: 5, x: 13, y: 2.8, ranks: 1, links: [] },
  t5b: { kind: "minor", tier: 5, x: 13, y: 4.4, ranks: 1, links: [] },
};

const SLOTS = Object.keys(SHAPE) as Slot[];
const TRAVEL_SLOTS = [
  "entry",
  "a1",
  "b1",
  "mid",
  "b4",
  "t2a",
  "t2b",
  "t3a",
  "t3b",
  "t4a",
  "t4b",
  "t5a",
  "t5b",
] as const;
const NOTABLE_SLOTS: Readonly<Partial<Record<Slot, (s: MasterySpec) => NodeSpec>>> = {
  a2: (s) => s.notables[0],
  a3: (s) => s.notables[1],
  b3: (s) => s.notables[2],
  t2n: (s) => s.deeper[0],
  t3n: (s) => s.deeper[1],
  t4n: (s) => s.deeper[2],
  t5n: (s) => s.deeper[3],
};
const KEYSTONE_SLOTS: Readonly<Partial<Record<Slot, 0 | 1 | 2>>> = {
  keystone: 0,
  "keystone-2": 1,
  "keystone-3": 2,
};
const nodeId = (mastery: string, slot: Slot) => `pb-${mastery}-${slot}`;

/** Distance of a Mastery's entry node from the middle of the tree, and the node spacing. */
const START_RADIUS = 12.6;
const STEP = 1.1;

const half = (bonuses: StatBonuses): StatBonuses =>
  Object.fromEntries(
    Object.entries(bonuses).map(([stat, v]) => [stat, Math.round((v as number) * 0.5 * 1e4) / 1e4]),
  );

function buildMastery(spec: MasterySpec): SkillNode[] {
  const a = (spec.angle * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const at = (x: number, y: number) => {
    const along = START_RADIUS + x * STEP;
    const across = (y - 1) * STEP;
    const round = (v: number) => Math.round(v * 100) / 100;
    return { x: round(dx * along - dy * across), y: round(dy * along + dx * across) };
  };
  return SLOTS.map((slot): SkillNode => {
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
        description: `Unlocks ${spec.skill.name}. Each deeper tier adds a Skill Level.`,
        skill: spec.skill,
      };
    }
    const k = KEYSTONE_SLOTS[slot];
    if (k !== undefined) {
      const keystone = spec.keystones[k];
      const replaces = k === 1 ? "keystone" : k === 2 ? "keystone-2" : undefined;
      return {
        ...base,
        name: keystone.name,
        description: keystone.description,
        keystone: keystone.rules,
        ...(replaces ? { replaces: nodeId(spec.id, replaces) } : {}),
      };
    }
    const notable = NOTABLE_SLOTS[slot]?.(spec);
    if (notable) {
      return {
        ...base,
        name: notable.name,
        description: notable.description,
        ...(notable.bonuses ? { bonuses: notable.bonuses } : {}),
        ...(notable.triggers ? { triggers: notable.triggers } : {}),
        ...(notable.rules ? { rules: notable.rules } : {}),
      };
    }
    // Travel nodes: small Defense that fits the class.
    const travel = spec.travel[TRAVEL_SLOTS.indexOf(slot as (typeof TRAVEL_SLOTS)[number])];
    if (!travel) throw new Error(`${spec.id}: no travel node for ${slot}`);
    const [name, defense] = travel;
    const bonuses = shape.ranks > 1 ? half(defense) : defense;
    const text = describeBonuses(bonuses);
    return {
      ...base,
      name,
      description: shape.ranks > 1 ? `${text.slice(0, -1)} per rank.` : text,
      bonuses,
    };
  });
}

// --- building blocks -------------------------------------------------------------------------

const pct = (v: number) => `${Math.round(v * 100)} %`;
const L = { increasedLife: 0.02 };
const A = { increasedArmor: 0.04 };
const B = { increasedBarrier: 0.05 };
const E = { evasion: 0.015 };
const T = { tenacity: 0.025 };
const K = { blockChance: 0.015 };

const trigger = (
  id: string,
  name: string,
  condition: TriggerSpec["condition"],
  effect: TriggerSpec["effect"],
  extra: Partial<TriggerSpec> = {},
): TriggerSpec => ({ id: `mastery-${id}`, name, condition, effect, ...extra });

const skillPower = (name: string, v: number): NodeSpec => ({
  name,
  description: `Skills deal ${pct(v)} more damage.`,
  rules: { skillDamage: v },
});
const critHeat = (id: string, name: string): NodeSpec => ({
  name,
  description: "Crits give 10 Heat.",
  triggers: [trigger(id, name, { kind: "onCrit" }, { kind: "heat", amount: 10 })],
});
const fullHeat = (name: string, v: number): NodeSpec => ({
  name,
  description: `+${pct(v)} damage while you have 80 Heat or more.`,
  rules: { conditionalDamage: [{ condition: { kind: "heatAtLeast", amount: 80 }, amount: v }] },
});
const cheapSkills = (name: string): NodeSpec => ({
  name,
  description: "Skills cost 10 % less Heat.",
  rules: { skillCostMultiplier: 0.9 },
});
const execute = (name: string): NodeSpec => ({
  name,
  description: "+40 % damage to enemies below 30 % Life.",
  rules: { execute: { below: 0.3, bonus: 0.4 } },
});
const speedRush = (id: string, name: string): NodeSpec => ({
  name,
  description: "Hits give +3 % Attack Speed for 3 s, up to 5 times.",
  triggers: [
    trigger(
      id,
      name,
      { kind: "onHit" },
      { kind: "buff", stat: "attackSpeed", amount: 0.03, duration: 3, maxStacks: 5 },
    ),
  ],
});
const defaultPower = (name: string, v: number): NodeSpec => ({
  name,
  description: `Your Default Attack deals ${pct(v)} more damage.`,
  rules: { defaultAttackDamage: 1 + v },
});
const strikesTwice = (id: string, name: string, n: number): NodeSpec => ({
  name,
  description: `Every ${n}th attack strikes twice.`,
  triggers: [trigger(id, name, { kind: "everyNthAttack", n }, { kind: "extraAttack" })],
});
/** Spellweaver: Tempo for casters, so a skill counts like an attack. */
const twinCast = (name: string, n: number): NodeSpec => ({
  name,
  description: `Every ${n}th action happens twice: an attack strikes again, a skill is cast again for free.`,
  rules: { twinCast: [n] },
});
const attackSpeed = (name: string, v: number): NodeSpec => ({
  name,
  description: `+${pct(v)} Attack Speed.`,
  bonuses: { attackSpeed: v },
});
const ailmentChance = (name: string, v: number): NodeSpec => ({
  name,
  description: `+${pct(v)} chance of every ailment your hits can apply.`,
  rules: { ailmentChance: v },
});
const ailmentLonger = (name: string, v: number): NodeSpec => ({
  name,
  description: `Your ailments last ${pct(v)} longer.`,
  rules: { ailmentDuration: v },
});
const ailmentEffect = (name: string, v: number): NodeSpec => ({
  name,
  description: `+${pct(v)} Ailment Effect.`,
  bonuses: { ailmentEffect: v },
});
const critsAilment = (name: string): NodeSpec => ({
  name,
  description: "Your Crits always apply your weapon's ailment.",
  rules: { critsApplyAilment: true },
});
const dotLeech = (name: string): NodeSpec => ({
  name,
  description: "Your ailments heal you for 3 % of the damage they deal over time.",
  rules: { dotLifesteal: 0.03 },
});
const ailmentCrown = (name: string): NodeSpec => ({
  name,
  description: "Ailments deal 25 % more damage over time and last 20 % longer.",
  rules: { dotDamage: 1.25, ailmentDuration: 0.2 },
});

/** Three Keystone steps: `make(step)` with step 0, 1, 2. */
function keystones(
  names: readonly [string, string, string],
  make: (step: number) => KeystoneSpec["rules"],
  text: (step: number) => string,
): MasterySpec["keystones"] {
  return [0, 1, 2].map((step) => ({
    name: names[step] ?? "",
    description: text(step),
    rules: make(step),
  })) as unknown as MasterySpec["keystones"];
}
const tierName = (name: string): [string, string, string] => [
  name,
  `Greater ${name}`,
  `Supreme ${name}`,
];

/** A Mastery skill: a weapon strike that takes the Heirloom's type and ailment. */
function strike(
  id: string,
  name: string,
  heatCost: number,
  description: string,
  multiplier: number,
  extra: {
    count?: number;
    chance: number;
    power?: number;
    precise?: boolean;
    cashIn?: number;
    /** Cash In only the weapon's own ailment. */
    own?: boolean;
  },
): SkillDefinition {
  return {
    id,
    name,
    type: "attack",
    heatCost,
    tags: ["direct", "any"],
    description,
    hits: [
      {
        kind: "weapon",
        multiplier,
        infused: true,
        ...(extra.count ? { count: extra.count } : {}),
        ailmentChances: [{ ailment: "bleed", chance: extra.chance }],
        ...(extra.power ? { ailmentPower: extra.power } : {}),
        ...(extra.precise ? { precise: true } : {}),
      },
    ],
    ...(extra.cashIn
      ? {
          effects: [
            { kind: "cashIn", multiplier: extra.cashIn, ...(extra.own ? { own: true } : {}) },
          ],
        }
      : {}),
  };
}

/** A Mastery spell: it takes the Heirloom's element and ailment. */
function spell(
  id: string,
  name: string,
  heatCost: number,
  description: string,
  damage: { min: number; max: number },
  extra: { count?: number; chance: number; power?: number; cashIn?: number },
): SkillDefinition {
  return {
    id,
    name,
    type: "spell",
    heatCost,
    tags: ["direct", "any"],
    description,
    hits: [
      {
        kind: "spell",
        damage,
        damageType: "void",
        infused: true,
        ...(extra.count ? { count: extra.count } : {}),
        ailmentChances: [{ ailment: "corruption", chance: extra.chance }],
        ...(extra.power ? { ailmentPower: extra.power } : {}),
      },
    ],
    ...(extra.cashIn ? { effects: [{ kind: "cashIn", multiplier: extra.cashIn }] } : {}),
  };
}

/**
 * Burst Masteries cash in (Timo 2026-10-19): their skill ends every damage-over-time ailment on
 * the enemy and deals what is left of it at once, stronger. Ailment Masteries let them run.
 */
const CASH_IN = 1.5;
const CASH_IN_TEXT = `sets off all damage over time on the enemy at once: ${CASH_IN * 100} % of what is left.`;

const CINDER_TRAVEL = (names: readonly string[]) =>
  names.map((n, i) => [n, [L, A, K, T][i % 4] ?? L] as const);
const STRIDER_TRAVEL = (names: readonly string[]) =>
  names.map((n, i) => [n, [E, L, T][i % 3] ?? L] as const);
const SEER_TRAVEL = (names: readonly string[]) =>
  names.map((n, i) => [n, [B, L, T][i % 3] ?? L] as const);

// --- the nine Masteries ----------------------------------------------------------------------

const MASTERIES: readonly MasterySpec[] = [
  // Cinderguard
  {
    id: "vanquisher",
    axis: "burst",
    name: "Vanquisher",
    branch: "steel",
    anchor: "steel-brutal-force",
    theme: "Burst: big hits, skills and Heat spent.",
    angle: 160,
    skill: strike(
      "earthsplitter",
      "Earthsplitter",
      50,
      `First sets off your weapon's ailment on the enemy at once: ${CASH_IN * 100} % of what is left. Then 300 % Weapon Damage that always applies it again.`,
      3,
      { chance: 1, cashIn: CASH_IN, own: true },
    ),
    notables: [
      skillPower("Heavy Hand", 0.15),
      critHeat("overpower", "Overpower"),
      fullHeat("Momentum", 0.2),
    ],
    keystones: keystones(
      tierName("Executioner"),
      (s) => ({ skillDamage: 0.3 + s * 0.1, defaultAttackDamage: 0.8 }),
      (s) => `Your skills deal ${30 + s * 10} % more damage. Your Default Attack deals 20 % less.`,
    ),
    deeper: [
      execute("Decisive Blow"),
      cheapSkills("Spend It All"),
      {
        name: "Heavy Blows",
        description: "Your hits deal 10 % more damage.",
        rules: { hitDamage: 1.1 },
      },
      {
        name: "Vanquish",
        description: "+25 % Crit Chance while you have 80 Heat or more.",
        rules: {
          conditionalCrit: [{ condition: { kind: "heatAtLeast", amount: 80 }, amount: 0.25 }],
        },
      },
    ],
    travel: CINDER_TRAVEL([
      "Broad Stance",
      "Iron Grip",
      "Guarded Swing",
      "Hard Head",
      "War Plate",
      "Scarred Hide",
      "Shield Arm",
      "Unbowed",
      "Heavy Frame",
      "Tempered Skin",
      "Wall of Iron",
      "Last Stand",
      "Victor's Hide",
    ]),
  },
  {
    id: "berserker",
    axis: "tempo",
    name: "Berserker",
    branch: "trunk",
    anchor: "trunk-unbreakable",
    theme: "Tempo: many quick hits and the Default Attack.",
    angle: 72,
    skill: strike(
      "rampage",
      "Rampage",
      45,
      "5 quick hits for 60 % Weapon Damage. Each has a 30 % chance to apply your weapon's ailment.",
      0.6,
      { count: 5, chance: 0.3 },
    ),
    notables: [
      speedRush("bloodlust", "Bloodlust"),
      defaultPower("Relentless", 0.15),
      {
        name: "Frenzied Strikes",
        description: "+10 % Trigger Chance.",
        bonuses: { triggerChance: 0.1 },
      },
    ],
    keystones: keystones(
      tierName("Berserk"),
      (s) => ({ defaultAttackDamage: 1.3 + s * 0.1, skillCostMultiplier: 1.2 }),
      (s) => `Your Default Attack deals ${30 + s * 10} % more damage. Skills cost 20 % more Heat.`,
    ),
    deeper: [
      strikesTwice("twin-strikes", "Twin Strikes", 4),
      {
        name: "Blood Rage",
        description: "+20 % damage below 50 % Life.",
        rules: {
          conditionalDamage: [{ condition: { kind: "lifeBelow", fraction: 0.5 }, amount: 0.2 }],
        },
      },
      attackSpeed("Unstoppable", 0.15),
      strikesTwice("whirlwind-of-steel", "Whirlwind of Steel", 3),
    ],
    travel: CINDER_TRAVEL([
      "Wild Heart",
      "Thick Neck",
      "Battle Shield",
      "Grit",
      "Raging Blood",
      "Hide Armor",
      "Bash Guard",
      "Fearless",
      "Bull's Chest",
      "Iron Ribs",
      "Shield Rush",
      "Bloodied",
      "Tireless",
    ]),
  },
  {
    id: "ravager",
    axis: "ailment",
    name: "Ravager",
    branch: "blood",
    anchor: "blood-flayer",
    theme: "Ailments: more chance, strength and time for every ailment.",
    angle: 183,
    skill: strike(
      "rupture",
      "Rupture",
      50,
      "150 % Weapon Damage. Always applies your weapon's ailment, twice as strong.",
      1.5,
      { chance: 1, power: 2 },
    ),
    notables: [
      critsAilment("Bloodletter"),
      ailmentLonger("Festering Wounds", 0.2),
      ailmentChance("Savage", 0.1),
    ],
    keystones: keystones(
      tierName("Ravage"),
      (s) => ({ dotDamage: 1.2 + s * 0.1, ailmentDuration: 0.3, hitDamage: 0.9 }),
      (s) =>
        `Ailments deal ${20 + s * 10} % more damage over time and last 30 % longer. Your hits deal 10 % less.`,
    ),
    deeper: [
      ailmentEffect("Cruelty", 0.15),
      dotLeech("Open Veins"),
      ailmentChance("Spreading Rot", 0.1),
      ailmentCrown("Ravager's Feast"),
    ],
    travel: CINDER_TRAVEL([
      "Gore Hide",
      "Hack Guard",
      "Cleaver's Arm",
      "Meat Hook",
      "Thick Hide",
      "Iron Gut",
      "Butcher's Shield",
      "Carver's Frame",
      "Butcher's Apron",
      "Bone Plate",
      "Ravager's Guard",
      "Grim Resolve",
      "Bloodstained",
    ]),
  },
  // Ashstrider
  {
    id: "deadeye",
    axis: "burst",
    name: "Deadeye",
    branch: "flame",
    anchor: "flame-searing-steel",
    theme: "Burst: Crits, heavy shots and skills.",
    angle: 262,
    skill: strike(
      "deadly-aim",
      "Deadly Aim",
      45,
      `260 % Weapon Damage that never glances. 50 % chance to apply your weapon's ailment, then ${CASH_IN_TEXT}`,
      2.6,
      { chance: 0.5, precise: true, cashIn: CASH_IN },
    ),
    notables: [
      skillPower("Steady Hands", 0.15),
      execute("Killing Blow"),
      { name: "Sharpshooter", description: "+5 % Crit Chance.", bonuses: { critChance: 0.05 } },
    ],
    keystones: keystones(
      tierName("Sniper"),
      (s) => ({ critChanceMultiplier: 1.4 + s * 0.15, defaultAttackDamage: 0.85 }),
      (s) =>
        `Your Crit Chance is ${40 + s * 15} % higher. Your Default Attack deals 15 % less damage.`,
    ),
    deeper: [
      critHeat("head-shot", "Head Shot"),
      cheapSkills("Aimed Volley"),
      fullHeat("Lethal Focus", 0.2),
      { name: "Bullseye", description: "+10 % Crit Chance.", bonuses: { critChance: 0.1 } },
    ],
    travel: STRIDER_TRAVEL([
      "Steady Footing",
      "Eagle Eye",
      "Patient Hunter",
      "Quickdraw",
      "Long Watch",
      "Calm Breath",
      "Rapid Retreat",
      "Weathered Hide",
      "Hunter's Calm",
      "Sidestep",
      "Keen Senses",
      "Still Heart",
      "Ghost Walk",
    ]),
  },
  {
    id: "skirmisher",
    axis: "tempo",
    name: "Skirmisher",
    branch: "blood",
    anchor: "blood-red-tide",
    theme: "Tempo: quick hits, Evades and the Default Attack.",
    angle: 198,
    skill: strike(
      "hit-and-run",
      "Hit and Run",
      40,
      "4 quick hits for 55 % Weapon Damage. Each has a 25 % chance to apply your weapon's ailment.",
      0.55,
      { count: 4, chance: 0.25 },
    ),
    notables: [
      speedRush("quick-hands", "Quick Hands"),
      {
        name: "Light Step",
        description: "Every Evade gives 8 Heat.",
        triggers: [
          trigger("light-step", "Light Step", { kind: "onEvade" }, { kind: "heat", amount: 8 }),
        ],
      },
      defaultPower("Swift", 0.15),
    ],
    keystones: keystones(
      tierName("Skirmish"),
      (s) => ({ defaultAttackDamage: 1.3 + s * 0.1, skillCostMultiplier: 1.2 }),
      (s) => `Your Default Attack deals ${30 + s * 10} % more damage. Skills cost 20 % more Heat.`,
    ),
    deeper: [
      strikesTwice("double-shot", "Double Shot", 4),
      { name: "Evasive", description: "+8 % Evasion.", bonuses: { evasion: 0.08 } },
      attackSpeed("Momentum", 0.15),
      strikesTwice("storm-of-blades", "Storm of Blades", 3),
    ],
    travel: STRIDER_TRAVEL([
      "Light Feet",
      "Runner's Lungs",
      "Nimble",
      "Footwork",
      "Fleet",
      "Quick Recovery",
      "Dodge Roll",
      "Wiry",
      "Second Wind",
      "Feint Step",
      "Lean Frame",
      "Unshaken",
      "Windrunner",
    ]),
  },
  {
    id: "trickster",
    axis: "ailment",
    name: "Trickster",
    branch: "venom",
    anchor: "venom-venom-heart",
    theme: "Ailments: dirty tricks that make every ailment worse.",
    angle: 220,
    skill: strike(
      "dirty-trick",
      "Dirty Trick",
      40,
      "120 % Weapon Damage. Always applies your weapon's ailment, half again as strong.",
      1.2,
      { chance: 1, power: 1.5 },
    ),
    notables: [
      ailmentChance("Bag of Tricks", 0.1),
      ailmentLonger("Lingering Toxins", 0.2),
      critsAilment("Cheap Shot"),
    ],
    keystones: keystones(
      tierName("Foul Play"),
      (s) => ({ dotDamage: 1.25 + s * 0.1, ailmentDuration: 0.25, hitDamage: 0.9 }),
      (s) =>
        `Ailments deal ${25 + s * 10} % more damage over time and last 25 % longer. Your hits deal 10 % less.`,
    ),
    deeper: [
      ailmentEffect("Exploit Weakness", 0.15),
      dotLeech("Leeching Venom"),
      ailmentChance("Contagion", 0.1),
      ailmentCrown("Master Trickster"),
    ],
    travel: STRIDER_TRAVEL([
      "Toxin Skin",
      "Viper Coil",
      "Antivenom",
      "Fang Guard",
      "Smoke Step",
      "Viper Blood",
      "Corrosive Hide",
      "Fang Speed",
      "Slippery",
      "Shadow Skin",
      "Cutpurse",
      "Thick Skin",
      "Vanish",
    ]),
  },
  // Emberseer
  {
    id: "archmage",
    axis: "burst",
    name: "Archmage",
    branch: "frost",
    anchor: "frost-deep-freeze",
    theme: "Burst: heavy spells and Heat spent.",
    angle: 345,
    skill: spell(
      "arcane-blast",
      "Arcane Blast",
      55,
      `A heavy hit of your Heirloom's element. 50 % chance to apply its ailment, then ${CASH_IN_TEXT}`,
      { min: 52, max: 81 },
      { chance: 0.5, cashIn: CASH_IN },
    ),
    notables: [
      skillPower("Arcane Might", 0.15),
      critHeat("overload", "Overload"),
      fullHeat("Spellfocus", 0.2),
    ],
    keystones: keystones(
      tierName("Arcane Supremacy"),
      (s) => ({ skillDamage: 0.3 + s * 0.1, skillCostMultiplier: 1.15 }),
      (s) => `Your skills deal ${30 + s * 10} % more damage. Skills cost 15 % more Heat.`,
    ),
    deeper: [
      { name: "Glass Mind", description: "+5 % Crit Chance.", bonuses: { critChance: 0.05 } },
      cheapSkills("Efficient Casting"),
      {
        name: "Power Surge",
        description: "+20 % Crit Chance while you have 80 Heat or more.",
        rules: {
          conditionalCrit: [{ condition: { kind: "heatAtLeast", amount: 80 }, amount: 0.2 }],
        },
      },
      skillPower("Cataclysm", 0.25),
    ],
    travel: SEER_TRAVEL([
      "Static Ward",
      "Conductive Skin",
      "Insulation",
      "Surge Shield",
      "Grounding",
      "Arc Ward",
      "Charged Veil",
      "Ionized Air",
      "Storm Cloak",
      "Mana Skin",
      "Focused Mind",
      "Steady Will",
      "Archon's Ward",
    ]),
  },
  {
    id: "spellweaver",
    axis: "tempo",
    name: "Spellweaver",
    branch: "trunk",
    anchor: "trunk-shield-wall",
    theme: "Tempo: quick casts, Sparks and the Default Attack.",
    angle: 108,
    skill: spell(
      "spell-volley",
      "Spell Volley",
      40,
      "Three quick bolts of your Heirloom's element. Each has a 30 % chance to apply its ailment.",
      { min: 14, max: 20 },
      { count: 3, chance: 0.3 },
    ),
    notables: [
      speedRush("quick-casting", "Quick Casting"),
      defaultPower("Weave", 0.15),
      {
        name: "Arcane Rhythm",
        description: "Every 3rd attack gives 8 Heat.",
        triggers: [
          trigger(
            "arcane-rhythm",
            "Arcane Rhythm",
            { kind: "everyNthAttack", n: 3 },
            { kind: "heat", amount: 8 },
          ),
        ],
      },
    ],
    keystones: keystones(
      tierName("Spellstorm"),
      (s) => ({ defaultAttackDamage: 1.3 + s * 0.1, skillCostMultiplier: 1.2 }),
      (s) => `Your Default Attack deals ${30 + s * 10} % more damage. Skills cost 20 % more Heat.`,
    ),
    deeper: [
      twinCast("Twin Sparks", 4),
      { name: "Barrier Weave", description: "+10 % Barrier.", bonuses: { increasedBarrier: 0.1 } },
      attackSpeed("Haste", 0.15),
      twinCast("Endless Weave", 3),
    ],
    travel: SEER_TRAVEL([
      "Rime Skin",
      "Cold Focus",
      "Permafrost",
      "Glacial Ward",
      "Frozen Heart",
      "Frozen Blood",
      "Hoarfrost",
      "Rimecraft",
      "Calm Mind",
      "Woven Ward",
      "Thread of Life",
      "Steady Hand",
      "Weaver's Veil",
    ]),
  },
  {
    id: "warlock",
    axis: "ailment",
    name: "Warlock",
    branch: "void",
    anchor: "void-hollow-crown",
    theme: "Ailments: hexes that grow stronger the longer the fight lasts.",
    angle: 18,
    skill: spell(
      "malediction",
      "Malediction",
      50,
      "A hit of your Heirloom's element that always applies its ailment, two and a half times as strong.",
      { min: 23, max: 34 },
      { chance: 1, power: 2.5 },
    ),
    notables: [
      {
        name: "Lingering",
        description: "Your ailments deal 2 % more per second of the fight, up to 30 %.",
        rules: { lingering: { perSecond: 0.02, max: 0.3 } },
      },
      ailmentChance("Malice", 0.1),
      ailmentLonger("Long Curse", 0.2),
    ],
    keystones: keystones(
      tierName("Dark Pact"),
      (s) => ({ dotDamage: 1.25 + s * 0.1, ailmentDuration: 0.25, hitDamage: 0.9 }),
      (s) =>
        `Ailments deal ${25 + s * 10} % more damage over time and last 25 % longer. Your hits deal 10 % less.`,
    ),
    deeper: [
      dotLeech("Soul Drain"),
      ailmentEffect("Withering", 0.15),
      ailmentChance("Spreading Hex", 0.1),
      ailmentCrown("Doom"),
    ],
    travel: SEER_TRAVEL([
      "Gloom",
      "Abyssal Ward",
      "Long Night",
      "Hollow Shell",
      "Endless",
      "Umbral Skin",
      "Void Ward",
      "Abyssal Heart",
      "Night Eternal",
      "Dark Veil",
      "Soul Shell",
      "Black Blood",
      "Pact Ward",
    ]),
  },
];

export const MASTERY_IDS = MASTERIES.map((m) => m.id);

export const PRESTIGE_BRANCHES: readonly PrestigeBranchDefinition[] = MASTERIES.map(
  ({ id, name, branch, anchor, theme, axis }) => ({
    id,
    name,
    branch,
    anchor,
    theme,
    ...(axis ? { axis } : {}),
  }),
);

export const PRESTIGE_BRANCH_NODES: readonly SkillNode[] = MASTERIES.flatMap(buildMastery);

/** Where each Mastery hangs on the web, for setting it onto the Ash Tree (`tree-shape.ts`). */
export const MASTERY_PLACEMENT = Object.fromEntries(
  MASTERIES.map((m) => [m.id, { anchor: m.anchor, angle: m.angle, start: START_RADIUS }]),
);
