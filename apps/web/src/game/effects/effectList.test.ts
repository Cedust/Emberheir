import { Fight } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { dummyPreview } from "../classPreview";
import { EFFECTS, GROUPS, type Player } from "./effectList";

describe("effect gallery catalogue", () => {
  it("has unique ids and every entry in a known group", () => {
    const ids = EFFECTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groups = new Set<string>(GROUPS.map((g) => g.id));
    for (const e of EFFECTS) expect(groups.has(e.group), e.id).toBe(true);
  });

  it("every entry plays or holds something, and its events and states are well formed", () => {
    const preview = dummyPreview("cinderguard", "sword");
    const base = new Fight(preview.hero, preview.enemy, 1).snapshot();
    for (const e of EFFECTS) {
      const shown = e.play || e.state || e.hero || e.enemy || e.kit;
      expect(shown, e.id).toBeTruthy();
      if (e.state) expect(e.state(base).hero.maxLife).toBe(base.hero.maxLife);
      if (e.hero) expect(e.hero(preview.heroLook).weaponId).toBe(preview.heroLook.weaponId);
      const later: (() => void)[] = [];
      let events = 0;
      const player: Player = {
        events: (list) => {
          events += list.length;
          for (const ev of list) expect(typeof ev.type).toBe("string");
        },
        after: (_s, run) => later.push(run),
        state: (change) => {
          if (change) change(base);
        },
        reset: () => {},
      };
      e.play?.(player);
      for (const run of later) run();
      if (e.play) expect(events, e.id).toBeGreaterThan(0);
    }
  });
});
