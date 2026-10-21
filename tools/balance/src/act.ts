import {
  type ActData,
  activeRuneword,
  actsInOrder,
  actsInRun,
  applyAction,
  encounterFight,
  gateStages,
  isWallAct,
  stageMonsterLevel,
  outcomeOf,
  type FightOutcome,
  type GameData,
  type GameState,
  type Encounter,
  newGame,
  PROGRESSION,
} from "@emberheir/sim";
import {
  autopilotPrestige,
  autopilotRewards,
  bestBoon,
  brewDraught,
  bindPowers,
  chooseGate,
  walkQuiet,
  spendCinderglass,
  spendPoints,
} from "./autopilot";
import { type BuildPlan, findBuild, withMainMastery } from "./builds";
import { chooseRunOmen, chooseWildfireOmens, flaskWorks } from "./omens";
import { autopilotRunes, campSalvage, type RuneMemo } from "./runes";
import { spendSkillPoints } from "./skill-path";

/** How the current encounter's fight ends; resolveFight then reads the same, finished fight. */
function finishedFight(state: GameState, data: GameData): FightOutcome {
  const fight = encounterFight(state, data);
  fight.runToEnd();
  return outcomeOf(fight);
}

/** What a stage holds, for deaths and fight lengths per kind (neuausrichtung-v1.md 5.3, 5.5). */
export type StageKind = "normal" | "elite" | "gate" | "boss";
export const STAGE_KINDS: readonly StageKind[] = ["normal", "elite", "gate", "boss"];

export function stageKind(encounter: Encounter | null | undefined): StageKind {
  if (encounter?.boss) return "boss";
  if (encounter?.gate) return "gate";
  if (encounter?.eliteModifiers.length) return "elite";
  return "normal";
}

/** One fight of a report: its stage kind, length and whether the hero died (a fled thief is no death). */
export interface StageFight {
  readonly kind: StageKind;
  readonly seconds: number;
  readonly died: boolean;
}

/** In the Camp before a trip: Thoric salvages, Kaelen trains, Nyssa sockets, a Draught. */
function prepare(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
  act: ActData | undefined,
  runes: boolean,
  memo: RuneMemo,
): GameState {
  let s = campSalvage(state, data, runes);
  s = spendSkillPoints(s, data, build);
  if (runes) s = autopilotRunes(s, data, act, memo);
  s = spendCinderglass(s, data);
  s = bindPowers(s, data);
  return brewDraught(s, data, act);
}

/** Farm trips per act at most before the autopilot goes in anyway. */
export const FARM_TRIPS = 3;

/**
 * The act to farm before setting out into `act`: the act before it, while the hero is below the
 * level of `act`'s first wall (its first Gatekeeper, or its boss). Only for the run's newest act.
 */
function farmAct(
  state: GameState,
  data: GameData,
  act: ActData,
  acts: readonly ActData[],
): ActData | undefined {
  const index = acts.findIndex((a) => a.id === act.id);
  if (index !== acts.length - 1 || index < 1) return undefined;
  if (!isWallAct(data, act, state.legacy.prestige)) return undefined;
  const wall = gateStages(act)[0] ?? act.stages;
  const level = stageMonsterLevel(data, act, wall, state.legacy.prestige);
  return state.hero.level < level ? acts[index - 1] : undefined;
}

/**
 * Plays whole acts with a simple autopilot to answer "how long does a fight take" and "how often
 * do you die before the boss" (game-design-document-v1.md section 11).
 */

