import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  type PlacedItem,
  INVENTORY_SIZE,
  SAVE_VERSION,
  STASH_SIZE,
  addToGrid,
  deserializeGame,
  salvageValue,
  serializeGame,
} from "@emberheir/sim";
import { storageKey } from "../storage";

/**
 * Character slots (klassen-v2.md section 5): up to six characters, each its own bloodline with
 * its own save game. The settings and the Supply Wagon (the stash, entschlackung-v1.md) are
 * shared: every slot's save holds an empty stash, the items live under `STASH_KEY`.
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
/**
 * The shared stash with the save version it was written in. A save migration that changes items
 * has to migrate these too.
 */
export const STASH_KEY = storageKey("stash");

interface SharedStash {
  readonly version: number;
  readonly items: readonly PlacedItem[];
}

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

/** One slot's own save game, without the shared stash; broken or outdated saves read as empty. */
function readOwnSlot(kv: KeyValueStore, slot: number): GameState | null {
  try {
    const json = kv.getItem(slotKey(slot));
    return json ? deserializeGame(json, GAME_DATA) : null;
  } catch {
    return null;
  }
}

/**
 * The shared stash. The first time, the stashes of all slots move into it (slot by slot); what no
 * longer fits goes into that character's inventory, or turns into its Salvage Dust.
 */
export function readSharedStash(kv: KeyValueStore): PlacedItem[] {
  const json = kv.getItem(STASH_KEY);
  if (json !== null) {
    try {
      const shared = JSON.parse(json) as SharedStash;
      return Array.isArray(shared.items) ? [...shared.items] : [];
    } catch {
      return [];
    }
  }
  let stash: PlacedItem[] = [];
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const state = readOwnSlot(kv, slot);
    if (!state || state.stash.length === 0) continue;
    let { inventory, wallet } = state;
    for (const placed of state.stash) {
      const toStash = addToGrid(stash, placed.item, GAME_DATA.items, STASH_SIZE);
      if (toStash) {
        stash = toStash;
        continue;
      }
      const toBag = addToGrid(inventory, placed.item, GAME_DATA.items, INVENTORY_SIZE);
      if (toBag) inventory = toBag;
      else wallet = { ...wallet, dust: wallet.dust + salvageValue(placed.item) };
    }
    kv.setItem(slotKey(slot), serializeGame({ ...state, stash: [], inventory, wallet }));
  }
  writeSharedStash(kv, stash);
  return stash;
}

function writeSharedStash(kv: KeyValueStore, items: readonly PlacedItem[]): void {
  const shared: SharedStash = { version: SAVE_VERSION, items };
  kv.setItem(STASH_KEY, JSON.stringify(shared));
}

/** One slot's save game with the shared stash. */
export function readSlot(kv: KeyValueStore, slot: number): GameState | null {
  const state = readOwnSlot(kv, slot);
  return state ? { ...state, stash: readSharedStash(kv) } : null;
}

/** A new character's state with the shared stash in its Supply Wagon. */
export function withSharedStash(kv: KeyValueStore, state: GameState): GameState {
  return { ...state, stash: readSharedStash(kv) };
}

export function readSlots(kv: KeyValueStore): (GameState | null)[] {
  migrateLegacySave(kv);
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(kv, i));
}

export function writeSlot(kv: KeyValueStore, slot: number, state: GameState | null): void {
  if (state) {
    // The stash is written before it leaves the slot's save, so a first write still merges.
    readSharedStash(kv);
    writeSharedStash(kv, state.stash);
    kv.setItem(slotKey(slot), serializeGame({ ...state, stash: [] }));
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
  return kv.getItem(LAST_KEY) !== null && readOwnSlot(kv, slot) ? slot : null;
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
/** A new character with the shared stash; without storage it starts with an empty one. */
export const sharedStashFor = (state: GameState): GameState => {
  try {
    const kv = store();
    return kv ? withSharedStash(kv, state) : state;
  } catch {
    return state;
  }
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
