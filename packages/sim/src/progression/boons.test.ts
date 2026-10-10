import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import {
  BOONS,
  type BoonsState,
  EMPTY_BOONS,
  activeBoons,
  boonEffects,
  boonScale,
  boonText,
  rollBoonOffer,
} from "./boons";
import {
  type GameAction,
  type GameState,
  applyAction,
  deserializeGame,
  heroSetup,
  newGame,
  openBoonFamilies,
  rewardsDone,
} from "./game";
import { TEST_BOONS, TEST_BOON_DATA, TEST_BOON_FAMILIES } from "./test-fixtures";

const data = TEST_BOON_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const start = (seed = 1) => newGame(data, { seed, classId: "test-fighter" });
const spark = (id: string) => ({ id, grade: "spark" as const });

/** Wins a stage and takes every pick (first card, first Boon). */
function clearStage(state: GameState): GameState {
  let s = act(state, { type: "startStage" }, { type: "resolveFight" });
  if (!s.run) return s;
  s = act(s, { type: "salvageAll" });
  if (s.run?.rewards?.boonOffer?.length) s = act(s, { type: "pickBoon", index: 0 });
  return act(s, { type: "continue" });
}

describe("Stolen Fire Boons", () => {
  it("the same Boon raises its rank, an exclusive slot holds one Boon", () => {
    const boons: BoonsState = {
      kept: [spark("grit"), spark("crushing-blow")],
      fresh: [
        spark("grit"),
        { id: "grit", grade: "flame" },
        spark("grit"),
        spark("kindled-strikes"),
      ],
    };
    const active = activeBoons(boons, TEST_BOONS);
    expect(active.map((b) => [b.def.id, b.rank, b.grade])).toEqual([
      ["grit", BOONS.maxRank, "flame"],
      // Kindled Strikes replaced Crushing Blow in the Strike slot.
      ["kindled-strikes", 1, "spark"],
    ]);
    expect(boonScale(3, "flame")).toBeCloseTo(2 * 1.3);
    const grit = TEST_BOONS.find((b) => b.id === "grit");
    expect(grit && boonText(grit, 1.5)).toBe("+15 Armor");
  });

  it("Boons turn into bonuses, rules and triggers, scaled by rank and grade", () => {
    const active = activeBoons(
      {
        kept: [spark("grit"), spark("grit"), spark("crushing-blow")],
        fresh: [spark("iron-hearth")],
      },
      TEST_BOONS,
    );
    const fx = boonEffects(active);
    expect(fx.bonuses.armor).toBeCloseTo(15);
    expect(fx.rules?.skillCostMultiplier).toBeCloseTo(0.9);
    expect(fx.triggers).toEqual([
      expect.objectContaining({
        id: "boon-crushing-blow",
        effect: { kind: "weaponHit", multiplier: 1 },
      }),
    ]);
  });

  it("offers come from open families, skip maxed and locked Boons, Fusions need both families", () => {
    const offer = (active: BoonsState, open: string[], reactionSlot = false, seed = 1) =>
      rollBoonOffer(
        TEST_BOONS,
        TEST_BOON_FAMILIES,
        {
          open,
          active: activeBoons(active, TEST_BOONS),
          damageType: "physical",
          reactionSlot,
        },
        new Rng(seed),
      ).map((p) => p.id);
    for (let seed = 1; seed <= 40; seed++) {
      const ids = offer(EMPTY_BOONS, ["hearth"], false, seed);
      expect(ids).toEqual(["banked-coals"]);
      expect(offer(EMPTY_BOONS, ["hearth"], true, seed).sort()).toEqual(
        ["banked-coals", "second-wind"].sort(),
      );
      const maxed = { kept: [spark("grit"), spark("grit"), spark("grit")], fresh: [] };
      expect(offer(maxed, ["hearth", "ash"], false, seed)).not.toContain("grit");
      expect(offer(EMPTY_BOONS, ["hearth", "ash", "cinder"], false, seed)).not.toContain(
        "iron-hearth",
      );
    }
    const both = { kept: [spark("grit"), spark("banked-coals")], fresh: [] };
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++)
      offer(both, ["hearth", "ash"], false, seed).forEach((id) => seen.add(id));
    expect(seen.has("iron-hearth")).toBe(true);
  });

  it("Hearth is always open, each Warden family from its act on", () => {
    expect(openBoonFamilies(data, 1)).toEqual(["hearth", "ash"]);
    expect(openBoonFamilies(data, 2)).toEqual(["hearth", "ash", "cinder"]);
  });

  it("the Shrine follows Shrine stages and Elites, not the boss; the pick is needed to go on", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.rewards?.boonOffer).toBeUndefined();
    s = act(s, { type: "salvageAll" }, { type: "continue" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" }, { type: "salvageAll" });
    const offer = s.run?.rewards?.boonOffer ?? [];
    expect(offer.length).toBeGreaterThan(0);
    expect(s.run?.rewards && rewardsDone(s.run.rewards)).toBe(false);
    expect(() => act(s, { type: "continue" })).toThrow();
    s = act(s, { type: "pickBoon", index: 0 });
    expect(() => act(s, { type: "pickBoon", index: 0 })).toThrow(/taken/);
    expect(s.boons.fresh).toEqual([offer[0]]);
    expect(s.run?.rewards && rewardsDone(s.run.rewards)).toBe(true);
    // The boss's moment belongs to its Hoard and Echo: no Shrine.
    s = act(s, { type: "continue" }, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.encounter?.boss).toBe(true);
    expect(s.run?.rewards?.boonOffer).toBeUndefined();
  });

  it("death burns the current act's Boons, a cleared act keeps them", () => {
    const s = start();
    const withBoons: GameState = {
      ...s,
      boons: { kept: [spark("grit")], fresh: [spark("banked-coals")] },
    };
    expect(heroSetup(withBoons, data).setup.bonuses?.startingHeat).toBeCloseTo(30);
    // Retreat: the fresh Boon burns.
    let r = act(withBoons, { type: "setOut", actId: "test-act" }, { type: "retreat" });
    expect(r.boons).toEqual({ kept: [spark("grit")], fresh: [] });
    // Clearing the act keeps what was found there.
    r = act(withBoons, { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 3 && r.run; i++) r = clearStage(r);
    expect(r.run).toBeNull();
    expect(r.boons.fresh).toEqual([]);
    expect(r.boons.kept.slice(0, 2)).toEqual([spark("grit"), spark("banked-coals")]);
  });

  it("Revisit Act gives no Shrine", () => {
    let s: GameState = {
      ...start(),
      legacy: { ...start().legacy, prestige: 2 },
      progress: { ...start().progress, actsCleared: ["test-act"] },
    };
    s = act(s, { type: "setOut", actId: "test-act" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" }, { type: "salvageAll" });
    s = act(s, { type: "continue" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.rewards?.boonOffer).toBeUndefined();
  });

  it("v6 save games start without Boons", () => {
    const s = start();
    const v6 = { ...s, version: 6, boons: undefined };
    expect(deserializeGame(JSON.stringify(v6)).boons).toEqual(EMPTY_BOONS);
  });
});

describe("Boon chance scaling", () => {
  it("an ailment Boon gets a higher chance with rank, capped at 100 %", () => {
    const def = {
      id: "venom",
      name: "Venom",
      family: "ash",
      slot: "strike",
      text: "Attacks: # % chance to Poison",
      value: 40,
      trigger: {
        name: "Venom",
        condition: { kind: "everyNthAttack", n: 1 },
        chance: 0.4,
        effect: { kind: "ailment", ailment: "poison" },
      },
    } as const;
    const one = boonEffects(activeBoons({ kept: [spark("venom")], fresh: [] }, [def]));
    expect(one.triggers[0]?.chance).toBeCloseTo(0.4);
    const three = activeBoons(
      { kept: [{ id: "venom", grade: "blaze" }, spark("venom"), spark("venom")], fresh: [] },
      [def],
    );
    expect(boonEffects(three).triggers[0]?.chance).toBe(1);
    expect(boonText(def, three[0]?.scale ?? 1)).toBe("Attacks: 100 % chance to Poison");
  });
});
