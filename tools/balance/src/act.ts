import {
  actsInOrder,
  actsInRun,
  applyAction,
  fightRecording,
  type GameData,
  type GameState,
  newGame,
  PROGRESSION,
} from "@emberheir/sim";
import {
  autopilotPrestige,
  autopilotRewards,
  bestBoon,
  brewDraught,
  spendPoints,
} from "./autopilot";
import { type BuildPlan, findBuild } from "./builds";
import { spendSkillPoints } from "./skill-path";

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
  },
): ActRunReport[] {
  // Every start weapon belongs to one class (klassen-v2.md); the hero plays that class.
  const heroClass = data.classes.find((c) => c.weapons.includes(options.starterWeapon));
  if (!heroClass) throw new Error(`No class starts with "${options.starterWeapon}"`);
  let s = newGame(data, {
    seed: options.seed,
    classId: heroClass.id,
    weapon: options.starterWeapon,
  });
  const build = findBuild(options.starterWeapon, options.build);
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
      let cleared = false;
      for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
        for (const placed of s.inventory) {
          s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
        }
        s = spendSkillPoints(s, data, build);
        s = brewDraught(s, data, act);
        s = applyAction(s, data, { type: "setOut", actId: act.id });
        while (s.run) {
          s = spendPoints(s, data, options.starterWeapon);
          if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
            s = applyAction(s, data, { type: "useFlask" });
          }
          s = applyAction(s, data, { type: "startStage" });
          options.onFight?.(s, generation, act.number);
          // Simulated once by startStage; resolveFight reads the same outcome.
          const result = fightRecording(s, data).outcome;
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
          if (!s.run && s.notice?.kind === "death") {
            if (first) firstFightLost = true;
            deathStages.push(stage);
            if (encounter) deathEnemies.push(encounter.enemyId);
            if (encounter?.boss) bossDeaths++;
          }
          if (s.run?.phase === "rewards") s = autopilotRewards(s, data);
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
      const finale = playFinale(
        s,
        data,
        options.generations + 1,
        options.maxAttempts,
        options.onFight,
      );
      reports.push(finale.report);
      s = finale.state;
      for (let tier = 1; tier <= (options.wildfire ?? 0) && s.legacy.finaleWon; tier++) {
        const fire = playWildfire(s, data, build, options, tier);
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
function playWildfire(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
  options: { readonly starterWeapon: string; readonly maxAttempts: number },
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
  let cleared = false;
  for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
    for (const placed of s.inventory) {
      s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
    }
    s = spendSkillPoints(s, data, build);
    s = brewDraught(s, data, act);
    s = applyAction(s, data, { type: "setOut", actId: act.id, wildfire: tier });
    while (s.run) {
      s = spendPoints(s, data, options.starterWeapon);
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      const result = fightRecording(s, data).outcome;
      const encounter = s.run?.encounter;
      if (encounter?.boss) bossSeconds = result.duration;
      else {
        fightSeconds.push(result.duration);
        if (encounter?.eliteModifiers.length) elites++;
      }
      const stage = s.run?.stage ?? 0;
      s = applyAction(s, data, { type: "resolveFight" });
      if (!s.run && s.notice?.kind === "death") {
        deathStages.push(stage);
        if (encounter) deathEnemies.push(encounter.enemyId);
      }
      if (s.run?.phase === "rewards") s = autopilotRewards(s, data);
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
    },
  };
}

/** The Last Ember with the autopilot: attempts until the Core falls (best Boon after each win). */
function playFinale(
  state: GameState,
  data: GameData,
  generation: number,
  maxAttempts: number,
  onFight?: (state: GameState, generation: number, act: number) => void,
): { state: GameState; report: ActRunReport } {
  let s = state;
  const before = s.stats;
  const fightSeconds: number[] = [];
  const deathStages: number[] = [];
  const deathEnemies: string[] = [];
  let bossSeconds = 0;
  let cleared = false;
  for (let attempt = 0; attempt < maxAttempts && !cleared; attempt++) {
    s = brewDraught(s, data, data.finale);
    s = applyAction(s, data, { type: "enterFinale" });
    while (s.run) {
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      onFight?.(s, generation, data.finale?.number ?? 8);
      const result = fightRecording(s, data).outcome;
      const stage = s.run?.stage ?? 0;
      const enemyId = s.run?.encounter?.enemyId ?? "";
      if (stage === data.finale?.stages) bossSeconds = result.duration;
      else fightSeconds.push(result.duration);
      s = applyAction(s, data, { type: "resolveFight" });
      if (!s.run && s.notice?.kind === "death") {
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
  }
  const report: ActRunReport = {
    generation,
    act: data.finale?.number ?? 8,
    cleared,
    deaths: s.stats.deaths - before.deaths,
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
  };
}

function topKiller(ids: readonly string[]): string {
  if (!ids.length) return "-";
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const [id, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  return `${id} (${Math.round((n / ids.length) * 100)} %)`;
}
