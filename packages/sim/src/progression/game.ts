import { type FightResult, runFight } from "../combat/fight";
import { type EnemyDefinition, createEnemySetup } from "../combat/monsters";
import { type FightReport, fightReport } from "../combat/report";
import type {
  Attribute,
  Attributes,
  Capstone,
  CombatantSetup,
  ReactionSlot,
  RotationSlot,
  SkillDefinition,
  SlotModifier,
  WeaponDefinition,
} from "../combat/types";
import { COMBAT } from "../combat/constants";
import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import { ATTRIBUTES } from "../combat/types";
import { type ResolvedEquipment, itemSlotFor, missingRequirements } from "../items/equipment";
import {
  getBase,
  pickWeighted,
  rollItem,
  rollRarity,
  bossTrophies,
  rollUnique,
  uniquesFor,
} from "../items/generate";
import {
  type AffixDefinition,
  type Equipment,
  type EquipmentSlot,
  type Item,
  type ItemCatalog,
  type ItemSlot,
  RARITIES,
  type Rarity,
} from "../items/types";
import { Rng } from "../rng";
import {
  BATTLE_PLAN_LADDER,
  type BattlePlanState,
  CAPSTONES,
  EMPTY_PLAN,
  REACTION_COOLDOWN,
  SLOT_MODIFIERS,
  battlePlanUnlocks,
  capstoneSpec,
  modifierAllowed,
  reactionCondition,
  reactionConditionAllowed,
  slotCondition,
  slotModifiers,
} from "./battle-plan";
import {
  type BoonDefinition,
  type BoonFamilyDefinition,
  type BoonPick,
  type BoonsState,
  EMPTY_BOONS,
  activeBoons,
  boonEffects,
  rollBoonOffer,
} from "./boons";
import { CODEX, PROGRESSION } from "./constants";
import {
  type CodexPartKind,
  type CodexState,
  EMPTY_CODEX,
  type QuarryMark,
  codexAffixFactor,
  codexMastery,
  learnFromItem,
  quarryAffixIds,
  quarryFound,
} from "./codex";
import { type EliteModifier, applyEliteModifiers, eliteChance, eliteModifierCount } from "./elites";
import { buildHeroSetup } from "./hero";
import { INVENTORY_SIZE, type PlacedItem, STASH_SIZE, addToGrid, packGrid } from "./inventory";
import { type CraftRequest, craft } from "./crafting";
import { type EnemyRank, autoRewards, gainXp, xpForKill } from "./leveling";
import {
  type LearnedNodes,
  type PrestigeBranchDefinition,
  type SkillTreeDefinition,
  keystoneRules,
  learnNodes,
  treeBonuses,
  treeSkills,
  treeTriggers,
} from "./skill-tree";

/**
 * The game loop of a run (docs/design/game-design-document-v1.md section 2): Camp → Set Out →
 * stages with intermission, fight and rewards → boss → Camp. Death or Retreat returns to the
 * Camp and keeps everything except act progress.
 *
 * `GameState` is plain data (a save game). `applyAction` is the only way to change it; the UI
 * reads the state and sends actions. All randomness comes from the state's seed.
 */

/** Bumped whenever the save game shape changes. Older saves are migrated in `deserializeGame`. */
export const SAVE_VERSION = 7;

/** One act for the run: its stages, enemies and boss. */
export interface ActData {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  /**
   * Stages in the act; the last one is the boss stage. Monster Levels come from the run's level
   * band (`stageMonsterLevel`), not from the act.
   */
  readonly stages: number;
  readonly enemies: readonly EnemyDefinition[];
  readonly boss: EnemyDefinition;
  /** Eldrin (Runesmith) waits in this act; he joins after the first trip into it. */
  readonly runesmith?: boolean;
  /** Stages with a fixed Spoils pick (5 and 10). */
  readonly spoilsStages: readonly number[];
  /** The act's Essence (Imbue currency) and the stat affix it imbues. */
  readonly essence: { readonly id: string; readonly name: string; readonly affixId: string };
  /**
   * Act loot (gegner-bosse-v1.md section 9): affix weight multipliers by affix id, so each act
   * drops the answer to its own question more often.
   */
  readonly favoredAffixes?: Readonly<Record<string, number>>;
  /** The Stolen Fire Boon family of this act's Warden (open from this act on). */
  readonly boonFamily?: string;
}

/** Everything content-related the game loop needs. Built once in `@emberheir/content`. */
export interface GameData {
  readonly items: ItemCatalog;
  /** Item bases that can show up in the item pick. */
  readonly lootBases: readonly string[];
  /** Equipment slots in use (PoC: 5). */
  readonly equipmentSlots: readonly EquipmentSlot[];
  /** Weapon base ids a new game can start with. */
  readonly starterWeapons: readonly string[];
  /** Start Skill per weapon id. */
  readonly startSkills: Readonly<Record<string, SkillDefinition>>;
  readonly skillTree: SkillTreeDefinition;
  readonly acts: readonly ActData[];
  readonly eliteModifiers: readonly EliteModifier[];
  /**
   * Boss abilities (roadmap M10): a boss gains one per Prestige after the run its act opened in,
   * starting at a different place in the list for each act.
   */
  readonly bossAbilities?: readonly EliteModifier[];
  /** Stolen Fire Boons (Spielspaß Teil 1); no Shrines without them. */
  readonly boons?: readonly BoonDefinition[];
  readonly boonFamilies?: readonly BoonFamilyDefinition[];
  /** The Ember Thief (runs away after `PROGRESSION.thiefFleeSeconds`); none without it. */
  readonly thief?: EnemyDefinition;
  readonly startingAttributes: Attributes;
}

export interface Wallet {
  readonly gold: number;
  readonly dust: number;
  readonly reforgeStones: number;
  /** Essences by id. */
  readonly essences: Readonly<Record<string, number>>;
  /** Pays for Keystones; one per win over the Ashen Harvester. */
  readonly harvesterEmber: number;
  /** Upgrade (+1 Item Tier) at the Blacksmith. Bosses, sometimes Elites. */
  readonly ascensionShards: number;
  /** Rune pouch: loose Runes by id. They take no inventory space and burn at the Prestige. */
  readonly runes: Readonly<Record<string, number>>;
  /** Pays for Kindle at Liora; Elites and bosses give it in the Spoils pick. */
  readonly kindling: number;
}

export interface HeroState {
  readonly level: number;
  /** XP towards the next level. */
  readonly xp: number;
  /** Own attributes: start values plus spent points (gear not included). */
  readonly attributes: Attributes;
  readonly unspentAttributePoints: number;
  readonly unspentSkillPoints: number;
  readonly learned: LearnedNodes;
  readonly equipment: Equipment;
  /**
   * Skill id per Rotation Slot. `null` = the Start Skill of the weapon in hand. Skills the hero
   * does not know (any more) are skipped.
   */
  readonly rotation: readonly (string | null)[];
  /** Thresholds, Modifiers, Reaction Slots and the Capstone (see `battlePlanUnlocks`). */
  readonly plan: BattlePlanState;
}

export interface Encounter {
  readonly enemyId: string;
  readonly level: number;
  readonly boss: boolean;
  /** Elite modifier ids; empty for normal enemies. */
  readonly eliteModifiers: readonly string[];
  /** Run Pressure on Life and damage (see `stagePressure`); missing means none. */
  readonly pressure?: { readonly life: number; readonly damage: number };
  /** Fight seed: the same encounter always plays out the same. */
  readonly seed: number;
  /** The Ember Thief instead of the stage's enemy. */
  readonly thief?: boolean;
}

export type SpoilsCard =
  | { readonly kind: "flaskCharge"; readonly amount: number }
  | { readonly kind: "reforgeStones"; readonly amount: number }
  | { readonly kind: "essence"; readonly essenceId: string; readonly amount: number }
  | { readonly kind: "kindling"; readonly amount: number };

export type ItemPick =
  { readonly kind: "equip" | "take"; readonly index: number } | { readonly kind: "salvageAll" };

/** Rewards of a won fight (loot-rewards-v1.md): automatic, item pick, maybe spoils pick. */
export interface Rewards {
  readonly rank: EnemyRank;
  readonly xp: number;
  readonly gold: number;
  readonly dust: number;
  readonly reforgeStones: number;
  readonly ascensionShards: number;
  /** Runes that dropped (straight into the pouch). */
  readonly runes: readonly string[];
  readonly levelsGained: number;
  /** Item pick: `picks` (default 1) of these. */
  readonly items: readonly Item[];
  /** Boss Hoard: how many cards the hero takes (missing = 1). */
  readonly picks?: number;
  /** The Ember Thief was caught (small Hoard) or got away (normal loot). */
  readonly thief?: "caught" | "escaped";
  /** Cards already taken while more picks are left. */
  readonly taken?: readonly { readonly index: number; readonly kind: "equip" | "take" }[];
  /** Set once the item pick is over. */
  readonly itemPick: ItemPick | null;
  /** Uniques seen for the first time (they go up on the Trophy Wall). */
  readonly newTrophies?: readonly string[];
  /** Dust from auto-salvaging the items that were not picked. */
  readonly salvagedDust: number;
  /** Spoils pick, empty if this fight has none. */
  readonly spoils: readonly SpoilsCard[];
  readonly spoilsPick: number | null;
  /** What the Battle Plan did in this fight (missing in older saves). */
  readonly report?: FightReport;
  /** Ember Shrine: 1 of these Boons (after Stage 5 and 10, Elites and Bosses). */
  readonly boonOffer?: readonly BoonPick[];
  readonly boonPick?: number | null;
}

export type RunPhase = "intermission" | "fight" | "rewards";

export interface RunState {
  readonly actId: string;
  /** Stage inside the act, 1-based. */
  readonly stage: number;
  /** Life carries over between stages. */
  readonly lifeFraction: number;
  readonly phase: RunPhase;
  /** Set during "fight" and "rewards". */
  readonly encounter: Encounter | null;
  /** Set during "rewards". */
  readonly rewards: Rewards | null;
}

