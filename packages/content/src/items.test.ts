import { TRIGGER_CONDITIONS, TRIGGER_EFFECTS } from "./codex";
import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_SLOTS,
  ITEM_SLOTS,
  Rng,
  affixPool,
  basesForSlot,
  createEnemySetup,
  describeItem,
  powersForSlot,
  resolveEquipment,
  runFight,
  type Rarity,
} from "@emberheir/sim";
import { ACT1_ENEMIES } from "./enemies";
import { RUNES, RUNEWORDS, UNIQUES } from "./legendary";
import { STARTING_ATTRIBUTES, createHeroSetup } from "./heroes";
import {
  AFFIXES,
  ITEM_BASES,
  ITEM_CATALOG,
  STAT_AFFIXES,
  TRIGGER_AFFIXES,
  rollGear,
} from "./items";
import { HERO_WEAPONS } from "./weapons";

describe("item content", () => {
  it("has at least 30 stat and 8 trigger affixes", () => {
    expect(STAT_AFFIXES.length).toBeGreaterThanOrEqual(30);
    expect(TRIGGER_AFFIXES.length).toBeGreaterThanOrEqual(8);
    // Plus one never-dropping affix per Trigger Codex pair (Kindle).
    expect(AFFIXES.length + TRIGGER_CONDITIONS.length * TRIGGER_EFFECTS.length).toBe(
      ITEM_CATALOG.affixes.size,
    );
    expect(ITEM_BASES.length).toBe(ITEM_CATALOG.bases.size);
  });

  it("every Codex part can be learned from a trigger affix that drops", () => {
    const taught = TRIGGER_AFFIXES.flatMap((a) => (a.parts ? [a.parts] : []));
    expect(taught).toHaveLength(TRIGGER_AFFIXES.length);
    for (const c of TRIGGER_CONDITIONS) {
      expect(
        taught.some((p) => p.condition === c.id),
        c.id,
      ).toBe(true);
    }
    for (const e of TRIGGER_EFFECTS) {
      expect(
        taught.some((p) => p.effect === e.id),
        e.id,
      ).toBe(true);
    }
  });

  it("every hero weapon has a base item, and every base can roll stat and trigger affixes", () => {
    for (const weapon of HERO_WEAPONS) {
      expect(
        ITEM_BASES.some((b) => b.weapon?.id === weapon.id),
        weapon.id,
      ).toBe(true);
    }
    for (const base of ITEM_BASES) {
      expect(affixPool(AFFIXES, base.slot, "stat").length, base.id).toBeGreaterThanOrEqual(5);
      expect(affixPool(AFFIXES, base.slot, "trigger").length, base.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("every item slot has bases, armor slots a light, a heavy and a caster one", () => {
    for (const slot of ITEM_SLOTS) {
      expect(basesForSlot(ITEM_CATALOG, slot).length, slot).toBeGreaterThan(0);
    }
    for (const slot of ["helm", "body", "gloves", "boots"] as const) {
      const needs = basesForSlot(ITEM_CATALOG, slot).map((b) =>
        Object.keys(b.requirements ?? {}).join(),
      );
      expect(needs.sort(), slot).toEqual(["agility", "intelligence", "strength"]);
    }
  });

  it("affix ranges are sane", () => {
    for (const affix of AFFIXES) {
      expect(affix.value.min, affix.id).toBeGreaterThan(0);
      expect(affix.value.max, affix.id).toBeGreaterThanOrEqual(affix.value.min);
      // Weight 0 = granted only by Legendary Powers, never rolled.
      if (affix.weight > 0) expect(affix.slots.length, affix.id).toBeGreaterThan(0);
    }
  });

  it("every Runeword fits some base, every slot has a Legendary Power", () => {
    for (const word of RUNEWORDS) {
      const fits = ITEM_BASES.some(
        (b) => word.slots.includes(b.slot) && (b.maxSockets ?? 0) >= word.runes.length,
      );
      expect(fits, word.id).toBe(true);
      expect(new Set(RUNES.map((r) => r.rank)).size).toBe(RUNES.length);
    }
    for (const slot of new Set(ITEM_BASES.map((b) => b.slot))) {
      expect(powersForSlot(ITEM_CATALOG, slot).length, slot).toBeGreaterThan(0);
    }
    expect(ITEM_CATALOG.uniques.size).toBe(UNIQUES.length);
  });

  it("rolls a full 10-slot gear set with a fitting off hand", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const weapon of HERO_WEAPONS) {
        const gear = rollGear(
          { weaponBaseId: weapon.id, rarity: "mixed", itemLevel: 3 },
          new Rng(seed),
        );
        expect(Object.keys(gear).sort()).toEqual([...EQUIPMENT_SLOTS].sort());
        const strongHero = { ...STARTING_ATTRIBUTES, strength: 30, agility: 30, intelligence: 30 };
        const resolved = resolveEquipment(gear, ITEM_CATALOG, strongHero);
        expect(resolved.inactive).toEqual([]);
        expect(resolved.weapon?.id).toBe(weapon.id);
        for (const item of Object.values(gear)) {
          expect(describeItem(item, ITEM_CATALOG).affixLines.length).toBe(item.affixes.length);
        }
      }
    }
  });

  it("better gear ends fights faster and with more life left", () => {
    const measure = (rarity: Rarity | null) => {
      let duration = 0;
      let lifeLeft = 0;
      for (const weapon of HERO_WEAPONS) {
        for (const enemy of ACT1_ENEMIES) {
          for (let seed = 1; seed <= 20; seed++) {
            const equipment = rarity
              ? rollGear({ weaponBaseId: weapon.id, rarity, itemLevel: 3 }, new Rng(seed))
              : {};
            const hero = createHeroSetup({ weapon, equipment, level: 3 });
            const result = runFight(hero, createEnemySetup(enemy, 3), seed);
            duration += result.duration;
            lifeLeft += result.final.hero.life / result.final.hero.maxLife;
          }
        }
      }
      return { duration, lifeLeft };
    };
    const none = measure(null);
    const rare = measure("rare");
    const epic = measure("epic");
    expect(rare.duration).toBeLessThan(none.duration);
    expect(epic.duration).toBeLessThan(rare.duration);
    expect(epic.lifeLeft).toBeGreaterThan(none.lifeLeft);
  });
});
