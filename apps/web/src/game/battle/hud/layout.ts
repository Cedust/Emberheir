/**
 * Battle HUD geometry in stage pixels, shared by the PixiJS layer (orbs, bar body, liquid enemy
 * Life) and the DOM layer on top of it (slots, text, tooltips), so both line up exactly.
 */

/** Height of the bottom bar body. */
export const BAR_H = 104;
/** Life and Heat orb radius (the glass, without the frame). */
export const ORB_R = 84;
/** Orb centers sit this far above the bottom edge. */
export const ORB_LIFT = 100;

/** The enemy frame at the top center. */
export const ENEMY_TOP = 70;
export const ENEMY_W = 640;
/** The liquid enemy Life bar inside the enemy frame (relative to the frame). */
export const ENEMY_LIFE = { x: 20, y: 40, w: 600, h: 24 } as const;

export interface HudLayout {
  /** Stage size. */
  readonly w: number;
  readonly h: number;
  /** Horizontal center. */
  readonly cx: number;
  /** Distance of each orb center from the center: the orbs frame the 16:9 safe area. */
  readonly orbDx: number;
  readonly lifeOrb: { readonly x: number; readonly y: number };
  readonly heatOrb: { readonly x: number; readonly y: number };
  /** The enemy Life bar rectangle in stage pixels. */
  readonly enemyLife: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

export function hudLayout(w: number, h: number): HudLayout {
  const cx = w / 2;
  const orbDx = Math.min(700, w / 2 - ORB_R - 22);
  const y = h - ORB_LIFT;
  const frameX = cx - ENEMY_W / 2;
  return {
    w,
    h,
    cx,
    orbDx,
    lifeOrb: { x: cx - orbDx, y },
    heatOrb: { x: cx + orbDx, y },
    enemyLife: {
      x: frameX + ENEMY_LIFE.x,
      y: ENEMY_TOP + ENEMY_LIFE.y,
      w: ENEMY_LIFE.w,
      h: ENEMY_LIFE.h,
    },
  };
}
