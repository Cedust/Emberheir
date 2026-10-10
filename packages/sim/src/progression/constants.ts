import type { ItemSlot, Rarity } from "../items/types";
import type { EnemyRank } from "./leveling";

/**
 * Tuning numbers for progression and rewards. Starting values for the balance CLI
 * (`npm run balance -- --act 1`), not final design. Sources: game-design-document-v1.md
 * section 2 and 3, loot-rewards-v1.md, town-crafting-v1.md.
 */
/**
 * XP needed to go from level N to N + 1 (index 0 = level 1 → 2), up to level 100. Each run spreads
 * its Level Band over all its stages (prestige-acts-v1.md section 4). A level costs
 * `killsPerLevel(level)` normal kills of the same Monster Level: few early (run 1 climbs 10 levels
 * in one act), more later (run 7 climbs 15 levels over seven acts). The XP penalty for being above
 * the monsters makes out-levelling a wall slow, but never impossible (level-v2.md section 6).
 */
function buildXpTable(base: number, perLevel: number): readonly number[] {
  const table: number[] = [];
  for (let level = 1; level < 100; level++) {
    table.push(Math.round(XP_KILLS(level) * (base + perLevel * (level - 1))));
  }
  return table;
}

const XP_BASE = 20;
const XP_PER_MONSTER_LEVEL = 10;
/** Normal kills of the same Monster Level per level (balance CLI). */
const XP_KILLS = (level: number) => 1.6 + 0.07 * (level - 1);

/** A rarity window of the item pick for one enemy rank. */
export interface RarityRange {
  readonly floor: Rarity;
  readonly max: Rarity;
  /** Weight factor of the top rarity, below 1 when it should stay a rare moment. */
  readonly topWeight?: number;
  /** One card of the pick is at least this rarity. */
  readonly sure?: Rarity;
}

/**
 * What a run can drop (Playtest 2): items stay through Prestige, so rarity opens up over the whole
 * game instead of within one run. A Rare in run 1 is an event, Epic comes from run 3's bosses.
 */
export interface LootGate {
  readonly normal: RarityRange;
  readonly elite: RarityRange;
  readonly boss: RarityRange;
  /** Chance that one card of the pick is Legendary (or Unique), by enemy rank. */
  readonly legendary: Readonly<Record<EnemyRank, number>>;
  /** Bosses may drop their trophy Uniques. */
  readonly trophies: boolean;
  /** Highest rarity Marisha's gambling can give. */
  readonly gambleMax: Rarity;
}

const LOOT_GATES: readonly LootGate[] = [
  // Run 1: the boss always gives one Rare.
  {
    normal: { floor: "normal", max: "magic" },
    elite: { floor: "magic", max: "rare" },
    boss: { floor: "magic", max: "rare", sure: "rare" },
    legendary: { normal: 0, elite: 0, boss: 0 },
    trophies: false,
    gambleMax: "rare",
  },
  // Run 2: Rare becomes common, still no Epic (Playtest 2: Epics in runs 1 and 2 were too much).
  {
    normal: { floor: "normal", max: "rare", topWeight: 0.3 },
    elite: { floor: "rare", max: "rare" },
    boss: { floor: "rare", max: "rare" },
    legendary: { normal: 0, elite: 0, boss: 0 },
    trophies: false,
    gambleMax: "rare",
  },
  // Run 3: the first Epics, from bosses only.
  {
    normal: { floor: "normal", max: "rare" },
    elite: { floor: "rare", max: "rare" },
    boss: { floor: "rare", max: "epic", topWeight: 0.3 },
    legendary: { normal: 0, elite: 0, boss: 0 },
    trophies: false,
    gambleMax: "epic",
  },
  // Run 4
  {
    normal: { floor: "normal", max: "rare" },
    elite: { floor: "rare", max: "epic", topWeight: 0.3 },
    boss: { floor: "rare", max: "epic", sure: "epic" },
    legendary: { normal: 0, elite: 0, boss: 0.25 },
    trophies: true,
    gambleMax: "epic",
  },
  // Run 5
  {
    normal: { floor: "normal", max: "epic", topWeight: 0.3 },
    elite: { floor: "rare", max: "epic" },
    boss: { floor: "epic", max: "epic" },
    legendary: { normal: 0, elite: 0.04, boss: 0.25 },
    trophies: true,
    gambleMax: "legendary",
  },
  // Run 6 and later
  {
    normal: { floor: "normal", max: "epic" },
    elite: { floor: "rare", max: "epic" },
    boss: { floor: "epic", max: "epic" },
    legendary: { normal: 0, elite: 0.04, boss: 0.25 },
    trophies: true,
    gambleMax: "legendary",
  },
];

