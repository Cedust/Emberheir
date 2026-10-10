import { describe, expect, it } from "vitest";
import {
  PROGRESSION,
  applyAction,
  flaskCapacity,
  itemFlaskCharges,
  newGame,
  type Item,
} from "@emberheir/sim";
import { GAME_DATA } from "./game";
import { ITEM_CATALOG } from "./items";

const belt = (quality: number): Item => ({
  id: `belt-${quality}`,
  baseId: "sash",
  name: "Sash of Plenty",
  rarity: "magic",
  itemLevel: 1,
  tier: 1,
  affixes: [{ affixId: "flask-charges", quality }],
});

describe("Ember Flask", () => {
  it("holds 3 charges, and a Belt with “of Plenty” adds 1–2 more", () => {
    expect(itemFlaskCharges(belt(0), ITEM_CATALOG)).toBe(1);
    expect(itemFlaskCharges(belt(1), ITEM_CATALOG)).toBe(2);
    const s = newGame(GAME_DATA, { seed: 1, classId: GAME_DATA.classes[0]?.id ?? "" });
    expect(s.flaskCharges).toBe(PROGRESSION.flaskStartCharges);
    const worn = { ...s, hero: { ...s.hero, equipment: { belt: belt(1) } } };
    expect(flaskCapacity(worn, GAME_DATA)).toBe(PROGRESSION.flaskStartCharges + 2);
    // Setting out refills the Flask to what the worn Belt allows.
    const out = applyAction(worn, GAME_DATA, {
      type: "setOut",
      actId: GAME_DATA.acts[0]?.id ?? "",
    });
    expect(out.flaskCharges).toBe(PROGRESSION.flaskStartCharges + 2);
  });
});
