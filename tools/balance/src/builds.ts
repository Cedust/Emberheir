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
}

const GUARD = { skillId: "iron-bastion", conditionId: "life-50" };

const NOVA = { skillId: "frost-nova", conditionId: "enemy-windup" };

export const BUILDS: readonly BuildPlan[] = [
  {
    id: "unbroken",
    classId: "warrior",
    weapon: "sword",
    nodes: ["might-unbroken", "might-brutal-force", "rupture-might-execute", "@branches"],
    rotation: ["flurry", "feint", "execute"],
    branches: ["duelist", "warden", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "smasher",
    classId: "warrior",
    weapon: "mace",
    nodes: ["might-brutal-force", "might-colossus", "@branches", "might-arcana-arcane-edge"],
    rotation: ["crushing-blow", "feint", "flurry"],
    branches: ["warden", "duelist", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "bleeder",
    classId: "warrior",
    weapon: "sword",
    nodes: ["might-brutal-force", "rupture-might-serrations", "rupture-exsanguinate", "@branches"],
    rotation: ["rend", "cleave", "feint"],
    branches: ["butcher", "duelist", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "bleed",
    classId: "reaver",
    weapon: "axe",
    nodes: ["rupture-exsanguinate", "rupture-butcher", "@branches", "affliction-rupture-iron-will"],
    rotation: ["rend", "cleave", "serrated-edge"],
    branches: ["butcher", "duelist", "venomancer", "tactician"],
    reaction: GUARD,
  },
  {
    id: "poison",
    classId: "reaver",
    weapon: "dagger",
    nodes: [
      "rupture-venomancer",
      "affliction-rupture-bloodthirst",
      "@branches",
      "affliction-rupture-leeching-rot",
    ],
    rotation: ["toxic-burst", "plague-cloud", "envenom"],
    branches: ["venomancer", "tactician", "duelist", "butcher"],
    reaction: GUARD,
  },
  {
    id: "assassin",
    classId: "reaver",
    weapon: "dagger",
    nodes: ["rupture-might-killers-eye", "rupture-might-execute", "@branches", "might-whirlwind"],
    rotation: ["execute", "feint", "flurry"],
    branches: ["duelist", "venomancer", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "marksman",
    classId: "hunter",
    weapon: "crossbow",
    nodes: [
      "rupture-might-killer-instinct",
      "rupture-might-execute",
      "@branches",
      "rupture-might-killers-eye",
      "rupture-might-coup-de-grace",
    ],
    rotation: ["piercing-shot", "execute"],
    branches: ["marksman", "venomancer", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "venom",
    classId: "hunter",
    weapon: "bow",
    nodes: ["rupture-venomancer", "@branches", "affliction-rupture-toxic-burst"],
    rotation: ["envenom", "toxic-burst", "plague-cloud"],
    branches: ["venomancer", "marksman", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "barbs",
    classId: "hunter",
    weapon: "bow",
    nodes: [
      "rupture-exsanguinate",
      "rupture-serrated-edge",
      "@branches",
      "rupture-might-opportunist",
    ],
    rotation: ["rend", "serrated-edge", "piercing-shot"],
    branches: ["marksman", "venomancer", "warden", "tactician"],
    reaction: GUARD,
  },
  {
    id: "storm",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: ["arcana-tempest", "arcana-storm-weaver", "@branches", "arcana-kindled-mind"],
    rotation: ["chain-lightning", "thunderstrike", "meteor"],
    branches: ["stormcaller", "frostbinder", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "frost",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: [
      "arcana-kindled-mind",
      "arcana-glacier",
      "@branches",
      "arcana-affliction-heart-of-embers",
    ],
    rotation: ["ice-lance", "chain-lightning"],
    branches: ["frostbinder", "stormcaller", "warden", "tactician"],
    reaction: NOVA,
  },
  {
    id: "fire",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: ["arcana-affliction-pyroclasm", "arcana-affliction-firestarter", "@branches"],
    rotation: ["meteor", "thunderstrike", "ice-lance"],
    branches: ["stormcaller", "tactician", "frostbinder", "warden"],
    reaction: NOVA,
  },
  {
    id: "void",
    classId: "warlock",
    weapon: "staff",
    nodes: ["affliction-void-lord", "affliction-hungering-void", "@branches"],
    rotation: ["corrupt", "void-rift", "soul-harvest"],
    branches: ["void-lord", "pyromancer", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "pyre",
    classId: "warlock",
    weapon: "staff",
    nodes: [
      "affliction-pyromancer",
      "affliction-cinder-heart",
      "@branches",
      "arcana-affliction-firestarter",
    ],
    rotation: ["immolate", "inferno", "soul-harvest"],
    branches: ["pyromancer", "void-lord", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "rot",
    classId: "warlock",
    weapon: "staff",
    nodes: [
      "affliction-rupture-leeching-rot",
      "affliction-rupture-iron-will",
      "@branches",
      "affliction-void-lord",
    ],
    rotation: ["wither", "corrupt", "void-rift"],
    branches: ["void-lord", "warden", "pyromancer", "tactician"],
    reaction: NOVA,
  },
];

/** A build by id, or the first build that starts with the weapon. */
export function findBuild(weaponId: string, buildId?: string): BuildPlan | undefined {
  if (buildId) return BUILDS.find((b) => b.id === buildId);
  return BUILDS.find((b) => b.weapon === weaponId);
}

/**
 * Weapon Mastery plan per weapon: Heat Form (the weapon's old behavior), Innate Form, Keystone
 * and the paths in order. Refine is spread between them.
 */
interface MasteryPlan {
  readonly heat?: string;
  readonly innate: string;
  readonly keystone: string;
  readonly paths: readonly string[];
}

const MASTERY_PLAN: Record<string, MasteryPlan> = {
  sword: {
    heat: "heat-cooling",
    innate: "rising-strike",
    keystone: "final-verdict",
    paths: ["edge", "tempo", "riposte"],
  },
  mace: {
    heat: "heat-cooling",
    innate: "bone-breaker",
    keystone: "siege",
    paths: ["crush", "quake", "bulwark"],
  },
  axe: {
    heat: "heat-cooling",
    innate: "gutting-lacerate",
    keystone: "rampage",
    paths: ["butcher", "frenzy", "cleave"],
  },
  dagger: {
    heat: "heat-cooling",
    innate: "virulent-coat",
    keystone: "toxic-bloom",
    paths: ["venom", "assassin", "flurry"],
  },
  bow: { innate: "hooked-arrow", keystone: "hunters-mark", paths: ["barbs", "volley", "toxin"] },
  crossbow: {
    innate: "ballista-bolt",
    keystone: "siege-engine",
    paths: ["payload", "pierce", "reload"],
  },
  "fire-wand": {
    heat: "heat-warming",
    innate: "barrage",
    keystone: "glass-cannon",
    paths: ["storm", "pyre", "rime"],
  },
  staff: {
    heat: "heat-warming",
    innate: "void-lance",
    keystone: "endless-night",
    paths: ["hollow", "channel", "smolder"],
  },
};

/** The order the autopilot learns Weapon Mastery nodes in (a node id per point). */
export function masteryOrder(data: GameData, weaponId: string): string[] {
  const plan = MASTERY_PLAN[weaponId];
  const tree = data.weaponMastery[weaponId];
  if (!plan || !tree) return [];
  const path = (id: string | undefined) =>
    id ? tree.nodes.filter((n) => n.path === id).map((n) => n.id) : [];
  return [
    ...(plan.heat ? [plan.heat] : []),
    plan.innate,
    plan.keystone,
    "precision",
    "steady-hand",
    "precision",
    ...path(plan.paths[0]),
    "steady-hand",
    "precision",
    ...path(plan.paths[1]),
    "steady-hand",
    "full-swing",
    "full-swing",
    "full-swing",
    "balance",
    "balance",
    ...path(plan.paths[2]),
  ];
}
