/**
 * How the build shows on the painted weapon (drawn in weaponArt.ts). Kept apart from the art so
 * the UI can describe a weapon without loading PixiJS.
 */
export interface WeaponLook {
  /** Weapon grade index 0..4 (Crude, Honed, Tempered, Ascendant, Exalted). */
  readonly grade: number;
  /** Colour of the weapon's element (crystal, orb, tip light). */
  readonly accent: number;
  /** Learned ranks per path, in the tree's path order, with the path's colour. */
  readonly runes: readonly { readonly color: number; readonly ranks: number }[];
  /** The chosen Keystone's id, if any. */
  readonly keystone: string | null;
}

export const PLAIN_LOOK: WeaponLook = { grade: 0, accent: 0xff6a2a, runes: [], keystone: null };
