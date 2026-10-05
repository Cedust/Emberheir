import { GAME_DATA } from "@emberheir/content";
import { newGame, serializeGame } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { SLOT_COUNT, lastSlot, readSlots, slotKey, writeSlot, type KeyValueStore } from "./saves";

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
