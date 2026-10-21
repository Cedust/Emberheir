import { describe, expect, it } from "vitest";
import { GAME_DATA } from "./game";
import { HUNT_SIGNATURES } from "./hunts";
import { ITEM_CATALOG } from "./items";

describe("Hunt signatures", () => {
  it("every act enemy and the Ember Thief has two stat affixes, Wardens have none", () => {
    for (const act of GAME_DATA.acts) {
      for (const enemy of act.enemies) expect(HUNT_SIGNATURES[enemy.id], enemy.id).toHaveLength(2);
      expect(HUNT_SIGNATURES[act.boss.id]).toBeUndefined();
    }
    expect(HUNT_SIGNATURES["ember-thief"]).toHaveLength(2);
  });

  it("only names stat affixes that exist", () => {
    const enemies = new Set([
      ...GAME_DATA.acts.flatMap((a) => a.enemies.map((e) => e.id)),
      "ember-thief",
    ]);
    for (const [enemy, ids] of Object.entries(HUNT_SIGNATURES)) {
      expect(enemies.has(enemy), enemy).toBe(true);
      for (const id of ids) expect(ITEM_CATALOG.affixes.get(id)?.kind, id).toBe("stat");
    }
  });
});
