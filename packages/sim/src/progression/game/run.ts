import { EMPTY_BOONS } from "../boons";
import { bountyAfterFlask, rollBounty } from "../bounties";
import { PROGRESSION } from "../constants";
import { DRAUGHT_FLASK_COST } from "../draughts";
import { type EliteModifier, eliteChance, eliteModifierCount } from "../elites";
import type { Rng } from "../../rng";
import {
  actUnlocked,
  finaleOpen,
  getAct,
  isFinaleAct,
  isHarvestAct,
  stageMonsterLevel,
  harvesterShare,
  stagePressure,
  stagesInAct,
  stageWall,
  routeAt,
  wildfireLevel,
  wildfireOpen,
  wildfirePressure,
  wildfireTop,
} from "./acts";
import { getBounty } from "./bounty";
import { bossAbilities, encounterName, finaleEncounter, wildfireBossAbilities } from "./encounters";
import { brewedDraught, draughtsOpen, flaskCapacity, getDraught } from "./flask";
import { requireCamp, requireRun } from "./guards";
import { requireRewards, rewardsDone } from "./rewards";
import {
  type ActData,
  fail,
  nextRng,
  type Encounter,
  type GameData,
  type GameState,
  type Notice,
  type RouteKind,
} from "./state";

/** A trip out of the Camp: set out, stages, drinking from the Ember Flask, back to the Camp. */

export function setOut(state: GameState, data: GameData, actId: string): GameState {
  requireCamp(state);
  const act = getAct(data, actId);
  if (!actUnlocked(state, data, actId)) fail("The road there is still closed");
  // The Scout hands out a bounty for this trip.
  const [rng, next] = nextRng(state);
  const bounty =
    data.bounties?.length && !state.bountyDone
      ? rollBounty(
          data.bounties,
          act.number,
          act.enemies.map((e) => e.id),
          rng,
        )
      : undefined;
  const draught = brewedDraught(state, data);
  return {
    ...(bounty ? next : state),
    notice: null,
    // The Flask leaves the Camp full, as much as the worn Belt allows, minus a brewed Draught.
    flaskCharges: flaskCapacity(state, data) - (draught ? DRAUGHT_FLASK_COST : 0),
    run: {
      actId,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
      ...(bounty ? { bounty } : {}),
      ...(draught ? { draught: draught.id } : {}),
    },
  };
}

export function chooseDraught(state: GameState, data: GameData, id: string | null): GameState {
  requireCamp(state);
  if (id !== null) {
    if (!draughtsOpen(state, data)) return fail("Draughts come with the first Prestige");
    if (!getDraught(data, id)) return fail(`Unknown Draught "${id}"`);
  }
  return { ...state, draught: id };
}

/** Wildfire: any act at a chosen tier, once The Last Ember is won. */
export function setOutWildfire(
  state: GameState,
  data: GameData,
  actId: string,
  tier: number,
): GameState {
  requireCamp(state);
  if (!wildfireOpen(state)) return fail("Wildfire opens after The Last Ember");
  if (!Number.isInteger(tier) || tier < 1 || tier > wildfireTop(state)) {
    return fail("That Wildfire still smoulders out of reach");
  }
  if (isFinaleAct(data, actId)) return fail("The Last Ember does not burn again");
  getAct(data, actId);
  const draught = brewedDraught(state, data);
  return {
    ...state,
    notice: null,
    flaskCharges: flaskCapacity(state, data) - (draught ? DRAUGHT_FLASK_COST : 0),
    run: {
      actId,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
      wildfire: tier,
      ...(draught ? { draught: draught.id } : {}),
    },
  };
}

export function enterFinale(state: GameState, data: GameData): GameState {
  requireCamp(state);
  if (!finaleOpen(state, data) || !data.finale) return fail("The last flame is not in reach yet");
  const draught = brewedDraught(state, data);
  return {
    ...state,
    notice: null,
    boons: EMPTY_BOONS,
    flaskCharges: flaskCapacity(state, data) - (draught ? DRAUGHT_FLASK_COST : 0),
    legacy: { ...state.legacy, finaleAttempts: (state.legacy.finaleAttempts ?? 0) + 1 },
    run: {
      actId: data.finale.id,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
      ...(draught ? { draught: draught.id } : {}),
    },
  };
}

/**
 * Picks the path of the fork ahead (neuausrichtung-v1.md 6.2): before the fork's first stage
 * (in the intermission, or in the rewards of the stage before). The thief's trail is only there while a thief bounty runs.
 */
export function chooseRoute(state: GameState, data: GameData, route: RouteKind): GameState {
  const run = requireRun(state, "intermission", "rewards");
  const act = getAct(data, run.actId);
  // In the rewards the road ahead starts with the next stage.
  const ahead = run.phase === "rewards" ? run.stage + 1 : run.stage;
  const at = routeAt(run, act, ahead);
  if (!at || at.second) return fail("No fork ahead");
  if (route === "thief" && !thiefTrailOpen(state, data)) return fail("No thief to follow");
  return {
    ...state,
    run: { ...run, routes: { ...run.routes, [String(at.fork)]: route } },
  };
}

