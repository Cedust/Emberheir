import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("uses defaults", () => {
    expect(parseArgs([])).toEqual({ runs: 1000, seed: 1 });
  });

  it("reads --runs and --seed", () => {
    expect(parseArgs(["--runs", "50", "--seed", "7"])).toEqual({ runs: 50, seed: 7 });
  });

  it("rejects unknown flags and bad values", () => {
    expect(() => parseArgs(["--foo", "1"])).toThrow("Unknown argument");
    expect(() => parseArgs(["--runs", "abc"])).toThrow("non-negative integer");
  });
});
