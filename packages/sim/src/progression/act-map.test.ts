import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { PROGRESSION } from "./constants";
import { type EventDefinition } from "./events";
import {
  type ActMap,
  type GameData,
  type GameState,
  type MapOptions,
  type NodeKind,
  applyAction,
  currentNode,
  defaultNext,
  generateActMap,
  isQuiet,
  newGame,
  nextNodes,
  pathOpen,
  ROAD_GAMBLE,
  roadGamblePrice,
  singleRows,
} from "./game";
import { gamblePrice } from "./crafting";
import { stageMonsterLevel } from "./game/acts";
import { TEST_ACT, TEST_BOON_DATA } from "./test-fixtures";

/** The act map (act-karte-entwurf-v1.md): lanes, nodes, the quiet nodes and their Events. */

const LONG_ACT = {
  ...TEST_ACT,
  id: "long-act",
  stages: 15,
  shrineStages: [5, 10],
  pickEvery: 3,
  boonFamily: "ash",
};
const SHORT_ACT = { ...LONG_ACT, id: "short-act", stages: 10, shrineStages: [4, 7] };

const EVENTS: readonly EventDefinition[] = [
  {
    id: "altar",
    name: "Altar",
    text: "",
    options: [{ id: "give", label: "Give", text: "", cost: { life: 0.2 }, gain: { rune: 1 } }],
  },
  {
    id: "peddler",
    name: "Peddler",
    text: "",
    options: [
      { id: "buy", label: "Buy", text: "", cost: { acornFights: 4 }, gain: { flask: 1 } },
      { id: "train", label: "Train", text: "", gain: { xpFights: 2 } },
    ],
  },
  {
    id: "spark",
    name: "Spark",
    text: "",
    shrine: true,
    options: [
      { id: "take", label: "Take", text: "", gain: { boons: true }, curse: { damage: 0.15 } },
    ],
  },
  {
    id: "challenger",
    name: "Challenger",
    text: "",
    options: [{ id: "accept", label: "Accept", text: "", gain: { challenge: true } }],
  },
  {
    id: "cub",
    name: "Cub",
    text: "",
    options: [
      { id: "home", label: "Home", text: "", cost: { flask: 1 }, gain: { lucky: true } },
      {
        id: "chest",
        label: "Chest",
        text: "",
        gain: { items: true },
        risk: { chance: 1, life: 0.25 },
      },
    ],
  },
];

const data: GameData = { ...TEST_BOON_DATA, acts: [LONG_ACT, SHORT_ACT], events: EVENTS };

const OPTIONS: MapOptions = { shrines: true, thief: false, events: true };

const fights = (kind: NodeKind) => !isQuiet(kind);

function maps(act: typeof LONG_ACT, count = 200, options = OPTIONS): ActMap[] {
  return Array.from({ length: count }, (_, seed) => generateActMap(act, options, new Rng(seed)));
}

/** In the long act at `stage`, standing on a node of this kind (its visit not yet rolled). */
function at(stage: number, kind: NodeKind, seed = 3): GameState {
  const s = applyAction(newGame(data, { seed, classId: "test-fighter" }), data, {
    type: "setOut",
    actId: "long-act",
  });
  const run = s.run;
  if (!run?.map) throw new Error("No map");
  // The node before is a fight that leads to every lane; the node at `stage` gets the kind.
  const rows = run.map.rows.map((row, r) => {
    if (r === stage - 2) return row.map((n) => ({ ...n, kind: "fight" as const, next: [0, 1, 2] }));
    if (r === stage - 1) return row.map((n) => ({ ...n, kind }));
    return row;
  });
  return {
    ...s,
    run: {
      ...run,
      stage: stage - 1,
      phase: "rewards",
      rewards: doneRewards(),
      encounter: { enemyId: "x", level: 1, boss: false, eliteModifiers: [], seed: 1 },
      map: { rows },
    },
  };
}

