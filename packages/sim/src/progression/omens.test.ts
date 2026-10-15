import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type GameAction,
  type GameData,
  type GameState,
  applyAction,
  enemySetup,
  fail,
  heroRotation,
  heroSetup,
  isOldAct,
  newGame,
  omenOffer,
  tripOmenEffects,
} from "./game";
import { minPeril, omenEffects, perilReward, type OmenDefinition } from "./omens";
import { TEST_BOON_DATA, TEST_BOSS } from "./test-fixtures";

/** Omens (neuausrichtung-v1.md 5.2 and 7.2). */

const RUN: readonly OmenDefinition[] = [
  {
    id: "stone",
    name: "Stoneflesh",
    kind: "run",
    price: "Enemies have +50 % Armor.",
    reward: "+50 % Ember Coal.",
    question: "Penetration?",
    enemy: { bonuses: { increasedArmor: 0.5 } },
    bonus: { emberCoal: 0.5 },
  },
  {
    id: "dry",
    name: "Dry Season",
    kind: "run",
    price: "Flask heals less.",
    reward: "Rests heal more.",
    question: "Lifesteal?",
    flaskHeal: 0.5,
    restHeal: 2,
  },
  {
    id: "moon",
    name: "Blood Moon",
    kind: "run",
    price: "Enemies are faster.",
    reward: "You are faster.",
    question: "Race?",
    enemy: { bonuses: { attackSpeed: 0.2 } },
    hero: { bonuses: { attackSpeed: 0.1 } },
  },
];

const WILD: readonly OmenDefinition[] = [
  {
    id: "giants",
    name: "Giants",
    kind: "wildfire",
    peril: 3,
    price: "+50 % Life.",
    question: "Damage?",
    enemy: { life: 1.5 },
  },
  {
    id: "parched",
    name: "Parched",
    kind: "wildfire",
    peril: 2,
    price: "No Flask.",
    question: "Sustain?",
    flaskHeal: 0,
  },
  {
    id: "silenced",
    name: "Silenced Ember",
    kind: "wildfire",
    peril: 3,
    price: "First slot locked.",
    question: "Second skill?",
    lockFirstSlot: true,
  },
  {
    id: "fuse",
    name: "Short Fuse",
    kind: "wildfire",
    peril: 2,
    price: "90 s.",
    question: "Fast?",
    fightSeconds: 90,
  },
];

const harmless = {
  ...TEST_BOSS,
  baseLife: 0.001,
  weapon: { ...TEST_BOSS.weapon, attacksPerSecond: 0 },
};
const data: GameData = {
  ...TEST_BOON_DATA,
  acts: TEST_BOON_DATA.acts.map((a) => ({ ...a, boss: harmless })),
  omens: [...RUN, ...WILD],
};
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const atPrestige = (prestige: number, extra: Partial<GameState["legacy"]> = {}): GameState => {
  const s = newGame(data, { seed: 5, classId: "test-fighter" });
  return { ...s, legacy: { ...s.legacy, prestige, ...extra } };
};

describe("Omen rules", () => {
  it("combine: multipliers multiply, rewards add up, the shortest time limit counts", () => {
    const e = omenEffects([RUN[0], RUN[1], WILD[0], WILD[3]].filter((o) => o !== undefined));
    expect(e.enemy.life).toBeCloseTo(1.5);
    expect(e.enemy.bonuses?.increasedArmor).toBeCloseTo(0.5);
    expect(e.flaskHeal).toBeCloseTo(0.5);
    expect(e.restHeal).toBeCloseTo(2);
    expect(e.bonus.emberCoal).toBeCloseTo(0.5);
    expect(e.fightSeconds).toBe(90);
    expect(omenEffects([]).fightSeconds).toBeUndefined();
  });

  it("the Wildfire pays per Peril: XP, Legendary chance, a Rune rank per 4", () => {
    expect(perilReward(5)).toMatchObject({ runeTiers: 1 });
    expect(perilReward(5).xp).toBeCloseTo(0.4);
    expect(perilReward(5).legendary).toBeCloseTo(0.25);
    expect(omenEffects(WILD.slice(0, 2), true).bonus.legendary).toBeCloseTo(0.25);
    expect(omenEffects(WILD.slice(0, 2)).bonus.legendary).toBe(0);
  });

  it("Peril per tier: none up to V, then 2 more per tier up to 10", () => {
    expect([1, 5, 6, 7, 8, 9, 10].map(minPeril)).toEqual([0, 0, 2, 4, 6, 8, 10]);
  });
});

