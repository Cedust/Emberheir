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
import {
  type ResolvedEquipment,
  itemFlaskCharges,
  itemSlotFor,
  missingRequirements,
  requiredLevel,
} from "../items/equipment";
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
import { type LootGate, PROGRESSION } from "./constants";
import { type CodexState, EMPTY_CODEX, codexAffixFactor, learnFromItem } from "./codex";
import {
  type BountyDefinition,
  type BountyState,
  bountyAfterFlask,
  bountyAfterWin,
  rollBounty,
} from "./bounties";
import { type HeroClass, classTitle, getClass } from "./classes";
import { type EliteModifier, applyEliteModifiers, eliteChance, eliteModifierCount } from "./elites";
import { buildHeroSetup } from "./hero";
import {
  ATTRIBUTE_RULES,
  type AttributePoints,
  addAttributes,
  attributeProblem,
  sumAttributes,
} from "./attributes";
import {
  EMPTY_MASTERY,
  type EchoDefinition,
  type EchoesState,
  MASTERY,
  type MasteryBuild,
  type MasteryState,
  type WeaponMasteryTree,
  buildMasteryWeapon,
  learnMastery,
  pointsAvailable,
  pointsSpent,
  weaponRank,
  weaponTitle,
} from "./weapon-mastery";
import {
  type GridPosition,
  INVENTORY_SIZE,
  type PlacedItem,
  STASH_SIZE,
  addToGrid,
  packGrid,
  placeAt,
} from "./inventory";
import { type CraftRequest, craft } from "./crafting";
import { type EnemyRank, autoRewards, bossLevel, gainXp, levelCap, xpForKill } from "./leveling";
import {
  type LearnedNodes,
  type PrestigeBranchDefinition,
  type SkillTreeDefinition,
  MAX_BRANCH_TIER,
  branchTier,
  forgetBlockReason,
  getNode,
  keystoneLimit,
  keystoneRules,
  learnBudget,
  learnCost,
  learnNodes,
  startingNodes,
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
export const SAVE_VERSION = 13;

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
  /** Nyssa (Runesmith) waits in this act; she joins after the first trip into it. */
  readonly runesmith?: boolean;
  /** Stages with an Ember Shrine (5 and 10); Elites have one too. */
  readonly shrineStages: readonly number[];
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
  /** Classes a new character can pick (klassen-v2.md). */
  readonly classes: readonly HeroClass[];
  /** Title epithet per Prestige branch for branches outside the class's own ("of the Storm"). */
  readonly branchEpithets: Readonly<Record<string, string>>;
  /** Innate skill per weapon id: it comes with the weapon, not from the Skill Tree. */
  readonly startSkills: Readonly<Record<string, SkillDefinition>>;
  /** Weapon Mastery tree per weapon id (waffe-als-system-v1.md). */
  readonly weaponMastery: Readonly<Record<string, WeaponMasteryTree>>;
  /** Echoes the act bosses leave on the weapon. */
  readonly echoes: readonly EchoDefinition[];
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
  /** The Scout's Bounties; none without them. */
  readonly bounties?: readonly BountyDefinition[];
  /** The Ember Thief (runs away after `PROGRESSION.thiefFleeSeconds`); none without it. */
  readonly thief?: EnemyDefinition;
  /**
   * The Last Ember (M11): a short gauntlet after the final Prestige. Its act holds one stage per
   * Warden echo plus the last one, the Harvester's Core (`boss`). Not on the road.
   */
  readonly finale?: ActData;
  readonly startingAttributes: Attributes;
}

export interface Wallet {
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  /** Upgrade (+1 Item Tier) at the Blacksmith. Bosses, sometimes Elites. */
  readonly phoenixFeathers: number;
  /** Rune pouch: loose Runes by id. They take no inventory space and burn at the Prestige. */
  readonly runes: Readonly<Record<string, number>>;
}

export interface HeroState {
  /** The character's name (Character Select). */
  readonly name: string;
  /** The class; fixed for the character (klassen-v2.md). */
  readonly classId: string;
  readonly level: number;
  /** XP towards the next level. */
  readonly xp: number;
  /** Own attributes: start values plus spent points (gear not included). */
  readonly attributes: Attributes;
  readonly unspentAttributePoints: number;
  readonly unspentSkillPoints: number;
  readonly learned: LearnedNodes;
  /** The weapon chosen with the class; it never changes (Weapon Mastery). */
  readonly weaponId: string;
  /** Weapon Mastery at Kaelen: learned nodes, Forms, Keystone and the worn Echo. */
  readonly mastery: MasteryState;
  readonly equipment: Equipment;
  /**
   * Skill id per Rotation Slot. `null` = the weapon's Innate skill. Skills the hero
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
  /** The Last Ember: the echo of this act's boss. */
  readonly echo?: string;
}

export type ItemPick =
  { readonly kind: "equip" | "take"; readonly index: number } | { readonly kind: "salvageAll" };

/** What a done bounty paid; its item went to the Supply Wagon (or the inventory, or Ash). */
export interface BountyReward {
  readonly id: string;
  readonly enemyId?: string;
  readonly acorns: number;
  readonly emberCoal: number;
  readonly item: Item;
  readonly to: "stash" | "inventory" | "salvaged";
}

/** Rewards of a won fight (loot-rewards-v1.md): automatic drops, the item pick, maybe a Boon. */
export interface Rewards {
  readonly rank: EnemyRank;
  readonly xp: number;
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  readonly phoenixFeathers: number;
  /** Runes that dropped (straight into the pouch). */
  readonly runes: readonly string[];
  readonly levelsGained: number;
  /** The stage was a Waymark reached for the first time this run: +1 Skill Point. */
  readonly waymark?: boolean;
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
  /** A boss left its Echo on the weapon, or made it one stage stronger. */
  readonly echo?: { readonly id: string; readonly stage: number };
  /** Ash from auto-salvaging the items that were not picked. */
  readonly salvagedAsh: number;
  /** The Scout's bounty was done in this fight. */
  readonly bounty?: BountyReward;
  /** What the Battle Plan did in this fight (missing in older saves). */
  readonly report?: FightReport;
  /** Ember Shrine: 1 of these Boons (after Stage 5 and 10 and Elites). */
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
  /** The Scout's bounty for this trip, if one was handed out. */
  readonly bounty?: BountyState;
}

/** Shown once in the Camp after a run ends. */
export interface Notice {
  /** "prestige" is the Inheritance screen after the final boss of the run. */
  readonly kind: "death" | "retreat" | "actCleared" | "prestige" | "ending";
  readonly actId: string;
  readonly stage: number;
  readonly enemyName?: string;
}

/** What one Prestige gives (docs/design/ui-views-v1.md, Prestige flow: Inheritance). */
export interface PrestigeRewards {
  /** Prestige level after it: 1 after the first final boss. */
  readonly prestige: number;
  readonly rotationSlots: number;
  /** The Battle Plan upgrade this Prestige unlocks (`BATTLE_PLAN_LADDER`). */
  readonly planUpgrade: string | null;
  /** The Harvest's Skill Points (level-v2.md section 7). */
  readonly skillPoints: number;
  /** The Harvest's new Attribute Points. */
  readonly attributePoints: number;
  /** Keystones that can be active at once after it (one more at Prestige 2, 4 and 6). */
  readonly keystones: number;
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
  /** The title the generation carried (missing in older saves). */
  readonly title?: string;
  readonly level: number;
  readonly deaths: number;
  readonly enemyName: string;
}

