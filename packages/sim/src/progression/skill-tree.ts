import { mergeRules } from "../combat/rules";
import type { CombatRules, SkillDefinition, StatBonuses, TriggerSpec } from "../combat/types";
import { sumBonuses } from "../combat/stats";

/** Skill Tree data (docs/design/skill-tree-v1.md, level-v2.md): a web with class starts. */

export type SkillTreeBranch = "core" | "might" | "arcana" | "rupture" | "affliction";
/** Regions of the web between the four branches (level-v2.md section 7). */
export type SkillTreeRegion =
  SkillTreeBranch | "might-arcana" | "arcana-affliction" | "affliction-rupture" | "rupture-might";
export type SkillNodeKind = "minor" | "notable" | "skill" | "keystone";

export interface SkillNode {
  readonly id: string;
  readonly name: string;
  readonly branch: SkillTreeBranch;
  readonly kind: SkillNodeKind;
  /** Short rules text for the tooltip. */
  readonly description: string;
  /** Neighbours. Links are two-way; listing them on one side is enough. */
  readonly links: readonly string[];
  /** Position for the tree view (abstract units, core start at 0/0, y grows downwards). */
  readonly x: number;
  readonly y: number;
  /** Ranks a point can be put into (Skill nodes 3, others 1). Default 1. */
  readonly maxRanks?: number;
  /** Stat bonuses per rank. */
  readonly bonuses?: StatBonuses;
  /** Bonuses only count with a weapon of this range ("While wielding a Melee Weapon"). */
  readonly weaponRange?: "melee" | "ranged";
  /** Skill nodes: the active skill they unlock; ranks raise its Skill Level. */
  readonly skill?: SkillDefinition;
  /** Keystones: the rule they change. They cost Harvester's Ember, not Skill Points. */
  readonly keystone?: CombatRules;
  /** Trigger effects the node gives (Prestige branches); they do not stack with ranks. */
  readonly triggers?: readonly TriggerSpec[];
  /** Prestige branch the node belongs to; learnable once the branch is unlocked. */
  readonly prestigeBranch?: string;
  /**
   * Branch tier the node belongs to (skilltree-v2.md): 2 and 3 open when the Prestige branch is
   * deepened. Default 1.
   */
  readonly tier?: 1 | 2 | 3;
  /** A node this one upgrades: once this one is learned, the other's triggers and rules stop. */
  readonly replaces?: string;
  /** Combat rules of a non-Keystone node ("Hits deal 40 % more damage below 35 % Life"). */
  readonly rules?: CombatRules;
  /**
   * Fork (level-v2.md section 7): nodes sharing a fork id exclude each other; once one of them
   * is learned, the others stay closed until it is forgotten again.
   */
  readonly fork?: string;
  /** Where the node sits in the web, for colour and grouping. Default: its branch. */
  readonly region?: SkillTreeRegion;
  /** A class's start node: learned for free by that class (`SkillTreeDefinition.classStarts`). */
  readonly classStart?: string;
}

/**
 * A Prestige branch (skill-tree-v1.md section 3): one is unlocked per Prestige. Its nodes hang off
 * `anchor`, a node of the base branch it deepens.
 */
export interface PrestigeBranchDefinition {
  readonly id: string;
  readonly name: string;
  /** Base branch it deepens (colour, grouping). */
  readonly branch: SkillTreeBranch;
  readonly anchor: string;
  /** One line about its theme. */
  readonly theme: string;
}

export interface SkillTreeDefinition {
  readonly nodes: readonly SkillNode[];
  /**
   * Learned for free at the start and always counted as learned (trees without class starts).
   * With `classStarts`, the class's start node is put into `learned` when the hero is created.
   */
  readonly startNodeId?: string;
  /** Start node per class id: each class starts at its own place in the web (level-v2.md). */
  readonly classStarts?: Readonly<Record<string, string>>;
  readonly prestigeBranches?: readonly PrestigeBranchDefinition[];
}

/** Highest Prestige branch tier: a branch can be taken once and deepened twice. */
export const MAX_BRANCH_TIER = 3;

/**
 * Tier of a Prestige branch: how often it was picked at a Prestige (0 = not unlocked).
 * `branches` is the list of Prestige picks, a deepened branch appears once per tier.
 */
export const branchTier = (branches: readonly string[], id: string): number =>
  branches.filter((b) => b === id).length;

/** Ranks per node id. */
export type LearnedNodes = Readonly<Record<string, number>>;

/**
 * Ranks a point can be put into. Each deepening of a Prestige branch gives its Skill node one
 * more rank (level-v2.md: tiers cost 8 / 5 / 6 Skill Points).
 */
export function nodeMaxRanks(node: SkillNode, branches: readonly string[] = []): number {
  const base = node.maxRanks ?? 1;
  if (node.kind !== "skill" || !node.prestigeBranch) return base;
  return base + Math.max(0, branchTier(branches, node.prestigeBranch) - (node.tier ?? 1));
}

