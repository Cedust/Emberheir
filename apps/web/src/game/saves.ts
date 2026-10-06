import { GAME_DATA } from "@emberheir/content";
import { type GameState, deserializeGame, serializeGame } from "@emberheir/sim";
import { storageKey } from "../storage";

/**
 * Character slots (klassen-v2.md section 5): up to six characters, each its own bloodline with
 * its own save game. Only the settings are shared.
 */
export const SLOT_COUNT = 6;

/** The part of `localStorage` the slots need (tests pass a Map-backed stand-in). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The single save game from before character slots. */
const LEGACY_KEY = storageKey("save");
const LAST_KEY = storageKey("lastSlot");
export const slotKey = (slot: number) => storageKey(`slot.${slot}`);

function store(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Moves the old single save into the first free slot, once. */
export function migrateLegacySave(kv: KeyValueStore): void {
  const old = kv.getItem(LEGACY_KEY);
  if (old === null) return;
  const free = Array.from({ length: SLOT_COUNT }, (_, i) => i).find(
    (i) => kv.getItem(slotKey(i)) === null,
  );
  if (free === undefined) return;
  kv.setItem(slotKey(free), old);
  kv.setItem(LAST_KEY, String(free));
  kv.removeItem(LEGACY_KEY);
}

/** One slot's save game; broken or outdated saves read as empty. */
export function readSlot(kv: KeyValueStore, slot: number): GameState | null {
  try {
    const json = kv.getItem(slotKey(slot));
    return json ? deserializeGame(json, GAME_DATA) : null;
  } catch {
    return null;
  }
}

export function readSlots(kv: KeyValueStore): (GameState | null)[] {
  migrateLegacySave(kv);
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(kv, i));
}

export function writeSlot(kv: KeyValueStore, slot: number, state: GameState | null): void {
  if (state) {
    kv.setItem(slotKey(slot), serializeGame(state));
    kv.setItem(LAST_KEY, String(slot));
  } else {
    kv.removeItem(slotKey(slot));
    if (kv.getItem(LAST_KEY) === String(slot)) kv.removeItem(LAST_KEY);
  }
}

/** The slot played last, if it still holds a character. */
export function lastSlot(kv: KeyValueStore): number | null {
  migrateLegacySave(kv);
  const slot = Number(kv.getItem(LAST_KEY));
  return kv.getItem(LAST_KEY) !== null && readSlot(kv, slot) ? slot : null;
}

// The browser's storage; private windows can block it, then nothing is saved.

export const loadSlots = () => {
  const kv = store();
  return kv ? readSlots(kv) : Array.from({ length: SLOT_COUNT }, () => null);
};
export const loadSlot = (slot: number) => {
  const kv = store();
  return kv ? readSlot(kv, slot) : null;
};
export const loadLastSlot = () => {
  const kv = store();
  return kv ? lastSlot(kv) : null;
};
export function saveSlot(slot: number, state: GameState | null): void {
  try {
    const kv = store();
    if (kv) writeSlot(kv, slot, state);
  } catch {
    // Full or blocked storage: the game still runs, it just is not saved.
  }
}