/** Everything that survives the fire (Legacy view at the Hearthfire). */
export interface LegacyState {
  /** Prestiges done so far. Generation = prestige + 1. */
  readonly prestige: number;
  readonly chronicle: readonly ChronicleEntry[];
  /** Runeword Codex: Runewords forged at least once. Permanent. */
  readonly runewords: readonly string[];
  /** Runes ever found. A Runeword shows its recipe once all its Runes were found. */
  readonly runesFound: readonly string[];
  /** Trigger Codex: Conditions and Effects learned from salvaged triggers. Permanent. */
  readonly codex: CodexState;
  /**
   * Prestige branch picks of the Skill Tree, one per Prestige. Permanent. A branch picked again
   * is deepened, so it appears once per tier (`branchTier`).
   */
  readonly branches: readonly string[];
  /** Trophy Wall: Uniques ever found. Permanent like the Runeword Codex. */
  readonly trophies: readonly string[];
  /** Echoes earned from act bosses: their stage rises once per run (Weapon Mastery). */
  readonly echoes: EchoesState;
  /** The Last Ember: attempts so far and whether the last flame is home. */
  readonly finaleAttempts?: number;
  readonly finaleWon?: boolean;
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
  /**
   * Supply Wagon: only reachable in the Camp. Shared by every character: the UI keeps one stash
   * for all save slots and puts it into the state it loads.
   */
  readonly stash: readonly PlacedItem[];
  readonly flaskCharges: number;
  readonly progress: {
    readonly actsCleared: readonly string[];
    /** Deaths in the current act since its boss last fell (Pity). */
    readonly deathsInAct: number;
    /** Kaelen (Skill Tree, Battle Plan) joins after the first act boss. */
    readonly trainerUnlocked: boolean;
    readonly rotationSlots: number;
    /** Nyssa (Runesmith) joined the caravan. Stays through every Prestige. */
    readonly runesmithUnlocked: boolean;
    /**
     * Waymarks reached in this run (`waymarkKey`): each gave a Skill Point. They open again at
     * the Prestige, so every run pays its Waymarks anew (level-v2.md section 7).
     */
    readonly waymarks: readonly string[];
  };
  /** Marisha's stock: which offers of the current stock are sold. */
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

export interface NewGameOptions {
  readonly seed: number;
  readonly classId: string;
  /** One of the class's weapons; default its first. Fixed for the character. */
  readonly weapon?: string;
  readonly name?: string;
  /**
   * The free points of the creation (attribute-v1.md section 5), on top of the Class Array. Left
   * out, they wait as unspent points.
   */
  readonly attributes?: AttributePoints;
}

export function newGame(data: GameData, options: NewGameOptions): GameState {
  const heroClass = data.classes.find((c) => c.id === options.classId);
  if (!heroClass) return fail(`Unknown class "${options.classId}"`);
  const weaponId = options.weapon ?? heroClass.weapons[0] ?? fail("Class without a weapon");
  if (!heroClass.weapons.includes(weaponId)) {
    fail(`"${weaponId}" is not a start weapon of the ${heroClass.name}`);
  }
  const seed = options.seed >>> 0;
  const rng = new Rng(mixSeed(seed, 0xfffff));
  const offHand = heroClass.offHand
    ? rollItem(data.items, { baseId: heroClass.offHand, itemLevel: 1, rarity: "normal" }, rng)
    : undefined;
  const floor = heroClass.startingAttributes;
  const free = options.attributes ?? {};
  if (ATTRIBUTES.some((k) => (free[k] ?? 0) < 0)) fail("Points must be positive");
  const attributes = addAttributes(floor, free);
  const problem = attributeProblem(attributes, {
    floor,
    current: floor,
    points: ATTRIBUTE_RULES.creationPoints,
    max: ATTRIBUTE_RULES.creationMax,
  });
  if (problem) fail(problem);
  return {
    version: SAVE_VERSION,
    seed,
    nonce: 0,
    hero: {
      name: options.name?.trim() || heroClass.name,
      classId: heroClass.id,
      level: 1,
      xp: 0,
      attributes,
      unspentAttributePoints: ATTRIBUTE_RULES.creationPoints - sumAttributes(free),
      unspentSkillPoints: PROGRESSION.startSkillPoints,
      learned: startingNodes(data.skillTree, heroClass.id),
      weaponId,
      mastery: EMPTY_MASTERY,
      equipment: offHand ? { offHand } : {},
      rotation: [null],
      plan: EMPTY_PLAN,
    },
    wallet: {
      acorns: 0,
      ash: 0,
      emberCoal: 0,
      phoenixFeathers: 0,
      runes: {},
    },
    inventory: [],
    stash: [],
    flaskCharges: PROGRESSION.flaskStartCharges,
    progress: {
      actsCleared: [],
      deathsInAct: 0,
      trainerUnlocked: false,
      rotationSlots: battlePlanUnlocks(0).rotationSlots,
      runesmithUnlocked: false,
      waymarks: [],
    },
    run: null,
    notice: null,
    stats: { fights: 0, wins: 0, deaths: 0, retreats: 0, bossKills: 0 },
    legacy: {
      prestige: 0,
      chronicle: [],
      runewords: [],
      runesFound: [],
      codex: EMPTY_CODEX,
      branches: [],
      trophies: [],
      echoes: {},
    },
    pendingPrestige: null,
    boons: EMPTY_BOONS,
  };
}

// --- reading the state -----------------------------------------------------------------------

export function getAct(data: GameData, actId: string): ActData {
  const act =
    data.acts.find((a) => a.id === actId) ?? (data.finale?.id === actId ? data.finale : undefined);
  if (!act) throw new GameActionError(`Unknown act "${actId}"`);
  return act;
}

export const stagesInAct = (act: ActData) => act.stages;

/** True for the act of The Last Ember. */
export const isFinaleAct = (data: GameData, actId: string) => data.finale?.id === actId;

/** The Last Ember opens with the final Prestige. */
export const finaleOpen = (state: GameState, data: GameData) =>
  data.finale !== undefined && state.legacy.prestige >= PROGRESSION.finalPrestige;

/** The Warden echoes of the finale in order: every act boss but the Harvester. */
export function finaleEchoes(data: GameData): readonly ActData[] {
  return [...data.acts]
    .filter((a) => a.boss.archetype !== "harvester")
    .sort((a, b) => a.number - b.number);
}

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

/**
 * The run's level band (prestige-acts-v1.md section 4): it starts at the previous harvest boss's
 * level, where the hero left off with all of its gear, and ends at the new harvest boss.
 */
export function levelBand(prestige: number): LevelBand {
  return { start: prestige === 0 ? 1 : bossLevel(prestige - 1), end: bossLevel(prestige) };
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
 * Waymarks of an act (level-v2.md section 7): a third, two thirds and the end of the act (Stages
 * 5, 10 and 15). The first win on each of them in a run gives a Skill Point.
 */
export function waymarkStages(act: ActData): readonly number[] {
  return [Math.round(act.stages / 3), Math.round((2 * act.stages) / 3), act.stages];
}

export const waymarkKey = (actId: string, stage: number) => `${actId}:${stage}`;

/**
 * Skill Points a hero has earned so far: the start, the Waymarks of every finished run (all
 * acts of a run fall before its Prestige), The Harvest of each Prestige and this run's Waymarks.
 */
export function earnedSkillPoints(state: GameState, data: GameData): number {
  let points = PROGRESSION.startSkillPoints;
  for (let p = 0; p < state.legacy.prestige; p++) {
    for (const act of actsInRun(data, p)) points += waymarkStages(act).length;
    points += PROGRESSION.harvestSkillPoints;
  }
  return points + state.progress.waymarks.length;
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
    rotationSlots: battlePlanUnlocks(prestige).rotationSlots,
    planUpgrade: BATTLE_PLAN_LADDER[prestige - 1]?.name ?? null,
    skillPoints: PROGRESSION.harvestSkillPoints,
    attributePoints: ATTRIBUTE_RULES.harvestPoints,
    keystones: keystoneLimit(prestige),
    levelCap: levelCap(prestige),
    acts: actsInRun(data, prestige).length,
    levelBand: levelBand(prestige),
  };
}

// --- Weapon Mastery --------------------------------------------------------------------------

/** The weapon type's base values (damage, speed, Innate) from the item catalog. */
export function weaponBase(data: GameData, weaponId: string): WeaponDefinition {
  return getBase(data.items, weaponId).weapon ?? fail(`"${weaponId}" is not a weapon`);
}

export function masteryTree(data: GameData, weaponId: string): WeaponMasteryTree {
  return data.weaponMastery[weaponId] ?? fail(`No Weapon Mastery for "${weaponId}"`);
}

/** The hero's Weapon Rank: it follows the level (one Mastery point per Rank), capped per run. */
export const heroWeaponRank = (state: GameState) =>
  weaponRank(state.hero.level, state.legacy.prestige);

/** The worn Echo and its stage, if any. */
export function wornEcho(
  state: GameState,
  data: GameData,
): { readonly def: EchoDefinition; readonly stage: number } | undefined {
  const id = state.hero.mastery.echo;
  const def = id ? data.echoes.find((e) => e.id === id) : undefined;
  const stage = id ? (state.legacy.echoes[id]?.stage ?? 0) : 0;
  return def && stage > 0 ? { def, stage } : undefined;
}

/** The hero's weapon as Weapon Mastery builds it (Rank, nodes, Forms, Keystone, Echo). */
export function heroWeapon(state: GameState, data: GameData): MasteryBuild {
  const { weaponId, mastery } = state.hero;
  const base = weaponBase(data, weaponId);
  return buildMasteryWeapon(
    base,
    masteryTree(data, weaponId),
    mastery,
    heroWeaponRank(state),
    data.startSkills[base.id],
    wornEcho(state, data),
    state.hero.level,
  );
}

/** The weapon's name: grade + Keystone form + "of" Echo ("Tempered Parrying Blade of ..."). */
export function heroWeaponName(state: GameState, data: GameData): string {
  const { weaponId, mastery } = state.hero;
  return weaponTitle(
    weaponBase(data, weaponId),
    masteryTree(data, weaponId),
    mastery,
    heroWeaponRank(state),
    wornEcho(state, data)?.def,
  );
}

/** Weapon Mastery points not spent yet. */
export function masteryPointsLeft(state: GameState, data: GameData): number {
  const tree = masteryTree(data, state.hero.weaponId);
  return pointsAvailable(tree, state.hero.mastery, heroWeaponRank(state));
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
  // The Innate after Innate Form and Attunement; tree ranks still count for the weapon's own.
  const own = data.startSkills[weapon.id];
  const start = heroWeapon(state, data).innate ?? own;
  const fromTree = treeSkills(data.skillTree, state.hero.learned);
  const result: KnownSkill[] = [];
  if (start) {
    const ranks =
      fromTree.find((t) => t.skill.id === start.id || t.skill.id === own?.id)?.ranks ?? 0;
    result.push({ skill: start, level: 1 + ranks, startSkill: true });
  }
  for (const { skill, ranks } of fromTree) {
    if (skill.id !== start?.id && skill.id !== own?.id) {
      result.push({ skill, level: ranks, startSkill: false });
    }
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

/** The character's class. */
export function heroClassOf(state: GameState, data: GameData): HeroClass {
  return getClass(data.classes, state.hero.classId);
}

/** The character's title: class name, then the main Prestige branch decides (klassen-v2.md). */
export function heroTitle(state: GameState, data: GameData): string {
  return classTitle(heroClassOf(state, data), state.legacy.branches, data.branchEpithets);
}

/** The hero's fight setup from the current state. */
export function heroSetup(
  state: GameState,
  data: GameData,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const { hero } = state;
  const boons = boonEffects(heroBoons(state, data));
  const trait = heroClassOf(state, data).trait;
  const mastery = heroWeapon(state, data);
  return buildHeroSetup(
    {
      level: hero.level,
      attributes: hero.attributes,
      boonAttributes: boons.attributes,
      equipment: hero.equipment,
      weapon: mastery.weapon,
      weaponRules: mastery.weaponRules,
      rotation: (weapon) => heroRotation(state, data, weapon),
      reactions: (weapon) => heroReactions(state, data, weapon),
      capstone: (weapon) => heroCapstone(state, data, weapon),
      openingMove: (weapon) => heroOpeningMove(state, data, weapon),
      bonuses: (weapon) =>
        sumBonuses(
          treeBonuses(data.skillTree, hero.learned, weapon.range),
          boons.bonuses,
          trait.bonuses,
          mastery.bonuses,
        ),
      triggers: (weapon) => [
        ...treeTriggers(data.skillTree, hero.learned, weapon.range),
        ...boons.triggers,
        ...mastery.triggers,
      ],
      rules: mergeRules(
        keystoneRules(data.skillTree, hero.learned),
        boons.rules,
        trait.rules,
        mastery.rules,
      ),
      ...(state.run ? { lifeFraction: state.run.lifeFraction } : {}),
    },
    data.items,
  );
}

/** The enemy of an encounter: the act's enemy or boss, or the Ember Thief. */
export function encounterEnemy(
  encounter: Encounter,
  act: ActData,
  data: GameData,
): EnemyDefinition {
  if (encounter.thief) return data.thief ?? fail("No Ember Thief in this game");
  if (encounter.echo) return findEnemy(getAct(data, encounter.echo), encounter.enemyId);
  return findEnemy(act, encounter.enemyId);
}

function findEnemy(act: ActData, id: string): EnemyDefinition {
  const enemy = act.boss.id === id ? act.boss : act.enemies.find((e) => e.id === id);
  if (!enemy) throw new GameActionError(`Unknown enemy "${id}" in ${act.id}`);
  return enemy;
}

/**
 * The abilities an act boss has in a run: one more per Prestige, from the second run after its
 * act opened (Playtest 2: the first boss of a run is where a hero who left off below the Level
 * Cap catches up, one ability more was a wall). The Harvester has none: its three phases already
 * grow with the run.
 */
export function bossAbilities(data: GameData, act: ActData, prestige: number): EliteModifier[] {
  const list = data.bossAbilities ?? [];
  if (act.boss.archetype === "harvester") return [];
  const count = Math.min(list.length, Math.max(0, prestige - act.number));
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
  const base = encounter.thief
    ? { ...created, fleeAfter: PROGRESSION.thiefFleeSeconds }
    : encounter.boss && enemy.archetype !== "harvester"
      ? { ...created, baseLife: (created.baseLife ?? 0) * PROGRESSION.bossLife }
      : created;
  const p = encounter.pressure;
  // The Harvester takes only part of the Run Pressure: it is already the run's peak.
  const share = enemy.archetype === "harvester" ? PROGRESSION.harvesterPressure : undefined;
  const scaled = (x: number, k: number | undefined) => (k === undefined ? x : 1 + (x - 1) * k);
  const setup = p
    ? {
        ...base,
        baseLife: (base.baseLife ?? 0) * scaled(p.life, share?.life),
        damageMultiplier: (base.damageMultiplier ?? 1) * scaled(p.damage, share?.damage),
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

/** Ash an item is worth. */
export function salvageValue(item: Item): number {
  return PROGRESSION.salvageAsh[item.rarity] * Math.max(1, item.tier);
}

/**
 * Equipment slot an item goes to. Rings fill the first free Ring slot unless the player picked
 * one (`preferred`, the other-Ring shortcut or drag & drop).
 */
export function targetSlot(
  item: Item,
  data: GameData,
  equipment: Equipment,
  preferred?: EquipmentSlot,
): EquipmentSlot | undefined {
  const itemSlot = getBase(data.items, item.baseId).slot;
  const slots = data.equipmentSlots.filter((s) => itemSlotFor(s) === itemSlot);
  if (preferred && slots.includes(preferred)) return preferred;
  return slots.find((s) => !equipment[s]) ?? slots[0];
}

/** Equipment slots an item fits (both Ring slots for a Ring). */
export function slotsFor(item: Item, data: GameData): EquipmentSlot[] {
  const itemSlot = getBase(data.items, item.baseId).slot;
  return data.equipmentSlots.filter((s) => itemSlotFor(s) === itemSlot);
}

export type EquipBlockReason = "fight" | "camp" | "level" | "requirements" | "noSlot" | "noRoom";

/**
 * Why an item cannot be equipped right now. The old item goes to the inventory and is never
 * destroyed, so equipping is blocked when it does not fit.
 */
export function equipBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
  from: "inventory" | "stash" | "pick",
  preferred?: EquipmentSlot,
): EquipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  if (from === "stash" && state.run) return "camp";
  if (preferred && !slotsFor(item, data).includes(preferred)) return "noSlot";
  const slot = targetSlot(item, data, state.hero.equipment, preferred);
  if (!slot) return "noSlot";
  if (state.hero.level < requiredLevel(item)) return "level";
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

export type UnequipBlockReason = "fight" | "noRoom" | "empty";

export function unequipBlockReason(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
): UnequipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  const item = state.hero.equipment[slot];
  if (!item) return "empty";
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

// --- actions ---------------------------------------------------------------------------------

export type GameAction =
  /** Leave the Camp and start an act at stage 1. */
  | { readonly type: "setOut"; readonly actId: string }
  /** The Last Ember: from the Camp into the finale's gauntlet. */
  | { readonly type: "enterFinale" }
  /** From the intermission into the next fight. */
  | { readonly type: "startStage" }
  /** Resolve the current fight (the UI calls this when its replay ends). */
  | { readonly type: "resolveFight" }
  /** Back to Camp mid-act (works like a death, but costs no Pity). */
  | { readonly type: "retreat" }
  | {
      readonly type: "pickItem";
      readonly index: number;
      readonly mode: "equip" | "take";
      /** Equip into this slot (the other Ring). */
      readonly slot?: EquipmentSlot;
    }
  | { readonly type: "salvageAll" }
  | { readonly type: "pickBoon"; readonly index: number }
  /** After the rewards: on to the next stage (or back to Camp after the boss). */
  | { readonly type: "continue" }
  | { readonly type: "useFlask" }
  | { readonly type: "allocateAttributes"; readonly points: Partial<Attributes> }
  /** From inventory or (Camp) stash; `slot` picks the Ring slot or a drop target. */
  | { readonly type: "equip"; readonly itemId: string; readonly slot?: EquipmentSlot }
  /** Back into the inventory, at `at` when dropped on a cell. */
  | { readonly type: "unequip"; readonly slot: EquipmentSlot; readonly at?: GridPosition }
  /** Thoric (Camp only): salvage an inventory item; its trigger parts go into the Codex. */
  | { readonly type: "salvage"; readonly itemId: string }
  /** Throw an inventory item away. Gives nothing. */
  | { readonly type: "discard"; readonly itemId: string }
  /** Drag & drop inside the inventory or the stash. */
  | { readonly type: "placeItem"; readonly itemId: string; readonly at: GridPosition }
  | { readonly type: "learnNodes"; readonly nodeIds: readonly string[] }
  /** Kaelen: forget all Skill Tree nodes for Acorns (points and Ember come back). */
  | { readonly type: "respecTree" }
  /** Kaelen: forget one rank of one node for a few Acorns (`forgetAcorns`). */
  | { readonly type: "forgetNode"; readonly nodeId: string }
  /** Kaelen, Weapon Mastery: learn a node or pick it in its group (Heat Form, Keystone ...). */
  | { readonly type: "learnMastery"; readonly nodeId: string }
  /** Kaelen: forget the Weapon Mastery for Acorns. The worn Echo stays. */
  | { readonly type: "respecMastery" }
  /** Kaelen: wear an earned Echo on the weapon (or none). */
  | { readonly type: "setEcho"; readonly echoId: string | null }
  /** Supply Wagon (Camp only): move an item between inventory and stash. */
  | {
      readonly type: "moveItem";
      readonly itemId: string;
      readonly to: "inventory" | "stash";
      readonly at?: GridPosition;
    }
  | { readonly type: "sortStash" }
  /** Thoric and Liora (Camp only). */
  | { readonly type: "craft"; readonly request: CraftRequest }
  | { readonly type: "setRotationSkill"; readonly slot: number; readonly skillId: string | null }
  /** Kaelen: Thresholds, Modifiers, Conditions, Reaction Slots, Capstone. */
  | { readonly type: "setBattlePlan"; readonly plan: BattlePlanState }
  /** After the final boss: start the next generation. All items stay. */
  | {
      readonly type: "prestige";
      /** Prestige branch to unlock; required while branches are left. */
      readonly branchId?: string;
      /**
       * The Harvest (attribute-v1.md): the own attributes afterwards, with the new points spent.
       * Left out, the new points wait as unspent points.
       */
      readonly attributes?: Attributes;
    }
  /** Kaelen (Camp only): every Attribute Point anew, for Acorns like the trees. */
  | { readonly type: "respecAttributes"; readonly attributes: Attributes }
  | { readonly type: "dismissNotice" };

/** Applies one action. Throws `GameActionError` if the action is not allowed right now. */
export function applyAction(state: GameState, data: GameData, action: GameAction): GameState {
  switch (action.type) {
    case "setOut":
      return setOut(state, data, action.actId);
    case "enterFinale":
      return enterFinale(state, data);
    case "startStage":
      return startStage(state, data);
    case "resolveFight":
      return resolveFight(state, data);
    case "retreat":
      return retreat(state, data);
    case "pickItem":
      return pickItem(state, data, action.index, action.mode, action.slot);
    case "salvageAll":
      return salvageAll(state);
    case "pickBoon":
      return pickBoon(state, action.index);
    case "continue":
      return continueRun(state, data);
    case "useFlask":
      return useFlask(state, data);
    case "allocateAttributes":
      return allocateAttributes(state, action.points);
    case "equip":
      return equipFromInventory(state, data, action.itemId, action.slot);
    case "unequip":
      return unequip(state, data, action.slot, action.at);
    case "salvage":
      return salvage(state, data, action.itemId);
    case "discard":
      return discard(state, action.itemId);
    case "placeItem":
      return placeItem(state, data, action.itemId, action.at);
    case "learnNodes":
      return learn(state, data, action.nodeIds);
    case "respecTree":
      return respecTree(state, data);
    case "forgetNode":
      return forgetNode(state, data, action.nodeId);
    case "learnMastery":
      return learnMasteryNode(state, data, action.nodeId);
    case "respecMastery":
      return respecMastery(state, data);
    case "setEcho":
      return setEcho(state, data, action.echoId);
    case "moveItem":
      return moveItem(state, data, action.itemId, action.to, action.at);
    case "sortStash":
      return sortStash(state, data);
    case "craft":
      return craft(state, data, action.request);
    case "setRotationSkill":
      return setRotationSkill(state, data, action.slot, action.skillId);
    case "setBattlePlan":
      return setBattlePlan(state, data, action.plan);
    case "prestige":
      return doPrestige(state, data, action.branchId, action.attributes);
    case "respecAttributes":
      return respecAttributes(state, data, action.attributes);
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
  const act = getAct(data, actId);
  if (!actUnlocked(state, data, actId)) fail("The road there is still closed");
  // The Scout hands out a bounty for this trip.
  const [rng, next] = nextRng(state);
  const bounty = data.bounties?.length
    ? rollBounty(
        data.bounties,
        act.number,
        act.enemies.map((e) => e.id),
        rng,
      )
    : undefined;
  return {
    ...(bounty ? next : state),
    notice: null,
    // The Flask leaves the Camp full, as much as the worn Belt allows.
    flaskCharges: flaskCapacity(state, data),
    run: {
      actId,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
      ...(bounty ? { bounty } : {}),
    },
  };
}

/** The definition of a bounty by id. */
export function getBounty(data: GameData, id: string): BountyDefinition {
  return data.bounties?.find((b) => b.id === id) ?? fail(`Unknown bounty "${id}"`);
}

function enterFinale(state: GameState, data: GameData): GameState {
  requireCamp(state);
  if (!finaleOpen(state, data) || !data.finale) return fail("The last flame is not in reach yet");
  return {
    ...state,
    notice: null,
    boons: EMPTY_BOONS,
    flaskCharges: flaskCapacity(state, data),
    legacy: { ...state.legacy, finaleAttempts: (state.legacy.finaleAttempts ?? 0) + 1 },
    run: {
      actId: data.finale.id,
      stage: 1,
      lifeFraction: 1,
      phase: "intermission",
      encounter: null,
      rewards: null,
    },
  };
}

/** The finale's foe at a stage: a Warden echo (one boss ability more per stage), then the Core. */
function finaleEncounter(data: GameData, stage: number, rng: Rng): Encounter {
  const finale = data.finale ?? fail("No finale in this game");
  const last = harvestAct(data, PROGRESSION.finalPrestige - 1);
  const level = stageMonsterLevel(data, last, last.stages, PROGRESSION.finalPrestige - 1);
  const pressure = PROGRESSION.finale;
  const echo = finaleEchoes(data)[stage - 1];
  const seed = rng.int(0, 0x7fffffff);
  if (!echo || stage >= finale.stages) {
    return { enemyId: finale.boss.id, level, boss: true, eliteModifiers: [], pressure, seed };
  }
  return {
    enemyId: echo.boss.id,
    level,
    boss: true,
    eliteModifiers: bossAbilities(data, echo, PROGRESSION.finalPrestige)
      .slice(0, Math.min(stage, PROGRESSION.finaleEchoAbilities))
      .map((m) => m.id),
    pressure,
    seed,
    echo: echo.id,
  };
}

function startStage(state: GameState, data: GameData): GameState {
  const run = requireRun(state, "intermission");
  const act = getAct(data, run.actId);
  const [rng, next] = nextRng(state);
  if (isFinaleAct(data, act.id)) {
    const encounter = finaleEncounter(data, run.stage, rng);
    return { ...next, run: { ...run, phase: "fight", encounter } };
  }
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
    // An open "catch the Ember Thief" bounty: the Scout saw it nearby.
    const hunted =
      run.bounty?.status === "open" && getBounty(data, run.bounty.id).goal.kind === "thief";
    const thief =
      data.thief !== undefined &&
      act.number >= PROGRESSION.thiefFromAct &&
      rng.chance(PROGRESSION.thiefChance * (hunted ? PROGRESSION.bounty.thiefBoost : 1));
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

/** Back to the Camp: flask refilled, life full, act progress and the trip's bounty gone. */
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
    flaskCharges: flaskCapacity(state, data),
    progress: {
      ...state.progress,
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
  if (isFinaleAct(data, run.actId))
    return resolveFinaleFight(state, data, result, stats, enemyName);

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
  const waymark =
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
  );
  const runes = rollRuneDrops(data, rank, act.number + state.legacy.prestige, rng);
  const found = items.flatMap((it) => (it.uniqueId ? [it.uniqueId] : []));
  const newTrophies = [...new Set(found)].filter((id) => !state.legacy.trophies.includes(id));
  // Ember Shrine (Spielspaß Teil 1): after Stage 5 and 10 and Elites of an act this run has not
  // cleared yet. Bosses have none: their moment belongs to the Hoard and the Echo.
  const shrine =
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

  // The Scout's bounty: a win may finish it; then it pays out at once.
  const lifeFraction = result.final.hero.life / result.final.hero.maxLife;
  const bounty = run.bounty
    ? bountyAfterWin(run.bounty, getBounty(data, run.bounty.id).goal, {
        rank,
        enemyId: encounter.enemyId,
        thiefCaught: caught,
        lifeFraction,
      })
    : undefined;
  const paid =
    bounty?.status === "done" && run.bounty?.status === "open"
      ? bountyReward(state, data, act, bounty, rng)
      : undefined;

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
        report: fightReport(result.events),
        items,
        ...(rank === "boss" ? { picks: PROGRESSION.bossHoardPicks } : {}),
        ...(caught ? { picks: PROGRESSION.thiefPicks, thief: "caught" as const } : {}),
        ...(escaped ? { thief: "escaped" as const } : {}),
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
        ...(newTrophies.length ? { newTrophies } : {}),
        ...(echo ? { echo } : {}),
        itemPick: null,
        salvagedAsh: 0,
      },
    },
  };
  return paid ? payBounty(won, data, paid) : won;
}

/**
 * What a done bounty pays: Acorns worth `bounty.acornKills` normal kills at the act boss's level,
 * Ember Coal and one item of at least Rare (inside the run's Elite window).
 */
function bountyReward(
  state: GameState,
  data: GameData,
  act: ActData,
  bounty: BountyState,
  rng: Rng,
): Omit<BountyReward, "to"> {
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
    id: bounty.id,
    ...(bounty.enemyId ? { enemyId: bounty.enemyId } : {}),
    acorns: autoRewards(level, "normal").acorns * PROGRESSION.bounty.acornKills,
    emberCoal: PROGRESSION.bounty.emberCoal,
    item,
  };
}

/** Pays a bounty into the state: the Scout brings the item to the Supply Wagon. */
function payBounty(state: GameState, data: GameData, reward: Omit<BountyReward, "to">): GameState {
  const run = state.run ?? fail("Not in a run");
  const rewards = run.rewards ?? fail("No rewards");
  const wallet = {
    ...state.wallet,
    acorns: state.wallet.acorns + reward.acorns,
    emberCoal: state.wallet.emberCoal + reward.emberCoal,
  };
  const stash = addToGrid(state.stash, reward.item, data.items, STASH_SIZE);
  const inventory = stash ? null : addToGrid(state.inventory, reward.item, data.items);
  const to: BountyReward["to"] = stash ? "stash" : inventory ? "inventory" : "salvaged";
  return {
    ...state,
    ...(stash ? { stash } : {}),
    ...(inventory ? { inventory } : {}),
    wallet: to === "salvaged" ? { ...wallet, ash: wallet.ash + salvageValue(reward.item) } : wallet,
    run: { ...run, rewards: { ...rewards, bounty: { ...reward, to } } },
  };
}

/**
 * A fight of The Last Ember: no loot, no XP. A win offers Stolen Fire from every family (Fusions
 * likelier); the last win brings the flame home. A death ends the attempt.
 */
function resolveFinaleFight(
  state: GameState,
  data: GameData,
  result: FightResult,
  stats: GameStats,
  enemyName: string,
): GameState {
  const run = requireRun(state, "fight");
  const finale = getAct(data, run.actId);
  if (result.winner !== "hero") {
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
      lifeFraction: result.final.hero.life / result.final.hero.maxLife,
      rewards: {
        rank: "boss",
        xp: 0,
        acorns: 0,
        ash: 0,
        emberCoal: 0,
        phoenixFeathers: 0,
        runes: [],
        levelsGained: 0,
        report: fightReport(result.events),
        items: [],
        itemPick: { kind: "salvageAll" },
        salvagedAsh: 0,
        ...(boonOffer.length ? { boonOffer, boonPick: null } : {}),
      },
    },
  };
}

