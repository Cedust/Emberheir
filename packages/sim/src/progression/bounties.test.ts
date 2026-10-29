import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import {
  type BountyDefinition,
  bountiesFor,
  bountyAfterFlask,
  bountyAfterWin,
  bountyText,
  rollBountyOffer,
  TRAIL_BOUNTY_KILLS,
  trailQuarry,
} from "./bounties";
import {
  type GameAction,
  type GameData,
  type GameState,
  applyAction,
  bountyCinderglass,
  bountyOffer,
  fail,
  newGame,
  wildfireLevel,
} from "./game";
import { PROGRESSION } from "./constants";
import { TEST_GAME_DATA } from "./test-fixtures";

const ELITES: BountyDefinition = {
  id: "elites",
  name: "Elite Hunt",
  text: "Slay # Elites",
  goal: { kind: "elites", count: 2 },
  bonus: { kind: "emberCoal", min: 4, max: 6 },
};
const TRAIL: BountyDefinition = {
  id: "trail",
  name: "Trail Hunt",
  text: "# Trail kills on @",
  goal: { kind: "trail" },
  bonus: { kind: "trail", kills: 5 },
};
const DRY: BountyDefinition = {
  id: "dry",
  name: "Dry Throat",
  text: "Beat the boss without the Flask",
  goal: { kind: "bossNoFlask" },
  bonus: { kind: "rarity" },
  fromAct: 2,
};
const THIEF: BountyDefinition = {
  id: "thief",
  name: "Thief Chase",
  text: "Catch the thief",
  goal: { kind: "thief" },
  bonus: { kind: "picks", picks: 2 },
  toAct: 1,
};

const win = (rank: "normal" | "elite" | "boss", enemyId = "weakling", gate = false) => ({
  rank,
  enemyId,
  thiefCaught: false,
  gate,
});

describe("Bounties", () => {
  it("are offered per act, two different ones, and fill in their numbers", () => {
    expect(bountiesFor([ELITES, DRY, THIEF], 1).map((b) => b.id)).toEqual(["elites", "thief"]);
    expect(bountiesFor([ELITES, DRY, THIEF], 2).map((b) => b.id)).toEqual(["elites", "dry"]);
    const quarry = { enemyId: "weakling", count: 5 };
    const offer = rollBountyOffer([ELITES, TRAIL, DRY], 2, quarry, new Rng(1));
    expect(offer).toHaveLength(2);
    expect(new Set(offer.map((b) => b.id)).size).toBe(2);
    // A Trail Hunt needs a quarry.
    expect(rollBountyOffer([TRAIL], 1, undefined, new Rng(1))).toEqual([]);
    expect(rollBountyOffer([TRAIL], 1, quarry, new Rng(1))).toEqual([
      { id: "trail", enemyId: "weakling", count: 5, progress: 0, status: "open" },
    ]);
    expect(bountyText(TRAIL, "Weakling", quarry)).toBe("5 Trail kills on Weakling");
    expect(bountyText(ELITES)).toBe("Slay 2 Elites");
  });

  it("hunt the enemy whose next Trail is closest, between 4 and 8 kills", () => {
    const tiers = () => [10, 25, 100, 300];
    const rng = new Rng(3);
    expect(trailQuarry(["a", "b"], { a: 4, b: 23 }, tiers, rng)).toEqual({
      enemyId: "b",
      count: TRAIL_BOUNTY_KILLS.min,
    });
    expect(trailQuarry(["a", "b"], { a: 0, b: 25 }, tiers, rng)).toEqual({
      enemyId: "a",
      count: TRAIL_BOUNTY_KILLS.max,
    });
    // Every Trail at its top: no Trail Hunt.
    expect(trailQuarry(["a"], { a: 300 }, tiers, rng)).toBeUndefined();
  });

  it("follow the trip: Gatekeepers are no Elites, a drink fails Dry Throat", () => {
    const elites = { id: "elites", progress: 0, status: "open" } as const;
    expect(bountyAfterWin(elites, ELITES.goal, win("elite", "x", true))).toBe(elites);
    expect(bountyAfterWin(elites, ELITES.goal, win("normal"))).toBe(elites);
    const one = bountyAfterWin(elites, ELITES.goal, win("elite"));
    expect(one).toMatchObject({ progress: 1, status: "open" });
    expect(bountyAfterWin(one, ELITES.goal, win("elite"))).toMatchObject({ status: "done" });

    const trail = {
      id: "trail",
      enemyId: "weakling",
      count: 2,
      progress: 1,
      status: "open",
    } as const;
    expect(bountyAfterWin(trail, TRAIL.goal, win("normal", "other"))).toBe(trail);
    expect(bountyAfterWin(trail, TRAIL.goal, win("boss"))).toBe(trail);
    expect(bountyAfterWin(trail, TRAIL.goal, win("normal"))).toMatchObject({ status: "done" });
    // An Elite of the quarry counts 3 Trail kills.
    const four = { ...trail, count: 4 };
    expect(bountyAfterWin(four, TRAIL.goal, { ...win("elite"), trailKills: 3 })).toMatchObject({
      progress: 4,
      status: "done",
    });

    const dry = { id: "dry", progress: 0, status: "open" } as const;
    expect(bountyAfterFlask(dry, DRY.goal).status).toBe("failed");
    expect(bountyAfterWin(dry, DRY.goal, win("boss")).status).toBe("done");
    const failed = bountyAfterFlask(dry, DRY.goal);
    expect(bountyAfterWin(failed, DRY.goal, win("boss"))).toBe(failed);
  });
});

