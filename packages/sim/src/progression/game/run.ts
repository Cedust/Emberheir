import { ashbornEffects } from "../ashborn";
import { EMPTY_BOONS } from "../boons";
import { bountyAfterFlask } from "../bounties";
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
  stagesInAct,
  stageWall,
  wardensGate,
  wildfireLevel,
  wildfireOpen,
  wildfirePressure,
  wildfireTop,
} from "./acts";
import { getBounty, takeBounty } from "./bounty";
import { bossAbilities, encounterName, finaleEncounter, wildfireBossAbilities } from "./encounters";
import { brewedDraught, draughtsOpen, flaskCapacity, getDraught } from "./flask";
import { requireCamp, requireRun } from "./guards";
import { checkOmens, tripOmenEffects } from "./omens";
import { requireRewards, rewardsDone } from "./rewards";
import {
  type ActData,
  fail,
  nextRng,
  type Encounter,
  type GameData,
  type GameState,
  type Notice,
  runWithout,
} from "./state";
import { currentNode, generateActMap, isQuiet } from "./act-map";
import { mapOptions, walkOn } from "./visits";

/** A trip out of the Camp: set out, stages, drinking from the Ember Flask, back to the Camp. */

export function setOut(
  state: GameState,
  data: GameData,
  actId: string,
  omenIds: readonly string[] = [],
  bountyId?: string,
): GameState {
  requireCamp(state);
  getAct(data, actId);
  if (!actUnlocked(state, data, actId)) fail("The road there is still closed");
  // An old act of the run burns under one of the two Omens Eldrin shows (neuausrichtung-v1.md 5.2).
  const omens = checkOmens(state, data, actId, omenIds);
  // The bounty the hero took from Eldrin's offer for this trip.
  const bounty = takeBounty(state, data, actId, bountyId);
  const draught = brewedDraught(state, data);
  const out: GameState = {
    ...state,
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
      ...(omens.length ? { omens } : {}),
    },
  };
  return withMap(out, data);
}

