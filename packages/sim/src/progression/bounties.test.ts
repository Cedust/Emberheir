import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import {
  type BountyDefinition,
  bountiesFor,
  bountyAfterFlask,
  bountyAfterWin,
  bountyText,
  rollBounty,
} from "./bounties";
import { PROGRESSION } from "./constants";
import { type GameAction, type GameData, type GameState, applyAction, newGame } from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

const CULL: BountyDefinition = {
  id: "cull",
  name: "Culling",
  text: "Slay # @",
  goal: { kind: "slay", count: 2 },
};
const DRY: BountyDefinition = {
  id: "dry",
  name: "Dry Throat",
  text: "Beat the boss without the Flask",
  goal: { kind: "bossNoFlask" },
  fromAct: 2,
};
const HALE: BountyDefinition = {
  id: "hale",
  name: "Hale",
  text: "Beat the boss with % Life",
  goal: { kind: "bossHale", life: 0.5 },
  toAct: 1,
};

const win = (rank: "normal" | "elite" | "boss", lifeFraction = 1, enemyId = "weakling") => ({
  rank,
  enemyId,
  thiefCaught: false,
  lifeFraction,
});

describe("Bounties", () => {
  it("are handed out per act and fill in their numbers", () => {
    expect(bountiesFor([CULL, DRY, HALE], 1).map((b) => b.id)).toEqual(["cull", "hale"]);
    expect(bountiesFor([CULL, DRY, HALE], 2).map((b) => b.id)).toEqual(["cull", "dry"]);
    expect(bountyText(CULL, "Weakling")).toBe("Slay 2 Weakling");
    expect(bountyText(HALE)).toBe("Beat the boss with 50 % Life");
    const rolled = rollBounty([CULL], 1, ["weakling"], new Rng(1));
    expect(rolled).toEqual({ id: "cull", enemyId: "weakling", progress: 0, status: "open" });
    // A "slay" bounty needs an enemy to hunt.
    expect(rollBounty([CULL], 1, [], new Rng(1))).toBeUndefined();
  });

  it("follow the trip: kills count, a drink or a hurt boss fails them", () => {
    const open = { id: "cull", enemyId: "weakling", progress: 0, status: "open" } as const;
    const one = bountyAfterWin(open, CULL.goal, win("normal"));
    expect(one).toMatchObject({ progress: 1, status: "open" });
    expect(bountyAfterWin(one, CULL.goal, win("normal", 1, "other"))).toBe(one);
    expect(bountyAfterWin(one, CULL.goal, win("elite"))).toMatchObject({ status: "done" });

    const dry = { id: "dry", progress: 0, status: "open" } as const;
    expect(bountyAfterFlask(dry, DRY.goal).status).toBe("failed");
    expect(bountyAfterWin(dry, DRY.goal, win("boss")).status).toBe("done");
    const failed = bountyAfterFlask(dry, DRY.goal);
    expect(bountyAfterWin(failed, DRY.goal, win("boss"))).toBe(failed);

    const hale = { id: "hale", progress: 0, status: "open" } as const;
    expect(bountyAfterWin(hale, HALE.goal, win("boss", 0.4)).status).toBe("failed");
    expect(bountyAfterWin(hale, HALE.goal, win("boss", 0.6)).status).toBe("done");
  });

  it("a done bounty is turned in at the Scout: Acorns, Ember Coal and a Rare item in the inventory", () => {
    const data: GameData = { ...TEST_GAME_DATA, bounties: [CULL] };
    const act = (state: GameState, ...actions: GameAction[]) =>
      actions.reduce((s, a) => applyAction(s, data, a), state);
    let s = act(newGame(data, { seed: 1, classId: "test-fighter" }), {
      type: "setOut",
      actId: "test-act",
    });
    expect(s.run?.bounty).toEqual({
      id: "cull",
      enemyId: "weakling",
      progress: 0,
      status: "open",
    });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.bounty?.progress).toBe(1);
    expect(s.run?.rewards?.bountyDone).toBeUndefined();
    s = act(s, { type: "salvageAll" }, { type: "continue" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.bounty?.status).toBe("done");
    expect(s.run?.rewards?.bountyDone).toBe(true);
    expect(() => act(s, { type: "turnInBounty" })).toThrow(/Camp/);

    // Back in the Camp the Scout waits; no new bounty until this one is turned in.
    s = act(s, { type: "salvageAll" }, { type: "continue" }, { type: "retreat" });
    expect(s.bountyDone).toEqual({ id: "cull", enemyId: "weakling", actId: "test-act" });
    expect(act(s, { type: "setOut", actId: "test-act" }).run?.bounty).toBeUndefined();

    const before = s;
    s = act(s, { type: "turnInBounty" });
    expect(s.bountyDone).toBeUndefined();
    expect(s.wallet.emberCoal).toBe(before.wallet.emberCoal + PROGRESSION.bounty.emberCoal);
    expect(s.wallet.acorns).toBeGreaterThan(before.wallet.acorns);
    expect(s.inventory).toHaveLength(before.inventory.length + 1);
    const item = s.inventory.find(
      (p) => !before.inventory.some((b) => b.item.id === p.item.id),
    )?.item;
    expect(["rare", "epic"]).toContain(item?.rarity);
    expect(s.stash).toEqual(before.stash);
    expect(() => act(s, { type: "turnInBounty" })).toThrow(/No bounty/);
    // The next trip gets a new bounty again.
    expect(act(s, { type: "setOut", actId: "test-act" }).run?.bounty?.status).toBe("open");
  });
});
