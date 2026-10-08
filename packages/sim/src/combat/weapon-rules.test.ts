import { describe, expect, it } from "vitest";
import { type CombatEvent, Fight, runFight } from "./fight";
import { TEST_WEAPON, dummy, setup } from "./test-fixtures";
import type { CombatantSetup, TriggerSpec, WeaponRules } from "./types";

/** Weapon Mastery mechanics in a fight (waffe-als-system-v1.md). */

const NO_CRIT = { critChance: -1 };

const hits = (events: readonly CombatEvent[], side: "hero" | "enemy" = "hero") =>
  events.filter(
    (e): e is Extract<CombatEvent, { type: "hit" }> => e.type === "hit" && e.side === side,
  );

/** A hero with the test blade at a Precision, hitting a dummy for 10 s. */
function fight(precision: number, weaponRules?: WeaponRules, extra: Partial<CombatantSetup> = {}) {
  const hero = setup({
    weapon: { ...TEST_WEAPON, precision },
    bonuses: NO_CRIT,
    ...(weaponRules ? { weaponRules } : {}),
    ...extra,
  });
  const f = new Fight(hero, dummy(), 7);
  f.advance(10);
  return f;
}

describe("Weapon Mastery in a fight", () => {
  it("a failed Precision roll is a Glancing Blow: half damage, no on-hit triggers", () => {
    const onHit: TriggerSpec = {
      id: "spark",
      name: "Spark",
      condition: { kind: "onHit" },
      effect: { kind: "heat", amount: 1 },
    };
    const glance = fight(0, undefined, { triggers: [onHit] });
    const all = hits(glance.events);
    expect(all.length).toBeGreaterThan(5);
    expect(all.every((h) => h.glancing && h.damage === 5 && !h.crit)).toBe(true);
    expect(glance.events.some((e) => e.type === "trigger" && e.name === "Spark")).toBe(false);

    const clean = hits(fight(1).events);
    expect(clean.every((h) => !h.glancing && h.damage === 10)).toBe(true);
  });

  it("Precision lands about as often as it says", () => {
    const all = hits(
      runFight(setup({ weapon: { ...TEST_WEAPON, precision: 0.6 } }), dummy(), 3).events,
    );
    const share = all.filter((h) => !h.glancing).length / all.length;
    expect(share).toBeGreaterThan(0.45);
    expect(share).toBeLessThan(0.75);
  });

  it("Hunter's Mark: Glancing Blows deal nothing until the first clean hit", () => {
    const all = hits(fight(0.3, { mark: { bonus: 0.5 } }).events);
    const first = all.findIndex((h) => !h.glancing);
    expect(first).toBeGreaterThan(-1);
    expect(all.slice(0, first).every((h) => h.damage === 0)).toBe(true);
    // The first clean hit marks; after it clean hits deal 15, Glancing Blows 7.5 rounded.
    expect(all[first]?.damage).toBe(10);
    expect(all.slice(first + 1).every((h) => h.damage === (h.glancing ? 8 : 15))).toBe(true);
  });

  it("clean hits stack Sunder up to its cap", () => {
    const f = fight(1, { sunder: { chance: 1, perStack: 0.05, maxStacks: 4, duration: 5 } });
    const sunder = f.snapshot().enemy.curses.find((c) => c.name === "Sunder");
    expect(sunder).toMatchObject({ stacks: 4 });
    expect(sunder?.armor).toBeCloseTo(0.2);
  });

  it("the Opener crits with extra damage once; Every Nth Crit lands on every Nth attack", () => {
    const opener = hits(fight(1, { openerDamage: 1 }).events);
    expect(opener[0]).toMatchObject({ crit: true, damage: 30 });
    expect(opener.slice(1).every((h) => !h.crit)).toBe(true);

    const nth = hits(fight(0, { everyNthCrit: 3 }).events);
    nth.forEach((h, i) => {
      expect(h.crit).toBe((i + 1) % 3 === 0);
      expect(h.glancing).toBe((i + 1) % 3 !== 0 ? true : undefined);
    });
  });

  it("a streak of clean hits builds a buff that a Glancing Blow ends", () => {
    const f = fight(1, { streak: { stat: "attackSpeed", amount: 0.02, max: 5 } });
    expect(f.snapshot().hero.buffs.find((b) => b.stat === "attackSpeed")?.stacks).toBe(5);
    const broken = fight(0, { streak: { stat: "attackSpeed", amount: 0.02, max: 5 } });
    expect(broken.snapshot().hero.buffs).toEqual([]);
  });

  it("Damage Dealt multiplies hit damage; Glancing Damage changes the glance", () => {
    expect(hits(fight(1, { damageDealt: 2 }).events)[0]?.damage).toBe(20);
    expect(hits(fight(0, { glancingDamage: 0.8 }).events)[0]?.damage).toBe(8);
  });

  it("Glancing Heat feeds Heat on every Glancing Blow", () => {
    const f = new Fight(
      setup({
        weapon: { ...TEST_WEAPON, precision: 0, heatPerHit: 0 },
        weaponRules: { glancingHeat: 7 },
      }),
      dummy(),
      1,
    );
    f.advance(1.05);
    expect(f.snapshot().hero.heat).toBe(7);
  });

  it("weapons without Precision (enemies) never glance", () => {
    const all = hits(runFight(dummy(), setup(), 1).events, "enemy").slice(0, 10);
    expect(all.every((h) => !h.glancing)).toBe(true);
  });
});
