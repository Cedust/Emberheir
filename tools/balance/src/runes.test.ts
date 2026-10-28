import { GAME_DATA } from "@emberheir/content";
import { addToGrid, type GameState, newGame, Rng, rollItem } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { autopilotRunes, campSalvage, pouchCovers, wantsBase } from "./runes";

/** A fresh Warrior (no helm, no shield) in the Camp with Nyssa, a full purse and these Runes. */
function camp(runes: Record<string, number>, withBase = true): GameState {
  const s = newGame(GAME_DATA, { seed: 1, classId: "cinderguard", weapon: "sword" });
  const cap = rollItem(
    GAME_DATA.items,
    { baseId: "leather-cap", itemLevel: 5, rarity: "normal" },
    new Rng(3),
  );
  const base = { ...cap, sockets: 0 };
  const equipment = { ...s.hero.equipment };
  delete equipment.helm;
  delete equipment.offHand;
  return {
    ...s,
    hero: {
      ...s.hero,
      attributes: { ...s.hero.attributes, dexterity: 5, strength: 5 },
      equipment,
    },
    inventory: withBase ? (addToGrid([], base, GAME_DATA.items) ?? []) : [],
    wallet: { ...s.wallet, acorns: 1000, ash: 1000, runes },
    progress: { ...s.progress, met: ["nyssa"] },
    legacy: { ...s.legacy, runesFound: [...GAME_DATA.items.runes.keys()] },
  };
}

describe("autopilot Runes", () => {
  it("pays a recipe from the pouch, combining three of a lower rank where one is missing", () => {
    expect(pouchCovers(GAME_DATA, { ash: 3 }, ["moss"])).toBe(true);
    expect(pouchCovers(GAME_DATA, { ash: 2 }, ["moss"])).toBe(false);
    expect(pouchCovers(GAME_DATA, { ash: 4 }, ["ash", "moss"])).toBe(true);
    expect(pouchCovers(GAME_DATA, { ash: 3 }, ["ash", "moss"])).toBe(false);
  });

  it("forges a Runeword into a kept base and wears it when it beats the worn item", () => {
    const s = autopilotRunes(camp({ ash: 1, moss: 1 }), GAME_DATA, GAME_DATA.acts[0], new Set());
    const helm = s.hero.equipment.helm;
    expect(helm?.runes).toEqual(["ash", "moss"]);
    expect(s.legacy.runewords).toContain("kindling");
    expect(s.wallet.runes).toEqual({});
  });

  it("combines Runes it has no use for, keeping a few of each kind", () => {
    const s = autopilotRunes(camp({ venom: 6 }, false), GAME_DATA, undefined, new Set());
    expect(s.wallet.runes).toEqual({ venom: 3, ember: 1 });
  });

  it("keeps a Runeword base through the Camp's salvage, and only with Runes on", () => {
    const s = camp({ ash: 1, moss: 1 });
    expect(campSalvage(s, GAME_DATA, true).inventory).toHaveLength(1);
    expect(campSalvage(s, GAME_DATA, false).inventory).toHaveLength(0);
  });

  it("takes a Normal card home only once Nyssa travels with the caravan", () => {
    const s = camp({ ash: 1, moss: 1 }, false);
    const card = rollItem(
      GAME_DATA.items,
      { baseId: "iron-helm", itemLevel: 6, rarity: "normal" },
      new Rng(5),
    );
    const base = { ...card, sockets: 0 };
    expect(wantsBase(s, GAME_DATA, base)).toBe(true);
    const early = { ...s, progress: { ...s.progress, met: [] } };
    expect(wantsBase(early, GAME_DATA, base)).toBe(false);
  });
});
