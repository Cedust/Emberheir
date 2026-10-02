import { type FightResult, runFight } from "../combat/fight";
import { type EnemyDefinition, createEnemySetup } from "../combat/monsters";
import type {
  Attribute,
  Attributes,
  CombatantSetup,
  RotationSlot,
  SkillDefinition,
  WeaponDefinition,
} from "../combat/types";
import { ATTRIBUTES } from "../combat/types";
import { type ResolvedEquipment, itemSlotFor, missingRequirements } from "../items/equipment";
import {
  getBase,
  pickWeighted,
  rollItem,
  rollRarity,
  rollUnique,
  uniquesFor,
} from "../items/generate";
import {
  type Equipment,
  type EquipmentSlot,
  type Item,
  type ItemCatalog,
  type ItemSlot,
  RARITIES,
  type Rarity,
} from "../items/types";
import { Rng } from "../rng";
import { PROGRESSION } from "./constants";
import { type EliteModifier, applyEliteModifiers, eliteChance, eliteModifierCount } from "./elites";
import { buildHeroSetup } from "./hero";
import { INVENTORY_SIZE, type PlacedItem, STASH_SIZE, addToGrid, packGrid } from "./inventory";
import { type CraftRequest, craft } from "./crafting";
import { type EnemyRank, autoRewards, gainXp, xpForKill } from "./leveling";
import {
  type LearnedNodes,
  type SkillTreeDefinition,
  keystoneRules,
  learnNodes,
  treeBonuses,
  treeSkills,
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
export const SAVE_VERSION = 4;

/** One act for the run: its stages, enemies and boss. */
export interface ActData {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  /** Monster Level per stage (index 0 = stage 1). The last stage is the boss stage. */
  readonly monsterLevels: readonly number[];
  readonly enemies: readonly EnemyDefinition[];
  readonly boss: EnemyDefinition;
  /** Eldrin (Runesmith) waits in this act; he joins after the first trip into it. */
  readonly runesmith?: boolean;
  /** Stages with a fixed Spoils pick (5 and 10). */
  readonly spoilsStages: readonly number[];
  /** The act's Essence (Imbue currency) and the stat affix it imbues. */
  readonly essence: { readonly id: string; readonly name: string; readonly affixId: string };
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
}

export interface Encounter {
  readonly enemyId: string;
  readonly level: number;
  readonly boss: boolean;
  /** Elite modifier ids; empty for normal enemies. */
  readonly eliteModifiers: readonly string[];
  /** Fight seed: the same encounter always plays out the same. */
  readonly seed: number;
}

export type SpoilsCard =
  | { readonly kind: "flaskCharge"; readonly amount: number }
  | { readonly kind: "reforgeStones"; readonly amount: number }
  | { readonly kind: "essence"; readonly essenceId: string; readonly amount: number };

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
  /** Item pick: 1 of these. */
  readonly items: readonly Item[];
  readonly itemPick: ItemPick | null;
  /** Dust from auto-salvaging the items that were not picked. */
  readonly salvagedDust: number;
  /** Spoils pick, empty if this fight has none. */
  readonly spoils: readonly SpoilsCard[];
  readonly spoilsPick: number | null;
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
  readonly harvesterEmber: number;
  /** Fixed Salvage Dust instead of the burned stash. */
  readonly dust: number;
  readonly levelCap: number;
  /** Monster Levels added to every stage. */
  readonly monsterLevelBonus: number;
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
    },
    wallet: {
      gold: 0,
      dust: 0,
      reforgeStones: 0,
      essences: {},
      harvesterEmber: 0,
      ascensionShards: 0,
      runes: {},
    },
    inventory: [],
    stash: [],
    flaskCharges: PROGRESSION.flaskStartCharges,
    progress: {
      actsCleared: [],
      deathsInAct: 0,
      trainerUnlocked: false,
      rotationSlots: PROGRESSION.startRotationSlots,
      stashBurned: false,
      runesmithUnlocked: false,
    },
    merchant: { key: 0, sold: [] },
    run: null,
    notice: null,
    stats: { fights: 0, wins: 0, deaths: 0, retreats: 0, bossKills: 0 },
    legacy: { prestige: 0, seals: [], chronicle: [], runewords: [], runesFound: [] },
    pendingPrestige: null,
  };
}