/** Shown once in the Camp after a run ends. */
export interface Notice {
  /** "prestige" is the Inheritance screen after the final boss of the run. */
  readonly kind: "death" | "retreat" | "actCleared" | "prestige";
  readonly actId: string;
  readonly stage: number;
  readonly enemyName?: string;
}

/** What one Prestige gives (docs/design/ui-views-v1.md, Prestige flow: Inheritance). */
export interface PrestigeRewards {
  /** Prestige level after it: 1 after the first final boss. */
  readonly prestige: number;
  /** Seals (Save Tokens) in total. */
  readonly seals: number;
  readonly rotationSlots: number;
  /** The Battle Plan upgrade this Prestige unlocks (`BATTLE_PLAN_LADDER`). */
  readonly planUpgrade: string | null;
  readonly harvesterEmber: number;
  /** Fixed Salvage Dust instead of the burned stash. */
  readonly dust: number;
  readonly levelCap: number;
  /** Acts the next run has (one more per Prestige, up to all of them). */
  readonly acts: number;
  /** Monster Levels of the next run: first stage and the harvest boss. */
  readonly levelBand: LevelBand;
}

/** Monster Levels of a run: they rise evenly over all its stages from `start` to `end`. */
export interface LevelBand {
  readonly start: number;
  readonly end: number;
}

/** One finished generation in the Legacy chronicle. */
export interface ChronicleEntry {
  readonly generation: number;
  readonly sealed: readonly EquipmentSlot[];
  readonly level: number;
  readonly deaths: number;
  readonly enemyName: string;
}

/** Everything that survives the fire (Legacy view at the Hearthfire). */
export interface LegacyState {
  /** Prestiges done so far. Generation = prestige + 1. */
  readonly prestige: number;
  /** Sealed slots: their items survive the next Prestige. Prefilled when the next one comes. */
  readonly seals: readonly EquipmentSlot[];
  readonly chronicle: readonly ChronicleEntry[];
  /** Runeword Codex: Runewords forged at least once. Permanent. */
  readonly runewords: readonly string[];
  /** Runes ever found. A Runeword shows its recipe once all its Runes were found. */
  readonly runesFound: readonly string[];
  /** Trigger Codex: Conditions and Effects learned from salvaged triggers. Permanent. */
  readonly codex: CodexState;
  /** The Codex part marked at Old Nan, if any. */
  readonly quarry: QuarryMark | null;
  /** Prestige branches of the Skill Tree, one chosen per Prestige. Permanent. */
  readonly branches: readonly string[];
  /** Trophy Wall: Uniques ever found. Permanent like the Runeword Codex. */
  readonly trophies: readonly string[];
}

/** Marisha restocks whenever the hero comes back from a fight (`key` = fights so far). */
export interface MerchantState {
  readonly key: number;
  readonly sold: readonly number[];
}

/** The final boss of the run fell: the Prestige flow (Victory, Seal) waits for its choice. */
export interface PendingPrestige {
  readonly actId: string;
  readonly stage: number;
  readonly enemyName: string;
}

export interface GameStats {
  readonly fights: number;
  readonly wins: number;
  readonly deaths: number;
  readonly retreats: number;
  readonly bossKills: number;
}

export interface GameState {
  readonly version: number;
  readonly seed: number;
  /** Counts random events; every action that rolls dice uses a fresh stream. */
  readonly nonce: number;
  readonly hero: HeroState;
  readonly wallet: Wallet;
  readonly inventory: readonly PlacedItem[];
  /** Supply Wagon: only reachable in the Camp. */
  readonly stash: readonly PlacedItem[];
  readonly flaskCharges: number;
  readonly progress: {
    readonly actsCleared: readonly string[];
    /** Deaths in the current act since its boss last fell (Pity). */
    readonly deathsInAct: number;
    /** Kaelen (Skill Tree, Battle Plan) joins after the first act boss. */
    readonly trainerUnlocked: boolean;
    readonly rotationSlots: number;
    /** The Supply Wagon burned at the Prestige; it is repaired on the first return to Camp. */
    readonly stashBurned: boolean;
    /** Eldrin (Runesmith) joined the caravan. Stays through every Prestige. */
    readonly runesmithUnlocked: boolean;
  };
  /** Marisha's stock: which offers of the current stock are sold. */
  readonly merchant: MerchantState;
  /** `null` = in the Camp. */
  readonly run: RunState | null;
  readonly notice: Notice | null;
  readonly stats: GameStats;
  readonly legacy: LegacyState;
  /** Set between the final boss and the Prestige. Blocks the Camp until it is done. */
  readonly pendingPrestige: PendingPrestige | null;
  /** Stolen Fire Boons of this run; they burn at the Prestige. */
  readonly boons: BoonsState;
}

export class GameActionError extends Error {}

export const fail = (message: string): never => {
  throw new GameActionError(message);
};

// --- randomness ------------------------------------------------------------------------------