/** What a run can drop (`PROGRESSION.lootGates`), by Prestige level. */
export function lootGate(prestige: number): LootGate {
  const gates = PROGRESSION.lootGates;
  return gates[Math.min(prestige, gates.length - 1)] ?? fail("No loot gates");
}

/**
 * Rarity weights of the item pick. The run's loot gate sets a window per enemy rank, and Pity
 * raises the two highest allowed rarities.
 */
export function itemPickWeights(
  rank: EnemyRank,
  deathsInAct: number,
  prestige: number,
): Readonly<Record<Rarity, number>> {
  const idx = (r: Rarity) => RARITIES.indexOf(r);
  const window = lootGate(prestige)[rank];
  const pity = 1 + PROGRESSION.pityPerDeath * Math.min(deathsInAct, PROGRESSION.pityMaxDeaths);
  const weights = { ...PROGRESSION.rarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) {
    if (idx(r) < idx(window.floor) || idx(r) > idx(window.max)) weights[r] = 0;
  }
  if (window.topWeight !== undefined && idx(window.max) > idx(window.floor)) {
    weights[window.max] *= window.topWeight;
  }
  // Pity lifts the top two allowed rarities that can drop at all.
  const allowed = RARITIES.filter((r) => weights[r] > 0);
  for (const r of allowed.slice(-2)) {
    if (idx(r) > idx(window.floor) || allowed.length === 1) weights[r] *= pity;
  }
  // Make sure the floor always leaves something to roll.
  if (RARITIES.every((r) => weights[r] === 0)) weights[window.floor] = 1;
  return weights;
}