// --- reading the state -----------------------------------------------------------------------

export function getAct(data: GameData, actId: string): ActData {
  const act = data.acts.find((a) => a.id === actId);
  if (!act) throw new GameActionError(`Unknown act "${actId}"`);
  return act;
}

export const stagesInAct = (act: ActData) => act.monsterLevels.length;

/** Acts in their order through the run. */
export function actsInOrder(data: GameData): ActData[] {
  return [...data.acts].sort((a, b) => a.number - b.number);
}

/**
 * Whether the hero may set out into an act: the first act always, every later one once the act
 * before it fell in this generation. Cleared acts can be revisited to farm.
 */
export function actUnlocked(state: GameState, data: GameData, actId: string): boolean {
  const acts = actsInOrder(data);
  const index = acts.findIndex((a) => a.id === actId);
  if (index < 0) return false;
  const before = acts[index - 1];
  return !before || state.progress.actsCleared.includes(before.id);
}

/** The act the journey continues with: the first unlocked act that has not fallen yet. */
export function nextAct(state: GameState, data: GameData): ActData {
  const acts = actsInOrder(data);
  const open = acts.find(
    (a) => !state.progress.actsCleared.includes(a.id) && actUnlocked(state, data, a.id),
  );
  return open ?? acts[acts.length - 1] ?? fail("No acts");
}

/** The last act of the run: its boss is the final boss and leads to the Prestige. */
export function isFinalAct(data: GameData, actId: string): boolean {
  const last = Math.max(...data.acts.map((a) => a.number));
  return getAct(data, actId).number === last;
}

/** Level Cap at a Prestige level: 20, then +20 per Prestige. */
export function levelCap(prestige: number): number {
  return PROGRESSION.levelCap + PROGRESSION.levelCapPerPrestige * prestige;
}

/** Monster Level of a stage; every Prestige raises it. */
export function stageMonsterLevel(act: ActData, stage: number, prestige: number): number {
  return (act.monsterLevels[stage - 1] ?? 1) + PROGRESSION.monsterLevelsPerPrestige * prestige;
}

