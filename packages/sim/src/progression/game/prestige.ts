import { type Attributes } from "../../combat/types";
import { attributeFloor, attributeProblem, sumAttributes } from "../attributes";
import { EMPTY_BOONS } from "../boons";
import { PROGRESSION } from "../constants";
import {
  branchTier,
  MAX_BRANCH_TIER,
  type PrestigeBranchDefinition,
  SIDE_BRANCH_TIER,
} from "../skill-tree";
import { prestigeRewards } from "./acts";
import { DRAUGHT_FROM_PRESTIGE } from "../draughts";
import { flaskCapacity } from "./flask";
import { heroClassOf, heroTitle } from "./hero-build";
import { fail, type GameData, type GameState, type Notice } from "./state";

/** The Prestige: the next generation inherits, branches open. */

/**
 * Masteries the coming Harvest can pick (klassengeruest-v1.md 5): at the first Harvest any of
 * the class's three; later the main Mastery one tier deeper (up to V) or Tier I of another.
 */
export function openBranches(state: GameState, data: GameData): PrestigeBranchDefinition[] {
  const all = data.skillTree.prestigeBranches ?? [];
  const owned = state.legacy.branches;
  const main = owned[0];
  return heroClassOf(state, data)
    .branches.map((id) => all.find((b) => b.id === id))
    .filter((b): b is PrestigeBranchDefinition => b !== undefined)
    .filter(
      (b) =>
        branchTier(owned, b.id) <
        (main === undefined || b.id === main ? MAX_BRANCH_TIER : SIDE_BRANCH_TIER),
    );
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
    floor: attributeFloor(heroClassOf(state, data).startingAttributes, hero.lineage),
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
          // The act boss fell before every Prestige: Liora is there.
          met: state.progress.met.includes("liora")
            ? state.progress.met
            : [...state.progress.met, "liora"],
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
    // Liora brews her first Draughts (draughts-einfuehrung-v1.md).
    ...(prestige === DRAUGHT_FROM_PRESTIGE && data.draughts?.length
      ? { blips: [...(state.blips ?? []), "liora-draughts" as const] }
      : {}),
  };
}
