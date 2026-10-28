import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  type PlacedItem,
  SAVE_VERSION,
  deserializeGame,
  deserializeStash,
  serializeGame,
  serializeStash,
} from "@emberheir/sim";
import { z } from "zod";
import { parseStored, storageKey } from "../storage";
import { SaveSealError, isSealed, seal, unseal } from "./saveCodec";

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

/**
 * Power Codex (neuausrichtung-v1.md 8): Legendary Powers learned by any character, with the best
 * tier. Shared by every slot like the stash.
 */
export const POWER_CODEX_KEY = storageKey("powerCodex");
const powerCodexSchema = z.record(z.string(), z.number().int().positive());

/** The storage names of everything that belongs to the save games (sealed, and in a backup). */
const SAVE_NAMES = [
  ...Array.from({ length: SLOT_COUNT }, (_, i) => `slot.${i}`),
  "stash",
  "lineage",
  "powerCodex",
];
const SEALED_KEYS = new Set(SAVE_NAMES.map((n) => storageKey(n)));
/** Set once the plain saves from before 1.0 were sealed. */
const SEALED_MARK = storageKey("sealed");

/**
 * The browser storage with the save games sealed (saveCodec.ts): they go in sealed and come out
 * as JSON. Other keys (settings, last slot) stay as they are. A sealed save that was changed
 * throws `SaveSealError`.
 *
 * Saves from before 1.0 are plain JSON: the first start seals them once. After that a plain save
 * does not load, unless `allowPlain` (the Playwright tests seed plain saves).
 */
export class SealedStore implements KeyValueStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly allowPlain = false,
  ) {
    if (kv.getItem(SEALED_MARK) === "1") return;
    for (const key of SEALED_KEYS) {
      const text = kv.getItem(key);
      if (text !== null && !isSealed(text)) kv.setItem(key, seal(text));
    }
    kv.setItem(SEALED_MARK, "1");
  }

  getItem(key: string): string | null {
    const text = this.kv.getItem(key);
    if (text === null || !SEALED_KEYS.has(key)) return text;
    if (isSealed(text)) return unseal(text);
    if (this.allowPlain) return text;
    throw new SaveSealError("This save is damaged");
  }

  setItem(key: string, value: string): void {
    this.kv.setItem(key, SEALED_KEYS.has(key) ? seal(value) : value);
  }

  removeItem(key: string): void {
    this.kv.removeItem(key);
  }
}

