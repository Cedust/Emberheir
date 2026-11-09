import { SAVE_VERSION } from "@emberheir/sim";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveKey } from "../../storage";
import { type KeyValueStore, backupOf, savesOf } from "../saves";
import { AccountKeys, readSync, writeSync } from "./account";
import { CloudError, type CloudRemote, type CloudSnapshot, type CloudWrite } from "./remote";
import { seal } from "../saveCodec";
import { CloudPusher, type SyncState, resolveChoice, startSync } from "./sync";

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** A cloud that keeps one document per account and checks the revision like the rules. */
function cloud(initial?: CloudSnapshot) {
  const docs = new Map<string, CloudSnapshot>();
  if (initial) docs.set("u1", initial);
  let offline = false;
  const writes: CloudWrite[] = [];
  const remote: CloudRemote = {
    read: async (uid) => {
      if (offline) throw new CloudError("offline");
      return docs.get(uid) ?? null;
    },
    write: async (uid, save) => {
      if (offline) throw new CloudError("offline");
      const stored = docs.get(uid);
      if (save.revision !== (stored?.revision ?? 0) + 1) throw new CloudError("denied");
      writes.push(save);
      docs.set(uid, save);
    },
    erase: async (uid) => void docs.delete(uid),
  };
  return {
    remote,
    docs,
    writes,
    setOffline: (v: boolean) => (offline = v),
  };
}

const heir = (name: string) => JSON.stringify({ name });
function withHeirs(kv: KeyValueStore, ...names: string[]): KeyValueStore {
  names.forEach((n, i) => kv.setItem(saveKey(`slot.${i}`), heir(n)));
  return kv;
}
function snapshot(revision: number, ...names: string[]): CloudSnapshot {
  return { payload: backupOf(withHeirs(memory(), ...names)), revision, saveVersion: SAVE_VERSION };
}
const heirNames = (kv: KeyValueStore) =>
  Object.entries(savesOf(kv))
    .filter(([k]) => k.startsWith("slot."))
    .map(([, v]) => (JSON.parse(v) as { name: string }).name);

describe("the account's keys", () => {
  it("keep an account's saves apart from the guest's and other keys as they are", () => {
    const kv = memory();
    const account = new AccountKeys(kv, "u1");
    account.setItem(saveKey("slot.0"), "a");
    expect(kv.data.get("emberheir.account.u1.save.slot.0")).toBe("a");
    expect(kv.getItem(saveKey("slot.0"))).toBeNull();
    account.setItem("other", "b");
    expect(kv.data.get("other")).toBe("b");
  });
});

