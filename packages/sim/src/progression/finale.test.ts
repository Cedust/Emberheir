import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type GameAction,
  type GameData,
  type GameState,
  applyAction,
  fail,
  finaleEchoes,
  finaleOpen,
  newGame,
} from "./game";
import { DEADLY_ENEMY, TEST_ACT, TEST_BOON_DATA, TEST_BOSS } from "./test-fixtures";

const FINALE = {
  ...TEST_ACT,
  id: "test-finale",
  number: 99,
  name: "The Last Ember",
  stages: 4,
  enemies: [],
  spoilsStages: [],
  boss: { ...TEST_BOSS, id: "core", name: "The Core" },
};
// The finale fights at the last run's Monster Level; harmless foes keep the test about the flow.
const harmless = {
  ...TEST_BOSS,
  baseLife: 0.001,
  weapon: { ...TEST_BOSS.weapon, attacksPerSecond: 0 },
};
const data: GameData = {
  ...TEST_BOON_DATA,
  acts: TEST_BOON_DATA.acts.map((a) => ({ ...a, boss: harmless })),
  finale: { ...FINALE, boss: { ...harmless, id: "core", name: "The Core" } },
  bossAbilities: ["a", "b", "c", "d", "e", "f"].map((id) => ({
    id,
    name: id,
    description: "",
    bonuses: { tenacity: 0.01 },
  })),
};
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const atPrestige = (prestige: number, d: GameData = data): GameState => {
  const s = newGame(d, { seed: 3, starterWeapon: "test-sword" });
  return { ...s, legacy: { ...s.legacy, prestige } };
};

describe("The Last Ember", () => {
  it("opens with the final Prestige and counts attempts", () => {
    expect(finaleOpen(atPrestige(9), data)).toBe(false);
    expect(() => act(atPrestige(9), { type: "enterFinale" })).toThrow(/not in reach/);
    const s = act(atPrestige(PROGRESSION.finalPrestige), { type: "enterFinale" });
    expect(s.run).toMatchObject({ actId: "test-finale", stage: 1, phase: "intermission" });
    expect(s.legacy.finaleAttempts).toBe(1);
  });

  it("a gauntlet of Warden echoes, one boss ability more each, then the Core; Stolen Fire after each win", () => {
    let s = act(atPrestige(PROGRESSION.finalPrestige), { type: "enterFinale" });
    const echoes = finaleEchoes(data);
    expect(echoes.map((a) => a.id)).toEqual(["test-act", "deadly-act", "final-act"]);
    for (let stage = 1; stage < FINALE.stages; stage++) {
      s = act(s, { type: "startStage" });
      expect(s.run?.encounter).toMatchObject({ echo: echoes[stage - 1]?.id, boss: true });
      expect(s.run?.encounter?.eliteModifiers).toHaveLength(stage);
      s = act(s, { type: "resolveFight" });
      const rewards = s.run?.rewards ?? fail("missing");
      expect(rewards.items).toEqual([]);
      expect(rewards.xp).toBe(0);
      expect(rewards.boonOffer?.length).toBeGreaterThan(0);
      // Every family is open, the Cinder one too (its act never ran).
      s = act(s, { type: "pickBoon", index: 0 }, { type: "continue" });
      expect(s.boons.fresh).toHaveLength(stage);
    }
    s = act(s, { type: "startStage" });
    expect(s.run?.encounter).toMatchObject({ enemyId: "core", boss: true });
    expect(s.run?.encounter?.echo).toBeUndefined();
    s = act(s, { type: "resolveFight" });
    expect(s.run).toBeNull();
    expect(s.notice).toMatchObject({ kind: "ending", enemyName: "The Core" });
    expect(s.legacy.finaleWon).toBe(true);
    expect(s.boons).toEqual({ kept: [], fresh: [] });
  });

  it("a death ends the attempt: back to the Camp, the Boons are gone", () => {
    const deadly: GameData = {
      ...data,
      finale: { ...FINALE, stages: 1, boss: { ...DEADLY_ENEMY, id: "core", boss: true } },
    };
    let s = applyAction(atPrestige(PROGRESSION.finalPrestige, deadly), deadly, {
      type: "enterFinale",
    });
    s = { ...s, boons: { kept: [], fresh: [{ id: "grit", grade: "spark" }] } };
    s = applyAction(applyAction(s, deadly, { type: "startStage" }), deadly, {
      type: "resolveFight",
    });
    expect(s.run).toBeNull();
    expect(s.notice?.kind).toBe("death");
    expect(s.boons.fresh).toEqual([]);
    expect(s.legacy.finaleWon).toBeUndefined();
  });

  it("the final Prestige burns nothing and seals every slot; no harvest after it", () => {
    const base = atPrestige(PROGRESSION.finalPrestige - 1);
    const s0: GameState = {
      ...base,
      pendingPrestige: { actId: "final-act", stage: 3, enemyName: "Boss" },
      wallet: { ...base.wallet, gold: 500 },
    };
    const s = act(s0, { type: "prestige", sealedSlots: [] });
    expect(s.legacy.prestige).toBe(PROGRESSION.finalPrestige);
    expect(s.hero.equipment).toEqual(s0.hero.equipment);
    expect(s.wallet.gold).toBe(500);
    expect(s.legacy.seals).toEqual([...data.equipmentSlots]);
    expect(s.notice?.kind).toBe("prestige");

    // Beating the run's last boss again only clears the act.
    let r = act(
      { ...s, notice: null, progress: { ...s.progress, actsCleared: ["test-act", "deadly-act"] } },
      {
        type: "setOut",
        actId: "final-act",
      },
    );
    r = { ...r, run: { ...(r.run ?? fail("missing")), stage: 3 } };
    r = act(r, { type: "startStage" }, { type: "resolveFight" }, { type: "salvageAll" });
    if (r.run?.rewards?.spoils.length) r = act(r, { type: "pickSpoils", index: 0 });
    if (r.run?.rewards?.boonOffer?.length) r = act(r, { type: "pickBoon", index: 0 });
    while (r.run?.rewards && !r.run.rewards.itemPick) r = act(r, { type: "salvageAll" });
    r = act(r, { type: "continue" });
    expect(r.pendingPrestige).toBeNull();
    expect(r.notice?.kind).toBe("actCleared");
  });
});
