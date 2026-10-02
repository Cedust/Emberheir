import { describe, expect, it } from "vitest";
import { ACTS } from "./acts";
import { GAME_DATA } from "./game";

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
      expect(act.stages).toBe(15);
    }
    expect(GAME_DATA.acts.map((a) => a.id)).toEqual(["ashen-fields", "rotwood"]);
  });
});
