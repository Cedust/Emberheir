import { COMBAT } from "../../combat/constants";
import { ATTRIBUTES, type Attribute, type Attributes, type SlotModifier } from "../../combat/types";
import { ATTRIBUTE_RULES, attributeFloor, attributeProblem, sumAttributes } from "../attributes";
import {
  battlePlanUnlocks,
  CAPSTONES,
  modifierAllowed,
  reactionCondition,
  reactionConditionAllowed,
  SLOT_MODIFIERS,
  slotCondition,
  type BattlePlanState,
} from "../battle-plan";
import { PROGRESSION } from "../constants";
import { autoRewards, bossLevel, killPrice } from "../leveling";
import {
  forgetBlockReason,
  getNode,
  learnBudget,
  learnCost,
  learnNodes,
  startingNodes,
  type LearnedNodes,
} from "../skill-tree";
import { EMPTY_MASTERY, learnMastery, pointsSpent, type MasteryState } from "../weapon-mastery";
import { requireCamp } from "./guards";
import { returnLooseWebRunes } from "./web-runes";
import { heroClassOf, heroSetup, heroWeaponRank, knownSkills, masteryTree } from "./hero-build";
import { fail, type GameData, type GameState } from "./state";

/** Kaelen and the hero's points: attributes, Skill Tree, Weapon Mastery, Battle Plan, respecs. */

export function allocateAttributes(state: GameState, points: Partial<Attributes>): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  let total = 0;
  const attributes: Record<Attribute, number> = { ...state.hero.attributes };
  for (const a of ATTRIBUTES) {
    const n = points[a] ?? 0;
    if (!Number.isInteger(n) || n < 0) return fail("Points must be whole and positive");
    attributes[a] += n;
    total += n;
    if (n > 0 && attributes[a] > ATTRIBUTE_RULES.max) {
      return fail(`At most ${ATTRIBUTE_RULES.max} points`);
    }
  }
  if (total > state.hero.unspentAttributePoints) return fail("Not enough Attribute Points");
  return {
    ...state,
    hero: {
      ...state.hero,
      attributes,
      unspentAttributePoints: state.hero.unspentAttributePoints - total,
    },
  };
}

/** Kaelen travels with the caravan from the first Camp on; the Skill Tree is Camp-only. */
export function requireTrainer(state: GameState): void {
  requireCamp(state);
}

/** The Battle Plan can be changed in the Camp and between stages, never mid-fight. */
function requirePlanEdit(state: GameState): void {
  if (state.pendingPrestige) fail("The harvest comes first");
  if (state.run?.phase === "fight") fail("Not during a fight");
}

