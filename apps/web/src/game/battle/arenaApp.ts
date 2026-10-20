import { Application } from "pixi.js";
import { MAX_FPS, wantsAntialias } from "../pixiPacing";

/**
 * One Pixi app (one WebGL context) for every arena: the Intermission, each fight and the class
 * preview borrow it in turn instead of building their own. Building an app, its textures and its
 * GPU state was the stutter at the start of each fight. While the shared app is borrowed, a
 * second arena (rare: a preview over a fight) gets a private app of its own.
 */
export interface ArenaLease {
  readonly app: Application;
  /** Gives the app back: the canvas leaves the page, the stage must already be empty. */
  release(): void;
}

interface Slot {
  readonly app: Application;
  readonly antialias: boolean;
  busy: boolean;
}

let shared: Promise<Slot | null> | null = null;

async function createApp(
  width: number,
  height: number,
  resolution: number,
): Promise<Application | null> {
  const app = new Application();
  try {
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: wantsAntialias(resolution),
      resolution,
      autoDensity: true,
    });
  } catch {
    // No WebGL: the fight still runs, only the arena art is missing.
    return null;
  }
  return app;
}

async function privateLease(w: number, h: number, res: number): Promise<ArenaLease | null> {
  const app = await createApp(w, h, res);
  return app && { app, release: () => app.destroy(true, { children: true }) };
}

/** Borrows the arena app at this size; resolves with null without WebGL. */
export async function leaseArenaApp(
  width: number,
  height: number,
  resolution: number,
): Promise<ArenaLease | null> {
  const antialias = wantsAntialias(resolution);
  let slot = shared ? await shared : null;
  // Edge smoothing is fixed when the app is built: a new density on the other side of the
  // threshold (Graphics Quality, another screen) builds the shared app again.
  if (slot && !slot.busy && slot.antialias !== antialias) {
    slot.app.destroy(true, { children: true });
    shared = null;
    slot = null;
  }
  if (!slot) {
    if (shared) slot = await shared;
    else {
      const made = createApp(width, height, resolution).then((app) =>
        app ? { app, antialias, busy: false } : null,
      );
      shared = made;
      slot = await made;
      if (!slot) shared = null;
    }
  }
  if (!slot) return null;
  if (slot.busy) return privateLease(width, height, resolution);
  const own = slot;
  own.busy = true;
  own.app.renderer.resize(width, height, resolution);
  own.app.ticker.maxFPS = MAX_FPS;
  own.app.ticker.start();
  return {
    app: own.app,
    release: () => {
      own.app.canvas.remove();
      own.app.stage.removeChildren();
      // An empty frame, so the next arena does not flash the last one; then the app rests.
      own.app.render();
      own.app.ticker.stop();
      own.busy = false;
    },
  };
}
