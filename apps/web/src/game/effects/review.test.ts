import { describe, expect, it } from "vitest";
import { EFFECTS } from "./effectList";
import { exportReview, setPick } from "./review";

describe("effect review", () => {
  it("keeps a pick or a note and drops an empty one", () => {
    let review = setPick({}, "slash", { choice: "keep" });
    review = setPick(review, "crit", { note: "kleiner" });
    expect(review).toEqual({ slash: { choice: "keep" }, crit: { note: "kleiner" } });
    expect(setPick(review, "slash", { choice: undefined })).toEqual({ crit: { note: "kleiner" } });
  });

  it("exports every effect with the suggestion and the pick", () => {
    const review = setPick({}, "slash", { choice: "remove", note: "zu viel" });
    const out = JSON.parse(exportReview(EFFECTS, review, new Date("2026-10-29T12:00:00Z"))) as {
      decided: number;
      total: number;
      effects: { id: string; choice: string | null; note?: string; suggestion: string }[];
    };
    expect(out.total).toBe(EFFECTS.length);
    expect(out.decided).toBe(1);
    expect(out.effects.find((e) => e.id === "slash")).toMatchObject({
      choice: "remove",
      note: "zu viel",
      suggestion: "Behalten",
    });
    expect(out.effects.find((e) => e.id === "crit")?.choice).toBeNull();
  });
});
