import {
  type Attributes,
  type GameData,
  type GameState,
  type Item,
  PROGRESSION,
  RARITIES,
  applyAction,
  currentFight,
  type LearnedNodes,
  equipBlockReason,
  getNode,
  neighbours,
  newGame,
  runFight,
  sealsAvailable,
  targetSlot,
} from "@emberheir/sim";

/**
 * Plays whole acts with a simple autopilot to answer the PoC questions "how long does a fight
 * take" and "how often do you die before the boss" (game-design-document-v1.md section 11).
 */

export interface ActRunReport {
  /** 1 = the first run, 2 = after the first Prestige, ... */
  readonly generation: number;
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
  /** The very first fight of the generation was lost. */
  readonly firstFightLost: boolean;
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

/** Skill Tree goals per starter weapon: a second skill for Rotation Slot 2, then notables. */
const TREE_PLAN: Record<string, { readonly nodes: readonly string[]; readonly slot2: string }> = {
  sword: {
    nodes: ["might-flurry", "might-brutal-force", "might-killer-instinct", "might-power-strike"],
    slot2: "flurry",
  },
  "fire-wand": {
    nodes: ["arcana-chain-lightning", "arcana-kindled-mind", "arcana-storm-weaver"],
    slot2: "chain-lightning",
  },
};

/** Shortest list of nodes to learn so that `target` gets a rank (breadth-first search). */
function pathTo(data: GameData, learned: LearnedNodes, target: string): string[] {
  const tree = data.skillTree;
  const known = (id: string) => id === tree.startNodeId || (learned[id] ?? 0) > 0;
  if (known(target)) return [target];
  const from = new Map<string, string | null>();
  const queue = tree.nodes.filter((n) => known(n.id)).map((n) => n.id);
  for (const id of queue) from.set(id, null);
  while (queue.length) {
    const id = queue.shift() ?? "";
    for (const next of neighbours(tree, id)) {
      if (from.has(next) || getNode(tree, next).kind === "keystone") continue;
      from.set(next, id);
      if (next === target) {
        const path = [next];
        let back = from.get(next) ?? null;
        while (back && !known(back)) {
          path.unshift(back);
          back = from.get(back) ?? null;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

/** Kaelen: spends Skill Points along the weapon's plan and fills Rotation Slot 2. */
function spendSkillPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = TREE_PLAN[weaponId];
  if (!plan || !state.progress.trainerUnlocked || state.run) return state;
  let s = state;
  for (const target of plan.nodes) {
    for (const id of pathTo(data, s.hero.learned, target)) {
      if (s.hero.unspentSkillPoints <= 0) break;
      try {
        s = applyAction(s, data, { type: "learnNodes", nodeIds: [id] });
      } catch {
        break;
      }
    }
  }
  if (s.progress.rotationSlots > 1) {
    try {
      s = applyAction(s, data, { type: "setRotationSkill", slot: 1, skillId: plan.slot2 });
    } catch {
      // Skill not learned yet.
    }
  }
  return s;
}

/** Seals the slots with the best items (rarity, then Item Level), the weapon on ties. */
function autopilotPrestige(state: GameState, data: GameData): GameState {
  const slots = data.equipmentSlots
    .filter((slot) => state.hero.equipment[slot])
    .sort((a, b) => {
      const ia = state.hero.equipment[a];
      const ib = state.hero.equipment[b];
      return (ib ? score(ib) : 0) - (ia ? score(ia) : 0);
    });
  const sealed = slots.slice(0, sealsAvailable(state, data));
  const s = applyAction(state, data, { type: "prestige", sealedSlots: sealed });
  return applyAction(s, data, { type: "dismissNotice" });
}

/**
 * Plays an act until its boss falls or `maxAttempts` attempts are used up. With `generations`
 * above 1 it prestiges after the final boss and plays the act again: one report per generation.
 */
export function playGenerations(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    readonly actId: string;
    readonly maxAttempts: number;
    readonly generations: number;
  },
): ActRunReport[] {
  let s = newGame(data, { seed: options.seed, starterWeapon: options.starterWeapon });
  const reports: ActRunReport[] = [];
  for (let generation = 1; generation <= options.generations; generation++) {
    const before = s.stats;
    const fightSeconds: number[] = [];
    let bossSeconds = 0;
    let levelAtBoss = 0;
    let elites = 0;
    const deathStages: number[] = [];
    let bossDeaths = 0;
    let firstFightLost = false;
    let cleared = false;
    s = spendSkillPoints(s, data, options.starterWeapon);
    for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
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
        const first = s.stats.fights === before.fights;
        s = applyAction(s, data, { type: "resolveFight" });
        if (!s.run && s.notice?.kind === "death") {
          if (first) firstFightLost = true;
          deathStages.push(stage);
          if (encounter?.boss) bossDeaths++;
        }
        if (s.run?.phase === "rewards") s = autopilotRewards(s, data);
      }
      cleared = s.pendingPrestige !== null || s.notice?.kind === "actCleared";
      if (!s.pendingPrestige) s = applyAction(s, data, { type: "dismissNotice" });
    }
    reports.push({
      generation,
      cleared,
      deaths: s.stats.deaths - before.deaths,
      fights: s.stats.fights - before.fights,
      levelAtBoss,
      fightSeconds,
      bossSeconds,
      elites,
      deathStages,
      bossDeaths,
      firstFightLost,
    });
    if (!cleared || generation === options.generations || !s.pendingPrestige) break;
    s = autopilotPrestige(s, data);
  }
  return reports;
}

/** Plays one generation of an act (see `playGenerations`). */
export function playAct(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    readonly actId: string;
    readonly maxAttempts: number;
  },
): ActRunReport {
  const [report] = playGenerations(data, { ...options, generations: 1 });
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
  /** Share of deaths that happened at the boss. */
  readonly bossDeathShare: number;
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
    bossDeathShare:
      reports.reduce((n, r) => n + r.bossDeaths, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.deathStages.length, 0),
      ),
  };
}