function mixSeed(seed: number, nonce: number): number {
  let h = (seed ^ Math.imul(nonce + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A fresh random stream for one action, plus the state with the nonce moved on. */
export function nextRng(state: GameState): [Rng, GameState] {
  return [new Rng(mixSeed(state.seed, state.nonce)), { ...state, nonce: state.nonce + 1 }];
}

// --- new game --------------------------------------------------------------------------------

export function newGame(
  data: GameData,
  options: { readonly seed: number; readonly starterWeapon: string },
): GameState {
  if (!data.starterWeapons.includes(options.starterWeapon)) {
    fail(`"${options.starterWeapon}" is not a starter weapon`);
  }
  const seed = options.seed >>> 0;
  const weapon = rollItem(
    data.items,
    { baseId: options.starterWeapon, itemLevel: 1, rarity: "normal" },
    new Rng(mixSeed(seed, 0xfffff)),
  );
  return {
    version: SAVE_VERSION,
    seed,
    nonce: 0,
    hero: {
      level: 1,
      xp: 0,
      attributes: data.startingAttributes,
      unspentAttributePoints: 0,
      unspentSkillPoints: 0,
      learned: {},
      equipment: { mainHand: weapon },
      rotation: [null],
      plan: EMPTY_PLAN,
    },
    wallet: {
      gold: 0,
      dust: 0,
      reforgeStones: 0,
      essences: {},
      harvesterEmber: 0,
      ascensionShards: 0,
      runes: {},
      kindling: 0,
    },
    inventory: [],
    stash: [],
    flaskCharges: PROGRESSION.flaskStartCharges,
    progress: {
      actsCleared: [],
      deathsInAct: 0,
      trainerUnlocked: false,
      rotationSlots: battlePlanUnlocks(0).rotationSlots,
      stashBurned: false,
      runesmithUnlocked: false,
    },
    merchant: { key: 0, sold: [] },
    run: null,
    notice: null,
    stats: { fights: 0, wins: 0, deaths: 0, retreats: 0, bossKills: 0 },
    legacy: {
      prestige: 0,
      seals: [],
      chronicle: [],
      runewords: [],
      runesFound: [],
      codex: EMPTY_CODEX,
      quarry: null,
      branches: [],
      trophies: [],
    },
    pendingPrestige: null,
    boons: EMPTY_BOONS,
  };
}

// --- reading the state -----------------------------------------------------------------------

export function getAct(data: GameData, actId: string): ActData {
  const act = data.acts.find((a) => a.id === actId);
  if (!act) throw new GameActionError(`Unknown act "${actId}"`);
  return act;
}

export const stagesInAct = (act: ActData) => act.stages;

/** Acts in their order through the run. */
export function actsInOrder(data: GameData): ActData[] {
  return [...data.acts].sort((a, b) => a.number - b.number);
}

/**
 * The acts of a run (prestige-acts-v1.md): run n has acts 1..n, so every Prestige opens one more
 * act until the whole world is open.
 */
export function actsInRun(data: GameData, prestige: number): ActData[] {
  return actsInOrder(data).slice(0, Math.max(1, prestige + 1));
}

/** The newest act of the run: its boss brings The Harvest (the Prestige). */
export function harvestAct(data: GameData, prestige: number): ActData {
  const acts = actsInRun(data, prestige);
  return acts[acts.length - 1] ?? fail("No acts");
}

/**
 * Whether the hero may set out into an act: it must belong to this run, and the act before it
 * must have fallen in this generation. Cleared acts can be revisited to farm.
 */
export function actUnlocked(state: GameState, data: GameData, actId: string): boolean {
  const acts = actsInRun(data, state.legacy.prestige);
  const index = acts.findIndex((a) => a.id === actId);
  if (index < 0) return false;
  const before = acts[index - 1];
  return !before || state.progress.actsCleared.includes(before.id);
}

/** The act the journey continues with: the first unlocked act that has not fallen yet. */
export function nextAct(state: GameState, data: GameData): ActData {
  const acts = actsInRun(data, state.legacy.prestige);
  const open = acts.find(
    (a) => !state.progress.actsCleared.includes(a.id) && actUnlocked(state, data, a.id),
  );
  return open ?? acts[acts.length - 1] ?? fail("No acts");
}

/** Whether the boss of this act brings The Harvest in the given run (the newest act or later). */
export function isHarvestAct(data: GameData, actId: string, prestige: number): boolean {
  return getAct(data, actId).number >= harvestAct(data, prestige).number;
}

/** Level Cap at a Prestige level: 20, then +20 per Prestige. */
export function levelCap(prestige: number): number {
  return PROGRESSION.levelCap + PROGRESSION.levelCapPerPrestige * prestige;
}

/**
 * The run's level band (prestige-acts-v1.md section 4): it starts 10 below the previous Level
 * Cap, so the first stages are a gentle regear window, and ends at the new cap with the harvest
 * boss.
 */
export function levelBand(prestige: number): LevelBand {
  const start =
    prestige === 0
      ? 1
      : Math.max(
          1,
          levelCap(prestige - 1) -
            PROGRESSION.levelBandStartBelowCap -
            PROGRESSION.levelBandStartBelowCapPerPrestige * (prestige - 1),
        );
  return { start, end: levelCap(prestige) };
}

/** How far into its run a stage is: 0 on the run's first stage, 1 on its last. */
function runProgress(data: GameData, act: ActData, stage: number, prestige: number): number {
  const acts = actsInRun(data, prestige);
  const total = acts.reduce((n, a) => n + a.stages, 0);
  let index = 0;
  for (const a of acts) {
    if (a.id === act.id) break;
    index += a.stages;
  }
  // Acts past the run (old saves) count as its last stage.
  index = Math.min(total - 1, index + stage - 1);
  return index / Math.max(1, total - 1);
}

/** Monster Level of a stage: the run's band, spread evenly over all stages of its acts. */
export function stageMonsterLevel(
  data: GameData,
  act: ActData,
  stage: number,
  prestige: number,
): number {
  const { start, end } = levelBand(prestige);
  return Math.round(start + (end - start) * runProgress(data, act, stage, prestige));
}

/**
 * Run Pressure of a stage (PROGRESSION.runPressure): 1 in a one-act run and on a run's first
 * stage, rising to 1 + pressure × (acts − 1) on its last.
 */
export function stagePressure(
  data: GameData,
  act: ActData,
  stage: number,
  prestige: number,
): { readonly life: number; readonly damage: number } {
  const steps = (actsInRun(data, prestige).length - 1) * runProgress(data, act, stage, prestige);
  return {
    life: 1 + PROGRESSION.runPressure.life * steps,
    damage: 1 + PROGRESSION.runPressure.damage * steps,
  };
}

/** What the Prestige at `prestige` (1 = the first one) gives. */
export function prestigeRewards(data: GameData, prestige: number): PrestigeRewards {
  return {
    prestige,
    seals: Math.min(prestige, data.equipmentSlots.length),
    rotationSlots: battlePlanUnlocks(prestige).rotationSlots,
    planUpgrade: BATTLE_PLAN_LADDER[prestige - 1]?.name ?? null,
    harvesterEmber: PROGRESSION.prestigeHarvesterEmber,
    dust: PROGRESSION.prestigeDustPerLevel * prestige,
    levelCap: levelCap(prestige),
    acts: actsInRun(data, prestige).length,
    levelBand: levelBand(prestige),
  };
}

/** The weapon a main-hand item gives when its requirements are not met: none. Fallback. */
function fallbackWeapon(state: GameState, data: GameData): WeaponDefinition | undefined {
  const item = state.hero.equipment.mainHand;
  return item ? getBase(data.items, item.baseId).weapon : undefined;
}

export interface KnownSkill {
  readonly skill: SkillDefinition;
  /** Node ranks, +1 for the Start Skill of the weapon in hand. */
  readonly level: number;
  readonly startSkill: boolean;
}

/** Skills the hero can put into the Battle Plan with a given weapon. */
export function knownSkills(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): KnownSkill[] {
  const start = data.startSkills[weapon.id];
  const fromTree = treeSkills(data.skillTree, state.hero.learned);
  const result: KnownSkill[] = [];
  if (start) {
    const ranks = fromTree.find((t) => t.skill.id === start.id)?.ranks ?? 0;
    result.push({ skill: start, level: 1 + ranks, startSkill: true });
  }
  for (const { skill, ranks } of fromTree) {
    if (skill.id !== start?.id) result.push({ skill, level: ranks, startSkill: false });
  }
  return result;
}

/** The Rotation Slots the hero fights with, with the unlocked Battle Plan choices. */
export function heroRotation(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): RotationSlot[] {
  return heroRotationSlots(state, data, weapon).map((s) => s.slot);
}

/** Like `heroRotation`, but each slot remembers its Battle Plan index (Echo, Modifiers). */
function heroRotationSlots(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): { readonly slot: RotationSlot; readonly index: number }[] {
  const known = knownSkills(state, data, weapon);
  const start = known.find((k) => k.startSkill);
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const { plan } = state.hero;
  const slots: { slot: RotationSlot; index: number }[] = [];
  state.hero.rotation.slice(0, state.progress.rotationSlots).forEach((id, index) => {
    const entry = id === null ? start : known.find((k) => k.skill.id === id);
    if (!entry || slots.some((s) => s.slot.skill.id === entry.skill.id)) return;
    const threshold = unlocks.thresholds ? plan.thresholds[index] : null;
    const modifiers = slotModifiers(plan.modifiers, index, unlocks);
    const condition = unlocks.conditions ? slotCondition(plan.conditions[index]) : undefined;
    slots.push({
      index,
      slot: {
        skill: entry.skill,
        level: entry.level,
        ...(threshold != null ? { threshold } : {}),
        ...(modifiers.length ? { modifiers } : {}),
        ...(condition ? { condition } : {}),
      },
    });
  });
  if (slots.length === 0 && start) {
    slots.push({ index: 0, slot: { skill: start.skill, level: start.level } });
  }
  return slots;
}

/** The hero's Reaction Slots (Battle Plan, from the 4th Prestige on). */
export function heroReactions(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): ReactionSlot[] {
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const known = knownSkills(state, data, weapon);
  const { plan } = state.hero;
  const result: ReactionSlot[] = [];
  plan.reactions.slice(0, unlocks.reactionSlots).forEach((r, index) => {
    if (!r) return;
    const entry = known.find((k) => k.skill.id === r.skillId);
    const condition = reactionConditionAllowed(r.conditionId, unlocks)
      ? reactionCondition(r.conditionId)
      : undefined;
    if (!entry || !condition) return;
    const modifiers = slotModifiers(plan.reactionModifiers, index, unlocks);
    result.push({
      skill: entry.skill,
      level: entry.level,
      condition,
      cooldown: REACTION_COOLDOWN,
      ...(modifiers.length ? { modifiers } : {}),
    });
  });
  return result;
}

/** The Opening Move (Battle Plan, 8th Prestige): a known skill cast for free at fight start. */
function heroOpeningMove(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): CombatantSetup["openingMove"] {
  const id = state.hero.plan.openingMove;
  if (!id || !battlePlanUnlocks(state.legacy.prestige).openingMove) return undefined;
  const entry = knownSkills(state, data, weapon).find((k) => k.skill.id === id);
  return entry ? { skill: entry.skill, level: entry.level } : undefined;
}

/** The Capstone the hero fights with; Echo points at the slot's index in the fight rotation. */
function heroCapstone(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): Capstone | undefined {
  if (!battlePlanUnlocks(state.legacy.prestige).capstone) return undefined;
  const spec = capstoneSpec(state.hero.plan);
  if (spec?.kind !== "echo") return spec;
  const slot = heroRotationSlots(state, data, weapon).findIndex((s) => s.index === spec.slot);
  return slot >= 0 ? { kind: "echo", slot } : undefined;
}

/** The Stolen Fire Boons in effect (rank and grade resolved). */
export function heroBoons(state: GameState, data: GameData) {
  return activeBoons(state.boons, data.boons ?? []);
}

/** Boon families open in an act: Hearth and every Warden family up to this act. */
export function openBoonFamilies(data: GameData, actNumber: number): string[] {
  const tied = new Set(data.acts.flatMap((a) => (a.boonFamily ? [a.boonFamily] : [])));
  return (data.boonFamilies ?? [])
    .map((f) => f.id)
    .filter(
      (id) => !tied.has(id) || data.acts.some((a) => a.boonFamily === id && a.number <= actNumber),
    );
}

/** The hero's fight setup from the current state. */
export function heroSetup(
  state: GameState,
  data: GameData,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const { hero } = state;
  const boons = boonEffects(heroBoons(state, data));
  return buildHeroSetup(
    {
      level: hero.level,
      attributes: hero.attributes,
      equipment: hero.equipment,
      fallbackWeapon: fallbackWeapon(state, data),
      rotation: (weapon) => heroRotation(state, data, weapon),
      reactions: (weapon) => heroReactions(state, data, weapon),
      capstone: (weapon) => heroCapstone(state, data, weapon),
      openingMove: (weapon) => heroOpeningMove(state, data, weapon),
      bonuses: (weapon) =>
        sumBonuses(treeBonuses(data.skillTree, hero.learned, weapon.range), boons.bonuses),
      triggers: (weapon) => [
        ...treeTriggers(data.skillTree, hero.learned, weapon.range),
        ...boons.triggers,
      ],
      rules: boons.rules
        ? mergeRules(keystoneRules(data.skillTree, hero.learned), boons.rules)
        : keystoneRules(data.skillTree, hero.learned),
      ...(state.run ? { lifeFraction: state.run.lifeFraction } : {}),
    },
    data.items,
  );
}

/** The enemy of an encounter: the act's enemy or boss, or the Ember Thief. */
function encounterEnemy(encounter: Encounter, act: ActData, data: GameData): EnemyDefinition {
  if (encounter.thief) return data.thief ?? fail("No Ember Thief in this game");
  return findEnemy(act, encounter.enemyId);
}

function findEnemy(act: ActData, id: string): EnemyDefinition {
  const enemy = act.boss.id === id ? act.boss : act.enemies.find((e) => e.id === id);
  if (!enemy) throw new GameActionError(`Unknown enemy "${id}" in ${act.id}`);
  return enemy;
}

/** The abilities an act boss has in a run: one more per Prestige after its act opened. */
export function bossAbilities(data: GameData, act: ActData, prestige: number): EliteModifier[] {
  const list = data.bossAbilities ?? [];
  const count = Math.min(list.length, Math.max(0, prestige - (act.number - 1)));
  return Array.from({ length: count }, (_, i) => list[(act.number - 1 + i) % list.length]).filter(
    (m): m is EliteModifier => m !== undefined,
  );
}

export function eliteModifiersOf(encounter: Encounter, data: GameData): EliteModifier[] {
  return encounter.eliteModifiers.flatMap((id) => {
    const mod =
      data.eliteModifiers.find((m) => m.id === id) ?? data.bossAbilities?.find((m) => m.id === id);
    return mod ? [mod] : [];
  });
}

/** The enemy's fight setup for an encounter (Elites included). */
export function enemySetup(encounter: Encounter, actId: string, data: GameData): CombatantSetup {
  const enemy = encounterEnemy(encounter, getAct(data, actId), data);
  const created = createEnemySetup(enemy, encounter.level);
  const base = encounter.thief ? { ...created, fleeAfter: PROGRESSION.thiefFleeSeconds } : created;
  const p = encounter.pressure;
  const setup = p
    ? {
        ...base,
        baseLife: (base.baseLife ?? 0) * p.life,
        damageMultiplier: (base.damageMultiplier ?? 1) * p.damage,
      }
    : base;
  const mods = eliteModifiersOf(encounter, data);
  return mods.length ? applyEliteModifiers(setup, mods) : setup;
}

export function encounterName(encounter: Encounter, actId: string, data: GameData): string {
  return encounterEnemy(encounter, getAct(data, actId), data).name;
}

export function encounterRank(encounter: Encounter): EnemyRank {
  return encounter.boss ? "boss" : encounter.eliteModifiers.length ? "elite" : "normal";
}

/**
 * Both setups and the seed of the current fight. The UI plays this exact fight, and
 * `resolveFight` runs the same one, so both always agree.
 */
export function currentFight(
  state: GameState,
  data: GameData,
): { readonly hero: CombatantSetup; readonly enemy: CombatantSetup; readonly seed: number } {
  const run = state.run;
  if (!run || run.phase !== "fight" || !run.encounter) return fail("No fight in progress");
  return {
    hero: heroSetup(state, data).setup,
    enemy: enemySetup(run.encounter, run.actId, data),
    seed: run.encounter.seed,
  };
}

/** Salvage Dust an item is worth. */
export function salvageValue(item: Item): number {
  return PROGRESSION.salvageDust[item.rarity] * Math.max(1, item.tier);
}

/** Equipment slot an item goes to (Rings fill the first free Ring slot). */
export function targetSlot(
  item: Item,
  data: GameData,
  equipment: Equipment,
): EquipmentSlot | undefined {
  const itemSlot = getBase(data.items, item.baseId).slot;
  const slots = data.equipmentSlots.filter((s) => itemSlotFor(s) === itemSlot);
  return slots.find((s) => !equipment[s]) ?? slots[0];
}

export type EquipBlockReason = "fight" | "camp" | "requirements" | "noSlot" | "noRoom";

/**
 * Why an item cannot be equipped right now. The old item goes to the inventory and is never
 * destroyed, so equipping is blocked when it does not fit.
 */
export function equipBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
  from: "inventory" | "stash" | "pick",
): EquipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  if (from === "stash" && state.run) return "camp";
  const slot = targetSlot(item, data, state.hero.equipment);
  if (!slot) return "noSlot";
  if (missingRequirements(item, data.items, state.hero.attributes).length) return "requirements";
  const old = state.hero.equipment[slot];
  if (!old) return undefined;
  // The old item goes back where the new one came from.
  const source = from === "stash" ? state.stash : state.inventory;
  const grid = from === "pick" ? source : source.filter((p) => p.item.id !== item.id);
  return addToGrid(grid, old, data.items, from === "stash" ? STASH_SIZE : INVENTORY_SIZE)
    ? undefined
    : "noRoom";
}

/** Why an item cannot be taken into the inventory (only "noRoom"). */
export function takeBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
): "noRoom" | undefined {
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

export type UnequipBlockReason = "fight" | "mainHand" | "noRoom" | "empty";

export function unequipBlockReason(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
): UnequipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  const item = state.hero.equipment[slot];
  if (!item) return "empty";
  // The hero always needs a weapon: swap it instead.
  if (slot === "mainHand") return "mainHand";
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

// --- actions ---------------------------------------------------------------------------------

export type GameAction =
  /** Leave the Camp and start an act at stage 1. */
  | { readonly type: "setOut"; readonly actId: string }
  /** From the intermission into the next fight. */
  | { readonly type: "startStage" }
  /** Resolve the current fight (the UI calls this when its replay ends). */
  | { readonly type: "resolveFight" }
  /** Back to Camp mid-act (works like a death, but costs no Pity). */
  | { readonly type: "retreat" }
  | { readonly type: "pickItem"; readonly index: number; readonly mode: "equip" | "take" }
  | { readonly type: "salvageAll" }
  | { readonly type: "pickSpoils"; readonly index: number }
  | { readonly type: "pickBoon"; readonly index: number }
  /** After the rewards: on to the next stage (or back to Camp after the boss). */
  | { readonly type: "continue" }
  | { readonly type: "useFlask" }
  | { readonly type: "allocateAttributes"; readonly points: Partial<Attributes> }
  | { readonly type: "equip"; readonly itemId: string }
  | { readonly type: "unequip"; readonly slot: EquipmentSlot }
  /** Salvage an inventory item; its trigger parts go into the Trigger Codex. */
  | { readonly type: "salvage"; readonly itemId: string }
  /** Old Nan (Camp only): mark a known Codex part to hunt, or clear the mark. */
  | { readonly type: "setQuarry"; readonly part: { kind: CodexPartKind; id: string } | null }
  | { readonly type: "learnNodes"; readonly nodeIds: readonly string[] }
  /** Kaelen: forget all Skill Tree nodes for Gold (points and Ember come back). */
  | { readonly type: "respecTree" }
  /** Supply Wagon (Camp only): move an item between inventory and stash. */
  | { readonly type: "moveItem"; readonly itemId: string; readonly to: "inventory" | "stash" }
  | { readonly type: "sortStash" }
  /** Thoric and Liora (Camp only). */
  | { readonly type: "craft"; readonly request: CraftRequest }
  | { readonly type: "setRotationSkill"; readonly slot: number; readonly skillId: string | null }
  /** Kaelen: Thresholds, Modifiers, Conditions, Reaction Slots, Capstone. */
  | { readonly type: "setBattlePlan"; readonly plan: BattlePlanState }
  /** After the final boss: seal slots, burn the rest, start the next generation. */
  | {
      readonly type: "prestige";
      readonly sealedSlots: readonly EquipmentSlot[];
      /** Prestige branch to unlock; required while branches are left. */
      readonly branchId?: string;
    }
  | { readonly type: "dismissNotice" };

/** Applies one action. Throws `GameActionError` if the action is not allowed right now. */
export function applyAction(state: GameState, data: GameData, action: GameAction): GameState {
  switch (action.type) {
    case "setOut":
      return setOut(state, data, action.actId);
    case "startStage":
      return startStage(state, data);
    case "resolveFight":
      return resolveFight(state, data);
    case "retreat":
      return retreat(state, data);
    case "pickItem":
      return pickItem(state, data, action.index, action.mode);
    case "salvageAll":
      return salvageAll(state);
    case "pickBoon":
      return pickBoon(state, action.index);
    case "pickSpoils":
      return pickSpoils(state, action.index);
    case "continue":
      return continueRun(state, data);
    case "useFlask":
      return useFlask(state);
    case "allocateAttributes":
      return allocateAttributes(state, action.points);
    case "equip":
      return equipFromInventory(state, data, action.itemId);
    case "unequip":
      return unequip(state, data, action.slot);
    case "salvage":
      return salvage(state, data, action.itemId);
    case "setQuarry":
      return setQuarry(state, action.part);
    case "learnNodes":
      return learn(state, data, action.nodeIds);
    case "respecTree":
      return respecTree(state, data);
    case "moveItem":
      return moveItem(state, data, action.itemId, action.to);
    case "sortStash":
      return sortStash(state, data);
    case "craft":
      return craft(state, data, action.request);
    case "setRotationSkill":
      return setRotationSkill(state, data, action.slot, action.skillId);
    case "setBattlePlan":
      return setBattlePlan(state, data, action.plan);
    case "prestige":
      return doPrestige(state, data, action.sealedSlots, action.branchId);
    case "dismissNotice":
      return { ...state, notice: null };
  }
}

function requireRun(state: GameState, ...phases: RunPhase[]): RunState {
  const run = state.run;
  if (!run) return fail("Not in a run");
  if (!phases.includes(run.phase)) return fail(`Not allowed during ${run.phase}`);
  return run;
}

export function requireCamp(state: GameState): void {
  if (state.run) fail("Only in the Camp");
  if (state.pendingPrestige) fail("The harvest comes first");
}

function setOut(state: GameState, data: GameData, actId: string): GameState {
  requireCamp(state);
  getAct(data, actId);
  if (!actUnlocked(state, data, actId)) fail("The road there is still closed");
  return {
    ...state,
    notice: null,
    run: {
      actId,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
    },
  };
}

function startStage(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission");
  const act = getAct(data, run.actId);
  const [rng, next] = nextRng(state);
  const level = stageMonsterLevel(data, act, run.stage, state.legacy.prestige);
  const p = stagePressure(data, act, run.stage, state.legacy.prestige);
  const pressure = p.life > 1 ? { pressure: p } : {};
  let encounter: Encounter;
  if (run.stage >= stagesInAct(act)) {
    encounter = {
      enemyId: act.boss.id,
      level,
      boss: true,
      eliteModifiers: bossAbilities(data, act, state.legacy.prestige).map((m) => m.id),
      ...pressure,
      seed: rng.int(0, 0x7fffffff),
    };
  } else {
    const enemy = act.enemies[rng.int(0, act.enemies.length - 1)];
    if (!enemy) return fail(`Act ${act.id} has no enemies`);
    const mods: string[] = [];
    const thief =
      data.thief !== undefined &&
      act.number >= PROGRESSION.thiefFromAct &&
      rng.chance(PROGRESSION.thiefChance);
    if (!thief && rng.chance(eliteChance(act.number, run.stage))) {
      const pool = [...data.eliteModifiers];
      for (let i = 0; i < eliteModifierCount(level) && pool.length; i++) {
        const [mod] = pool.splice(rng.int(0, pool.length - 1), 1);
        if (mod) mods.push(mod.id);
      }
    }
    encounter = {
      enemyId: thief && data.thief ? data.thief.id : enemy.id,
      level,
      boss: false,
      eliteModifiers: mods,
      ...pressure,
      seed: rng.int(0, 0x7fffffff),
      ...(thief ? { thief: true } : {}),
    };
  }
  return { ...next, run: { ...run, phase: "fight", encounter } };
}

/** Back to the Camp: flask refilled, life full, act progress gone, Supply Wagon repaired. */
function toCamp(state: GameState, data: GameData, notice: Notice | null): GameState {
  const fromRunesmithAct = state.run ? getAct(data, state.run.actId).runesmith === true : false;
  // Boons of the current act burn on death and Retreat; a cleared act keeps them.
  const lost = notice?.kind === "death" || notice?.kind === "retreat";
  const { kept, fresh } = state.boons;
  return {
    ...state,
    run: null,
    notice,
    boons: { kept: lost ? kept : [...kept, ...fresh], fresh: [] },
    flaskCharges: Math.max(state.flaskCharges, PROGRESSION.flaskStartCharges),
    progress: {
      ...state.progress,
      stashBurned: false,
      runesmithUnlocked: state.progress.runesmithUnlocked || fromRunesmithAct,
    },
  };
}

function resolveFight(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "fight");
  const encounter = run.encounter ?? fail("No encounter");
  const { hero, enemy, seed } = currentFight(state, data);
  const result: FightResult = runFight(hero, enemy, seed);
  const stats = { ...state.stats, fights: state.stats.fights + 1 };
  const enemyName = encounterName(encounter, run.actId, data);

  // The Ember Thief got away: the stage still counts, with the normal loot.
  const escaped = encounter.thief === true && result.fled === "enemy";
  const caught = encounter.thief === true && result.winner === "hero";
  if (result.winner !== "hero" && !escaped) {
    // A draw at the time limit counts as a defeat: the act has to be tried again.
    return toCamp(
      {
        ...state,
        stats: { ...stats, deaths: stats.deaths + 1 },
        progress: { ...state.progress, deathsInAct: state.progress.deathsInAct + 1 },
      },
      data,
      { kind: "death", actId: run.actId, stage: run.stage, enemyName },
    );
  }

  const [rng, next] = nextRng(state);
  const act = getAct(data, run.actId);
  const rank = encounterRank(encounter);
  const xp = xpForKill(encounter.level, rank, state.hero.level);
  const auto = autoRewards(encounter.level, rank);
  const stones =
    rank === "boss"
      ? rng.int(...PROGRESSION.bossReforgeStones)
      : rank === "elite"
        ? rng.int(...PROGRESSION.eliteReforgeStones)
        : 0;
  const shards =
    rank === "boss"
      ? PROGRESSION.bossAscensionShards
      : rank === "elite" && rng.chance(PROGRESSION.eliteAscensionShardChance)
        ? 1
        : 0;
  const leveled = gainXp(state.hero.level, state.hero.xp, xp, levelCap(state.legacy.prestige));
  const quarry = state.legacy.quarry;
  const fight = {
    archetype: encounter.boss ? "boss" : encounterEnemy(encounter, act, data).archetype,
    actId: act.id,
    boss: encounter.boss,
  };
  const forceQuarry =
    quarry !== null && rank !== "normal" && quarry.misses + 1 >= CODEX.quarryPity
      ? quarryAffixIds(data.items, quarry)
      : undefined;
  const items = rollItemChoices(
    data,
    act.id,
    caught ? encounter : { ...encounter, thief: false },
    rank,
    state.progress.deathsInAct,
    act.number + state.legacy.prestige,
    rng,
    actAffixFactor(act, codexAffixFactor(data.items, fight, quarry)),
    forceQuarry,
  );
  const nextQuarry: QuarryMark | null =
    quarry && rank !== "normal"
      ? { ...quarry, misses: quarryFound(items, data.items, quarry) ? 0 : quarry.misses + 1 }
      : quarry;
  const runes = rollRuneDrops(data, rank, act.number + state.legacy.prestige, rng);
  const found = items.flatMap((it) => (it.uniqueId ? [it.uniqueId] : []));
  const newTrophies = [...new Set(found)].filter((id) => !state.legacy.trophies.includes(id));
  const spoils: SpoilsCard[] =
    rank !== "normal" || act.spoilsStages.includes(run.stage)
      ? [
          { kind: "flaskCharge", amount: PROGRESSION.spoils.flaskCharges },
          // Elites and bosses already drop Reforge Stones; their Spoils offer Kindling instead.
          rank === "normal"
            ? { kind: "reforgeStones", amount: PROGRESSION.spoils.reforgeStones }
            : {
                kind: "kindling",
                amount: rank === "boss" ? CODEX.bossKindling : CODEX.eliteKindling,
              },
          { kind: "essence", essenceId: act.essence.id, amount: PROGRESSION.spoils.essences },
        ]
      : [];

  // Ember Shrine (Spielspaß Teil 1): after Stage 5 and 10, Elites and Bosses of an act this run
  // has not cleared yet; Revisit Act and the harvest boss give none.
  const shrine =
    (data.boons?.length ?? 0) > 0 &&
    !state.progress.actsCleared.includes(act.id) &&
    !(rank === "boss" && isHarvestAct(data, act.id, state.legacy.prestige)) &&
    (rank !== "normal" || act.spoilsStages.includes(run.stage));
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

  return {
    ...next,
    stats: {
      ...stats,
      wins: stats.wins + 1,
      bossKills: stats.bossKills + (rank === "boss" ? 1 : 0),
    },
    hero: {
      ...state.hero,
      level: leveled.level,
      xp: leveled.xp,
      unspentAttributePoints:
        state.hero.unspentAttributePoints +
        leveled.levelsGained * PROGRESSION.attributePointsPerLevel,
      unspentSkillPoints:
        state.hero.unspentSkillPoints + leveled.levelsGained * PROGRESSION.skillPointsPerLevel,
    },
    wallet: {
      ...state.wallet,
      gold: state.wallet.gold + auto.gold,
      dust: state.wallet.dust + auto.dust,
      reforgeStones: state.wallet.reforgeStones + stones,
      ascensionShards: state.wallet.ascensionShards + shards,
      runes: addRunes(state.wallet.runes, runes),
    },
    legacy: {
      ...state.legacy,
      runesFound: [...new Set([...state.legacy.runesFound, ...runes])],
      quarry: nextQuarry,
      trophies: [...state.legacy.trophies, ...newTrophies],
    },
    run: {
      ...run,
      phase: "rewards",
      lifeFraction: result.final.hero.life / result.final.hero.maxLife,
      rewards: {
        rank,
        xp,
        gold: auto.gold,
        dust: auto.dust,
        reforgeStones: stones,
        ascensionShards: shards,
        runes,
        levelsGained: leveled.levelsGained,
        report: fightReport(result.events),
        items,
        ...(rank === "boss" ? { picks: PROGRESSION.bossHoardPicks } : {}),
        ...(caught ? { picks: PROGRESSION.thiefPicks, thief: "caught" as const } : {}),
        ...(escaped ? { thief: "escaped" as const } : {}),
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
        ...(newTrophies.length ? { newTrophies } : {}),
        itemPick: null,
        salvagedDust: 0,
        spoils,
        spoilsPick: null,
      },
    },
  };
}

