import type { FightOutcome } from "../../combat/recording";
import { rollItem, rollRarity } from "../../items/generate";
import { type Rarity, RARITIES } from "../../items/types";
import { Rng } from "../../rng";
import { battlePlanUnlocks } from "../battle-plan";
import { EMPTY_BOONS, rollBoonOffer } from "../boons";
import { type BountyDefinition, bountyAfterWin } from "../bounties";
import { codexAffixFactor } from "../codex";
import { PROGRESSION } from "../constants";
import { addToGrid } from "../inventory";
import { autoRewards, gainXp, levelCap, xpForKill } from "../leveling";
import { MASTERY } from "../weapon-mastery";
import { requireCamp, requireRun } from "./actions";
import { getAct, isFinaleAct, stageMonsterLevel, waymarkKey, waymarkStages } from "./acts";
import { encounterEnemy, fightRecording, encounterName, encounterRank } from "./encounters";
import { heroBoons, heroSetup, openBoonFamilies } from "./hero-build";
import { actAffixFactor, addRunes, lootGate, rollItemChoices, rollRuneDrops } from "./loot";
import { toCamp } from "./run";
import {
  type ActData,
  type BountyDone,
  type BountyReward,
  type GameData,
  type GameState,
  type GameStats,
  fail,
  nextRng,
} from "./state";

/** The definition of a bounty by id. */
export function getBounty(data: GameData, id: string): BountyDefinition {
  return data.bounties?.find((b) => b.id === id) ?? fail(`Unknown bounty "${id}"`);
}

