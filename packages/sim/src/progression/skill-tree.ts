import type { CombatRules, SkillDefinition, StatBonuses } from "../combat/types";
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
}

export interface SkillTreeDefinition {
  readonly nodes: readonly SkillNode[];
  /** Learned for free at the start. */
  readonly startNodeId: string;
}

/** Ranks per node id. */
export type LearnedNodes = Readonly<Record<string, number>>;

export const nodeMaxRanks = (node: SkillNode) => node.maxRanks ?? 1;

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
  | "noEmber";

/** Why the next rank of a node cannot be learned, or undefined if it can. */
export function learnBlockReason(
  tree: SkillTreeDefinition,
  learned: LearnedNodes,
  id: string,
  budget: LearnBudget,
): LearnBlockReason | undefined {
  const node = getNode(tree, id);
  const ranks = nodeRanks(tree, learned, id);
  if (ranks >= nodeMaxRanks(node)) return "maxed";
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
): { readonly learned: LearnedNodes; readonly budget: LearnBudget } {
  let current: Record<string, number> = { ...learned };
  let left = budget;
  for (const id of ids) {
    const reason = learnBlockReason(tree, current, id, left);
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

/** Keystones the hero has learned. */
export function learnedKeystones(tree: SkillTreeDefinition, learned: LearnedNodes): SkillNode[] {
  return learnedList(tree, learned)
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

/** Rules of all learned Keystones combined. */
export function keystoneRules(tree: SkillTreeDefinition, learned: LearnedNodes): CombatRules {
  let damageTaken = 0;
  let skillCostMultiplier = 1;
  let defaultAttackDamage = 1;
  let noHeatDecay = false;
  let critsApplyBleed = false;
  let critChanceMultiplier = 1;
  for (const node of learnedKeystones(tree, learned)) {
    const k = node.keystone ?? {};
    damageTaken += k.damageTaken ?? 0;
    skillCostMultiplier *= k.skillCostMultiplier ?? 1;
    defaultAttackDamage *= k.defaultAttackDamage ?? 1;
    noHeatDecay ||= k.noHeatDecay ?? false;
    critsApplyBleed ||= k.critsApplyBleed ?? false;
    critChanceMultiplier *= k.critChanceMultiplier ?? 1;
  }
  return {
    damageTaken,
    skillCostMultiplier,
    defaultAttackDamage,
    noHeatDecay,
    critsApplyBleed,
    critChanceMultiplier,
  };
}