describe("the sync at start", () => {
  it("moves the guest's Heirs into a new account and empties the guest's title", async () => {
    const local = memory();
    const guest = withHeirs(memory(), "Guest");
    const c = cloud();
    const out = await startSync({ uid: "u1", local, guest, remote: c.remote });
    expect(out).toEqual({ kind: "ready", state: "pending" });
    expect(heirNames(local)).toEqual(["Guest"]);
    expect(heirNames(guest)).toEqual([]);
    expect(readSync(local)).toEqual({ revision: 0, dirty: true });
  });

  it("loads the cloud on an empty device", async () => {
    const local = memory();
    const c = cloud(snapshot(4, "Cloud"));
    const out = await startSync({ uid: "u1", local, guest: null, remote: c.remote });
    expect(out).toEqual({ kind: "ready", state: "synced" });
    expect(heirNames(local)).toEqual(["Cloud"]);
    expect(readSync(local)).toEqual({ revision: 4, dirty: false });
  });

  it("lets a guest with Heirs choose when the cloud has Heirs too", async () => {
    const local = memory();
    const guest = withHeirs(memory(), "Guest");
    const c = cloud(snapshot(2, "Cloud"));
    const out = await startSync({ uid: "u1", local, guest, remote: c.remote });
    if (out.kind !== "choose") throw new Error(out.kind);
    expect(out.local.source).toBe("guest");
    expect(resolveChoice({ local, guest }, out, "local")).toBe("pending");
    expect(heirNames(local)).toEqual(["Guest"]);
    expect(heirNames(guest)).toEqual([]);
    expect(readSync(local)).toEqual({ revision: 2, dirty: true });
  });

  it("takes the cloud's newer save when this device did not change", async () => {
    const local = withHeirs(memory(), "Old");
    writeSync(local, { revision: 1, dirty: false });
    const c = cloud(snapshot(3, "New"));
    expect(await startSync({ uid: "u1", local, guest: null, remote: c.remote })).toEqual({
      kind: "ready",
      state: "synced",
    });
    expect(heirNames(local)).toEqual(["New"]);
  });

  it("asks when both moved on, and the cloud's side replaces this device's", async () => {
    const local = withHeirs(memory(), "Here");
    writeSync(local, { revision: 1, dirty: true });
    const c = cloud(snapshot(3, "There"));
    const out = await startSync({ uid: "u1", local, guest: null, remote: c.remote });
    if (out.kind !== "choose") throw new Error(out.kind);
    expect(out.local.source).toBe("device");
    expect(resolveChoice({ local, guest: null }, out, "cloud")).toBe("synced");
    expect(heirNames(local)).toEqual(["There"]);
    expect(readSync(local)).toEqual({ revision: 3, dirty: false });
  });

  it("plays on offline and never loads a newer game's save", async () => {
    const local = withHeirs(memory(), "Here");
    const c = cloud();
    c.setOffline(true);
    expect(await startSync({ uid: "u1", local, guest: null, remote: c.remote })).toEqual({
      kind: "ready",
      state: "offline",
    });
    const newer = cloud({ ...snapshot(1, "Future"), saveVersion: SAVE_VERSION + 1 });
    expect(await startSync({ uid: "u1", local, guest: null, remote: newer.remote })).toEqual({
      kind: "newer",
    });
    expect(heirNames(local)).toEqual(["Here"]);
  });

  it("deletes a cloud save of a test build before 1.0 and counts the cloud as empty", async () => {
    const local = withHeirs(memory(), "Here");
    const old = seal(JSON.stringify({ game: "emberheir", version: 21, saves: { "slot.0": "{}" } }));
    const c = cloud({ payload: old, revision: 7, saveVersion: 21 });
    expect(await startSync({ uid: "u1", local, guest: null, remote: c.remote })).toEqual({
      kind: "ready",
      state: "pending",
    });
    expect(c.docs.size).toBe(0);
    expect(readSync(local)).toEqual({ revision: 0, dirty: true });
  });
});

describe("the pusher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pushes 30 s after the last change with the next revision", async () => {
    const local = withHeirs(memory(), "Here");
    const c = cloud();
    const states: SyncState[] = [];
    const pusher = new CloudPusher({ uid: "u1", local, remote: c.remote }, "synced", (s) =>
      states.push(s),
    );
    pusher.written();
    await vi.advanceTimersByTimeAsync(29_000);
    expect(c.writes).toHaveLength(0);
    pusher.written();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(c.writes.map((w) => w.revision)).toEqual([1]);
    expect(readSync(local)).toEqual({ revision: 1, dirty: false });
    expect(states).toEqual(["pending", "synced"]);
    pusher.written();
    await pusher.flush();
    expect(c.writes.map((w) => w.revision)).toEqual([1, 2]);
  });

  it("keeps the saves offline and stops when another device wrote later", async () => {
    const local = withHeirs(memory(), "Here");
    const c = cloud();
    const pusher = new CloudPusher({ uid: "u1", local, remote: c.remote }, "synced", () => {});
    c.setOffline(true);
    pusher.written();
    await pusher.flush();
    expect(pusher.state).toBe("offline");
    expect(readSync(local).dirty).toBe(true);

    c.setOffline(false);
    c.docs.set("u1", snapshot(5, "Elsewhere"));
    await pusher.flush();
    expect(pusher.state).toBe("conflict");
    expect(c.docs.get("u1")?.revision).toBe(5);
    pusher.stop();
  });
});