function rollItemChoices(
  data: GameData,
  actId: string,
  encounter: Encounter,
  rank: EnemyRank,
  deathsInAct: number,
  prestige: number,
  rng: Rng,
  affixFactor?: (affix: AffixDefinition) => number,
): Item[] {
  const count =
    rank === "boss"
      ? PROGRESSION.bossHoardCards
      : encounter.thief
        ? PROGRESSION.thiefCards
        : PROGRESSION.itemChoices;
  // A caught Ember Thief always drops one card that is at least Rare.
  const rareCard = encounter.thief ? rng.int(0, count - 1) : -1;
  const gate = lootGate(prestige);
  const weights = itemPickWeights(rank, deathsInAct, prestige);
  // The run's window may promise one card of at least a rarity (the boss of run 1: a Rare).
  const sure = gate[rank].sure;
  const sureCard = sure ? rng.int(0, count - 1) : -1;
  const bySlot = new Map<ItemSlot, string[]>();
  for (const baseId of data.lootBases) {
    const slot = getBase(data.items, baseId).slot;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), baseId]);
  }
  const slots = [...bySlot.keys()];
  const items: Item[] = [];
  // Bosses (sometimes Elites) may turn one card Legendary, or even Unique.
  const legendaryCard = rng.chance(gate.legendary[rank]) ? rng.int(0, count - 1) : -1;
  // A boss may drop one of its own trophies (Teil 3 "Boss-Trophäen").
  const trophies =
    rank === "boss" && encounter.boss && gate.trophies
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
    const baseId = bases[rng.int(0, bases.length - 1)];
    if (!baseId) break;
    const rolled = i === legendaryCard ? "legendary" : rollRarity(rng, weights);
    const atLeast = (r: Rarity, min: Rarity) =>
      RARITIES.indexOf(r) < RARITIES.indexOf(min) ? min : r;
    let rarity = i === rareCard ? atLeast(rolled, "rare") : rolled;
    if (sure && i === sureCard) rarity = atLeast(rarity, sure);
    items.push(
      rollItem(
        data.items,
        {
          baseId,
          itemLevel: encounter.level,
          rarity,
          ...(affixFactor ? { affixFactor } : {}),
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
  preferred?: EquipmentSlot,
): GameState {
  const slot =
    targetSlot(item, data, state.hero.equipment, preferred) ?? fail("No slot for this item");
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
  slot?: EquipmentSlot,
): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  const taken = rewards.taken ?? [];
  if (taken.some((t) => t.index === index)) return fail("Item already taken");
  const item = rewards.items[index] ?? fail("No such item");
  let next: GameState;
  if (mode === "equip") {
    const reason = equipBlockReason(state, data, item, "pick", slot);
    if (reason) return fail(`Cannot equip: ${reason}`);
    next = equipItem(state, data, item, state.inventory, slot);
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
    wallet: { ...state.wallet, ash: state.wallet.ash + salvaged },
    run: { ...run, rewards: { ...rewards, itemPick: pick, salvagedAsh: salvaged } },
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

/** True once the item pick (and the Boon, if a Shrine came up) is done. */
export function rewardsDone(rewards: Rewards): boolean {
  return rewards.itemPick !== null && (!rewards.boonOffer?.length || rewards.boonPick != null);
}

function continueRun(state: GameState, data: GameData): GameState {
  const { run, rewards } = requireRewards(state);
  if (!rewardsDone(rewards)) return fail("Pick your rewards first");
  const encounter = run.encounter ?? fail("No encounter");
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

function useFlask(state: GameState, data: GameData): GameState {
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

/** Charges the Ember Flask holds: its start charges plus the worn Belt's "Flask Charges". */
export function flaskCapacity(state: GameState, data: GameData): number {
  const belt = state.hero.equipment.belt;
  return PROGRESSION.flaskStartCharges + (belt ? itemFlaskCharges(belt, data.items) : 0);
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
    if (n > 0 && attributes[a] > ATTRIBUTE_RULES.max) {
      return fail(`At most ${ATTRIBUTE_RULES.max} points`);
    }
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
function equipFromInventory(
  state: GameState,
  data: GameData,
  itemId: string,
  preferred?: EquipmentSlot,
): GameState {
  const fromStash = state.stash.find((p) => p.item.id === itemId);
  const placed = fromStash ?? findInInventory(state, itemId);
  const from = fromStash ? "stash" : "inventory";
  const reason = equipBlockReason(state, data, placed.item, from, preferred);
  if (reason) return fail(`Cannot equip: ${reason}`);
  const slot =
    targetSlot(placed.item, data, state.hero.equipment, preferred) ?? fail("No slot for this item");
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

export type MoveBlockReason = "camp" | "noRoom";

/** Why an item cannot move between inventory and stash right now. */
export function moveBlockReason(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
): MoveBlockReason | undefined {
  if (state.run) return "camp";
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
  at?: GridPosition,
): GameState {
  requireCamp(state);
  const source = to === "stash" ? state.inventory : state.stash;
  const placed =
    source.find((p) => p.item.id === itemId) ??
    fail(`Item not in the ${to === "stash" ? "inventory" : "stash"}`);
  const target = to === "stash" ? state.stash : state.inventory;
  const size = to === "stash" ? STASH_SIZE : INVENTORY_SIZE;
  const moved =
    (at
      ? placeAt(target, placed.item, at.x, at.y, data.items, size)
      : addToGrid(target, placed.item, data.items, size)) ?? fail("No room");
  const rest = source.filter((p) => p !== placed);
  return to === "stash"
    ? { ...state, inventory: rest, stash: moved }
    : { ...state, inventory: moved, stash: rest };
}

function sortStash(state: GameState, data: GameData): GameState {
  requireCamp(state);
  return { ...state, stash: packGrid(state.stash, data.items, STASH_SIZE) };
}

function unequip(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
  at?: GridPosition,
): GameState {
  const reason = unequipBlockReason(state, data, slot);
  if (reason) return fail(`Cannot unequip: ${reason}`);
  const item = state.hero.equipment[slot] ?? fail("Slot is empty");
  const inventory =
    (at
      ? placeAt(state.inventory, item, at.x, at.y, data.items)
      : addToGrid(state.inventory, item, data.items)) ?? fail("No room");
  const equipment: Equipment = Object.fromEntries(
    Object.entries(state.hero.equipment).filter(([s]) => s !== slot),
  );
  return { ...state, inventory, hero: { ...state.hero, equipment } };
}

/** Salvage is Thoric's work, so only in the Camp (Timo, after Playtest 2). */
function salvage(state: GameState, data: GameData, itemId: string): GameState {
  requireCamp(state);
  const placed = findInInventory(state, itemId);
  const { codex } = learnFromItem(state.legacy.codex, placed.item, data.items);
  return {
    ...state,
    inventory: state.inventory.filter((p) => p !== placed),
    wallet: { ...state.wallet, ash: state.wallet.ash + salvageValue(placed.item) },
    legacy: codex === state.legacy.codex ? state.legacy : { ...state.legacy, codex },
  };
}

/** Throws an inventory item away for nothing (to make room on the road). */
function discard(state: GameState, itemId: string): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const placed = findInInventory(state, itemId);
  return { ...state, inventory: state.inventory.filter((p) => p !== placed) };
}

/** Drag & drop inside a grid: the item moves to `at` if it fits there. */
function placeItem(state: GameState, data: GameData, itemId: string, at: GridPosition): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const inStash = state.stash.some((p) => p.item.id === itemId);
  if (inStash) {
    requireCamp(state);
    const placed = state.stash.find((p) => p.item.id === itemId) ?? fail("No such item");
    const stash = placeAt(state.stash, placed.item, at.x, at.y, data.items, STASH_SIZE);
    return stash ? { ...state, stash } : fail("No room there");
  }
  const placed = findInInventory(state, itemId);
  const inventory = placeAt(state.inventory, placed.item, at.x, at.y, data.items);
  return inventory ? { ...state, inventory } : fail("No room there");
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
      learnBudget(
        data.skillTree,
        state.hero.learned,
        state.hero.unspentSkillPoints,
        state.legacy.prestige,
      ),
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
  };
}

/**
 * Skill Points spent in the tree. The start node is free: the tree's shared one, or the class's
 * own (`classId`).
 */
export function spentInTree(data: GameData, learned: LearnedNodes, classId?: string): number {
  let skillPoints = 0;
  const own = classId ? data.skillTree.classStarts?.[classId] : undefined;
  for (const node of data.skillTree.nodes) {
    if (node.id === data.skillTree.startNodeId || node.id === own) continue;
    skillPoints += (learned[node.id] ?? 0) * learnCost(node).skillPoints;
  }
  return skillPoints;
}

/**
 * Acorns for a full Skill Tree respec at Kaelen (level-v2.md section 7): moderate, about the Acorns of
 * a few normal kills at the run's boss level, so it grows with every run.
 */
export function respecAcorns(prestige: number): number {
  return autoRewards(bossLevel(prestige), "normal").acorns * PROGRESSION.respecKills;
}

/** Acorns to forget one rank of one node. */
export function forgetAcorns(prestige: number): number {
  return Math.max(1, Math.round(respecAcorns(prestige) * PROGRESSION.respecNodeShare));
}

function respecTree(state: GameState, data: GameData): GameState {
  requireTrainer(state);
  const spent = spentInTree(data, state.hero.learned, state.hero.classId);
  if (spent === 0) return fail("Nothing to respec");
  const price = respecAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  return {
    ...state,
    hero: {
      ...state.hero,
      learned: startingNodes(data.skillTree, state.hero.classId),
      unspentSkillPoints: state.hero.unspentSkillPoints + spent,
      // Tree skills are gone, so the Battle Plan falls back to the Start Skill.
      rotation: state.hero.rotation.map(() => null),
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}

/** Kaelen: forget one rank of one node for a few Acorns (its points come back). */
function forgetNode(state: GameState, data: GameData, nodeId: string): GameState {
  requireTrainer(state);
  const tree = data.skillTree;
  const node = getNode(tree, nodeId);
  const start = tree.classStarts?.[state.hero.classId];
  const reason = forgetBlockReason(tree, state.hero.learned, nodeId, start);
  if (reason) return fail(`Cannot forget "${nodeId}": ${reason}`);
  const price = forgetAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  const ranks = (state.hero.learned[nodeId] ?? 0) - 1;
  const learned = Object.fromEntries(
    Object.entries(state.hero.learned).filter(([id]) => id !== nodeId),
  );
  return {
    ...state,
    hero: {
      ...state.hero,
      learned: ranks > 0 ? { ...learned, [nodeId]: ranks } : learned,
      unspentSkillPoints: state.hero.unspentSkillPoints + learnCost(node).skillPoints,
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}

function learnMasteryNode(state: GameState, data: GameData, nodeId: string): GameState {
  requireTrainer(state);
  const tree = masteryTree(data, state.hero.weaponId);
  let mastery: MasteryState;
  try {
    mastery = learnMastery(tree, state.hero.mastery, nodeId, heroWeaponRank(state));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  return { ...state, hero: { ...state.hero, mastery } };
}

function respecMastery(state: GameState, data: GameData): GameState {
  requireTrainer(state);
  const { mastery } = state.hero;
  const tree = masteryTree(data, state.hero.weaponId);
  if (pointsSpent(tree, mastery) === 0 && Object.keys(mastery.choices).length === 0) {
    return fail("Nothing to respec");
  }
  if (state.wallet.acorns < MASTERY.respecAcorns) return fail("Not enough Acorns");
  return {
    ...state,
    hero: {
      ...state.hero,
      mastery: {
        ...EMPTY_MASTERY,
        echo: mastery.echo,
        ...(mastery.bonusPoints ? { bonusPoints: mastery.bonusPoints } : {}),
      },
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - MASTERY.respecAcorns },
  };
}

function setEcho(state: GameState, data: GameData, echoId: string | null): GameState {
  requireTrainer(state);
  if (echoId !== null) {
    if (!data.echoes.some((e) => e.id === echoId)) return fail(`Unknown Echo "${echoId}"`);
    if (!(state.legacy.echoes[echoId]?.stage ?? 0)) return fail("This Echo is not earned yet");
  }
  return { ...state, hero: { ...state.hero, mastery: { ...state.hero.mastery, echo: echoId } } };
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

/** Checks a Battle Plan against the unlocks; changing a chosen Capstone costs Acorns. */
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
  let acorns = state.wallet.acorns;
  if (capstone) {
    if (!unlocks.capstone) return fail("Capstone locked");
    if (!CAPSTONES.some((c) => c.id === capstone.id)) return fail("Unknown Capstone");
    if (!Number.isInteger(capstone.slot) || capstone.slot < 0 || capstone.slot >= slots) {
      return fail("No such Rotation Slot");
    }
    const old = state.hero.plan.capstone;
    if (old && old.id !== capstone.id) {
      if (acorns < PROGRESSION.capstoneChangeAcorns) return fail("Not enough Acorns");
      acorns -= PROGRESSION.capstoneChangeAcorns;
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
    wallet: { ...state.wallet, acorns },
  };
}

function validThreshold(t: number): boolean {
  return Number.isFinite(t) && t >= 0 && t <= COMBAT.maxHeat;
}

// --- prestige --------------------------------------------------------------------------------

/**
 * Prestige branches the coming Prestige can pick (skilltree-v2.md): the class's branches
 * (klassen-v2.md), new ones and owned ones that can be deepened one tier, in the class's order.
 */
export function openBranches(state: GameState, data: GameData): PrestigeBranchDefinition[] {
  const all = data.skillTree.prestigeBranches ?? [];
  return heroClassOf(state, data)
    .branches.map((id) => all.find((b) => b.id === id))
    .filter((b): b is PrestigeBranchDefinition => b !== undefined)
    .filter((b) => branchTier(state.legacy.branches, b.id) < MAX_BRANCH_TIER);
}

/**
 * Prestige (Playtest 2): the world burns, the Heir's gear does not. Level, points, items, stash,
 * currencies, Skill Tree, Battle Plan and Ember all stay; act progress, the run and its Boons end.
 */
function doPrestige(
  state: GameState,
  data: GameData,
  branchId: string | undefined,
  attributes: Attributes | undefined,
): GameState {
  const pending = state.pendingPrestige ?? fail("No Prestige pending");
  const open = openBranches(state, data);
  if (branchId === undefined ? open.length > 0 : !open.some((b) => b.id === branchId)) {
    return fail("Choose an open Prestige branch");
  }
  const prestige = state.legacy.prestige + 1;
  const rewards = prestigeRewards(data, prestige);
  const chronicle = [
    ...state.legacy.chronicle,
    {
      generation: prestige,
      title: heroTitle(state, data),
      level: state.hero.level,
      deaths: state.stats.deaths - state.legacy.chronicle.reduce((n, c) => n + c.deaths, 0),
      enemyName: pending.enemyName,
    },
  ];
  const notice: Notice = {
    kind: "prestige",
    actId: pending.actId,
    stage: pending.stage,
    enemyName: pending.enemyName,
  };
  const final = prestige >= PROGRESSION.finalPrestige;
  // The Harvest: new points to spend now or later.
  const { hero } = state;
  const points = hero.unspentAttributePoints + rewards.attributePoints;
  const next = attributes ?? hero.attributes;
  const problem = attributeProblem(next, {
    floor: heroClassOf(state, data).startingAttributes,
    current: hero.attributes,
    points,
  });
  if (problem) fail(problem);
  return {
    ...state,
    hero: {
      ...hero,
      attributes: next,
      unspentAttributePoints: points - (sumAttributes(next) - sumAttributes(hero.attributes)),
      unspentSkillPoints: hero.unspentSkillPoints + rewards.skillPoints,
    },
    flaskCharges: flaskCapacity(state, data),
    // The final Prestige (prestige-counting) keeps the cleared world for The Last Ember.
    progress: final
      ? {
          ...state.progress,
          rotationSlots: Math.max(state.progress.rotationSlots, rewards.rotationSlots),
        }
      : {
          ...state.progress,
          actsCleared: [],
          deathsInAct: 0,
          trainerUnlocked: true,
          rotationSlots: Math.max(state.progress.rotationSlots, rewards.rotationSlots),
          waymarks: [],
        },
    run: null,
    legacy: {
      ...state.legacy,
      prestige,
      branches: branchId ? [...state.legacy.branches, branchId] : state.legacy.branches,
      chronicle,
    },
    pendingPrestige: null,
    // The Boons burn with the rest of the run.
    boons: EMPTY_BOONS,
    notice,
  };
}

/**
 * Acorns for setting all Attribute Points anew at Kaelen: the same as a full Skill Tree respec, so
 * every respec follows one rule (entschlackung-v1.md).
 */
export const attributeRespecAcorns = (prestige: number) => respecAcorns(prestige);

/**
 * Attribute respec at Kaelen: every point above the Class Array comes back and is set anew,
 * for Acorns.
 */
function respecAttributes(state: GameState, data: GameData, attributes: Attributes): GameState {
  requireTrainer(state);
  const price = attributeRespecAcorns(state.legacy.prestige);
  if (state.wallet.acorns < price) fail("Not enough Acorns");
  const floor = heroClassOf(state, data).startingAttributes;
  const { hero } = state;
  const points =
    sumAttributes(hero.attributes) - sumAttributes(floor) + hero.unspentAttributePoints;
  const problem = attributeProblem(attributes, { floor, current: floor, points });
  if (problem) fail(problem);
  return {
    ...state,
    hero: {
      ...hero,
      attributes,
      unspentAttributePoints: points - (sumAttributes(attributes) - sumAttributes(floor)),
    },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}

// --- save games ------------------------------------------------------------------------------

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Reads a save game. Throws if it is broken or from an incompatible version. `data` lets older
 * saves refund points when a rule change took levels away (v7 → v8).
 */
export function deserializeGame(json: string, data?: GameData): GameState {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) throw new Error("Save game is not an object");
  let state = parsed as Partial<GameState>;
  if (state.version === 1) state = migrateV1(state);
  if (state.version === 2) state = migrateV2(state);
  if (state.version === 3) state = migrateV3(state);
  if (state.version === 4) state = migrateV4(state);
  if (state.version === 5) state = migrateV5(state);
  if (state.version === 6) state = migrateV6(state);
  if (state.version === 7) state = migrateV7(state, data);
  if (state.version === 8) state = migrateV8(state, data);
  if (state.version === 9) state = migrateV9(state, data);
  if (state.version === 10) state = migrateV10(state, data);
  if (state.version === 11) state = migrateV11(state, data);
  if (state.version === 12) state = migrateV12(state, data);
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

/**
 * Currency names before v13 (entschlackung-v1.md): Gold, Salvage Dust, Reforge Stones and
 * Ascension Shards became Acorns, Ash, Ember Coal and Phoenix Feathers. Migrations before v13
 * work on the old names.
 */
interface OldCurrencies {
  readonly gold?: number;
  readonly dust?: number;
  readonly reforgeStones?: number;
  readonly ascensionShards?: number;
  readonly salvagedDust?: number;
}
const oldCurrencies = (value: object | null | undefined): OldCurrencies =>
  (value ?? {}) as OldCurrencies;

/** v1 (M3) → v2 (M4): Ascension Shards and the stash are new. */
function migrateV1(state: Partial<GameState>): Partial<GameState> {
  const rewards = state.run?.rewards;
  return {
    ...state,
    version: 2,
    stash: state.stash ?? [],
    ...(state.wallet
      ? { wallet: { ...state.wallet, ascensionShards: 0 } as object as Wallet }
      : {}),
    ...(state.run
      ? {
          run: {
            ...state.run,
            rewards: rewards ? ({ ...rewards, ascensionShards: 0 } as object as Rewards) : null,
          },
        }
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
      chronicle: [],
      runewords: [],
      runesFound: [],
      codex: EMPTY_CODEX,
      branches: [],
      trophies: [],
      echoes: {},
    },
    pendingPrestige: null,
  };
}

/** v3 (M5–M7) → v4 (M8): Runes, Runeword Codex, Nyssa and Marisha's stock are new. */
function migrateV3(state: Partial<GameState>): Partial<GameState> {
  const rewards = state.run?.rewards;
  return {
    ...state,
    version: 4,
    ...(state.wallet ? { wallet: { ...state.wallet, runes: {} } } : {}),
    ...(state.progress ? { progress: { ...state.progress, runesmithUnlocked: false } } : {}),
    ...(state.legacy ? { legacy: { ...state.legacy, runewords: [], runesFound: [] } } : {}),
    ...(state.run
      ? { run: { ...state.run, rewards: rewards ? { ...rewards, runes: [] } : null } }
      : {}),
  };
}

/** v4 (M8) → v5 (prestige rework): the Trigger Codex is new. */
function migrateV4(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 5,
    ...(state.legacy ? { legacy: { ...state.legacy, codex: EMPTY_CODEX } } : {}),
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

/**
 * v7 → v8 (Playtest 2): no more Seals, all items stay, and the Level Cap counts 5 levels per act
 * played. A hero above the new cap drops to it and gets every point back to spend again.
 */
function migrateV7(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const legacy = state.legacy;
  // Seals are gone, and so is Marisha's stock of Normal bases (she only gambles now).
  const rest: Partial<LegacyState> & { seals?: unknown } = { ...legacy };
  delete rest.seals;
  const kept: Partial<GameState> & { merchant?: unknown } = { ...state };
  delete kept.merchant;
  const migrated: Partial<GameState> = {
    ...kept,
    version: 8,
    ...(legacy
      ? {
          legacy: {
            ...(rest as LegacyState),
            chronicle: legacy.chronicle.map(
              ({ generation, level, deaths, enemyName }: ChronicleEntry): ChronicleEntry => ({
                generation,
                level,
                deaths,
                enemyName,
              }),
            ),
          },
        }
      : {}),
  };
  const hero = state.hero;
  const cap = OLD_LEVEL_CAPS[Math.min(legacy?.prestige ?? 0, OLD_LEVEL_CAPS.length - 1)] ?? 140;
  if (!hero || !data || hero.level <= cap) return migrated;
  return {
    ...migrated,
    hero: {
      ...hero,
      level: cap,
      xp: 0,
      attributes: data.startingAttributes,
      // v10 → v11 sets the attributes anew anyway.
      unspentAttributePoints: 0,
      learned: {},
      // One Skill Point per level back then.
      unspentSkillPoints: cap,
      rotation: hero.rotation.map(() => null),
    },
  };
}

/**
 * v8 → v9 (klassen-v2.md): every character has a class and a name. The class follows the weapon
 * in hand (Sword → Warrior, Fire Wand → Sorcerer); attributes stay as they are.
 */
function migrateV8(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const hero = state.hero as (Omit<HeroState, "name" | "classId"> & Partial<HeroState>) | undefined;
  if (!hero) return { ...state, version: 9 };
  const weapon = (hero.equipment as LegacyEquipment).mainHand?.baseId;
  const classes = data?.classes ?? [];
  const heroClass =
    classes.find((c) => weapon !== undefined && c.weapons.includes(weapon)) ?? classes[0];
  const classId = hero.classId ?? heroClass?.id ?? "warrior";
  return {
    ...state,
    version: 9,
    hero: { ...hero, classId, name: hero.name ?? heroClass?.name ?? "Heir" },
  };
}

/** Equipment of saves before v10, which still had a Main Hand. */
type LegacyEquipment = Equipment & { readonly mainHand?: Item };

/**
 * v9 → v10 (Weapon Mastery, waffe-als-system-v1.md): the weapon is the hero's own and never
 * drops. The hero keeps the weapon type in hand (or the class's first); weapon items turn into
 * Ash. Echoes are granted for the bosses beaten so far: one stage per run since the
 * act opened, so an older hero does not start from nothing.
 */
function migrateV9(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const hero = state.hero as
    (Omit<HeroState, "weaponId" | "mastery"> & Partial<HeroState>) | undefined;
  if (!hero) return { ...state, version: 10 };
  const isWeapon = (item: Item) =>
    data ? getBase(data.items, item.baseId).weapon !== undefined : item.baseId === "";
  const { mainHand, ...equipment } = hero.equipment as LegacyEquipment;
  const heroClass = data?.classes.find((c) => c.id === hero.classId);
  const weaponId =
    hero.weaponId ??
    (mainHand && (!heroClass || heroClass.weapons.includes(mainHand.baseId))
      ? mainHand.baseId
      : (heroClass?.weapons[0] ?? mainHand?.baseId ?? "sword"));
  let dust = mainHand ? salvageValue(mainHand) : 0;
  const keep = (grid: readonly PlacedItem[] | undefined) =>
    (grid ?? []).filter((p) => {
      if (!isWeapon(p.item)) return true;
      dust += salvageValue(p.item);
      return false;
    });
  const inventory = keep(state.inventory);
  const stash = keep(state.stash);
  const prestige = state.legacy?.prestige ?? 0;
  const cleared = state.progress?.actsCleared ?? [];
  const echoes: Record<string, { stage: number; prestige: number }> = {};
  for (const echo of data?.echoes ?? []) {
    const act = data?.acts.find((a) => a.id === echo.actId);
    if (!act) continue;
    // Runs since the act opened, each with a boss kill, plus this run's if it fell already.
    const stage = Math.min(
      MASTERY.maxEchoStage,
      Math.max(0, prestige - act.number + 1) + (cleared.includes(act.id) ? 1 : 0),
    );
    if (stage > 0) {
      echoes[echo.id] = { stage, prestige: cleared.includes(act.id) ? prestige : prestige - 1 };
    }
  }
  const run = state.run;
  const rewards = run?.rewards;
  let migratedRewards = rewards;
  if (rewards && data) {
    // Weapon cards in an open item pick: dropped, the taken ones re-counted.
    const index = new Map<number, number>();
    const items = rewards.items.filter((item, i) => {
      if (isWeapon(item)) return false;
      index.set(i, index.size);
      return true;
    });
    const taken = rewards.taken?.flatMap((t) => {
      const i = index.get(t.index);
      return i === undefined ? [] : [{ ...t, index: i }];
    });
    migratedRewards = {
      ...rewards,
      items,
      ...(taken ? { taken } : {}),
      ...(rewards.picks !== undefined ? { picks: Math.min(rewards.picks, items.length) } : {}),
    };
  }
  return {
    ...state,
    version: 10,
    hero: { ...hero, weaponId, mastery: hero.mastery ?? EMPTY_MASTERY, equipment },
    inventory,
    stash,
    ...(state.wallet
      ? {
          wallet: {
            ...state.wallet,
            dust: (oldCurrencies(state.wallet).dust ?? 0) + dust,
          } as object as Wallet,
        }
      : {}),
    ...(state.legacy ? { legacy: { ...state.legacy, echoes: state.legacy.echoes ?? echoes } } : {}),
    ...(run && migratedRewards ? { run: { ...run, rewards: migratedRewards } } : {}),
  };
}

/**
 * v10 → v11 (attribute-v1.md): attributes on the 1–10 scale. The hero goes back to the Class
 * Array and gets the creation's free points plus the Harvest's points of every Prestige so far to
 * spend again. Gear that no longer fits stays equipped but
 * inactive until the points are set.
 */
function migrateV10(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const prestige = state.legacy?.prestige ?? 0;
  const hero = state.hero;
  const floor =
    (hero && data?.classes.find((c) => c.id === hero.classId)?.startingAttributes) ??
    data?.startingAttributes;
  return {
    ...state,
    version: 11,
    ...(hero && floor
      ? {
          hero: {
            ...hero,
            attributes: floor,
            unspentAttributePoints:
              ATTRIBUTE_RULES.creationPoints + prestige * ATTRIBUTE_RULES.harvestPoints,
          },
        }
      : {}),
  };
}

/** Level Caps per run before the level rework (Playtest 2: 5 per act played). */
const OLD_LEVEL_CAPS = [5, 15, 30, 50, 75, 105, 140];

/** A level of the old scale (cap 140) on the new one (cap 100), through the runs' boss levels. */
function rescaleLevel(level: number): number {
  let prevOld = 1;
  let prevNew = 1;
  for (let run = 0; run < OLD_LEVEL_CAPS.length; run++) {
    const oldEnd = OLD_LEVEL_CAPS[run] ?? 140;
    const newEnd = bossLevel(run);
    if (level <= oldEnd) {
      return Math.round(prevNew + ((level - prevOld) * (newEnd - prevNew)) / (oldEnd - prevOld));
    }
    prevOld = oldEnd;
    prevNew = newEnd;
  }
  return prevNew;
}

/**
 * v11 → v12 (level-v2.md section 10): Max Level 100 and Skill Points from Waymarks. The level
 * moves to the new scale; the Skill Tree (a new web) starts over with every point the hero has
 * earned so far back; the Weapon Mastery is reset only if its Rank fell.
 */
function migrateV11(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const hero = state.hero;
  const progress = state.progress;
  const legacy = state.legacy;
  if (!hero || !progress || !legacy || !data) return { ...state, version: 12 };
  const prestige = legacy.prestige;
  const level = Math.min(levelCap(prestige), rescaleLevel(hero.level));
  // This run's Waymarks: every act it cleared, and the stages behind the hero in the current one.
  const waymarks: string[] = [];
  for (const act of data.acts) {
    const done = progress.actsCleared.includes(act.id)
      ? act.stages
      : state.run?.actId === act.id
        ? state.run.stage - 1
        : 0;
    for (const stage of waymarkStages(act))
      if (stage <= done) waymarks.push(waymarkKey(act.id, stage));
  }
  const migrated = {
    ...state,
    version: 12,
    progress: { ...progress, waymarks },
  } as GameState;
  const tree = data.weaponMastery[hero.weaponId];
  const rank = weaponRank(level, prestige);
  const keepMastery = !tree || pointsAvailable(tree, hero.mastery, rank) >= 0;
  return {
    ...migrated,
    hero: {
      ...hero,
      level,
      xp: 0,
      learned: startingNodes(data.skillTree, hero.classId),
      unspentSkillPoints: earnedSkillPoints(migrated, data),
      rotation: hero.rotation.map(() => null),
      mastery: keepMastery
        ? hero.mastery
        : {
            ...EMPTY_MASTERY,
            echo: hero.mastery.echo,
            ...(hero.mastery.bonusPoints ? { bonusPoints: hero.mastery.bonusPoints } : {}),
          },
    },
  };
}

/** Ash per Essence left over when Essences went away (v12 → v13). */
const ASH_PER_ESSENCE = 20;

/**
 * v12 → v13 (entschlackung-v1.md): no Spoils, Essences, Kindling, Harvester's Ember, Phoenix
 * Ash, Quarry or burned Supply Wagon any more. The currencies get their lore names (Gold, Dust,
 * Reforge Stones and Ascension Shards become Acorns, Ash, Ember Coal and Phoenix Feathers).
 * Essences turn into Ash and Kindling into Ember Coal (Kindle's new price). Keystones now cost
 * Skill Points, so the Skill Tree starts over with every point the hero has earned.
 */
function migrateV12(state: Partial<GameState>, data: GameData | undefined): Partial<GameState> {
  const old = (state.wallet ?? {}) as OldCurrencies & {
    readonly runes?: Wallet["runes"];
    readonly essences?: Readonly<Record<string, number>>;
    readonly kindling?: number;
  };
  const essences = Object.values(old.essences ?? {}).reduce((n, v) => n + v, 0);
  const strip = <T extends object>(obj: T | undefined, keys: readonly string[]) =>
    obj && (Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k))) as T);
  const wallet = state.wallet && {
    acorns: old.gold ?? 0,
    ash: (old.dust ?? 0) + essences * ASH_PER_ESSENCE,
    emberCoal: (old.reforgeStones ?? 0) + (old.kindling ?? 0),
    phoenixFeathers: old.ascensionShards ?? 0,
    runes: old.runes ?? {},
  };
  const oldRewards = state.run?.rewards;
  const was = oldCurrencies(oldRewards);
  const rewards = oldRewards
    ? ({
        ...strip(oldRewards, [
          "spoils",
          "spoilsPick",
          "gold",
          "dust",
          "reforgeStones",
          "ascensionShards",
          "salvagedDust",
        ]),
        acorns: was.gold ?? 0,
        ash: was.dust ?? 0,
        emberCoal: was.reforgeStones ?? 0,
        phoenixFeathers: was.ascensionShards ?? 0,
        salvagedAsh: was.salvagedDust ?? 0,
      } as Rewards)
    : undefined;
  const migrated = {
    ...state,
    version: 13,
    ...(wallet ? { wallet } : {}),
    ...(state.progress ? { progress: strip(state.progress, ["stashBurned"]) } : {}),
    ...(state.legacy ? { legacy: strip(state.legacy, ["quarry"]) } : {}),
    ...(state.run ? { run: { ...state.run, rewards: rewards ?? null } } : {}),
  } as Partial<GameState>;
  const hero = migrated.hero;
  if (!hero || !migrated.progress || !migrated.legacy || !data) return migrated;
  return {
    ...migrated,
    hero: {
      ...hero,
      learned: startingNodes(data.skillTree, hero.classId),
      unspentSkillPoints: earnedSkillPoints(migrated as GameState, data),
      rotation: hero.rotation.map(() => null),
    },
  };
}
