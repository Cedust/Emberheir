import { describe, expect, it } from "vitest";
import { COMBAT } from "../combat/constants";
import { deriveStats } from "../combat/stats";
import type { EnemyDefinition } from "../combat/monsters";
import { DRAUGHT_FLASK_COST, type DraughtDefinition, enemyHitsWith } from "./draughts";
import {
  type GameData,
  type GameState,
  activeDraught,
  applyAction,
  draughtAcorns,
  flaskCapacity,
  heroSetup,
  knownDraughts,
  newGame,
} from "./game";
import { TEST_ACT, TEST_GAME_DATA, WEAK_ENEMY } from "./test-fixtures";

const IRON: DraughtDefinition = {
  id: "iron",
  name: "Iron Draught",
  description: "+25 % Armor",
  explain: "",
  color: 0,
  bonuses: { increasedArmor: 0.25, armor: 50 },
};
const FIRE: DraughtDefinition = {
  id: "fire",
  name: "Fire Draught",
  description: "",
  explain: "",
  color: 0,
  bonuses: { fireResistance: 2 },
  rules: { maxResistance: { fire: 0.05 } },
  element: "fire",
};
/** A foe whose spell burns, though its stick hits Physical. */
const SPITTER: EnemyDefinition = {
  ...WEAK_ENEMY,
  id: "spitter",
  skills: [
    {
      id: "spit",
      name: "Spit",
      type: "spell",
      heatCost: 50,
      tags: [],
      description: "",
      hits: [{ kind: "spell", damage: { min: 1, max: 1 }, damageType: "fire" }],
    },
  ],
};
const data: GameData = {
  ...TEST_GAME_DATA,
  acts: TEST_GAME_DATA.acts.map((a) =>
    a.id === TEST_ACT.id ? { ...a, enemies: [...a.enemies, SPITTER] } : a,
  ),
  draughts: [IRON, FIRE],
};

/** After the first Prestige, with Acorns to spare and the Spitter beaten. */
const prestiged = (): GameState => {
  const s = newGame(data, { seed: 1, classId: "test-fighter" });
  return {
    ...s,
    wallet: { ...s.wallet, acorns: 10_000 },
    legacy: { ...s.legacy, prestige: 1, hunts: { spitter: 1 } },
  };
};

describe("Draughts", () => {
  it("open with the first Prestige and are chosen in the Camp only", () => {
    const fresh = newGame(data, { seed: 1, classId: "test-fighter" });
    expect(() => applyAction(fresh, data, { type: "chooseDraught", draughtId: "iron" })).toThrow(
      /first Prestige/,
    );
    const s = applyAction(prestiged(), data, { type: "chooseDraught", draughtId: "iron" });
    expect(s.draught).toBe("iron");
    const out = applyAction(s, data, { type: "setOut", actId: "test-act" });
    expect(() => applyAction(out, data, { type: "chooseDraught", draughtId: null })).toThrow(
      /Camp/,
    );
  });

  it("a set-out brews it from one Flask charge; it works until the Camp", () => {
    let s = applyAction(prestiged(), data, { type: "chooseDraught", draughtId: "iron" });
    const without = deriveStats(heroSetup(s, data).setup).armor;
    s = applyAction(s, data, { type: "setOut", actId: "test-act" });
    expect(s.flaskCharges).toBe(flaskCapacity(s, data) - DRAUGHT_FLASK_COST);
    expect(s.wallet.acorns).toBe(10_000 - draughtAcorns(s));
    expect(activeDraught(s, data)?.id).toBe("iron");
    expect(deriveStats(heroSetup(s, data).setup).armor).toBeGreaterThan(without);
    // Back in the Camp it is gone, but stays chosen for the next trip.
    s = applyAction(s, data, { type: "retreat" });
    expect(activeDraught(s, data)).toBeUndefined();
    expect(s.draught).toBe("iron");
  });

  it("an element Draught raises that element's Resistance cap", () => {
    let s = applyAction(prestiged(), data, { type: "chooseDraught", draughtId: "fire" });
    s = applyAction(s, data, { type: "setOut", actId: "test-act" });
    const stats = deriveStats(heroSetup(s, data).setup);
    expect(stats.fireResistance).toBeCloseTo(COMBAT.maxResistance + 0.05);
    expect(stats.coldResistance).toBeLessThan(COMBAT.maxResistance);
  });

  it("costs Acorns: without them the set-out brews nothing and the Flask leaves full", () => {
    const chosen = applyAction(prestiged(), data, { type: "chooseDraught", draughtId: "iron" });
    expect(draughtAcorns(chosen)).toBeGreaterThan(0);
    const poor = { ...chosen, wallet: { ...chosen.wallet, acorns: draughtAcorns(chosen) - 1 } };
    const s = applyAction(poor, data, { type: "setOut", actId: "test-act" });
    expect(activeDraught(s, data)).toBeUndefined();
    expect(s.flaskCharges).toBe(flaskCapacity(s, data));
    expect(s.wallet.acorns).toBe(poor.wallet.acorns);
  });

  it("an element Draught is learned by beating a foe that hits with that element", () => {
    expect(enemyHitsWith(SPITTER, "fire")).toBe(true);
    expect(enemyHitsWith(WEAK_ENEMY, "fire")).toBe(false);
    const fresh = { ...prestiged(), legacy: { ...prestiged().legacy, hunts: { weakling: 3 } } };
    expect(knownDraughts(fresh, data).map((d) => d.id)).toEqual(["iron"]);
    expect(() => applyAction(fresh, data, { type: "chooseDraught", draughtId: "fire" })).toThrow(
      /not learned/,
    );
    expect(knownDraughts(prestiged(), data).map((d) => d.id)).toEqual(["iron", "fire"]);
  });

  it("Liora tells of her first Draughts after the first Prestige", () => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    expect(s.blips ?? []).not.toContain("liora-draughts");
    const pending = { ...s, pendingPrestige: { actId: "test-act", stage: 3, enemyName: "Boss" } };
    const first = applyAction(pending, data, { type: "prestige" });
    expect(first.blips).toContain("liora-draughts");
    const second = applyAction(
      { ...first, blips: [], pendingPrestige: pending.pendingPrestige },
      data,
      { type: "prestige" },
    );
    expect(second.blips ?? []).not.toContain("liora-draughts");
  });
});
