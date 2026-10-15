import { describe, expect, it } from "vitest";
import { GREATER, greaterRank, rawAffixValue, statAffixValue } from "../items/affixes";
import { itemModifiers } from "../items/equipment";
import type { Item } from "../items/types";
import { CRAFTING, PROGRESSION } from "./constants";
import { type GameAction, type GameState, applyAction, fail, newGame } from "./game";
import { TEST_BOON_DATA, TEST_BOSS, TEST_GAME_DATA } from "./test-fixtures";

/** Greater Affixes and Cinderglass (neuausrichtung-v1.md 7.5). */

const data = TEST_GAME_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

const RING: Item = {
  id: "ring-1",
  baseId: "test-ring",
  name: "Ash Bite",
  rarity: "rare",
  itemLevel: 5,
  tier: 1,
  affixes: [
    { affixId: "strength", quality: 0.2 },
    { affixId: "life", quality: 0.5 },
    { affixId: "searing-crit", quality: 0.5 },
  ],
};

function camp(cinderglass: number, item: Item = RING): GameState {
  const s = newGame(data, { seed: 4, classId: "test-fighter" });
  return {
    ...s,
    progress: { ...s.progress, trainerUnlocked: true },
    wallet: { ...s.wallet, cinderglass },
    inventory: [{ item, x: 0, y: 0 }],
  };
}
const ring = (s: GameState) => s.inventory.find((p) => p.item.id === RING.id)?.item ?? fail("gone");
const craft = (kind: "awaken" | "shift" | "intensify") =>
  ({ type: "craft", request: { kind, itemId: RING.id } }) as const;

describe("Greater Affix values", () => {
  it("Greater I is 110 % of the tier's best roll, each rank +10 %, V = 150 %", () => {
    const life = data.items.affixes.get("life");
    if (life?.kind !== "stat") return fail("no life affix");
    const best = rawAffixValue(life, 3, 1);
    expect(statAffixValue(life, 3, 0.1, "rare", 1)).toBe(Math.round(best * 1.1));
    expect(statAffixValue(life, 3, 0.1, "rare", GREATER.maxRank)).toBe(Math.round(best * 1.5));
    expect(greaterRank({ ...RING, greater: { index: 1, rank: 3 } }, 1)).toBe(3);
    expect(greaterRank({ ...RING, greater: { index: 1, rank: 3 } }, 0)).toBe(0);
  });

  it("count on the worn item", () => {
    const plain = itemModifiers(RING, data.items).bonuses.life ?? 0;
    const greater = itemModifiers({ ...RING, greater: { index: 1, rank: 2 } }, data.items).bonuses
      .life;
    expect(greater).toBeGreaterThan(plain);
  });
});

describe("Liora's Greater crafts", () => {
  it("Awaken: a random affix becomes Greater I for 3 Cinderglass", () => {
    expect(() => act(camp(2), craft("awaken"))).toThrow(/cinderglass/);
    const s = act(camp(3), craft("awaken"));
    expect(ring(s).greater).toMatchObject({ rank: 1 });
    expect(s.wallet.cinderglass).toBe(0);
    expect(() => act({ ...s, wallet: { ...s.wallet, cinderglass: 9 } }, craft("awaken"))).toThrow(
      /greater/,
    );
  });

  it("Shift moves it to another affix and keeps the rank; Intensify raises it up to V", () => {
    const start = camp(100, { ...RING, greater: { index: 0, rank: 2 } });
    const shifted = act(start, craft("shift"));
    expect(ring(shifted).greater?.index).not.toBe(0);
    expect(ring(shifted).greater?.rank).toBe(2);
    expect(shifted.wallet.cinderglass).toBe(100 - CRAFTING.greater.shift);
    let s = start;
    for (let rank = 3; rank <= 5; rank++) s = act(s, craft("intensify"));
    expect(ring(s).greater?.rank).toBe(5);
    expect(s.wallet.cinderglass).toBe(100 - 4 - 8 - 16);
    expect(() => act(s, craft("intensify"))).toThrow(/maxGreater/);
    expect(() => act(camp(100), craft("intensify"))).toThrow(/noGreater/);
  });

  it("Reforge keeps the Greater rank on a new affix", () => {
    const s = act(
      {
        ...camp(0, { ...RING, greater: { index: 2, rank: 4 } }),
        wallet: { ...camp(0).wallet, emberCoal: CRAFTING.emberCoal },
      },
      { type: "craft", request: { kind: "reforge", itemId: RING.id } },
    );
    expect(ring(s).greater?.rank).toBe(4);
    expect(ring(s).greater?.index).toBeLessThan(ring(s).affixes.length);
  });
});

describe("Cinderglass", () => {
  const harmless = {
    ...TEST_BOSS,
    baseLife: 0.001,
    weapon: { ...TEST_BOSS.weapon, attacksPerSecond: 0 },
  };
  const wild = {
    ...TEST_BOON_DATA,
    acts: TEST_BOON_DATA.acts.map((a) => ({ ...a, boss: harmless })),
  };

  it("drops only from a Wildfire boss", () => {
    const s0 = newGame(wild, { seed: 5, classId: "test-fighter" });
    const finale: GameState = {
      ...s0,
      legacy: { ...s0.legacy, prestige: PROGRESSION.finalPrestige, finaleWon: true, wildfire: 9 },
    };
    const boss = (tier: number) => {
      let s = applyAction(finale, wild, { type: "setOut", actId: "test-act", wildfire: tier });
      s = { ...s, run: { ...(s.run ?? fail("missing")), stage: 3 } };
      s = applyAction(s, wild, { type: "startStage" });
      return applyAction(s, wild, { type: "resolveFight" });
    };
    const one = boss(1);
    const [lo, hi] = PROGRESSION.wildfire.cinderglass.boss;
    expect(one.wallet.cinderglass).toBeGreaterThanOrEqual(lo);
    expect(one.wallet.cinderglass).toBeLessThanOrEqual(hi);
    expect(one.run?.rewards?.cinderglass).toBe(one.wallet.cinderglass);
    // Pinnacles (VIII–X) give one more.
    expect(boss(9).wallet.cinderglass).toBeGreaterThanOrEqual(lo + 1);
  });
});
