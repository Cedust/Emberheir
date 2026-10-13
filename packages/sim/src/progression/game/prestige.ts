import type { Attributes } from "../../combat/types";
import { attributeProblem, sumAttributes } from "../attributes";
import { EMPTY_BOONS } from "../boons";
import { PROGRESSION } from "../constants";
import { type PrestigeBranchDefinition, branchTier, MAX_BRANCH_TIER } from "../skill-tree";
import { prestigeRewards } from "./acts";
import { heroClassOf, heroTitle } from "./hero-build";
import { flaskCapacity } from "./run";
import { type GameData, type GameState, type Notice, fail } from "./state";

/**
 * Prestige branches the coming Prestige can pick (skilltree-v2.md): the class's branches
 * (klassen-v2.md), new ones and owned ones that can be deepened one tier, in the class's order.
 */
export function openBranches(state: GameState, data: GameData): PrestigeBranchDefinition[] {
  const all = data.skillTree.prestigeBranches ?? [];
  return heroClassOf(state, data)
    .branches.map((id) => all.find((b) => b.id === id))
    .filter((b): b is PrestigeBranchDefinition => b !== undefined)
    .filter((b) => branchTier(state.legacy.branches, b.id) < MAX_BRANCH_TIER);
}

/**
 * Prestige (Playtest 2): the world burns, the Heir's gear does not. Level, points, items, stash,
 * currencies, Skill Tree, Battle Plan and Ember all stay; act progress, the run and its Boons end.
 */
export function doPrestige(
  state: GameState,
  data: GameData,
  branchId: string | undefined,
  attributes: Attributes | undefined,
): GameState {
  const pending = state.pendingPrestige ?? fail("No Prestige pending");
  const open = openBranches(state, data);
  if (branchId === undefined ? open.length > 0 : !open.some((b) => b.id === branchId)) {
    return fail("Choose an open Prestige branch");
  }
  const prestige = state.legacy.prestige + 1;
  const rewards = prestigeRewards(data, prestige);
  const chronicle = [
    ...state.legacy.chronicle,
    {
      generation: prestige,
      title: heroTitle(state, data),
      level: state.hero.level,
      deaths: state.stats.deaths - state.legacy.chronicle.reduce((n, c) => n + c.deaths, 0),
      enemyName: pending.enemyName,
    },
  ];
  const notice: Notice = {
    kind: "prestige",
    actId: pending.actId,
    stage: pending.stage,
    enemyName: pending.enemyName,
  };
  const final = prestige >= PROGRESSION.finalPrestige;
  // The Harvest: new points to spend now or later.
  const { hero } = state;
  const points = hero.unspentAttributePoints + rewards.attributePoints;
  const next = attributes ?? hero.attributes;
  const problem = attributeProblem(next, {
    floor: heroClassOf(state, data).startingAttributes,
    current: hero.attributes,
    points,
  });
  if (problem) fail(problem);
  return {
    ...state,
    hero: {
      ...hero,
      attributes: next,
      unspentAttributePoints: points - (sumAttributes(next) - sumAttributes(hero.attributes)),
      unspentSkillPoints: hero.unspentSkillPoints + rewards.skillPoints,
    },
    flaskCharges: flaskCapacity(state, data),
    // The final Prestige (prestige-counting) keeps the cleared world for The Last Ember.
    progress: final
      ? {
          ...state.progress,
          rotationSlots: Math.max(state.progress.rotationSlots, rewards.rotationSlots),
        }
      : {
          ...state.progress,
          actsCleared: [],
          deathsInAct: 0,
          trainerUnlocked: true,
          rotationSlots: Math.max(state.progress.rotationSlots, rewards.rotationSlots),
          waymarks: [],
        },
    run: null,
    legacy: {
      ...state.legacy,
      prestige,
      branches: branchId ? [...state.legacy.branches, branchId] : state.legacy.branches,
      chronicle,
    },
    pendingPrestige: null,
    // The Boons burn with the rest of the run.
    boons: EMPTY_BOONS,
    notice,
  };
}
