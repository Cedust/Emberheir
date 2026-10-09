import { getBase, rollItem, rollUnique } from "../items/generate";
import type { Item, Rarity } from "../items/types";
import { PROGRESSION } from "./constants";
import {
  type GameData,
  type GameState,
  type Wallet,
  actsInRun,
  fail,
  isHarvestAct,
  nextAct,
  nextRng,
  waymarkKey,
  waymarkStages,
} from "./game";
import { type GridSize, INVENTORY_SIZE, STASH_SIZE, addToGrid } from "./inventory";
import { EMPTY_MASTERY, MASTERY, weaponRank } from "./weapon-mastery";

/**
 * Cheat Mode (Timo 2026-10-08): testers jump to any point of the game without playing there.
 * Only the UI's cheat panel uses these; the game rules never do.
 */
export type WalletCurrency = Exclude<keyof Wallet, "essences" | "runes">;

export type Cheat =
  /** Set the hero level (any level up to the last Weapon Rank). Going down resets the points. */
  | { readonly kind: "level"; readonly level: number }
  /** Set a currency to an amount. */
  | { readonly kind: "currency"; readonly currency: WalletCurrency; readonly amount: number }
  | { readonly kind: "essence"; readonly essenceId: string; readonly amount: number }
  | { readonly kind: "rune"; readonly runeId: string; readonly amount: number }
  | { readonly kind: "flasks"; readonly amount: number }
  /** Extra Weapon Mastery points on top of the Weapon Rank. */
  | { readonly kind: "masteryPoints"; readonly amount: number }
  /** Sets the unspent Skill Points. */
  | { readonly kind: "skillPoints"; readonly amount: number }
  /** A new item (or a Unique) into the inventory, or the stash if `to` says so. */
  | {
      readonly kind: "giveItem";
      readonly baseId: string;
      readonly rarity: Rarity;
      readonly itemLevel: number;
      readonly uniqueId?: string;
      readonly to?: "inventory" | "stash";
    }
  /** Rolls an item anew on its base, with another rarity or Item Level; it keeps its place. */
  | {
      readonly kind: "rerollItem";
      readonly itemId: string;
      readonly rarity: Rarity;
      readonly itemLevel: number;
    }
  /** The next act of the run falls (or all of them). The newest act starts the Prestige flow. */
  | { readonly kind: "clearAct"; readonly all?: boolean }
  /** Set an Echo's stage (0 forgets it). */
  | { readonly kind: "echo"; readonly echoId: string; readonly stage: number }
  /** Kaelen and Eldrin join the caravan. */
  | { readonly kind: "unlockCamp" };

/** Highest level the cheat sets: the max level. */
export const CHEAT_MAX_LEVEL = PROGRESSION.maxLevel;

const whole = (n: number, min: number, max = Number.MAX_SAFE_INTEGER) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : min;

export function applyCheat(state: GameState, data: GameData, cheat: Cheat): GameState {
  switch (cheat.kind) {
    case "level":
      return setLevel(state, data, whole(cheat.level, 1, CHEAT_MAX_LEVEL));
    case "currency":
      return {
        ...state,
        wallet: { ...state.wallet, [cheat.currency]: whole(cheat.amount, 0) },
      };
    case "essence":
      return {
        ...state,
        wallet: {
          ...state.wallet,
          essences: { ...state.wallet.essences, [cheat.essenceId]: whole(cheat.amount, 0) },
        },
      };
    case "rune": {
      const amount = whole(cheat.amount, 0);
      return {
        ...state,
        wallet: { ...state.wallet, runes: { ...state.wallet.runes, [cheat.runeId]: amount } },
        legacy:
          amount > 0 && !state.legacy.runesFound.includes(cheat.runeId)
            ? { ...state.legacy, runesFound: [...state.legacy.runesFound, cheat.runeId] }
            : state.legacy,
      };
    }
    case "flasks":
      return { ...state, flaskCharges: whole(cheat.amount, 0, 99) };
    case "masteryPoints":
      return {
        ...state,
        hero: {
          ...state.hero,
          mastery: { ...state.hero.mastery, bonusPoints: whole(cheat.amount, 0, 999) },
        },
      };
    case "skillPoints":
      return {
        ...state,
        hero: { ...state.hero, unspentSkillPoints: whole(cheat.amount, 0, 999) },
      };
    case "giveItem":
      return giveItem(state, data, cheat);
    case "rerollItem":
      return rerollItem(state, data, cheat.itemId, cheat.rarity, cheat.itemLevel);
    case "clearAct":
      return clearActs(state, data, cheat.all === true);
    case "echo": {
      if (!data.echoes.some((e) => e.id === cheat.echoId)) fail(`Unknown Echo "${cheat.echoId}"`);
      const stage = whole(cheat.stage, 0, MASTERY.maxEchoStage);
      const echoes = Object.fromEntries(
        Object.entries(state.legacy.echoes).filter(([id]) => id !== cheat.echoId),
      );
      if (stage > 0) echoes[cheat.echoId] = { stage, prestige: state.legacy.prestige };
      const worn = state.hero.mastery.echo === cheat.echoId && stage === 0;
      return {
        ...state,
        legacy: { ...state.legacy, echoes },
        hero: worn ? { ...state.hero, mastery: { ...state.hero.mastery, echo: null } } : state.hero,
      };
    }
    case "unlockCamp":
      return {
        ...state,
        progress: { ...state.progress, trainerUnlocked: true, runesmithUnlocked: true },
      };
  }
}

