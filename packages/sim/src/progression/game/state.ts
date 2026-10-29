import { type EnemyDefinition } from "../../combat/monsters";
import { type FightReport } from "../../combat/report";
import { type Attributes, type SkillDefinition } from "../../combat/types";
import {
  type Equipment,
  type EquipmentSlot,
  type Item,
  type ItemCatalog,
  type ItemSlot,
} from "../../items/types";
import { Rng } from "../../rng";
import { type AshbornState, type AshbornValue } from "../ashborn";
import { type AttributePoints } from "../attributes";
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
import { type EventDefinition } from "../events";
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
 * (`save/migrations.ts`). Started over at 9 with the Klassengerüst: older saves are dropped.
 * 10: three Ash Tree travel nodes became the element attacks (balancing-neustart step 4).
 * 11: a trip may hold its walks past the Warden's Gate. 12: the act map replaces the forks.
 */
export const SAVE_VERSION = 18;

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
   * Normal fights offer an item pick on every this many'th normal fight of a trip (default
   * `PROGRESSION.normalPickEvery`, neuausrichtung-v1.md 6.3).
   */
  readonly pickEvery?: number;
  /**
   * Act loot (gegner-bosse-v1.md section 9): affix weight multipliers by affix id, so each act
   * drops the answer to its own question more often.
   */
  readonly favoredAffixes?: Readonly<Record<string, number>>;
  /**
   * Home Rune (act-beute-entwurf-v1.md A1): in this act a share of all Runes is this one
   * (`PROGRESSION.homeRuneShare`), so who wants it knows where to go.
   */
  readonly homeRune?: string;
  /** Home Uniques (A2): a Unique card in this act is one of these more often. */
  readonly homeUniques?: readonly string[];
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
  /** Draughts brewed from a Flask charge before setting out; none without them. */
  readonly draughts?: readonly DraughtDefinition[];
  /** Omens (neuausrichtung-v1.md 5.2 and 7.2); old acts and the Wildfire have none without them. */
  readonly omens?: readonly OmenDefinition[];
  /** The values of the Ashborn Boards (neuausrichtung-v1.md 7.3); no Ashborn without them. */
  readonly ashbornValues?: readonly AshbornValue[];
  /** Events on the act map (act-karte-entwurf-v1.md); no Event nodes without them. */
  readonly events?: readonly EventDefinition[];
  /**
   * Hunts (hunts-entwurf-v1.md): the Signature Affixes (affix ids) per enemy id. A hunted enemy's
   * item pick holds one of them; no Hunt nodes without them.
   */
  readonly huntSignatures?: Readonly<Record<string, readonly string[]>>;
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
  /**
   * Lineage (phase 5, Timo 2026-10-21): +1 point in the main attribute of every class that won the
   * finale on this account, taken at creation. Part of `attributes` and of the floor below which
   * no respec goes, like the Class Array.
   */
  readonly lineage?: AttributePoints;
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
  /** Life and damage of the stage kind, finale or Wildfire tier on top of the Monster Level; missing means none. */
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
  /** The Ashen Challenger of an Event: a sure Elite with one more pick. */
  readonly challenge?: boolean;
  /** The Lost Cub of an Event: one card of this fight's item pick is at least Rare. */
  readonly lucky?: boolean;
  /** The quarry of a Hunt node: it counts twice for its hunt and always offers an item pick. */
  readonly hunt?: boolean;
}

/** A win's step on the enemy's hunt bar (hunts-entwurf-v1.md). */
export interface HuntReward {
  readonly enemyId: string;
  /** Kills before and after this win. */
  readonly from: number;
  readonly kills: number;
  /** The tier after this win; `tierUp` when this win filled it. */
  readonly tier: number;
  readonly tierUp?: boolean;
  readonly boss?: boolean;
  /** The card of the item pick that carries a Signature Affix, and the affix. */
  readonly card?: number;
  readonly affix?: string;
  /** What the new tier paid once. */
  readonly acorns?: number;
  readonly emberCoal?: number;
}

export type ItemPick =
  { readonly kind: "equip" | "take"; readonly index: number } | { readonly kind: "salvageAll" };

/** A done bounty that waits to be turned in at the Scout. */
export interface BountyDone {
  readonly id: string;
  readonly enemyId?: string;
  /** The act it was done in (sets the level of the reward item). */
  readonly actId: string;
  /** Done in the Wildfire at this tier: the Cache pays Cinderglass and cards of that tier. */
  readonly wildfire?: number;
}

/**
 * Eldrin's Cache for a turned-in bounty (bounties-v2-plan.md B3): the Runes, Ember Coal and Trail
 * kills are paid at once; the item cards wait in the Camp until the hero takes `picks` of them
 * (the rest turns to Ash).
 */
