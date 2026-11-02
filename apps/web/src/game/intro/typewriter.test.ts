import { describe, expect, it } from "vitest";
import { LETTER_MS, lettersAt, revealTimes } from "./typewriter";

describe("typewriter", () => {
  it("reveals one letter per step", () => {
    const times = revealTimes("abc");
    expect(times).toEqual([LETTER_MS, 2 * LETTER_MS, 3 * LETTER_MS]);
    expect(lettersAt(times, 0)).toBe(0);
    expect(lettersAt(times, LETTER_MS)).toBe(1);
    expect(lettersAt(times, 10_000)).toBe(3);
  });

  it("holds its breath after a full stop", () => {
    const times = revealTimes("a. b");
    // The space after the stop waits longer than a letter.
    expect((times[2] ?? 0) - (times[1] ?? 0)).toBeGreaterThan(LETTER_MS);
    expect((times[1] ?? 0) - (times[0] ?? 0)).toBe(LETTER_MS);
  });

  it("counts letters, not UTF-16 halves", () => {
    expect(revealTimes("…’").length).toBe(2);
  });
});