function setLevel(state: GameState, data: GameData, level: number): GameState {
  const hero = state.hero;
  if (level >= hero.level) {
    const gained = level - hero.level;
    return {
      ...state,
      hero: {
        ...hero,
        level,
        xp: 0,
        unspentAttributePoints:
          hero.unspentAttributePoints + gained * PROGRESSION.attributePointsPerLevel,
      },
    };
  }
  // Down: every attribute point comes back to spend again, like after a rule change (v7 → v8).
  // Skill Points come from Waymarks, not levels, so the Skill Tree stays.
  const start =
    data.classes.find((c) => c.id === hero.classId)?.startingAttributes ?? data.startingAttributes;
  const p = state.legacy.prestige;
  const rankDrops = weaponRank(level, p) < weaponRank(hero.level, p);
  return {
    ...state,
    hero: {
      ...hero,
      level,
      xp: 0,
      attributes: start,
      unspentAttributePoints: (level - 1) * PROGRESSION.attributePointsPerLevel,
      mastery: rankDrops
        ? {
            ...EMPTY_MASTERY,
            echo: hero.mastery.echo,
            ...(hero.mastery.bonusPoints ? { bonusPoints: hero.mastery.bonusPoints } : {}),
          }
        : hero.mastery,
    },
  };
}

function rollFor(
  data: GameData,
  baseId: string,
  rarity: Rarity,
  itemLevel: number,
  uniqueId: string | undefined,
  state: GameState,
): [Item, GameState] {
  const [rng, next] = nextRng(state);
  if (uniqueId) return [rollUnique(data.items, uniqueId, itemLevel, rng), next];
  getBase(data.items, baseId);
  return [rollItem(data.items, { baseId, rarity, itemLevel }, rng), next];
}

function giveItem(
  state: GameState,
  data: GameData,
  cheat: Extract<Cheat, { kind: "giveItem" }>,
): GameState {
  const itemLevel = whole(cheat.itemLevel, 1, 999);
  const [item, next] = rollFor(data, cheat.baseId, cheat.rarity, itemLevel, cheat.uniqueId, state);
  const toStash = cheat.to === "stash";
  const grid: GridSize = toStash ? STASH_SIZE : INVENTORY_SIZE;
  const placed = addToGrid(toStash ? state.stash : state.inventory, item, data.items, grid);
  if (!placed) return fail(toStash ? "The stash is full" : "The inventory is full");
  return toStash ? { ...next, stash: placed } : { ...next, inventory: placed };
}

function rerollItem(
  state: GameState,
  data: GameData,
  itemId: string,
  rarity: Rarity,
  itemLevel: number,
): GameState {
  const level = whole(itemLevel, 1, 999);
  const reroll = (old: Item, s: GameState): [Item, GameState] => {
    const [item, next] = rollFor(data, old.baseId, rarity, level, undefined, s);
    return [{ ...item, id: old.id }, next];
  };
  for (const key of ["inventory", "stash"] as const) {
    const index = state[key].findIndex((p) => p.item.id === itemId);
    const placed = state[key][index];
    if (!placed) continue;
    const [item, next] = reroll(placed.item, state);
    const list = [...state[key]];
    list[index] = { ...placed, item };
    return { ...next, [key]: list };
  }
  const slot = Object.entries(state.hero.equipment).find(([, it]) => it?.id === itemId)?.[0];
  const worn = slot ? state.hero.equipment[slot as keyof typeof state.hero.equipment] : undefined;
  if (!slot || !worn) return fail("No such item");
  const [item, next] = reroll(worn, state);
  return {
    ...next,
    hero: { ...next.hero, equipment: { ...next.hero.equipment, [slot]: item } },
  };
}

function clearActs(state: GameState, data: GameData, all: boolean): GameState {
  if (state.run || state.pendingPrestige) return fail("Only in the Camp");
  let s = state;
  for (let guard = 0; guard < 16; guard++) {
    const act = nextAct(s, data);
    const cleared = s.progress.actsCleared.includes(act.id);
    const harvest =
      isHarvestAct(data, act.id, s.legacy.prestige) &&
      s.legacy.prestige < PROGRESSION.finalPrestige;
    if (cleared && !harvest) break;
    const echoDef = data.echoes.find((e) => e.actId === act.id);
    const echoBefore = echoDef ? s.legacy.echoes[echoDef.id] : undefined;
    // The act's Waymarks fall with it, each with its Skill Point.
    const waymarks = waymarkStages(act)
      .map((stage) => waymarkKey(act.id, stage))
      .filter((key) => !s.progress.waymarks.includes(key));
    s = {
      ...s,
      notice: null,
      hero: { ...s.hero, unspentSkillPoints: s.hero.unspentSkillPoints + waymarks.length },
      progress: {
        ...s.progress,
        waymarks: [...s.progress.waymarks, ...waymarks],
        actsCleared: cleared ? s.progress.actsCleared : [...s.progress.actsCleared, act.id],
        deathsInAct: 0,
        trainerUnlocked: true,
        runesmithUnlocked: s.progress.runesmithUnlocked || act.runesmith === true,
      },
      legacy:
        echoDef && echoBefore?.prestige !== s.legacy.prestige
          ? {
              ...s.legacy,
              echoes: {
                ...s.legacy.echoes,
                [echoDef.id]: {
                  stage: Math.min(MASTERY.maxEchoStage, (echoBefore?.stage ?? 0) + 1),
                  prestige: s.legacy.prestige,
                },
              },
            }
          : s.legacy,
      stats: { ...s.stats, bossKills: s.stats.bossKills + 1 },
    };
    if (harvest) {
      return {
        ...s,
        pendingPrestige: { actId: act.id, stage: act.stages, enemyName: act.boss.name },
      };
    }
    if (!all) break;
  }
  if (s === state && actsInRun(data, state.legacy.prestige).length > 0) {
    return fail("Every act of this run has fallen");
  }
  return s;
}
