import { type GameData } from "@emberheir/sim";

/**
 * Autopilot builds (klassengeruest-v1.md 9, step 5): one per Heirloom path, so 24 in all. The
 * path sets the damage type and the ailment; the build heads for the Ash Tree region of that
 * ailment ("@branches" = the owned Masteries at that point), fills its Battle Plan with that
 * region's skills (slot 1 is the weapon's Innate) and takes Iron Bastion as a Reaction. Weapon
 * fighters with an elemental path swing their infused weapon (Steel skills), casters cast. The
 * main Mastery follows the path: ailment paths take the class's Ailment Mastery, the others its
 * Burst Mastery; `--mastery` tries the other two. Tree Keystones are left out (a player's call).
 */
export interface BuildPlan {
  readonly id: string;
  readonly classId: string;
  readonly weapon: string;
  readonly nodes: readonly string[];
  readonly rotation: readonly string[];
  /** Masteries by preference: the first is the main one, deepened at every Harvest. */
  readonly branches: readonly string[];
  readonly reaction?: { readonly skillId: string; readonly conditionId: string };
  /** Heirloom choices that differ from the weapon's plan (`MASTERY_PLAN`). */
  readonly mastery?: Partial<MasteryPlan>;
}

const GUARD = { skillId: "iron-bastion", conditionId: "life-50" };

type Style = "bleed" | "stun" | "poison" | "fire" | "lightning" | "cold" | "void";

/** Ash Tree goals per style; Iron Bastion from the trunk comes last. */
const GOALS: Record<Style, readonly string[]> = {
  bleed: ["blood-flayer", "blood-exsanguinate", "@branches", "steel-brutal-force"],
  stun: ["steel-brutal-force", "steel-colossus", "@branches", "steel-coup-de-grace"],
  poison: ["venom-venom-heart", "venom-creeping-death", "@branches", "venom-leeching-rot"],
  fire: ["flame-firestarter", "flame-pyroclasm", "@branches", "flame-cinder-heart"],
  lightning: ["storm-storm-weaver", "storm-tempest", "@branches", "storm-thunderhead"],
  cold: ["frost-glacier", "frost-kindled-mind", "@branches", "frost-heart-of-winter"],
  void: ["void-hollow-crown", "void-hungering-void", "@branches", "void-entropy"],
};

/** Battle Plan skills per style: weapon fighters (attacks) and casters (spells). */
const FIGHTER: Record<Style, readonly string[]> = {
  bleed: ["rend", "serrated-edge", "cleave"],
  stun: ["crushing-blow", "flurry", "execute"],
  poison: ["envenom", "toxic-burst", "wither"],
  fire: ["flurry", "crushing-blow", "execute"],
  lightning: ["flurry", "crushing-blow", "execute"],
  cold: ["flurry", "crushing-blow", "execute"],
  void: ["flurry", "crushing-blow", "execute"],
};
const CASTER: Record<Style, readonly string[]> = {
  ...FIGHTER,
  fire: ["immolate", "meteor", "inferno"],
  lightning: ["chain-lightning", "thunderstrike", "frost-nova"],
  cold: ["ice-lance", "frost-nova", "chain-lightning"],
  void: ["corrupt", "void-rift", "soul-harvest"],
};

/**
 * A Cinderguard with an elemental path starts at Steel, far from its element's region: like a
 * player, it takes the Steel Notables that work for every damage type first.
 */
const STEEL_FIRST = ["steel-brutal-force", "steel-colossus", "@branches"];

/** Every Heirloom path: weapon, path id and the style it fights in. */
const PATHS: readonly (readonly [string, string, Style])[] = [
  ["sword", "edge", "bleed"],
  ["sword", "thunder", "lightning"],
  ["sword", "winter", "cold"],
  ["axe", "butcher", "bleed"],
  ["axe", "blaze", "fire"],
  ["axe", "glacier", "cold"],
  ["mace", "quake", "stun"],
  ["mace", "forge", "fire"],
  ["mace", "stormwall", "lightning"],
  ["bow", "toxin", "poison"],
  ["bow", "fire-arrows", "fire"],
  ["bow", "storm", "lightning"],
  ["crossbow", "venom-bolts", "poison"],
  ["crossbow", "incendiary", "fire"],
  ["crossbow", "frost", "cold"],
  ["dagger", "venom", "poison"],
  ["dagger", "cutthroat", "bleed"],
  ["dagger", "static", "lightning"],
  ["wand", "starfall", "void"],
  ["wand", "storm", "lightning"],
  ["wand", "rime", "cold"],
  ["staff", "hollow", "void"],
  ["staff", "smolder", "fire"],
  ["staff", "glacial", "cold"],
];

const CASTERS = new Set(["wand", "staff"]);
const AILMENT_STYLES = new Set<Style>(["bleed", "poison", "void"]);

/** Masteries per class: Burst, Tempo, Ailment (classes.ts order). */
const CLASS_MASTERIES: Record<string, readonly [string, string, string]> = {
  cinderguard: ["vanquisher", "berserker", "ravager"],
  ashstrider: ["deadeye", "skirmisher", "trickster"],
  emberseer: ["archmage", "spellweaver", "warlock"],
};

