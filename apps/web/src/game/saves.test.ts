import { GAME_DATA } from "@emberheir/content";
import { type GameState, newGame, rollItem, Rng, serializeStash } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import {
  LINEAGE_KEY,
  POWER_CODEX_KEY,
  SLOT_COUNT,
  STASH_KEY,
  SaveStore,
  slotKey,
  type KeyValueStore,
} from "./saves";

function memory(): KeyValueStore & { data: Map<string, string>; writes: string[] } {
  const data = new Map<string, string>();
  const writes: string[] = [];
  return {
    data,
    writes,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}

const hero = (classId: string) => newGame(GAME_DATA, { seed: 1, classId, name: classId });

describe("character slots", () => {
  it("has six slots, each with its own save game", () => {
    const kv = memory();
    const store = new SaveStore(kv);
    expect(store.allSlots()).toEqual(Array.from({ length: SLOT_COUNT }, () => null));
    store.write(2, hero("ashstrider"));
    store.write(4, hero("emberseer"));
    const slots = store.allSlots();
    expect(slots.map((s) => s?.hero.classId ?? null)).toEqual([
      null,
      null,
      "ashstrider",
      null,
      "emberseer",
      null,
    ]);
    expect(store.lastSlot()).toBe(4);
  });

  it("deleting a character frees its slot and forgets it as the last one", () => {
    const kv = memory();
    const store = new SaveStore(kv);
    store.write(1, hero("cinderguard"));
    store.write(1, null);
    expect(kv.getItem(slotKey(1))).toBeNull();
    expect(store.lastSlot()).toBeNull();
  });
});

const ring = (id: string) => ({
  ...rollItem(GAME_DATA.items, { baseId: "iron-ring", itemLevel: 1, rarity: "magic" }, new Rng(1)),
  id,
});
const stashed = (state: GameState, ids: string[]): GameState => ({
  ...state,
  stash: ids.map((id, i) => ({ item: ring(id), x: i, y: 0 })),
});

describe("shared stash", () => {
  it("every Heir opens the same Supply Wagon", () => {
    const kv = memory();
    const store = new SaveStore(kv);
    store.write(0, stashed(hero("cinderguard"), ["a", "b"]));
    expect(store.slot(0)?.stash.map((p) => p.item.id)).toEqual(["a", "b"]);
    // A new character finds the wagon full; what it puts in, the others see.
    const twink = store.withSharedStash(hero("ashstrider"));
    expect(twink.stash.map((p) => p.item.id)).toEqual(["a", "b"]);
    store.write(1, { ...twink, stash: twink.stash.slice(1) });
    expect(store.slot(0)?.stash.map((p) => p.item.id)).toEqual(["b"]);
    // The slot saves themselves carry no stash.
    expect(JSON.parse(kv.getItem(slotKey(0)) ?? "{}").stash).toEqual([]);
    // A fresh store (the next page load) reads the same.
    expect(new SaveStore(kv).slot(0)?.stash.map((p) => p.item.id)).toEqual(["b"]);
  });

  it("writes the stash only when it changed, and each state only once", () => {
    const kv = memory();
    const store = new SaveStore(kv);
    const first = stashed(hero("cinderguard"), ["a"]);
    store.write(0, first);
    expect(kv.writes).toEqual([STASH_KEY, slotKey(0), "emberheir.lastSlot"]);
    kv.writes.length = 0;
    // An action that leaves the stash alone saves the slot only.
    const next = { ...first, flaskCharges: first.flaskCharges - 1 };
    store.write(0, next);
    expect(kv.writes).toEqual([slotKey(0)]);
    kv.writes.length = 0;
    store.write(0, next);
    expect(kv.writes).toEqual([]);
  });

  it("parses each save once", () => {
    const kv = memory();
    new SaveStore(kv).write(2, stashed(hero("cinderguard"), ["a"]));
    const reads: string[] = [];
    const counting: KeyValueStore = {
      ...kv,
      getItem: (k) => {
        reads.push(k);
        return kv.getItem(k);
      },
    };
    const store = new SaveStore(counting);
    store.allSlots();
    store.lastSlot();
    store.slot(2);
    expect(reads.filter((k) => k === STASH_KEY)).toHaveLength(1);
    expect(reads.filter((k) => k === slotKey(2))).toHaveLength(1);
    // Another tab wrote: the store reads again.
    store.forget();
    store.slot(2);
    expect(reads.filter((k) => k === slotKey(2))).toHaveLength(2);
  });

  it("migrates the stash items with the save version they were written in", () => {
    const kv = memory();
    kv.setItem(STASH_KEY, serializeStash([{ item: ring("a"), x: 0, y: 0 }]));
    expect(new SaveStore(kv).sharedStash().map((p) => p.item.id)).toEqual(["a"]);
  });

  it("broken saves, a broken stash and saves from unknown versions read as empty", () => {
    const kv = memory();
    kv.setItem(slotKey(0), "{not json");
    kv.setItem(slotKey(1), JSON.stringify({ ...hero("cinderguard"), version: 99 }));
    kv.setItem(slotKey(2), JSON.stringify({ ...hero("cinderguard"), hero: null }));
    kv.setItem(STASH_KEY, JSON.stringify({ version: 1, items: [{ item: { id: "x" } }] }));
    const store = new SaveStore(kv);
    expect(store.allSlots()).toEqual(Array.from({ length: SLOT_COUNT }, () => null));
    expect(store.sharedStash()).toEqual([]);
  });
});

describe("Lineage", () => {
  const hero = (seed: number, classId = "cinderguard") => newGame(GAME_DATA, { seed, classId });
  const won = (s: GameState): GameState => ({ ...s, legacy: { ...s.legacy, finaleWon: true } });

  it("every class that wins the finale joins it once", () => {
    const store = new SaveStore(memory());
    expect(store.syncLineage(hero(1)).lineage ?? []).toEqual([]);
    expect(store.syncLineage(won(hero(1))).lineage).toEqual(["cinderguard"]);
    // Another winner of the same class changes nothing.
    expect(store.syncLineage(won(hero(2))).lineage).toEqual(["cinderguard"]);
    expect(store.syncLineage(won(hero(3, "emberseer"))).lineage).toEqual([
      "cinderguard",
      "emberseer",
    ]);
    // A fresh character of any class inherits it.
    expect(store.syncLineage(hero(4, "ashstrider")).lineage).toEqual(["cinderguard", "emberseer"]);
    expect(store.lineageClasses()).toEqual(["cinderguard", "emberseer"]);
  });
});

describe("Lineage storage", () => {
  it("a broken list reads as empty and is written anew", () => {
    const kv = memory();
    kv.setItem(LINEAGE_KEY, JSON.stringify({ finishers: ["x", 2] }));
    const store = new SaveStore(kv);
    const fresh = newGame(GAME_DATA, { seed: 9, classId: "cinderguard" });
    expect(store.syncLineage(fresh).lineage ?? []).toEqual([]);
    const winner = { ...fresh, legacy: { ...fresh.legacy, finaleWon: true } };
    expect(store.syncLineage(winner).lineage).toEqual(["cinderguard"]);
    expect(JSON.parse(kv.getItem(LINEAGE_KEY) ?? "")).toEqual({
      finishers: [9],
      classes: ["cinderguard"],
    });
  });

  it("a win from before the classes counted adds its class when the winner loads", () => {
    const kv = memory();
    kv.setItem(LINEAGE_KEY, JSON.stringify({ finishers: [9] }));
    const store = new SaveStore(kv);
    const fresh = newGame(GAME_DATA, { seed: 9, classId: "ashstrider" });
    const winner = { ...fresh, legacy: { ...fresh.legacy, finaleWon: true } };
    expect(store.syncLineage(winner).lineage).toEqual(["ashstrider"]);
  });
});

describe("Power Codex", () => {
  it("belongs to the account: what one character learns, all know (the best tier counts)", () => {
    const kv = memory();
    const store = new SaveStore(kv);
    const a = newGame(GAME_DATA, { seed: 1, classId: "cinderguard" });
    const b = newGame(GAME_DATA, { seed: 2, classId: "emberseer" });
    expect(store.syncPowerCodex(a).powerCodex).toBeUndefined();
    store.syncPowerCodex({ ...a, powerCodex: { executioner: 3 } });
    expect(store.syncPowerCodex(b).powerCodex).toEqual({ executioner: 3 });
    store.syncPowerCodex({ ...b, powerCodex: { executioner: 2, "leech-bloom": 5 } });
    expect(store.syncPowerCodex(a).powerCodex).toEqual({ executioner: 3, "leech-bloom": 5 });
    expect(JSON.parse(kv.getItem(POWER_CODEX_KEY) ?? "")).toEqual({
      executioner: 3,
      "leech-bloom": 5,
    });
  });
});