/** Highest rarity normal enemies drop at an Act Tier (act number + Prestige). */
export function maxRarityForActTier(actTier: number): Rarity {
  return PROGRESSION.maxRarityByActTier[actTier - 1] ?? PROGRESSION.maxRarityLate;
}

/**
 * Rarity weights of the item pick. The Act Tier caps the rarity (Elites may reach Rare, the boss
 * always drops Epic), Elites and Bosses set a floor, and Pity raises the two highest allowed
 * rarities.
 */
export function itemPickWeights(
  rank: EnemyRank,
  deathsInAct: number,
  actTier: number = Number.POSITIVE_INFINITY,
): Readonly<Record<Rarity, number>> {
  const idx = (r: Rarity) => RARITIES.indexOf(r);
  const floor =
    rank === "boss"
      ? PROGRESSION.bossMinRarity
      : rank === "elite"
        ? PROGRESSION.eliteMinRarity
        : "normal";
  const actMax = maxRarityForActTier(actTier);
  const max = idx(floor) > idx(actMax) ? floor : actMax;
  const pity = 1 + PROGRESSION.pityPerDeath * Math.min(deathsInAct, PROGRESSION.pityMaxDeaths);
  const weights = { ...PROGRESSION.rarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) {
    if (idx(r) < idx(floor) || idx(r) > idx(max)) weights[r] = 0;
  }
  // Pity lifts the top two allowed rarities that can drop at all (Legendary is not in the PoC).
  const allowed = RARITIES.filter((r) => weights[r] > 0);
  for (const r of allowed.slice(-2)) {
    if (idx(r) > idx(floor) || allowed.length === 1) weights[r] *= pity;
  }
  // Make sure the floor always leaves something to roll.
  if (RARITIES.every((r) => weights[r] === 0)) weights[floor] = 1;
  return weights;
}

