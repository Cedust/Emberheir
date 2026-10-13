import { describe, expect, it } from "vitest";
import { Fight, runFight } from "./fight";
import { FightReplay, recordFight } from "./recording";
import { TEST_SKILL, ZERO_ATTRIBUTES, setup } from "./test-fixtures";

const hero = () =>
  setup({
    attributes: { ...ZERO_ATTRIBUTES, strength: 10, dexterity: 10 },
    rotation: [{ skill: { ...TEST_SKILL, heatCost: 20 } }],
  });
const enemy = () => setup({ baseLife: 180, attributes: { ...ZERO_ATTRIBUTES, agility: 10 } });

describe("fight recording", () => {
  it("is the same fight as a live one: result, events and every tick", () => {
    const recording = recordFight(hero(), enemy(), 9);
    expect(recording.result).toEqual(runFight(hero(), enemy(), 9));
    const live = new Fight(hero(), enemy(), 9);
    for (let i = 0; i < recording.frames.length; i++) {
      expect(recording.frames[i]).toEqual(live.snapshot());
      expect(recording.eventEnds[i]).toBe(live.events.length);
      live.step();
    }
    expect(live.over).toBe(true);
    expect(recording.outcome.winner).toBe(recording.result.winner);
    expect(recording.outcome.heroLife).toBeCloseTo(
      recording.result.final.hero.life / recording.result.final.hero.maxLife,
    );
  });

  it("plays back at the pace of a live fight, frame by frame", () => {
    const replay = new FightReplay(recordFight(hero(), enemy(), 4));
    const live = new Fight(hero(), enemy(), 4);
    // Uneven frame times like a browser's, shorter and longer than a tick.
    const frames = [0.016, 0.017, 0.033, 0.1, 0.008, 0.25, 0.016];
    for (let i = 0; !live.over; i++) {
      const dt = frames[i % frames.length] ?? 0.016;
      expect(replay.advance(dt)).toEqual(live.advance(dt));
      expect(replay.snapshot()).toEqual(live.snapshot());
      expect(replay.over).toBe(live.over);
    }
    expect(replay.events).toEqual(live.events);
  });

  it("knows the outcome from the start and skips to it", () => {
    const recording = recordFight(hero(), enemy(), 2);
    const replay = new FightReplay(recording);
    expect(replay.over).toBe(false);
    expect(replay.outcome).toBe(recording.outcome);
    replay.advance(0.5);
    const rest = replay.skipToEnd();
    expect(replay.over).toBe(true);
    expect(replay.snapshot()).toEqual(recording.result.final);
    expect(replay.events).toEqual(recording.result.events);
    expect(rest.length).toBeGreaterThan(0);
    expect(replay.skipToEnd()).toEqual([]);
  });
});
