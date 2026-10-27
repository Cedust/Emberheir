import { describe, expect, it } from "vitest";
import { deserializeGame, serializeGame } from "../save";
import { MIGRATIONS } from "../save/migrations";
import { type GameAction, type GameData, type GameState, applyAction, newGame } from "./game";
import { DEADLY_ACT, TEST_ACT, TEST_GAME_DATA } from "./test-fixtures";

/** Camp personas met on the road (camp-personas-freischalten-v1.md). */

/** The test act is Nyssa's here, so a won fight in it meets her. */
const data: GameData = {
  ...TEST_GAME_DATA,
  acts: TEST_GAME_DATA.acts.map((a) => (a.id === TEST_ACT.id ? { ...a, runesmith: true } : a)),
};
const start = () => newGame(data, { seed: 1, classId: "test-fighter" });
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const win = (s: GameState) =>
  act(s, { type: "startStage" }, { type: "resolveFight" }, { type: "salvageAll" });

describe("Camp personas met on the road", () => {
  it("a new game starts with nobody met and no scene", () => {
    const s = start();
    expect(s.progress.met).toEqual([]);
    expect(s.blips ?? []).toEqual([]);
  });

  it("Kaelen at the first Waymark, Nyssa in her act, Liora at the act boss, each once", () => {
    let s = act(start(), { type: "setOut", actId: TEST_ACT.id });
    s = win(s);
    // Stage 1 of the short test act is its first Waymark.
    expect(s.progress.met).toEqual(["kaelen", "nyssa"]);
    expect(s.blips).toEqual(["kaelen", "nyssa"]);
    s = act(s, { type: "dismissBlip" });
    expect(s.blips).toEqual(["nyssa"]);
    s = act(s, { type: "dismissBlip" }, { type: "continue" });
    s = act(win(s), { type: "continue" });
    expect(s.blips).toEqual([]);
    s = win(s);
    expect(s.progress.met).toEqual(["kaelen", "nyssa", "liora"]);
    expect(s.blips).toEqual(["liora"]);
  });

  it("a death meets nobody", () => {
    const deadly = {
      ...data,
      acts: [...data.acts.filter((a) => a.id !== DEADLY_ACT.id), DEADLY_ACT],
    };
    let s: GameState = {
      ...start(),
      legacy: { ...start().legacy, prestige: 2 },
      progress: { ...start().progress, actsCleared: [TEST_ACT.id] },
    };
    s = applyAction(s, deadly, { type: "setOut", actId: DEADLY_ACT.id });
    s = applyAction(applyAction(s, deadly, { type: "startStage" }), deadly, {
      type: "resolveFight",
    });
    expect(s.run).toBeNull();
    expect(s.progress.met).toEqual([]);
  });

  it("Liora's crafts and Marisha's camp gamble wait until they joined", () => {
    const s = start();
    expect(() => act(s, { type: "craft", request: { kind: "gamble", slot: "ring" } })).toThrow(
      /merchant|Marisha/i,
    );
  });

  it("old saves keep everyone who was in the Camp", () => {
    const s = start();
    const old = {
      ...JSON.parse(serializeGame(s)),
      version: 14,
      progress: {
        actsCleared: [],
        deathsInAct: 0,
        trainerUnlocked: true,
        rotationSlots: 1,
        runesmithUnlocked: false,
        waymarks: [],
      },
    };
    const migrated = deserializeGame(JSON.stringify(old), data, { migrations: MIGRATIONS });
    expect(migrated.progress.met).toEqual(["kaelen", "marisha", "liora"]);
    expect(migrated.progress).not.toHaveProperty("trainerUnlocked");
  });
});