function doneRewards() {
  return {
    rank: "normal" as const,
    xp: 0,
    acorns: 0,
    ash: 0,
    emberCoal: 0,
    phoenixFeathers: 0,
    runes: [],
    levelsGained: 0,
    items: [],
    itemPick: { kind: "salvageAll" as const },
    salvagedAsh: 0,
  };
}

/** Walks onto the node set up by `at` and returns the state standing there. */
function arrive(s: GameState, lane = 1): GameState {
  const chosen = applyAction(s, data, { type: "chooseNode", lane });
  return applyAction(chosen, data, { type: "continue" });
}

describe("Act map", () => {
  it("has three lanes, single rows on stage 1 and the Waymarks, and only fights at first", () => {
    for (const map of maps(LONG_ACT)) {
      expect(map.rows.length).toBe(15);
      map.rows.forEach((row, r) => {
        const single = singleRows(LONG_ACT).includes(r + 1);
        expect(row.length).toBe(single ? 1 : 3);
        if (single || r + 1 <= PROGRESSION.eliteFreeStages) {
          expect(row.every((n) => n.kind === "fight")).toBe(true);
        }
      });
    }
    expect(singleRows(SHORT_ACT)).toEqual([1, 3, 7, 10]);
    expect(maps(SHORT_ACT, 1)[0]?.rows.length).toBe(10);
  });

  it("links neighbouring lanes only, never crossing, and every node leads on to a fight", () => {
    for (const map of maps(LONG_ACT)) {
      map.rows.forEach((row, r) => {
        const after = map.rows[r + 1];
        for (const node of row) {
          if (!after) {
            expect(node.next).toEqual([]);
            continue;
          }
          expect(node.next.length).toBeGreaterThan(0);
          if (row.length === 3 && after.length === 3) {
            expect(node.next.every((l) => Math.abs(l - node.lane) <= 1)).toBe(true);
            expect(node.next).toContain(node.lane);
            // The Hearth before the boss may be the only way on.
            const onward = after.filter((n) => node.next.includes(n.lane));
            const ok = onward.some((n) => fights(n.kind) || (r === 12 && n.kind === "hearth"));
            expect(ok).toBe(true);
          }
        }
        if (row.length === 3 && after?.length === 3) {
          const crosses = row.some((a) =>
            row.some((b) => a.lane < b.lane && a.next.some((l) => b.next.some((m) => m < l))),
          );
          expect(crosses).toBe(false);
        }
      });
    }
  });

  it("holds a mix of nodes, a Hearth before the boss and Shrines only early", () => {
    const all = maps(LONG_ACT);
    const kinds = all.flatMap((m) => m.rows.flat().map((n) => n.kind));
    for (const kind of ["fight", "elite", "shrine", "hearth", "cache", "event", "marisha"]) {
      expect(kinds).toContain(kind);
    }
    expect(kinds).not.toContain("thief");
    // More fights than quiet nodes.
    expect(kinds.filter(fights).length).toBeGreaterThan(kinds.length / 2);
    const withHearth = all.filter((m) => m.rows[13]?.some((n) => n.kind === "hearth"));
    expect(withHearth.length).toBe(all.length);
    for (const m of all) {
      expect(
        m.rows
          .slice(10)
          .flat()
          .some((n) => n.kind === "shrine"),
      ).toBe(false);
      expect(m.rows.flat().filter((n) => n.kind === "marisha").length).toBeLessThanOrEqual(1);
    }
  });

  it("follows the walk: no Shrines when they are quiet, the thief's trail with a thief bounty", () => {
    const quiet = maps(LONG_ACT, 100, { shrines: false, thief: true, events: false });
    const kinds = quiet.flatMap((m) => m.rows.flat().map((n) => n.kind));
    expect(kinds).not.toContain("shrine");
    expect(kinds).not.toContain("event");
    expect(kinds).toContain("thief");
  });

  it("is the same for the same seed", () => {
    expect(generateActMap(LONG_ACT, OPTIONS, new Rng(9))).toEqual(
      generateActMap(LONG_ACT, OPTIONS, new Rng(9)),
    );
  });

  it("comes with every set-out, the hero on the first row", () => {
    const s = applyAction(newGame(data, { seed: 2, classId: "test-fighter" }), data, {
      type: "setOut",
      actId: "long-act",
    });
    expect(s.run?.path).toEqual([1]);
    expect(currentNode(s.run ?? { stage: 1 })?.kind).toBe("fight");
    expect(nextNodes(s.run ?? { stage: 1 }).length).toBe(3);
  });
});

