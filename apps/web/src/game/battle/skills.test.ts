import { SKILL_TREE, START_SKILLS, WEAPON_MASTERY } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { skillArt } from "./skills";

describe("painted skill icons", () => {
  it("paints every skill of the Ash Tree, the Masteries, the Innates and their Forms", () => {
    const ids = [
      ...SKILL_TREE.nodes.flatMap((n) => (n.skill ? [n.skill.id] : [])),
      ...Object.values(START_SKILLS).map((s) => s.id),
      ...Object.values(WEAPON_MASTERY).flatMap((t) =>
        t.nodes.flatMap((n) => (n.effect.innate ? [n.effect.innate.id] : [])),
      ),
    ];
    expect(ids.length).toBeGreaterThan(60);
    for (const id of ids) expect(skillArt(id), id).toBeDefined();
  });

  it("shows an infused skill as its base, the Wand's bolt as Frostbolt in Cold", () => {
    expect(skillArt("power-strike@fire-burn")).toBe(skillArt("power-strike"));
    expect(skillArt("shock-lance@cold-chill")).toBe(skillArt("frostbolt"));
    expect(skillArt("shock-lance")).toBe(skillArt("shockbolt"));
    expect(skillArt("frostbolt")).not.toBe(skillArt("shockbolt"));
    expect(skillArt("gorrak-slam")).toBeUndefined();
  });
});