export function learn(state: GameState, data: GameData, nodeIds: readonly string[]): GameState {
  requireTrainer(state);
  let result: ReturnType<typeof learnNodes>;
  try {
    result = learnNodes(
      data.skillTree,
      state.hero.learned,
      nodeIds,
      learnBudget(
        data.skillTree,
        state.hero.learned,
        state.hero.unspentSkillPoints,
        state.legacy.prestige,
      ),
      state.legacy.branches,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  return {
    ...state,
    hero: {
      ...state.hero,
      learned: result.learned,
      unspentSkillPoints: result.budget.skillPoints,
    },
  };
}

/**
 * Skill Points spent in the tree. The start node is free: the tree's shared one, or the class's
 * own (`classId`).
 */
export function spentInTree(data: GameData, learned: LearnedNodes, classId?: string): number {
  let skillPoints = 0;
  const own = classId ? data.skillTree.classStarts?.[classId] : undefined;
  for (const node of data.skillTree.nodes) {
    if (node.id === data.skillTree.startNodeId || node.id === own) continue;
    skillPoints += (learned[node.id] ?? 0) * learnCost(node).skillPoints;
  }
  return skillPoints;
}

/**
 * Acorns for a full Skill Tree respec at Kaelen (level-v2.md section 7): moderate, about the Acorns of
 * a few normal kills at the run's boss level, so it grows with every run.
 */
export function respecAcorns(prestige: number): number {
  return autoRewards(bossLevel(prestige), "normal").acorns * PROGRESSION.respecKills;
}

/** Acorns to forget one rank of one node. */
export function forgetAcorns(prestige: number): number {
  return Math.max(1, Math.round(respecAcorns(prestige) * PROGRESSION.respecNodeShare));
}

export function respecTree(state: GameState, data: GameData): GameState {
  requireTrainer(state);
  const spent = spentInTree(data, state.hero.learned, state.hero.classId);
  if (spent === 0) return fail("Nothing to respec");
  const price = respecAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  return returnLooseWebRunes({
    ...state,
    hero: {
      ...state.hero,
      learned: startingNodes(data.skillTree, state.hero.classId),
      unspentSkillPoints: state.hero.unspentSkillPoints + spent,
      // Tree skills are gone, so the Battle Plan falls back to the Start Skill.
      rotation: state.hero.rotation.map(() => null),
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  });
}

/** Kaelen: forget one rank of one node for a few Acorns (its points come back). */
export function forgetNode(state: GameState, data: GameData, nodeId: string): GameState {
  requireTrainer(state);
  const tree = data.skillTree;
  const node = getNode(tree, nodeId);
  const start = tree.classStarts?.[state.hero.classId];
  const reason = forgetBlockReason(tree, state.hero.learned, nodeId, start);
  if (reason) return fail(`Cannot forget "${nodeId}": ${reason}`);
  const price = forgetAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  const ranks = (state.hero.learned[nodeId] ?? 0) - 1;
  const learned = Object.fromEntries(
    Object.entries(state.hero.learned).filter(([id]) => id !== nodeId),
  );
  return returnLooseWebRunes({
    ...state,
    hero: {
      ...state.hero,
      learned: ranks > 0 ? { ...learned, [nodeId]: ranks } : learned,
      unspentSkillPoints: state.hero.unspentSkillPoints + learnCost(node).skillPoints,
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  });
}

/**
 * Kaelen: puts a Rune from the pouch into a learned Rune Socket of the web, or takes it out
 * (`runeId` null). A Rune already in the socket goes back into the pouch. Each Rune goes into one
 * socket at most.
 */
export function socketWebRune(
  state: GameState,
  data: GameData,
  nodeId: string,
  runeId: string | null,
): GameState {
  requireTrainer(state);
  const node = getNode(data.skillTree, nodeId);
  if (node.kind !== "socket") return fail(`"${nodeId}" is no Rune Socket`);
  if ((state.hero.learned[nodeId] ?? 0) <= 0) return fail("Learn the Rune Socket first");
  const runes: Record<string, number> = { ...state.wallet.runes };
  if (runeId !== null) {
    if (!data.items.runes.has(runeId)) return fail(`Unknown Rune "${runeId}"`);
    if ((runes[runeId] ?? 0) <= 0) return fail("That Rune is not in the pouch");
    // Each Rune works once in the Ash Tree (balancing-neustart-v1.md, step 2).
    const elsewhere = Object.entries(state.hero.webRunes ?? {}).some(
      ([id, r]) => id !== nodeId && r === runeId,
    );
    if (elsewhere) return fail("That Rune is already in another socket");
    runes[runeId] = (runes[runeId] ?? 0) - 1;
  }
  const old = state.hero.webRunes?.[nodeId];
  if (old) runes[old] = (runes[old] ?? 0) + 1;
  const sockets = Object.fromEntries(
    Object.entries(state.hero.webRunes ?? {}).filter(([id]) => id !== nodeId),
  );
  return {
    ...state,
    hero: { ...state.hero, webRunes: runeId ? { ...sockets, [nodeId]: runeId } : sockets },
    wallet: {
      ...state.wallet,
      runes: Object.fromEntries(Object.entries(runes).filter(([, n]) => n > 0)),
    },
  };
}

export function learnMasteryNode(state: GameState, data: GameData, nodeId: string): GameState {
  requireTrainer(state);
  const tree = masteryTree(data, state.hero.weaponId);
  let mastery: MasteryState;
  try {
    mastery = learnMastery(tree, state.hero.mastery, nodeId, heroWeaponRank(state));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  return { ...state, hero: { ...state.hero, mastery } };
}

export function respecMastery(state: GameState, data: GameData): GameState {
  requireTrainer(state);
  const { mastery } = state.hero;
  const tree = masteryTree(data, state.hero.weaponId);
  if (pointsSpent(tree, mastery) === 0 && Object.keys(mastery.choices).length === 0) {
    return fail("Nothing to respec");
  }
  const price = masteryRespecAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  return {
    ...state,
    hero: {
      ...state.hero,
      mastery: {
        ...EMPTY_MASTERY,
        echo: mastery.echo,
        ...(mastery.attunement ? { attunement: mastery.attunement } : {}),
        ...(mastery.bonusPoints ? { bonusPoints: mastery.bonusPoints } : {}),
      },
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}

/**
 * Attunement (phase 5): picks the element of the weapon's own hits among its paths' Infusions,
 * free and at any time in the Camp; `null` follows the path again. Wand and Staff only.
 */
export function setAttunement(state: GameState, data: GameData, pathId: string | null): GameState {
  requireTrainer(state);
  const tree = masteryTree(data, state.hero.weaponId);
  if (!tree.attunable) return fail("This weapon cannot be attuned");
  if (pathId !== null && !tree.paths.some((p) => p.id === pathId)) {
    return fail(`Unknown path "${pathId}"`);
  }
  const rest = Object.fromEntries(
    Object.entries(state.hero.mastery).filter(([k]) => k !== "attunement"),
  ) as MasteryState;
  const mastery = pathId === null ? rest : { ...rest, attunement: pathId };
  return { ...state, hero: { ...state.hero, mastery } };
}

export function setEcho(state: GameState, data: GameData, echoId: string | null): GameState {
  requireTrainer(state);
  if (echoId !== null) {
    if (!data.echoes.some((e) => e.id === echoId)) return fail(`Unknown Echo "${echoId}"`);
    if (!(state.legacy.echoes[echoId]?.stage ?? 0)) return fail("This Echo is not earned yet");
  }
  return { ...state, hero: { ...state.hero, mastery: { ...state.hero.mastery, echo: echoId } } };
}

export function setRotationSkill(
  state: GameState,
  data: GameData,
  slot: number,
  skillId: string | null,
): GameState {
  requirePlanEdit(state);
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.progress.rotationSlots) {
    return fail("No such Rotation Slot");
  }
  const weapon = heroSetup(state, data).setup.weapon;
  if (skillId !== null && !knownSkills(state, data, weapon).some((k) => k.skill.id === skillId)) {
    return fail("Unknown skill");
  }
  const rotation = Array.from(
    { length: state.progress.rotationSlots },
    (_, i) => state.hero.rotation[i] ?? null,
  );
  // A skill sits in one slot only.
  const filled = rotation.map((id) => (id === skillId && skillId !== null ? null : id));
  filled[slot] = skillId;
  return { ...state, hero: { ...state.hero, rotation: filled } };
}

/** Checks a Battle Plan against the unlocks; changing a chosen Capstone costs Acorns. */
export function setBattlePlan(state: GameState, data: GameData, plan: BattlePlanState): GameState {
  requirePlanEdit(state);
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const slots = state.progress.rotationSlots;
  const fit = <T>(list: readonly T[], length: number, empty: T): T[] =>
    Array.from({ length }, (_, i) => list[i] ?? empty);

  const thresholds = fit(plan.thresholds, slots, null);
  if (thresholds.some((t) => t !== null && (!unlocks.thresholds || !validThreshold(t)))) {
    return fail("Invalid Trigger Threshold");
  }
  const checkModifiers = (list: readonly (readonly SlotModifier[])[], length: number) => {
    const fitted = fit(list, length, [] as readonly SlotModifier[]);
    for (const mods of fitted) {
      if (mods.length > unlocks.modifiers || new Set(mods).size !== mods.length) {
        fail("Too many Slot Modifiers");
      }
      if (mods.some((m) => !SLOT_MODIFIERS.some((d) => d.id === m))) fail("Unknown Slot Modifier");
      if (mods.some((m) => !modifierAllowed(m, unlocks))) fail("Slot Modifier locked");
    }
    return fitted;
  };
  const modifiers = checkModifiers(plan.modifiers, slots);
  const conditions = fit(plan.conditions, slots, null);
  if (conditions.some((c) => c !== null && (!unlocks.conditions || !slotCondition(c)))) {
    return fail("Invalid Rotation Condition");
  }
  const weapon = heroSetup(state, data).setup.weapon;
  const known = knownSkills(state, data, weapon);
  const reactions = fit(plan.reactions, unlocks.reactionSlots, null);
  if (plan.reactions.slice(unlocks.reactionSlots).some((r) => r))
    return fail("Reaction Slot locked");
  for (const r of reactions) {
    if (!r) continue;
    if (!known.some((k) => k.skill.id === r.skillId)) return fail("Unknown skill");
    if (!reactionCondition(r.conditionId)) return fail("Unknown Reaction condition");
    if (!reactionConditionAllowed(r.conditionId, unlocks)) return fail("Reaction condition locked");
  }
  const reactionModifiers = checkModifiers(plan.reactionModifiers, unlocks.reactionSlots);
  const openingMove = plan.openingMove ?? null;
  if (openingMove !== null) {
    if (!unlocks.openingMove) return fail("Opening Move locked");
    if (!known.some((k) => k.skill.id === openingMove)) return fail("Unknown skill");
  }

  const capstone = plan.capstone;
  let acorns = state.wallet.acorns;
  if (capstone) {
    if (!unlocks.capstone) return fail("Capstone locked");
    if (!CAPSTONES.some((c) => c.id === capstone.id)) return fail("Unknown Capstone");
    if (!Number.isInteger(capstone.slot) || capstone.slot < 0 || capstone.slot >= slots) {
      return fail("No such Rotation Slot");
    }
    const old = state.hero.plan.capstone;
    if (old && old.id !== capstone.id) {
      const price = capstoneChangeAcorns(state.legacy.prestige);
      if (acorns < price) return fail("Not enough Acorns");
      acorns -= price;
    }
  } else if (state.hero.plan.capstone) {
    return fail("A Capstone cannot be removed");
  }
  return {
    ...state,
    hero: {
      ...state.hero,
      plan: {
        thresholds,
        modifiers,
        conditions,
        reactions,
        reactionModifiers,
        capstone: capstone ? { id: capstone.id, slot: capstone.slot } : null,
        openingMove,
      },
    },
    wallet: { ...state.wallet, acorns },
  };
}

function validThreshold(t: number): boolean {
  return Number.isFinite(t) && t >= 0 && t <= COMBAT.maxHeat;
}

/**
 * Acorns for setting all Attribute Points anew at Kaelen: the same as a full Skill Tree respec, so
 * every respec follows one rule (entschlackung-v1.md).
 */
export const attributeRespecAcorns = (prestige: number) => respecAcorns(prestige);

/** Acorns for a Mastery respec at Kaelen: the same one rule (economy-audit-v1.md E1). */
export const masteryRespecAcorns = (prestige: number) => respecAcorns(prestige);

/** Acorns for switching to another Capstone: a few kills at the run's boss level. */
export function capstoneChangeAcorns(prestige: number): number {
  return killPrice(bossLevel(prestige), { acorns: PROGRESSION.capstoneChangeKills }).acorns;
}

/**
 * Attribute respec at Kaelen: every point above the Class Array comes back and is set anew,
 * for Acorns.
 */
export function respecAttributes(
  state: GameState,
  data: GameData,
  attributes: Attributes,
): GameState {
  requireTrainer(state);
  const price = attributeRespecAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) fail("Not enough Acorns");
  const { hero } = state;
  const floor = attributeFloor(heroClassOf(state, data).startingAttributes, hero.lineage);
  const points =
    sumAttributes(hero.attributes) - sumAttributes(floor) + hero.unspentAttributePoints;
  const problem = attributeProblem(attributes, { floor, current: floor, points });
  if (problem) fail(problem);
  return {
    ...state,
    hero: {
      ...hero,
      attributes,
      unspentAttributePoints: points - (sumAttributes(attributes) - sumAttributes(floor)),
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}
