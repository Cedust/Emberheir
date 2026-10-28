import { GAME_DATA } from "@emberheir/content";
import { type GameState, applyAction, newGame } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { TIP_IDS, type TipId, pickTip } from "./tips";

const fresh = (): GameState => newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
const tip = (state: GameState, seen: readonly TipId[] = [], covered = false) =>
  pickTip({ state, covered }, new Set(seen));

describe("First Steps tips", () => {
  it("greets a new Heir in the Camp, then the road and the first fight", () => {
    const camp = fresh();
    expect(tip(camp)).toBe("welcome");
    const road = applyAction(camp, GAME_DATA, { type: "setOut", actId: "ashen-fields" });
    expect(tip(road, ["welcome"])).toBe("road");
    const fight: GameState = { ...road, run: road.run && { ...road.run, phase: "fight" } };
    expect(tip(fight, ["welcome", "road"])).toBe("fight");
  });

  it("shows nothing while a window covers the screen or once every tip was seen", () => {
    expect(tip(fresh(), [], true)).toBeNull();
    expect(tip(fresh(), TIP_IDS)).toBeNull();
  });

  it("comes back to the Camp tip after the first fights, and never greets twice", () => {
    const back: GameState = { ...fresh(), stats: { ...fresh().stats, fights: 3 } };
    expect(tip(back)).toBe("camp");
    const reborn: GameState = { ...fresh(), legacy: { ...fresh().legacy, prestige: 1 } };
    expect(tip(reborn)).toBeNull();
  });

  it("over a notice only the death tip shows", () => {
    const base = fresh();
    const dead: GameState = {
      ...base,
      notice: { kind: "death", actId: "ashen-fields", stage: 3 },
    };
    expect(tip(dead)).toBe("death");
    const retreat: GameState = {
      ...base,
      notice: { kind: "retreat", actId: "ashen-fields", stage: 3 },
    };
    expect(tip(retreat)).toBeNull();
  });

  it("points to the Ash Tree once a fight is won with Skill Points left", () => {
    const camp = fresh();
    const road = applyAction(camp, GAME_DATA, { type: "setOut", actId: "ashen-fields" });
    const won: GameState = {
      ...road,
      stats: { ...road.stats, fights: 1 },
      hero: { ...road.hero, unspentSkillPoints: 2 },
    };
    expect(tip(won, ["welcome", "road", "fight"])).toBe("points");
  });
});
