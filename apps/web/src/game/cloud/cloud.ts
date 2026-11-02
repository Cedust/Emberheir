import { useSyncExternalStore } from "react";
import { type KeyValueStore, SealedStore, forgetSaves, savesStorage } from "../saves";
import { type AccountHint, forgetAccount, onSaveWrite, readAccount, writeAccount } from "./account";
import { type AuthGateway, type CloudUser, type Provider, firebaseAuth } from "./auth";
import { CLOUD } from "./config";
import { type CloudRemote, firestoreRemote } from "./remote";
import {
  CloudPusher,
  type StartOutcome,
  type SyncParts,
  type SyncState,
  resolveChoice,
  startSync,
} from "./sync";

/**
 * The cloud saves in the browser: sign-in, the sync at start and the pushes while playing.
 * Without a Firebase setup in the build (`CLOUD` is null) none of this runs and the game plays
 * as a guest.
 */
export const cloudAvailable = CLOUD !== null;

let gateway: AuthGateway | null = null;
let remote: CloudRemote | null = null;
const auth = () => (gateway ??= CLOUD ? firebaseAuth(CLOUD) : null);
const cloud = () => (remote ??= CLOUD ? firestoreRemote(CLOUD) : null);

/** The signed-in account on this device, if any. */
export const signedIn = (): AccountHint | null => (cloudAvailable ? readAccount() : null);

// The sync state for the title (useSyncExternalStore).

let state: SyncState | null = null;
let pusher: CloudPusher | null = null;
const listeners = new Set<() => void>();

function setState(next: SyncState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function useSyncState(): SyncState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

function guestStorage(): KeyValueStore {
  return new SealedStore(window.localStorage, navigator.webdriver);
}

function parts(account: AccountHint, local: KeyValueStore, r: CloudRemote): SyncParts {
  return {
    uid: account.uid,
    local,
    guest: account.fromGuest ? guestStorage() : null,
    remote: r,
  };
}

/** Starts pushing the account's changes; hiding the tab sends them at once. */
function play(account: AccountHint, local: KeyValueStore, r: CloudRemote, sync: SyncState) {
  writeAccount({ uid: account.uid, name: account.name });
  forgetSaves();
  setState(sync);
  pusher = new CloudPusher({ uid: account.uid, local, remote: r }, sync, setState);
  onSaveWrite(() => pusher?.written());
  if (sync === "pending") void pusher.flush();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void pusher?.flush();
  });
}

export type CloudStart = StartOutcome | { kind: "guest" };

/**
 * Before the game starts on a signed-in device: restores the sign-in and syncs the saves. A
 * sign-in that ended elsewhere (or expired) plays as a guest again.
 */
export async function startCloud(): Promise<CloudStart> {
  const account = signedIn();
  const a = auth();
  const r = cloud();
  const local = savesStorage();
  if (!account || !a || !r || !local) return { kind: "guest" };
  let user: CloudUser | null;
  try {
    user = await a.restore();
  } catch {
    // Offline: the account's saves on this device still play, the push follows later.
    play(account, local, r, "offline");
    return { kind: "ready", state: "offline" };
  }
  if (user?.uid !== account.uid) {
    writeAccount(null);
    window.location.reload();
    return { kind: "guest" };
  }
  const outcome = await startSync(parts(account, local, r));
  if (outcome.kind === "ready") play(account, local, r, outcome.state);
  return outcome;
}

/** Carries out the player's choice between this device and the cloud. */
export function chooseSaves(
  outcome: Extract<StartOutcome, { kind: "choose" }>,
  choice: "local" | "cloud",
): void {
  const account = signedIn();
  const r = cloud();
  const local = savesStorage();
  if (!account || !r || !local) return;
  play(account, local, r, resolveChoice(parts(account, local, r), outcome, choice));
}

/** Signs in with a pop-up window; the page reloads into the account's saves. */
export async function signIn(provider: Provider): Promise<void> {
  const a = auth();
  if (!a) return;
  const user = await a.signIn(provider);
  writeAccount({ uid: user.uid, name: user.name, fromGuest: true });
  window.location.reload();
}

/** Sends what waits, signs out and reloads as a guest (the account's saves stay in the cloud). */
export async function signOut(): Promise<void> {
  await pusher?.flush().catch(() => undefined);
  pusher?.stop();
  await auth()?.signOut();
  writeAccount(null);
  window.location.reload();
}

/** Deletes the cloud save, the account and its saves on this device, then plays as a guest. */
export async function deleteAccount(): Promise<void> {
  const account = signedIn();
  const a = auth();
  const r = cloud();
  if (!account || !a || !r) return;
  pusher?.stop();
  await r.erase(account.uid);
  await a.deleteUser();
  forgetAccount(window.localStorage, account.uid);
  writeAccount(null);
  window.location.reload();
}
