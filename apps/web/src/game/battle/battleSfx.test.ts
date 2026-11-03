import { describe, expect, it } from "vitest";
import { SAMPLES, VOICES, createVoiceLimiter, impactCues, swingCue } from "./battleSfx";

const hit = { damageType: "physical", crit: false, blocked: false } as const;

describe("battle sounds", () => {
  it("each weapon swings with its own sound; spells cast", () => {
    expect(swingCue("slash", "sword", "physical")).toBe("swing.blade");
    expect(swingCue("slash", "mace", "physical")).toBe("swing.heavy");
    expect(swingCue("arrow", "bow", "physical")).toBe("shot.bow");
    expect(swingCue("orb", "wand", "cold")).toBe("cast");
    expect(swingCue("bolt", "staff", "lightning")).toBe("cast");
    // The enemy has no weapon of the hero's: its melee sounds heavy, its spells cast.
    expect(swingCue("slash", null, "physical")).toBe("swing.heavy");
    expect(swingCue("slash", null, "fire")).toBe("cast");
    expect(swingCue("nova", "staff", "void")).toBeNull();
  });

  it("a blow lands as flesh, its element, a crack on a crit, steel when stopped", () => {
    expect(impactCues(hit)).toEqual(["impact"]);
    expect(impactCues({ ...hit, damageType: "fire" })).toEqual(["element.fire"]);
    expect(impactCues({ ...hit, crit: true })).toEqual(["impact", "break"]);
    expect(impactCues({ ...hit, damageType: "cold", crit: true })).toEqual([
      "impact",
      "element.cold",
      "break",
    ]);
    expect(impactCues({ ...hit, crit: true, glancing: true })).toEqual(["impact"]);
    expect(impactCues({ ...hit, blocked: true, crit: true })).toEqual(["clash"]);
    expect(impactCues({ ...hit, parried: true })).toEqual(["clash"]);
  });

  it("a fast fight keeps its voices: a gap per cue, a cap per cue and in all", () => {
    const voices = createVoiceLimiter();
    const keep = () => {};
    expect(voices.admit("impact", 0, 100, keep)).toBe(true);
    expect(voices.admit("impact", 10, 100, keep)).toBe(false);
    expect(voices.admit("impact", 100, 100, keep)).toBe(true);
    expect(voices.admit("impact", 200, 100, keep)).toBe(true);
    expect(voices.admit("impact", 300, 100, keep)).toBe(false);
    let t = 1000;
    const cues = ["clash", "break", "cast", "evade", "telegraph", "victory", "defeat"] as const;
    for (const cue of cues) expect(voices.admit(cue, (t += 100), 100, keep)).toBe(true);
    expect(voices.admit("element.void", t + 100, 100, keep)).toBe(false);
    expect(VOICES.total).toBe(10);
  });

  it("every recorded cue has a file", () => {
    for (const sample of Object.values(SAMPLES)) expect(sample.urls.length).toBeGreaterThan(0);
  });
});