/** The thief's trail is a route while a "catch the Ember Thief" bounty is open. */
export function thiefTrailOpen(state: GameState, data: GameData): boolean {
  const bounty = state.run?.bounty;
  return (
    data.thief !== undefined &&
    bounty?.status === "open" &&
    getBounty(data, bounty.id).goal.kind === "thief"
  );
}

/**
 * An Elite's modifiers (neuausrichtung-v1.md 6.1): one of its act's own first (an act without
 * own ones, like Emberfall, draws from all acts), the rest from the general pool.
 */
export function rollEliteModifiers(
  data: GameData,
  act: ActData,
  count: number,
  rng: Rng,
): string[] {
  const actOwn = data.eliteModifiers.filter((m) => m.act === act.id);
  const anyAct = data.eliteModifiers.filter((m) => m.act !== undefined);
  const first = actOwn.length ? actOwn : anyAct;
  const general = data.eliteModifiers.filter((m) => m.act === undefined);
  const out: string[] = [];
  const draw = (pool: EliteModifier[]) => {
    const [mod] = pool.splice(rng.int(0, pool.length - 1), 1);
    if (mod) out.push(mod.id);
  };
  if (count > 0 && first.length) draw([...first]);
  const rest = [...(first.length ? general : data.eliteModifiers)];
  while (out.length < count && rest.length) draw(rest);
  return out;
}

export function startStage(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission");
  const act = getAct(data, run.actId);
  const [rng, next] = nextRng(state);
  if (isFinaleAct(data, act.id)) {
    const encounter = finaleEncounter(data, run.stage, rng);
    return { ...next, run: { ...run, phase: "fight", encounter } };
  }
  const tier = run.wildfire;
  const level = tier
    ? wildfireLevel(tier)
    : stageMonsterLevel(data, act, run.stage, state.legacy.prestige);
  const atBoss = run.stage >= stagesInAct(act);
  const p = tier
    ? wildfirePressure(data, run.stage, tier, atBoss, act)
    : harvesterShare(
        stagePressure(data, act, run.stage, state.legacy.prestige),
        atBoss && act.boss.archetype === "harvester",
      );
  const wall = tier ? null : stageWall(data, act, run.stage, state.legacy.prestige);
  // Longer fights over more enemy Life (neuausrichtung-v1.md 5.5), not in the Wildfire.
  const length = (kind: keyof typeof PROGRESSION.fightLength.life) => {
    const life = p.life * (tier ? 1 : PROGRESSION.fightLength.life[kind]);
    const damage = p.damage * (tier || kind !== "boss" ? 1 : PROGRESSION.fightLength.bossDamage);
    return life !== 1 || damage !== 1 ? { pressure: { life, damage } } : {};
  };
  const walled = wall ? { wall: { life: wall.life, damage: wall.damage } } : {};
  let encounter: Encounter;
  if (atBoss) {
    encounter = {
      enemyId: act.boss.id,
      level,
      boss: true,
      eliteModifiers: (tier
        ? wildfireBossAbilities(data, act, tier)
        : bossAbilities(data, act, state.legacy.prestige)
      ).map((m) => m.id),
      ...length("boss"),
      ...walled,
      seed: rng.int(0, 0x7fffffff),
    };
  } else {
    const enemy = act.enemies[rng.int(0, act.enemies.length - 1)];
    if (!enemy) return fail(`Act ${act.id} has no enemies`);
    const mods: string[] = [];
    // An open "catch the Ember Thief" bounty: the Scout saw it nearby.
    const hunted =
      run.bounty?.status === "open" && getBounty(data, run.bounty.id).goal.kind === "thief";
    // The route of a fork (neuausrichtung-v1.md 6.2): sure Elites, or the thief's trail.
    const route = routeAt(run, act, run.stage);
    const trail = route?.kind === "thief" && !route.second && hunted && data.thief !== undefined;
    // A Gatekeeper holds the Waymark: no thief there.
    const thief =
      trail ||
      (!wall?.gate &&
        data.thief !== undefined &&
        act.number >= PROGRESSION.thiefFromAct &&
        rng.chance(PROGRESSION.thiefChance * (hunted ? PROGRESSION.bounty.thiefBoost : 1)));
    let champion = false;
    if (
      !thief &&
      (wall?.gate || route?.kind === "elite" || rng.chance(eliteChance(act.number, run.stage)))
    ) {
      // From run 3 an Elite may be a named Champion: three modifiers and its own hoard.
      const c = PROGRESSION.champion;
      champion = !wall?.gate && state.legacy.prestige >= c.fromPrestige && rng.chance(c.chance);
      const count = champion ? PROGRESSION.maxEliteModifiers : eliteModifierCount(level);
      mods.push(...rollEliteModifiers(data, act, count, rng));
    }
    const kind = wall?.gate ? "gate" : mods.length ? "elite" : "normal";
    const sized = length(kind);
    encounter = {
      enemyId: thief && data.thief ? data.thief.id : enemy.id,
      level,
      boss: false,
      eliteModifiers: mods,
      ...(champion
        ? {
            pressure: {
              life: (sized.pressure?.life ?? 1) * PROGRESSION.champion.life,
              damage: sized.pressure?.damage ?? 1,
            },
            champion: true,
          }
        : sized),
      ...walled,
      ...(wall?.gate ? { gate: true } : {}),
      seed: rng.int(0, 0x7fffffff),
      ...(thief ? { thief: true } : {}),
    };
  }
  return { ...next, run: { ...run, phase: "fight", encounter } };
}

