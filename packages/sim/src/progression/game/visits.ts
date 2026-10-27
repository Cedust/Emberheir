import type { ItemSlot } from "../../items/types";
import type { Rng } from "../../rng";
import { battlePlanUnlocks } from "../battle-plan";
import { rollBoonOffer } from "../boons";
import { PROGRESSION } from "../constants";
import { gambleItem, gamblePrice, hasRoomFor, merchantSlots } from "../crafting";
import { DRAUGHT_FLASK_COST } from "../draughts";
import { type EventDefinition, type EventOption } from "../events";
import { addToGrid } from "../inventory";
import { autoRewards, gainXp, levelCap, xpForKill } from "../leveling";
import {
  currentNode,
  defaultNext,
  isQuiet,
  type MapOptions,
  nextNodes,
  nextWaymark,
} from "./act-map";
import { getAct, stageMonsterLevel } from "./acts";
import { getBounty } from "./bounty";
import { hasMet, meetMarisha } from "./companions";
import { flaskCapacity } from "./flask";
import { requireRun } from "./guards";
import { heroBoons, heroSetup, openBoonFamilies } from "./hero-build";
import { actAffixFactor, addRunes, rollItemChoices, rollRune } from "./loot";
import { tripOmenEffects } from "./omens";
import {
  type ActData,
  fail,
  type GameData,
  type GameState,
  nextRng,
  type Rewards,
  type RunState,
  runWithout,
} from "./state";

/** The quiet nodes of the act map (act-karte-entwurf-v1.md): Shrine, Hearth, Cache, Event, Marisha. */

/** Marisha on the Road gambles on this many slots, this much cheaper than in the Camp (Timo). */
export const ROAD_GAMBLE = { slots: 3, discount: 0.25 } as const;

/** Whether Shrines burn on this walk: not in a cleared act, not on a walk past the Gate. */
export function shrinesBurn(state: GameState, data: GameData, run: RunState): boolean {
  return (
    !run.wildfire &&
    !run.wanders &&
    (data.boons?.length ?? 0) > 0 &&
    !state.progress.actsCleared.includes(run.actId)
  );
}

/** What the act map of a walk may hold. */
export function mapOptions(state: GameState, data: GameData, run: RunState): MapOptions {
  const bounty = run.bounty?.status === "open" ? run.bounty : undefined;
  const goal = bounty ? getBounty(data, bounty.id).goal.kind : undefined;
  const hunts = huntOptions(state, data, run);
  return {
    shrines: shrinesBurn(state, data, run),
    thief: data.thief !== undefined && goal === "thief",
    events: (data.events?.length ?? 0) > 0,
    ...(hasMet(state, "marisha") ? {} : { marisha: true }),
    ...(hunts.hunts && goal === "trail" && bounty?.enemyId
      ? { hunts: { ...hunts.hunts, bounty: bounty.enemyId } }
      : hunts),
  };
}

/** The act's enemies that can be hunted, for the Hunt nodes (not in the Wildfire). */
function huntOptions(state: GameState, data: GameData, run: RunState): Pick<MapOptions, "hunts"> {
  const signatures = data.huntSignatures;
  if (!signatures || run.wildfire) return {};
  const enemyIds = getAct(data, run.actId)
    .enemies.map((e) => e.id)
    .filter((id) => signatures[id]?.length);
  return enemyIds.length ? { hunts: { enemyIds, kills: state.legacy.hunts ?? {} } } : {};
}

/** A Shrine's offer of three Boons. */
export function shrineOffer(state: GameState, data: GameData, act: ActData, rng: Rng) {
  return rollBoonOffer(
    data.boons ?? [],
    data.boonFamilies ?? [],
    {
      open: openBoonFamilies(data, act.number),
      active: heroBoons(state, data),
      damageType: heroSetup(state, data).setup.weapon.damageType,
      reactionSlot: battlePlanUnlocks(state.legacy.prestige).reactionSlots > 0,
    },
    rng,
  );
}