export interface BountyCache {
  readonly id: string;
  readonly actId: string;
  readonly enemyId?: string;
  readonly runes: readonly string[];
  readonly emberCoal: number;
  /** Cinderglass of a Wildfire bounty (instead of the Home Rune). */
  readonly cinderglass?: number;
  /** Acorns of a Trail tier the cache's Trail kills filled. */
  readonly acorns?: number;
  readonly trailKills?: number;
  readonly items: readonly Item[];
  readonly picks: number;
  /** Cards taken so far (indexes into `items`). */
  readonly taken: readonly number[];
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
  /** The enemy's hunt bar after this win. */
  readonly hunt?: HuntReward;
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
   * Times the hero walked on at the Warden's Gate on this trip (laengere-runs-v1.md): the road
   * through the act starts anew, and its Shrines stay quiet. Missing = the first walk.
   */
  readonly wanders?: number;
  /** The act map of this walk (act-karte-entwurf-v1.md); missing in the Wildfire and the finale. */
  readonly map?: ActMap;
  /** The lane of the node taken on each row so far (`path[stage - 1]`), maybe one row ahead. */
  readonly path?: readonly number[];
  /** The quiet node the hero stands at (Shrine, Hearth, Cache, Event, Marisha). */
  readonly visit?: NodeVisit;
  /** Normal fights won on this trip: every `pickEvery`'th one offers an item pick. */
  readonly fights?: number;
  /** Events met on this trip: they come again only once all were met. */
  readonly events?: readonly string[];
  /** Ashen Challenger: the next fight on the map is a sure Elite with one more pick. */
  readonly challenge?: boolean;
  /** Lost Cub: the next item pick holds one card of at least Rare. */
  readonly lucky?: boolean;
  /** Cursed Spark: enemies deal this much more damage before the stage `until`. */
  readonly curse?: { readonly damage: number; readonly until: number };
}

/**
 * Nodes of the act map (act-karte-entwurf-v1.md). Fights: a fight (maybe a random Elite or the
 * Ember Thief), a sure Elite, the Ember Thief's trail. Quiet nodes have no fight.
 */
export const NODE_KINDS = [
  "fight",
  "elite",
  "thief",
  "shrine",
  "hearth",
  "cache",
  "event",
  "marisha",
  "hunt",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export interface MapNode {
  /** 0 = left, 1 = middle, 2 = right. */
  readonly lane: number;
  readonly kind: NodeKind;
  /** Lanes of the next row this node leads to. */
  readonly next: readonly number[];
  /** Hunt node: the enemy id it points at. */
  readonly quarry?: string;
  /** Fight and Elite nodes: the act enemy waiting there (the Ember Thief may still cut in). */
  readonly enemy?: string;
}

/** One map per walk through an act: `rows[stage - 1]`, one node or one per lane. */
export interface ActMap {
  readonly rows: readonly (readonly MapNode[])[];
}

/** The state of a quiet node while the hero stands there. */
export interface NodeVisit {
  readonly kind: NodeKind;
  /** The choice is made (or left); only the road ahead is left. */
  readonly done?: boolean;
  /** Event: its id. */
  readonly event?: string;
  /** Cache: the Runes and the Ember Coal on offer (the third card is an item pick). */
  readonly runes?: readonly string[];
  readonly emberCoal?: number;
  /** Marisha on the Road: the slots she gambles on, and the offers already bought. */
  readonly slots?: readonly ItemSlot[];
  readonly bought?: readonly number[];
}

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
  /** Acts whose boss the hero has faced (missing in older saves): until then its name stays hidden. */
  readonly bossesMet?: readonly string[];
  /** Hunts (hunts-entwurf-v1.md): kills per enemy id, Wardens included (missing = none yet). */
  readonly hunts?: Readonly<Record<string, number>>;
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
  /** Bounties turned in at Eldrin (a new offer after each). */
  readonly bounties?: number;
}

/** Personas the hero meets on the road before they join the caravan. */
export const COMPANIONS = ["kaelen", "marisha", "liora", "nyssa"] as const;
export type Companion = (typeof COMPANIONS)[number];

/**
 * A short scene when a persona is met: Marisha's three meetings, the others' one; and Liora's
 * first Draughts after the first Prestige.
 */
export const STORY_BLIPS = [
  "kaelen",
  "marisha-1",
  "marisha-2",
  "marisha-3",
  "liora",
  "nyssa",
  "liora-draughts",
] as const;
export type StoryBlip = (typeof STORY_BLIPS)[number];

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
    readonly rotationSlots: number;
    /**
     * Personas met on the road who joined the caravan (camp-personas-freischalten-v1.md). They
     * stay through every Prestige; Nan, Thoric and Eldrin are there from the start.
     */
    readonly met: readonly Companion[];
    /** Times Marisha was met on the road before she joined (she joins at the third). */
    readonly marishaMeetings?: number;
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
  /** Story Blips still to show, oldest first (one short scene each, then gone). */
  readonly blips?: readonly StoryBlip[];
  readonly stats: GameStats;
  readonly legacy: LegacyState;
  /** Set between the final boss and the Prestige. Blocks the Camp until it is done. */
  readonly pendingPrestige: PendingPrestige | null;
  /** Stolen Fire Boons of this run; they burn at the Prestige. */
  readonly boons: BoonsState;
  /** A done bounty the Scout has not paid yet; no new bounty until it is turned in. */
  readonly bountyDone?: BountyDone;
  /** Eldrin's Cache of the last turned-in bounty, while its item cards wait to be taken. */
  readonly bountyCache?: BountyCache;
  /**
   * Lineage of the account: the classes that have won the finale. The UI keeps it outside the
   * save (like the shared stash) and puts it into the state it loads.
   */
  readonly lineage?: readonly string[];
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

/** A copy of the run without the given optional fields (a quiet node's visit, an Event's luck). */
export function runWithout(run: RunState, ...keys: (keyof RunState)[]): RunState {
  const drop = new Set<string>(keys);
  return Object.fromEntries(Object.entries(run).filter(([key]) => !drop.has(key))) as RunState;
}

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
