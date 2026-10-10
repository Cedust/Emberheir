import { type CombatEvent, Fight } from "@emberheir/sim";
import { useEffect, useRef, useState } from "react";
import { useStageSize } from "../ui/Stage";
import type { Settings } from "../ui/settings";
import { ArenaScene } from "./battle/ArenaScene";
import type { ClassPreview } from "./classPreview";
import { canvasResolution } from "./pixiPacing";

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A small PixiJS arena that plays the class preview in a loop: the real sim and the real arena
 * effects, a new round with the next seed after each fight. Remount it (key) for a new preview.
 */
export function PreviewArena(props: {
  preview: ClassPreview;
  width: number;
  height: number;
  settings: Settings;
}) {
  const { preview, width, height, settings } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [round, setRound] = useState(0);
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
    const fight = new Fight(preview.hero, preview.enemy, 1 + round);
    let frame = 0;
    let timer = 0;
    let last = performance.now();
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
      if (fight.over) timer = window.setTimeout(() => setRound((r) => r + 1), 1800);
      else frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      scene.destroy();
    };
    // Settings changes apply on the next round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, round, width, height, resolution]);

  return <div className="preview-arena" ref={hostRef} style={{ width, height }} />;
}