/** Rewards of a quiet node: no fight, only what the node gives. */
function quietRewards(extra: Partial<Rewards>): Rewards {
  const items = extra.items ?? [];
  return {
    rank: "normal",
    xp: 0,
    acorns: 0,
    ash: 0,
    emberCoal: 0,
    phoenixFeathers: 0,
    runes: [],
    levelsGained: 0,
    salvagedAsh: 0,
    ...extra,
    items,
    itemPick: items.length ? null : { kind: "salvageAll" },
  };
}

const level = (state: GameState, data: GameData, run: RunState) =>
  stageMonsterLevel(data, getAct(data, run.actId), run.stage, state.legacy.prestige);

/** Act Tier of the trip's Rune drops. */
const runeTier = (state: GameState, data: GameData, run: RunState) =>
  getAct(data, run.actId).number +
  state.legacy.prestige +
  (tripOmenEffects(state, data).bonus.runeTiers ?? 0);

/** The act's Home Rune (act-beute-entwurf-v1.md A1). */
const homeRune = (data: GameData, run: RunState) => getAct(data, run.actId).homeRune;

/** Flask charges the trip may hold: the Flask's capacity minus a brewed Draught. */
export function tripFlaskCapacity(state: GameState, data: GameData): number {
  return flaskCapacity(state, data) - (state.run?.draught ? DRAUGHT_FLASK_COST : 0);
}

/**
 * The hero arrives at the node of `run.stage`: a quiet node gets its visit (a Shrine's offer
 * waits like a fight's rewards). Fights wait for `startStage`.
 */
export function enterNode(state: GameState, data: GameData, run: RunState): GameState {
  const node = currentNode(run);
  if (!node || !isQuiet(node.kind)) return { ...state, run };
  const [rng, next] = nextRng(state);
  const act = getAct(data, run.actId);
  switch (node.kind) {
    case "shrine": {
      const boonOffer = shrineOffer(next, data, act, rng);
      if (!boonOffer.length)
        return { ...next, run: { ...run, visit: { kind: "shrine", done: true } } };
      return {
        ...next,
        run: {
          ...run,
          phase: "rewards",
          visit: { kind: "shrine", done: true },
          rewards: quietRewards({ boonOffer, boonPick: null }),
        },
      };
    }
    case "cache": {
      const rune = rollRune(data, runeTier(next, data, run), true, rng, homeRune(data, run));
      return {
        ...next,
        run: {
          ...run,
          visit: {
            kind: "cache",
            runes: rune ? [rune] : [],
            emberCoal: rng.int(...PROGRESSION.eliteEmberCoal),
          },
        },
      };
    }
    case "event": {
      const event = rollEvent(next, data, run, rng);
      if (!event) return { ...next, run: { ...run, visit: { kind: "event", done: true } } };
      return {
        ...next,
        run: {
          ...run,
          visit: { kind: "event", event: event.id },
          events: [...(run.events ?? []), event.id],
        },
      };
    }
    case "marisha": {
      const pool = [...merchantSlots(data)];
      const slots: ItemSlot[] = [];
      while (slots.length < ROAD_GAMBLE.slots && pool.length) {
        const [slot] = pool.splice(rng.int(0, pool.length - 1), 1);
        if (slot) slots.push(slot);
      }
      // Before she joined the caravan, every meeting on the road is one of her scenes.
      return meetMarisha({
        ...next,
        run: { ...run, visit: { kind: "marisha", slots, bought: [] } },
      });
    }
    default:
      return { ...next, run: { ...run, visit: { kind: node.kind } } };
  }
}

/** An Event the trip has not met yet (all again once every one was met). */
function rollEvent(
  state: GameState,
  data: GameData,
  run: RunState,
  rng: Rng,
): EventDefinition | undefined {
  const shrines = shrinesBurn(state, data, run);
  const all = (data.events ?? []).filter((e) => shrines || !e.shrine);
  const fresh = all.filter((e) => !run.events?.includes(e.id));
  const pool = fresh.length ? fresh : all;
  return pool[rng.int(0, pool.length - 1)];
}

