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

  it("the Scout's bounty pays out at once: Gold, Reforge Stones and a Rare item in the stash", () => {
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
    expect(s.run?.rewards?.bounty).toBeUndefined();
    s = act(s, { type: "salvageAll" }, { type: "continue" });
    const before = s.wallet;
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.bounty?.status).toBe("done");
    const paid = s.run?.rewards?.bounty;
    expect(paid?.to).toBe("stash");
    expect(paid?.reforgeStones).toBe(PROGRESSION.bounty.reforgeStones);
    expect(["rare", "epic"]).toContain(paid?.item.rarity);
    expect(s.stash.map((p) => p.item.id)).toEqual([paid?.item.id]);
    expect(s.wallet.gold).toBe(before.gold + (s.run?.rewards?.gold ?? 0) + (paid?.gold ?? 0));
    expect(paid?.gold).toBeGreaterThan(0);
    // Back in the Camp the trip's bounty is gone.
    s = act(s, { type: "salvageAll" }, { type: "continue" }, { type: "retreat" });
    expect(s.run).toBeNull();
  });
});