export interface ActRunReport {
  /** 1 = the first run, 2 = after the first Prestige, ... */
  readonly generation: number;
  /** Act number (1 = Ashen Fields). */
  readonly act: number;
  readonly cleared: boolean;
  /** Deaths before the boss fell. */
  readonly deaths: number;
  /** Enemy id of every death, in order. */
  readonly deathEnemies: readonly string[];
  readonly fights: number;
  readonly levelAtBoss: number;
  readonly fightSeconds: readonly number[];
  readonly bossSeconds: number;
  readonly elites: number;
  /** Ember Thieves met and caught. */
  readonly thieves: number;
  readonly thievesCaught: number;
  /** Stage of every death. */
  readonly deathStages: readonly number[];
  readonly bossDeaths: number;
  /** The very first fight of the generation was lost. */
  readonly firstFightLost: boolean;
  /** Every fight with its stage kind, the boss included. */
  readonly stageFights: readonly StageFight[];
  /** Runewords and single Runes the hero wears when the act ends. */
  readonly runewords: readonly string[];
  readonly runesWorn: number;
  /** Uniques the hero wears when the act ends. */
  readonly uniquesWorn?: number;
  /** Runes dropped by fights in this act's trips (farm trips into the act before included). */
  readonly runesDropped?: number;
  /** ...and how many of them were the act's Home Rune (act-beute-entwurf-v1.md A1). */
  readonly homeRunes?: number;
  /** Walks past the Warden's Gate instead of the boss (laengere-runs-v1.md). */
  readonly wanders?: number;
  /** Trips through the act before this one to farm levels first (newest act only). */
  readonly farmTrips?: number;
  /** Quiet nodes of the act map visited (Shrine, Hearth, Cache, Event, Marisha). */
  readonly visits?: number;
}

/** The Runewords and the count of socketed Runes on the hero right now. */
function wornRunes(
  state: GameState,
  data: GameData,
): { runewords: string[]; runesWorn: number; uniquesWorn: number } {
  const items = Object.values(state.hero.equipment).filter((i) => !!i);
  return {
    uniquesWorn: items.filter((i) => !!i.uniqueId).length,
    runewords: items.flatMap((i) => {
      const word = activeRuneword(i, data.items);
      return word ? [word.id] : [];
    }),
    runesWorn: items.reduce((n, i) => n + (i.runes?.length ?? 0), 0),
  };
}

/**
 * Plays the run act by act, from Act 1 up to `upToAct`, until each boss falls or `maxAttempts`
 * attempts per act are used up. With `generations` above 1 it prestiges after the final boss and
 * plays the acts again: one report per act and generation.
 */
