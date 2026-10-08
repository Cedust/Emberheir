import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  type MasteryState,
  heroWeaponRank,
  masteryRanks,
  weaponBase,
} from "@emberheir/sim";
import type { WeaponLook } from "./camp/weaponArt";
import { gradeIndex } from "./WeaponSlot";

export const ELEMENT_COLOR: Record<string, number> = {
  fire: 0xff6a2a,
  cold: 0x8ec8f0,
  lightning: 0xffe066,
  void: 0xa070e0,
  physical: 0xe0b45a,
};

/**
 * How the build shows on the painted weapon: grade metal, a rune per learned path rank in the
 * path's colour, the Keystone's shape and the element's light.
 */
export function weaponLookOf(weaponId: string, mastery: MasteryState, rank: number): WeaponLook {
  const tree = GAME_DATA.weaponMastery[weaponId];
  const nodes = tree?.nodes ?? [];
  const attunement = nodes.find(
    (n) => n.kind === "attunement" && tree && masteryRanks(tree, mastery, n.id) > 0,
  );
  const element =
    attunement?.effect.attunement?.damageType ?? weaponBase(GAME_DATA, weaponId).damageType;
  return {
    grade: gradeIndex(rank),
    accent: ELEMENT_COLOR[element] ?? 0xff6a2a,
    runes: (tree?.paths ?? []).map((path) => ({
      color: path.color,
      ranks: nodes
        .filter((n) => n.path === path.id)
        .reduce((sum, n) => sum + (tree ? masteryRanks(tree, mastery, n.id) : 0), 0),
    })),
    keystone: mastery.choices.keystone ?? null,
  };
}

/** The hero's weapon look. */
export function heroWeaponLook(state: GameState): WeaponLook {
  return weaponLookOf(state.hero.weaponId, state.hero.mastery, heroWeaponRank(state));
}
