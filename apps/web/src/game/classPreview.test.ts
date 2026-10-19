import { GAME_DATA } from "@emberheir/content";
import { Fight } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { dummyPreview } from "./classPreview";

describe("class preview", () => {
  for (const c of GAME_DATA.classes) {
    for (const weapon of c.weapons) {
      it(`${c.id} with ${weapon}: hits the Training Dummy, which neither falls nor hits back`, () => {
        const preview = dummyPreview(c.id, weapon);
        expect(preview.enemy.name).toBe("Training Dummy");
        const fight = new Fight(preview.hero, preview.enemy, 1);
        fight.advance(30);
        expect(fight.over).toBe(false);
        const snapshot = fight.snapshot();
        expect(snapshot.enemy.life).toBeLessThan(snapshot.enemy.maxLife);
        expect(snapshot.hero.life).toBe(snapshot.hero.maxLife);
      });
    }
  }
});
