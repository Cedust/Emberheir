import { describe, expect, it } from "vitest";
import { DEFAULT_PINS, parsePins } from "./pins";

describe("pinned Overview panels", () => {
  it("never saved or broken: the defaults", () => {
    expect(parsePins(null)).toEqual(DEFAULT_PINS);
    expect(parsePins("{")).toEqual(DEFAULT_PINS);
    expect(parsePins(JSON.stringify({ damage: true }))).toEqual(DEFAULT_PINS);
  });

  it("keeps known panels, drops unknown ones, doubles and more than three", () => {
    expect(parsePins(JSON.stringify(["ailments", "gone", "ailments", "heat"]))).toEqual([
      "ailments",
      "heat",
    ]);
    expect(parsePins(JSON.stringify(["damage", "vitals", "heat", "triggers"]))).toEqual([
      "damage",
      "vitals",
      "heat",
    ]);
  });

  it("an empty Overview stays empty", () => {
    expect(parsePins("[]")).toEqual([]);
  });
});
