import { describe, expect, it } from "vitest";
import { COMBAT } from "../combat/constants";
import { deriveStats } from "../combat/stats";
import { DRAUGHT_FLASK_COST, type DraughtDefinition } from "./draughts";
import {
  type GameData,
  type GameState,
  activeDraught,
  applyAction,
  flaskCapacity,
  heroSetup,
  newGame,
} from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

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
};
const data: GameData = { ...TEST_GAME_DATA, draughts: [IRON, FIRE] };

const prestiged = (): GameState => {
  const s = newGame(data, { seed: 1, classId: "test-fighter" });
  return { ...s, legacy: { ...s.legacy, prestige: 1 } };
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
});
