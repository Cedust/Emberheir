import type { Ticker } from "pixi.js";
import { describe, expect, it } from "vitest";
import { FramePacer, IDLE_FPS, MAX_FPS, wantsAntialias } from "./pixiPacing";

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
