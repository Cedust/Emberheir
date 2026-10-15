import { z } from "zod";
import type { Item } from "../items/types";
import { type GameData, type GameState, SAVE_VERSION } from "../progression/game";
import type { PlacedItem } from "../progression/inventory";
import {
  type MigrateOptions,
  isRecord,
  migrateSave,
  migrateStashItems,
  versionOf,
} from "./migrations";
import { gameStateSchema, stashSchema } from "./schema";

/**
 * Save games: JSON text in, checked `GameState` out. A save is parsed in three steps: migrate it
 * to `SAVE_VERSION` (`migrations.ts`), check its shape (`schema.ts`, zod), then check that every
 * id it holds still exists in the content (`contentProblems`). Any failure throws, so the caller
 * decides what a broken save means.
 */

export class SaveGameError extends Error {}

function parseJson(json: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SaveGameError("Save game is not valid JSON");
  }
  if (!isRecord(parsed)) throw new SaveGameError("Save game is not an object");
  return parsed;
}

function checked<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new SaveGameError(`${what} is broken:\n${z.prettifyError(result.error)}`);
  return result.data;
}

function migrated<T>(run: () => T): T {
  try {
    return run();
  } catch (e) {
    throw e instanceof SaveGameError
      ? e
      : new SaveGameError(e instanceof Error ? e.message : String(e));
  }
}

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Reads a save game. Throws `SaveGameError` if it is broken, from an unknown version or holds
 * content that no longer exists. Without `data` the content check is skipped.
 */
export function deserializeGame(
  json: string,
  data?: GameData,
  options?: MigrateOptions,
): GameState {
  const raw = migrated(() => migrateSave(parseJson(json), options));
  const state = checked(gameStateSchema, raw, "Save game");
  const problems = data ? contentProblems(state, data) : [];
  if (problems.length) throw new SaveGameError(`Save game is broken:\n${problems.join("\n")}`);
  return state;
}

/** The shared stash as the UI stores it: its items and the save version they were written in. */
export function serializeStash(items: readonly PlacedItem[]): string {
  return JSON.stringify({ version: SAVE_VERSION, items });
}

/**
 * Reads the shared stash and migrates its items like a save game's (the items of a stash take
 * the same `item` migrations). Throws `SaveGameError` like `deserializeGame`.
 */
export function deserializeStash(
  json: string,
  data?: GameData,
  options?: MigrateOptions,
): PlacedItem[] {
  const raw = parseJson(json);
  const items = migrated(() => {
    const version = versionOf(raw, options?.to);
    return migrateStashItems(Array.isArray(raw["items"]) ? raw["items"] : [], version, options);
  });
  const stash = checked(stashSchema, { version: SAVE_VERSION, items }, "Stash");
  const problems = data ? stash.items.flatMap((p) => itemProblems(p.item, data)) : [];
  if (problems.length) throw new SaveGameError(`Stash is broken:\n${problems.join("\n")}`);
  return stash.items;
}

function itemProblems(item: Item, data: GameData): string[] {
  const { bases, affixes, uniques, powers, runes } = data.items;
  const problems: string[] = [];
  if (!bases.has(item.baseId)) problems.push(`Unknown item base "${item.baseId}"`);
  for (const roll of item.affixes) {
    if (!affixes.has(roll.affixId)) problems.push(`Unknown affix "${roll.affixId}"`);
  }
  if (item.uniqueId && !uniques.has(item.uniqueId)) {
    problems.push(`Unknown Unique "${item.uniqueId}"`);
  }
  if (item.powerId && !powers.has(item.powerId)) problems.push(`Unknown power "${item.powerId}"`);
  for (const rune of item.runes ?? []) {
    if (!runes.has(rune)) problems.push(`Unknown Rune "${rune}"`);
  }
  return problems;
}

/** Ids in the save that the content does not know (any more). */
export function contentProblems(state: GameState, data: GameData): string[] {
  const problems: string[] = [];
  const heroClass = data.classes.find((c) => c.id === state.hero.classId);
  if (!heroClass) problems.push(`Unknown class "${state.hero.classId}"`);
  if (!data.weaponMastery[state.hero.weaponId]) {
    problems.push(`Unknown weapon "${state.hero.weaponId}"`);
  }
  const acts = new Set([...data.acts.map((a) => a.id), ...(data.finale ? [data.finale.id] : [])]);
  for (const act of state.progress.actsCleared) {
    if (!acts.has(act)) problems.push(`Unknown act "${act}"`);
  }
  if (state.run && !acts.has(state.run.actId)) problems.push(`Unknown act "${state.run.actId}"`);
  const items = [
    ...Object.values(state.hero.equipment),
    ...state.inventory.map((p) => p.item),
    ...state.stash.map((p) => p.item),
    ...(state.run?.rewards?.items ?? []),
  ];
  for (const item of items) if (item) problems.push(...itemProblems(item, data));
  for (const rune of Object.values(state.hero.webRunes ?? {})) {
    if (!data.items.runes.has(rune)) problems.push(`Unknown Rune "${rune}"`);
  }
  for (const id of Object.keys(state.hero.ashborn?.points ?? {})) {
    if (!data.ashbornValues?.some((v) => v.id === id))
      problems.push(`Unknown Ashborn value "${id}"`);
  }
  for (const omen of state.run?.omens ?? []) {
    if (!data.omens?.some((o) => o.id === omen)) problems.push(`Unknown Omen "${omen}"`);
  }
  return problems;
}
