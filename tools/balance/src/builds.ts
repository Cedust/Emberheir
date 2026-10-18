import { type GameData } from "@emberheir/sim";

/** The autopilot's builds: three per class, each a Skill Tree goal and a Weapon Mastery order. */

/**
 * Autopilot builds (level-v2.md section 7): three clearly different builds per class, each with
 * its weapon, Skill Tree goals in order ("@branches" = the owned Prestige branches at that point),
 * Rotation skills (slot 1 is the weapon's Innate), Prestige branches by preference and a Reaction
 * skill once one is unlocked. Tree Keystones are left out (their pick is a player's call).
 */
export interface BuildPlan {
  readonly id: string;
  readonly classId: string;
  readonly weapon: string;
  readonly nodes: readonly string[];
  readonly rotation: readonly string[];
  readonly branches: readonly string[];
  readonly reaction?: { readonly skillId: string; readonly conditionId: string };
  /** Weapon Mastery choices that differ from the weapon's plan (`MASTERY_PLAN`). */
  readonly mastery?: Partial<MasteryPlan>;
}

const GUARD = { skillId: "iron-bastion", conditionId: "life-50" };

const NOVA = { skillId: "frost-nova", conditionId: "enemy-windup" };

export const BUILDS: readonly BuildPlan[] = [
  {
    id: "unbroken",
    classId: "cinderguard",
    weapon: "sword",
    nodes: ["might-unbroken", "might-brutal-force", "rupture-might-execute", "@branches"],
    rotation: ["flurry", "feint", "execute"],
    branches: ["vanquisher", "berserker", "ravager"],
    reaction: GUARD,
  },
  {
    id: "smasher",
    classId: "cinderguard",
    weapon: "mace",
    nodes: ["might-brutal-force", "might-colossus", "@branches", "might-arcana-arcane-edge"],
    rotation: ["crushing-blow", "feint", "flurry"],
    branches: ["vanquisher", "berserker", "ravager"],
    reaction: GUARD,
  },
  {
    id: "bleeder",
    classId: "cinderguard",
    weapon: "sword",
    nodes: ["might-brutal-force", "rupture-flayer", "rupture-exsanguinate", "@branches"],
    rotation: ["rend", "cleave", "feint"],
    branches: ["vanquisher", "berserker", "ravager"],
    reaction: GUARD,
  },
  {
    id: "bleed",
    classId: "cinderguard",
    weapon: "axe",
    nodes: ["rupture-exsanguinate", "rupture-flayer", "@branches", "affliction-rupture-iron-will"],
    rotation: ["rend", "cleave", "serrated-edge"],
    branches: ["vanquisher", "berserker", "ravager"],
    reaction: GUARD,
  },
  {
    id: "poison",
    classId: "ashstrider",
    weapon: "dagger",
    nodes: [
      "rupture-venom-heart",
      "affliction-rupture-bloodthirst",
      "@branches",
      "affliction-rupture-leeching-rot",
    ],
    rotation: ["toxic-burst", "plague-cloud", "envenom"],
    branches: ["deadeye", "skirmisher", "trickster"],
    reaction: GUARD,
  },
  {
    id: "assassin",
    classId: "ashstrider",
    weapon: "dagger",
    nodes: ["rupture-might-killers-eye", "rupture-might-execute", "@branches", "might-whirlwind"],
    rotation: ["execute", "feint", "flurry"],
    branches: ["deadeye", "skirmisher", "trickster"],
    reaction: GUARD,
  },
  {
    id: "marksman",
    classId: "ashstrider",
    weapon: "crossbow",
    nodes: [
      "rupture-might-killer-instinct",
      "rupture-might-execute",
      "@branches",
      "rupture-might-killers-eye",
      "rupture-might-coup-de-grace",
    ],
    rotation: ["piercing-shot", "execute"],
    branches: ["deadeye", "skirmisher", "trickster"],
    reaction: GUARD,
  },
  {
    id: "venom",
    classId: "ashstrider",
    weapon: "bow",
    nodes: ["rupture-venom-heart", "@branches", "affliction-rupture-toxic-burst"],
    rotation: ["envenom", "toxic-burst", "plague-cloud"],
    branches: ["deadeye", "skirmisher", "trickster"],
    reaction: GUARD,
    // A Poison bow: the Poison innate and the Toxin path, not the Bleed ones of the bow's plan.
    mastery: { innate: "toxic-arrow", path: "toxin" },
  },
  {
    id: "barbs",
    classId: "ashstrider",
    weapon: "bow",
    nodes: [
      "rupture-exsanguinate",
      "rupture-serrated-edge",
      "@branches",
      "rupture-might-exploit-weakness",
    ],
    rotation: ["rend", "serrated-edge", "piercing-shot"],
    branches: ["deadeye", "skirmisher", "trickster"],
    reaction: GUARD,
  },
  {
    id: "storm",
    classId: "emberseer",
    weapon: "wand",
    nodes: ["arcana-tempest", "arcana-storm-weaver", "@branches", "arcana-kindled-mind"],
    rotation: ["chain-lightning", "thunderstrike", "meteor"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
  },
  {
    id: "frost",
    classId: "emberseer",
    weapon: "wand",
    nodes: [
      "arcana-kindled-mind",
      "arcana-glacier",
      "@branches",
      "arcana-affliction-heart-of-embers",
    ],
    rotation: ["ice-lance", "chain-lightning"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
    mastery: { path: "rime" },
  },
  {
    // Crits by rhythm (sorcerer-ohne-fire-v1.md): skills charge the Spark, the Spark crits.
    id: "starfall",
    classId: "emberseer",
    weapon: "wand",
    nodes: ["arcana-tempest", "arcana-ever-ward", "@branches", "arcana-kindled-mind"],
    rotation: ["chain-lightning", "ice-lance", "thunderstrike"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
    mastery: { path: "starfall" },
  },
  {
    id: "void",
    classId: "emberseer",
    weapon: "staff",
    nodes: ["affliction-hollow-crown", "affliction-hungering-void", "@branches"],
    rotation: ["corrupt", "void-rift", "soul-harvest"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
  },
  {
    id: "pyre",
    classId: "emberseer",
    weapon: "staff",
    nodes: [
      "affliction-pyre-heart",
      "affliction-cinder-heart",
      "@branches",
      "arcana-affliction-firestarter",
    ],
    rotation: ["immolate", "inferno", "soul-harvest"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
  },
  {
    id: "rot",
    classId: "emberseer",
    weapon: "staff",
    nodes: [
      "affliction-rupture-leeching-rot",
      "affliction-rupture-iron-will",
      "@branches",
      "affliction-hollow-crown",
    ],
    rotation: ["wither", "corrupt", "void-rift"],
    branches: ["archmage", "spellweaver", "warlock"],
    reaction: NOVA,
  },
];

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
