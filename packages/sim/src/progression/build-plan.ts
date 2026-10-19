import type { Attribute, SlotModifier } from "../combat/types";
import { battlePlanUnlocks } from "./battle-plan";
import {
  type GameData,
  type GameState,
  applyAction,
  heroSetup,
  knownSkills,
  masteryPointsLeft,
} from "./game";
import {
  type LearnedNodes,
  forkPartner,
  getNode,
  keystoneLimit,
  learnBlockReason,
  nodeMaxRanks,
} from "./skill-tree";

/**
 * A build plan (klassengeruest-v1.md 9, step 5): how one Heirloom path is played out to the end.
 * The balance autopilot follows it run by run, the Cheat Panel jumps straight to its last stage.
 */
export interface BuildPlan {
  readonly id: string;
  readonly name: string;
  readonly classId: string;
  readonly weapon: string;
  /** Heirloom choices: Heat Form, Innate Form, Keystone, the path and its fork sides. */
  readonly heirloom: {
    readonly heat?: string;
    readonly innate: string;
    readonly keystone: string;
    readonly path: string;
    /** Fork sides (0 = first Notable, 1 = second); without it the first one at both forks. */
    readonly forks?: readonly [0 | 1, 0 | 1];
  };
  /**
   * Ash Tree goals in order. `@mastery-skill` stands for the main Mastery's skill node,
   * `@mastery` for the rest of its nodes, `@mastery-keystone` for its Keystone and the tiers that
   * lift it. Ash Tree Keystones named here wait for the second Keystone place (Prestige 2), so the
   * first place stays free for the Mastery's.
   */
  readonly nodes: readonly string[];
  /** Battle Plan skills after the Innate (`@mastery-skill` = the main Mastery's skill). */
  readonly rotation: readonly string[];
  /** Masteries by preference: the first is the main one, deepened at every Harvest. */
  readonly masteries: readonly string[];
  readonly reaction?: { readonly skillId: string; readonly conditionId: string };
  /** Attributes to raise first (the Cheat Panel's last stage spends its points in this order). */
  readonly attributes: readonly Attribute[];
}

/** Placeholders in `nodes` and `rotation`. */
export const MASTERY_SKILL = "@mastery-skill";
export const MASTERY_NODES = "@mastery";
export const MASTERY_KEYSTONE = "@mastery-keystone";

/** The plan's main Mastery once the hero owns it. */
export function planMastery(state: GameState, plan: BuildPlan): string | undefined {
  return plan.masteries.find((m) => state.legacy.branches.includes(m));
}