describe("Walking the map", () => {
  it("chooses the next node after a fight; without a choice it takes a fight", () => {
    const s = at(6, "cache");
    // Two nodes ahead are a fork, even of the same kind; a single way on is none.
    expect(pathOpen(s.run ?? { stage: 1 })).toBe(nextNodes(s.run ?? { stage: 1 }).length > 1);
    const rows = s.run?.map?.rows.map((row, r) =>
      r === 4 ? row.map((n) => ({ ...n, next: [n.lane] })) : row,
    );
    const single = { ...s.run, map: { rows: rows ?? [] } } as GameState["run"];
    expect(pathOpen(single ?? { stage: 1 })).toBe(false);
    expect(() => applyAction(s, data, { type: "chooseNode", lane: 7 })).toThrow();
    const there = arrive(s, 2);
    expect(there.run).toMatchObject({ stage: 6, phase: "intermission" });
    expect(there.run?.path?.[5]).toBe(2);
    expect(there.run?.visit?.kind).toBe("cache");
    // A Cache everywhere ahead: the default walks onto the first one anyway.
    expect(defaultNext(s.run ?? { stage: 1 })?.lane).toBe(0);
    const fight = at(6, "fight");
    expect(applyAction(fight, data, { type: "continue" }).run?.visit).toBeUndefined();
  });

  it("an Elite node holds a sure Elite that pays in loot, not in a Boon", () => {
    let s = arrive(at(6, "elite"));
    s = applyAction(s, data, { type: "startStage" });
    expect(s.run?.encounter?.eliteModifiers.length).toBeGreaterThan(0);
    s = applyAction({ ...s, hero: { ...s.hero, level: 30 } }, data, { type: "resolveFight" });
    expect(s.run?.rewards?.boonOffer).toBeUndefined();
    expect(s.run?.rewards?.items.length).toBe(PROGRESSION.itemChoices);
  });

  it("quiet nodes have no fight; the road goes on with continue", () => {
    const s = arrive(at(6, "hearth"));
    expect(() => applyAction(s, data, { type: "startStage" })).toThrow();
    const on = applyAction(s, data, { type: "continue" });
    expect(on.run?.stage).toBe(7);
  });
});