export const PROGRESSION = {
  /** Max level (level-v2.md section 4). */
  maxLevel: 100,
  /** The Level Cap of a run lies this far above its boss's Monster Level: room to farm past a wall. */
  levelHeadroom: 10,
  /** Acts of a full world (run 7). */
  actsPerFullRun: 7,
  /**
   * Skill Points come from progress, not from levels (level-v2.md section 7): 2 at the start,
   * 1 per Waymark (3 per act in every run, 84 in all) and `harvestSkillPoints` per Prestige
   * (14 in all). 100 at the end.
   */
  startSkillPoints: 2,
  harvestSkillPoints: 2,
  xpToNextLevel: buildXpTable(XP_BASE, XP_PER_MONSTER_LEVEL),
  /** XP of a normal enemy: base + perLevel × (Monster Level − 1). */
  xpBase: XP_BASE,
  xpPerMonsterLevel: XP_PER_MONSTER_LEVEL,
  /** Enemies below the hero's level give 10 % less XP per level, at least 10 %. */
  xpPenaltyPerLevel: 0.1,
  xpMinFactor: 0.1,
  /** Playtest 2: enemies above the hero give 5 % more XP per level, at most double. */
  xpBonusPerLevel: 0.05,
  xpMaxFactor: 2,

  acornsBase: 4,
  acornsPerMonsterLevel: 2,
  /** Ash every win gives on top of the auto-salvaged loot. */
  ashBase: 1,
  ashPerMonsterLevel: 1,

  /** Reward multipliers for Elites and Bosses (XP, Acorns, Ash). */
  eliteRewardMultiplier: { xp: 3, acorns: 2, ash: 2 },
  bossRewardMultiplier: { xp: 6, acorns: 5, ash: 4 },
  /** Share of those Legendary cards that become a Unique (if one fits). */
  uniqueShare: 0.35,
  /** Boss Hoard: cards after a boss and how many of them the hero takes. */
  bossHoardCards: 6,
  bossHoardPicks: 2,
  /**
   * Ember Thief (Teil 3 C): a rare enemy on normal stages from this act on. It runs away after a
   * while; caught, it drops a small Hoard with one card at least Rare.
   */
  thiefFromAct: 2,
  thiefChance: 0.03,
  thiefFleeSeconds: 15,
  thiefCards: 4,
  thiefPicks: 2,
  /** Chance per boss kill that one Hoard card is a trophy from the boss's own list. */
  bossTrophyChance: 0.1,
  /** The top Rune ranks only drop from Elites and Bosses, this much rarer on top of the falloff. */
  highRuneRanks: 2,
  highRuneFactor: 0.3,
  /** Expected Runes per win by rank (fractions are chances, 1.5 = one plus 50 % a second). */
  runeDrops: { normal: 0.06, elite: 0.5, boss: 1.5 } satisfies Record<EnemyRank, number>,
  /** Rune ranks that drop: base + per Act Tier (Act 1 → up to rank 3, Act 2 → 5). */
  runeRankBase: 1,
  runeRanksPerActTier: 2,
  /** Each Rune rank drops this much less often than the one below it. */
  runeRankFalloff: 0.5,
  /** Ember Coal drop on their own like Runes: Elites and bosses always (min, max)... */
  eliteEmberCoal: [2, 3],
  bossEmberCoal: [4, 6],
  /** ...normal enemies sometimes. */
  normalEmberCoalChance: 0.15,

  /** Ash for one item: by rarity, × Item Tier. */
  salvageAsh: { normal: 2, magic: 4, rare: 8, epic: 16, legendary: 32 } satisfies Record<
    Rarity,
    number
  >,

  /** Cards in the item pick after every win. */
  itemChoices: 3,
  /**
   * Item pick: each card picks an item slot by these weights (three different slots while
   * possible), then a random base of that slot. So adding bases to a slot never makes weapons
   * rarer. Rings fill two equipment slots and show up a bit more often.
   */
  lootSlotWeights: {
    mainHand: 1.2,
    offHand: 1,
    helm: 1,
    body: 1,
    gloves: 1,
    boots: 1,
    belt: 1,
    amulet: 1,
    ring: 1.5,
    charm: 1,
  } satisfies Record<ItemSlot, number>,
  /** Rarity weights of the item pick, inside the run's window (`lootGates`). */
  rarityWeights: { normal: 40, magic: 35, rare: 20, epic: 5, legendary: 0 } satisfies Record<
    Rarity,
    number
  >,
  /** Rarity windows and Legendary chances by run (index 0 = run 1); the last one stays. */
  lootGates: LOOT_GATES,
  /** Pity: every death in the current act raises the two highest allowed weights by this much... */
  pityPerDeath: 0.25,
  /** ...for at most this many deaths. Resets when the act boss falls. */
  pityMaxDeaths: 4,

  /** Elite chance = base + perStage × (stage in act − 1) (+ per act / prestige later). */
  eliteChanceBase: 0.05,
  /** No Elites on the first stages of an act, so a fresh Heir cannot lose its first fight. */
  eliteFreeStages: 2,
  eliteChancePerStage: 0.005,
  eliteChancePerAct: 0.02,
  eliteChanceCap: 0.5,
  /** Elites are tougher: life and damage multipliers on top of their modifiers. */
  eliteLifeMultiplier: 1.4,
  eliteDamageMultiplier: 1.15,
  /** Number of Elite modifiers: 1 + one more every this many Monster Levels, at most 3. */
  monsterLevelsPerEliteModifier: 25,
  maxEliteModifiers: 3,

  /**
   * Ember Flask: heals a fraction of max life between stages, refilled in camp. It holds this
   * many charges, plus what the Belt's "Flask Charges" affix adds.
   */
  flaskStartCharges: 3,
  flaskHeal: 0.35,

  /**
   * Bounties from the Scout: a done bounty pays this many normal kills' worth of Acorns at the act
   * boss's level, Ember Coal and one item of at least Rare. While "catch the Ember Thief" is
   * open, the thief shows up this much more often.
   */
  bounty: { acornKills: 10, emberCoal: 2, thiefBoost: 5 },
  /**
   * Run Pressure: a hero who regears from nothing grows much faster within a run than the Monster
   * Level alone. Along the run, monsters gain up to this much Life and damage per act after the
   * first, so a run's newest act stays the hardest.
   */
  runPressure: { life: 0.8, damage: 0.35 },
  /**
   * Act bosses have this much more Life than their content value, so a boss fight lasts about
   * 1.5× a normal fight (Spielspaß balance target). The Harvester keeps its own value.
   */
  bossLife: 1.5,
  /**
   * The Last Ember (M11): the Prestige after which the world no longer burns. Playtest 2: the
   * seventh, when all seven acts have fallen (no more Ascension runs). The finale's foes
   * fight at the Monster Level of that run's Harvester with this Life and damage (its own value
   * instead of the Run Pressure).
   */
  finalPrestige: 7,
  finale: { life: 2, damage: 1.4 },
  /** Boss abilities of the Warden echoes: echo n has n of them (its list from the top), at most this many. */
  finaleEchoAbilities: 5,
  /** Fusion Boons are this much likelier in the finale's Stolen Fire. */
  finaleFusionWeight: 1,
  /** Share of the Run Pressure on Life and damage that the Harvester takes. */
  harvesterPressure: { life: 0.7, damage: 0.2 },

  /** Phoenix Feathers (Upgrade at the Blacksmith): every boss, sometimes an Elite. */
  bossPhoenixFeathers: 1,
  elitePhoenixFeatherChance: 0.1,

  /** Switching to another Battle Plan Capstone at Kaelen. */
  capstoneChangeAcorns: 200,

  /**
   * Skill Tree respec at Kaelen (level-v2.md section 7): moderately priced, about the Acorns of this
   * many normal kills at the run's boss level. One node costs `respecNodeShare` of it.
   */
  respecKills: 8,
  respecNodeShare: 0.1,

  /** Inventory grid (D2 style). */
  inventoryWidth: 10,
  inventoryHeight: 4,
  /** Stash in the Supply Wagon: fixed size, no tabs. */
  stashWidth: 10,
  stashHeight: 10,
  /** Default item size per slot in grid cells (bases can override). */
  itemSizes: {
    mainHand: { w: 1, h: 3 },
    offHand: { w: 2, h: 2 },
    helm: { w: 2, h: 2 },
    body: { w: 2, h: 3 },
    gloves: { w: 2, h: 2 },
    boots: { w: 2, h: 2 },
    belt: { w: 2, h: 1 },
    amulet: { w: 1, h: 1 },
    ring: { w: 1, h: 1 },
    charm: { w: 1, h: 1 },
  } satisfies Record<ItemSlot, { w: number; h: number }>,
} as const;