export function playGenerations(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    /** Autopilot build id (`BUILDS`); default: the first build with the weapon. */
    readonly build?: string;
    /** Main Mastery instead of the build's own. */
    readonly mastery?: string;
    /** Last act to play (its number). */
    readonly upToAct: number;
    readonly maxAttempts: number;
    readonly generations: number;
    /** After the last generation: the final Prestige and The Last Ember (report act = 8). */
    readonly finale?: boolean;
    /** After a won finale: Wildfire tiers to climb (report act = 100 + tier). */
    readonly wildfire?: number;
    /** Called before every fight (balance probes). */
    readonly onFight?: (state: GameState, generation: number, act: number) => void;
    /** Called in the Camp right before The Last Ember (balance probes replay the endgame). */
    readonly onEndgame?: (state: GameState) => void;
    /** The autopilot uses Runes and Runewords (default); false measures without them. */
    readonly runes?: boolean;
  },
): ActRunReport[] {
  const runes = options.runes ?? true;
  const memo: RuneMemo = new Set();
  // Every start weapon belongs to one class (klassen-v2.md); the hero plays that class.
  const heroClass = data.classes.find((c) => c.weapons.includes(options.starterWeapon));
  if (!heroClass) throw new Error(`No class starts with "${options.starterWeapon}"`);
  let s = newGame(data, {
    seed: options.seed,
    classId: heroClass.id,
    weapon: options.starterWeapon,
  });
  const planned = findBuild(options.starterWeapon, options.build);
  const build = planned && options.mastery ? withMainMastery(planned, options.mastery) : planned;
  const reports: ActRunReport[] = [];
  for (let generation = 1; generation <= options.generations; generation++) {
    let allCleared = true;
    // Run n has acts 1..n (prestige-acts-v1.md); the newest act's boss brings The Harvest.
    const acts = actsInRun(data, s.legacy.prestige).filter((a) => a.number <= options.upToAct);
    for (const act of acts) {
      const before = s.stats;
      const fightSeconds: number[] = [];
      let bossSeconds = 0;
      let levelAtBoss = 0;
      let elites = 0;
      let thieves = 0;
      let thievesCaught = 0;
      const deathStages: number[] = [];
      const deathEnemies: string[] = [];
      let bossDeaths = 0;
      let firstFightLost = false;
      const stageFights: StageFight[] = [];
      let wanders = 0;
      let farmTrips = 0;
      let visits = 0;
      let runesDropped = 0;
      let homeRunes = 0;
      const countRunes = (st: GameState) => {
        const dropped = st.run?.phase === "rewards" ? (st.run.rewards?.runes ?? []) : [];
        const home = data.acts.find((a) => a.id === st.run?.actId)?.homeRune;
        runesDropped += dropped.length;
        homeRunes += dropped.filter((id) => id === home).length;
      };
      let cleared = false;
      for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
        // Farming like a player (laengere-runs-v1.md): below the level of the newest act's first
        // wall, a trip through the act before it (no walls there) comes first.
        const farm = farmAct(s, data, act, acts);
        if (farm && farmTrips < FARM_TRIPS) {
          farmTrips++;
          attempt--;
          s = prepare(s, data, build, farm, runes, memo);
          s = applyAction(s, data, {
            type: "setOut",
            actId: farm.id,
            omens: chooseRunOmen(s, data, farm.id),
          });
          while (s.run) {
            s = spendPoints(s, data, options.starterWeapon);
            if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0 && flaskWorks(s, data)) {
              s = applyAction(s, data, { type: "useFlask" });
            }
            const quiet = walkQuiet(s, data, runes);
            s = quiet.state;
            visits += quiet.visits;
            s = applyAction(s, data, { type: "startStage" });
            const encounter = s.run?.encounter;
            const result = finishedFight(s, data);
            s = applyAction(s, data, { type: "resolveFight" });
            const died = !s.run && s.notice?.kind === "death";
            stageFights.push({ kind: stageKind(encounter), seconds: result.duration, died });
            countRunes(s);
            if (s.run?.phase === "rewards") s = autopilotRewards(s, data, runes);
          }
          s = applyAction(s, data, { type: "dismissNotice" });
          continue;
        }
        s = prepare(s, data, build, act, runes, memo);
        s = applyAction(s, data, {
          type: "setOut",
          actId: act.id,
          omens: chooseRunOmen(s, data, act.id),
        });
        while (s.run) {
          s = spendPoints(s, data, options.starterWeapon);
          if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0 && flaskWorks(s, data)) {
            s = applyAction(s, data, { type: "useFlask" });
          }
          const quiet = walkQuiet(s, data, runes);
          s = quiet.state;
          visits += quiet.visits;
          const walked = s.run?.wanders ?? 0;
          s = chooseGate(s, data);
          if ((s.run?.wanders ?? 0) > walked) {
            wanders++;
            continue;
          }
          s = applyAction(s, data, { type: "startStage" });
          options.onFight?.(s, generation, act.number);
          // The encounter's one fight; resolveFight reads the same one.
          const result = finishedFight(s, data);
          const encounter = s.run?.encounter;
          if (encounter?.boss) {
            bossSeconds = result.duration;
            levelAtBoss = s.hero.level;
          } else {
            fightSeconds.push(result.duration);
            if (encounter?.eliteModifiers.length) elites++;
            if (encounter?.thief) {
              thieves++;
              if (result.winner === "hero") thievesCaught++;
            }
          }
          const stage = s.run?.stage ?? 0;
          const first = s.stats.fights === before.fights;
          s = applyAction(s, data, { type: "resolveFight" });
          const died = !s.run && s.notice?.kind === "death";
          stageFights.push({ kind: stageKind(encounter), seconds: result.duration, died });
          if (died) {
            if (first) firstFightLost = true;
            deathStages.push(stage);
            if (encounter) deathEnemies.push(encounter.enemyId);
            if (encounter?.boss) bossDeaths++;
          }
          countRunes(s);
          if (s.run?.phase === "rewards") s = autopilotRewards(s, data, runes);
        }
        cleared = s.pendingPrestige !== null || s.notice?.kind === "actCleared";
        if (!s.pendingPrestige) s = applyAction(s, data, { type: "dismissNotice" });
      }
      reports.push({
        generation,
        act: act.number,
        cleared,
        deaths: s.stats.deaths - before.deaths,
        deathEnemies,
        fights: s.stats.fights - before.fights,
        levelAtBoss,
        fightSeconds,
        bossSeconds,
        elites,
        thieves,
        thievesCaught,
        deathStages,
        bossDeaths,
        firstFightLost,
        stageFights,
        ...wornRunes(s, data),
        wanders,
        farmTrips,
        visits,
        runesDropped,
        homeRunes,
      });
      if (!cleared) {
        allCleared = false;
        break;
      }
    }
    if (!allCleared || generation === options.generations || !s.pendingPrestige) break;
    s = autopilotPrestige(s, data, build);
  }
  if (options.finale && data.finale && s.pendingPrestige) {
    s = autopilotPrestige(s, data, build);
    if (s.legacy.prestige >= PROGRESSION.finalPrestige) {
      options.onEndgame?.(s);
      const finale = playFinale(
        s,
        data,
        options.generations + 1,
        options.maxAttempts,
        options.onFight,
        { build, starterWeapon: options.starterWeapon, runes, memo },
      );
      reports.push(finale.report);
      s = finale.state;
      for (let tier = 1; tier <= (options.wildfire ?? 0) && s.legacy.finaleWon; tier++) {
        const fire = playWildfire(s, data, build, { ...options, runes, memo }, tier);
        reports.push(fire.report);
        s = fire.state;
        if (!fire.report.cleared) break;
      }
    }
  }
  return reports;
}

