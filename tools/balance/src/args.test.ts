import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("uses defaults", () => {
    expect(parseArgs([])).toEqual({
      runs: 1000,
      seed: 1,
      weapon: "all",
      skills: [],
      enemy: "all",
      level: 1,
      gear: "none",
      ilvl: 0,
      act: 0,
      attempts: 30,
      generations: 1,
    });
  });

  it("reads all flags", () => {
    expect(
      parseArgs([
        "--runs",
        "50",
        "--seed",
        "7",
        "--weapon",
        "sword",
        "--skills",
        "power-strike,flurry",
        "--enemy",
        "ashen-brute",
        "--level",
        "3",
        "--gear",
        "rare",
        "--ilvl",
        "7",
        "--act",
        "1",
        "--attempts",
        "5",
        "--generations",
        "2",
      ]),
    ).toEqual({
      runs: 50,
      seed: 7,
      weapon: "sword",
      skills: ["power-strike", "flurry"],
      enemy: "ashen-brute",
      level: 3,
      gear: "rare",
      ilvl: 7,
      act: 1,
      attempts: 5,
      generations: 2,
    });
  });

  it("rejects unknown flags and bad values", () => {
    expect(() => parseArgs(["--foo", "1"])).toThrow("Unknown argument");
    expect(() => parseArgs(["--runs", "abc"])).toThrow("non-negative integer");
    expect(() => parseArgs(["--weapon"])).toThrow("expects a value");
    expect(() => parseArgs(["--level", "0"])).toThrow("at least 1");
    expect(() => parseArgs(["--generations", "0"])).toThrow("at least 1");
    expect(() => parseArgs(["--gear", "shiny"])).toThrow("--gear expects one of");
  });
});