describe("Run Omens", () => {
  it("only old acts take an Omen: the newest act of the run has none", () => {
    expect(isOldAct(atPrestige(0), data, "test-act")).toBe(false);
    expect(isOldAct(atPrestige(2), data, "test-act")).toBe(true);
    expect(isOldAct(atPrestige(2), data, "final-act")).toBe(false);
    expect(omenOffer(atPrestige(0), data, "test-act")).toEqual([]);
  });

  it("Eldrin shows two different Run Omens, the same ones for the whole run", () => {
    const s = atPrestige(2);
    const offer = omenOffer(s, data, "test-act");
    expect(offer).toHaveLength(2);
    expect(new Set(offer).size).toBe(2);
    expect(offer.every((id) => RUN.some((o) => o.id === id))).toBe(true);
    expect(omenOffer({ ...s, nonce: s.nonce + 9 }, data, "test-act")).toEqual(offer);
  });

  it("setting out into an old act takes one of the two", () => {
    const s = atPrestige(2);
    const offer = omenOffer(s, data, "test-act");
    const other = RUN.find((o) => !offer.includes(o.id))?.id ?? fail("missing");
    expect(() => act(s, { type: "setOut", actId: "test-act" })).toThrow(/one of the two/);
    expect(() => act(s, { type: "setOut", actId: "test-act", omens: [other] })).toThrow(
      /one of the two/,
    );
    const out = act(s, { type: "setOut", actId: "test-act", omens: [offer[0] ?? ""] });
    expect(out.run?.omens).toEqual([offer[0]]);
    expect(() =>
      act(atPrestige(0), { type: "setOut", actId: "test-act", omens: ["stone"] }),
    ).toThrow(/No Omen/);
  });

  it("change the enemy, the hero, the Flask and the loot", () => {
    const run = (omens: string[], extra: Partial<GameState> = {}): GameState => ({
      ...atPrestige(2),
      ...extra,
      run: {
        actId: "test-act",
        stage: 1,
        lifeFraction: 0.2,
        phase: "intermission",
        encounter: null,
        rewards: null,
        omens,
      },
    });
    const fought = act(run(["stone", "moon"]), { type: "startStage" });
    const encounter = fought.run?.encounter ?? fail("missing");
    expect(encounter.omens).toEqual(["stone", "moon"]);
    const plain = enemySetup({ ...encounter, omens: [] }, "test-act", data);
    const omened = enemySetup(encounter, "test-act", data);
    expect(omened.bonuses?.increasedArmor).toBeCloseTo((plain.bonuses?.increasedArmor ?? 0) + 0.5);
    expect(omened.bonuses?.attackSpeed).toBeCloseTo((plain.bonuses?.attackSpeed ?? 0) + 0.2);
    const hero = heroSetup(fought, data).setup;
    expect(hero.bonuses?.attackSpeed).toBeCloseTo(
      (heroSetup({ ...fought, run: null }, data).setup.bonuses?.attackSpeed ?? 0) + 0.1,
    );
    // Dry Season: the Flask heals half.
    const drank = act(run(["dry"]), { type: "useFlask" });
    expect(drank.run?.lifeFraction).toBeCloseTo(0.2 + PROGRESSION.flaskHeal * 0.5);
    expect(tripOmenEffects(run(["dry"]), data).restHeal).toBe(2);
  });
});

describe("Wildfire Omens", () => {
  const finale = (wildfire: number) =>
    atPrestige(PROGRESSION.finalPrestige, { finaleWon: true, wildfire });

  it("tiers above V ask for their Peril; only Wildfire Omens burn there", () => {
    const s = finale(9);
    const out = (tier: number, omens: string[]) =>
      act(s, { type: "setOut", actId: "test-act", wildfire: tier, omens });
    expect(out(5, []).run?.omens).toBeUndefined();
    expect(() => out(6, [])).toThrow(/at least 2 Peril/);
    expect(out(6, ["parched"]).run?.omens).toEqual(["parched"]);
    expect(() => out(7, ["parched"])).toThrow(/at least 4 Peril/);
    expect(out(7, ["parched", "giants"]).run?.omens).toEqual(["parched", "giants"]);
    expect(() => out(6, ["stone"])).toThrow(/Only Wildfire Omens/);
    expect(() => out(6, ["giants", "giants"])).toThrow(/only once/);
  });

  it("Parched takes the Flask, Silenced Ember the first slot, Short Fuse sets a time limit", () => {
    const s = finale(1);
    const parched = act(s, { type: "setOut", actId: "test-act", wildfire: 1, omens: ["parched"] });
    const hurt = { ...parched, run: { ...(parched.run ?? fail("missing")), lifeFraction: 0.3 } };
    expect(() => act(hurt, { type: "useFlask" })).toThrow(/Parched/);
    const plain = act(s, { type: "setOut", actId: "test-act", wildfire: 1 });
    const silenced = act(s, {
      type: "setOut",
      actId: "test-act",
      wildfire: 1,
      omens: ["silenced", "fuse"],
    });
    const weapon = heroSetup(plain, data).setup.weapon;
    expect(heroRotation(silenced, data, weapon).length).toBe(
      heroRotation(plain, data, weapon).length - 1,
    );
    expect(heroSetup(silenced, data).setup.timeLimit).toBe(90);
    expect(heroSetup(plain, data).setup.timeLimit).toBeUndefined();
  });

  it("Peril pays more XP", () => {
    const s = finale(1);
    const win = (omens: string[]) => {
      let t = act(s, { type: "setOut", actId: "test-act", wildfire: 1, omens });
      // The (harmless) act boss.
      t = { ...t, run: { ...(t.run ?? fail("missing")), stage: 3 } };
      t = act(t, { type: "startStage" }, { type: "resolveFight" });
      return t.run?.rewards?.xp ?? fail("no rewards");
    };
    // Giants: 3 Peril, +24 % XP.
    expect(win(["giants"])).toBe(Math.round(win([]) * (1 + 3 * 0.08)));
  });
});