/** All neighbours of a node (links are two-way). */
export function neighbours(tree: SkillTreeDefinition, id: string): string[] {
  const result = new Set<string>();
  for (const node of tree.nodes) {
    if (node.id === id) node.links.forEach((l) => result.add(l));
    else if (node.links.includes(id)) result.add(node.id);
  }
  return [...result];
}

export function getNode(tree: SkillTreeDefinition, id: string): SkillNode {
  const node = tree.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown skill node "${id}"`);
  return node;
}

/** Ranks of a node; the start node always counts as learned. */
export function nodeRanks(tree: SkillTreeDefinition, learned: LearnedNodes, id: string): number {
  return id === tree.startNodeId ? Math.max(1, learned[id] ?? 0) : (learned[id] ?? 0);
}

export interface LearnBudget {
  readonly skillPoints: number;
  readonly harvesterEmber: number;
}

export type LearnBlockReason =
  | "maxed"
  | "notConnected"
  | "noSkillPoints"
  /** Keystones cost Harvester's Ember (none in the first run). */
  | "noEmber"
  /** The node's Prestige branch is not unlocked yet. */
  | "branchLocked"
  /** The other side of the node's fork is learned. */
  | "forkTaken";

/** Why the next rank of a node cannot be learned, or undefined if it can. */
export function learnBlockReason(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  id: string,
  budget: LearnBudget,
  branches: readonly string[] = [],
): LearnBlockReason | undefined {
  const node = getNode(tree, id);
  const ranks = nodeRanks(tree, learned, id);
  if (node.prestigeBranch && branchTier(branches, node.prestigeBranch) < (node.tier ?? 1)) {
    return "branchLocked";
  }
  if (ranks >= nodeMaxRanks(node, branches)) return "maxed";
  if (ranks === 0 && forkPartner(tree, learned, node)) return "forkTaken";
  const connected = ranks > 0 || neighbours(tree, id).some((n) => nodeRanks(tree, learned, n) > 0);
  if (!connected) return "notConnected";
  if (node.kind === "keystone") return budget.harvesterEmber >= 1 ? undefined : "noEmber";
  return budget.skillPoints >= 1 ? undefined : "noSkillPoints";
}

/** The learned node on the other side of a node's fork, if any. */
export function forkPartner(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  node: SkillNode,
): SkillNode | undefined {
  if (!node.fork) return undefined;
  return tree.nodes.find(
    (n) => n.fork === node.fork && n.id !== node.id && nodeRanks(tree, learned, n.id) > 0,
  );
}

/** Start node of a class: its own place in the web, or the tree's shared start. */
export function classStartNode(tree: SkillTreeDefinition, classId: string): string | undefined {
  return tree.classStarts?.[classId] ?? tree.startNodeId;
}

/** Learned nodes of a fresh hero of a class: its start node, if the tree has class starts. */
export function startingNodes(tree: SkillTreeDefinition, classId: string): LearnedNodes {
  const start = tree.classStarts?.[classId];
  return start ? { [start]: 1 } : {};
}

export type ForgetBlockReason =
  | "notLearned"
  /** The class's start node stays. */
  | "start"
  /** Other learned nodes hang on this one: forget them first. */
  | "holdsOthers";

/**
 * Why one rank of a node cannot be forgotten (single-node respec), or undefined if it can. A
 * node's last rank can only go if every other learned node still connects to the start.
 */
export function forgetBlockReason(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  id: string,
  start: string | undefined,
): ForgetBlockReason | undefined {
  const ranks = nodeRanks(tree, learned, id);
  if (ranks <= 0) return "notLearned";
  if (id === start || id === tree.startNodeId) return "start";
  if (ranks > 1) return undefined;
  const rest = new Set(
    tree.nodes.filter((n) => n.id !== id && nodeRanks(tree, learned, n.id) > 0).map((n) => n.id),
  );
  if (rest.size === 0) return undefined;
  const roots = [start, tree.startNodeId].filter((r): r is string => !!r && rest.has(r));
  // A tree without any start: every learned node must still touch another one.
  const seen = new Set<string>(roots.length ? roots : [...rest].slice(0, 1));
  const queue = [...seen];
  while (queue.length) {
    const next = queue.pop() ?? "";
    for (const n of neighbours(tree, next)) {
      if (rest.has(n) && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen.size === rest.size ? undefined : "holdsOthers";
}

/**
 * Cheapest way to `target` (level-v2.md: the path preview): the nodes to learn in order, the
 * target last. Empty if the target is learned already, undefined if no path is open (a fork's
 * other side, a locked Prestige branch). Keystones are never travelled through.
 */
export function learnPath(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  target: string,
  branches: readonly string[] = [],
): string[] | undefined {
  if (nodeRanks(tree, learned, target) > 0) return [];
  const graph = new Map<string, string[]>(tree.nodes.map((n) => [n.id, []]));
  for (const node of tree.nodes) {
    for (const l of node.links) {
      graph.get(node.id)?.push(l);
      graph.get(l)?.push(node.id);
    }
  }
  const open = (node: SkillNode) =>
    !forkPartner(tree, learned, node) &&
    !(node.prestigeBranch && branchTier(branches, node.prestigeBranch) < (node.tier ?? 1)) &&
    (node.kind !== "keystone" || node.id === target);
  const from = new Map<string, string | null>();
  const queue = tree.nodes.filter((n) => nodeRanks(tree, learned, n.id) > 0).map((n) => n.id);
  for (const id of queue) from.set(id, null);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i] ?? "";
    if (id !== target && from.get(id) !== null && getNode(tree, id).kind === "keystone") continue;
    for (const next of graph.get(id) ?? []) {
      if (from.has(next) || !open(getNode(tree, next))) continue;
      from.set(next, id);
      if (next === target) {
        const path: string[] = [];
        for (let at: string | null = next; at && from.get(at) !== null; at = from.get(at) ?? null) {
          path.unshift(at);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return undefined;
}

/** What learning one more rank costs. */
export function learnCost(node: SkillNode): LearnBudget {
  return node.kind === "keystone"
    ? { skillPoints: 0, harvesterEmber: 1 }
    : { skillPoints: 1, harvesterEmber: 0 };
}

/** Learns one rank per id in order. Throws if one of them is not learnable. */
export function learnNodes(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  ids: readonly string[],
  budget: LearnBudget,
  branches: readonly string[] = [],
): { readonly learned: LearnedNodes; readonly budget: LearnBudget } {
  let current: Record<string, number> = { ...learned };
  let left = budget;
  for (const id of ids) {
    const reason = learnBlockReason(tree, current, id, left, branches);
    if (reason) throw new Error(`Cannot learn "${id}": ${reason}`);
    const cost = learnCost(getNode(tree, id));
    current = { ...current, [id]: nodeRanks(tree, current, id) + 1 };
    left = {
      skillPoints: left.skillPoints - cost.skillPoints,
      harvesterEmber: left.harvesterEmber - cost.harvesterEmber,
    };
  }
  return { learned: current, budget: left };
}

/** Learned nodes with their ranks, start node included. */
function learnedList(tree: SkillTreeDefinition, learned: LearnedNodes) {
  return tree.nodes
    .map((node) => ({ node, ranks: nodeRanks(tree, learned, node.id) }))
    .filter((e) => e.ranks > 0);
}

/** Learned nodes that are not replaced by a learned upgrade (Greater Keystones and the like). */
function activeList(tree: SkillTreeDefinition, learned: LearnedNodes) {
  const list = learnedList(tree, learned);
  const replaced = new Set(list.flatMap(({ node }) => (node.replaces ? [node.replaces] : [])));
  return list.filter(({ node }) => !replaced.has(node.id));
}

/** Stat bonuses from learned nodes for a weapon range. */
export function treeBonuses(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  weaponRange: "melee" | "ranged",
): Required<StatBonuses> {
  const sets: StatBonuses[] = [];
  for (const { node, ranks } of learnedList(tree, learned)) {
    if (!node.bonuses || (node.weaponRange && node.weaponRange !== weaponRange)) continue;
    for (let i = 0; i < ranks; i++) sets.push(node.bonuses);
  }
  return sumBonuses(...sets);
}

/** Trigger effects from learned nodes for a weapon range. */
export function treeTriggers(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  weaponRange: "melee" | "ranged",
): TriggerSpec[] {
  return activeList(tree, learned).flatMap(({ node }) =>
    node.triggers && (!node.weaponRange || node.weaponRange === weaponRange) ? node.triggers : [],
  );
}

/** The nodes of a Prestige branch. */
export function prestigeBranchNodes(tree: SkillTreeDefinition, branchId: string): SkillNode[] {
  return tree.nodes.filter((n) => n.prestigeBranch === branchId);
}

/** Keystones the hero has learned and that are not replaced by a higher tier. */
export function learnedKeystones(tree: SkillTreeDefinition, learned: LearnedNodes): SkillNode[] {
  return activeList(tree, learned)
    .map((e) => e.node)
    .filter((n) => n.keystone);
}

/** Skills unlocked by Skill nodes, with their ranks. */
export function treeSkills(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
): { readonly skill: SkillDefinition; readonly ranks: number }[] {
  return learnedList(tree, learned).flatMap(({ node, ranks }) =>
    node.skill ? [{ skill: node.skill, ranks }] : [],
  );
}

/** Rules of all learned Keystones (and rule nodes) combined. */
export function keystoneRules(tree: SkillTreeDefinition, learned: LearnedNodes): CombatRules {
  return mergeRules(
    ...activeList(tree, learned).flatMap(({ node }) => [node.keystone, node.rules]),
  );
}