/**
 * One Wildfire tier with the autopilot: the acts take turns by tier (I = Act 1, ... VIII = Act 1
 * again), attempts until the act boss falls.
 */
export function playWildfire(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
  options: {
    readonly starterWeapon: string;
    readonly maxAttempts: number;
    readonly runes?: boolean;
    readonly memo?: RuneMemo;
  },
  tier: number,
): { state: GameState; report: ActRunReport } {
  const acts = actsInOrder(data);
  const act = acts[(tier - 1) % acts.length] ?? acts[0];
  if (!act) throw new Error("No acts");
  let s = state;
  const before = s.stats;
  const fightSeconds: number[] = [];
  const deathStages: number[] = [];
  const deathEnemies: string[] = [];
  let bossSeconds = 0;
  let elites = 0;
  const stageFights: StageFight[] = [];
  const runes = options.runes ?? true;
  const memo = options.memo ?? new Set<string>();
  let cleared = false;
  for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
    s = prepare(s, data, build, act, runes, memo);
    s = applyAction(s, data, {
      type: "setOut",
      actId: act.id,
      wildfire: tier,
      omens: chooseWildfireOmens(s, data, act.id, tier),
    });
    while (s.run) {
      s = spendPoints(s, data, options.starterWeapon);
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0 && flaskWorks(s, data)) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      const result = finishedFight(s, data);
      const encounter = s.run?.encounter;
      if (encounter?.boss) bossSeconds = result.duration;
      else {
        fightSeconds.push(result.duration);
        if (encounter?.eliteModifiers.length) elites++;
      }
      const stage = s.run?.stage ?? 0;
      s = applyAction(s, data, { type: "resolveFight" });
      const died = !s.run && s.notice?.kind === "death";
      stageFights.push({ kind: stageKind(encounter), seconds: result.duration, died });
      if (died) {
        deathStages.push(stage);
        if (encounter) deathEnemies.push(encounter.enemyId);
      }
      if (s.run?.phase === "rewards") s = autopilotRewards(s, data, runes);
    }
    cleared = s.notice?.kind === "actCleared";
    s = applyAction(s, data, { type: "dismissNotice" });
  }
  return {
    state: s,
    report: {
      generation: tier,
      act: 100 + tier,
      cleared,
      deaths: s.stats.deaths - before.deaths,
      deathEnemies,
      fights: s.stats.fights - before.fights,
      levelAtBoss: s.hero.level,
      fightSeconds,
      bossSeconds,
      elites,
      thieves: 0,
      thievesCaught: 0,
      deathStages,
      bossDeaths: deathStages.filter((st) => st === act.stages).length,
      firstFightLost: false,
      stageFights,
      ...wornRunes(s, data),
    },
  };
}