describe("Quiet nodes", () => {
  it("Hearth: rest heals, or a Flask charge while the Flask has room", () => {
    const s = arrive(at(6, "hearth"));
    const hurt = { ...s, run: s.run && { ...s.run, lifeFraction: 0.3 } };
    const rested = applyAction(hurt, data, { type: "visitNode", choice: 0 });
    expect(rested.run?.lifeFraction).toBeCloseTo(0.3 + PROGRESSION.hearthNode);
    expect(rested.run?.visit?.done).toBe(true);
    expect(() => applyAction(rested, data, { type: "visitNode", choice: 1 })).toThrow();
    // The Flask is full after a set-out.
    expect(() => applyAction(hurt, data, { type: "visitNode", choice: 1 })).toThrow();
    const emptier = { ...hurt, flaskCharges: 0 };
    expect(applyAction(emptier, data, { type: "visitNode", choice: 1 }).flaskCharges).toBe(1);
  });

  it("Cache: an item pick, its Runes or its Ember Coal", () => {
    const s = arrive(at(6, "cache"));
    const visit = s.run?.visit;
    expect(visit?.runes?.length).toBe(1);
    expect(visit?.emberCoal).toBeGreaterThan(0);
    const items = applyAction(s, data, { type: "visitNode", choice: 0 });
    expect(items.run?.phase).toBe("rewards");
    expect(items.run?.rewards?.items.length).toBe(PROGRESSION.itemChoices);
    expect(() => applyAction(items, data, { type: "continue" })).toThrow();
    const taken = applyAction(items, data, { type: "salvageAll" });
    expect(applyAction(taken, data, { type: "continue" }).run?.stage).toBe(7);
    const runes = applyAction(s, data, { type: "visitNode", choice: 1 });
    expect(runes.wallet.runes[visit?.runes?.[0] ?? ""]).toBe(1);
    const coal = applyAction(s, data, { type: "visitNode", choice: 2 });
    expect(coal.wallet.emberCoal).toBe(s.wallet.emberCoal + (visit?.emberCoal ?? 0));
  });

  it("Shrine: a Boon offer like a fight's Shrine, not on a walk past the Gate", () => {
    const s = arrive(at(6, "shrine"));
    expect(s.run?.phase).toBe("rewards");
    expect(s.run?.rewards?.boonOffer?.length).toBeGreaterThan(0);
    expect(s.run?.rewards?.items).toEqual([]);
  });

  it("Marisha: three slots a quarter cheaper, each offer once", () => {
    const s = arrive(at(7, "marisha"));
    expect(s.run?.visit?.slots?.length).toBe(Math.min(ROAD_GAMBLE.slots, 2));
    const act = LONG_ACT;
    const full = gamblePrice(stageMonsterLevel(data, act, act.stages, 0));
    expect(roadGamblePrice(s, data)).toBe(Math.round(full * 0.75));
    expect(() => applyAction(s, data, { type: "visitNode", choice: 0 })).toThrow();
    const rich = { ...s, wallet: { ...s.wallet, acorns: 10_000 } };
    const bought = applyAction(rich, data, { type: "visitNode", choice: 0 });
    expect(bought.inventory.length).toBe(rich.inventory.length + 1);
    expect(bought.wallet.acorns).toBe(10_000 - roadGamblePrice(s, data));
    expect(() => applyAction(bought, data, { type: "visitNode", choice: 0 })).toThrow();
  });

  it("Marisha shows up on every map until she joined the caravan", () => {
    const sure = maps(LONG_ACT, 200, { ...OPTIONS, marisha: true });
    for (const m of sure) expect(m.rows.flat().some((n) => n.kind === "marisha")).toBe(true);
    const some = maps(LONG_ACT).filter((m) => m.rows.flat().some((n) => n.kind === "marisha"));
    expect(some.length).toBeLessThan(200);
  });

  it("Marisha joins at the third meeting on the road, one scene each", () => {
    let s = arrive(at(7, "marisha"));
    expect(s.progress.marishaMeetings).toBe(1);
    expect(s.blips).toEqual(["marisha-1"]);
    expect(s.progress.met).not.toContain("marisha");
    s = arrive({ ...at(7, "marisha"), progress: s.progress, blips: s.blips ?? [] });
    expect(s.progress.marishaMeetings).toBe(2);
    s = arrive({ ...at(7, "marisha"), progress: s.progress, blips: s.blips ?? [] });
    expect(s.progress.met).toContain("marisha");
    expect(s.blips).toEqual(["marisha-1", "marisha-2", "marisha-3"]);
    // Met: no more scenes on the road.
    s = arrive({ ...at(7, "marisha"), progress: s.progress, blips: [] });
    expect(s.blips).toEqual([]);
    expect(s.progress.marishaMeetings).toBe(3);
  });
});

