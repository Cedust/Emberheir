import { describe, expect, it } from "vitest";
import {
  ASHBORN,
  type AshbornValue,
  ashbornEffects,
  ashbornUnspent,
  ashbornXpToNext,
  EMPTY_ASHBORN,
  gainAshbornXp,
} from "./ashborn";
import { PROGRESSION } from "./constants";
import { type GameData, type GameState, applyAction, fail, heroSetup, newGame } from "./game";
import { TEST_BOON_DATA, TEST_BOSS } from "./test-fixtures";

/** Ashborn (neuausrichtung-v1.md 7.3). */

const VALUES: readonly AshbornValue[] = [
  {
    id: "life",
    name: "Life",
    board: "aegis",
    text: "+2 % Life",
    perPoint: { bonuses: { increasedLife: 0.02 } },
  },
  {
    id: "maxres",
    name: "Max Resistance",
    board: "aegis",
    text: "+1/3 %",
    perPoint: { maxResistance: 0.05 / 15 },
  },
  { id: "flask", name: "Flask", board: "mending", text: "+3 %", perPoint: { flaskHeal: 0.03 } },
  { id: "cost", name: "Skill Cost", board: "ignite", text: "-1 %", perPoint: { skillCost: 0.01 } },
];

const harmless = {
  ...TEST_BOSS,
  baseLife: 0.001,
  weapon: { ...TEST_BOSS.weapon, attacksPerSecond: 0 },
};
const data: GameData = {
  ...TEST_BOON_DATA,
  acts: TEST_BOON_DATA.acts.map((a) => ({ ...a, boss: harmless, enemies: [harmless] })),
  ashbornValues: VALUES,
};

const hero100 = (ashborn = EMPTY_ASHBORN, acorns = 0): GameState => {
  const s = newGame(data, { seed: 3, classId: "test-fighter" });
  return {
    ...s,
    hero: { ...s.hero, level: 100, xp: 0, ashborn },
    wallet: { ...s.wallet, acorns },
    legacy: { ...s.legacy, prestige: PROGRESSION.finalPrestige, finaleWon: true },
  };
};

describe("Ashborn rules", () => {
  it("every level costs 4 % of the first one more, and the top is 100", () => {
    expect(ashbornXpToNext(0)).toBe(ASHBORN.baseXp);
    expect(ashbornXpToNext(10)).toBe(Math.round(ASHBORN.baseXp * 1.4));
    expect(ashbornXpToNext(ASHBORN.maxLevel)).toBe(Infinity);
    const two = ashbornXpToNext(0) + ashbornXpToNext(1);
    expect(gainAshbornXp(EMPTY_ASHBORN, two + 5)).toMatchObject({
      ashborn: { level: 2, xp: 5 },
      levelsGained: 2,
    });
    const top = gainAshbornXp({ ...EMPTY_ASHBORN, level: 99 }, 1e9).ashborn;
    expect(top).toMatchObject({ level: 100, xp: 0 });
  });

  it("points become stats, rules and Flask healing", () => {
    const e = ashbornEffects(
      { level: 30, xp: 0, points: { life: 10, maxres: 15, flask: 5, cost: 10 } },
      VALUES,
    );
    expect(e.bonuses.increasedLife).toBeCloseTo(0.2);
    expect(e.rules.maxResistance?.fire).toBeCloseTo(0.05);
    expect(e.rules.skillCostMultiplier).toBeCloseTo(0.9);
    expect(e.flaskHeal).toBeCloseTo(1.15);
    expect(
      ashbornUnspent({ level: 45, xp: 0, points: { life: 10, maxres: 15, flask: 5, cost: 10 } }),
    ).toBe(5);
  });
});

describe("Ashborn in the game", () => {
  it("XP after level 100 becomes Ashborn Levels", () => {
    let s = applyAction(hero100({ ...EMPTY_ASHBORN, xp: ASHBORN.baseXp - 1 }), data, {
      type: "setOut",
      actId: "test-act",
    });
    s = applyAction(s, data, { type: "startStage" });
    s = applyAction(s, data, { type: "resolveFight" });
    expect(s.hero.level).toBe(100);
    expect(s.hero.ashborn?.level).toBe(1);
    expect(s.run?.rewards?.ashbornLevels).toBe(1);
  });

  it("points go into a value up to 15, never more than earned", () => {
    let s = hero100({ level: 20, xp: 0, points: {} });
    s = applyAction(s, data, { type: "spendAshborn", valueId: "life", count: 15 });
    expect(s.hero.ashborn?.points).toEqual({ life: 15 });
    expect(() => applyAction(s, data, { type: "spendAshborn", valueId: "life" })).toThrow(
      /At most 15/,
    );
    s = applyAction(s, data, { type: "spendAshborn", valueId: "flask", count: 5 });
    expect(() => applyAction(s, data, { type: "spendAshborn", valueId: "cost" })).toThrow(
      /No Ashborn/,
    );
    expect(() => applyAction(s, data, { type: "spendAshborn", valueId: "nope" })).toThrow(
      /Unknown/,
    );
    const plain = heroSetup(hero100(), data).setup;
    expect(heroSetup(s, data).setup.bonuses?.increasedLife).toBeCloseTo(
      (plain.bonuses?.increasedLife ?? 0) + 0.3,
    );
  });

  it("Old Nan gives every point back for Acorns", () => {
    const spent = hero100({ level: 10, xp: 0, points: { life: 10 } }, ASHBORN.resetAcorns);
    const reset = applyAction(spent, data, { type: "resetAshborn" });
    expect(reset.hero.ashborn).toMatchObject({ level: 10, points: {} });
    expect(reset.wallet.acorns).toBe(0);
    expect(() =>
      applyAction({ ...spent, wallet: { ...spent.wallet, acorns: 0 } }, data, {
        type: "resetAshborn",
      }),
    ).toThrow(/Acorns/);
    expect(() => applyAction(reset, data, { type: "resetAshborn" })).toThrow(/No Ashborn/);
  });

  it("the Flask heals more with Mending points", () => {
    const at = (points: Record<string, number>) => {
      const s = applyAction(hero100({ level: 20, xp: 0, points }), data, {
        type: "setOut",
        actId: "test-act",
      });
      const hurt = { ...s, run: { ...(s.run ?? fail("missing")), lifeFraction: 0.1 } };
      return applyAction(hurt, data, { type: "useFlask" }).run?.lifeFraction ?? 0;
    };
    expect(at({ flask: 10 }) - 0.1).toBeCloseTo((at({}) - 0.1) * 1.3);
  });
});