/** The order the plan learns Heirloom nodes in (a node id per point). */
export function heirloomOrder(data: GameData, plan: BuildPlan): string[] {
  const tree = data.weaponMastery[plan.weapon];
  if (!tree) return [];
  const { heat, innate, keystone, path: id, forks = [0, 0] } = plan.heirloom;
  // A path: Technique I (3 ranks), a fork side, Technique II (3 ranks), a fork side, the Master.
  const nodes = tree.nodes.filter((n) => n.path === id);
  const fork = (step: 1 | 2) =>
    nodes.filter((n) => n.fork === `${id}-${step}`)[forks[step - 1] ?? 0]?.id;
  const path = [
    ...Array<string>(3).fill(`${id}-t1`),
    fork(1),
    ...Array<string>(3).fill(`${id}-t2`),
    fork(2),
    `${id}-master`,
  ].filter((n): n is string => n !== undefined && nodes.some((m) => m.id === n));
  return [
    ...(heat ? [heat] : []),
    innate,
    keystone,
    "precision",
    "steady-hand",
    "precision",
    ...path,
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

/** Kaelen's Heirloom tab: learns along the plan while points last. */
export function learnHeirloom(state: GameState, data: GameData, plan: BuildPlan): GameState {
  let s = state;
  const tree = data.weaponMastery[s.hero.weaponId];
  if (!tree || s.hero.weaponId !== plan.weapon) return s;
  const order = heirloomOrder(data, plan);
  for (let guard = 0; guard < 64 && masteryPointsLeft(s, data) > 0; guard++) {
    let learned = false;
    const counts = new Map<string, number>();
    for (const id of order) {
      const want = (counts.get(id) ?? 0) + 1;
      counts.set(id, want);
      const node = tree.nodes.find((n) => n.id === id);
      if (!node) continue;
      const have = node.group
        ? s.hero.mastery.choices[node.group] === id
          ? 1
          : 0
        : (s.hero.mastery.learned[id] ?? 0);
      if (have >= want) continue;
      try {
        s = applyAction(s, data, { type: "learnMastery", nodeId: id });
        learned = true;
        break;
      } catch {
        // Not yet (Rank, Keystone ring): try the next step.
      }
    }
    if (!learned) break;
  }
  return s;
}

const adjacency = new WeakMap<GameData["skillTree"], Map<string, string[]>>();

/** Neighbours of every node, built once per tree (the tree is too big for `neighbours`). */
function links(tree: GameData["skillTree"]): Map<string, string[]> {
  let map = adjacency.get(tree);
  if (!map) {
    const built = new Map<string, string[]>(tree.nodes.map((n) => [n.id, []]));
    for (const node of tree.nodes) {
      for (const l of node.links) {
        built.get(node.id)?.push(l);
        built.get(l)?.push(node.id);
      }
    }
    map = built;
    adjacency.set(tree, map);
  }
  return map;
}

/** Shortest list of nodes to learn so that `target` gets a rank (breadth-first search). */
function pathTo(data: GameData, learned: LearnedNodes, target: string): string[] {
  const tree = data.skillTree;
  const known = (id: string) => id === tree.startNodeId || (learned[id] ?? 0) > 0;
  if (known(target)) return [target];
  const graph = links(tree);
  const from = new Map<string, string | null>();
  const queue = tree.nodes.filter((n) => known(n.id)).map((n) => n.id);
  for (const id of queue) from.set(id, null);
  while (queue.length) {
    const id = queue.shift() ?? "";
    for (const next of graph.get(id) ?? []) {
      if (from.has(next)) continue;
      const node = getNode(tree, next);
      if ((node.kind === "keystone" && next !== target) || forkPartner(tree, learned, node)) {
        continue;
      }
      from.set(next, id);
      if (next === target) {
        const path = [next];
        let back = from.get(next) ?? null;
        while (back && !known(back)) {
          path.unshift(back);
          back = from.get(back) ?? null;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

/** Learns one node after the other along the shortest path; stops when points run out. */
function learnTowards(s: GameState, data: GameData, target: string): GameState {
  for (const id of pathTo(data, s.hero.learned, target)) {
    if (s.hero.unspentSkillPoints <= 0) break;
    try {
      s = applyAction(s, data, { type: "learnNodes", nodeIds: [id] });
    } catch {
      break;
    }
  }
  return s;
}

/** Puts points into a node until it is maxed or the points run out. */
function fillNode(s: GameState, data: GameData, id: string): GameState {
  const node = data.skillTree.nodes.find((n) => n.id === id);
  if (!node) return s;
  while (
    s.hero.unspentSkillPoints > 0 &&
    (s.hero.learned[id] ?? 0) < nodeMaxRanks(node, s.legacy.branches)
  ) {
    const before = s;
    s = learnTowards(s, data, id);
    if (s === before) break;
  }
  return s;
}

const DEFENSE_STATS = new Set([
  "life",
  "increasedLife",
  "armor",
  "increasedArmor",
  "barrier",
  "increasedBarrier",
  "evasion",
  "tenacity",
  "blockChance",
  "allResistance",
]);

/** Nodes that make the hero harder to kill (Life, Armor, Barrier, Evasion, Block). */
function isDefenseNode(node: { readonly bonuses?: object }): boolean {
  return Object.keys(node.bonuses ?? {}).some((k) => DEFENSE_STATS.has(k));
}

/** The plan's goals with the placeholders filled in for this hero. */
function goals(state: GameState, data: GameData, plan: BuildPlan): string[] {
  const mastery = planMastery(state, plan);
  const branch = mastery ? data.skillTree.nodes.filter((n) => n.prestigeBranch === mastery) : [];
  const own = branch.filter((n) => n.kind !== "keystone");
  const keystones = branch
    .filter((n) => n.kind === "keystone")
    .sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1));
  const secondPlace = keystoneLimit(state.legacy.prestige) >= 2;
  return plan.nodes.flatMap((id) => {
    if (id === MASTERY_SKILL) return own.filter((n) => n.kind === "skill").map((n) => n.id);
    if (id === MASTERY_NODES) return own.map((n) => n.id);
    if (id === MASTERY_KEYSTONE) return keystones.map((n) => n.id);
    const node = data.skillTree.nodes.find((n) => n.id === id);
    if (node?.kind === "keystone" && !secondPlace) return [];
    return [id];
  });
}

/**
 * Kaelen's Ash Tree: spends Skill Points on the plan's goals in order (Keystones only where the
 * plan names them), then on the nearest open nodes (within a kind, defense first, like a player
 * stuck at a wall).
 */
export function learnAshTree(state: GameState, data: GameData, plan: BuildPlan): GameState {
  let s = state;
  for (const target of goals(s, data, plan)) s = fillNode(s, data, target);
  const tree = data.skillTree;
  const graph = links(tree);
  const order = { skill: 0, notable: 1, socket: 1, minor: 2, keystone: 3 } as const;
  while (s.hero.unspentSkillPoints > 0) {
    const learned = s.hero.learned;
    const open = tree.nodes.filter(
      (n) =>
        n.kind !== "keystone" &&
        learnBlockReason(
          tree,
          learned,
          n.id,
          { skillPoints: 1, keystones: 0 },
          s.legacy.branches,
        ) === undefined &&
        ((learned[n.id] ?? 0) > 0 || (graph.get(n.id) ?? []).some((l) => (learned[l] ?? 0) > 0)),
    );
    const rank = (n: (typeof open)[number]) => 2 * order[n.kind] + (isDefenseNode(n) ? 0 : 1);
    const next = open.sort((a, b) => rank(a) - rank(b))[0];
    if (!next) break;
    s = applyAction(s, data, { type: "learnNodes", nodeIds: [next.id] });
  }
  return s;
}

/** The plan's Battle Plan skills this hero knows, in order. */
export function planRotation(state: GameState, data: GameData, plan: BuildPlan): string[] {
  const weapon = heroSetup(state, data).setup.weapon;
  const known = new Set(knownSkills(state, data, weapon).map((k) => k.skill.id));
  const mastery = planMastery(state, plan);
  const masterySkill = data.skillTree.nodes.find(
    (n) => n.prestigeBranch === mastery && n.kind === "skill",
  )?.skill?.id;
  return plan.rotation
    .map((id) => (id === MASTERY_SKILL ? masterySkill : id))
    .filter((id): id is string => id !== undefined && known.has(id));
}

/** Fills the Battle Plan: the plan's skills, its Reaction and the Slot Modifiers. */
export function setPlanBattlePlan(state: GameState, data: GameData, plan: BuildPlan): GameState {
  let s = state;
  const rotation = planRotation(s, data, plan);
  for (let slot = 1; slot < s.progress.rotationSlots; slot++) {
    const skillId = rotation[slot - 1];
    if (skillId && s.hero.rotation[slot] !== skillId) {
      s = applyAction(s, data, { type: "setRotationSkill", slot, skillId });
    }
  }
  const weapon = heroSetup(s, data).setup.weapon;
  const known = new Set(knownSkills(s, data, weapon).map((k) => k.skill.id));
  const unlocks = battlePlanUnlocks(s.legacy.prestige);
  const mods = (first: SlotModifier): SlotModifier[] =>
    ([unlocks.rareModifiers ? "reverb" : "overcharge", first] as SlotModifier[]).slice(
      2 - unlocks.modifiers,
    );
  const reaction =
    unlocks.reactionSlots > 0 && plan.reaction && known.has(plan.reaction.skillId)
      ? plan.reaction
      : null;
  try {
    s = applyAction(s, data, {
      type: "setBattlePlan",
      plan: {
        ...s.hero.plan,
        modifiers: Array.from({ length: s.progress.rotationSlots }, (_, i) =>
          mods(i === 0 ? "thrifty" : "empowered"),
        ),
        reactions: reaction ? [reaction] : [],
        reactionModifiers: reaction ? [mods("thrifty")] : [],
        capstone: unlocks.capstone ? (s.hero.plan.capstone ?? { id: "crescendo", slot: 0 }) : null,
        openingMove: unlocks.openingMove ? (rotation[0] ?? null) : null,
      },
    });
  } catch {
    // Keep the old plan.
  }
  return s;
}

/** Heirloom, Ash Tree and Battle Plan along the plan, with the points the hero has. */
export function applyBuildPlan(state: GameState, data: GameData, plan: BuildPlan): GameState {
  const s = learnAshTree(learnHeirloom(state, data, plan), data, plan);
  return setPlanBattlePlan(s, data, plan);
}