/** A fresh act map for the walk that starts now (act-karte-entwurf-v1.md), standing on row 1. */
function withMap(state: GameState, data: GameData): GameState {
  const run = state.run;
  if (!run) return state;
  const act = getAct(data, run.actId);
  const [rng, next] = nextRng(state);
  const map = generateActMap(act, mapOptions(state, data, run), rng);
  return { ...next, run: { ...run, map, path: [1] } };
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
  omenIds: readonly string[] = [],
): GameState {
  requireCamp(state);
  if (!wildfireOpen(state)) return fail("Wildfire opens after The Last Ember");
  if (!Number.isInteger(tier) || tier < 1 || tier > wildfireTop(state)) {
    return fail("That Wildfire still smoulders out of reach");
  }
  if (isFinaleAct(data, actId)) return fail("The Last Ember does not burn again");
  getAct(data, actId);
  // Wildfire Omens: as many as the hero likes, at least the tier's Peril (neuausrichtung-v1.md 7.2).
  const omens = checkOmens(state, data, actId, omenIds, tier);
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
      ...(omens.length ? { omens } : {}),
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
  const node = currentNode(run);
  if (node && isQuiet(node.kind)) return fail("Nothing to fight here");
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
  const p = tier ? wildfirePressure(tier, atBoss) : { life: 1, damage: 1 };
  // Cursed Spark (an Event): enemies hit harder until the next Waymark.
  const cursed = run.curse && run.stage < run.curse.until ? 1 + run.curse.damage : 1;
  const wall = tier ? null : stageWall(data, act, run.stage, state.legacy.prestige);
  const omens = tripOmenEffects(state, data);
  const omened = run.omens?.length ? { omens: run.omens } : {};
  // One factor per stage kind (balancing-neustart-v1.md, step 3), the Wildfire included.
  const length = (kind: keyof typeof PROGRESSION.stageKinds) => {
    const k = PROGRESSION.stageKinds[kind];
    return { pressure: { life: p.life * k.life, damage: p.damage * k.damage * cursed } };
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
      ...omened,
      seed: rng.int(0, 0x7fffffff),
    };
    const met = next.legacy.bossesMet ?? [];
    if (!met.includes(act.id)) {
      const legacy = { ...next.legacy, bossesMet: [...met, act.id] };
      return { ...next, legacy, run: { ...run, phase: "fight", encounter } };
    }
  } else {
    const rolled =
      act.enemies.find((e) => e.id === node?.enemy) ??
      act.enemies[rng.int(0, act.enemies.length - 1)];
    // A Hunt node: its quarry, plain, no thief and no Elite (hunts-entwurf-v1.md).
    const quarry =
      node?.kind === "hunt" ? act.enemies.find((e) => e.id === node.quarry) : undefined;
    const enemy = quarry ?? rolled;
    if (!enemy) return fail(`Act ${act.id} has no enemies`);
    const mods: string[] = [];
    // An open "catch the Ember Thief" bounty: the Scout saw it nearby.
    const hunted =
      run.bounty?.status === "open" && getBounty(data, run.bounty.id).goal.kind === "thief";
    // The act map: a sure Elite, or the thief's trail (act-karte-entwurf-v1.md).
    const trail = node?.kind === "thief" && data.thief !== undefined;
    // The Ashen Challenger of an Event waits on the next fight off the Waymarks.
    const challenge = run.challenge === true && !wall?.gate && !trail && !quarry;
    // A Gatekeeper holds the Waymark: no thief there.
    const thief =
      trail ||
      (!wall?.gate &&
        !quarry &&
        data.thief !== undefined &&
        act.number >= PROGRESSION.thiefFromAct &&
        rng.chance(PROGRESSION.thiefChance * (hunted ? PROGRESSION.bounty.thiefBoost : 1)));
    let champion = false;
    if (
      !thief &&
      !quarry &&
      (wall?.gate ||
        node?.kind === "elite" ||
        challenge ||
        rng.chance(eliteChance(act.number, run.stage) * omens.eliteChance))
    ) {
      // From run 3 an Elite may be a named Champion: three modifiers and its own hoard.
      const c = PROGRESSION.champion;
      champion =
        !wall?.gate &&
        !challenge &&
        state.legacy.prestige >= c.fromPrestige &&
        rng.chance(c.chance);
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
              life: sized.pressure.life * PROGRESSION.champion.life,
              damage: sized.pressure.damage,
            },
            champion: true,
          }
        : sized),
      ...walled,
      ...omened,
      ...(wall?.gate ? { gate: true } : {}),
      seed: rng.int(0, 0x7fffffff),
      ...(thief ? { thief: true } : {}),
      ...(challenge && mods.length ? { challenge: true } : {}),
      ...(quarry ? { hunt: true } : {}),
    };
  }
  if (run.lucky) encounter = { ...encounter, lucky: true };
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
  // A quiet node of the act map: on to the next row once its rewards are picked.
  if (state.run?.visit) {
    const run = requireRun(state, "intermission", "rewards");
    if (run.rewards && !rewardsDone(run.rewards)) return fail("Pick your rewards first");
    return walkOn(state, data, run);
  }
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
  return walkOn(state, data, run);
}

/**
 * Wander at the Warden's Gate (laengere-runs-v1.md): instead of the boss the road through the act
 * starts anew at Stage 1 on a new act map. Life, the Flask, Boons and the bounty stay.
 * Waymarks pay their Skill Point only once per run, and Shrines stay quiet on the walks after
 * the first, so farming brings levels and loot but no extra Boons.
 */
export function wander(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission");
  if (!wardensGate(state, data, run)) return fail("No Warden's Gate here");
  // A Cursed Spark burns out with the walk; a waiting Challenger or Cub stays.
  const rest = runWithout(run, "visit", "curse");
  const walked: GameState = {
    ...state,
    run: { ...rest, stage: 1, encounter: null, rewards: null, wanders: (run.wanders ?? 0) + 1 },
  };
  return withMap(walked, data);
}

export function useFlask(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission", "rewards");
  const heal =
    PROGRESSION.flaskHeal *
    tripOmenEffects(state, data).flaskHeal *
    ashbornEffects(state.hero.ashborn, data.ashbornValues ?? []).flaskHeal;
  if (heal <= 0) return fail("Parched: the Ember Flask stays dry on this trip");
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
      lifeFraction: Math.min(1, run.lifeFraction + heal),
      ...(bounty ? { bounty } : {}),
    },
  };
}
