import { SAVE_VERSION } from "@emberheir/sim";
import {
  BackupError,
  type KeyValueStore,
  backupOf,
  readBackup,
  restoreBackup,
  savesOf,
} from "../saves";
import { type SyncMeta, readSync, writeSync } from "./account";
import { CloudError, type CloudRemote } from "./remote";

/**
 * Cloud saves (Release 1.0, built like Crucible's): a signed-in account writes locally first and
 * sends the whole set of save games (the six Heirs, the Supply Wagon, Lineage and Power Codex)
 * to the cloud a little later. The design is in docs/design/game-design-document-v2.md
 * ("Spielstände").
 */

/** The cloud sync as the title shows it. */
export type SyncState =
  /** The cloud holds what this device holds. */
  | "synced"
  /** Changes wait for the next push. */
  | "pending"
  /** No connection: the saves stay on this device, the push follows later. */
  | "offline"
  /** Another device wrote later; the next start lets the player choose. */
  | "conflict"
  /** The cloud refused the save (too big, or the rules said no). */
  | "error";

/** One side of a choice: the Heirs on this device (or the guest's) and the cloud's. */
export interface SaveSide {
  source: "device" | "guest" | "cloud";
  saves: Record<string, string>;
}

export type StartOutcome =
  | { kind: "ready"; state: SyncState }
  | { kind: "choose"; local: SaveSide; cloud: SaveSide; cloudRevision: number }
  /** The cloud holds saves of a newer game: reload to get it. */
  | { kind: "newer" };

export interface SyncParts {
  uid: string;
  /** The account's save games on this device (sealed, `AccountKeys`). */
  local: KeyValueStore;
  /** The guest's save games, when the player just signed in from the guest's title. */
  guest: KeyValueStore | null;
  remote: CloudRemote;
}

const hasHeir = (saves: Record<string, string>) =>
  Object.keys(saves).some((name) => name.startsWith("slot."));

function replace(kv: KeyValueStore, saves: Record<string, string>): void {
  restoreBackup(kv, { game: "emberheir", version: SAVE_VERSION, saves });
}

/** The guest's Heirs move into the account: the guest's title is empty afterwards. */
function adoptGuest(parts: SyncParts, saves: Record<string, string>, revision: number): void {
  replace(parts.local, saves);
  writeSync(parts.local, { revision, dirty: true });
  if (parts.guest) replace(parts.guest, {});
}

/**
 * The sync when a signed-in device starts. It prepares the account's saves on this device, or
 * puts both sides in front of the player. It never overwrites what the other side does not know:
 *
 * | this device             | cloud            | result                                       |
 * | ----------------------- | ---------------- | -------------------------------------------- |
 * | empty                   | empty            | the guest's Heirs move in (if signing in)    |
 * | empty                   | saves            | the cloud loads; a guest with Heirs chooses  |
 * | saves                   | empty            | this device's saves go up                    |
 * | on the cloud's revision | same revision    | nothing to do (changes go up)                |
 * | unchanged               | newer revision   | the cloud loads                              |
 * | changed                 | newer revision   | the player chooses                           |
 * | anything                | not reachable    | this device plays on                         |
 */
export async function startSync(parts: SyncParts): Promise<StartOutcome> {
  const device = savesOf(parts.local);
  const known = readSync(parts.local);
  const guest = parts.guest ? savesOf(parts.guest) : {};

  let cloud;
  try {
    cloud = await parts.remote.read(parts.uid);
  } catch {
    if (!hasHeir(device) && hasHeir(guest)) adoptGuest(parts, guest, known.revision);
    return { kind: "ready", state: "offline" };
  }

  if (cloud === null) {
    if (Object.keys(device).length > 0) {
      writeSync(parts.local, { revision: 0, dirty: true });
      return { kind: "ready", state: "pending" };
    }
    if (hasHeir(guest)) {
      adoptGuest(parts, guest, 0);
      return { kind: "ready", state: "pending" };
    }
    writeSync(parts.local, { revision: 0, dirty: false });
    return { kind: "ready", state: "synced" };
  }

  if (cloud.saveVersion > SAVE_VERSION) return { kind: "newer" };
  let cloudSaves: Record<string, string>;
  try {
    cloudSaves = readBackup(cloud.payload).saves;
  } catch (error) {
    if (error instanceof BackupError) return { kind: "newer" };
    throw error;
  }
  const cloudSide: SaveSide = { source: "cloud", saves: cloudSaves };
  const take = (): StartOutcome => {
    replace(parts.local, cloudSaves);
    writeSync(parts.local, { revision: cloud.revision, dirty: false });
    return { kind: "ready", state: "synced" };
  };

  if (Object.keys(device).length === 0) {
    if (hasHeir(guest)) {
      return {
        kind: "choose",
        local: { source: "guest", saves: guest },
        cloud: cloudSide,
        cloudRevision: cloud.revision,
      };
    }
    return take();
  }
  if (cloud.revision === known.revision) {
    return { kind: "ready", state: known.dirty ? "pending" : "synced" };
  }
  if (!known.dirty) return take();
  return {
    kind: "choose",
    local: { source: "device", saves: device },
    cloud: cloudSide,
    cloudRevision: cloud.revision,
  };
}

