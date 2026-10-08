import { ITEM_CATALOG } from "@emberheir/content";
import { type Equipment, getBase } from "@emberheir/sim";
import type { HeroLook } from "./battle/ArenaScene";
import { PLAIN_LOOK, type WeaponLook } from "./camp/weaponArt";

const WEAPONS = new Set<HeroLook["weapon"]>(["axe", "dagger", "bow", "crossbow", "mace", "staff"]);
const OFF_HANDS: Record<string, HeroLook["offHand"]> = {
  "round-shield": "shield",
  "ember-focus": "focus",
  quiver: "quiver",
  "blood-talisman": "talisman",
  grimoire: "grimoire",
};
const CLASSES = new Set<HeroLook["heroClass"]>([
  "warrior",
  "reaver",
  "hunter",
  "sorcerer",
  "warlock",
]);

/**
 * How the Heir looks in the arena: the class's body, its own weapon in the build's look and the
 * off hand, and the colour of the Echo worn on the weapon.
 */
export function heroLookOf(
  classId: string,
  weaponId: string,
  equipment: Equipment,
  echo?: number,
  weaponLook: WeaponLook = PLAIN_LOOK,
): HeroLook {
  const main = getBase(ITEM_CATALOG, weaponId);
  const off = equipment.offHand ? getBase(ITEM_CATALOG, equipment.offHand.baseId) : undefined;
  const kind = main?.weapon?.id as HeroLook["weapon"] | undefined;
  return {
    heroClass: CLASSES.has(classId as HeroLook["heroClass"])
      ? (classId as HeroLook["heroClass"])
      : "warrior",
    weapon: kind && WEAPONS.has(kind) ? kind : main?.weapon?.range === "ranged" ? "wand" : "sword",
    weaponId,
    weaponLook,
    offHand: off
      ? (OFF_HANDS[off.id] ?? (off.fitsWeaponRange === "ranged" ? "focus" : "shield"))
      : null,
    ...(echo !== undefined ? { echo } : {}),
  };
}