/**
 * A failed finale sends the autopilot back into the world like a player: one trip through the
 * last act for levels and gear (the finale is a wall, endgame-balance-v1.md B).
 */
function farmLastAct(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
  starterWeapon: string,
  runes: boolean,
  memo: RuneMemo,
): GameState {
  const act = actsInOrder(data).at(-1);
  if (!act) return state;
  let s = prepare(state, data, build, act, runes, memo);
  s = applyAction(s, data, {
    type: "setOut",
    actId: act.id,
    omens: chooseRunOmen(s, data, act.id),
  });
  while (s.run) {
    s = spendPoints(s, data, starterWeapon);
    if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0 && flaskWorks(s, data)) {
      s = applyAction(s, data, { type: "useFlask" });
    }
    s = walkQuiet(s, data, runes).state;
    s = applyAction(s, data, { type: "startStage" });
    s = applyAction(s, data, { type: "resolveFight" });
    if (s.run?.phase === "rewards") s = autopilotRewards(s, data, runes);
  }
  return s.notice ? applyAction(s, data, { type: "dismissNotice" }) : s;
}

/** The Last Ember with the autopilot: attempts until the Core falls (best Boon after each win). */
export function playFinale(
  state: GameState,
  data: GameData,
  generation: number,
  maxAttempts: number,
  onFight?: (state: GameState, generation: number, act: number) => void,
  farm?: {
    readonly build: BuildPlan | undefined;
    readonly starterWeapon: string;
    readonly runes: boolean;
    readonly memo: RuneMemo;
  },
): { state: GameState; report: ActRunReport } {
  let s = state;
  const before = s.stats;
  const fightSeconds: number[] = [];
  const deathStages: number[] = [];
  const deathEnemies: string[] = [];
  let bossSeconds = 0;
  const stageFights: StageFight[] = [];
  let cleared = false;
  for (let attempt = 0; attempt < maxAttempts && !cleared; attempt++) {
    s = brewDraught(s, data, data.finale);
    s = applyAction(s, data, { type: "enterFinale" });
    while (s.run) {
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0 && flaskWorks(s, data)) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      onFight?.(s, generation, data.finale?.number ?? 8);
      const result = finishedFight(s, data);
      const stage = s.run?.stage ?? 0;
      const enemyId = s.run?.encounter?.enemyId ?? "";
      const core = stage === data.finale?.stages;
      if (core) bossSeconds = result.duration;
      else fightSeconds.push(result.duration);
      s = applyAction(s, data, { type: "resolveFight" });
      const died = !s.run && s.notice?.kind === "death";
      stageFights.push({ kind: core ? "boss" : "gate", seconds: result.duration, died });
      if (died) {
        deathStages.push(stage);
        deathEnemies.push(enemyId);
      }
      const offer = s.run?.rewards?.boonOffer;
      if (offer?.length) {
        s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
      }
      if (s.run?.phase === "rewards") s = applyAction(s, data, { type: "continue" });
    }
    cleared = s.notice?.kind === "ending";
    s = applyAction(s, data, { type: "dismissNotice" });
    if (!cleared && farm)
      s = farmLastAct(s, data, farm.build, farm.starterWeapon, farm.runes, farm.memo);
  }
  const report: ActRunReport = {
    generation,
    act: data.finale?.number ?? 8,
    cleared,
    // Deaths in the finale itself; the farming trips between attempts do not count.
    deaths: deathStages.length,
    deathEnemies,
    fights: s.stats.fights - before.fights,
    levelAtBoss: s.hero.level,
    fightSeconds,
    bossSeconds,
    elites: 0,
    thieves: 0,
    thievesCaught: 0,
    deathStages,
    bossDeaths: deathStages.filter((st) => st === data.finale?.stages).length,
    firstFightLost: false,
    stageFights,
    ...wornRunes(s, data),
  };
  return { state: s, report };
}

