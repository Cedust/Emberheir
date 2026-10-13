import { GAME_DATA } from "@emberheir/content";
import { type GameState, applyAction, deserializeGame, serializeGame } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { playGenerations } from "./act";

/**
 * Every field of a save game has to be in the zod schema, or loading drops it. The autopilot
 * plays two runs with the real content (gear, Boons, bounties, Prestige, Mastery, rewards), and
 * every state on the way has to survive a save and a load unchanged.
 */
describe("save games with the real content", () => {
  it("round-trip every state the autopilot passes through two runs", () => {
    const roundTrip = (state: GameState) =>
      expect(deserializeGame(serializeGame(state), GAME_DATA)).toEqual(state);
    let checked = 0;
    playGenerations(GAME_DATA, {
      seed: 5,
      starterWeapon: "sword",
      upToAct: 2,
      maxAttempts: 30,
      generations: 2,
      onFight: (state) => {
        roundTrip(state);
        // The rewards of the same fight (or the Camp after it).
        roundTrip(applyAction(state, GAME_DATA, { type: "resolveFight" }));
        checked++;
      },
    });
    expect(checked).toBeGreaterThan(30);
  }, 60_000);
});
