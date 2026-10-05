import {
  BOON_GRADES,
  type BoonPick,
  heroBoons,
  type Attributes,
  type GameData,
  type GameState,
  type Item,
  PROGRESSION,
  RARITIES,
  actsInRun,
  applyAction,
  currentFight,
  type LearnedNodes,
  equipBlockReason,
  getNode,
  neighbours,
  newGame,
  runFight,
  type SlotModifier,
  battlePlanUnlocks,
  heroSetup,
  knownSkills,
  nodeMaxRanks,
  openBranches,
  targetSlot,
} from "@emberheir/sim";

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

/** Attribute points per level for each weapon. */
const ATTRIBUTE_PLAN: Record<string, (keyof Attributes)[]> = {
  sword: ["strength", "agility", "vitality"],
  "fire-wand": ["intelligence", "wisdom", "vitality"],
  axe: ["strength", "vitality", "wisdom"],
  dagger: ["dexterity", "agility", "vitality"],
  mace: ["strength", "vitality", "agility"],
  staff: ["intelligence", "wisdom", "vitality"],
  bow: ["dexterity", "agility", "vitality"],
  crossbow: ["strength", "dexterity", "vitality"],
};

const rarityRank = (item: Item) => RARITIES.indexOf(item.rarity);
/** Crude item score: rarity first, then Item Level. */
const score = (item: Item) => rarityRank(item) * 10 + item.itemLevel;

/** Boon choice: a family that fits the weapon (or Hearth) first, then rank-ups, then the grade. */
function bestBoon(state: GameState, data: GameData, offer: readonly BoonPick[]): number {
  const damageType = heroSetup(state, data).setup.weapon.damageType;
  const owned = new Set(heroBoons(state, data).map((b) => b.def.id));
  const value = (pick: BoonPick) => {
    const def = data.boons?.find((b) => b.id === pick.id);
    const family = data.boonFamilies?.find((f) => f.id === def?.family);
    const fits =
      !family || family.damageTypes.length === 0 || family.damageTypes.includes(damageType);
    return (fits ? 10 : 0) + (owned.has(pick.id) ? 3 : 0) + BOON_GRADES.indexOf(pick.grade);
  };
  let best = 0;
  offer.forEach((pick, i) => {
    if (value(pick) > value(offer[best] ?? pick)) best = i;
  });
  return best;
}