export function getEvent(data: GameData, id: string): EventDefinition {
  return data.events?.find((e) => e.id === id) ?? fail(`Unknown event "${id}"`);
}

/** Acorns and Ash an Event asks, in normal fights of the stage. */
export function eventPrice(
  state: GameState,
  data: GameData,
  option: EventOption,
): { readonly acorns: number; readonly ash: number } {
  const run = state.run;
  if (!run) return { acorns: 0, ash: 0 };
  const drop = autoRewards(level(state, data, run), "normal");
  return {
    acorns: Math.round(drop.acorns * (option.cost?.acornFights ?? 0)),
    ash: Math.round(drop.ash * (option.cost?.ashFights ?? 0)),
  };
}

export type VisitBlockReason = "life" | "flask" | "flaskFull" | "acorns" | "ash" | "room" | "sold";

/** Why an Event's option cannot be taken right now (`undefined` = it can). */
export function eventBlockReason(
  state: GameState,
  data: GameData,
  option: EventOption,
): VisitBlockReason | undefined {
  const run = state.run;
  if (!run) return undefined;
  const cost = option.cost;
  // A price or a risk never takes the last of the Life.
  const lifeLoss = (cost?.life ?? 0) + (option.risk?.life ?? 0);
  if (lifeLoss > 0 && run.lifeFraction <= lifeLoss) return "life";
  if (cost?.flask && state.flaskCharges < cost.flask) return "flask";
  if (option.gain?.flask && state.flaskCharges >= tripFlaskCapacity(state, data)) {
    return "flaskFull";
  }
  const price = eventPrice(state, data, option);
  if (state.wallet.acorns < price.acorns) return "acorns";
  if (state.wallet.ash < price.ash) return "ash";
  return undefined;
}

/** Marisha on the Road: the price of one gamble (a quarter below the Camp's). */
export function roadGamblePrice(state: GameState, data: GameData): number {
  const run = state.run;
  const act = run ? getAct(data, run.actId) : undefined;
  if (!run || !act) return 0;
  return Math.round(
    gamblePrice(stageMonsterLevel(data, act, act.stages, state.legacy.prestige)) *
      (1 - ROAD_GAMBLE.discount),
  );
}

/** Why Marisha's offer `index` cannot be bought right now. */
export function roadGambleBlockReason(
  state: GameState,
  data: GameData,
  index: number,
): VisitBlockReason | undefined {
  const visit = state.run?.visit;
  const slot = visit?.slots?.[index];
  if (!slot) return "sold";
  if (visit?.bought?.includes(index)) return "sold";
  if (!hasRoomFor(state, data, slot)) return "room";
  if (state.wallet.acorns < roadGamblePrice(state, data)) return "acorns";
  return undefined;
}

/** Why a Hearth or Cache choice cannot be taken right now. */
export function nodeBlockReason(
  state: GameState,
  data: GameData,
  choice: number,
): VisitBlockReason | undefined {
  const run = state.run;
  const visit = run?.visit;
  if (!run || !visit) return undefined;
  if (visit.kind === "hearth" && choice === 1) {
    return state.flaskCharges >= tripFlaskCapacity(state, data) ? "flaskFull" : undefined;
  }
  if (visit.kind === "event" && visit.event) {
    const option = getEvent(data, visit.event).options[choice];
    return option ? eventBlockReason(state, data, option) : undefined;
  }
  if (visit.kind === "marisha") return roadGambleBlockReason(state, data, choice);
  return undefined;
}

/** What a Hearth heals. */
export function hearthHeal(state: GameState, data: GameData): number {
  return PROGRESSION.hearthNode * tripOmenEffects(state, data).restHeal;
}