function rollItemChoices(
  data: GameData,
  actId: string,
  encounter: Encounter,
  rank: EnemyRank,
  deathsInAct: number,
  actTier: number,
  rng: Rng,
  affixFactor?: (affix: AffixDefinition) => number,
  forceTrigger?: readonly string[],
): Item[] {
  const count =
    rank === "boss"
      ? PROGRESSION.bossHoardCards
      : encounter.thief
        ? PROGRESSION.thiefCards
        : PROGRESSION.itemChoices;
  // A caught Ember Thief always drops one card that is at least Rare.
  const rareCard = encounter.thief ? rng.int(0, count - 1) : -1;
  const weights = itemPickWeights(rank, deathsInAct, actTier);
  const bySlot = new Map<ItemSlot, string[]>();
  for (const baseId of data.lootBases) {
    const slot = getBase(data.items, baseId).slot;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), baseId]);
  }
  const slots = [...bySlot.keys()];
  const items: Item[] = [];
  // Bosses (sometimes Elites) may turn one card Legendary, or even Unique.
  const legendaryCard = rng.chance(PROGRESSION.legendaryChance[rank]) ? rng.int(0, count - 1) : -1;
  // A boss may drop one of its own trophies (Teil 3 "Boss-Trophäen").
  const trophies =
    rank === "boss" && encounter.boss
      ? bossTrophies(data.items, actId).filter((u) => u.minItemLevel <= encounter.level)
      : [];
  const trophy =
    trophies.length && rng.chance(PROGRESSION.bossTrophyChance)
      ? trophies[rng.int(0, trophies.length - 1)]
      : undefined;
  const trophyCard = trophy ? rng.int(0, count - 1) : -1;
  for (let i = 0; i < count; i++) {
    if (trophy && i === trophyCard) {
      items.push(rollUnique(data.items, trophy.id, encounter.level, rng));
      const slot = getBase(data.items, trophy.baseId).slot;
      if (slots.includes(slot)) slots.splice(slots.indexOf(slot), 1);
      continue;
    }
    // Different slots while possible, so the three cards differ.
    const pool = slots.length ? slots : [...bySlot.keys()];
    const slot = pickWeighted(pool, (s) => PROGRESSION.lootSlotWeights[s], rng);
    if (!slot) break;
    slots.splice(slots.indexOf(slot), 1);
    const bases = bySlot.get(slot) ?? [];
    if (i === legendaryCard) {
      const uniques = uniquesFor(data.items, encounter.level, bases);
      const unique =
        uniques.length > 0 && rng.chance(PROGRESSION.uniqueShare)
          ? uniques[rng.int(0, uniques.length - 1)]
          : undefined;
      if (unique) {
        items.push(rollUnique(data.items, unique.id, encounter.level, rng));
        continue;
      }
    }
    // Quarry Pity: the first card carries the marked part (on a base that can have it).
    const forced =
      i === 0 && forceTrigger?.length
        ? bases.filter((id) => fitsAnyAffix(data.items, id, forceTrigger))
        : [];
    const basePool = forced.length ? forced : bases;
    const baseId = basePool[rng.int(0, basePool.length - 1)];
    if (!baseId) break;
    const rolled = i === legendaryCard ? "legendary" : rollRarity(rng, weights);
    const rarity =
      (forced.length || i === rareCard) && RARITIES.indexOf(rolled) < RARITIES.indexOf("rare")
        ? "rare"
        : rolled;
    items.push(
      rollItem(
        data.items,
        {
          baseId,
          itemLevel: encounter.level,
          rarity,
          ...(affixFactor ? { affixFactor } : {}),
          ...(forced.length && forceTrigger ? { forceTrigger } : {}),
        },
        rng,
      ),
    );
  }
  return items;
}

