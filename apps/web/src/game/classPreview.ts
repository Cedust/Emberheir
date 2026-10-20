import { GAME_DATA } from "@emberheir/content";
import { type CombatantSetup, dummySetup, heroSetup, newGame } from "@emberheir/sim";
import type { EnemyLook } from "./battle/enemyArt";
import type { HeroLook } from "./battle/heroArt";
import { heroLookOf } from "./heroLook";
import { heroWeaponLook } from "./weaponLook";

/**
 * The class select preview: a fresh Heir of the class, with the chosen weapon and its start kit,
 * hits Kaelen's Training Dummy (the straw man without defenses that never falls). Built from the
 * real sim, so it plays exactly like the game. Fixed seed: always the same picture.
 */
export interface ClassPreview {
  readonly hero: CombatantSetup;
  readonly enemy: CombatantSetup;
  readonly heroLook: HeroLook;
  readonly enemyLook: EnemyLook;
}

export const DUMMY_LOOK: EnemyLook = {
  id: "training-dummy",
  archetype: "brute",
  boss: false,
  elite: false,
  act: 1,
};

export function dummyPreview(classId: string, weapon: string): ClassPreview {
  const state = newGame(GAME_DATA, { seed: 7, classId, weapon });
  return {
    hero: heroSetup(state, GAME_DATA).setup,
    enemy: dummySetup(state, GAME_DATA, "plain"),
    heroLook: heroLookOf(
      classId,
      state.hero.weaponId,
      state.hero.equipment,
      undefined,
      heroWeaponLook(state),
    ),
    enemyLook: DUMMY_LOOK,
  };
}
