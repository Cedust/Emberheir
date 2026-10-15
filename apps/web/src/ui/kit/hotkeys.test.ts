import { describe, expect, it } from "vitest";
import { stepTab } from "./hotkeys";

describe("stepTab", () => {
  const ids = ["tree", "mastery", "plan"];

  it("E goes to the next tab and wraps around", () => {
    expect(stepTab(ids, "tree", 1)).toBe("mastery");
    expect(stepTab(ids, "plan", 1)).toBe("tree");
  });

  it("Q goes to the previous tab and wraps around", () => {
    expect(stepTab(ids, "mastery", -1)).toBe("tree");
    expect(stepTab(ids, "tree", -1)).toBe("plan");
  });

  it("starts from the first tab when the active one is not in the list", () => {
    expect(stepTab(ids, "dummy", 1)).toBe("mastery");
    expect(stepTab([], "tree", 1)).toBeUndefined();
  });
});
