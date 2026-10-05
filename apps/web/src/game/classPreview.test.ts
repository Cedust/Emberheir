import { GAME_DATA } from "@emberheir/content";
import { runFight } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { glimpsePreview, startPreview } from "./classPreview";

describe("class preview", () => {
  for (const c of GAME_DATA.classes) {
    for (const weapon of c.weapons) {
      it(`${c.id} with ${weapon}: the start and Glimpse fights are won`, () => {
        const start = startPreview(c.id, weapon);
        expect(runFight(start.hero, start.enemy, 1).winner).toBe("hero");
        expect(start.title).toBe(c.name);

        const glimpse = glimpsePreview(c.id, weapon);
        const fight = runFight(glimpse.hero, glimpse.enemy, 1);
        expect(fight.winner).toBe("hero");
        expect(fight.duration).toBeLessThan(60);
        // The Glimpse shows the title of the class's first recommended path.
        const first = c.recommendedBranches[0] ?? "";
        expect(glimpse.title).toBe(c.titles[first]);
        expect(glimpse.hero.rotation.length).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
