import { type EnemyDefinition } from "../../combat/monsters";
import { type FightReport } from "../../combat/report";
import { type Attributes, type SkillDefinition } from "../../combat/types";
import { type Equipment, type EquipmentSlot, type Item, type ItemCatalog } from "../../items/types";
import { Rng } from "../../rng";
import { type AshbornState, type AshbornValue } from "../ashborn";
import { type BattlePlanState } from "../battle-plan";
import {
  type BoonDefinition,
  type BoonFamilyDefinition,
  type BoonPick,
  type BoonsState,
} from "../boons";
import { type BountyDefinition, type BountyState } from "../bounties";
import { type HeroClass } from "../classes";
import { type CodexState } from "../codex";
import { type DraughtDefinition } from "../draughts";
import { type EliteModifier } from "../elites";
import { type PlacedItem } from "../inventory";
import { type EnemyRank } from "../leveling";
import { type OmenDefinition } from "../omens";
import { type LearnedNodes, type SkillTreeDefinition } from "../skill-tree";
import {
  type EchoDefinition,
  type EchoesState,
  type MasteryState,
  type WeaponMasteryTree,
} from "../weapon-mastery";

/**
 * The game loop of a run (docs/design/game-design-document-v1.md section 2): Camp → Set Out →
 * stages with intermission, fight and rewards → boss → Camp. Death or Retreat returns to the
 * Camp and keeps everything except act progress.
 *
 * `GameState` is plain data (a save game). `applyAction` is the only way to change it; the UI
 * reads the state and sends actions. All randomness comes from the state's seed.
 */

/**
 * Bumped whenever the save game shape changes; each bump gets a step in `MIGRATIONS`
 * (`save/migrations.ts`). Started over at 1 in the Early Dev Preview.
 */
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
  /** Nyssa (Runesmith) waits in this act; she joins after the first trip into it. */
  readonly runesmith?: boolean;
  /** Stages with an Ember Shrine (5 and 10); Elites have one too. */
  readonly shrineStages: readonly number[];
  /**
   * Normal fights offer an item pick on every this many'th stage (default
   * `PROGRESSION.normalPickEvery`, neuausrichtung-v1.md 6.3).
   */
  readonly pickEvery?: number;
  /**
   * Act loot (gegner-bosse-v1.md section 9): affix weight multipliers by affix id, so each act
   * drops the answer to its own question more often.
   */
  readonly favoredAffixes?: Readonly<Record<string, number>>;
  /** The Stolen Fire Boon family of this act's Warden (open from this act on). */
  readonly boonFamily?: string;
  /**
   * Life and damage factor of this act's boss in the endgame (default 1): its Warden echo in The
   * Last Ember and its Wildfire fights. The bosses were made for their own act; this evens them
   * out, so every act burns about as hot at the same tier (endgame-balance-v1.md A).
   */
  readonly endgameBoss?: number;
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
  /** Draughts brewed from a Flask charge before setting out; none without them. */
  readonly draughts?: readonly DraughtDefinition[];
  /** Omens (neuausrichtung-v1.md 5.2 and 7.2); old acts and the Wildfire have none without them. */
  readonly omens?: readonly OmenDefinition[];
  /** The values of the Ashborn Boards (neuausrichtung-v1.md 7.3); no Ashborn without them. */
  readonly ashbornValues?: readonly AshbornValue[];
}

export interface Wallet {
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  /** Upgrade (+1 Item Tier) at the Blacksmith. Bosses, sometimes Elites. */
  readonly phoenixFeathers: number;
  /** Rune pouch: loose Runes by id. They take no inventory space and burn at the Prestige. */
  readonly runes: Readonly<Record<string, number>>;
  /** Cinderglass (neuausrichtung-v1.md 7.5): only from the Wildfire, for Greater Affixes. */
  readonly cinderglass?: number;
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
  /** Runes in the Rune Sockets of the Skill Web: socket node id → Rune id. */
  readonly webRunes?: Readonly<Record<string, string>>;
  /** Ashborn (neuausrichtung-v1.md 7.3): XP after level 100, its levels and spent points. */
  readonly ashborn?: AshbornState;
  /** Ember Crucible (neuausrichtung-v1.md 8): the Power bound into each opened slot. */
  readonly crucible?: Readonly<Partial<Record<"strike" | "ward" | "ember", string>>>;
}

