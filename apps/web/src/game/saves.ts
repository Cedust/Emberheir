import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  type PlacedItem,
  LINEAGE_STEPS,
  deserializeGame,
  deserializeStash,
  serializeGame,
  serializeStash,
} from "@emberheir/sim";
import { z } from "zod";
import { parseStored, storageKey } from "../storage";

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

const LAST_KEY = storageKey("lastSlot");
export const slotKey = (slot: number) => storageKey(`slot.${slot}`);
/** The shared stash with the save version its items were written in (`serializeStash`). */
export const STASH_KEY = storageKey("stash");
/**
 * Lineage (spielzeit-v1.md, D): the seeds of the characters that won the finale. Shared by every
 * slot like the stash; its length is the Lineage step.
 */
export const LINEAGE_KEY = storageKey("lineage");

/** The seeds of the finishers; a broken list reads as empty. */
const lineageSchema = z.object({ finishers: z.array(z.number().int()) });
type SharedLineage = z.infer<typeof lineageSchema>;
const EMPTY_LINEAGE: SharedLineage = { finishers: [] };

/**
 * The save games in the browser storage, with what was read kept in memory: each slot, the
 * stash and the Lineage are parsed once, and a write only touches what changed. Every action
 * saves the game, so without this each one would read, parse and write the whole stash again.
 *
 * Broken saves, and saves from a version without a migration, read as empty (Early Dev
 * Preview: they are dropped and overwritten).
 *
 * The cache assumes this store is the only writer. Another tab writes the same keys: the
 * browser reports that with a `storage` event, and `forget` drops the cache.
 */
export class SaveStore {
  private readonly slots = new Map<number, GameState | null>();
  /** What each slot's key holds right now, by reference (skips writing the same state twice). */
  private readonly written = new Map<number, GameState>();
  private stash: readonly PlacedItem[] | null = null;
  private finishers: readonly number[] | null = null;

  constructor(private readonly kv: KeyValueStore) {}

  /** Drops everything read so far (the storage changed behind this store's back). */
  forget(): void {
    this.slots.clear();
    this.written.clear();
    this.stash = null;
    this.finishers = null;
  }

  /** One slot's own save game, without the shared stash. */
  private ownSlot(slot: number): GameState | null {
    if (!this.slots.has(slot)) {
      const json = this.kv.getItem(slotKey(slot));
      let state: GameState | null;
      try {
        state = json === null ? null : deserializeGame(json, GAME_DATA);
      } catch {
        state = null;
      }
      this.slots.set(slot, state);
    }
    return this.slots.get(slot) ?? null;
  }

  /** The shared stash; a broken one reads as empty. */
  sharedStash(): readonly PlacedItem[] {
    if (this.stash === null) {
      const json = this.kv.getItem(STASH_KEY);
      try {
        this.stash = json === null ? [] : deserializeStash(json, GAME_DATA);
      } catch {
        this.stash = [];
      }
    }
    return this.stash;
  }

  private writeStash(items: readonly PlacedItem[]): void {
    if (items === this.stash) return;
    this.kv.setItem(STASH_KEY, serializeStash(items));
    this.stash = items;
  }

  /** One slot's save game with the shared stash. */
  slot(slot: number): GameState | null {
    const state = this.ownSlot(slot);
    return state ? { ...state, stash: this.sharedStash() } : null;
  }

  allSlots(): (GameState | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => this.slot(i));
  }

  /** A new character's state with the shared stash in its Supply Wagon. */
  withSharedStash(state: GameState): GameState {
    return { ...state, stash: this.sharedStash() };
  }

  /** Saves a slot (`null` deletes the character). The stash goes to its shared key. */
  write(slot: number, state: GameState | null): void {
    if (!state) {
      this.kv.removeItem(slotKey(slot));
      this.slots.set(slot, null);
      this.written.delete(slot);
      if (this.kv.getItem(LAST_KEY) === String(slot)) this.kv.removeItem(LAST_KEY);
      return;
    }
    this.writeStash(state.stash);
    if (this.written.get(slot) !== state) {
      const own = { ...state, stash: [] };
      this.kv.setItem(slotKey(slot), serializeGame(own));
      this.slots.set(slot, own);
      this.written.set(slot, state);
    }
    if (this.kv.getItem(LAST_KEY) !== String(slot)) this.kv.setItem(LAST_KEY, String(slot));
  }

  /** The slot played last, if it still holds a character. */
  lastSlot(): number | null {
    const raw = this.kv.getItem(LAST_KEY);
    const slot = Number(raw);
    return raw !== null && this.ownSlot(slot) ? slot : null;
  }

  private readFinishers(): readonly number[] {
    if (this.finishers === null) {
      this.finishers = parseStored(
        this.kv.getItem(LINEAGE_KEY),
        lineageSchema,
        EMPTY_LINEAGE,
      ).finishers;
    }
    return this.finishers;
  }

  /**
   * The state with the account's Lineage step. A character that has won the finale joins the
   * Lineage once (its seed is its name in the list).
   */
  syncLineage(state: GameState): GameState {
    let finishers = this.readFinishers();
    if (state.legacy.finaleWon && !finishers.includes(state.seed)) {
      const shared: SharedLineage = { finishers: [...finishers, state.seed] };
      this.kv.setItem(LINEAGE_KEY, JSON.stringify(shared));
      this.finishers = finishers = shared.finishers;
    }
    const step = Math.min(LINEAGE_STEPS, finishers.length);
    return (state.lineage ?? 0) === step ? state : { ...state, lineage: step };
  }
}

// The browser's storage; private windows can block it, then nothing is saved.

let browserStore: SaveStore | null | undefined;

function store(): SaveStore | null {
  if (browserStore === undefined) {
    try {
      browserStore = new SaveStore(window.localStorage);
      window.addEventListener("storage", () => browserStore?.forget());
    } catch {
      browserStore = null;
    }
  }
  return browserStore;
}

/** Runs `use` on the browser's store; full or blocked storage gives `fallback`. */
function withStore<T>(run: (s: SaveStore) => T, fallback: T): T {
  try {
    const s = store();
    return s ? run(s) : fallback;
  } catch {
    return fallback;
  }
}

export const loadSlots = () =>
  withStore(
    (s) => s.allSlots(),
    Array.from({ length: SLOT_COUNT }, () => null),
  );
export const loadSlot = (slot: number) => withStore((s) => s.slot(slot), null);
export const loadLastSlot = () => withStore((s) => s.lastSlot(), null);
/** A new character with the shared stash; without storage it starts with an empty one. */
export const sharedStashFor = (state: GameState) =>
  withStore((s) => s.withSharedStash(state), state);
/** Full or blocked storage: the game still runs, it just is not saved. */
export const saveSlot = (slot: number, state: GameState | null) =>
  withStore((s) => s.write(slot, state), undefined);
/** The state with the account's Lineage; without storage it stays as it is. */
export const lineageFor = (state: GameState) => withStore((s) => s.syncLineage(state), state);
