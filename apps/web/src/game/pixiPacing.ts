import type { Ticker } from "pixi.js";

/** Frames per second a Pixi scene draws at most: a 144 Hz screen gets no extra frames. */
export const MAX_FPS = 60;
/** Frames per second of a calm camp scene: embers and breathing glows still look smooth. */
export const IDLE_FPS = 30;
/** Frames per second of a paused fight under an overlay: the picture holds still. */
export const PAUSED_FPS = 5;
/** Seconds without camera movement or input before a scene drops to IDLE_FPS. */
const IDLE_AFTER = 1.5;
/**
 * Highest canvas pixel density. 4K at 16:9 needs 2.4 (stage scale 2.4 at devicePixelRatio 1);
 * a HiDPI laptop or a 5K screen asked for up to 4 before, which only cost GPU work.
 */
export const MAX_RESOLUTION = 2.5;

/**
 * The Graphics Quality setting: how sharp the arena canvas renders, how many particles it keeps
 * and how thick the act weather falls. The arena is limited by the pixels it fills, not by the
 * game logic: the painted act backdrops are about 1900 px wide, more density gives them nothing.
 */
export type GraphicsQuality = "high" | "medium" | "low";

export const QUALITY: Readonly<
  Record<
    GraphicsQuality,
    {
      /** Highest pixel density of the arena canvas. */
      readonly maxResolution: number;
      /** Live particles at most; above it new ones are dropped. */
      readonly particles: number;
      /** Share of the act weather that falls. */
      readonly weather: number;
    }
  >
> = {
  high: { maxResolution: MAX_RESOLUTION, particles: 1400, weather: 1 },
  medium: { maxResolution: 1.5, particles: 900, weather: 1 },
  low: { maxResolution: 1, particles: 450, weather: 0.5 },
};

/** Canvas pixel density for a canvas inside the scaled stage (devicePixelRatio x stage scale). */
export function canvasResolution(stageScale: number, max = MAX_RESOLUTION): number {
  return Math.min(max, (window.devicePixelRatio || 1) * stageScale);
}

/**
 * Edge smoothing (MSAA) only below 2x density: at 2x and more the edges are already fine and
 * MSAA would multiply the GPU work on big screens.
 */
export function wantsAntialias(resolution: number): boolean {
  return resolution < 2;
}

/**
 * Paces a scene's ticker: full rate while the camera moves or a finger is down, IDLE_FPS once
 * the scene has been calm for a moment (the Skill Tree and Weapon Mastery mostly sit still).
 */
export class FramePacer {
  private calm = 0;

  constructor(private readonly ticker: Ticker) {
    ticker.maxFPS = MAX_FPS;
  }

  /** Call once per frame with whether something is moving right now. */
  update(dt: number, busy: boolean): void {
    if (busy) {
      this.calm = 0;
      this.ticker.maxFPS = MAX_FPS;
      return;
    }
    this.calm += dt;
    if (this.calm >= IDLE_AFTER) this.ticker.maxFPS = IDLE_FPS;
  }
}