export interface Encounter {
  readonly enemyId: string;
  readonly level: number;
  readonly boss: boolean;
  /** Elite modifier ids; empty for normal enemies. */
  readonly eliteModifiers: readonly string[];
  /** Run Pressure on Life and damage (see `stagePressure`); missing means none. */
  readonly pressure?: { readonly life: number; readonly damage: number };
  /** Wall of the run's newest act on Life and damage (see `stageWall`); missing means none. */
  readonly wall?: { readonly life: number; readonly damage: number };
  /** A Gatekeeper: the sure Elite on a Waymark stage of the run's newest act. */
  readonly gate?: boolean;
  /** Fight seed: the same encounter always plays out the same. */
  readonly seed: number;
  /** The Ember Thief instead of the stage's enemy. */
  readonly thief?: boolean;
  /** The Last Ember: the echo of this act's boss. */
  readonly echo?: string;
  /** A named Champion (neuausrichtung-v1.md 6.1): three modifiers and its own hoard. */
  readonly champion?: boolean;
  /** The Omens of the trip that change the enemy (copied from the run). */
  readonly omens?: readonly string[];
}

export type ItemPick =
  { readonly kind: "equip" | "take"; readonly index: number } | { readonly kind: "salvageAll" };

/** A done bounty that waits to be turned in at the Scout. */
export interface BountyDone {
  readonly id: string;
  readonly enemyId?: string;
  /** The act it was done in (sets the level of the reward item). */
  readonly actId: string;
}

/** What the Scout paid for a turned-in bounty; the item went into the inventory. */
export interface BountyReward {
  readonly acorns: number;
  readonly emberCoal: number;
  readonly item: Item;
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
  /** Ashborn Levels this fight gave (after level 100). */
  readonly ashbornLevels?: number;
  /** Cinderglass from a Wildfire boss. */
  readonly cinderglass?: number;
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
  /** The Scout's bounty was done in this fight (turn it in at the Scout in the Camp). */
  readonly bountyDone?: boolean;
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
  /** Wildfire tier (1–10) of this trip; missing on a normal trip. */
  readonly wildfire?: number;
  /** The Draught brewed for this trip (it lasts until the Camp). */
  readonly draught?: string;
  /** The Omens of this trip: one Run Omen in an old act, any Wildfire Omens in the Wildfire. */
  readonly omens?: readonly string[];
  /**
   * Routes chosen on this trip (neuausrichtung-v1.md 6.2): by the first stage of each fork
   * (`routeForks`). A fork without a choice takes the Shrine path.
   */
  readonly routes?: Readonly<Record<string, RouteKind>>;
}

/**
 * The paths of a fork on the road (neuausrichtung-v1.md 6.2): two Elites with better loot, a
 * Shrine, a fire to rest at, or the Ember Thief's trail while a thief bounty runs.
 */
export const ROUTE_KINDS = ["elite", "shrine", "hearth", "thief"] as const;
export type RouteKind = (typeof ROUTE_KINDS)[number];

/** Shown once in the Camp after a run ends. */
export interface Notice {
  /** "prestige" is the Inheritance screen after the final boss of the run. */
  readonly kind: "death" | "retreat" | "actCleared" | "prestige" | "ending";
  readonly actId: string;
  readonly stage: number;
  readonly enemyName?: string;
  /** The Wildfire tier the act burned at (a cleared or lost Wildfire trip). */
  readonly wildfire?: number;
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
  /** Wildfire: the highest tier whose act boss fell (0 or missing = none yet). */
  readonly wildfire?: number;
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
  /** A done bounty the Scout has not paid yet; no new bounty until it is turned in. */
  readonly bountyDone?: BountyDone;
  /**
   * Lineage step of the account (0–5): how many characters have won the finale. The UI keeps it
   * outside the save (like the shared stash) and puts it into the state it loads.
   */
  readonly lineage?: number;
  /** The Draught chosen in the Camp: brewed from a Flask charge at every set-out. */
  readonly draught?: string | null;
  /**
   * Power Codex (neuausrichtung-v1.md 8): Legendary Powers learned by salvaging, with the best
   * tier learned. It belongs to the account: the UI keeps one for all characters (like the
   * Lineage) and puts it into the state it loads.
   */
  readonly powerCodex?: Readonly<Record<string, number>>;
}

export class GameActionError extends Error {}

export const fail = (message: string): never => {
  throw new GameActionError(message);
};

export function mixSeed(seed: number, nonce: number): number {
  let h = (seed ^ Math.imul(nonce + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A fresh random stream for one action, plus the state with the nonce moved on. */
export function nextRng(state: GameState): [Rng, GameState] {
  return [new Rng(mixSeed(state.seed, state.nonce)), { ...state, nonce: state.nonce + 1 }];
}