/** Reads a key; a damaged one reads as missing. */
function readOrNull(kv: KeyValueStore, key: string): string | null {
  try {
    return kv.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The seeds of the finishers and the classes that won (phase 5); a broken list reads as empty.
 * Wins from before phase 5 have no class: the winner's slot adds it the next time it loads.
 */
const lineageSchema = z.object({
  finishers: z.array(z.number().int()),
  classes: z.array(z.string()).optional(),
});
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
  /** Slots whose key holds a save that does not load (changed, broken, from a newer game). */
  private readonly damaged = new Set<number>();
  /** What each slot's key holds right now, by reference (skips writing the same state twice). */
  private readonly written = new Map<number, GameState>();
  private stash: readonly PlacedItem[] | null = null;
  private lineage: SharedLineage | null = null;
  private powers: Readonly<Record<string, number>> | null = null;

  constructor(private readonly kv: KeyValueStore) {}

  /** Drops everything read so far (the storage changed behind this store's back). */
  forget(): void {
    this.slots.clear();
    this.damaged.clear();
    this.written.clear();
    this.stash = null;
    this.lineage = null;
    this.powers = null;
  }

  /** One slot's own save game, without the shared stash. */
  private ownSlot(slot: number): GameState | null {
    if (!this.slots.has(slot)) {
      let state: GameState | null;
      try {
        const json = this.kv.getItem(slotKey(slot));
        state = json === null ? null : deserializeGame(json, GAME_DATA);
      } catch {
        state = null;
        this.damaged.add(slot);
      }
      this.slots.set(slot, state);
    }
    return this.slots.get(slot) ?? null;
  }

  /** The shared stash; a broken one reads as empty. */
  sharedStash(): readonly PlacedItem[] {
    if (this.stash === null) {
      try {
        const json = this.kv.getItem(STASH_KEY);
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

  /** Slots that hold a save that does not load: shown as damaged, never overwritten silently. */
  damagedSlots(): number[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => i).filter((i) => {
      this.ownSlot(i);
      return this.damaged.has(i);
    });
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
      this.damaged.delete(slot);
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

  private readLineage(): SharedLineage {
    this.lineage ??= parseStored(readOrNull(this.kv, LINEAGE_KEY), lineageSchema, EMPTY_LINEAGE);
    return this.lineage;
  }

  /** The classes that have won the finale on this account (phase 5 Lineage). */
  lineageClasses(): readonly string[] {
    return this.readLineage().classes ?? [];
  }

  /**
   * The state with the account's Lineage: a character that has won the finale joins it once
   * (its seed is its name in the list), and its class with it.
   */
  syncLineage(state: GameState): GameState {
    let shared = this.readLineage();
    const classes = shared.classes ?? [];
    const newSeed = !shared.finishers.includes(state.seed);
    const newClass = !classes.includes(state.hero.classId);
    if (state.legacy.finaleWon && (newSeed || newClass)) {
      shared = {
        finishers: newSeed ? [...shared.finishers, state.seed] : shared.finishers,
        classes: newClass ? [...classes, state.hero.classId] : classes,
      };
      this.kv.setItem(LINEAGE_KEY, JSON.stringify(shared));
      this.lineage = shared;
    }
    const won = shared.classes ?? [];
    const same =
      (state.lineage?.length ?? 0) === won.length && won.every((c) => state.lineage?.includes(c));
    return same ? state : { ...state, lineage: won };
  }

  /**
   * The state with the account's Power Codex: what this character learned joins it (the best
   * tier per Power), and it learns what the others did.
   */
  syncPowerCodex(state: GameState): GameState {
    if (this.powers === null) {
      this.powers = parseStored(readOrNull(this.kv, POWER_CODEX_KEY), powerCodexSchema, {});
    }
    const merged: Record<string, number> = { ...this.powers };
    for (const [id, tier] of Object.entries(state.powerCodex ?? {})) {
      merged[id] = Math.max(merged[id] ?? 0, tier);
    }
    const ids = Object.keys(merged);
    // Only Powers this game knows (content may drop one).
    const known = Object.fromEntries(
      ids.filter((id) => GAME_DATA.items.powers.has(id)).map((id) => [id, merged[id] ?? 1]),
    );
    const same = (a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) =>
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([id, t]) => b[id] === t);
    if (!same(known, this.powers)) {
      this.kv.setItem(POWER_CODEX_KEY, JSON.stringify(known));
      this.powers = known;
    }
    if (Object.keys(known).length === 0) return state;
    return same(known, state.powerCodex ?? {}) ? state : { ...state, powerCodex: this.powers };
  }
}

// The browser's storage; private windows can block it, then nothing is saved.

let browserStore: SaveStore | null | undefined;
let browserKv: SealedStore | null = null;

function store(): SaveStore | null {
  if (browserStore === undefined) {
    try {
      browserKv = new SealedStore(window.localStorage, navigator.webdriver);
      browserStore = new SaveStore(browserKv);
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
/** The classes that won the finale on this account (Lineage points at creation). */
export const loadLineageClasses = () => withStore((s) => s.lineageClasses(), [] as const);
/** A new character with the shared stash; without storage it starts with an empty one. */
export const sharedStashFor = (state: GameState) =>
  withStore((s) => s.withSharedStash(state), state);
/** Full or blocked storage: the game still runs, it just is not saved. */
export const saveSlot = (slot: number, state: GameState | null) =>
  withStore((s) => s.write(slot, state), undefined);
/** The state with the account's Lineage and Power Codex; without storage it stays as it is. */
export const accountFor = (state: GameState) =>
  withStore((s) => s.syncPowerCodex(s.syncLineage(state)), state);
export const loadDamagedSlots = () => withStore((s) => s.damagedSlots(), [] as number[]);

/**
 * Backup (Release 1.0): every save game of this browser (the six slots, the Supply Wagon, the
 * Lineage and the Power Codex) in one sealed text, by storage name, so a backup from a PR
 * preview loads on the main game too.
 */
const backupSchema = z.object({
  game: z.literal("emberheir"),
  version: z.number().int(),
  saves: z.record(z.string(), z.string()),
});
export type Backup = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

export function backupOf(kv: KeyValueStore): string {
  const saves: Record<string, string> = {};
  for (const name of SAVE_NAMES) {
    const text = readOrNull(kv, storageKey(name));
    if (text !== null) saves[name] = text;
  }
  return seal(JSON.stringify({ game: "emberheir", version: SAVE_VERSION, saves }));
}

/** Opens a backup file's text. Throws `BackupError` with what to tell the player. */
export function readBackup(text: string): Backup {
  let json: string;
  try {
    json = unseal(text.trim());
  } catch {
    throw new BackupError("This is not an Emberheir backup, or it was changed.");
  }
  const parsed = parseStored<Backup | null>(json, backupSchema, null);
  if (!parsed) throw new BackupError("This is not an Emberheir backup.");
  if (parsed.version > SAVE_VERSION) {
    throw new BackupError("This backup is from a newer version of Emberheir.");
  }
  return parsed;
}

/** Replaces every save game with the backup's (a name it does not hold is removed). */
export function restoreBackup(kv: KeyValueStore, backup: Backup): void {
  for (const name of SAVE_NAMES) {
    const text = backup.saves[name];
    if (text === undefined) kv.removeItem(storageKey(name));
    else kv.setItem(storageKey(name), text);
  }
  // Continue picks up the backup's first Heir.
  const first = Array.from({ length: SLOT_COUNT }, (_, i) => i).find(
    (i) => backup.saves[`slot.${i}`] !== undefined,
  );
  if (first === undefined) kv.removeItem(LAST_KEY);
  else kv.setItem(LAST_KEY, String(first));
}

/** The backup of this browser's save games; null without storage. */
export const exportBackup = (): string | null =>
  withStore(() => (browserKv ? backupOf(browserKv) : null), null);

/** Loads a backup into this browser (the page reloads afterwards). */
export const importBackup = (backup: Backup): void =>
  withStore((s) => {
    if (!browserKv) return;
    restoreBackup(browserKv, backup);
    s.forget();
  }, undefined);
