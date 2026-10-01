import { describe, expect, it } from "vitest";
import { type CombatEvent, Fight, runFight } from "./fight";
import { TEST_WEAPON, dummy, setup } from "./test-fixtures";
import {
  applyBuff,
  buffBonuses,
  createTriggerState,
  isNthAttack,
  markFired,
  stepBuffs,
  stepTriggers,
  triggerChance,
  triggerReady,
} from "./triggers";
import type { TriggerSpec } from "./types";

const NO_CRIT = { critChance: -1 };
const ALWAYS_CRIT = { critChance: 1 };

const ofType = <T extends CombatEvent["type"]>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const trigger = (spec: Partial<TriggerSpec> & Pick<TriggerSpec, "condition" | "effect">) => ({
  id: "t",
  name: "Test Trigger",
  ...spec,
});

/** Plays `seconds` of a fight and returns all events. */
const play = (hero: ReturnType<typeof setup>, enemy: ReturnType<typeof setup>, seconds: number) => {
  const fight = new Fight(hero, enemy, 1);
  fight.advance(seconds);
  return { fight, events: fight.events };
};

describe("trigger helpers", () => {
  it("Trigger Chance raises the base chance multiplicatively, capped at 100 %", () => {
    expect(triggerChance(0.2, 0)).toBeCloseTo(0.2);
    expect(triggerChance(0.2, 0.5)).toBeCloseTo(0.3);
    expect(triggerChance(0.8, 1)).toBe(1);
  });

  it("Internal Cooldown and once-per-fight block re-firing", () => {
    const state = createTriggerState(
      trigger({ condition: { kind: "onHit" }, effect: { kind: "heat", amount: 5 }, cooldown: 2 }),
    );
    expect(triggerReady(state)).toBe(true);
    markFired(state);
    expect(triggerReady(state)).toBe(false);
    stepTriggers([state], 1.5);
    expect(triggerReady(state)).toBe(false);
    stepTriggers([state], 0.5);
    expect(triggerReady(state)).toBe(true);

    const once = createTriggerState(
      trigger({
        condition: { kind: "onHit" },
        effect: { kind: "heat", amount: 5 },
        oncePerFight: true,
      }),
    );
    markFired(once);
    stepTriggers([once], 100);
    expect(triggerReady(once)).toBe(false);
  });

  it("everySeconds timers report each due firing", () => {
    const state = createTriggerState(
      trigger({
        condition: { kind: "everySeconds", seconds: 2 },
        effect: { kind: "heat", amount: 1 },
      }),
    );
    expect(stepTriggers([state], 1.9)).toEqual([]);
    expect(stepTriggers([state], 0.1)).toEqual([0]);
    expect(stepTriggers([state], 4)).toEqual([0, 0]);
  });

  it("everyNthAttack matches every n-th attack", () => {
    const c = { kind: "everyNthAttack", n: 4 } as const;
    expect([1, 2, 3, 4, 5, 8].map((n) => isNthAttack(c, n))).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
    ]);
  });

  it("buffs stack up to maxStacks, refresh and expire", () => {
    const buff = { id: "b", name: "B", stat: "attackSpeed" as const, amount: 0.1, remaining: 3 };
    let buffs = applyBuff([], buff, 2);
    buffs = applyBuff(buffs, buff, 2);
    buffs = applyBuff(buffs, buff, 2);
    expect(buffs).toHaveLength(1);
    expect(buffs[0]?.stacks).toBe(2);
    expect(buffBonuses(buffs).attackSpeed).toBeCloseTo(0.2);
    expect(stepBuffs(buffs, 2).expired).toBe(false);
    expect(stepBuffs(buffs, 3)).toEqual({ buffs: [], expired: true });
  });
});