function autopilotRewards(state: GameState, data: GameData): GameState {
  let s = state;
  const rewards = s.run?.rewards;
  if (!rewards) return s;
  // Boss Hoard: up to `picks` cards, the best upgrade each time.
  while (s.run?.rewards && !s.run.rewards.itemPick) {
    const taken = new Set((s.run.rewards.taken ?? []).map((t) => t.index));
    let best = -1;
    let bestGain = 0;
    const weaponId = s.hero.equipment.mainHand?.baseId;
    rewards.items.forEach((item, i) => {
      if (taken.has(i) || equipBlockReason(s, data, item, "pick")) return;
      // The autopilot sticks to its weapon type, like a player who planned the build.
      const base = data.items.bases.get(item.baseId);
      if (base?.weapon && item.baseId !== weaponId) return;
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
  }
  // Old items are never needed again by the autopilot: Thoric salvages them in the Camp, so on
  // the road they wait in the inventory (thrown away only to make room).
  for (const placed of s.inventory.slice(0, Math.max(0, s.inventory.length - 4))) {
    s = applyAction(s, data, { type: "discard", itemId: placed.item.id });
  }
  if (rewards.spoils.length) {
    const flask = rewards.spoils.findIndex((c) => c.kind === "flaskCharge");
    const stones = rewards.spoils.findIndex((c) => c.kind === "reforgeStones");
    const pick = s.flaskCharges < PROGRESSION.flaskStartCharges ? flask : stones;
    s = applyAction(s, data, { type: "pickSpoils", index: Math.max(0, pick) });
  }
  const offer = s.run?.rewards?.boonOffer;
  if (offer?.length)
    s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
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

/**
 * Build plan per starter weapon: Skill Tree goals, Rotation skills (slot 1 is the Start Skill),
 * Prestige branches by preference, a Reaction skill once one is unlocked.
 */
interface BuildPlan {
  readonly nodes: readonly string[];
  readonly rotation: readonly string[];
  readonly branches: readonly string[];
  readonly reaction?: { readonly skillId: string; readonly conditionId: string };
}

const TREE_PLAN: Record<string, BuildPlan> = {
  sword: {
    nodes: [
      "might-unbroken",
      "might-flurry",
      "might-brutal-force",
      "might-killer-instinct",
      "might-power-strike",
    ],
    rotation: ["flurry", "feint", "execute"],
    branches: ["duelist", "warden", "tactician", "butcher"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
  },
  mace: {
    nodes: [
      "might-unbroken",
      "might-brutal-force",
      "might-flurry",
      "might-killer-instinct",
      "might-execute",
    ],
    rotation: ["flurry", "execute", "feint"],
    branches: ["warden", "duelist", "tactician", "butcher"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
  },
  "fire-wand": {
    nodes: ["arcana-chain-lightning", "arcana-kindled-mind", "arcana-storm-weaver"],
    rotation: ["chain-lightning", "thunderstrike", "meteor"],
    branches: ["stormcaller", "frostbinder", "tactician", "warden"],
    reaction: { skillId: "frost-nova", conditionId: "enemy-windup" },
  },
  staff: {
    nodes: ["affliction-corrupt", "affliction-void-lord", "affliction-soul-harvest"],
    rotation: ["corrupt", "void-rift", "soul-harvest"],
    branches: ["void-lord", "frostbinder", "tactician", "warden"],
    reaction: { skillId: "frost-nova", conditionId: "enemy-windup" },
  },
  axe: {
    nodes: [
      "might-unbroken",
      "rupture-butcher",
      "rupture-lacerate",
      "rupture-rend",
      "rupture-thick-blood",
    ],
    rotation: ["rend", "cleave", "lacerate"],
    branches: ["butcher", "warden", "duelist", "tactician"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
  },
  bow: {
    nodes: ["rupture-butcher", "rupture-lacerate", "rupture-rend", "rupture-thick-blood"],
    rotation: ["rend", "lacerate", "cleave"],
    branches: ["marksman", "butcher", "tactician", "warden"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
  },
  crossbow: {
    nodes: ["might-brutal-force", "might-flurry", "might-killer-instinct", "might-power-strike"],
    rotation: ["piercing-shot", "flurry", "execute"],
    branches: ["marksman", "duelist", "tactician", "warden"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
  },
  dagger: {
    nodes: ["might-unbroken", "rupture-venomancer", "rupture-venom-coat", "rupture-toxic-burst"],
    rotation: ["toxic-burst", "plague-cloud", "venom-coat"],
    branches: ["venomancer", "tactician", "warden", "duelist"],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
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

/** Learns one node after the other along the shortest path; stops when points run out. */
function learnTowards(s: GameState, data: GameData, target: string): GameState {
  for (const id of pathTo(data, s.hero.learned, target)) {
    if (s.hero.unspentSkillPoints <= 0) break;
    try {
      s = applyAction(s, data, { type: "learnNodes", nodeIds: [id] });
    } catch {
      break;
    }
  }
  return s;
}

/**
 * Kaelen: spends Skill Points on the plan's nodes, then the unlocked Prestige branches, then the
 * rest of the tree (no Keystones). Fills the Rotation, a Reaction and the Slot Modifiers.
 */
function spendSkillPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = TREE_PLAN[weaponId];
  if (!plan || state.run) return state;
  let s = state;
  for (const target of plan.nodes) s = learnTowards(s, data, target);
  const branchNodes = [...new Set(s.legacy.branches)].flatMap((b) =>
    data.skillTree.nodes.filter((n) => n.prestigeBranch === b && n.kind !== "keystone"),
  );
  const rest = data.skillTree.nodes.filter((n) => !n.prestigeBranch && n.kind !== "keystone");
  for (const node of [...branchNodes, ...rest]) {
    while (
      s.hero.unspentSkillPoints > 0 &&
      (s.hero.learned[node.id] ?? 0) < nodeMaxRanks(node, s.legacy.branches)
    ) {
      const before = s;
      s = learnTowards(s, data, node.id);
      if (s === before) break;
    }
  }
  const weapon = heroSetup(s, data).setup.weapon;
  const known = new Set(knownSkills(s, data, weapon).map((k) => k.skill.id));
  const rotation = plan.rotation.filter((id) => known.has(id));
  for (let slot = 1; slot < s.progress.rotationSlots; slot++) {
    const skillId = rotation[slot - 1];
    if (skillId && s.hero.rotation[slot] !== skillId) {
      s = applyAction(s, data, { type: "setRotationSkill", slot, skillId });
    }
  }
  const unlocks = battlePlanUnlocks(s.legacy.prestige);
  const mods = (first: SlotModifier): SlotModifier[] =>
    ([unlocks.rareModifiers ? "reverb" : "overcharge", first] as SlotModifier[]).slice(
      2 - unlocks.modifiers,
    );
  const reaction =
    unlocks.reactionSlots > 0 && plan.reaction && known.has(plan.reaction.skillId)
      ? plan.reaction
      : null;
  try {
    s = applyAction(s, data, {
      type: "setBattlePlan",
      plan: {
        ...s.hero.plan,
        modifiers: Array.from({ length: s.progress.rotationSlots }, (_, i) =>
          mods(i === 0 ? "thrifty" : "empowered"),
        ),
        reactions: reaction ? [reaction] : [],
        reactionModifiers: reaction ? [mods("thrifty")] : [],
        capstone: unlocks.capstone ? (s.hero.plan.capstone ?? { id: "crescendo", slot: 0 }) : null,
        openingMove: unlocks.openingMove ? (rotation[0] ?? null) : null,
      },
    });
  } catch {
    // Keep the old plan.
  }
  return s;
}

/**
 * Prestiges with the first new branch the weapon's tree plan prefers; once all of them are owned,
 * deepens them in plan order. All items stay.
 */
function autopilotPrestige(state: GameState, data: GameData): GameState {
  const open = openBranches(state, data).map((b) => b.id);
  const weaponId = state.hero.equipment.mainHand?.baseId ?? "";
  const plan = TREE_PLAN[weaponId]?.branches ?? [];
  const preferred =
    plan.find((b) => open.includes(b) && !state.legacy.branches.includes(b)) ??
    plan.find((b) => open.includes(b)) ??
    open[0];
  const s = applyAction(state, data, {
    type: "prestige",
    ...(preferred ? { branchId: preferred } : {}),
  });
  return applyAction(s, data, { type: "dismissNotice" });
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
    /** Last act to play (its number). */
    readonly upToAct: number;
    readonly maxAttempts: number;
    readonly generations: number;
    /** After the last generation: the final Prestige and The Last Ember (report act = 8). */
    readonly finale?: boolean;
  },
): ActRunReport[] {
  // Weapons that only drop (Axe, Dagger) can be tested as if the hero started with them.
  const start = data.starterWeapons.includes(options.starterWeapon)
    ? data
    : { ...data, starterWeapons: [...data.starterWeapons, options.starterWeapon] };
  let s = newGame(start, { seed: options.seed, starterWeapon: options.starterWeapon });
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
        s = spendSkillPoints(s, data, options.starterWeapon);
        s = applyAction(s, data, { type: "setOut", actId: act.id });
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
    s = autopilotPrestige(s, data);
  }
  if (options.finale && data.finale && s.pendingPrestige) {
    s = autopilotPrestige(s, data);
    if (s.legacy.prestige >= PROGRESSION.finalPrestige) {
      reports.push(playFinale(s, data, options.generations + 1, options.maxAttempts));
    }
  }
  return reports;
}

/** The Last Ember with the autopilot: attempts until the Core falls (best Boon after each win). */
function playFinale(
  state: GameState,
  data: GameData,
  generation: number,
  maxAttempts: number,
): ActRunReport {
  let s = state;
  const before = s.stats;
  const fightSeconds: number[] = [];
  const deathStages: number[] = [];
  const deathEnemies: string[] = [];
  let bossSeconds = 0;
  let cleared = false;
  for (let attempt = 0; attempt < maxAttempts && !cleared; attempt++) {
    s = applyAction(s, data, { type: "enterFinale" });
    while (s.run) {
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      const fight = currentFight(s, data);
      const result = runFight(fight.hero, fight.enemy, fight.seed);
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
  return {
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