export function resolveFight(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "fight");
  const encounter = run.encounter ?? fail("No encounter");
  const hero = heroSetup(state, data).setup;
  // Simulated when the fight started; a state built by hand simulates it now.
  const outcome = encounter.outcome ?? fightRecording(state, data).outcome;
  const stats = { ...state.stats, fights: state.stats.fights + 1 };
  const enemyName = encounterName(encounter, run.actId, data);
  if (isFinaleAct(data, run.actId))
    return resolveFinaleFight(state, data, outcome, stats, enemyName);

  // The Ember Thief got away: the stage still counts, with the normal loot.
  const escaped = encounter.thief === true && outcome.fled === "enemy";
  const caught = encounter.thief === true && outcome.winner === "hero";
  if (outcome.winner !== "hero" && !escaped) {
    // A draw at the time limit counts as a defeat: the act has to be tried again.
    return toCamp(
      {
        ...state,
        stats: { ...stats, deaths: stats.deaths + 1 },
        progress: { ...state.progress, deathsInAct: state.progress.deathsInAct + 1 },
      },
      data,
      {
        kind: "death",
        actId: run.actId,
        stage: run.stage,
        enemyName,
        ...(run.wildfire ? { wildfire: run.wildfire } : {}),
      },
    );
  }

  const [rng, next] = nextRng(state);
  const act = getAct(data, run.actId);
  const rank = encounterRank(encounter);
  const xp = xpForKill(encounter.level, rank, state.hero.level);
  const auto = autoRewards(encounter.level, rank);
  const stones =
    rank === "boss"
      ? rng.int(...PROGRESSION.bossEmberCoal)
      : rank === "elite"
        ? rng.int(...PROGRESSION.eliteEmberCoal)
        : rng.chance(PROGRESSION.normalEmberCoalChance)
          ? 1
          : 0;
  const feathers =
    rank === "boss"
      ? PROGRESSION.bossPhoenixFeathers
      : rank === "elite" && rng.chance(PROGRESSION.elitePhoenixFeatherChance)
        ? 1
        : 0;
  const leveled = gainXp(state.hero.level, state.hero.xp, xp, levelCap(state.legacy.prestige));
  const tier = run.wildfire ?? 0;
  const waymark =
    !tier &&
    !state.progress.waymarks.includes(waymarkKey(act.id, run.stage)) &&
    waymarkStages(act).includes(run.stage);
  const fight = {
    archetype: encounter.boss ? "boss" : encounterEnemy(encounter, act, data).archetype,
    actId: act.id,
    boss: encounter.boss,
  };
  const items = rollItemChoices(
    data,
    act.id,
    caught ? encounter : { ...encounter, thief: false },
    rank,
    state.progress.deathsInAct,
    state.legacy.prestige,
    rng,
    actAffixFactor(act, codexAffixFactor(data.items, fight)),
    1 + PROGRESSION.wildfire.legendaryPerTier * tier,
  );
  const runes = rollRuneDrops(
    data,
    rank,
    act.number + state.legacy.prestige + PROGRESSION.wildfire.runeTiersPerTier * tier,
    rng,
  );
  const found = items.flatMap((it) => (it.uniqueId ? [it.uniqueId] : []));
  const newTrophies = [...new Set(found)].filter((id) => !state.legacy.trophies.includes(id));
  // Ember Shrine (Spielspaß Teil 1): after Stage 5 and 10 and Elites of an act this run has not
  // cleared yet. Bosses have none: their moment belongs to the Hoard and the Echo.
  // Wildfire has no Shrines: the Boons of the run carry the fire.
  const shrine =
    !tier &&
    (data.boons?.length ?? 0) > 0 &&
    !state.progress.actsCleared.includes(act.id) &&
    rank !== "boss" &&
    (rank === "elite" || act.shrineStages.includes(run.stage));
  // The act boss leaves its Echo, one stage stronger once per run (Weapon Mastery).
  const echoDef = rank === "boss" ? data.echoes.find((e) => e.actId === act.id) : undefined;
  const echoBefore = echoDef ? state.legacy.echoes[echoDef.id] : undefined;
  const echo =
    echoDef && (!echoBefore || echoBefore.prestige !== state.legacy.prestige)
      ? {
          id: echoDef.id,
          stage: Math.min(MASTERY.maxEchoStage, (echoBefore?.stage ?? 0) + 1),
        }
      : undefined;
  const boonOffer = shrine
    ? rollBoonOffer(
        data.boons ?? [],
        data.boonFamilies ?? [],
        {
          open: openBoonFamilies(data, act.number),
          active: heroBoons(state, data),
          damageType: hero.weapon.damageType,
          reactionSlot: battlePlanUnlocks(state.legacy.prestige).reactionSlots > 0,
        },
        rng,
      )
    : [];

  // The Scout's bounty: a win may finish it; it is turned in at the Scout in the Camp.
  const lifeFraction = outcome.heroLife;
  const bounty = run.bounty
    ? bountyAfterWin(run.bounty, getBounty(data, run.bounty.id).goal, {
        rank,
        enemyId: encounter.enemyId,
        thiefCaught: caught,
        lifeFraction,
      })
    : undefined;
  const bountyDone = bounty?.status === "done" && run.bounty?.status === "open";

  const won: GameState = {
    ...next,
    stats: {
      ...stats,
      wins: stats.wins + 1,
      bossKills: stats.bossKills + (rank === "boss" ? 1 : 0),
    },
    hero: {
      ...state.hero,
      // The first Echo goes straight onto the weapon.
      ...(echo && !state.hero.mastery.echo
        ? { mastery: { ...state.hero.mastery, echo: echo.id } }
        : {}),
      level: leveled.level,
      xp: leveled.xp,
      unspentSkillPoints: state.hero.unspentSkillPoints + (waymark ? 1 : 0),
    },
    ...(waymark
      ? {
          progress: {
            ...state.progress,
            waymarks: [...state.progress.waymarks, waymarkKey(act.id, run.stage)],
          },
        }
      : {}),
    wallet: {
      ...state.wallet,
      acorns: state.wallet.acorns + auto.acorns,
      ash: state.wallet.ash + auto.ash,
      emberCoal: state.wallet.emberCoal + stones,
      phoenixFeathers: state.wallet.phoenixFeathers + feathers,
      runes: addRunes(state.wallet.runes, runes),
    },
    legacy: {
      ...state.legacy,
      runesFound: [...new Set([...state.legacy.runesFound, ...runes])],
      trophies: [...state.legacy.trophies, ...newTrophies],
      ...(echo
        ? {
            echoes: {
              ...state.legacy.echoes,
              [echo.id]: { stage: echo.stage, prestige: state.legacy.prestige },
            },
          }
        : {}),
    },
    run: {
      ...run,
      phase: "rewards",
      lifeFraction,
      ...(bounty ? { bounty } : {}),
      rewards: {
        rank,
        xp,
        acorns: auto.acorns,
        ash: auto.ash,
        emberCoal: stones,
        phoenixFeathers: feathers,
        runes,
        levelsGained: leveled.levelsGained,
        ...(waymark ? { waymark: true } : {}),
        report: outcome.report,
        items,
        ...(rank === "boss" ? { picks: PROGRESSION.bossHoardPicks } : {}),
        ...(caught ? { picks: PROGRESSION.thiefPicks, thief: "caught" as const } : {}),
        ...(escaped ? { thief: "escaped" as const } : {}),
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
        ...(newTrophies.length ? { newTrophies } : {}),
        ...(echo ? { echo } : {}),
        ...(bountyDone ? { bountyDone: true } : {}),
        itemPick: null,
        salvagedAsh: 0,
      },
    },
  };
  return won;
}

