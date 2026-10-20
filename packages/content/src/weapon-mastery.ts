import type {
  EchoDefinition,
  Infusion,
  MasteryEffect,
  MasteryNode,
  MasteryPath,
  SkillDefinition,
  StatBonuses,
  TriggerSpec,
  WeaponMasteryTree,
} from "@emberheir/sim";
import {
  BARBED_ARROW,
  HEAVY_BOLT,
  LACERATE,
  POWER_STRIKE,
  SHOCKBOLT,
  SKULL_CRACK,
  VENOM_COAT,
  VOID_BOLT,
} from "./skills";

/**
 * Weapon Mastery trees (docs/design/weapon-mastery-v2.md): the same ground plan for all eight
 * weapons (Refine, Heat Form, Innate Form, three paths, a ring of four Keystones) with their own
 * numbers, paths and names. A path is Technique I (3 ranks) → Fork 1 (one of two Notables) →
 * Technique II (3 ranks) → Fork 2 (one of two) → Path Master. Techniques only give values that
 * exist nowhere but on the weapon (Precision, Damage Range, Parry, Sunder, ailment effect of the
 * weapon, extra attacks, the Innate). All numbers are starting values.
 *
 * Positions are for the "anatomy" view at Kaelen: the weapon lies diagonally from its pommel at
 * the bottom left to its tip at the top right; Refine nodes sit on its parts, the paths grow
 * outward like engraved filigree, the Heat Forms burn in the forge below, the Keystone sockets
 * ring the pommel.
 */

// --- layout ----------------------------------------------------------------------------------

/** Pommel and tip of the weapon in layout units. */
const POMMEL = { x: -4.8, y: 2.5 };
const TIP = { x: 4.8, y: -2.5 };
const AXIS = { x: TIP.x - POMMEL.x, y: TIP.y - POMMEL.y };
const LENGTH = Math.hypot(AXIS.x, AXIS.y);
/** Unit normal of the weapon, pointing down-right (away from the upper paths). */
const NORMAL = { x: -AXIS.y / LENGTH, y: AXIS.x / LENGTH };

/** Where the weapon lies in the Weapon Mastery view (the UI draws it between these points). */
export const MASTERY_LAYOUT = { pommel: POMMEL, tip: TIP } as const;

const round = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** A point on the weapon at `t` (0 = pommel, 1 = tip), `off` units off its axis. */
function along(t: number, off = 0): { x: number; y: number } {
  return {
    x: round(POMMEL.x + AXIS.x * t + NORMAL.x * off),
    y: round(POMMEL.y + AXIS.y * t + NORMAL.y * off),
  };
}

/** Path starts and their outward direction (unit vectors bend a little along the way). */
const PATH_LAYOUT = [
  { start: along(0.3, -1.25), dir: { x: -0.7, y: -0.71 }, bend: -1 },
  { start: along(0.55, 1.35), dir: { x: 0.93, y: 0.36 }, bend: 1 },
  { start: along(0.8, -1.25), dir: { x: 0.5, y: -0.87 }, bend: 1 },
] as const;

/**
 * A path node: `row` 0..4 outward (Technique I, Fork 1, Technique II, Fork 2, Master), `fork`
 * −1/+1 for the two sides of a fork.
 */
