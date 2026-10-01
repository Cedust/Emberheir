import { describe, expect, it } from "vitest";
import { storageKey } from "./storage";

describe("storageKey", () => {
  it("keeps the main keys unchanged", () => {
    expect(storageKey("save", "")).toBe("emberheir.save");
  });

  it("separates PR previews", () => {
    expect(storageKey("save", "7")).toBe("emberheir.pr-7.save");
  });
});
