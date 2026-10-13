import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseStored, storageKey } from "./storage";

describe("storageKey", () => {
  it("keeps the main keys unchanged", () => {
    expect(storageKey("save", "")).toBe("emberheir.save");
  });

  it("separates PR previews", () => {
    expect(storageKey("save", "7")).toBe("emberheir.pr-7.save");
  });
});

describe("parseStored", () => {
  const schema = z.object({ n: z.number() });
  const fallback = { n: 0 };

  it("reads data that fits the schema", () => {
    expect(parseStored('{"n":3}', schema, fallback)).toEqual({ n: 3 });
  });

  it("falls back on missing, broken or wrongly shaped data", () => {
    expect(parseStored(null, schema, fallback)).toBe(fallback);
    expect(parseStored("{oops", schema, fallback)).toBe(fallback);
    expect(parseStored('{"n":"three"}', schema, fallback)).toBe(fallback);
  });
});