function pathPosition(path: number, row: number, fork = 0): { x: number; y: number } {
  const { start, dir, bend } = PATH_LAYOUT[path] ?? PATH_LAYOUT[0];
  const step = 1.3;
  const k = row * step;
  // A gentle S-curve sideways to the direction, like a vine of engraving; forks split off it.
  const side = Math.sin(row * 0.75) * 0.35 * bend + fork * 0.62;
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
  /** Damage type and ailment the path gives the weapon (klassengeruest-v1.md 4). */
  readonly infusion: Infusion;
  /** Technique I and II: 3 ranks each, the effect is per rank. */
  readonly techniques: readonly [NodeSpec, NodeSpec];
  /** Fork 1 and Fork 2: one of the two Notables can be learned. */
  readonly forks: readonly [readonly [NodeSpec, NodeSpec], readonly [NodeSpec, NodeSpec]];
  /** Binds the path to another system (Gear, Battle Plan, Ailments, Attributes). */
  readonly master: NodeSpec;
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
  /** Average of the weapon's old Damage Range (v1), as a share of Weapon Damage. */
  readonly oldAverage: number;
  readonly paths: readonly [PathSpec, PathSpec, PathSpec];
  readonly innateForms: readonly [InnateFormSpec, InnateFormSpec, InnateFormSpec];
  readonly keystones: readonly [KeystoneSpec, KeystoneSpec, KeystoneSpec, KeystoneSpec];
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
    description: "Damage Range minimum +15 %.",
    kind: "refine",
    maxRanks: 3,
    effect: { rangeMin: 0.15 },
    t: 0.48,
  },
  {
    id: "full-swing",
    name: "Full Swing",
    description: "Damage Range maximum +25 %.",
    kind: "refine",
    maxRanks: 3,
    effect: { rangeMax: 0.25 },
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

function buildTree(spec: TreeSpec): WeaponMasteryTree {
  const nodes: MasteryNode[] = [];
  for (const { t, ...node } of REFINE) nodes.push({ ...node, ...along(t) });
  for (const { i, ...node } of HEAT_FORMS) nodes.push({ ...node, x: -1.8 + i * 1.2, y: 3.7 });
  spec.innateForms.forEach((form, i) => {
    nodes.push({
      id: form.id,
      name: form.name,
      description: form.description,
      kind: "innateForm",
      group: "innateForm",
      effect: { ...form.effect, innate: form.skill },
      // Three rune seals above the blade, between the roots of the first and third path.
      ...along(0.47 + i * 0.1, -1.75),
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
  spec.paths.forEach((path, p) => {
    const slug = (n: NodeSpec) => `${path.id}-${n.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    // The first Technique is open from the start; every later step needs one before it.
    let previous: string[] = [];
    for (let step = 0; step < 2; step++) {
      const technique = path.techniques[step];
      const forks = path.forks[step];
      if (!technique || !forks) continue;
      const tid = `${path.id}-t${step + 1}`;
      nodes.push({
        id: tid,
        name: technique.name,
        description: technique.description,
        kind: "technique",
        path: path.id,
        maxRanks: 3,
        ...(previous.length ? { links: previous } : {}),
        effect: technique.effect,
        ...pathPosition(p, step * 2),
      });
      previous = forks.map((n, side) => {
        nodes.push({
          id: slug(n),
          name: n.name,
          description: n.description,
          kind: "notable",
          path: path.id,
          fork: `${path.id}-${step + 1}`,
          links: [tid],
          effect: n.effect,
          ...pathPosition(p, step * 2 + 1, side === 0 ? -1 : 1),
        });
        return slug(n);
      });
    }
    nodes.push({
      id: `${path.id}-master`,
      name: path.master.name,
      description: path.master.description,
      kind: "master",
      path: path.id,
      links: previous,
      effect: path.master.effect,
      ...pathPosition(p, 4),
    });
  });
  const paths: MasteryPath[] = spec.paths.map(({ id, name, theme, color, infusion }) => ({
    id,
    name,
    theme,
    color,
    infusion,
  }));
  return {
    weaponId: spec.weaponId,
    precision: spec.precision,
    rangeMin: spec.rangeMin,
    rangeMax: spec.rangeMax,
    // v2 ranges are wider; the old average hit stays (the range sets the style, not the strength).
    damageScale: round4(spec.oldAverage / ((spec.rangeMin + spec.rangeMax) / 2)),
    paths,
    nodes,
  };
}

// --- small helpers for the specs ------------------------------------------------------------

const node = (name: string, description: string, effect: MasteryEffect): NodeSpec => ({
  name,
  description,
  effect,
});
/** A Technique: `description` and `effect` are per rank. */
const technique = node;
const notable = node;
const master = node;

/** A trigger of a Mastery node. */
const trigger = (
  id: string,
  name: string,
  condition: TriggerSpec["condition"],
  effect: TriggerSpec["effect"],
  extra: Partial<TriggerSpec> = {},
): TriggerSpec => ({ id: `mastery-${id}`, name, condition, effect, ...extra });

/** A variant of the weapon's Innate skill. */
const form = (
  id: string,
  name: string,
  description: string,
  skill: SkillDefinition,
): InnateFormSpec => ({ id, name, description, effect: {}, skill: { ...skill, description } });

// --- ailment nodes of the Heirloom paths (klassengeruest-v1.md 4) -------------------------------

type PathAilment = "bleed" | "poison" | "burn" | "chill" | "shock" | "corruption";
const AILMENT_WORD: Record<PathAilment, string> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
};
const AILING: Record<PathAilment, string> = {
  bleed: "Bleeding",
  poison: "Poisoned",
  burn: "Burning",
  chill: "Chilled",
  shock: "Shocked",
  corruption: "Corrupted",
};
const byAilment = (a: PathAilment, v: number) =>
  ({ [a]: v }) as Partial<Record<PathAilment, number>>;

/** A Technique: +x % effect of the path's ailment per rank. */
const ailmentPower = (name: string, a: PathAilment, v: number) =>
  technique(name, `+${pct(v)} effect of your ${AILMENT_WORD[a]}.`, {
    weaponRules: { ailmentEffectBy: byAilment(a, v) },
  });
const ailmentChance = (name: string, a: PathAilment, v: number) =>
  node(name, `+${pct(v)} ${AILMENT_WORD[a]} Chance.`, {
    bonuses: { [`${a}Chance`]: v } as StatBonuses,
  });
const ailmentLasts = (name: string, a: PathAilment, v: number) =>
  node(name, `${AILMENT_WORD[a]} lasts ${pct(v)} longer.`, {
    weaponRules: { ailmentDurationBy: byAilment(a, v) },
  });
/** More damage of a damage-over-time ailment. */
const ailmentDamage = (name: string, a: PathAilment, v: number) =>
  node(name, `${AILMENT_WORD[a]} deals ${pct(v)} more damage.`, {
    rules: { ailmentDamage: byAilment(a, 1 + v) },
  });
const versusAilment = (name: string, a: PathAilment, v: number) =>
  node(name, `+${pct(v)} damage to ${AILING[a]} enemies.`, {
    weaponRules: {
      conditionalDamage: [{ condition: { kind: "enemyHas", ailment: a }, amount: v }],
    },
  });
const conduction = (name: string) =>
  node(name, "Every new Shock stack gives 4 Heat.", { weaponRules: { heatPerShockStack: 4 } });

/** Path colours of the engraving: physical gold, blood red, ember, frost, storm, venom, void, starfall. */
const C = {
  gold: 0xe0b45a,
  blood: 0xc8423a,
  ember: 0xf08a3c,
  frost: 0x8ec8f0,
  storm: 0xd8d27a,
  venom: 0x8cc04a,
  void: 0xa070e0,
  steel: 0xb8c0cc,
  starfall: 0xd2b8ff,
} as const;

// --- the eight trees ------------------------------------------------------------------------

const SWORD = buildTree({
  weaponId: "sword",
  precision: 0.75,
  rangeMin: 0.4,
  rangeMax: 1.4,
  oldAverage: 0.75,
  paths: [
    {
      id: "edge",
      name: "Edge",
      theme: "Physical · Bleed",
      color: C.blood,
      infusion: { damageType: "physical", ailment: "bleed", chance: 0.15 },
      techniques: [
        technique("True Line", "+3 % Precision.", { precision: 0.03 }),
        technique("Bleeding Steel", "+16 % effect of the Sword's Bleed.", {
          weaponRules: { ailmentEffectBy: { bleed: 0.16 } },
        }),
      ],
      forks: [
        [
          notable("Keen Edge", "Your Crits make the enemy Bleed.", {
            rules: { critsApplyBleed: true },
          }),
          notable("Clean Line", "After 5 clean hits in a row, your next hit deals +100 %.", {
            weaponRules: { cleanLine: { hits: 5, bonus: 1 } },
          }),
        ],
        [
          notable("Hamstring", "A Bleeding enemy attacks 10 % slower.", {
            weaponRules: {
              enemyAttackSpeed: [
                { condition: { kind: "enemyHas", ailment: "bleed" }, amount: -0.1 },
              ],
            },
          }),
          notable("Deep Wound", "Bleed from your Crits is 50 % stronger.", {
            weaponRules: { critBleedPower: 1.5 },
          }),
        ],
      ],
      master: master(
        "Master of the Edge",
        "No more Glancing Blows. Precision above 85 % becomes Crit Chance.",
        { precisionToCrit: { above: 0.85 } },
      ),
    },
    {
      id: "thunder",
      name: "Thunder",
      theme: "Lightning · Shock",
      color: C.storm,
      infusion: { damageType: "lightning", ailment: "shock", chance: 0.2 },
      techniques: [
        ailmentPower("Static Edge", "shock", 0.1),
        technique("Honed Strike", "Your Innate deals +10 % damage.", {
          innatePatch: { damage: 0.1 },
        }),
      ],
      forks: [
        [
          notable("Rhythm", "Every 3rd Slash gives 10 Heat.", {
            triggers: [
              trigger(
                "rhythm",
                "Rhythm",
                { kind: "everyNthAttack", n: 3 },
                { kind: "heat", amount: 10 },
              ),
            ],
          }),
          notable(
            "Unbroken Flow",
            "+3 % Attack Speed for every clean hit in a row (up to 5). A Glancing Blow ends it.",
            { weaponRules: { streak: { stat: "attackSpeed", amount: 0.03, max: 5 } } },
          ),
        ],
        [
          notable(
            "Building Edge",
            "Your Innate costs 5 Heat less for every clean hit since your last skill.",
            { weaponRules: { innateDiscountPerHit: 5 } },
          ),
          conduction("Conduction"),
        ],
      ],
      master: master(
        "Master of Thunder",
        "Hits against an enemy with 3 Shock stacks arc for 15 % of their damage.",
        { weaponRules: { arcChain: { share: 0.15, stacks: 3 } } },
      ),
    },
    {
      id: "winter",
      name: "Winter",
      theme: "Cold · Chill, Counters",
      color: C.frost,
      infusion: { damageType: "cold", ailment: "chill", chance: 0.25 },
      techniques: [
        technique("Parry", "+4 % Parry.", { weaponRules: { parry: 0.04 } }),
        ailmentPower("Frostbite", "chill", 0.1),
      ],
      forks: [
        [
          notable("Counterweight", "Ripostes always land cleanly and add a Sunder stack.", {
            weaponRules: { extraAttacksPrecise: true, extraAttackSunder: true },
          }),
          notable(
            "Read the Blow",
            "After you block, evade or parry, your next hit is a clean Crit.",
            { weaponRules: { critAfter: ["evade", "block", "parry"] } },
          ),
        ],
        [
          notable("Perfect Timing", "Every Parry answers with a Riposte (once per second).", {
            triggers: [
              trigger(
                "perfect-timing",
                "Riposte",
                { kind: "onParry" },
                { kind: "extraAttack" },
                { cooldown: 1 },
              ),
            ],
          }),
          versusAilment("Shatterpoint", "chill", 0.25),
        ],
      ],
      master: master("Master of the Counter", "Ripostes can fire your trigger affixes.", {
        weaponRules: { extraAttacksTrigger: true },
      }),
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
      description: "Bleed from your Crits is 60 % stronger. Damage Range minimum −20 %.",
      effect: { weaponRules: { critBleedPower: 1.6 }, rangeMin: -0.2 },
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
      description: "+80 % damage to enemies below 30 % Life, −10 % above.",
      effect: { rules: { execute: { below: 0.3, bonus: 0.8, above: 0.1 } } },
    },
  ],
});

const MACE = buildTree({
  weaponId: "mace",
  precision: 0.65,
  rangeMin: 0.5,
  rangeMax: 1.6,
  oldAverage: 0.85,
  paths: [
    {
      id: "quake",
      name: "Quake",
      theme: "Physical · Stun",
      color: C.steel,
      infusion: { damageType: "physical", ailment: "stun", chance: 0 },
      techniques: [
        technique("Jolt", "Your stuns last 10 % longer.", { weaponRules: { stunDuration: 1.1 } }),
        technique("Heft", "Damage Range maximum +10 %.", { rangeMax: 0.1 }),
      ],
      forks: [
        [
          notable("Heavy Head", "Every 3rd Smash staggers instead of every 4th.", {
            weaponTriggers: [{ id: "stagger", n: 3 }],
          }),
          notable("Aftershock", "Stunned enemies take 20 % more damage from you.", {
            weaponRules: {
              conditionalDamage: [{ condition: { kind: "enemyStunned" }, amount: 0.2 }],
            },
          }),
        ],
        [
          notable("Earthbreaker", "Mighty Hits stun for 0.3 s.", {
            weaponRules: { mightyStun: 0.3 },
          }),
          notable(
            "Interrupt",
            "A stun during the enemy's wind-up breaks its Heavy Attack (once per 10 s).",
            { weaponRules: { interrupt: { cooldown: 10 } } },
          ),
        ],
      ],
      master: master(
        "Master of Quake",
        "Hits on a stunned enemy add a Sunder stack. Your Reaction Slots cost no Heat while it is stunned.",
        { weaponRules: { freeReactionsVsStunned: true, stunnedSunder: 1 } },
      ),
    },
    {
      id: "forge",
      name: "Forge",
      theme: "Fire · Burn, Sunder",
      color: C.ember,
      infusion: { damageType: "fire", ailment: "burn", chance: 0.2 },
      techniques: [
        technique("Dent", "+8 % chance per clean hit to Sunder.", {
          weaponRules: { sunder: { chance: 0.08 } },
        }),
        ailmentPower("Searing Head", "burn", 0.12),
      ],
      forks: [
        [
          notable("Armor Breaker", "+3 maximum Sunder stacks.", {
            weaponRules: { sunder: { maxStacks: 3 } },
          }),
          notable(
            "Rupture Plate",
            "At full Sunder your next Mighty Hit sets off every stack for 25 % Weapon Damage each.",
            { weaponRules: { rupture: { perStack: 0.25 } } },
          ),
        ],
        [
          notable("Shatter", "+25 % damage to enemies at full Sunder.", {
            weaponRules: {
              conditionalDamage: [{ condition: { kind: "enemySundered" }, amount: 0.25 }],
            },
          }),
          ailmentDamage("Cinders", "burn", 0.3),
        ],
      ],
      master: master("Master of Crush", "Sunder also strips the enemy's Evasion and Block.", {
        weaponRules: { sunderDefense: true },
      }),
    },
    {
      id: "stormwall",
      name: "Stormwall",
      theme: "Lightning · Shock, Block",
      color: C.storm,
      infusion: { damageType: "lightning", ailment: "shock", chance: 0.2 },
      techniques: [
        technique("Guard", "+2 % Block Chance.", { bonuses: { blockChance: 0.02 } }),
        ailmentPower("Charged Head", "shock", 0.1),
      ],
      forks: [
        [
          notable("Iron Rhythm", "Every Block gives 10 Heat.", {
            triggers: [
              trigger(
                "iron-rhythm",
                "Iron Rhythm",
                { kind: "onBlock" },
                { kind: "heat", amount: 10 },
              ),
            ],
          }),
          notable("Shield Slam", "Every Block answers with a slam for 60 % Weapon Damage.", {
            triggers: [
              trigger(
                "shield-slam",
                "Shield Slam",
                { kind: "onBlock" },
                { kind: "weaponHit", multiplier: 0.6 },
              ),
            ],
          }),
        ],
        [
          ailmentChance("Static Field", "shock", 0.2),
          notable("Braced", "After a Block you take 30 % less damage for 2 s.", {
            weaponRules: { braced: { seconds: 2, reduction: 0.3 } },
          }),
        ],
      ],
      master: master(
        "Master of the Wall",
        "Damage your blocks stop gathers up; your next Innate hits with half of it on top.",
        { weaponRules: { store: { blocked: 0.5 } } },
      ),
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
      description: "Double Block Chance. Skills cost 20 % more Heat.",
      effect: { weaponRules: { blockMultiplier: 2 }, rules: { skillCostMultiplier: 1.2 } },
    },
  ],
});

const AXE = buildTree({
  weaponId: "axe",
  precision: 0.7,
  rangeMin: 0.2,
  rangeMax: 1.8,
  oldAverage: 0.8,
  paths: [
    {
      id: "butcher",
      name: "Butcher",
      theme: "Physical · Bleed",
      color: C.blood,
      infusion: { damageType: "physical", ailment: "bleed", chance: 0.25 },
      techniques: [
        technique("Gash", "+20 % effect of the Axe's Bleed.", {
          weaponRules: { ailmentEffectBy: { bleed: 0.2 } },
        }),
        technique("Barb", "+4 % Bleed Chance.", { bonuses: { bleedChance: 0.04 } }),
      ],
      forks: [
        [
          notable("Open Wounds", "Bleed deals 40 % more damage.", {
            rules: { ailmentDamage: { bleed: 1.4 } },
          }),
          notable("Blood Scent", "+15 % Attack Speed against Bleeding enemies.", {
            weaponRules: {
              conditionalAttackSpeed: [
                { condition: { kind: "enemyHas", ailment: "bleed" }, amount: 0.15 },
              ],
            },
          }),
        ],
        [
          notable("Bloodrush", "Every Bleed tick gives 2 Heat.", {
            weaponRules: { heatPerDotTick: { ailment: "bleed", amount: 2 } },
          }),
          notable("Ragged Cut", "Mighty Hits always Bleed, 50 % stronger.", {
            weaponRules: { mightyBleed: 1.5 },
          }),
        ],
      ],
      master: master(
        "Master Butcher",
        "Rend and Hemorrhage set off only half the Bleed; the rest keeps bleeding.",
        { weaponRules: { consumeBleedShare: 0.5 } },
      ),
    },
    {
      id: "blaze",
      name: "Blaze",
      theme: "Fire · Burn, Low Life",
      color: C.ember,
      infusion: { damageType: "fire", ailment: "burn", chance: 0.2 },
      techniques: [
        technique("Leech", "+1 % Lifesteal.", { bonuses: { lifesteal: 0.01 } }),
        ailmentPower("Kindling", "burn", 0.12),
      ],
      forks: [
        [
          notable("Berserk", "+20 % Attack Speed below 50 % Life.", {
            weaponRules: {
              conditionalAttackSpeed: [
                { condition: { kind: "lifeBelow", fraction: 0.5 }, amount: 0.2 },
              ],
            },
          }),
          notable("Thirst", "Lifesteal is doubled below 30 % Life.", {
            weaponRules: { lowLifeLifesteal: { below: 0.3, multiplier: 2 } },
          }),
        ],
        [
          notable("Deathwish", "+30 % damage below 30 % Life.", {
            weaponRules: {
              conditionalDamage: [{ condition: { kind: "lifeBelow", fraction: 0.3 }, amount: 0.3 }],
            },
          }),
          notable("Second Skin", "Once per fight, dropping below 30 % Life heals 20 %.", {
            triggers: [
              trigger(
                "second-skin",
                "Second Skin",
                { kind: "lifeBelow", threshold: 0.3 },
                { kind: "heal", fraction: 0.2 },
                { oncePerFight: true },
              ),
            ],
          }),
        ],
      ],
      master: master("Master of Blaze", "Your Burn ticks heal you for 3 % of their damage.", {
        weaponRules: { ailmentLeech: { burn: 0.03 } },
      }),
    },
    {
      id: "glacier",
      name: "Glacier",
      theme: "Cold · Chill, Mighty Hits",
      color: C.frost,
      infusion: { damageType: "cold", ailment: "chill", chance: 0.25 },
      techniques: [
        technique("Wide Arc", "Damage Range maximum +10 %.", { rangeMax: 0.1 }),
        ailmentPower("Frost Edge", "chill", 0.1),
      ],
      forks: [
        [
          notable("Overhead Chop", "Mighty Hits deal +30 % damage.", {
            weaponRules: { mightyDamage: 0.3 },
          }),
          notable("Headsplitter", "Mighty Hits always crit.", {
            weaponRules: { mightyCrit: true },
          }),
        ],
        [
          notable("Executioner's Swing", "Mighty Hits deal +50 % to enemies below 30 % Life.", {
            weaponRules: { mightyExecute: { below: 0.3, bonus: 0.5 } },
          }),
          versusAilment("Shatter", "chill", 0.25),
        ],
      ],
      master: master("Master of Cleave", "Mighty Hits roll your on-hit triggers twice.", {
        weaponRules: { mightyTriggersTwice: true },
      }),
    },
  ],
  innateForms: [
    form(
      "gutting-lacerate",
      "Gutting Lacerate",
      "150 % Weapon Damage. Always Bleeds, 60 % stronger.",
      {
        ...LACERATE,
        id: "gutting-lacerate",
        name: "Gutting Lacerate",
        hits: [
          {
            kind: "weapon",
            multiplier: 1.5,
            ailmentPower: 1.6,
            ailmentChances: [{ ailment: "bleed", chance: 1 }],
          },
        ],
      },
    ),
    form(
      "rending-lacerate",
      "Rending Lacerate",
      "Two cuts of 75 % Weapon Damage. Each always Bleeds.",
      {
        ...LACERATE,
        id: "rending-lacerate",
        name: "Rending Lacerate",
        hits: [
          {
            kind: "weapon",
            multiplier: 0.75,
            count: 2,
            ailmentChances: [{ ailment: "bleed", chance: 1 }],
          },
        ],
      },
    ),
    form(
      "hemorrhage",
      "Hemorrhage",
      "150 % Weapon Damage. Always Bleeds, then the Bleed bursts at once.",
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
        "Every Bleed tick adds 2 % damage, Bleed included, until the fight ends. Start each fight at −10 %.",
      effect: { weaponRules: { rampage: { ailment: "bleed", perTick: 0.02 }, damageDealt: 0.9 } },
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
      description: "Mighty Hits deal double damage. Your Damage Range minimum drops to 10 %.",
      effect: { weaponRules: { mightyDamage: 1 }, rangeMinSet: 0.1 },
    },
  ],
});

const DAGGER = buildTree({
  weaponId: "dagger",
  precision: 0.8,
  rangeMin: 0.6,
  rangeMax: 1.1,
  oldAverage: 0.75,
  paths: [
    {
      id: "venom",
      name: "Venom",
      theme: "Physical · Poison",
      color: C.venom,
      infusion: { damageType: "physical", ailment: "poison", chance: 0.2 },
      techniques: [
        technique("Sting", "+12 % effect of the Dagger's Poison.", {
          weaponRules: { ailmentEffectBy: { poison: 0.12 } },
        }),
        technique("Dose", "+4 % Poison Chance.", { bonuses: { poisonChance: 0.04 } }),
      ],
      forks: [
        [
          notable("Virulence", "+3 maximum Poison stacks.", {
            weaponRules: { poisonMaxStacks: 3 },
          }),
          notable("Seeping", "Poison lasts 30 % longer.", {
            weaponRules: { ailmentDurationBy: { poison: 0.3 } },
          }),
        ],
        [
          notable(
            "Corrosive",
            "Every Poison stack lets your hits ignore 1 % of the enemy's Armor.",
            {
              weaponRules: { poisonArmorShred: 0.01 },
            },
          ),
          notable("Numbing", "An enemy with 10 or more Poison stacks attacks 10 % slower.", {
            weaponRules: {
              enemyAttackSpeed: [
                {
                  condition: { kind: "enemyStacks", ailment: "poison", count: 10 },
                  amount: -0.1,
                },
              ],
            },
          }),
        ],
      ],
      master: master(
        "Master of Venom",
        "At full Poison stacks all of them burst for their rest at once. Then no Poison for 1 s.",
        { weaponRules: { poisonBurst: { stacks: 0, multiplier: 1, lockout: 1 } } },
      ),
    },
    {
      id: "cutthroat",
      name: "Cutthroat",
      theme: "Physical · Bleed, Crits",
      color: C.blood,
      infusion: { damageType: "physical", ailment: "bleed", chance: 0.2 },
      techniques: [
        technique("Aim", "+3 % Precision.", { precision: 0.03 }),
        ailmentPower("Serrated", "bleed", 0.15),
      ],
      forks: [
        [
          notable("Find the Gap", "The first hit after a skill has +25 % Crit Chance.", {
            weaponRules: { critAfterSkill: 0.25 },
          }),
          notable("Twist the Blade", "Your Crits make the enemy Bleed.", {
            rules: { critsApplyBleed: true },
          }),
        ],
        [
          notable("Shadowstep", "After an Evade your next Stab is a clean Crit.", {
            weaponRules: { critAfter: ["evade"] },
          }),
          notable("Ambush", "Every hit in the first 3 s of a fight is a clean Crit.", {
            weaponRules: { ambush: 3 },
          }),
        ],
      ],
      master: master("Master Assassin", "Every Crit gives 5 Heat.", {
        triggers: [
          trigger(
            "master-assassin",
            "Master Assassin",
            { kind: "onCrit" },
            { kind: "heat", amount: 5 },
          ),
        ],
      }),
    },
    {
      id: "static",
      name: "Static",
      theme: "Lightning · Shock, Speed",
      color: C.storm,
      infusion: { damageType: "lightning", ailment: "shock", chance: 0.15 },
      techniques: [
        technique("Double Stab", "+5 % chance to stab a second time at once.", {
          triggers: [
            trigger(
              "double-stab",
              "Double Stab",
              { kind: "onHit" },
              { kind: "extraAttack" },
              { chance: 0.05 },
            ),
          ],
        }),
        ailmentPower("Static Charge", "shock", 0.1),
      ],
      forks: [
        [
          notable("Quick Hands", "+12 % Attack Speed.", { bonuses: { attackSpeed: 0.12 } }),
          notable("Nimble Feet", "+8 % Evasion.", { bonuses: { evasion: 0.08 } }),
        ],
        [
          notable("Thousand Needles", "Extra stabs always Shock.", {
            weaponRules: { extraAttackAilments: ["shock"] },
          }),
          notable("Whirl", "5 Stabs within 3 s make your next Innate free.", {
            weaponRules: { whirl: { stabs: 5, seconds: 3 } },
          }),
        ],
      ],
      master: master("Master of Flurry", "Extra stabs can fire your trigger affixes.", {
        weaponRules: { extraAttacksTrigger: true },
      }),
    },
  ],
  innateForms: [
    form(
      "virulent-coat",
      "Virulent Coat",
      "A coat instead of a cut: for 6 s, every hit Poisons. 30 Heat.",
      {
        ...VENOM_COAT,
        id: "virulent-coat",
        name: "Virulent Coat",
        heatCost: VENOM_COAT.heatCost - 10,
        effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 6 }],
      },
    ),
    form(
      "paralytic-coat",
      "Paralytic Coat",
      "A coat instead of a cut: for 8 s, every hit Poisons and often Chills. 40 Heat.",
      {
        ...VENOM_COAT,
        id: "paralytic-coat",
        name: "Paralytic Coat",
        effects: [
          { kind: "buff", stat: "poisonChance", amount: 1, duration: 8 },
          { kind: "buff", stat: "chillChance", amount: 0.5, duration: 8 },
        ],
      },
    ),
    form(
      "lingering-coat",
      "Lingering Coat",
      "A coat instead of a cut: for 12 s, every hit Poisons. 45 Heat.",
      {
        ...VENOM_COAT,
        id: "lingering-coat",
        name: "Lingering Coat",
        heatCost: VENOM_COAT.heatCost + 5,
        effects: [{ kind: "buff", stat: "poisonChance", amount: 1, duration: 12 }],
      },
    ),
  ],
  keystones: [
    {
      id: "thousand-cuts",
      name: "Thousand Cuts",
      form: "Needle",
      description: "Every clean hit adds a Poison stack, but Poison Chance no longer counts.",
      effect: { weaponRules: { thousandCuts: true } },
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
        "At 10 Poison stacks all of them burst for 200 % of their rest and heal you for 15 % of it. Then no Poison for 1 s.",
      effect: {
        weaponRules: { poisonBurst: { stacks: 10, multiplier: 2, lockout: 1, leech: 0.15 } },
      },
    },
    {
      // The id stays (saves); the name went to the Assassin's Notable.
      id: "shadowstep",
      name: "Vanishing Act",
      form: "Shadow Kris",
      description: "After an Evade your next three Stabs are clean Crits. −10 % Precision.",
      effect: { weaponRules: { critsAfterEvade: 3 }, precision: -0.1 },
    },
  ],
});

/** Split Shot: a second arrow for 60 % Weapon Damage; ranks and the Notable add up its chance. */
const SPLIT_SHOT = (chance: number) =>
  trigger(
    "split-shot",
    "Split Shot",
    { kind: "onHit" },
    { kind: "weaponHit", multiplier: 0.6, extra: true },
    { chance },
  );

const BOW = buildTree({
  weaponId: "bow",
  precision: 0.75,
  rangeMin: 0.4,
  rangeMax: 1.3,
  oldAverage: 0.75,
  paths: [
    {
      id: "toxin",
      name: "Toxin",
      theme: "Physical · Poison",
      color: C.venom,
      infusion: { damageType: "physical", ailment: "poison", chance: 0.2 },
      techniques: [
        technique("Dip", "+4 % Poison Chance.", { bonuses: { poisonChance: 0.04 } }),
        technique("Reservoir", "+1 maximum Poison stack.", { weaponRules: { poisonMaxStacks: 1 } }),
      ],
      forks: [
        [
          notable("Dipped Arrows", "+15 % Poison Chance.", { bonuses: { poisonChance: 0.15 } }),
          notable(
            "Festering",
            "Every Poison stack lets your hits ignore 2 % of the enemy's Armor. Your ailments heal you for 3 % of their damage.",
            { weaponRules: { poisonArmorShred: 0.02 }, rules: { dotLifesteal: 0.03 } },
          ),
        ],
        [
          notable("Toxic Cascade", "Every 10th Shoot sets off half the Poison stacks at once.", {
            weaponRules: { cascade: { every: 10, share: 0.5 } },
          }),
          notable("Lingering Cloud", "Poison ticks Chill the enemy with 10 % chance.", {
            weaponRules: { tickAilment: [{ from: "poison", to: "chill", chance: 0.1 }] },
          }),
        ],
      ],
      master: master(
        "Master of Toxin",
        "Poison that bursts at once (Overflow, Toxic Cascade) heals you for 10 % of it.",
        { weaponRules: { burstLeech: 0.1 } },
      ),
    },
    {
      id: "fire-arrows",
      name: "Fire Arrows",
      theme: "Fire · Burn",
      color: C.ember,
      infusion: { damageType: "fire", ailment: "burn", chance: 0.2 },
      techniques: [ailmentPower("Pitch", "burn", 0.16), ailmentChance("Oiled Rags", "burn", 0.04)],
      forks: [
        [ailmentChance("Brimstone", "burn", 0.15), versusAilment("Firetrail", "burn", 0.1)],
        [
          ailmentDamage("Cinders", "burn", 0.3),
          notable("Burning Out", "Burn deals 50 % more to enemies below 50 % Life.", {
            weaponRules: {
              ailmentDamageWhen: [
                { ailment: "burn", amount: 0.5, condition: { kind: "enemyBelow", fraction: 0.5 } },
              ],
            },
          }),
        ],
      ],
      master: master("Master of Fire Arrows", "Arrows that hit a Burning enemy give 3 Heat.", {
        weaponRules: {
          heatOnHitWhen: [{ condition: { kind: "enemyHas", ailment: "burn" }, amount: 3 }],
        },
      }),
    },
    {
      id: "storm",
      name: "Storm",
      theme: "Lightning · Shock, More arrows",
      color: C.storm,
      infusion: { damageType: "lightning", ailment: "shock", chance: 0.2 },
      techniques: [
        technique("Split Nock", "+5 % chance to loose a second arrow for 60 % Weapon Damage.", {
          triggers: [SPLIT_SHOT(0.05)],
        }),
        ailmentPower("Charged Tips", "shock", 0.1),
      ],
      forks: [
        [
          notable("Split Shot", "+20 % chance to loose a second arrow.", {
            triggers: [SPLIT_SHOT(0.2)],
          }),
          notable("Steady Aim", "+10 % Precision while you were not hit for 3 s.", {
            weaponRules: { steadyAim: { seconds: 3, precision: 0.1 } },
          }),
        ],
        [
          notable(
            "Rain of Arrows",
            "Every 6th Shoot looses two more arrows for 60 % Weapon Damage.",
            {
              triggers: [0, 1].map((i) =>
                trigger(
                  `rain-${i}`,
                  "Rain of Arrows",
                  { kind: "everyNthAttack", n: 6 },
                  { kind: "weaponHit", multiplier: 0.6, extra: true },
                ),
              ),
            },
          ),
          conduction("Conduction"),
        ],
      ],
      master: master("Master of Volley", "Extra arrows can fire your trigger affixes.", {
        weaponRules: { extraAttacksTrigger: true },
      }),
    },
  ],
  innateForms: [
    form("hooked-arrow", "Hooked Arrow", "180 % Weapon Damage. Always Bleeds, 30 % stronger.", {
      ...BARBED_ARROW,
      id: "hooked-arrow",
      name: "Hooked Arrow",
      hits: [
        {
          kind: "weapon",
          multiplier: 1.8,
          ailmentPower: 1.3,
          ailmentChances: [{ ailment: "bleed", chance: 1 }],
        },
      ],
    }),
    form("toxic-arrow", "Toxic Arrow", "Two hits of 90 % Weapon Damage. Each always Poisons.", {
      ...BARBED_ARROW,
      id: "toxic-arrow",
      name: "Toxic Arrow",
      hits: [
        {
          kind: "weapon",
          multiplier: 0.9,
          count: 2,
          ailmentChances: [{ ailment: "poison", chance: 1 }],
        },
      ],
    }),
    form(
      "split-arrow",
      "Split Arrow",
      "Three arrows of 65 % Weapon Damage. 25 % chance each to Bleed or Poison.",
      {
        ...BARBED_ARROW,
        id: "split-arrow",
        name: "Split Arrow",
        hits: [
          {
            kind: "weapon",
            multiplier: 0.65,
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
      // The id stays (saves); the name went to the Volley Notable.
      id: "rain-of-arrows",
      name: "Hailstorm",
      form: "Storm Bow",
      description: "Every Shoot looses two more arrows for 40 % Weapon Damage each. −25 % damage.",
      effect: {
        weaponRules: { damageDealt: 0.75 },
        triggers: [0, 1].map((i) =>
          trigger(
            `hail-${i}`,
            "Hailstorm",
            { kind: "onHit" },
            { kind: "weaponHit", multiplier: 0.4, extra: true },
          ),
        ),
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
      id: "marked-prey",
      name: "Marked Prey",
      form: "Marking Bow",
      description:
        "Your first clean hit marks the enemy: +20 % damage for the fight. Until then Glancing Blows deal nothing.",
      effect: { weaponRules: { mark: { bonus: 0.2 } } },
    },
    {
      id: "wild-shot",
      name: "Wild Shot",
      form: "Wild Bow",
      description:
        "Damage Range maximum +60 %, −15 % Precision. A roll of 125 % or more never glances.",
      effect: { rangeMax: 0.6, precision: -0.15, weaponRules: { mightyNeverGlances: true } },
    },
  ],
});

const CROSSBOW = buildTree({
  weaponId: "crossbow",
  precision: 0.6,
  rangeMin: 0.6,
  rangeMax: 1.8,
  oldAverage: 0.95,
  paths: [
    {
      id: "venom-bolts",
      name: "Venom Bolts",
      theme: "Physical · Poison, Penetration",
      color: C.venom,
      infusion: { damageType: "physical", ailment: "poison", chance: 0.2 },
      techniques: [
        technique("Point", "+3 % Physical Penetration.", {
          bonuses: { physicalPenetration: 0.03 },
        }),
        ailmentPower("Toxic Tips", "poison", 0.12),
      ],
      forks: [
        [
          notable("Bodkin", "+15 % Physical Penetration.", {
            bonuses: { physicalPenetration: 0.15 },
          }),
          notable("Through and Through", "Every clean hit adds a Sunder stack.", {
            weaponRules: { sunder: { chance: 1 } },
          }),
        ],
        [
          ailmentChance("Dipped Bolts", "poison", 0.15),
          notable(
            "Impale",
            "Clean hits store 20 % of their damage; your next Innate sets all of it off.",
            { weaponRules: { store: { clean: 0.2 } } },
          ),
        ],
      ],
      master: master(
        "Master of Pierce",
        "Your Physical Penetration also lowers Resistances (Explosive Bolt, Elemental hits).",
        { weaponRules: { penetrationToElemental: true } },
      ),
    },
    {
      id: "incendiary",
      name: "Incendiary",
      theme: "Fire · Burn, Mighty Hits",
      color: C.ember,
      infusion: { damageType: "fire", ailment: "burn", chance: 0.25 },
      techniques: [
        technique("Tension", "Damage Range maximum +10 %.", { rangeMax: 0.1 }),
        ailmentPower("Pitch Bolts", "burn", 0.15),
      ],
      forks: [
        [
          notable("Heavy Draw", "Mighty Hits deal +30 % damage.", {
            weaponRules: { mightyDamage: 0.3 },
          }),
          notable("Killshot", "Crits ignore 50 % of the enemy's Armor.", {
            weaponRules: { critPenetration: 0.5 },
          }),
        ],
        [
          notable("Deadeye", "Every 5th Bolt lands cleanly and crits.", {
            weaponRules: { everyNthCrit: 5 },
          }),
          ailmentDamage("Smolder", "burn", 0.3),
        ],
      ],
      master: master("Master of Payload", "Your Innate is always a Mighty Hit.", {
        innatePatch: { mighty: true },
      }),
    },
    {
      id: "frost",
      name: "Frost",
      theme: "Cold · Chill, Reload",
      color: C.frost,
      infusion: { damageType: "cold", ailment: "chill", chance: 0.25 },
      techniques: [
        ailmentPower("Rimed Bolts", "chill", 0.1),
        technique("Light Load", "Your Innate costs 4 Heat less.", { innatePatch: { cost: -4 } }),
      ],
      forks: [
        [
          notable("Quick Crank", "+10 % Attack Speed.", { bonuses: { attackSpeed: 0.1 } }),
          notable("Loaded Spring", "Every Glancing Blow gives 10 Heat.", {
            weaponRules: { glancingHeat: 10 },
          }),
        ],
        [
          notable("Drum Magazine", "After a skill, +30 % Attack Speed for 3 s.", {
            triggers: [
              trigger(
                "drum-magazine",
                "Drum Magazine",
                { kind: "onSkillUse" },
                { kind: "buff", stat: "attackSpeed", amount: 0.3, duration: 3 },
              ),
            ],
          }),
          versusAilment("Shatterpoint", "chill", 0.25),
        ],
      ],
      master: master("Master of Reload", "Rotation Slot 1 costs 20 % less Heat.", {
        weaponRules: { slotDiscount: { slot: 0, discount: 0.2 } },
      }),
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
      // The id stays (saves); the name went to the Payload Notable.
      id: "deadeye",
      name: "Sniper's Oath",
      form: "Deadeye Arbalest",
      description: "Every 3rd Bolt lands cleanly and crits. Your other Bolts never crit.",
      effect: { weaponRules: { everyNthCrit: 3 }, rules: { critChanceMultiplier: 0 } },
    },
    {
      id: "siege-engine",
      name: "Siege Engine",
      form: "Siege Arbalest",
      // Step 5: the old cost (a fixed 0.5 Bolts per second) also cut the Steady Heat that comes
      // only from hits, so the Keystone cost up to 70 % damage. Setting the stacks off is the cost.
      description: "A clean Bolt sets off every Sunder stack on the enemy: +80 % damage each.",
      effect: { weaponRules: { siegeEngine: { perStack: 0.8 } } },
    },
    {
      id: "repeater",
      name: "Repeater",
      form: "Repeater",
      description: "Every Bolt is a volley of three for 40 % each. A volley shares one Crit roll.",
      effect: { weaponRules: { volley: { count: 3, multiplier: 0.4 } } },
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
  weaponId: "wand",
  precision: 0.7,
  rangeMin: 0.4,
  rangeMax: 1.3,
  oldAverage: 0.75,
  paths: [
    {
      // Crits by rhythm, not by timing (the Hunter's): a skill charges the Spark, the Spark crits.
      id: "starfall",
      name: "Starfall",
      theme: "Void · Corruption, Crits",
      color: C.void,
      infusion: { damageType: "void", ailment: "corruption", chance: 0.25 },
      techniques: [
        ailmentPower("Taint", "corruption", 0.1),
        technique("Amplify", "Your Innate deals +8 % damage.", { innatePatch: { damage: 0.08 } }),
      ],
      forks: [
        [
          notable("Flashpoint", "Your charged Spark is always a clean Crit.", {
            weaponRules: { sparkCrit: true },
          }),
          notable(
            "Critical Mass",
            "Every Spark that does not crit gives +6 % Crit Chance until your next Crit.",
            { weaponRules: { critBuildup: 0.06 } },
          ),
        ],
        [
          ailmentDamage("Deepening Dark", "corruption", 0.3),
          notable("Overwhelm", "Crits have +20 % Elemental Penetration.", {
            weaponRules: { critElementalPenetration: 0.2 },
          }),
        ],
      ],
      master: master(
        "Master of Starfall",
        "When a skill crits, it charges your Spark for two Default Attacks.",
        { weaponRules: { skillCritSparks: 2 } },
      ),
    },
    {
      // Shock only: the Crits moved to Starfall (2026-10-17).
      id: "storm",
      name: "Storm",
      theme: "Lightning · Shock",
      color: C.storm,
      infusion: { damageType: "lightning", ailment: "shock", chance: 0.2 },
      techniques: [
        technique("Static", "+10 % effect of the Wand's Shock.", {
          weaponRules: { ailmentEffectBy: { shock: 0.1 } },
        }),
        technique("Charge", "+4 % Shock Chance.", { bonuses: { shockChance: 0.04 } }),
      ],
      forks: [
        [
          notable("Static Field", "+20 % Shock Chance.", { bonuses: { shockChance: 0.2 } }),
          notable("Conduction", "Every new Shock stack gives 4 Heat.", {
            weaponRules: { heatPerShockStack: 4 },
          }),
        ],
        [
          notable(
            "Arc Chain",
            "Hits against an enemy with 3 Shock stacks arc for 15 % of their damage.",
            { weaponRules: { arcChain: { share: 0.15, stacks: 3 } } },
          ),
          notable("Static Build", "Shock stacks up to 5 times instead of 3.", {
            weaponRules: { shockMaxStacks: 2 },
          }),
        ],
      ],
      master: master("Master of Storm", "While the enemy is Shocked, your skills cost 10 % less.", {
        weaponRules: {
          skillDiscountWhen: [{ condition: { kind: "enemyHas", ailment: "shock" }, amount: 0.1 }],
        },
      }),
    },
    {
      id: "rime",
      name: "Rime",
      theme: "Cold · Chill, Control",
      color: C.frost,
      infusion: { damageType: "cold", ailment: "chill", chance: 0.25 },
      techniques: [
        technique("Frost", "+10 % effect of the Wand's Chill.", {
          weaponRules: { ailmentEffectBy: { chill: 0.1 } },
        }),
        technique("Hoarfrost", "+4 % Chill Chance.", { bonuses: { chillChance: 0.04 } }),
      ],
      forks: [
        [
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
        [
          notable("Frozen Solid", "Three Chills within 6 s freeze the enemy for 1 s.", {
            weaponRules: { frozenSolid: { chills: 3, seconds: 6, freeze: 1 } },
          }),
          notable("Cold Snap", "A Chilled enemy winds up its Heavy Attacks 30 % slower.", {
            weaponRules: { coldSnap: 0.3 },
          }),
        ],
      ],
      master: master(
        "Master of Rime",
        "A Chill during the enemy's wind-up delays its Heavy Attack by 1 s.",
        { weaponRules: { chillDelay: 1 } },
      ),
    },
  ],
  innateForms: [
    // A Spear, not a Lance: a Void Wand would cast the Staff's "Void Lance".
    form("lance", "Spear", "One bolt with 70 % more damage. Costs 10 more Heat.", {
      ...SHOCKBOLT,
      id: "shock-lance",
      name: "Shock Spear",
      heatCost: SHOCKBOLT.heatCost + 10,
      hits: SHOCKBOLT.hits.map((h) =>
        h.kind === "spell"
          ? { ...h, damage: { min: h.damage.min * 1.7, max: h.damage.max * 1.7 } }
          : h,
      ),
    }),
    form("barrage", "Barrage", "Three bolts of 45 % each.", {
      ...SHOCKBOLT,
      id: "shock-barrage",
      name: "Shock Barrage",
      hits: SHOCKBOLT.hits.map((h) =>
        h.kind === "spell"
          ? { ...h, count: 3, damage: { min: h.damage.min * 0.45, max: h.damage.max * 0.45 } }
          : h,
      ),
    }),
    form("seeking-bolt", "Seeking Bolt", "Never a Glancing Blow.", {
      ...SHOCKBOLT,
      id: "seeking-shockbolt",
      name: "Seeking Shockbolt",
      hits: SHOCKBOLT.hits.map((h) => (h.kind === "spell" ? { ...h, precise: true } : h)),
    }),
  ],
  keystones: [
    {
      id: "prism",
      name: "Prism",
      form: "Prism Wand",
      description:
        "Spark alternates Lightning and Cold and can inflict both ailments. −10 % damage.",
      effect: { weaponRules: { prism: true, damageDealt: 0.9 } },
    },
    {
      id: "glass-cannon",
      name: "Glass Cannon",
      form: "Glass Wand",
      description: "Spark hits for 15 % of your Barrier on top. Skills cost 20 % more Heat.",
      effect: {
        weaponRules: { glassCannon: { share: 0.15 } },
        rules: { skillCostMultiplier: 1.2 },
      },
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
  rangeMax: 1.2,
  oldAverage: 0.8,
  paths: [
    {
      id: "hollow",
      name: "Hollow",
      theme: "Void · Corruption",
      color: C.void,
      infusion: { damageType: "void", ailment: "corruption", chance: 0.3 },
      techniques: [
        technique("Taint", "Corruption grows a third of a step faster per tick.", {
          weaponRules: { corruptionRamp: 1 / 3 },
        }),
        technique("Dusk", "+4 % Corruption Chance.", { bonuses: { corruptionChance: 0.04 } }),
      ],
      forks: [
        [
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
        [
          notable("Collapse Deeper", "Collapse deals 6 s of the Corruption at once instead of 4.", {
            weaponRules: { collapseSeconds: 2 },
          }),
          notable("Void Hunger", "Corruption ticks heal you for 3 % of their damage.", {
            weaponRules: { ailmentLeech: { corruption: 0.03 } },
          }),
        ],
      ],
      master: master("Master of the Hollow", "Your Corruption starts 4 steps grown.", {
        weaponRules: { corruptionStart: 4 },
      }),
    },
    {
      id: "smolder",
      name: "Smolder",
      theme: "Fire · Burn",
      color: C.ember,
      infusion: { damageType: "fire", ailment: "burn", chance: 0.3 },
      techniques: [
        technique("Ember", "+12 % effect of the Staff's Burn.", {
          weaponRules: { ailmentEffectBy: { burn: 0.12 } },
        }),
        technique("Glow", "+4 % Burn Chance.", { bonuses: { burnChance: 0.04 } }),
      ],
      forks: [
        [
          notable("Slow Burn", "Burn lasts 40 % longer.", {
            weaponRules: { ailmentDurationBy: { burn: 0.4 } },
          }),
          notable("Cinders", "Burn deals 40 % more damage.", {
            rules: { ailmentDamage: { burn: 1.4 } },
          }),
        ],
        [
          notable("Pyroclast", "Every 4 s the Burn combusts by itself.", {
            triggers: [
              trigger(
                "pyroclast",
                "Pyroclast",
                { kind: "everySeconds", seconds: 4 },
                { kind: "combust" },
              ),
            ],
          }),
          notable("Ashen Veil", "Burning enemies deal 10 % less damage.", {
            weaponRules: { ashenVeil: 0.1 },
          }),
        ],
      ],
      master: master(
        "Master of Smolder",
        "Burn and Corruption on the same enemy both deal 35 % more damage.",
        {
          weaponRules: {
            ailmentDamageWhen: [
              {
                ailment: "burn",
                amount: 0.35,
                condition: { kind: "enemyHas", ailment: "corruption" },
              },
              {
                ailment: "corruption",
                amount: 0.35,
                condition: { kind: "enemyHas", ailment: "burn" },
              },
            ],
          },
        },
      ),
    },
    {
      id: "glacial",
      name: "Glacial",
      theme: "Cold · Chill, Skills",
      color: C.frost,
      infusion: { damageType: "cold", ailment: "chill", chance: 0.3 },
      techniques: [
        technique("Breath", "+5 % Heat Gain.", { bonuses: { heatGain: 0.05 } }),
        ailmentPower("Rime", "chill", 0.1),
      ],
      forks: [
        [
          notable("Overflow", "Above 80 Heat, skills cost 15 % less.", {
            weaponRules: { overflow: { above: 80, discount: 0.15 } },
          }),
          ailmentLasts("Bitter Cold", "chill", 0.4),
        ],
        [
          notable("Echoing Chant", "Every 3rd skill repeats itself at 30 % power.", {
            weaponRules: { echoChant: { every: 3, power: 0.3 } },
          }),
          notable("Siphon Ember", "Skills heal 2 % of your Life per 10 Heat they cost.", {
            weaponRules: { siphonEmber: 0.02 },
          }),
        ],
      ],
      master: master("Master of Channel", "Your Reaction Slots cost 25 % less Heat.", {
        weaponRules: { reactionDiscount: 0.25 },
      }),
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
      description: "Corruption lasts three times as long. −30 % hit damage.",
      effect: { weaponRules: { ailmentDurationBy: { corruption: 2 }, damageDealt: 0.7 } },
    },
    {
      id: "pyre",
      name: "Pyre",
      form: "Pyre Staff",
      description: "Burn deals 40 % more damage but lasts 20 % shorter.",
      effect: {
        rules: { ailmentDamage: { burn: 1.4 } },
        weaponRules: { ailmentDurationBy: { burn: -0.2 } },
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