/** Adds Runes to the pouch. */
/** Act loot (favored affixes, e.g. Fire Resistance in the Ember Wastes) on top of the Codex. */
function actAffixFactor(
  act: ActData,
  codex: (affix: AffixDefinition) => number,
): (affix: AffixDefinition) => number {
  const favored = act.favoredAffixes ?? {};
  return (affix) => codex(affix) * (favored[affix.id] ?? 1);
}

function fitsAnyAffix(catalog: ItemCatalog, baseId: string, affixIds: readonly string[]): boolean {
  const slot = getBase(catalog, baseId).slot;
  return affixIds.some((id) => catalog.affixes.get(id)?.slots.includes(slot));
}

export function addRunes(
  pouch: Readonly<Record<string, number>>,
  runes: readonly string[],
): Record<string, number> {
  const next = { ...pouch };
  for (const id of runes) next[id] = (next[id] ?? 0) + 1;
  return next;
}

/** Highest Rune rank that drops at an Act Tier (act number + Prestige). */
export function maxRuneRank(actTier: number): number {
  return PROGRESSION.runeRankBase + PROGRESSION.runeRanksPerActTier * actTier;
}

/** Runes a win drops: by chance per rank, lower Rune ranks far more often (like D2). */
export function rollRuneDrops(
  data: GameData,
  rank: EnemyRank,
  actTier: number,
  rng: Rng,
): string[] {
  const max = maxRuneRank(actTier);
  // The top ranks are the Ber and Jah of Emberheir: only Elites and Bosses, and rarely.
  const topRank = Math.max(...[...data.items.runes.values()].map((r) => r.rank));
  const high = (r: { rank: number }) => r.rank > topRank - PROGRESSION.highRuneRanks;
  const pool = [...data.items.runes.values()].filter(
    (r) => r.rank <= max && (rank !== "normal" || !high(r)),
  );
  const drops: string[] = [];
  const count = PROGRESSION.runeDrops[rank];
  const weight = (r: { rank: number }) =>
    PROGRESSION.runeRankFalloff ** (r.rank - 1) * (high(r) ? PROGRESSION.highRuneFactor : 1);
  for (let i = 0; i < Math.ceil(count); i++) {
    if (!rng.chance(Math.min(1, count - i))) continue;
    const rune = pickWeighted(pool, weight, rng);
    if (rune) drops.push(rune.id);
  }
  return drops;
}

function retreat(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission", "fight", "rewards");
  // Rewards are picked first, so no loot gets lost on the way back.
  if (run.rewards && !rewardsDone(run.rewards)) return fail("Pick your rewards first");
  const enemyName = run.encounter ? encounterName(run.encounter, run.actId, data) : undefined;
  return toCamp({ ...state, stats: { ...state.stats, retreats: state.stats.retreats + 1 } }, data, {
    kind: "retreat",
    actId: run.actId,
    stage: run.stage,
    ...(enemyName ? { enemyName } : {}),
  });
}

function requireRewards(state: GameState): { run: RunState; rewards: Rewards } {
  const run = requireRun(state, "rewards");
  return { run, rewards: run.rewards ?? fail("No rewards") };
}

/** Puts an item into its equipment slot; the old one goes to the inventory. */
function equipItem(
  state: GameState,
  data: GameData,
  item: Item,
  inventory: readonly PlacedItem[],
): GameState {
  const slot = targetSlot(item, data, state.hero.equipment) ?? fail("No slot for this item");
  const old = state.hero.equipment[slot];
  const newInventory = old ? (addToGrid(inventory, old, data.items) ?? fail("No room")) : inventory;
  return {
    ...state,
    inventory: newInventory,
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
  };
}

function pickItem(
  state: GameState,
  data: GameData,
  index: number,
  mode: "equip" | "take",
): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  const taken = rewards.taken ?? [];
  if (taken.some((t) => t.index === index)) return fail("Item already taken");
  const item = rewards.items[index] ?? fail("No such item");
  let next: GameState;
  if (mode === "equip") {
    const reason = equipBlockReason(state, data, item, "pick");
    if (reason) return fail(`Cannot equip: ${reason}`);
    next = equipItem(state, data, item, state.inventory);
  } else {
    const inventory = addToGrid(state.inventory, item, data.items) ?? fail("No room");
    next = { ...state, inventory };
  }
  const nowTaken = [...taken, { index, kind: mode }];
  // Boss Hoard: more picks left, the rest waits.
  if (nowTaken.length < (rewards.picks ?? 1)) {
    return { ...next, run: { ...run, rewards: { ...rewards, taken: nowTaken } } };
  }
  return finishItemPick(next, run, { ...rewards, taken: nowTaken }, { kind: mode, index });
}

/** Ends the item pick: every card not taken is salvaged. */
function finishItemPick(
  state: GameState,
  run: RunState,
  rewards: Rewards,
  pick: ItemPick,
): GameState {
  const taken = new Set((rewards.taken ?? []).map((t) => t.index));
  const salvaged = rewards.items
    .filter((_, i) => !taken.has(i))
    .reduce((sum, it) => sum + salvageValue(it), 0);
  return {
    ...state,
    wallet: { ...state.wallet, dust: state.wallet.dust + salvaged },
    run: { ...run, rewards: { ...rewards, itemPick: pick, salvagedDust: salvaged } },
  };
}

/** Salvages every card that was not taken (all of them before the first pick). */
function salvageAll(state: GameState): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  return finishItemPick(state, run, rewards, { kind: "salvageAll" });
}

/** Takes one Boon of the Shrine; it counts as this act's until the boss falls. */
function pickBoon(state: GameState, index: number): GameState {
  const { run, rewards } = requireRewards(state);
  if (!rewards.boonOffer?.length) return fail("No Shrine here");
  if (rewards.boonPick != null) return fail("Boon already taken");
  const pick = rewards.boonOffer[index] ?? fail("No such Boon");
  return {
    ...state,
    boons: { ...state.boons, fresh: [...state.boons.fresh, pick] },
    run: { ...run, rewards: { ...rewards, boonPick: index } },
  };
}

function pickSpoils(state: GameState, index: number): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.spoilsPick !== null) return fail("Spoils already picked");
  const card = rewards.spoils[index] ?? fail("No such spoils card");
  let next: GameState;
  if (card.kind === "flaskCharge") {
    next = {
      ...state,
      flaskCharges: Math.min(PROGRESSION.flaskMaxCharges, state.flaskCharges + card.amount),
    };
  } else if (card.kind === "reforgeStones") {
    next = {
      ...state,
      wallet: { ...state.wallet, reforgeStones: state.wallet.reforgeStones + card.amount },
    };
  } else if (card.kind === "kindling") {
    next = { ...state, wallet: { ...state.wallet, kindling: state.wallet.kindling + card.amount } };
  } else {
    const essences = { ...state.wallet.essences };
    essences[card.essenceId] = (essences[card.essenceId] ?? 0) + card.amount;
    next = { ...state, wallet: { ...state.wallet, essences } };
  }
  return { ...next, run: { ...run, rewards: { ...rewards, spoilsPick: index } } };
}

/** True once the item pick (and the spoils pick, if any) is done. */
export function rewardsDone(rewards: Rewards): boolean {
  return (
    rewards.itemPick !== null &&
    (rewards.spoils.length === 0 || rewards.spoilsPick !== null) &&
    (!rewards.boonOffer?.length || rewards.boonPick != null)
  );
}