describe("Events", () => {
  /** Standing at an Event node with the Event `id`. */
  function event(id: string, seed = 3): GameState {
    const s = arrive(at(6, "event", seed));
    return { ...s, run: s.run && { ...s.run, visit: { kind: "event", event: id } } };
  }

  it("roll an Event the trip has not met, and can always be left for free", () => {
    const s = arrive(at(6, "event"));
    expect(s.run?.visit?.event).toBeDefined();
    expect(s.run?.events).toEqual([s.run?.visit?.event]);
    const left = applyAction(s, data, { type: "visitNode", choice: -1 });
    expect(left.run?.visit?.done).toBe(true);
    expect(left.wallet).toEqual(s.wallet);
  });

  it("pay their price and give their reward; a price never takes the last Life", () => {
    const s = event("altar");
    const given = applyAction(s, data, { type: "visitNode", choice: 0 });
    expect(given.run?.lifeFraction).toBeCloseTo((s.run?.lifeFraction ?? 0) - 0.2);
    expect(given.run?.rewards?.runes.length).toBe(1);
    const weak = { ...s, run: s.run && { ...s.run, lifeFraction: 0.2 } };
    expect(() => applyAction(weak, data, { type: "visitNode", choice: 0 })).toThrow();
  });

  it("price Acorns in fights of the stage, and give XP the same way", () => {
    const s = event("peddler");
    expect(() =>
      applyAction({ ...s, flaskCharges: 0 }, data, { type: "visitNode", choice: 0 }),
    ).toThrow();
    const rich = { ...s, flaskCharges: 0, wallet: { ...s.wallet, acorns: 10_000 } };
    const bought = applyAction(rich, data, { type: "visitNode", choice: 0 });
    expect(bought.flaskCharges).toBe(1);
    expect(bought.wallet.acorns).toBeLessThan(10_000);
    const trained = applyAction(s, data, { type: "visitNode", choice: 1 });
    expect(trained.run?.rewards?.xp).toBeGreaterThan(0);
    expect(trained.hero.xp + trained.hero.level).toBeGreaterThan(s.hero.xp + s.hero.level);
  });

  it("Cursed Spark: a Boon, and enemies hit harder until the next Waymark", () => {
    const s = applyAction(event("spark"), data, { type: "visitNode", choice: 0 });
    expect(s.run?.rewards?.boonOffer?.length).toBeGreaterThan(0);
    expect(s.run?.curse).toEqual({ damage: 0.15, until: 10 });
    const picked = applyAction(s, data, { type: "pickBoon", index: 0 });
    const on = applyAction(picked, data, { type: "continue" });
    const next = on.run?.visit ? applyAction(on, data, { type: "continue" }) : on;
    if (next.run && !next.run.visit) {
      const fight = applyAction(next, data, { type: "startStage" }).run?.encounter;
      const kind = fight?.eliteModifiers.length
        ? PROGRESSION.stageKinds.elite
        : PROGRESSION.stageKinds.normal;
      expect(fight?.pressure?.damage).toBeCloseTo(kind.damage * 1.15);
    }
  });

  it("Ashen Challenger: the next fight is an Elite with two picks", () => {
    let s = applyAction(event("challenger"), data, { type: "visitNode", choice: 0 });
    expect(s.run?.challenge).toBe(true);
    s = { ...s, run: s.run && { ...s.run, visit: undefined, stage: 7 } } as GameState;
    const rows = s.run?.map?.rows.map((row, r) =>
      r === 6 ? row.map((n) => ({ ...n, kind: "fight" as const })) : row,
    );
    s = { ...s, run: s.run && rows ? { ...s.run, map: { rows } } : s.run };
    s = applyAction(s, data, { type: "startStage" });
    expect(s.run?.encounter?.challenge).toBe(true);
    expect(s.run?.encounter?.eliteModifiers.length).toBeGreaterThan(0);
    s = applyAction({ ...s, hero: { ...s.hero, level: 30 } }, data, { type: "resolveFight" });
    expect(s.run?.rewards?.picks).toBe(PROGRESSION.challengePicks);
    expect(s.run?.challenge).toBeUndefined();
  });

  it("Lost Cub costs a Flask charge and makes the next pick lucky; a chest's trap may hurt", () => {
    const s = applyAction(event("cub"), data, { type: "visitNode", choice: 0 });
    expect(s.run?.lucky).toBe(true);
    expect(s.flaskCharges).toBe((event("cub").flaskCharges ?? 0) - 1);
    const chest = applyAction(event("cub"), data, { type: "visitNode", choice: 1 });
    expect(chest.run?.lifeFraction).toBeCloseTo(0.75);
    expect(chest.run?.rewards?.items.length).toBe(PROGRESSION.itemChoices);
  });
});
