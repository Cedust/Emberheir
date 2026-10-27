import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  type Rewards,
  type RunState,
  getAct,
  heroWeaponRank,
  newGame,
  waymarkStages,
} from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { notificationsFor } from "./notifications";

const base = newGame(GAME_DATA, { seed: 1, classId: "cinderguard" });
const act = getAct(GAME_DATA, "ashen-fields");

/** The hero on the rewards screen of a stage, with these rewards. */
const atRewards = (rewards: Partial<Rewards>, stage = 2): GameState => ({
  ...base,
  run: {
    actId: act.id,
    stage,
    phase: "rewards",
    encounter: null,
    rewards: { items: [], runes: [], ...rewards },
  } as unknown as RunState,
});

const inFight: GameState = {
  ...base,
  run: { actId: act.id, stage: 2, phase: "fight", rewards: null } as unknown as RunState,
};

const kinds = (prev: GameState | null, next: GameState) =>
  notificationsFor(prev, next).map((n) => n.kind);

describe("notifications", () => {
  it("a done Bounty shows the moment its fight is won", () => {
    const won = atRewards({ bountyDone: true });
    const [n] = notificationsFor(inFight, won);
    expect(n).toMatchObject({ kind: "bounty", title: "Bounty done", sub: "Turn in at Eldrin" });
  });

  it("the rewards screen's moments come once, not again when a card is taken", () => {
    const won = atRewards({ bountyDone: true, waymark: true });
    expect(kinds(inFight, won)).toEqual(["bounty", "waymark"]);
    const picked = atRewards({ bountyDone: true, waymark: true, taken: [] });
    expect(kinds(won, picked)).toEqual([]);
  });

  it("a loaded save on its rewards screen shows its moments again", () => {
    expect(kinds(null, atRewards({ bountyDone: true }))).toEqual(["bounty"]);
  });

  it("a won Waymark before the boss brings the Hearth Embers, not the boss itself", () => {
    const [first] = waymarkStages(act);
    expect(kinds(inFight, atRewards({ waymark: true }, first))).toEqual(["waymark", "hearth"]);
    expect(kinds(inFight, atRewards({}, act.stages))).toEqual([]);
  });

  it("a filled Trail, Ashborn levels and an Echo each get their own", () => {
    const won = atRewards({
      hunt: { enemyId: "x", from: 9, kills: 10, tier: 2, tierUp: true },
      ashbornLevels: 2,
      echo: { id: GAME_DATA.echoes[0]?.id ?? "", stage: 1 },
    });
    const list = notificationsFor(inFight, won);
    expect(list.map((n) => n.kind)).toEqual(["echo", "hunt", "ashborn"]);
    expect(list[0]?.title).toBe("New Echo");
    expect(list[2]?.sub).toBe("+2 Ashborn points");
  });

  it("a new Weapon Rank points to Kaelen, a loaded save does not", () => {
    const up: GameState = { ...base, hero: { ...base.hero, level: 2 } };
    expect(heroWeaponRank(up)).toBeGreaterThan(heroWeaponRank(base));
    const [n] = notificationsFor(base, up);
    expect(n).toMatchObject({ kind: "rank", sub: "+1 Mastery point at Kaelen" });
    expect(n?.title).toMatch(/ Rank \d+$/);
    expect(notificationsFor(null, up)).toEqual([]);
  });
});
