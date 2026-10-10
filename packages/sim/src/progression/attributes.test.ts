import { describe, expect, it } from "vitest";
import { ZERO_ATTRIBUTES } from "../combat/test-fixtures";
import type { Attributes } from "../combat/types";
import { ATTRIBUTE_RULES, combatAttributes, heroPerks, movedPoints } from "./attributes";
import type { BoonDefinition } from "./boons";
import {
  type GameAction,
  type GameState,
  applyAction,
  attributeRespecAcorns,
  deserializeGame,
  heroSetup,
  newGame,
  SAVE_VERSION,
} from "./game";
import { TEST_BOON_DATA, TEST_GAME_DATA as data, withOldCurrencies } from "./test-fixtures";

const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
/** The test class: Strength 6, Vitality 6, the rest 0. */
const fresh = () => newGame(data, { seed: 1, classId: "test-fighter" });
const floor = () => fresh().hero.attributes;
const plus = (a: Attributes, b: Partial<Attributes>): Attributes => ({
  ...a,
  ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, a[k as keyof Attributes] + v])),
});
const harvest = (s: GameState): GameState => ({
  ...s,
  pendingPrestige: { actId: "test-act", stage: 15, enemyName: "Boss" },
});

describe("Attributes v1", () => {
  it("creation: the Class Array plus 6 free points, none above 7", () => {
    const s = newGame(data, {
      seed: 1,
      classId: "test-fighter",
      attributes: { strength: 1, dexterity: 4, agility: 1 },
    });
    expect(s.hero.attributes).toMatchObject({ strength: 7, dexterity: 4, agility: 1 });
    expect(s.hero.unspentAttributePoints).toBe(0);
    expect(() =>
      newGame(data, { seed: 1, classId: "test-fighter", attributes: { strength: 2 } }),
    ).toThrow(/At most 7/);
    expect(() =>
      newGame(data, { seed: 1, classId: "test-fighter", attributes: { dexterity: 7 } }),
    ).toThrow(/Not enough/);
    // Left out, the free points wait.
    expect(fresh().hero.unspentAttributePoints).toBe(ATTRIBUTE_RULES.creationPoints);
  });

  it("no attribute goes above 10 with own points", () => {
    const s = act(fresh(), { type: "allocateAttributes", points: { strength: 4 } });
    expect(s.hero.attributes.strength).toBe(10);
    expect(() => act(s, { type: "allocateAttributes", points: { strength: 1 } })).toThrow(
      /At most 10/,
    );
  });

  it("The Harvest: two new points, none moved", () => {
    const s = harvest(
      act(fresh(), { type: "allocateAttributes", points: { vitality: 4, wisdom: 2 } }),
    );
    const before = s.hero.attributes;
    const after = plus(before, { dexterity: 2 });
    const done = act(s, { type: "prestige", attributes: after });
    expect(done.hero.attributes).toEqual(after);
    expect(done.hero.unspentAttributePoints).toBe(0);
    // Moving points is Kaelen's respec now, and nothing goes below the Class Array.
    expect(() =>
      act(s, {
        type: "prestige",
        attributes: plus(before, { wisdom: -1, dexterity: 3 }),
      }),
    ).toThrow(/moved/);
    expect(() =>
      act(s, {
        type: "prestige",
        attributes: plus(before, { strength: -1, dexterity: 1 }),
      }),
    ).toThrow(/Class Array/);
    // Without a choice the new points wait.
    const later = act(s, { type: "prestige" });
    expect(later.hero.unspentAttributePoints).toBe(2);
  });

  it("Attribute respec at Kaelen: every point above the Class Array anew, for Acorns", () => {
    let s = act(fresh(), { type: "allocateAttributes", points: { strength: 4, vitality: 2 } });
    const target = plus(floor(), { dexterity: 3, intelligence: 3 });
    const price = attributeRespecAcorns(0);
    expect(() => act(s, { type: "respecAttributes", attributes: target })).toThrow(/Acorns/);
    s = { ...s, wallet: { ...s.wallet, acorns: price } };
    s = act(s, { type: "respecAttributes", attributes: target });
    expect(s.hero.attributes).toEqual(target);
    expect(s.hero.unspentAttributePoints).toBe(0);
    expect(s.wallet.acorns).toBe(0);
    expect(() =>
      act(
        { ...s, wallet: { ...s.wallet, acorns: price } },
        { type: "respecAttributes", attributes: plus(floor(), { dexterity: 7 }) },
      ),
    ).toThrow(/Not enough Attribute/);
  });

  it("gear lifts attributes up to 12 but never opens a Perk; Blaze Boons do", () => {
    const own = { ...ZERO_ATTRIBUTES, strength: 9, agility: 3 };
    expect(combatAttributes(own, {}, { strength: 5, agility: 1 })).toMatchObject({
      strength: ATTRIBUTE_RULES.itemMax,
      agility: 4,
    });
    expect(heroPerks(own, {})).toEqual(["armorbreaker", "stoneguard"]);
    expect(heroPerks(own, { strength: 1, agility: 1 })).toEqual([
      "armorbreaker",
      "stoneguard",
      "titan",
      "quickReflexes",
    ]);
    expect(movedPoints(own, { ...own, strength: 7, agility: 5 })).toBe(2);
  });

  it("the hero's fight uses the heir scale and the Perks of own points and Boons", () => {
    const boon: BoonDefinition = {
      id: "stolen-might",
      name: "Stolen Might",
      family: "hearth",
      slot: "passive",
      text: "+# Strength",
      value: 1,
      attributes: { strength: 1 },
      grade: "blaze",
      maxRank: 2,
    };
    const boonData = { ...TEST_BOON_DATA, boons: [...(TEST_BOON_DATA.boons ?? []), boon] };
    const s: GameState = {
      ...fresh(),
      boons: { kept: [{ id: "stolen-might", grade: "blaze" }], fresh: [] },
    };
    const { setup } = heroSetup(s, boonData);
    expect(setup.attributeScale).toBe("heir");
    expect(setup.attributes.strength).toBe(7);
    expect(setup.perks).toEqual(["armorbreaker", "stoneguard", "secondBreath"]);
  });

  it("migrates v10 saves: back to the Class Array with the points of every Prestige", () => {
    const s = act(fresh(), { type: "allocateAttributes", points: { strength: 4 } });
    const v10 = {
      ...withOldCurrencies(s),
      version: 10,
      hero: { ...s.hero, attributes: { ...s.hero.attributes, strength: 80 } },
      legacy: { ...s.legacy, prestige: 3 },
    };
    const migrated = deserializeGame(JSON.stringify(v10), data);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.hero.attributes).toEqual(floor());
    expect(migrated.hero.unspentAttributePoints).toBe(6 + 3 * 2);
  });
});
