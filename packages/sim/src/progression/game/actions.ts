import type { Attributes } from "../../combat/types";
import { type EquipmentSlot } from "../../items/types";
import { type BattlePlanState } from "../battle-plan";
import { type CraftRequest, craft } from "../crafting";
import { type GridPosition } from "../inventory";
import {
  discard,
  equipFromInventory,
  moveItem,
  placeItem,
  salvage,
  sortStash,
  unequip,
} from "./item-actions";
import { doPrestige } from "./prestige";
import { resolveFight, turnInBounty } from "./resolve";
import { pickBoon, pickItem, salvageAll } from "./rewards";
import {
  chooseDraught,
  continueRun,
  enterFinale,
  retreat,
  setOut,
  setOutWildfire,
  startStage,
  useFlask,
} from "./run";
import { type GameData, type GameState, type RunPhase, type RunState, fail } from "./state";
import {
  allocateAttributes,
  forgetNode,
  learn,
  learnMasteryNode,
  respecAttributes,
  respecMastery,
  respecTree,
  setBattlePlan,
  setEcho,
  setRotationSkill,
} from "./trainer";

export type GameAction =
  /** Leave the Camp and start an act at stage 1. */
  | { readonly type: "setOut"; readonly actId: string; readonly wildfire?: number }
  /** Turn in a done bounty at the Scout. */
  | { readonly type: "turnInBounty" }
  /** Camp: the Draught to brew at every set-out (`null` = none). */
  | { readonly type: "chooseDraught"; readonly draughtId: string | null }
  /** The Last Ember: from the Camp into the finale's gauntlet. */
  | { readonly type: "enterFinale" }
  /** From the intermission into the next fight. */
  | { readonly type: "startStage" }
  /** Resolve the current fight (the UI calls this when its replay ends). */
  | { readonly type: "resolveFight" }
  /** Back to Camp mid-act (works like a death, but costs no Pity). */
  | { readonly type: "retreat" }
  | {
      readonly type: "pickItem";
      readonly index: number;
      readonly mode: "equip" | "take";
      /** Equip into this slot (the other Ring). */
      readonly slot?: EquipmentSlot;
    }
  | { readonly type: "salvageAll" }
  | { readonly type: "pickBoon"; readonly index: number }
  /** After the rewards: on to the next stage (or back to Camp after the boss). */
  | { readonly type: "continue" }
  | { readonly type: "useFlask" }
  | { readonly type: "allocateAttributes"; readonly points: Partial<Attributes> }
  /** From inventory or (Camp) stash; `slot` picks the Ring slot or a drop target. */
  | { readonly type: "equip"; readonly itemId: string; readonly slot?: EquipmentSlot }
  /** Back into the inventory, at `at` when dropped on a cell. */
  | { readonly type: "unequip"; readonly slot: EquipmentSlot; readonly at?: GridPosition }
  /** Thoric (Camp only): salvage an inventory item; its trigger parts go into the Codex. */
  | { readonly type: "salvage"; readonly itemId: string }
  /** Throw an inventory item away. Gives nothing. */
  | { readonly type: "discard"; readonly itemId: string }
  /** Drag & drop inside the inventory or the stash. */
  | { readonly type: "placeItem"; readonly itemId: string; readonly at: GridPosition }
  | { readonly type: "learnNodes"; readonly nodeIds: readonly string[] }
  /** Kaelen: forget all Skill Tree nodes for Acorns (points and Ember come back). */
  | { readonly type: "respecTree" }
  /** Kaelen: forget one rank of one node for a few Acorns (`forgetAcorns`). */
  | { readonly type: "forgetNode"; readonly nodeId: string }
  /** Kaelen, Weapon Mastery: learn a node or pick it in its group (Heat Form, Keystone ...). */
  | { readonly type: "learnMastery"; readonly nodeId: string }
  /** Kaelen: forget the Weapon Mastery for Acorns. The worn Echo stays. */
  | { readonly type: "respecMastery" }
  /** Kaelen: wear an earned Echo on the weapon (or none). */
  | { readonly type: "setEcho"; readonly echoId: string | null }
  /** Supply Wagon (Camp only): move an item between inventory and stash. */
  | {
      readonly type: "moveItem";
      readonly itemId: string;
      readonly to: "inventory" | "stash";
      readonly at?: GridPosition;
    }
  | { readonly type: "sortStash" }
  /** Thoric and Liora (Camp only). */
  | { readonly type: "craft"; readonly request: CraftRequest }
  | { readonly type: "setRotationSkill"; readonly slot: number; readonly skillId: string | null }
  /** Kaelen: Thresholds, Modifiers, Conditions, Reaction Slots, Capstone. */
  | { readonly type: "setBattlePlan"; readonly plan: BattlePlanState }
  /** After the final boss: start the next generation. All items stay. */
  | {
      readonly type: "prestige";
      /** Prestige branch to unlock; required while branches are left. */
      readonly branchId?: string;
      /**
       * The Harvest (attribute-v1.md): the own attributes afterwards, with the new points spent.
       * Left out, the new points wait as unspent points.
       */
      readonly attributes?: Attributes;
    }
  /** Kaelen (Camp only): every Attribute Point anew, for Acorns like the trees. */
  | { readonly type: "respecAttributes"; readonly attributes: Attributes }
  | { readonly type: "dismissNotice" };