/** Back to the Camp: flask refilled, life full, act progress and the trip's bounty gone. */
export function toCamp(state: GameState, data: GameData, notice: Notice | null): GameState {
  const fromRunesmithAct = state.run ? getAct(data, state.run.actId).runesmith === true : false;
  // Boons of the current act burn on death and Retreat; a cleared act keeps them.
  const lost = notice?.kind === "death" || notice?.kind === "retreat";
  const { kept, fresh } = state.boons;
  // A done bounty stays done, even after a death: the Scout pays it in the Camp.
  const done = state.run?.bounty?.status === "done" ? state.run.bounty : undefined;
  return {
    ...state,
    ...(done
      ? {
          bountyDone: {
            id: done.id,
            ...(done.enemyId ? { enemyId: done.enemyId } : {}),
            actId: state.run?.actId ?? "",
          },
        }
      : {}),
    run: null,
    notice,
    boons: { kept: lost ? kept : [...kept, ...fresh], fresh: [] },
    flaskCharges: flaskCapacity(state, data),
    progress: {
      ...state.progress,
      runesmithUnlocked: state.progress.runesmithUnlocked || fromRunesmithAct,
    },
  };
}

export function retreat(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission", "fight", "rewards");
  // Rewards are picked first, so no loot gets lost on the way back.
  if (run.rewards && !rewardsDone(run.rewards)) return fail("Pick your rewards first");
  const enemyName = run.encounter ? encounterName(run.encounter, run.actId, data) : undefined;
  return toCamp({ ...state, stats: { ...state.stats, retreats: state.stats.retreats + 1 } }, data, {
    kind: "retreat",
    actId: run.actId,
    stage: run.stage,
    ...(enemyName ? { enemyName } : {}),
    ...(run.wildfire ? { wildfire: run.wildfire } : {}),
  });
}

export function continueRun(state: GameState, data: GameData): GameState {
  const { run, rewards } = requireRewards(state);
  if (!rewardsDone(rewards)) return fail("Pick your rewards first");
  const encounter = run.encounter ?? fail("No encounter");
  if (encounter.boss && run.wildfire) {
    const tier = run.wildfire;
    const after = toCamp({ ...state, progress: { ...state.progress, deathsInAct: 0 } }, data, {
      kind: "actCleared",
      actId: run.actId,
      stage: run.stage,
      enemyName: encounterName(encounter, run.actId, data),
      wildfire: tier,
    });
    return {
      ...after,
      legacy: { ...after.legacy, wildfire: Math.max(state.legacy.wildfire ?? 0, tier) },
    };
  }
  if (encounter.boss && !isFinaleAct(data, run.actId)) {
    const cleared = state.progress.actsCleared.includes(run.actId)
      ? state.progress.actsCleared
      : [...state.progress.actsCleared, run.actId];
    const enemyName = encounterName(encounter, run.actId, data);
    // After the final Prestige the world no longer burns: no more harvests.
    const harvest =
      isHarvestAct(data, run.actId, state.legacy.prestige) &&
      state.legacy.prestige < PROGRESSION.finalPrestige;
    const after = toCamp(
      {
        ...state,
        progress: {
          ...state.progress,
          actsCleared: cleared,
          deathsInAct: 0,
          trainerUnlocked: true,
        },
      },
      data,
      harvest ? null : { kind: "actCleared", actId: run.actId, stage: run.stage, enemyName },
    );
    // The boss of the newest act: The Harvest and the Prestige flow start.
    return harvest
      ? { ...after, pendingPrestige: { actId: run.actId, stage: run.stage, enemyName } }
      : after;
  }
  return {
    ...state,
    run: { ...run, stage: run.stage + 1, phase: "intermission", encounter: null, rewards: null },
  };
}

export function useFlask(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission", "rewards");
  if (state.flaskCharges <= 0) return fail("The Ember Flask is empty");
  if (run.lifeFraction >= 1) return fail("Life is already full");
  const bounty = run.bounty
    ? bountyAfterFlask(run.bounty, getBounty(data, run.bounty.id).goal)
    : undefined;
  return {
    ...state,
    flaskCharges: state.flaskCharges - 1,
    run: {
      ...run,
      lifeFraction: Math.min(1, run.lifeFraction + PROGRESSION.flaskHeal),
      ...(bounty ? { bounty } : {}),
    },
  };
}
