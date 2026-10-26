import { describe, expect, it } from "vitest";
import type { Item } from "../items/types";
import {
  type GameAction,
  type GameState,
  applyAction,
  CRUCIBLE,
  crucibleLock,
  fail,
  heroSetup,
  learnPower,
  newGame,
  crucibleBindCost,
} from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

/** Ember Crucible and the Power Codex (neuausrichtung-v1.md 8). */

const data = TEST_GAME_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

const LEGENDARY = (tier: number): Item => ({
  id: `leg-${tier}`,
  baseId: "test-ring",
  name: "Echoing Band",
  rarity: "legendary",
  itemLevel: tier * 10,
  tier,
  affixes: [],
  powerId: "echo",
});

function camp(extra: Partial<GameState> = {}): GameState {
  const s = newGame(data, { seed: 4, classId: "test-fighter" });
  return {
    ...s,
    progress: { ...s.progress, trainerUnlocked: true },
    wallet: { ...s.wallet, ash: 1000, emberCoal: 10 },
    ...extra,
  };
}

describe("Power Codex", () => {
  it("salvaging a Legendary teaches its Power; a higher tier improves it", () => {
    expect(learnPower(undefined, "echo", 3)).toEqual({ echo: 3 });
    expect(learnPower({ echo: 5 }, "echo", 3)).toEqual({ echo: 5 });
    expect(learnPower({ echo: 3 }, undefined, 9)).toEqual({ echo: 3 });
    let s = camp({
      inventory: [
        { item: LEGENDARY(4), x: 0, y: 0 },
        { item: LEGENDARY(2), x: 2, y: 0 },
      ],
    });
    s = act(s, { type: "salvage", itemId: "leg-4" });
    expect(s.powerCodex).toEqual({ echo: 4 });
    s = act(s, { type: "salvage", itemId: "leg-2" });
    expect(s.powerCodex).toEqual({ echo: 4 });
  });
});

describe("Ember Crucible", () => {
  it("slots open with the first Power, The Last Ember and Wildfire V", () => {
    const fresh = camp();
    expect(crucibleLock(fresh, "strike")).toMatch(/first Power/);
    expect(crucibleLock({ ...fresh, powerCodex: { echo: 1 } }, "strike")).toBeNull();
    expect(crucibleLock(fresh, "ward")).toMatch(/Last Ember/);
    expect(
      crucibleLock({ ...fresh, legacy: { ...fresh.legacy, finaleWon: true } }, "ward"),
    ).toBeNull();
    expect(crucibleLock({ ...fresh, legacy: { ...fresh.legacy, wildfire: 4 } }, "ember")).toMatch(
      /Wildfire V/,
    );
    expect(
      crucibleLock({ ...fresh, legacy: { ...fresh.legacy, wildfire: 5 } }, "ember"),
    ).toBeNull();
  });

  it("Liora binds a learned Power into its own slot for Ash and Ember Coal", () => {
    const open = camp({ powerCodex: { echo: 3 } });
    const ember = { ...open, legacy: { ...open.legacy, wildfire: 5 } };
    expect(() => act(ember, { type: "bindPower", slot: "strike", powerId: "echo" })).toThrow(
      /ember slot/,
    );
    expect(() => act(open, { type: "bindPower", slot: "ember", powerId: "echo" })).toThrow(
      /Wildfire V/,
    );
    expect(() =>
      act({ ...ember, powerCodex: {} }, { type: "bindPower", slot: "ember", powerId: "echo" }),
    ).toThrow();
    const bound = act(ember, { type: "bindPower", slot: "ember", powerId: "echo" });
    expect(bound.hero.crucible).toEqual({ ember: "echo" });
    expect(bound.wallet.ash).toBe(1000 - crucibleBindCost(ember.legacy.prestige).ash);
    expect(bound.wallet.emberCoal).toBe(10 - CRUCIBLE.bindEmberCoal);
    const emptied = act(bound, { type: "bindPower", slot: "ember", powerId: null });
    expect(emptied.hero.crucible).toEqual({});
    expect(emptied.wallet.ash).toBe(bound.wallet.ash);
  });

  it("a bound Power works at its learned tier, but only once next to the same worn Power", () => {
    const base = camp({ powerCodex: { echo: 5 } });
    const open = { ...base, legacy: { ...base.legacy, wildfire: 5 } };
    const plain = heroSetup(open, data).setup;
    const bound = act(open, { type: "bindPower", slot: "ember", powerId: "echo" });
    const setup = heroSetup(bound, data).setup;
    expect(setup.rules?.ailmentEcho).toEqual([{ from: "bleed", to: "poison" }]);
    expect(setup.bonuses?.life ?? 0).toBeGreaterThan(plain.bonuses?.life ?? 0);
    // The same Power on a worn ring: the Crucible's copy rests.
    const ring = LEGENDARY(1);
    const worn = {
      ...bound,
      hero: { ...bound.hero, equipment: { ...bound.hero.equipment, ring1: ring } },
    };
    const wornOnly = {
      ...worn,
      hero: { ...worn.hero, crucible: {} },
    };
    expect(heroSetup(worn, data).setup.bonuses?.life).toBe(
      heroSetup(wornOnly, data).setup.bonuses?.life ?? fail("no life"),
    );
  });
});
