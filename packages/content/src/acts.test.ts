import { describe, expect, it } from "vitest";
import { ACTS } from "./acts";

describe("ACTS", () => {
  it("has 7 acts numbered 1..7 with unique ids", () => {
    expect(ACTS.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(ACTS.map((a) => a.id)).size).toBe(ACTS.length);
  });

  it("only Act 1 is playable in the PoC", () => {
    expect(ACTS.filter((a) => a.playableInPoc).map((a) => a.id)).toEqual(["ashen-fields"]);
  });
});
