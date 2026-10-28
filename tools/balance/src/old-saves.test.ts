import { readFileSync, readdirSync } from "node:fs";
import { GAME_DATA } from "@emberheir/content";
import { SAVE_VERSION, applyAction, deserializeGame, serializeGame } from "@emberheir/sim";
import { describe, expect, it } from "vitest";

/**
 * Real save games of every save version since the Klassengerüst (version 9): the autopilot
 * played the game of the last commit of each version (the 12th fight and the rewards of the 40th, a
 * Sword and a Staff hero) and saved. Each one has to load in today's game and play on.
 * A new SAVE_VERSION adds its file (see fixtures/old-saves/README.md).
 */
const DIR = new URL("../fixtures/old-saves/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

interface OldSaves {
  readonly version: number;
  readonly saves: readonly { readonly label: string; readonly save: string }[];
}

describe("old save games", () => {
  it("cover every version from 9 to the one before today's", () => {
    const versions = files.map((f) => Number(/^v(\d+)\.json$/.exec(f)?.[1])).sort((a, b) => a - b);
    expect(versions).toEqual(Array.from({ length: SAVE_VERSION - 9 }, (_, i) => 9 + i));
  });

  for (const file of files) {
    const old = JSON.parse(readFileSync(new URL(file, DIR), "utf8")) as OldSaves;
    for (const { label, save } of old.saves) {
      it(`version ${old.version}, ${label}: loads and plays on`, () => {
        const state = deserializeGame(save, GAME_DATA);
        expect(deserializeGame(serializeGame(state), GAME_DATA)).toEqual(state);
        // The next step of the game works on it: finish the fight, or leave the rewards.
        const next =
          state.run?.phase === "fight"
            ? applyAction(state, GAME_DATA, { type: "resolveFight" })
            : state;
        expect(next.hero.level).toBeGreaterThanOrEqual(state.hero.level);
      });
    }
  }
});