/**
 * The player's choice. The cloud's side replaces this device's saves; this device's side (or
 * the guest's) builds on the cloud's revision and goes up with the next push.
 */
export function resolveChoice(
  parts: Pick<SyncParts, "local" | "guest">,
  outcome: Extract<StartOutcome, { kind: "choose" }>,
  choice: "local" | "cloud",
): SyncState {
  if (choice === "cloud") {
    replace(parts.local, outcome.cloud.saves);
    writeSync(parts.local, { revision: outcome.cloudRevision, dirty: false });
    return "synced";
  }
  replace(parts.local, outcome.local.saves);
  writeSync(parts.local, { revision: outcome.cloudRevision, dirty: true });
  if (outcome.local.source === "guest" && parts.guest) replace(parts.guest, {});
  return "pending";
}

/** How long a change waits before it goes up: the game saves after almost every action. */
export const PUSH_DELAY_MS = 30_000;

/**
 * Sends the account's save games to the cloud: 30 s after the last change, at once when asked
 * (the tab is hidden, the player signs out). A push writes exactly the next revision; when the
 * cloud refuses because another device wrote later, it stops until the next start.
 */
export class CloudPusher {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pushing: Promise<void> | null = null;
  private again = false;
  private stopped = false;
  private current: SyncState;

  constructor(
    private readonly parts: Pick<SyncParts, "uid" | "local" | "remote">,
    state: SyncState,
    private readonly onState: (state: SyncState) => void,
    private readonly delayMs = PUSH_DELAY_MS,
  ) {
    this.current = state;
  }

  get state(): SyncState {
    return this.current;
  }

  private set(state: SyncState): void {
    this.current = state;
    this.onState(state);
  }

  /** A save game changed. */
  written(): void {
    const meta = readSync(this.parts.local);
    if (!meta.dirty) writeSync(this.parts.local, { ...meta, dirty: true });
    if (this.current === "conflict") return;
    if (this.current !== "pending") this.set("pending");
    this.schedule();
  }

  private schedule(): void {
    this.clear();
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, this.delayMs);
  }

  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Sends what waits at once. */
  flush(): Promise<void> {
    this.clear();
    return this.push();
  }

  stop(): void {
    this.stopped = true;
    this.clear();
  }

  private push(): Promise<void> {
    if (this.pushing) {
      this.again = true;
      return this.pushing;
    }
    this.pushing = this.pushOnce().finally(() => {
      this.pushing = null;
      if (this.again) {
        this.again = false;
        void this.push();
      }
    });
    return this.pushing;
  }

  private async pushOnce(): Promise<void> {
    const known: SyncMeta = readSync(this.parts.local);
    if (!known.dirty || this.current === "conflict") return;
    const before = JSON.stringify(savesOf(this.parts.local));
    const revision = known.revision + 1;
    try {
      await this.parts.remote.write(this.parts.uid, {
        payload: backupOf(this.parts.local),
        revision,
        saveVersion: SAVE_VERSION,
        clientVersion: __APP_VERSION__,
      });
    } catch (error) {
      await this.failed(error, known.revision);
      return;
    }
    // A save during the push left a newer state behind: it goes up with the next one.
    const dirty = JSON.stringify(savesOf(this.parts.local)) !== before;
    writeSync(this.parts.local, { revision, dirty });
    if (dirty) {
      this.set("pending");
      this.schedule();
    } else {
      this.set("synced");
    }
  }

  private async failed(error: unknown, knownRevision: number): Promise<void> {
    if (!(error instanceof CloudError) || error.code === "offline") {
      this.set("offline");
      this.schedule();
      return;
    }
    // The rules said no. A different revision in the cloud: another device was faster.
    const stored = await this.parts.remote.read(this.parts.uid).catch(() => null);
    this.set(stored !== null && stored.revision !== knownRevision ? "conflict" : "error");
  }
}
