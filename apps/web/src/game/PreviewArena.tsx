import { type CombatEvent, Fight, fightReport } from "@emberheir/sim";
import { useEffect, useRef, useState } from "react";
import { useStageSize } from "../ui/Stage";
import type { Settings } from "../ui/settings";
import { ArenaScene } from "./battle/ArenaScene";
import type { ClassPreview } from "./classPreview";
import { canvasResolution } from "./pixiPacing";

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** The Training Dummy never falls: after this many seconds the sparring starts over. */
const ROUND_SECONDS = 24;

/**
 * A small PixiJS arena that plays the class preview in a loop: the real sim and the real arena
 * effects. A fight that ends, or a sparring round against the Training Dummy, starts over with
 * the next seed. With `dps`, the hero's damage per second of the round shows over the arena.
 * Remount it (key) for a new preview.
 */
export function PreviewArena(props: {
  preview: ClassPreview;
  width: number;
  height: number;
  settings: Settings;
  dps?: boolean;
}) {
  const { preview, width, height, settings } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dps, setDps] = useState<number | null>(null);
  const stage = useStageSize();
  const resolution = canvasResolution(stage.scale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new ArenaScene();
    scene.showNumbers = settings.damageNumbers;
    scene.motion = settings.screenShake && !reducedMotion();
    scene.layout(width, height, resolution, height / 620);
    void scene.mount(host, preview.heroLook, preview.enemyLook);
    let round = 0;
    let fight = new Fight(preview.hero, preview.enemy, 1);
    let frame = 0;
    let timer = 0;
    let measured = 0;
    let last = performance.now();
    const next = () => {
      round += 1;
      fight = new Fight(preview.hero, preview.enemy, 1 + round);
      measured = 0;
      setDps(null);
    };
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!scene.frozen) {
        const before = fight.events.length;
        fight.advance(dt);
        const fresh: readonly CombatEvent[] = fight.events.slice(before);
        scene.onEvents(fresh);
        scene.onSnapshot(fight.snapshot());
      }
      if (fight.time >= 2 && fight.time - measured >= 0.5) {
        measured = fight.time;
        setDps(fightReport(fight.events, "hero").total / fight.time);
      }
      if (fight.over) {
        timer = window.setTimeout(() => {
          next();
          last = performance.now();
          frame = requestAnimationFrame(loop);
        }, 1800);
        return;
      }
      if (fight.time >= ROUND_SECONDS) next();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      scene.destroy();
    };
    // Settings changes apply on the next preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, width, height, resolution]);

  return (
    <div className="preview-arena" ref={hostRef} style={{ width, height }}>
      {props.dps && (
        <div className="preview-dps" data-testid="preview-dps" aria-live="off">
          <b className="mono">{dps === null ? "–" : Math.round(dps)}</b>
          <span>damage per second</span>
        </div>
      )}
    </div>
  );
}