/**
 * What a done bounty pays: Acorns worth `bounty.acornKills` normal kills at the act boss's level,
 * Ember Coal and one item of at least Rare (inside the run's Elite window).
 */
export function bountyReward(
  state: GameState,
  data: GameData,
  act: ActData,
  rng: Rng,
): BountyReward {
  const level = stageMonsterLevel(data, act, act.stages, state.legacy.prestige);
  const window = lootGate(state.legacy.prestige).elite;
  const top = RARITIES.indexOf(window.max);
  const weights = { ...PROGRESSION.rarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) {
    const i = RARITIES.indexOf(r);
    if (i < RARITIES.indexOf("rare") || i > Math.max(top, RARITIES.indexOf("rare"))) weights[r] = 0;
  }
  if (RARITIES.every((r) => weights[r] === 0)) weights.rare = 1;
  const baseId = data.lootBases[rng.int(0, data.lootBases.length - 1)] ?? fail("No loot bases");
  const item = rollItem(
    data.items,
    { baseId, itemLevel: level, rarity: rollRarity(rng, weights) },
    rng,
  );
  return {
    acorns: autoRewards(level, "normal").acorns * PROGRESSION.bounty.acornKills,
    emberCoal: PROGRESSION.bounty.emberCoal,
    item,
  };
}

/** The Scout pays a done bounty: Acorns and Ember Coal, the item goes into the inventory. */
export function turnInBounty(state: GameState, data: GameData): GameState {
  requireCamp(state);
  const done = state.bountyDone ?? fail("No bounty to turn in");
  const [rng, next] = nextRng(state);
  const reward = bountyReward(state, data, getAct(data, done.actId), rng);
  const inventory = addToGrid(state.inventory, reward.item, data.items) ?? fail("Inventory full");
  const rest: GameState = { ...next };
  delete (rest as { bountyDone?: BountyDone }).bountyDone;
  return {
    ...rest,
    inventory,
    wallet: {
      ...state.wallet,
      acorns: state.wallet.acorns + reward.acorns,
      emberCoal: state.wallet.emberCoal + reward.emberCoal,
    },
  };
}

/**
 * A fight of The Last Ember: no loot, no XP. A win offers Stolen Fire from every family (Fusions
 * likelier); the last win brings the flame home. A death ends the attempt.
 */
function resolveFinaleFight(
  state: GameState,
  data: GameData,
  outcome: FightOutcome,
  stats: GameStats,
  enemyName: string,
): GameState {
  const run = requireRun(state, "fight");
  const finale = getAct(data, run.actId);
  if (outcome.winner !== "hero") {
    return toCamp({ ...state, stats: { ...stats, deaths: stats.deaths + 1 } }, data, {
      kind: "death",
      actId: run.actId,
      stage: run.stage,
      enemyName,
    });
  }
  const won = { ...stats, wins: stats.wins + 1, bossKills: stats.bossKills + 1 };
  if (run.stage >= finale.stages) {
    const home = toCamp({ ...state, stats: won }, data, {
      kind: "ending",
      actId: run.actId,
      stage: run.stage,
      enemyName,
    });
    return { ...home, boons: EMPTY_BOONS, legacy: { ...home.legacy, finaleWon: true } };
  }
  const [rng, next] = nextRng(state);
  const boonOffer = rollBoonOffer(
    data.boons ?? [],
    data.boonFamilies ?? [],
    {
      open: (data.boonFamilies ?? []).map((f) => f.id),
      active: heroBoons(state, data),
      damageType: heroSetup(state, data).setup.weapon.damageType,
      reactionSlot: battlePlanUnlocks(state.legacy.prestige).reactionSlots > 0,
      fusionWeight: PROGRESSION.finaleFusionWeight,
    },
    rng,
  );
  return {
    ...next,
    stats: won,
    run: {
      ...run,
      phase: "rewards",
      lifeFraction: outcome.heroLife,
      rewards: {
        rank: "boss",
        xp: 0,
        acorns: 0,
        ash: 0,
        emberCoal: 0,
        phoenixFeathers: 0,
        runes: [],
        levelsGained: 0,
        report: outcome.report,
        items: [],
        itemPick: { kind: "salvageAll" },
        salvagedAsh: 0,
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
      },
    },
  };
}