/** What the Prestige at `prestige` (1 = the first one) gives. */
export function prestigeRewards(data: GameData, prestige: number): PrestigeRewards {
  return {
    prestige,
    seals: Math.min(prestige, data.equipmentSlots.length),
    rotationSlots: Math.max(PROGRESSION.startRotationSlots, PROGRESSION.prestigeRotationSlots),
    harvesterEmber: PROGRESSION.prestigeHarvesterEmber,
    dust: PROGRESSION.prestigeDustPerLevel * prestige,
    levelCap: levelCap(prestige),
    monsterLevelBonus: PROGRESSION.monsterLevelsPerPrestige * prestige,
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

/** The Rotation Slots the hero fights with. */
export function heroRotation(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): RotationSlot[] {
  const known = knownSkills(state, data, weapon);
  const start = known.find((k) => k.startSkill);
  const slots: RotationSlot[] = [];
  for (const id of state.hero.rotation.slice(0, state.progress.rotationSlots)) {
    const entry = id === null ? start : known.find((k) => k.skill.id === id);
    if (entry && !slots.some((s) => s.skill.id === entry.skill.id)) {
      slots.push({ skill: entry.skill, level: entry.level });
    }
  }
  if (slots.length === 0 && start) slots.push({ skill: start.skill, level: start.level });
  return slots;
}

/** The hero's fight setup from the current state. */
export function heroSetup(
  state: GameState,
  data: GameData,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const { hero } = state;
  return buildHeroSetup(
    {
      level: hero.level,
      attributes: hero.attributes,
      equipment: hero.equipment,
      fallbackWeapon: fallbackWeapon(state, data),
      rotation: (weapon) => heroRotation(state, data, weapon),
      bonuses: (weapon) => treeBonuses(data.skillTree, hero.learned, weapon.range),
      rules: keystoneRules(data.skillTree, hero.learned),
      ...(state.run ? { lifeFraction: state.run.lifeFraction } : {}),
    },
    data.items,
  );
}

function findEnemy(act: ActData, id: string): EnemyDefinition {
  const enemy = act.boss.id === id ? act.boss : act.enemies.find((e) => e.id === id);
  if (!enemy) throw new GameActionError(`Unknown enemy "${id}" in ${act.id}`);
  return enemy;
}

export function eliteModifiersOf(encounter: Encounter, data: GameData): EliteModifier[] {
  return encounter.eliteModifiers.flatMap((id) => {
    const mod = data.eliteModifiers.find((m) => m.id === id);
    return mod ? [mod] : [];
  });
}

/** The enemy's fight setup for an encounter (Elites included). */
export function enemySetup(encounter: Encounter, actId: string, data: GameData): CombatantSetup {
  const enemy = findEnemy(getAct(data, actId), encounter.enemyId);
  const setup = createEnemySetup(enemy, encounter.level);
  const mods = eliteModifiersOf(encounter, data);
  return mods.length ? applyEliteModifiers(setup, mods) : setup;
}

export function encounterName(encounter: Encounter, actId: string, data: GameData): string {
  return findEnemy(getAct(data, actId), encounter.enemyId).name;
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
  /** After the rewards: on to the next stage (or back to Camp after the boss). */
  | { readonly type: "continue" }
  | { readonly type: "useFlask" }
  | { readonly type: "allocateAttributes"; readonly points: Partial<Attributes> }
  | { readonly type: "equip"; readonly itemId: string }
  | { readonly type: "unequip"; readonly slot: EquipmentSlot }
  | { readonly type: "salvage"; readonly itemId: string }
  | { readonly type: "learnNodes"; readonly nodeIds: readonly string[] }
  /** Kaelen: forget all Skill Tree nodes for Gold (points and Ember come back). */
  | { readonly type: "respecTree" }
  /** Supply Wagon (Camp only): move an item between inventory and stash. */
  | { readonly type: "moveItem"; readonly itemId: string; readonly to: "inventory" | "stash" }
  | { readonly type: "sortStash" }
  /** Thoric and Liora (Camp only). */
  | { readonly type: "craft"; readonly request: CraftRequest }
  | { readonly type: "setRotationSkill"; readonly slot: number; readonly skillId: string | null }
  /** After the final boss: seal slots, burn the rest, start the next generation. */
  | { readonly type: "prestige"; readonly sealedSlots: readonly EquipmentSlot[] }
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
      return salvage(state, action.itemId);
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
    case "prestige":
      return doPrestige(state, data, action.sealedSlots);
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
  const level = stageMonsterLevel(act, run.stage, state.legacy.prestige);
  let encounter: Encounter;
  if (run.stage >= stagesInAct(act)) {
    encounter = {
      enemyId: act.boss.id,
      level,
      boss: true,
      eliteModifiers: [],
      seed: rng.int(0, 0x7fffffff),
    };
  } else {
    const enemy = act.enemies[rng.int(0, act.enemies.length - 1)];
    if (!enemy) return fail(`Act ${act.id} has no enemies`);
    const mods: string[] = [];
    if (rng.chance(eliteChance(act.number, run.stage))) {
      const pool = [...data.eliteModifiers];
      for (let i = 0; i < eliteModifierCount(level) && pool.length; i++) {
        const [mod] = pool.splice(rng.int(0, pool.length - 1), 1);
        if (mod) mods.push(mod.id);
      }
    }
    encounter = {
      enemyId: enemy.id,
      level,
      boss: false,
      eliteModifiers: mods,
      seed: rng.int(0, 0x7fffffff),
    };
  }
  return { ...next, run: { ...run, phase: "fight", encounter } };
}

/** Back to the Camp: flask refilled, life full, act progress gone, Supply Wagon repaired. */
function toCamp(state: GameState, data: GameData, notice: Notice | null): GameState {
  const fromRunesmithAct = state.run ? getAct(data, state.run.actId).runesmith === true : false;
  return {
    ...state,
    run: null,
    notice,
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

  if (result.winner !== "hero") {
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
  const items = rollItemChoices(
    data,
    encounter,
    rank,
    state.progress.deathsInAct,
    act.number + state.legacy.prestige,
    rng,
  );
  const runes = rollRuneDrops(data, rank, act.number + state.legacy.prestige, rng);
  const spoils: SpoilsCard[] =
    rank !== "normal" || act.spoilsStages.includes(run.stage)
      ? [
          { kind: "flaskCharge", amount: PROGRESSION.spoils.flaskCharges },
          { kind: "reforgeStones", amount: PROGRESSION.spoils.reforgeStones },
          { kind: "essence", essenceId: act.essence.id, amount: PROGRESSION.spoils.essences },
        ]
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
        items,
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
  encounter: Encounter,
  rank: EnemyRank,
  deathsInAct: number,
  actTier: number,
  rng: Rng,
): Item[] {
  const weights = itemPickWeights(rank, deathsInAct, actTier);
  const bySlot = new Map<ItemSlot, string[]>();
  for (const baseId of data.lootBases) {
    const slot = getBase(data.items, baseId).slot;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), baseId]);
  }
  const slots = [...bySlot.keys()];
  const items: Item[] = [];
  // Bosses (sometimes Elites) may turn one card Legendary, or even Unique.
  const legendaryCard = rng.chance(PROGRESSION.legendaryChance[rank]) ? rng.int(0, 2) : -1;
  for (let i = 0; i < PROGRESSION.itemChoices; i++) {
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
    const rarity = i === legendaryCard ? "legendary" : rollRarity(rng, weights);
    items.push(rollItem(data.items, { baseId, itemLevel: encounter.level, rarity }, rng));
  }
  return items;
}

/** Adds Runes to the pouch. */
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
  const pool = [...data.items.runes.values()].filter((r) => r.rank <= max);
  const drops: string[] = [];
  const count = PROGRESSION.runeDrops[rank];
  for (let i = 0; i < Math.ceil(count); i++) {
    if (!rng.chance(Math.min(1, count - i))) continue;
    const rune = pickWeighted(pool, (r) => PROGRESSION.runeRankFalloff ** (r.rank - 1), rng);
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
  const salvaged = rewards.items
    .filter((_, i) => i !== index)
    .reduce((sum, it) => sum + salvageValue(it), 0);
  return {
    ...next,
    wallet: { ...next.wallet, dust: next.wallet.dust + salvaged },
    run: {
      ...run,
      rewards: { ...rewards, itemPick: { kind: mode, index }, salvagedDust: salvaged },
    },
  };
}

function salvageAll(state: GameState): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  const salvaged = rewards.items.reduce((sum, it) => sum + salvageValue(it), 0);
  return {
    ...state,
    wallet: { ...state.wallet, dust: state.wallet.dust + salvaged },
    run: {
      ...run,
      rewards: { ...rewards, itemPick: { kind: "salvageAll" }, salvagedDust: salvaged },
    },
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
  } else {
    const essences = { ...state.wallet.essences };
    essences[card.essenceId] = (essences[card.essenceId] ?? 0) + card.amount;
    next = { ...state, wallet: { ...state.wallet, essences } };
  }
  return { ...next, run: { ...run, rewards: { ...rewards, spoilsPick: index } } };
}