const CLASS_OF: Record<string, string> = {
  sword: "cinderguard",
  axe: "cinderguard",
  mace: "cinderguard",
  bow: "ashstrider",
  crossbow: "ashstrider",
  dagger: "ashstrider",
  wand: "emberseer",
  staff: "emberseer",
};

export const BUILDS: readonly BuildPlan[] = PATHS.map(([weapon, path, style]) => {
  const classId = CLASS_OF[weapon] ?? "cinderguard";
  const [burst, tempo, ailment] = CLASS_MASTERIES[classId] ?? ["", "", ""];
  const caster = CASTERS.has(weapon);
  const melee = !caster && FIGHTER[style][0] === "flurry";
  return {
    id: `${weapon}-${path}`,
    classId,
    weapon,
    nodes: [
      ...(melee && classId === "cinderguard"
        ? [...STEEL_FIRST, ...GOALS[style].filter((n) => n !== "@branches").slice(0, 2)]
        : GOALS[style]),
      "trunk-iron-bastion",
    ],
    rotation: (caster ? CASTER : FIGHTER)[style],
    branches: AILMENT_STYLES.has(style) ? [ailment, burst, tempo] : [burst, ailment, tempo],
    reaction: GUARD,
    mastery: { path },
  };
});

/** The build with another main Mastery (`--mastery`); the rest keep their order. */
export function withMainMastery(build: BuildPlan, mastery: string): BuildPlan {
  return { ...build, branches: [mastery, ...build.branches.filter((b) => b !== mastery)] };
}

/** A build by id, or the first build that starts with the weapon. */
export function findBuild(weaponId: string, buildId?: string): BuildPlan | undefined {
  if (buildId) return BUILDS.find((b) => b.id === buildId);
  return BUILDS.find((b) => b.weapon === weaponId);
}

/**
 * Heirloom plan per weapon: Heat Form (the weapon's old behavior), Innate Form, Keystone, the
 * build's path (one path at a time) and the side taken at each fork (0 = the first Notable,
 * 1 = the second). Refine is spread around it. Without a path the weapon keeps its first one.
 */
interface MasteryPlan {
  readonly heat?: string;
  readonly innate: string;
  readonly keystone: string;
  readonly path: string;
  /** Fork sides per path; a path without an entry takes the first Notable at both forks. */
  readonly forks?: Readonly<Record<string, readonly [0 | 1, 0 | 1]>>;
}

const MASTERY_PLAN: Record<string, MasteryPlan> = {
  sword: {
    heat: "heat-cooling",
    innate: "rising-strike",
    keystone: "final-verdict",
    path: "edge",
    forks: { edge: [0, 1], winter: [1, 0] },
  },
  mace: {
    heat: "heat-cooling",
    innate: "bone-breaker",
    keystone: "siege",
    path: "quake",
    forks: { quake: [1, 0], stormwall: [0, 1] },
  },
  axe: {
    heat: "heat-cooling",
    innate: "gutting-lacerate",
    keystone: "rampage",
    path: "butcher",
    forks: { butcher: [0, 0] },
  },
  dagger: {
    heat: "heat-cooling",
    innate: "virulent-coat",
    keystone: "toxic-bloom",
    path: "venom",
    forks: { cutthroat: [1, 1] },
  },
  bow: {
    innate: "hooked-arrow",
    keystone: "marked-prey",
    path: "toxin",
  },
  crossbow: {
    innate: "ballista-bolt",
    keystone: "repeater",
    path: "venom-bolts",
    forks: { "venom-bolts": [1, 0] },
  },
  wand: {
    heat: "heat-warming",
    innate: "barrage",
    keystone: "wild-magic",
    path: "starfall",
    forks: { rime: [1, 0] },
  },
  staff: {
    heat: "heat-warming",
    innate: "void-lance",
    keystone: "endless-night",
    path: "hollow",
    forks: { smolder: [1, 0] },
  },
};

/** The order the autopilot learns Weapon Mastery nodes in (a node id per point). */
export function masteryOrder(data: GameData, weaponId: string, build?: BuildPlan): string[] {
  const base = MASTERY_PLAN[weaponId];
  const tree = data.weaponMastery[weaponId];
  if (!base || !tree) return [];
  const plan = { ...base, ...build?.mastery };
  // A path: Technique I (3 ranks), a fork side, Technique II (3 ranks), a fork side, the Master.
  const path = (id: string | undefined): string[] => {
    if (!id) return [];
    const nodes = tree.nodes.filter((n) => n.path === id);
    const sides = plan.forks?.[id] ?? [0, 0];
    const fork = (step: number) =>
      nodes.filter((n) => n.fork === `${id}-${step}`)[sides[step - 1] ?? 0]?.id;
    const out: (string | undefined)[] = [
      ...Array<string>(3).fill(`${id}-t1`),
      fork(1),
      ...Array<string>(3).fill(`${id}-t2`),
      fork(2),
      `${id}-master`,
    ];
    return out.filter((n): n is string => n !== undefined && nodes.some((m) => m.id === n));
  };
  return [
    ...(plan.heat ? [plan.heat] : []),
    plan.innate,
    plan.keystone,
    "precision",
    "steady-hand",
    "precision",
    ...path(plan.path),
    "steady-hand",
    "precision",
    "steady-hand",
    "full-swing",
    "full-swing",
    "full-swing",
    "balance",
    "balance",
    "balance",
  ];
}
