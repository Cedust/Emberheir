import { describe, expect, it } from "vitest";
import { rollItem } from "../items/generate";
import { TEST_SHIELD } from "../items/test-fixtures";
import {
  type GameAction,
  type GameState,
  SAVE_VERSION,
  applyAction,
  newGame,
} from "../progression/game";
import { TEST_GAME_DATA as data } from "../progression/test-fixtures";
import { Rng } from "../rng";
import type { SaveMigration } from "./migrations";
import { deserializeGame, deserializeStash, serializeGame, serializeStash } from "./save";

const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

const start = () => newGame(data, { seed: 7, classId: "test-fighter" });

const shield = (id: string) => ({
  ...rollItem(data.items, { baseId: TEST_SHIELD.id, itemLevel: 3, rarity: "magic" }, new Rng(3)),
  id,
});

/** A hero in a won fight's rewards, with gear, a bag and a stash. */
function rich(): GameState {
  const s = act(start(), { type: "setOut", actId: "test-act" }, { type: "startStage" });
  const won = act(s, { type: "resolveFight" });
  return {
    ...won,
    hero: { ...won.hero, equipment: { ...won.hero.equipment, offHand: shield("worn") } },
    inventory: [{ item: shield("bag"), x: 0, y: 0 }],
    stash: [{ item: shield("wagon"), x: 2, y: 1 }],
  };
}

describe("save games", () => {
  it("round-trip without losing a field", () => {
    for (const state of [start(), rich()]) {
      expect(deserializeGame(serializeGame(state), data)).toEqual(state);
    }
    expect(rich().run?.phase).toBe("rewards");
  });

  it("reject broken JSON, unknown versions and saves from a newer game", () => {
    const s = start();
    expect(() => deserializeGame("{oops")).toThrow(/JSON/);
    expect(() => deserializeGame("null")).toThrow(/object/);
    expect(() => deserializeGame(JSON.stringify({ ...s, version: undefined }))).toThrow(/version/);
    expect(() => deserializeGame(JSON.stringify({ ...s, version: 99 }))).toThrow(/newer/);
    // A version without a migration step (none before 1 here) is not supported.
    expect(() =>
      deserializeGame(JSON.stringify({ ...s, version: 1 }), data, { to: 3, migrations: {} }),
    ).toThrow(/not supported/);
  });

  it("reject a broken shape and name where it broke", () => {
    const s = start();
    const broken = { ...s, hero: { ...s.hero, level: "high" } };
    expect(() => deserializeGame(JSON.stringify(broken))).toThrow(/hero\.level/);
    const noWallet = { ...s, wallet: undefined };
    expect(() => deserializeGame(JSON.stringify(noWallet))).toThrow(/wallet/);
  });

  it("reject content that no longer exists", () => {
    const s = rich();
    const gone = { ...s, inventory: [{ item: { ...shield("x"), baseId: "lost" }, x: 0, y: 0 }] };
    expect(() => deserializeGame(JSON.stringify(gone), data)).toThrow(/lost/);
    expect(() =>
      deserializeGame(JSON.stringify({ ...s, hero: { ...s.hero, classId: "bard" } }), data),
    ).toThrow(/bard/);
    // Without content data only the shape is checked.
    expect(deserializeGame(JSON.stringify(gone)).inventory[0]?.item.baseId).toBe("lost");
  });
});

/** One version up in the tests: items get a `name` suffix, the wallet some Acorns. */
const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  [SAVE_VERSION]: {
    item: (item) => ({ ...item, name: `${String(item["name"])} (v2)` }),
    state: (save) => ({ ...save, wallet: { ...(save["wallet"] as object), acorns: 5 } }),
  },
};

describe("migrations", () => {
  it("run the item step on every item of a save, then the state step", () => {
    const s = rich();
    const next = SAVE_VERSION + 1;
    const migrated = deserializeGame(serializeGame(s), data, { to: next, migrations: MIGRATIONS });
    expect(migrated.version).toBe(next);
    expect(migrated.wallet.acorns).toBe(5);
    const names = [
      migrated.hero.equipment.offHand,
      migrated.inventory[0]?.item,
      migrated.stash[0]?.item,
      ...(migrated.run?.rewards?.items ?? []),
    ].map((i) => i?.name ?? "");
    expect(names.length).toBeGreaterThan(3);
    expect(names.every((n) => n.endsWith(" (v2)"))).toBe(true);
  });

  it("reach the items of the shared stash too", () => {
    const json = serializeStash([{ item: shield("a"), x: 0, y: 0 }]);
    const stash = deserializeStash(json, data, {
      to: SAVE_VERSION + 1,
      migrations: MIGRATIONS,
    });
    expect(stash[0]?.item.name).toMatch(/ \(v2\)$/);
    // Already current: nothing to do.
    expect(deserializeStash(json, data)[0]?.item).toEqual(shield("a"));
    expect(() =>
      deserializeStash(JSON.stringify({ version: SAVE_VERSION, items: [{ x: 0 }] })),
    ).toThrow(/Stash is broken/);
  });
});

describe("the Klassengerüst", () => {
  it("drops saves and stashes from before version 9 instead of converting them", () => {
    const old = { ...JSON.parse(serializeGame(start())), version: 8 };
    expect(() => deserializeGame(JSON.stringify(old), data)).toThrow(/not supported/);
    expect(() => deserializeStash(JSON.stringify({ version: 8, items: [] }))).toThrow(
      /not supported/,
    );
  });
});

describe("version 10: element attacks", () => {
  it("moves a learned travel node onto the element attack that replaced it", () => {
    const s = start();
    const raw = JSON.parse(serializeGame(s)) as Record<string, unknown>;
    const hero = raw["hero"] as Record<string, unknown>;
    const old = {
      ...raw,
      version: 9,
      hero: { ...hero, learned: { ...(hero["learned"] as object), "storm-steady-mind": 1 } },
    };
    const migrated = deserializeGame(JSON.stringify(old), data);
    expect(migrated.hero.learned["storm-storm-strike"]).toBe(1);
    expect(migrated.hero.learned["storm-steady-mind"]).toBeUndefined();
  });
});