/**
 * The choice at a quiet node. Hearth: 0 = rest, 1 = a Flask charge. Cache: 0 = the item pick,
 * 1 = the Runes, 2 = the Ember Coal. Event: its option. Marisha: buy the offer. -1 = walk on.
 */
export function visitNode(state: GameState, data: GameData, choice: number): GameState {
  const run = requireRun(state, "intermission");
  const visit = run.visit ?? fail("Nothing to visit here");
  if (visit.done) return fail("Already chosen");
  if (choice === -1) return { ...state, run: { ...run, visit: { ...visit, done: true } } };
  const reason = nodeBlockReason(state, data, choice);
  if (reason) return fail(`Not possible: ${reason}`);
  const done = { ...visit, done: true };
  switch (visit.kind) {
    case "hearth":
      if (choice === 0) {
        return {
          ...state,
          run: {
            ...run,
            visit: done,
            lifeFraction: Math.min(1, run.lifeFraction + hearthHeal(state, data)),
          },
        };
      }
      if (choice === 1) {
        return { ...state, flaskCharges: state.flaskCharges + 1, run: { ...run, visit: done } };
      }
      break;
    case "cache":
      if (choice === 0) return withItemPick(state, data, { ...run, visit: done });
      if (choice === 1) {
        const runes = visit.runes ?? [];
        return {
          ...state,
          wallet: { ...state.wallet, runes: addRunes(state.wallet.runes, runes) },
          legacy: {
            ...state.legacy,
            runesFound: [...new Set([...state.legacy.runesFound, ...runes])],
          },
          run: { ...run, visit: done },
        };
      }
      if (choice === 2) {
        return {
          ...state,
          wallet: { ...state.wallet, emberCoal: state.wallet.emberCoal + (visit.emberCoal ?? 0) },
          run: { ...run, visit: done },
        };
      }
      break;
    case "event": {
      const option = getEvent(data, visit.event ?? "").options[choice];
      if (option) return takeEventOption(state, data, { ...run, visit: done }, option);
      break;
    }
    case "marisha": {
      const slot = visit.slots?.[choice] ?? fail("No such offer");
      const price = roadGamblePrice(state, data);
      const act = getAct(data, run.actId);
      const paid = { ...state, wallet: { ...state.wallet, acorns: state.wallet.acorns - price } };
      const [rng, next] = nextRng(paid);
      const item = gambleItem(
        next,
        data,
        slot,
        rng,
        stageMonsterLevel(data, act, act.stages, state.legacy.prestige),
      );
      const trophy = item.uniqueId && !next.legacy.trophies.includes(item.uniqueId);
      return {
        ...next,
        inventory: addToGrid(next.inventory, item, data.items) ?? fail("No room"),
        ...(trophy && item.uniqueId
          ? { legacy: { ...next.legacy, trophies: [...next.legacy.trophies, item.uniqueId] } }
          : {}),
        run: { ...run, visit: { ...visit, bought: [...(visit.bought ?? []), choice] } },
      };
    }
    default:
      break;
  }
  return fail("No such choice");
}

/** An item pick (1 of 3, like a normal fight's) at a quiet node. */
function withItemPick(state: GameState, data: GameData, run: RunState): GameState {
  const [rng, next] = nextRng(state);
  const act = getAct(data, run.actId);
  const items = rollItemChoices(
    data,
    act.id,
    {
      enemyId: act.enemies[0]?.id ?? act.boss.id,
      level: level(state, data, run),
      boss: false,
      eliteModifiers: [],
      seed: 0,
      ...(run.lucky ? { lucky: true } : {}),
    },
    "normal",
    state.progress.deathsInAct,
    state.legacy.prestige,
    rng,
    actAffixFactor(act, () => 1),
  );
  const rest = runWithout(run, "lucky");
  return {
    ...next,
    run: { ...rest, phase: "rewards", rewards: quietRewards({ items }) },
  };
}

