import {
  type Attributes,
  type GameData,
  type GameState,
  type Item,
  PROGRESSION,
  RARITIES,
  applyAction,
  currentFight,
  equipBlockReason,
  newGame,
  runFight,
  targetSlot,
} from "@emberheir/sim";

/**
 * Plays whole acts with a simple autopilot to answer the PoC questions "how long does a fight
 * take" and "how often do you die before the boss" (game-design-document-v1.md section 11).
 */

export interface ActRunReport {
  readonly cleared: boolean;
  /** Deaths before the boss fell. */
  readonly deaths: number;
  readonly fights: number;
  readonly levelAtBoss: number;
  readonly fightSeconds: readonly number[];
  readonly bossSeconds: number;
  readonly elites: number;
  /** Stage of every death. */
  readonly deathStages: readonly number[];
  readonly bossDeaths: number;
}

/** Attribute points per level for each starter weapon. */
const ATTRIBUTE_PLAN: Record<string, (keyof Attributes)[]> = {
  sword: ["strength", "agility", "vitality"],
  "fire-wand": ["intelligence", "wisdom", "vitality"],
};

const rarityRank = (item: Item) => RARITIES.indexOf(item.rarity);
/** Crude item score: rarity first, then Item Level. */
const score = (item: Item) => rarityRank(item) * 10 + item.itemLevel;

function autopilotRewards(state: GameState, data: GameData): GameState {
  let s = state;
  const rewards = s.run?.rewards;
  if (!rewards) return s;
  let best = -1;
  let bestGain = 0;
  rewards.items.forEach((item, i) => {
    if (equipBlockReason(s, data, item, "pick")) return;
    const slot = targetSlot(item, data, s.hero.equipment);
    const current = slot ? s.hero.equipment[slot] : undefined;
    const gain = score(item) - (current ? score(current) : -1);
    if (gain > bestGain) {
      best = i;
      bestGain = gain;
    }
  });
  s =
    best >= 0
      ? applyAction(s, data, { type: "pickItem", index: best, mode: "equip" })
      : applyAction(s, data, { type: "salvageAll" });
  // Old items are never needed again by the autopilot.
  for (const placed of s.inventory) {
    s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
  }
  if (rewards.spoils.length) {
    const flask = rewards.spoils.findIndex((c) => c.kind === "flaskCharge");
    const stones = rewards.spoils.findIndex((c) => c.kind === "reforgeStones");
    const pick = s.flaskCharges < PROGRESSION.flaskStartCharges ? flask : stones;
    s = applyAction(s, data, { type: "pickSpoils", index: Math.max(0, pick) });
  }
  return applyAction(s, data, { type: "continue" });
}

function spendPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = ATTRIBUTE_PLAN[weaponId] ?? ["vitality"];
  let s = state;
  let i = 0;
  while (s.hero.unspentAttributePoints > 0) {
    const attribute = plan[i++ % plan.length] ?? "vitality";
    s = applyAction(s, data, { type: "allocateAttributes", points: { [attribute]: 1 } });
  }
  return s;
}

/** Plays an act until its boss falls or `maxAttempts` attempts are used up. */
export function playAct(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    readonly actId: string;
    readonly maxAttempts: number;
  },
): ActRunReport {
  let s = newGame(data, { seed: options.seed, starterWeapon: options.starterWeapon });
  const fightSeconds: number[] = [];
  let bossSeconds = 0;
  let levelAtBoss = 0;
  let elites = 0;
  const deathStages: number[] = [];
  let bossDeaths = 0;
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    s = applyAction(s, data, { type: "setOut", actId: options.actId });
    while (s.run) {
      s = spendPoints(s, data, options.starterWeapon);
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      const fight = currentFight(s, data);
      const result = runFight(fight.hero, fight.enemy, fight.seed);
      const encounter = s.run?.encounter;
      if (encounter?.boss) {
        bossSeconds = result.duration;
        levelAtBoss = s.hero.level;
      } else {
        fightSeconds.push(result.duration);
        if (encounter?.eliteModifiers.length) elites++;
      }
      const stage = s.run?.stage ?? 0;
      s = applyAction(s, data, { type: "resolveFight" });
      if (!s.run && s.notice?.kind === "death") {
        deathStages.push(stage);
        if (encounter?.boss) bossDeaths++;
      }
      if (s.run?.phase === "rewards") s = autopilotRewards(s, data);
    }
    if (s.notice?.kind === "actCleared") {
      return {
        cleared: true,
        deaths: s.stats.deaths,
        fights: s.stats.fights,
        levelAtBoss,
        fightSeconds,
        bossSeconds,
        elites,
        deathStages,
        bossDeaths,
      };
    }
  }
  return {
    cleared: false,
    deaths: s.stats.deaths,
    fights: s.stats.fights,
    levelAtBoss,
    fightSeconds,
    bossSeconds,
    elites,
    deathStages,
    bossDeaths,
  };
}

export interface ActSummary {
  readonly runs: number;
  readonly clearRate: number;
  readonly avgDeaths: number;
  readonly avgLevelAtBoss: number;
  readonly avgFightSeconds: number;
  readonly avgBossSeconds: number;
  readonly avgElites: number;
  /** Share of deaths that happened at the boss. */
  readonly bossDeathShare: number;
}

const avg = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function summarizeActRuns(reports: readonly ActRunReport[]): ActSummary {
  const cleared = reports.filter((r) => r.cleared);
  return {
    runs: reports.length,
    clearRate: reports.length ? cleared.length / reports.length : 0,
    avgDeaths: avg(cleared.map((r) => r.deaths)),
    avgLevelAtBoss: avg(cleared.map((r) => r.levelAtBoss)),
    avgFightSeconds: avg(reports.flatMap((r) => r.fightSeconds)),
    avgBossSeconds: avg(cleared.map((r) => r.bossSeconds)),
    avgElites: avg(reports.map((r) => r.elites)),
    bossDeathShare:
      reports.reduce((n, r) => n + r.bossDeaths, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.deathStages.length, 0),
      ),
  };
}
