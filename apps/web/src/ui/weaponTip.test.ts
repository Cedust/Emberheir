import { GAME_DATA } from "@emberheir/content";
import { type GameState, heroSetup, newGame, speedValue } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { heroWeaponTip, newWeaponTip } from "./weaponTip";

const fresh = (classId: string, weapon?: string) =>
  newGame(GAME_DATA, { seed: 1, classId, ...(weapon ? { weapon } : {}) });

describe("weapon tooltip", () => {
  it("shows a new Sword as it fights, with its own Speed and Innate", () => {
    const state = fresh("cinderguard", "sword");
    const tip = heroWeaponTip(state);
    const weapon = heroSetup(state, GAME_DATA).setup.weapon;
    expect(tip.name).toBe("Crude Sword");
    expect(tip.rank).toBe(0);
    expect(tip.damage).toEqual({
      min: weapon.damage.min,
      max: weapon.damage.max,
      type: weapon.damageType,
    });
    expect(tip.speed).toBe(speedValue(weapon.attacksPerSecond));
    expect(tip.innate?.level).toBe(1);
    expect(tip.path).toBeUndefined();
    expect(tip.keystone).toBeUndefined();
    expect(tip.triggers.some((t) => t.startsWith("When Hit"))).toBe(true);
    expect(tip.nextGrade).toEqual({ name: "Honed", rank: 4 });
  });

  it("names every weapon's own Speed, not the Sword's", () => {
    expect(newWeaponTip("crossbow").speed).toBeLessThan(newWeaponTip("sword").speed);
    expect(newWeaponTip("dagger").speed).toBeGreaterThan(newWeaponTip("sword").speed);
  });

  it("matches the class select's preview for a new hero", () => {
    const tip = heroWeaponTip(fresh("emberseer", "wand"));
    expect({ ...newWeaponTip("wand"), pointsLeft: tip.pointsLeft }).toEqual(tip);
  });

  it("shows the walked path, the Keystone and the grade once the Heirloom grows", () => {
    const start = fresh("cinderguard", "sword");
    const state: GameState = {
      ...start,
      hero: {
        ...start.hero,
        level: 20,
        mastery: { learned: { "edge-t1": 1 }, choices: { keystone: "perfect-parry" }, echo: null },
      },
    };
    const tip = heroWeaponTip(state);
    expect(tip.path?.name).toBeTruthy();
    expect(tip.keystone?.name).toBe("Perfect Parry");
    expect(tip.keystoneId).toBe("perfect-parry");
    expect(tip.name).toContain("Parrying Blade");
    expect(tip.grade).toBeGreaterThan(0);
    expect(tip.innate?.level).toBe(1 + tip.grade);
  });
});