function continueRun(state: GameState, data: GameData): GameState {
  const { run, rewards } = requireRewards(state);
  if (!rewardsDone(rewards)) return fail("Pick your rewards first");
  const encounter = run.encounter ?? fail("No encounter");
  if (encounter.boss) {
    const cleared = state.progress.actsCleared.includes(run.actId)
      ? state.progress.actsCleared
      : [...state.progress.actsCleared, run.actId];
    const enemyName = encounterName(encounter, run.actId, data);
    const harvest = isHarvestAct(data, run.actId, state.legacy.prestige);
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

function useFlask(state: GameState): GameState {
  const run = requireRun(state, "intermission", "rewards");
  if (state.flaskCharges <= 0) return fail("The Ember Flask is empty");
  if (run.lifeFraction >= 1) return fail("Life is already full");
  return {
    ...state,
    flaskCharges: state.flaskCharges - 1,
    run: { ...run, lifeFraction: Math.min(1, run.lifeFraction + PROGRESSION.flaskHeal) },
  };
}

function allocateAttributes(state: GameState, points: Partial<Attributes>): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  let total = 0;
  const attributes: Record<Attribute, number> = { ...state.hero.attributes };
  for (const a of ATTRIBUTES) {
    const n = points[a] ?? 0;
    if (!Number.isInteger(n) || n < 0) return fail("Points must be whole and positive");
    attributes[a] += n;
    total += n;
  }
  if (total > state.hero.unspentAttributePoints) return fail("Not enough Attribute Points");
  return {
    ...state,
    hero: {
      ...state.hero,
      attributes,
      unspentAttributePoints: state.hero.unspentAttributePoints - total,
    },
  };
}

function findInInventory(state: GameState, itemId: string): PlacedItem {
  return state.inventory.find((p) => p.item.id === itemId) ?? fail("Item not in the inventory");
}

/** Equips from the inventory or (in the Camp) the stash; the old item goes back there. */
function equipFromInventory(state: GameState, data: GameData, itemId: string): GameState {
  const fromStash = state.stash.find((p) => p.item.id === itemId);
  const placed = fromStash ?? findInInventory(state, itemId);
  const reason = equipBlockReason(state, data, placed.item, fromStash ? "stash" : "inventory");
  if (reason) return fail(`Cannot equip: ${reason}`);
  const slot = targetSlot(placed.item, data, state.hero.equipment) ?? fail("No slot for this item");
  const old = state.hero.equipment[slot];
  const source = (fromStash ? state.stash : state.inventory).filter((p) => p !== placed);
  const size = fromStash ? STASH_SIZE : INVENTORY_SIZE;
  const back = old ? (addToGrid(source, old, data.items, size) ?? fail("No room")) : source;
  return {
    ...state,
    ...(fromStash ? { stash: back } : { inventory: back }),
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: placed.item } },
  };
}

export type MoveBlockReason = "camp" | "burned" | "noRoom";

/** Why an item cannot move between inventory and stash right now. */
export function moveBlockReason(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
): MoveBlockReason | undefined {
  if (state.run) return "camp";
  if (to === "stash" && state.progress.stashBurned) return "burned";
  const source = to === "stash" ? state.inventory : state.stash;
  const placed = source.find((p) => p.item.id === itemId);
  if (!placed) return undefined;
  const target = to === "stash" ? state.stash : state.inventory;
  const size = to === "stash" ? STASH_SIZE : INVENTORY_SIZE;
  return addToGrid(target, placed.item, data.items, size) ? undefined : "noRoom";
}

function moveItem(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
): GameState {
  requireCamp(state);
  if (to === "stash" && state.progress.stashBurned) return fail("The Supply Wagon burned down");
  const source = to === "stash" ? state.inventory : state.stash;
  const placed =
    source.find((p) => p.item.id === itemId) ??
    fail(`Item not in the ${to === "stash" ? "inventory" : "stash"}`);
  const target = to === "stash" ? state.stash : state.inventory;
  const size = to === "stash" ? STASH_SIZE : INVENTORY_SIZE;
  const moved = addToGrid(target, placed.item, data.items, size) ?? fail("No room");
  const rest = source.filter((p) => p !== placed);
  return to === "stash"
    ? { ...state, inventory: rest, stash: moved }
    : { ...state, inventory: moved, stash: rest };
}

function sortStash(state: GameState, data: GameData): GameState {
  requireCamp(state);
  return { ...state, stash: packGrid(state.stash, data.items, STASH_SIZE) };
}

function unequip(state: GameState, data: GameData, slot: EquipmentSlot): GameState {
  const reason = unequipBlockReason(state, data, slot);
  if (reason) return fail(`Cannot unequip: ${reason}`);
  const item = state.hero.equipment[slot] ?? fail("Slot is empty");
  const inventory = addToGrid(state.inventory, item, data.items) ?? fail("No room");
  const equipment: Equipment = Object.fromEntries(
    Object.entries(state.hero.equipment).filter(([s]) => s !== slot),
  );
  return { ...state, inventory, hero: { ...state.hero, equipment } };
}

function salvage(state: GameState, data: GameData, itemId: string): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const placed = findInInventory(state, itemId);
  const { codex } = learnFromItem(state.legacy.codex, placed.item, data.items);
  return {
    ...state,
    inventory: state.inventory.filter((p) => p !== placed),
    wallet: { ...state.wallet, dust: state.wallet.dust + salvageValue(placed.item) },
    legacy: codex === state.legacy.codex ? state.legacy : { ...state.legacy, codex },
  };
}

function setQuarry(
  state: GameState,
  part: { readonly kind: CodexPartKind; readonly id: string } | null,
): GameState {
  requireCamp(state);
  if (part && codexMastery(state.legacy.codex, part.kind, part.id) === 0) {
    return fail("Only known Codex parts can be the Quarry");
  }
  return { ...state, legacy: { ...state.legacy, quarry: part ? { ...part, misses: 0 } : null } };
}

/** Kaelen travels with the caravan from the first Camp on; the Skill Tree is Camp-only. */
export function requireTrainer(state: GameState): void {
  requireCamp(state);
}

/** The Battle Plan can be changed in the Camp and between stages, never mid-fight. */
function requirePlanEdit(state: GameState): void {
  if (state.pendingPrestige) fail("The harvest comes first");
  if (state.run?.phase === "fight") fail("Not during a fight");
}

