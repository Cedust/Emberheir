import {
  applyAction,
  battlePlanUnlocks,
  forkPartner,
  type GameData,
  type GameState,
  getNode,
  heroSetup,
  knownSkills,
  learnBlockReason,
  type LearnedNodes,
  nodeMaxRanks,
  type SlotModifier,
} from "@emberheir/sim";
import { spendMastery } from "./autopilot";
import { type BuildPlan } from "./builds";

/** The autopilot at Kaelen: Skill Tree paths to the build's goals, then the Battle Plan. */

const adjacency = new WeakMap<GameData["skillTree"], Map<string, string[]>>();

/** Neighbours of every node, built once per tree (the web is too big for `neighbours`). */
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
      if (node.kind === "keystone" || forkPartner(tree, learned, node)) continue;
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
  const node = getNode(data.skillTree, id);
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

/** Nodes that make the hero harder to kill (Ward buds, Life, Armor, Barrier, Evasion). */
function isDefenseNode(node: { readonly bonuses?: object; readonly keystone?: object }): boolean {
  return Object.keys(node.bonuses ?? {}).some((k) => DEFENSE_STATS.has(k));
}

/**
 * Kaelen: spends Skill Points on the build's goals in order (the owned Prestige branches where the
 * plan says "@branches"), then on the nearest open nodes (no Keystones). Fills the Rotation, a
 * Reaction and the Slot Modifiers.
 */
export function spendSkillPoints(
  state: GameState,
  data: GameData,
  plan: BuildPlan | undefined,
): GameState {
  if (!plan || state.run) return state;
  let s = spendMastery(state, data);
  const tree = data.skillTree;
  for (const target of plan.nodes) {
    if (target !== "@branches") {
      s = fillNode(s, data, target);
      continue;
    }
    const branchNodes = plan.branches
      .filter((b) => s.legacy.branches.includes(b))
      .flatMap((b) => tree.nodes.filter((n) => n.prestigeBranch === b && n.kind !== "keystone"));
    for (const node of branchNodes) s = fillNode(s, data, node.id);
  }
  // The rest: the cheapest open neighbour, again and again (Skill nodes and Notables first).
  const graph = links(tree);
  const order = { skill: 0, notable: 1, minor: 2, keystone: 3 } as const;
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
    // Within a kind, defense first: a player stuck at a wall takes Life, Armor and Barrier.
    const rank = (n: (typeof open)[number]) => 2 * order[n.kind] + (isDefenseNode(n) ? 0 : 1);
    const next = open.sort((a, b) => rank(a) - rank(b))[0];
    if (!next) break;
    s = applyAction(s, data, { type: "learnNodes", nodeIds: [next.id] });
  }
  const weapon = heroSetup(s, data).setup.weapon;
  const known = new Set(knownSkills(s, data, weapon).map((k) => k.skill.id));
  const rotation = plan.rotation.filter((id) => known.has(id));
  for (let slot = 1; slot < s.progress.rotationSlots; slot++) {
    const skillId = rotation[slot - 1];
    if (skillId && s.hero.rotation[slot] !== skillId) {
      s = applyAction(s, data, { type: "setRotationSkill", slot, skillId });
    }
  }
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
