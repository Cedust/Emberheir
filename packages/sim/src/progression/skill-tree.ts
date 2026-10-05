import { mergeRules } from "../combat/rules";
import type { CombatRules, SkillDefinition, StatBonuses, TriggerSpec } from "../combat/types";
import { sumBonuses } from "../combat/stats";

/** Skill Tree data (docs/design/skill-tree-v1.md). PoC: Core + Might + Arcana. */

export type SkillTreeBranch = "core" | "might" | "arcana" | "rupture" | "affliction";
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

/**
 * One Resonance step (skilltree-v2.md): with `at` or more tiers of Prestige branches on the same
 * base branch, the hero gets these bonuses and rules. `requires` limits it to a learned node
 * (the base branch's Keystone).
 */
export interface ResonanceStep {
  readonly at: number;
  readonly description: string;
  readonly bonuses?: StatBonuses;
  readonly rules?: CombatRules;
  readonly requires?: string;
}

export interface SkillTreeDefinition {
  readonly nodes: readonly SkillNode[];
  /** Learned for free at the start. */
  readonly startNodeId: string;
  readonly prestigeBranches?: readonly PrestigeBranchDefinition[];
  readonly resonance?: Partial<Record<SkillTreeBranch, readonly ResonanceStep[]>>;
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
 * Ranks a point can be put into. Each deepening of a Prestige branch gives its Minor nodes from
 * lower tiers one more rank.
 */
export function nodeMaxRanks(node: SkillNode, branches: readonly string[] = []): number {
  const base = node.maxRanks ?? 1;
  if (node.kind !== "minor" || !node.prestigeBranch) return base;
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
  | "branchLocked";

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
  const connected = ranks > 0 || neighbours(tree, id).some((n) => nodeRanks(tree, learned, n) > 0);
  if (!connected) return "notConnected";
  if (node.kind === "keystone") return budget.harvesterEmber >= 1 ? undefined : "noEmber";
  return budget.skillPoints >= 1 ? undefined : "noSkillPoints";
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

/** Tiers of Prestige branches per base branch: what Resonance counts. */
export function resonanceCounts(
  tree: SkillTreeDefinition,
  branches: readonly string[],
): Partial<Record<SkillTreeBranch, number>> {
  const counts: Partial<Record<SkillTreeBranch, number>> = {};
  for (const id of branches) {
    const def = tree.prestigeBranches?.find((b) => b.id === id);
    if (def) counts[def.branch] = (counts[def.branch] ?? 0) + 1;
  }
  return counts;
}

/** Resonance steps the hero has reached, with the base branch they belong to. */
export function activeResonance(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  branches: readonly string[],
): { readonly branch: SkillTreeBranch; readonly step: ResonanceStep }[] {
  const counts = resonanceCounts(tree, branches);
  const result: { branch: SkillTreeBranch; step: ResonanceStep }[] = [];
  for (const [branch, steps] of Object.entries(tree.resonance ?? {}) as [
    SkillTreeBranch,
    readonly ResonanceStep[],
  ][]) {
    for (const step of steps) {
      if ((counts[branch] ?? 0) < step.at) continue;
      if (step.requires && nodeRanks(tree, learned, step.requires) === 0) continue;
      result.push({ branch, step });
    }
  }
  return result;
}

/** Bonuses and rules of the reached Resonance steps. */
export function resonanceEffects(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  branches: readonly string[],
): { readonly bonuses: Required<StatBonuses>; readonly rules: CombatRules } {
  const steps = activeResonance(tree, learned, branches).map((r) => r.step);
  return {
    bonuses: sumBonuses(...steps.map((s) => s.bonuses ?? {})),
    rules: mergeRules(...steps.map((s) => s.rules)),
  };
}