/** Applies one action. Throws `GameActionError` if the action is not allowed right now. */
export function applyAction(state: GameState, data: GameData, action: GameAction): GameState {
  switch (action.type) {
    case "setOut":
      return action.wildfire
        ? setOutWildfire(state, data, action.actId, action.wildfire)
        : setOut(state, data, action.actId);
    case "turnInBounty":
      return turnInBounty(state, data);
    case "chooseDraught":
      return chooseDraught(state, data, action.draughtId);
    case "enterFinale":
      return enterFinale(state, data);
    case "startStage":
      return startStage(state, data);
    case "resolveFight":
      return resolveFight(state, data);
    case "retreat":
      return retreat(state, data);
    case "pickItem":
      return pickItem(state, data, action.index, action.mode, action.slot);
    case "salvageAll":
      return salvageAll(state);
    case "pickBoon":
      return pickBoon(state, action.index);
    case "continue":
      return continueRun(state, data);
    case "useFlask":
      return useFlask(state, data);
    case "allocateAttributes":
      return allocateAttributes(state, action.points);
    case "equip":
      return equipFromInventory(state, data, action.itemId, action.slot);
    case "unequip":
      return unequip(state, data, action.slot, action.at);
    case "salvage":
      return salvage(state, data, action.itemId);
    case "discard":
      return discard(state, action.itemId);
    case "placeItem":
      return placeItem(state, data, action.itemId, action.at);
    case "learnNodes":
      return learn(state, data, action.nodeIds);
    case "respecTree":
      return respecTree(state, data);
    case "forgetNode":
      return forgetNode(state, data, action.nodeId);
    case "learnMastery":
      return learnMasteryNode(state, data, action.nodeId);
    case "respecMastery":
      return respecMastery(state, data);
    case "setEcho":
      return setEcho(state, data, action.echoId);
    case "moveItem":
      return moveItem(state, data, action.itemId, action.to, action.at);
    case "sortStash":
      return sortStash(state, data);
    case "craft":
      return craft(state, data, action.request);
    case "setRotationSkill":
      return setRotationSkill(state, data, action.slot, action.skillId);
    case "setBattlePlan":
      return setBattlePlan(state, data, action.plan);
    case "prestige":
      return doPrestige(state, data, action.branchId, action.attributes);
    case "respecAttributes":
      return respecAttributes(state, data, action.attributes);
    case "dismissNotice":
      return { ...state, notice: null };
  }
}

export function requireRun(state: GameState, ...phases: RunPhase[]): RunState {
  const run = state.run;
  if (!run) return fail("Not in a run");
  if (!phases.includes(run.phase)) return fail(`Not allowed during ${run.phase}`);
  return run;
}

export function requireCamp(state: GameState): void {
  if (state.run) fail("Only in the Camp");
  if (state.pendingPrestige) fail("The harvest comes first");
}
