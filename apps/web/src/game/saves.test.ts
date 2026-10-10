import { GAME_DATA } from "@emberheir/content";
import { type GameState, newGame, rollItem, Rng, serializeGame } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import {
  SLOT_COUNT,
  STASH_KEY,
  lastSlot,
  readSlot,
  readSlots,
  slotKey,
  withSharedStash,
  writeSlot,
  type KeyValueStore,
} from "./saves";

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const hero = (classId: string) => newGame(GAME_DATA, { seed: 1, classId, name: classId });

describe("character slots", () => {
  it("has six slots, each with its own save game", () => {
    const kv = memory();
    expect(readSlots(kv)).toEqual(Array.from({ length: SLOT_COUNT }, () => null));
    writeSlot(kv, 2, hero("hunter"));
    writeSlot(kv, 4, hero("warlock"));
    const slots = readSlots(kv);
    expect(slots.map((s) => s?.hero.classId ?? null)).toEqual([
      null,
      null,
      "hunter",
      null,
      "warlock",
      null,
    ]);
    expect(lastSlot(kv)).toBe(4);
  });

  it("moves the old single save into the first free slot", () => {
    const kv = memory();
    kv.setItem("emberheir.save", serializeGame(hero("warrior")));
    expect(readSlots(kv)[0]?.hero.classId).toBe("warrior");
    expect(kv.getItem("emberheir.save")).toBeNull();
    expect(lastSlot(kv)).toBe(0);
  });

  it("deleting a character frees its slot and forgets it as the last one", () => {
    const kv = memory();
    writeSlot(kv, 1, hero("reaver"));
    writeSlot(kv, 1, null);
    expect(kv.getItem(slotKey(1))).toBeNull();
    expect(lastSlot(kv)).toBeNull();
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
    writeSlot(kv, 0, stashed(hero("warrior"), ["a", "b"]));
    expect(readSlot(kv, 0)?.stash.map((p) => p.item.id)).toEqual(["a", "b"]);
    // A new character finds the wagon full; what it puts in, the others see.
    const twink = withSharedStash(kv, hero("hunter"));
    expect(twink.stash.map((p) => p.item.id)).toEqual(["a", "b"]);
    writeSlot(kv, 1, { ...twink, stash: twink.stash.slice(1) });
    expect(readSlot(kv, 0)?.stash.map((p) => p.item.id)).toEqual(["b"]);
    // The slot saves themselves carry no stash.
    expect(JSON.parse(kv.getItem(slotKey(0)) ?? "{}").stash).toEqual([]);
  });

  it("merges the stashes of old slot saves once, and survives deleting a character", () => {
    const kv = memory();
    kv.setItem(slotKey(0), serializeGame(stashed(hero("warrior"), ["a"])));
    kv.setItem(slotKey(3), serializeGame(stashed(hero("reaver"), ["b", "c"])));
    expect(kv.getItem(STASH_KEY)).toBeNull();
    const slots = readSlots(kv);
    expect(slots[3]?.stash.map((p) => p.item.id).sort()).toEqual(["a", "b", "c"]);
    expect(slots[0]?.stash).toEqual(slots[3]?.stash);
    writeSlot(kv, 3, null);
    expect(readSlot(kv, 0)?.stash).toHaveLength(3);
  });
});
