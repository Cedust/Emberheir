import type { Ticker } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import {
  FramePacer,
  IDLE_FPS,
  MAX_FPS,
  QUALITY,
  canvasResolution,
  wantsAntialias,
} from "./pixiPacing";

const ticker = () => ({ maxFPS: 0 }) as Ticker;

describe("FramePacer", () => {
  it("caps the frame rate at once", () => {
    const t = ticker();
    new FramePacer(t);
    expect(t.maxFPS).toBe(MAX_FPS);
  });

  it("drops to the idle rate once the scene has been calm for a moment", () => {
    const t = ticker();
    const pacer = new FramePacer(t);
    pacer.update(1, false);
    expect(t.maxFPS).toBe(MAX_FPS);
    pacer.update(0.6, false);
    expect(t.maxFPS).toBe(IDLE_FPS);
  });

  it("returns to full speed as soon as something moves", () => {
    const t = ticker();
    const pacer = new FramePacer(t);
    pacer.update(5, false);
    pacer.update(0.03, true);
    expect(t.maxFPS).toBe(MAX_FPS);
    pacer.update(1, false);
    expect(t.maxFPS).toBe(MAX_FPS);
  });
});

describe("wantsAntialias", () => {
  it("smooths edges only below 2x pixel density", () => {
    expect(wantsAntialias(1.2)).toBe(true);
    expect(wantsAntialias(2.4)).toBe(false);
  });
});

describe("Graphics Quality", () => {
  it("lowers sharpness, particles and weather step by step", () => {
    const order = [QUALITY.high, QUALITY.medium, QUALITY.low];
    for (let i = 1; i < order.length; i++) {
      const [better, worse] = [order[i - 1], order[i]];
      expect(worse?.maxResolution).toBeLessThan(better?.maxResolution ?? 0);
      expect(worse?.particles).toBeLessThan(better?.particles ?? 0);
      expect(worse?.weather).toBeLessThanOrEqual(better?.weather ?? 0);
    }
  });

  it("caps the canvas density at the quality's limit", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    // 4K at 16:9: stage scale 2.4.
    expect(canvasResolution(2.4, QUALITY.medium.maxResolution)).toBe(1.5);
    expect(canvasResolution(1.2, QUALITY.medium.maxResolution)).toBeCloseTo(1.2);
    vi.unstubAllGlobals();
  });
});