describe("triggers in a fight", () => {
  it("On Fight Start fires once at 0 s", () => {
    const hero = setup({
      triggers: [
        trigger({ condition: { kind: "fightStart" }, effect: { kind: "heat", amount: 30 } }),
      ],
    });
    const { fight, events } = play(hero, dummy(), 0.5);
    expect(ofType(events, "trigger")).toEqual([
      { t: 0, type: "trigger", side: "hero", name: "Test Trigger" },
    ]);
    expect(fight.snapshot().hero.heat).toBe(30);
  });

  it("Every Nth Attack adds an extra weapon hit on every 3rd Default Attack", () => {
    const hero = setup({
      bonuses: NO_CRIT,
      triggers: [
        trigger({
          name: "Crushing Blow",
          condition: { kind: "everyNthAttack", n: 3 },
          effect: { kind: "weaponHit", multiplier: 1.5 },
        }),
      ],
    });
    const { events } = play(hero, dummy(), 6.01);
    const extra = ofType(events, "hit").filter((h) => h.source === "Crushing Blow");
    expect(extra.map((h) => h.damage)).toEqual([15, 15]);
  });

  it("On Crit inflicts an ailment; hits from triggers fire no triggers", () => {
    const hero = setup({
      bonuses: ALWAYS_CRIT,
      triggers: [
        trigger({ condition: { kind: "onCrit" }, effect: { kind: "ailment", ailment: "shock" } }),
        trigger({
          id: "echo",
          name: "Echo",
          condition: { kind: "onHit" },
          effect: { kind: "weaponHit", multiplier: 1 },
        }),
      ],
    });
    const { events } = play(hero, dummy(), 1.01);
    expect(ofType(events, "ailment")).toHaveLength(1);
    // One Default Attack + one Echo hit; the Echo hit does not echo again.
    expect(ofType(events, "hit").map((h) => h.source)).toEqual(["Poke", "Echo"]);
  });

  it("chance and Internal Cooldown limit how often a trigger fires", () => {
    const never = setup({
      triggers: [
        trigger({ condition: { kind: "onHit" }, chance: 0, effect: { kind: "heat", amount: 5 } }),
      ],
    });
    expect(ofType(play(never, dummy(), 10).events, "trigger")).toHaveLength(0);

    const cooled = setup({
      triggers: [
        trigger({
          condition: { kind: "onHit" },
          cooldown: 4.5,
          effect: { kind: "heat", amount: 5 },
        }),
      ],
    });
    // Hits at 1, 2, ..., 10 s; fires at 1, 6 (cooldown 4.5 s).
    expect(ofType(play(cooled, dummy(), 10.01).events, "trigger").map((e) => e.t)).toEqual([1, 6]);
  });

  it("Every X Seconds casts a spell hit that cannot be evaded", () => {
    const hero = setup({
      bonuses: NO_CRIT,
      weapon: { ...TEST_WEAPON, attacksPerSecond: 0 },
      triggers: [
        trigger({
          condition: { kind: "everySeconds", seconds: 2 },
          effect: {
            kind: "spellHit",
            name: "Flame Pulse",
            damage: { min: 8, max: 8 },
            damageType: "fire",
          },
        }),
      ],
    });
    const enemy = dummy({ bonuses: { evasion: 0.5 } });
    const hits = ofType(play(hero, enemy, 6.01).events, "hit");
    expect(hits.map((h) => [h.t, h.source, h.damage])).toEqual([
      [2, "Flame Pulse", 8],
      [4, "Flame Pulse", 8],
      [6, "Flame Pulse", 8],
    ]);
  });

  it("When Hit grants Barrier, which absorbs damage before life", () => {
    const hero = dummy({
      baseLife: 100,
      triggers: [
        trigger({
          condition: { kind: "whenHit" },
          oncePerFight: true,
          effect: { kind: "barrier", fraction: 0.2 },
        }),
      ],
    });
    const enemy = setup({ bonuses: NO_CRIT });
    const { fight, events } = play(hero, enemy, 2.01);
    expect(ofType(events, "barrier")).toEqual([
      { t: 1, type: "barrier", side: "hero", amount: 20 },
    ]);
    // First hit: 10 to life; second hit: absorbed by the 20 Barrier.
    expect(fight.snapshot().hero.life).toBe(90);
    expect(fight.snapshot().hero.barrier).toBe(10);
  });

  it("Life below X % heals once on crossing", () => {
    const hero = dummy({
      baseLife: 100,
      triggers: [
        trigger({
          name: "Second Wind",
          condition: { kind: "lifeBelow", threshold: 0.5 },
          oncePerFight: true,
          effect: { kind: "heal", fraction: 0.3 },
        }),
      ],
    });
    const enemy = setup({ bonuses: NO_CRIT });
    const { events } = play(hero, enemy, 9.01);
    // Hits of 10: life 40 after the 6th hit -> heal 30 -> 70.
    expect(ofType(events, "heal")).toEqual([{ t: 6, type: "heal", side: "hero", amount: 30 }]);
  });

  it("On Evade and On Block grant buffs and Heat", () => {
    const evader = dummy({
      bonuses: { evasion: 1 },
      triggers: [
        trigger({
          condition: { kind: "onEvade" },
          effect: { kind: "buff", stat: "attackSpeed", amount: 0.2, duration: 3, maxStacks: 3 },
        }),
      ],
    });
    const { fight, events } = play(evader, setup(), 20.01);
    // Evasion is capped at 50 %, so about half of the 20 attacks are evaded.
    const evades = ofType(events, "evade");
    const buffs = ofType(events, "buff");
    expect(evades.length).toBeGreaterThan(3);
    expect(buffs).toHaveLength(evades.length);
    expect(Math.max(...buffs.map((b) => b.stacks))).toBe(3);
    expect(fight.snapshot().hero.stats.evasion).toBeCloseTo(0.5);

    const blocker = dummy({
      bonuses: { blockChance: 1 },
      triggers: [trigger({ condition: { kind: "onBlock" }, effect: { kind: "heat", amount: 15 } })],
    });
    const blocked = play(blocker, setup(), 1.01);
    expect(blocked.fight.snapshot().hero.heat).toBe(15);
    expect(ofType(blocked.events, "heatGain")).toHaveLength(1);
  });

  it("buffs change derived stats while active", () => {
    const hero = setup({
      triggers: [
        trigger({
          condition: { kind: "fightStart" },
          effect: { kind: "buff", stat: "attackSpeed", amount: 1, duration: 2 },
        }),
      ],
    });
    const fight = new Fight(hero, dummy(), 1);
    fight.advance(1);
    expect(fight.snapshot().hero.stats.attackSpeed).toBeCloseTo(2);
    fight.advance(1.5);
    expect(fight.snapshot().hero.stats.attackSpeed).toBeCloseTo(1);
    expect(fight.snapshot().hero.buffs).toEqual([]);
  });

  it("On Skill Use fires when a Rotation skill is used", () => {
    const hero = setup({
      bonuses: { startingHeat: 100 },
      rotation: [
        {
          skill: {
            id: "s",
            name: "S",
            type: "attack",
            heatCost: 50,
            tags: [],
            description: "",
            hits: [{ kind: "weapon", multiplier: 1 }],
          },
        },
      ],
      triggers: [
        trigger({ condition: { kind: "onSkillUse" }, effect: { kind: "heat", amount: 10 } }),
      ],
    });
    const { events } = play(hero, dummy(), 1.01);
    expect(ofType(events, "skill")).toHaveLength(1);
    expect(ofType(events, "trigger")).toHaveLength(1);
  });

  it("extra attacks from a weapon trigger (Riposte) are Default Attacks", () => {
    const hero = dummy({
      weapon: {
        ...TEST_WEAPON,
        attacksPerSecond: 0,
        triggers: [
          trigger({
            name: "Riposte",
            condition: { kind: "whenHit" },
            effect: { kind: "extraAttack" },
          }),
        ],
      },
    });
    const hits = ofType(play(hero, setup(), 1.01).events, "hit");
    expect(hits.map((h) => [h.side, h.source])).toEqual([
      ["enemy", "Poke"],
      ["hero", "Poke"],
    ]);
  });

  it("Thorns deal flat damage back for every hit taken", () => {
    const hero = dummy({ bonuses: { thorns: 3 } });
    const result = play(hero, setup({ bonuses: NO_CRIT }), 2.01);
    const thorns = ofType(result.events, "hit").filter((h) => h.source === "Thorns");
    expect(thorns.map((h) => h.damage)).toEqual([3, 3]);
    expect(result.fight.snapshot().enemy.life).toBe(94);
  });

  it("gear ailment chances apply to every hit", () => {
    const hero = setup({ bonuses: { chillChance: 1 } });
    const events = runFight(hero, setup({ baseLife: 30 }), 1).events;
    expect(ofType(events, "ailment").filter((a) => a.ailment === "chill").length).toBeGreaterThan(
      0,
    );
  });
});
