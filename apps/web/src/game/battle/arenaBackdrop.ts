import { Assets, Sprite, type Texture } from "pixi.js";
import ashenFieldsUrl from "../../assets/arena/ashen-fields.webp";
import emberWastesUrl from "../../assets/arena/ember-wastes.webp";
import frostPeaksUrl from "../../assets/arena/frost-peaks.webp";
import rotwoodUrl from "../../assets/arena/rotwood.webp";

/**
 * Timo's painted arena backdrops (tools/art/cut_arena.py), one per act. `feet` is how far down
 * the painting (0 top, 1 bottom) the fighters should stand on its open ground.
 */
const BACKDROPS: Record<number, { url: string; feet: number }> = {
  1: { url: ashenFieldsUrl, feet: 0.78 },
  2: { url: rotwoodUrl, feet: 0.78 },
  3: { url: emberWastesUrl, feet: 0.78 },
  4: { url: frostPeaksUrl, feet: 0.78 },
};

/** A little larger than the canvas, so screen shake and camera zoom never show its edges. */
const OVERSCAN = 1.06;

export function loadBackdrop(act: number): Promise<Texture | null> {
  const backdrop = BACKDROPS[act];
  if (!backdrop) return Promise.resolve(null);
  return Assets.load<Texture>(backdrop.url).catch(() => null);
}

export function backdropFeet(act: number): number {
  return BACKDROPS[act]?.feet ?? 0.78;
}

/**
 * Covers the `w` x `h` canvas with the painting and puts its ground under the fighters' feet
 * (`feetY` in canvas px) as far as covering the canvas allows.
 */
export function placeBackdrop(sprite: Sprite, feet: number, w: number, h: number, feetY: number) {
  const tex = sprite.texture;
  const s = Math.max(w / tex.width, h / tex.height) * OVERSCAN;
  const iw = tex.width * s;
  const ih = tex.height * s;
  sprite.scale.set(s);
  sprite.x = (w - iw) / 2;
  // Keep a margin above and below for the camera shake.
  const margin = Math.min((ih - h) / 2, 30);
  sprite.y = Math.min(-margin, Math.max(h - ih + margin, feetY - feet * ih));
}