/** Plays one generation up to one act (see `playGenerations`). The report of that act. */
export function playAct(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    readonly upToAct: number;
    readonly maxAttempts: number;
  },
): ActRunReport {
  const reports = playGenerations(data, { ...options, generations: 1 });
  const report = reports[reports.length - 1];
  if (!report) throw new Error("No report");
  return report;
}

export interface ActSummary {
  readonly runs: number;
  readonly clearRate: number;
  readonly avgDeaths: number;
  readonly avgLevelAtBoss: number;
  readonly avgFightSeconds: number;
  /** 90th percentile and longest normal fight. */
  readonly p90FightSeconds: number;
  readonly maxFightSeconds: number;
  readonly avgBossSeconds: number;
  /** Share of runs that lost their very first fight. */
  readonly firstFightLossRate: number;
  readonly avgElites: number;
  /** Ember Thieves per run and the share caught before they ran. */
  readonly avgThieves: number;
  readonly thiefCatchRate: number;
  /** Share of deaths that happened at the boss. */
  readonly bossDeathShare: number;
  /** The enemy that killed the hero most often, e.g. "storm-caller (42 %)". */
  readonly topKiller: string;
  /** Walks past the Warden's Gate per run. */
  readonly avgWanders: number;
}

const avg = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function summarizeActRuns(reports: readonly ActRunReport[]): ActSummary {
  const cleared = reports.filter((r) => r.cleared);
  const fights = reports.flatMap((r) => r.fightSeconds).sort((a, b) => a - b);
  return {
    runs: reports.length,
    clearRate: reports.length ? cleared.length / reports.length : 0,
    avgDeaths: avg(cleared.map((r) => r.deaths)),
    avgLevelAtBoss: avg(cleared.map((r) => r.levelAtBoss)),
    avgFightSeconds: avg(fights),
    p90FightSeconds: fights[Math.floor(fights.length * 0.9)] ?? 0,
    maxFightSeconds: fights[fights.length - 1] ?? 0,
    firstFightLossRate: reports.length
      ? reports.filter((r) => r.firstFightLost).length / reports.length
      : 0,
    avgBossSeconds: avg(cleared.map((r) => r.bossSeconds)),
    avgElites: avg(reports.map((r) => r.elites)),
    avgThieves: avg(reports.map((r) => r.thieves)),
    thiefCatchRate:
      reports.reduce((n, r) => n + r.thievesCaught, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.thieves, 0),
      ),
    bossDeathShare:
      reports.reduce((n, r) => n + r.bossDeaths, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.deathStages.length, 0),
      ),
    topKiller: topKiller(reports.flatMap((r) => r.deathEnemies)),
    avgWanders: avg(reports.map((r) => r.wanders ?? 0)),
  };
}

function topKiller(ids: readonly string[]): string {
  if (!ids.length) return "-";
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const [id, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  return `${id} (${Math.round((n / ids.length) * 100)} %)`;
}