function takeEventOption(
  state: GameState,
  data: GameData,
  run: RunState,
  option: EventOption,
): GameState {
  const price = eventPrice(state, data, option);
  const cost = option.cost;
  const gain = option.gain ?? {};
  const [rng, rolled] = nextRng(state);
  let s: GameState = {
    ...rolled,
    flaskCharges: rolled.flaskCharges - (cost?.flask ?? 0),
    wallet: {
      ...rolled.wallet,
      acorns: rolled.wallet.acorns - price.acorns,
      ash: rolled.wallet.ash - price.ash,
      emberCoal: rolled.wallet.emberCoal + (gain.emberCoal ?? 0),
    },
  };
  let life = run.lifeFraction - (cost?.life ?? 0) + (gain.life ?? 0);
  if (option.risk && rng.chance(option.risk.chance)) life -= option.risk.life;
  let r: RunState = {
    ...run,
    lifeFraction: Math.max(0.01, Math.min(1, life)),
    ...(gain.challenge ? { challenge: true } : {}),
    ...(gain.lucky ? { lucky: true } : {}),
    ...(option.curse
      ? {
          curse: {
            damage: option.curse.damage,
            until: nextWaymark(getAct(data, run.actId), run.stage),
          },
        }
      : {}),
  };
  if (gain.flask) {
    s = { ...s, flaskCharges: Math.min(tripFlaskCapacity(s, data), s.flaskCharges + gain.flask) };
  }
  let runes: string[] = [];
  if (gain.rune !== undefined) {
    const rune = rollRune(data, runeTier(s, data, r) + gain.rune, true, rng, homeRune(data, r));
    if (rune) runes = [rune];
    s = {
      ...s,
      wallet: { ...s.wallet, runes: addRunes(s.wallet.runes, runes) },
      legacy: { ...s.legacy, runesFound: [...new Set([...s.legacy.runesFound, ...runes])] },
    };
  }
  let xp = 0;
  let levelsGained = 0;
  if (gain.xpFights) {
    xp = Math.round(xpForKill(level(s, data, r), "normal", s.hero.level) * gain.xpFights);
    const leveled = gainXp(s.hero.level, s.hero.xp, xp, levelCap(s.legacy.prestige));
    levelsGained = leveled.levelsGained;
    s = { ...s, hero: { ...s.hero, level: leveled.level, xp: leveled.xp } };
  }
  const boonOffer = gain.boons ? shrineOffer(s, data, getAct(data, r.actId), rng) : [];
  if (gain.items) return withItemPick({ ...s, run: r }, data, r);
  if (xp || runes.length || boonOffer.length) {
    r = {
      ...r,
      phase: "rewards",
      rewards: quietRewards({
        xp,
        levelsGained,
        runes,
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
      }),
    };
  }
  return { ...s, run: r };
}

/** The lane the next row is walked on: the chosen one, else the default (a fight first). */
export function chooseNode(state: GameState, lane: number): GameState {
  const run = requireRun(state, "intermission", "rewards");
  const here = currentNode(run);
  if (!here) return fail("No map here");
  if (run.phase === "intermission" && !run.visit) return fail("Fight first");
  if (run.rewards && run.encounter?.boss) return fail("The act ends here");
  if (!nextNodes(run).some((n) => n.lane === lane)) return fail("No path there");
  const path = [...(run.path ?? [])];
  path[run.stage] = lane;
  return { ...state, run: { ...run, path } };
}

/** On to the next row of the map (`continue`), entering its node. */
export function walkOn(state: GameState, data: GameData, run: RunState): GameState {
  const path = [...(run.path ?? [])];
  if (run.map && path[run.stage] === undefined) {
    const ahead = defaultNext(run);
    if (ahead) path[run.stage] = ahead.lane;
  }
  const rest = runWithout(run, "visit");
  return enterNode(state, data, {
    ...rest,
    stage: run.stage + 1,
    phase: "intermission",
    encounter: null,
    rewards: null,
    ...(run.map ? { path } : {}),
  });
}
