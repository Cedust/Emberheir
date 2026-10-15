import { type Side } from "@emberheir/sim";
import { Container, Graphics } from "pixi.js";

/** The arena's stage coordinates and the helpers every arena module shares. */

/** The arena is drawn for 1440 × 708 stage pixels; wider or taller hosts see more ground. */
export const W = 1440;

export const H = 708;

export const BLEED = 1200;

export const GROUND_Y = 660;

export const HERO_X = 400;

export const ENEMY_X = 1040;

export const INK = 0x2a1f17;

export interface Figure {
  readonly root: Container;
  readonly body: Container;
  readonly side: Side;
  readonly stars: Graphics;
  /** Animation timers, 1 → 0. */
  lunge: number;
  flash: number;
  knock: number;
  recoil: number;
  /** Weapon swing of the painted Heir's forearm. */
  swing: number;
  dodge: number;
  /** Seconds of Stun left. */
  stun: number;
}

export const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Deterministic jitter in -0.5..0.5 (no Math.random needed for looks). */
export function spread(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export function lighten(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * 0.35);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

export function makeFigure(side: Side, body: Container, x: number): Figure {
  const root = new Container();
  root.position.set(x, GROUND_Y);
  const shadow = new Graphics()
    .ellipse(0, 0, side === "hero" ? 150 : 190, 18)
    .fill({ color: 0x1c1a18, alpha: 0.35 });
  const stars = new Graphics();
  stars.visible = false;
  root.addChild(shadow, body, stars);
  return {
    root,
    body,
    side,
    stars,
    lunge: 0,
    flash: 0,
    knock: 0,
    recoil: 0,
    swing: 0,
    dodge: 0,
    stun: 0,
  };
}
