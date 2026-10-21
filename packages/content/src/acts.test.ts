import { describe, expect, it } from "vitest";
import { ACTS } from "./acts";
import { GAME_DATA } from "./game";
import { ITEM_CATALOG } from "./items";

describe("ACTS", () => {
  it("has 7 acts numbered 1..7 with unique ids", () => {
    expect(ACTS.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(ACTS.map((a) => a.id)).size).toBe(ACTS.length);
  });

  it("playable acts match the catalog and come in order", () => {
    for (const act of GAME_DATA.acts) {
      expect(ACTS.find((a) => a.id === act.id)).toMatchObject({
        number: act.number,
        name: act.name,
      });
    }
    expect(GAME_DATA.acts.map((a) => a.id)).toEqual(ACTS.map((a) => a.id));
    // 6 × 15 stages + Emberfall's 10 = 100 stages to the Harvester.
    expect(GAME_DATA.acts.reduce((n, a) => n + a.stages, 0)).toBe(100);
  });

  it("each act has its own Home Rune, and Home Uniques that exist and drop anywhere", () => {
    const homes = GAME_DATA.acts.map((a) => a.homeRune);
    expect(new Set(homes).size).toBe(GAME_DATA.acts.length);
    for (const act of GAME_DATA.acts) {
      expect(ITEM_CATALOG.runes.has(act.homeRune ?? ""), `${act.id}: ${act.homeRune}`).toBe(true);
      for (const id of act.homeUniques ?? []) {
        const unique = ITEM_CATALOG.uniques.get(id);
        expect(unique, `${act.id}: ${id}`).toBeDefined();
        expect(unique?.bossOf, `${act.id}: ${id}`).toBeUndefined();
      }
    }
    // Act 1 drops up to rank 3, so its Home Rune must be one of those.
    expect(ITEM_CATALOG.runes.get(GAME_DATA.acts[0]?.homeRune ?? "")?.rank).toBeLessThanOrEqual(3);
  });

  it("act loot only favors affixes that exist", () => {
    for (const act of GAME_DATA.acts) {
      for (const id of Object.keys(act.favoredAffixes ?? {})) {
        expect(ITEM_CATALOG.affixes.has(id), `${act.id}: ${id}`).toBe(true);
      }
    }
  });
});
