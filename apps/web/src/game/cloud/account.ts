import { z } from "zod";
import { parseStored, saveKey, storageKey } from "../../storage";

/**
 * Which account plays in this browser (cloud saves, Release 1.0). Leaf module: the save store
 * (saves.ts) reads it at start, the cloud sync (sync.ts) builds on it.
 *
 * A signed-in account keeps its Heirs apart from the guest's: every save key gets the account's
 * own prefix (`emberheir.account.<uid>.save.slot.0`). Signing in or out reloads the page, so the store
 * never switches while the game runs.
 */
type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const HINT_KEY = storageKey("account");
const hintSchema = z.object({
  uid: z.string().min(1),
  name: z.string().nullable(),
  /** Set by a fresh sign-in: the guest's Heirs may move into the account once. */
  fromGuest: z.boolean().optional(),
});
export type AccountHint = z.infer<typeof hintSchema>;

function browser(): KeyValue | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAccount(kv: KeyValue | null = browser()): AccountHint | null {
  try {
    return parseStored<AccountHint | null>(kv?.getItem(HINT_KEY) ?? null, hintSchema, null);
  } catch {
    return null;
  }
}

export function writeAccount(hint: AccountHint | null, kv: KeyValue | null = browser()): void {
  try {
    if (hint) kv?.setItem(HINT_KEY, JSON.stringify(hint));
    else kv?.removeItem(HINT_KEY);
  } catch {
    // Without storage the next start plays as a guest.
  }
}

/** The account's keys: `emberheir.<name>` becomes `emberheir.account.<uid>.<name>`. */
export class AccountKeys implements KeyValue {
  private readonly base = storageKey("");
  constructor(
    private readonly kv: KeyValue,
    readonly uid: string,
  ) {}

  key(key: string): string {
    return key.startsWith(this.base)
      ? storageKey(`account.${this.uid}.${key.slice(this.base.length)}`)
      : key;
  }

  getItem(key: string): string | null {
    return this.kv.getItem(this.key(key));
  }

  setItem(key: string, value: string): void {
    this.kv.setItem(this.key(key), value);
  }

  removeItem(key: string): void {
    this.kv.removeItem(this.key(key));
  }
}

/** The storage the save games use in this browser: the guest's, or the signed-in account's. */
export function saveStorage(kv: KeyValue): KeyValue {
  const account = readAccount(kv);
  return account ? new AccountKeys(kv, account.uid) : kv;
}

/**
 * Removes every key of an account from this browser (deleting the account). The keys are
 * collected first: removing while walking `localStorage` shifts its indices.
 */
export function forgetAccount(storage: Storage, uid: string): void {
  const prefix = storageKey(`account.${uid}.`);
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

/**
 * The account's sync state on this device:
 * - `revision`: the cloud revision the local saves last built on (0 before the first sync).
 * - `dirty`: the local saves hold changes the cloud does not know yet.
 */
export interface SyncMeta {
  revision: number;
  dirty: boolean;
}

const SYNC_KEY = saveKey("cloudSync");
const syncSchema = z.object({ revision: z.number().int().min(0), dirty: z.boolean() });
const NO_SYNC: SyncMeta = { revision: 0, dirty: false };

/** Read and written through the account's keys (`AccountKeys`). */
export function readSync(kv: KeyValue): SyncMeta {
  try {
    return parseStored(kv.getItem(SYNC_KEY), syncSchema, NO_SYNC);
  } catch {
    return NO_SYNC;
  }
}

export function writeSync(kv: KeyValue, meta: SyncMeta): void {
  try {
    kv.setItem(SYNC_KEY, JSON.stringify(meta));
  } catch {
    // Without storage the next start counts as the first sync.
  }
}

// Every save write tells the cloud sync, so it can push a little later.

const writeListeners = new Set<() => void>();

export function onSaveWrite(listener: () => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

export function savesWritten(): void {
  for (const listener of writeListeners) listener();
}