/** True once the item pick (and the spoils pick, if any) is done. */
export function rewardsDone(rewards: Rewards): boolean {
  return rewards.itemPick !== null && (rewards.spoils.length === 0 || rewards.spoilsPick !== null);
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
      isFinalAct(data, run.actId)
        ? null
        : { kind: "actCleared", actId: run.actId, stage: run.stage, enemyName },
    );
    // The final boss of the run: the Prestige flow starts (Victory → Seal → Inheritance).
    return isFinalAct(data, run.actId)
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

function salvage(state: GameState, itemId: string): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const placed = findInInventory(state, itemId);
  return {
    ...state,
    inventory: state.inventory.filter((p) => p !== placed),
    wallet: { ...state.wallet, dust: state.wallet.dust + salvageValue(placed.item) },
  };
}

export function requireTrainer(state: GameState): void {
  requireCamp(state);
  if (!state.progress.trainerUnlocked) fail("Kaelen joins the Camp after the act boss");
}

function learn(state: GameState, data: GameData, nodeIds: readonly string[]): GameState {
  requireTrainer(state);
  let result: ReturnType<typeof learnNodes>;
  try {
    result = learnNodes(data.skillTree, state.hero.learned, nodeIds, {
      skillPoints: state.hero.unspentSkillPoints,
      harvesterEmber: state.wallet.harvesterEmber,
    });
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
  requireTrainer(state);
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

// --- prestige --------------------------------------------------------------------------------

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
): GameState {
  const pending = state.pendingPrestige ?? fail("No Prestige pending");
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
    legacy: { prestige: 0, seals: [], chronicle: [], runewords: [], runesFound: [] },
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