function learn(state: GameState, data: GameData, nodeIds: readonly string[]): GameState {
  requireTrainer(state);
  let result: ReturnType<typeof learnNodes>;
  try {
    result = learnNodes(
      data.skillTree,
      state.hero.learned,
      nodeIds,
      { skillPoints: state.hero.unspentSkillPoints, harvesterEmber: state.wallet.harvesterEmber },
      state.legacy.branches,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  return {
    ...state,
    hero: {
      ...state.hero,
      learned: result.learned,
      unspentSkillPoints: result.budget.skillPoints,
    },
    wallet: { ...state.wallet, harvesterEmber: result.budget.harvesterEmber },
  };
}

/** Skill Points and Harvester's Ember spent in the tree (the start node is free). */
export function spentInTree(
  data: GameData,
  learned: LearnedNodes,
): { readonly skillPoints: number; readonly harvesterEmber: number } {
  let skillPoints = 0;
  let harvesterEmber = 0;
  for (const node of data.skillTree.nodes) {
    if (node.id === data.skillTree.startNodeId) continue;
    const ranks = learned[node.id] ?? 0;
    if (node.kind === "keystone") harvesterEmber += ranks;
    else skillPoints += ranks;
  }
  return { skillPoints, harvesterEmber };
}

function respecTree(state: GameState, data: GameData): GameState {
  requireTrainer(state);
  const spent = spentInTree(data, state.hero.learned);
  if (spent.skillPoints + spent.harvesterEmber === 0) return fail("Nothing to respec");
  if (state.wallet.gold < PROGRESSION.respecGold) return fail("Not enough Gold");
  return {
    ...state,
    hero: {
      ...state.hero,
      learned: {},
      unspentSkillPoints: state.hero.unspentSkillPoints + spent.skillPoints,
      // Tree skills are gone, so the Battle Plan falls back to the Start Skill.
      rotation: state.hero.rotation.map(() => null),
    },
    wallet: {
      ...state.wallet,
      gold: state.wallet.gold - PROGRESSION.respecGold,
      harvesterEmber: state.wallet.harvesterEmber + spent.harvesterEmber,
    },
  };
}

function setRotationSkill(
  state: GameState,
  data: GameData,
  slot: number,
  skillId: string | null,
): GameState {
  requirePlanEdit(state);
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.progress.rotationSlots) {
    return fail("No such Rotation Slot");
  }
  const weapon = heroSetup(state, data).setup.weapon;
  if (skillId !== null && !knownSkills(state, data, weapon).some((k) => k.skill.id === skillId)) {
    return fail("Unknown skill");
  }
  const rotation = Array.from(
    { length: state.progress.rotationSlots },
    (_, i) => state.hero.rotation[i] ?? null,
  );
  // A skill sits in one slot only.
  const filled = rotation.map((id) => (id === skillId && skillId !== null ? null : id));
  filled[slot] = skillId;
  return { ...state, hero: { ...state.hero, rotation: filled } };
}

/** Checks a Battle Plan against the unlocks; changing a chosen Capstone costs Gold. */
function setBattlePlan(state: GameState, data: GameData, plan: BattlePlanState): GameState {
  requirePlanEdit(state);
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const slots = state.progress.rotationSlots;
  const fit = <T>(list: readonly T[], length: number, empty: T): T[] =>
    Array.from({ length }, (_, i) => list[i] ?? empty);

  const thresholds = fit(plan.thresholds, slots, null);
  if (thresholds.some((t) => t !== null && (!unlocks.thresholds || !validThreshold(t)))) {
    return fail("Invalid Trigger Threshold");
  }
  const checkModifiers = (list: readonly (readonly SlotModifier[])[], length: number) => {
    const fitted = fit(list, length, [] as readonly SlotModifier[]);
    for (const mods of fitted) {
      if (mods.length > unlocks.modifiers || new Set(mods).size !== mods.length) {
        fail("Too many Slot Modifiers");
      }
      if (mods.some((m) => !SLOT_MODIFIERS.some((d) => d.id === m))) fail("Unknown Slot Modifier");
      if (mods.some((m) => !modifierAllowed(m, unlocks))) fail("Slot Modifier locked");
    }
    return fitted;
  };
  const modifiers = checkModifiers(plan.modifiers, slots);
  const conditions = fit(plan.conditions, slots, null);
  if (conditions.some((c) => c !== null && (!unlocks.conditions || !slotCondition(c)))) {
    return fail("Invalid Rotation Condition");
  }
  const weapon = heroSetup(state, data).setup.weapon;
  const known = knownSkills(state, data, weapon);
  const reactions = fit(plan.reactions, unlocks.reactionSlots, null);
  if (plan.reactions.slice(unlocks.reactionSlots).some((r) => r))
    return fail("Reaction Slot locked");
  for (const r of reactions) {
    if (!r) continue;
    if (!known.some((k) => k.skill.id === r.skillId)) return fail("Unknown skill");
    if (!reactionCondition(r.conditionId)) return fail("Unknown Reaction condition");
    if (!reactionConditionAllowed(r.conditionId, unlocks)) return fail("Reaction condition locked");
  }
  const reactionModifiers = checkModifiers(plan.reactionModifiers, unlocks.reactionSlots);
  const openingMove = plan.openingMove ?? null;
  if (openingMove !== null) {
    if (!unlocks.openingMove) return fail("Opening Move locked");
    if (!known.some((k) => k.skill.id === openingMove)) return fail("Unknown skill");
  }

  const capstone = plan.capstone;
  let gold = state.wallet.gold;
  if (capstone) {
    if (!unlocks.capstone) return fail("Capstone locked");
    if (!CAPSTONES.some((c) => c.id === capstone.id)) return fail("Unknown Capstone");
    if (!Number.isInteger(capstone.slot) || capstone.slot < 0 || capstone.slot >= slots) {
      return fail("No such Rotation Slot");
    }
    const old = state.hero.plan.capstone;
    if (old && old.id !== capstone.id) {
      if (gold < PROGRESSION.capstoneChangeGold) return fail("Not enough Gold");
      gold -= PROGRESSION.capstoneChangeGold;
    }
  } else if (state.hero.plan.capstone) {
    return fail("A Capstone cannot be removed");
  }
  return {
    ...state,
    hero: {
      ...state.hero,
      plan: {
        thresholds,
        modifiers,
        conditions,
        reactions,
        reactionModifiers,
        capstone: capstone ? { id: capstone.id, slot: capstone.slot } : null,
        openingMove,
      },
    },
    wallet: { ...state.wallet, gold },
  };
}

function validThreshold(t: number): boolean {
  return Number.isFinite(t) && t >= 0 && t <= COMBAT.maxHeat;
}

// --- prestige --------------------------------------------------------------------------------

/** Prestige branches the coming Prestige can unlock. */
export function openBranches(state: GameState, data: GameData): PrestigeBranchDefinition[] {
  return (data.skillTree.prestigeBranches ?? []).filter(
    (b) => !state.legacy.branches.includes(b.id),
  );
}

/** Seals the coming Prestige allows (one more than the Prestiges done so far). */
export function sealsAvailable(state: GameState, data: GameData): number {
  return prestigeRewards(data, state.legacy.prestige + 1).seals;
}

/**
 * Prestige light (M5): sealed slots keep their items, everything else burns (gear, inventory,
 * stash, currencies except Harvester's Ember). Level, points, Skill Tree, Battle Plan and Ember
 * stay. A hero without a sealed weapon picks up a plain one of the same kind.
 */
function doPrestige(
  state: GameState,
  data: GameData,
  sealedSlots: readonly EquipmentSlot[],
  branchId: string | undefined,
): GameState {
  const pending = state.pendingPrestige ?? fail("No Prestige pending");
  const open = openBranches(state, data);
  if (branchId === undefined ? open.length > 0 : !open.some((b) => b.id === branchId)) {
    return fail("Choose an open Prestige branch");
  }
  const sealed = [...new Set(sealedSlots)];
  if (sealed.length !== sealedSlots.length) return fail("A slot can only be sealed once");
  if (sealed.some((slot) => !data.equipmentSlots.includes(slot))) return fail("No such slot");
  if (sealed.length > sealsAvailable(state, data)) return fail("Not enough Seals");

  const [rng, next] = nextRng(state);
  const prestige = state.legacy.prestige + 1;
  const rewards = prestigeRewards(data, prestige);
  const equipment: Partial<Record<EquipmentSlot, Item>> = {};
  for (const slot of sealed) {
    const item = state.hero.equipment[slot];
    if (item) equipment[slot] = item;
  }
  if (!equipment.mainHand) {
    const old = state.hero.equipment.mainHand;
    const baseId = old?.baseId ?? data.starterWeapons[0] ?? fail("No starter weapon");
    equipment.mainHand = rollItem(data.items, { baseId, itemLevel: 1, rarity: "normal" }, rng);
  }
  return {
    ...next,
    hero: { ...state.hero, equipment },
    wallet: {
      gold: 0,
      dust: rewards.dust,
      reforgeStones: 0,
      essences: {},
      harvesterEmber: state.wallet.harvesterEmber + rewards.harvesterEmber,
      ascensionShards: 0,
      runes: {},
      kindling: 0,
    },
    inventory: [],
    stash: [],
    flaskCharges: PROGRESSION.flaskStartCharges,
    progress: {
      actsCleared: [],
      deathsInAct: 0,
      trainerUnlocked: true,
      rotationSlots: Math.max(state.progress.rotationSlots, rewards.rotationSlots),
      stashBurned: true,
      runesmithUnlocked: state.progress.runesmithUnlocked,
    },
    run: null,
    legacy: {
      ...state.legacy,
      prestige,
      seals: sealed,
      branches: branchId ? [...state.legacy.branches, branchId] : state.legacy.branches,
      chronicle: [
        ...state.legacy.chronicle,
        {
          generation: prestige,
          sealed,
          level: state.hero.level,
          deaths: state.stats.deaths - state.legacy.chronicle.reduce((n, c) => n + c.deaths, 0),
          enemyName: pending.enemyName,
        },
      ],
    },
    pendingPrestige: null,
    // The Boons burn with the rest of the run.
    boons: EMPTY_BOONS,
    notice: {
      kind: "prestige",
      actId: pending.actId,
      stage: pending.stage,
      enemyName: pending.enemyName,
    },
  };
}

// --- save games ------------------------------------------------------------------------------

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

/** Reads a save game. Throws if it is broken or from an incompatible version. */
export function deserializeGame(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) throw new Error("Save game is not an object");
  let state = parsed as Partial<GameState>;
  if (state.version === 1) state = migrateV1(state);
  if (state.version === 2) state = migrateV2(state);
  if (state.version === 3) state = migrateV3(state);
  if (state.version === 4) state = migrateV4(state);
  if (state.version === 5) state = migrateV5(state);
  if (state.version === 6) state = migrateV6(state);
  if (state.version !== SAVE_VERSION) {
    throw new Error(`Save game version ${String(state.version)} is not supported`);
  }
  if (
    !state.hero ||
    !state.wallet ||
    !state.progress ||
    !Array.isArray(state.inventory) ||
    !Array.isArray(state.stash) ||
    !state.legacy
  ) {
    throw new Error("Save game is incomplete");
  }
  return state as GameState;
}

/** v1 (M3) → v2 (M4): Ascension Shards and the stash are new. */
function migrateV1(state: Partial<GameState>): Partial<GameState> {
  const rewards = state.run?.rewards;
  return {
    ...state,
    version: 2,
    stash: state.stash ?? [],
    ...(state.wallet ? { wallet: { ...state.wallet, ascensionShards: 0 } } : {}),
    ...(state.run
      ? { run: { ...state.run, rewards: rewards ? { ...rewards, ascensionShards: 0 } : null } }
      : {}),
  };
}

/** v2 (M4) → v3 (M5): Prestige (legacy, pending Prestige, burned stash) is new. */
function migrateV2(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 3,
    legacy: {
      prestige: 0,
      seals: [],
      chronicle: [],
      runewords: [],
      runesFound: [],
      codex: EMPTY_CODEX,
      quarry: null,
      branches: [],
      trophies: [],
    },
    pendingPrestige: null,
    ...(state.progress ? { progress: { ...state.progress, stashBurned: false } } : {}),
  };
}

/** v3 (M5–M7) → v4 (M8): Runes, Runeword Codex, Eldrin and Marisha's stock are new. */
function migrateV3(state: Partial<GameState>): Partial<GameState> {
  const rewards = state.run?.rewards;
  return {
    ...state,
    version: 4,
    merchant: { key: 0, sold: [] },
    ...(state.wallet ? { wallet: { ...state.wallet, runes: {} } } : {}),
    ...(state.progress ? { progress: { ...state.progress, runesmithUnlocked: false } } : {}),
    ...(state.legacy ? { legacy: { ...state.legacy, runewords: [], runesFound: [] } } : {}),
    ...(state.run
      ? { run: { ...state.run, rewards: rewards ? { ...rewards, runes: [] } : null } }
      : {}),
  };
}

/** v4 (M8) → v5 (prestige rework): Trigger Codex, Quarry and Kindling are new. */
function migrateV4(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 5,
    ...(state.wallet ? { wallet: { ...state.wallet, kindling: 0 } } : {}),
    ...(state.legacy ? { legacy: { ...state.legacy, codex: EMPTY_CODEX, quarry: null } } : {}),
  };
}

/** v5 → v6 (M10): Battle Plan choices beyond the Rotation, Prestige branches. */
function migrateV5(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 6,
    ...(state.hero ? { hero: { ...state.hero, plan: EMPTY_PLAN } } : {}),
    ...(state.legacy ? { legacy: { ...state.legacy, branches: [] } } : {}),
  };
}

/**
 * v6 → v7 (Spielspaß plan): the faster Battle Plan ladder grants its slots to older heroes; the
 * Trophy Wall starts with the Uniques the hero carries.
 */
function migrateV6(state: Partial<GameState>): Partial<GameState> {
  const prestige = state.legacy?.prestige ?? 0;
  const carried = [
    ...Object.values(state.hero?.equipment ?? {}),
    ...(state.inventory ?? []).map((p) => p.item),
    ...(state.stash ?? []).map((p) => p.item),
  ].flatMap((item) => (item?.uniqueId ? [item.uniqueId] : []));
  return {
    ...state,
    version: 7,
    ...(state.legacy ? { legacy: { ...state.legacy, trophies: [...new Set(carried)] } } : {}),
    boons: EMPTY_BOONS,
    ...(state.progress
      ? {
          progress: {
            ...state.progress,
            rotationSlots: Math.max(
              state.progress.rotationSlots,
              battlePlanUnlocks(prestige).rotationSlots,
            ),
          },
        }
      : {}),
  };
}