describe("Eldrin's offer and Cache", () => {
  const data: GameData = { ...TEST_GAME_DATA, bounties: [ELITES, TRAIL] };
  const act = (state: GameState, ...actions: GameAction[]) =>
    actions.reduce((s, a) => applyAction(s, data, a), state);
  const start = newGame(data, { seed: 1, classId: "test-fighter" });

  it("the hero takes one bounty of the offer; the offer stays until a turn-in", () => {
    const offer = bountyOffer(start, data, "test-act");
    expect(offer.map((b) => b.id).sort()).toEqual(["elites", "trail"]);
    expect(bountyOffer(start, data, "test-act")).toEqual(offer);
    // No bounty unless one is chosen; none that Eldrin does not offer.
    expect(act(start, { type: "setOut", actId: "test-act" }).run?.bounty).toBeUndefined();
    expect(() => act(start, { type: "setOut", actId: "test-act", bounty: "dry" })).toThrow(
      /no such Bounty/,
    );
    let s = act(start, { type: "setOut", actId: "test-act", bounty: "trail" });
    const trail = offer.find((b) => b.id === "trail");
    expect(s.run?.bounty).toEqual(trail);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.bounty?.progress).toBe(1);
    // A turned-in bounty brings a new offer.
    const three: GameData = { ...data, bounties: [ELITES, TRAIL, THIEF] };
    const offers = new Set(
      [0, 1, 2, 3, 4, 5].map((n) =>
        bountyOffer({ ...start, stats: { ...start.stats, bounties: n } }, three, "test-act")
          .map((b) => b.id)
          .join(),
      ),
    );
    expect(offers.size).toBeGreaterThan(1);
  });

  it("a done bounty waits for Eldrin: no new one until it is turned in", () => {
    const done: GameState = { ...start, bountyDone: { id: "elites", actId: "test-act" } };
    expect(bountyOffer(done, data, "test-act")).toEqual([]);
    expect(() => act(done, { type: "setOut", actId: "test-act", bounty: "elites" })).toThrow(
      /Turn in/,
    );
  });

  it("Elite Hunt: Ember Coal and an item pick; the cards left turn to Ash", () => {
    const s0: GameState = { ...start, bountyDone: { id: "elites", actId: "test-act" } };
    const s = act(s0, { type: "turnInBounty" });
    expect(s.bountyDone).toBeUndefined();
    expect(s.stats.bounties).toBe(1);
    const cache = s.bountyCache;
    expect(cache?.items).toHaveLength(3);
    expect(cache?.picks).toBe(1);
    expect(s.wallet.emberCoal - s0.wallet.emberCoal).toBeGreaterThanOrEqual(4);
    expect(() => act(s, { type: "turnInBounty" })).toThrow(/No bounty/);
    const taken = act(s, { type: "takeBountyItem", index: 1 });
    expect(taken.bountyCache).toBeUndefined();
    expect(taken.inventory).toHaveLength(s.inventory.length + 1);
    expect(taken.wallet.ash).toBeGreaterThan(s.wallet.ash);
    const closed = act(s, { type: "closeBountyCache" });
    expect(closed.bountyCache).toBeUndefined();
    expect(closed.inventory).toEqual(s.inventory);
  });

  it("Trail Hunt: Trail kills on its enemy", () => {
    const s0: GameState = {
      ...start,
      bountyDone: { id: "trail", enemyId: "weakling", actId: "test-act" },
    };
    const s = act(s0, { type: "turnInBounty" });
    expect(s.legacy.hunts?.["weakling"]).toBe(5);
    expect(s.bountyCache?.trailKills).toBe(5);
  });

  it("Thief Chase: a hoard of four cards and two picks", () => {
    const thief: GameData = { ...data, bounties: [...(data.bounties ?? []), THIEF] };
    const s0: GameState = { ...start, bountyDone: { id: "thief", actId: "test-act" } };
    let s = applyAction(s0, thief, { type: "turnInBounty" });
    expect(s.bountyCache?.items).toHaveLength(4);
    s = applyAction(s, thief, { type: "takeBountyItem", index: 0 });
    expect(s.bountyCache?.taken).toEqual([0]);
    expect(() => applyAction(s, thief, { type: "takeBountyItem", index: 0 })).toThrow(/taken/);
    s = applyAction(s, thief, { type: "takeBountyItem", index: 3 });
    expect(s.bountyCache).toBeUndefined();
  });

  it("Wildfire: no Trail Hunt, Cinderglass instead of the Home Rune, cards of the tier", () => {
    const won: GameState = {
      ...start,
      legacy: {
        ...start.legacy,
        prestige: PROGRESSION.finalPrestige,
        finaleWon: true,
        wildfire: 3,
      },
    };
    const offer = bountyOffer(won, data, "test-act", 4);
    expect(offer.map((b) => b.id)).toEqual(["elites"]);
    expect(() =>
      act(won, { type: "setOut", actId: "test-act", wildfire: 4, bounty: "trail" }),
    ).toThrow(/no such Bounty/);
    const out = act(won, { type: "setOut", actId: "test-act", wildfire: 4, bounty: "elites" });
    expect(out.run?.bounty?.id).toBe("elites");
    // Done and back in the Camp, it remembers the tier.
    const run = out.run ?? fail("no run");
    const taken = run.bounty ?? fail("no bounty");
    const back = act(
      { ...out, run: { ...run, bounty: { ...taken, status: "done" } } },
      {
        type: "retreat",
      },
    );
    expect(back.bountyDone).toEqual({ id: "elites", actId: "test-act", wildfire: 4 });
    const paid = act(back, { type: "turnInBounty" });
    const glass = bountyCinderglass(4);
    expect(paid.bountyCache?.runes).toEqual([]);
    expect(paid.bountyCache?.cinderglass).toBeGreaterThanOrEqual(glass.min);
    expect(paid.bountyCache?.cinderglass).toBeLessThanOrEqual(glass.max);
    expect(paid.wallet.cinderglass ?? 0).toBe(
      (back.wallet.cinderglass ?? 0) + (paid.bountyCache?.cinderglass ?? 0),
    );
    expect(paid.bountyCache?.items.every((it) => it.itemLevel === wildfireLevel(4))).toBe(true);
    expect(bountyCinderglass(PROGRESSION.wildfire.cinderglass.pinnacleFrom).min).toBe(
      glass.min + PROGRESSION.wildfire.cinderglass.pinnacle,
    );
  });
});