/**
 * Camp crafting costs (docs/design/town-crafting-v1.md section 3). Starting values: a full Act 1
 * run brings roughly 100–150 Acorns and a few hundred Ash.
 */
export const CRAFTING = {
  /** Upgrade (+1 Tier) at Thoric: 1 Phoenix Feather + this much Acorns × current Tier. */
  upgradeAcornsPerTier: 60,
  upgradeFeathers: 1,
  /** Temper (reroll one affix value) at Liora. */
  temperAsh: 10,
  temperAcorns: 15,
  /** Reforge (reroll all affixes) at Thoric. */
  emberCoal: 1,
  /** Add Socket at the Runesmith: Acorns plus Ash × the new Socket count. */
  addSocketAcorns: 25,
  addSocketAsh: 15,
  /** Nyssa: Socket a Rune / combine three into the next rank, Acorns × rank. */
  socketRuneAcornsPerRank: 8,
  combineRunesAcornsPerRank: 15,
  combineRunesCount: 3,
  /** Marisha (Black Market): gamble prices and odds, capped by the run's loot gate. */
  gambleFlat: 60,
  gamblePerItemLevel: 12,
  gambleRarityWeights: { normal: 0, magic: 55, rare: 30, epic: 12, legendary: 3 } satisfies Record<
    Rarity,
    number
  >,
} as const;

/** Trigger Codex (docs/design/trigger-codex-v1.md). Starting values for the balance CLI. */
export const CODEX = {
  /** Trigger affixes whose Condition or Effect has its home in the fight drop this much more. */
  homeWeight: 4,
  /** Kindled triggers roll at most this share of the range; only drops reach 100 %. */
  kindleMaxQuality: 0.7,
  /** Kindle at Liora: Ash × the item's tier plus Ember Coal. */
  kindleAshPerTier: 30,
  kindleEmberCoal: 2,
} as const;
