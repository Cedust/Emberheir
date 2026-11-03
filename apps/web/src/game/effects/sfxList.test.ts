import { Fight } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { impactCues, swingCue } from "../battle/battleSfx";
import { dummyPreview } from "../classPreview";
import type { Player } from "./effectList";
import { SFX, SFX_GROUPS } from "./sfxList";

describe("SFX gallery catalogue", () => {
  it("has unique ids, known groups, and every entry plays something", () => {
    const ids = SFX.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groups = new Set<string>(SFX_GROUPS.map((g) => g.id));
    const preview = dummyPreview("cinderguard", "sword");
    const base = new Fight(preview.hero, preview.enemy, 1).snapshot();
    for (const e of SFX) {
      expect(groups.has(e.group), e.id).toBe(true);
      let events = 0;
      const later: (() => void)[] = [];
      const player: Player = {
        events: (list) => (events += list.length),
        after: (_s, run) => later.push(run),
        state: (change) => void change?.(base),
        reset: () => {},
      };
      e.play?.(player);
      for (const run of later) run();
      expect(events, e.id).toBeGreaterThan(0);
    }
  });

  it("covers every recorded and drawn battle sound", () => {
    const heard = new Set<string>();
    const weapons = ["sword", "axe", "mace", "dagger", "bow", "crossbow", "wand", "staff"] as const;
    for (const w of weapons)
      heard.add(
        String(
          swingCue(
            w === "bow" || w === "crossbow"
              ? "arrow"
              : w === "wand" || w === "staff"
                ? "orb"
                : "slash",
            w,
            "physical",
          ),
        ),
      );
    for (const t of ["fire", "cold", "lightning", "void"] as const)
      for (const c of impactCues({ damageType: t, crit: true, blocked: false })) heard.add(c);
    for (const c of impactCues({ damageType: "physical", crit: false, blocked: true }))
      heard.add(c);
    const names = SFX.map((e) => e.id).join(" ");
    for (const want of [
      "swing-sword",
      "swing-axe",
      "shot-bow",
      "cast-wand",
      "crit",
      "block",
      "evade",
      "telegraph",
      "death-enemy",
      "death-hero",
      "victory",
      "defeat",
    ])
      expect(names).toContain(want);
    expect(heard.size).toBeGreaterThanOrEqual(10);
  });
});
