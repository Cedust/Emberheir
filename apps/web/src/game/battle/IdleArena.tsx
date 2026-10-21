import { GAME_DATA } from "@emberheir/content";
import { type GameState, type RunState, activeDraught, getAct, wornEcho } from "@emberheir/sim";
import { useEffect, useRef } from "react";
import { useStageSize } from "../../ui/Stage";
import type { Settings } from "../../ui/settings";
import { heroLookOf } from "../heroLook";
import { QUALITY, canvasResolution } from "../pixiPacing";
import { heroWeaponLook } from "../weaponLook";
import { ArenaScene } from "./ArenaScene";
import { arenaStyle } from "./BattleView";
import { BAR_H } from "./hud/layout";

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * The act's arena between two fights (ui-ux-plan-v1.md 3.4): the hero waits in the act's air,
 * and the Intermission and its windows sit on top. Visual only, no fight runs.
 */
export function IdleArena(props: {
  state: GameState;
  run: RunState;
  settings: Settings;
  paused: boolean;
}) {
  const { state, run, settings } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ArenaScene | null>(null);
  const stage = useStageSize();
  const resolution = canvasResolution(stage.scale, QUALITY[settings.graphicsQuality].maxResolution);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const act = getAct(GAME_DATA, run.actId);
    const draught = activeDraught(state, GAME_DATA);
    const heroLook = {
      ...heroLookOf(
        state.hero.classId,
        state.hero.weaponId,
        state.hero.equipment,
        wornEcho(state, GAME_DATA)?.def.color,
        heroWeaponLook(state),
      ),
      ...(draught ? { draught: draught.color } : {}),
    };
    const scene = new ArenaScene();
    scene.showNumbers = false;
    scene.motion = settings.screenShake && !reducedMotion();
    scene.quality = settings.graphicsQuality;
    scene.idle = true;
    scene.layout(stage.w, stage.h, resolution, 1, BAR_H);
    sceneRef.current = scene;
    void scene
      .mount(host, heroLook, {
        archetype: "brute",
        boss: false,
        elite: false,
        act: act.number,
        ...(run.wildfire ? { wildfire: run.wildfire } : {}),
      })
      .then(() => scene.hideEnemy());
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // A new gear look shows the next time the arena opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.actId, run.wildfire]);

  useEffect(() => {
    sceneRef.current?.layout(stage.w, stage.h, resolution, 1, BAR_H);
  }, [stage.w, stage.h, resolution]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.paused = props.paused;
  }, [props.paused]);

  // A walk past the Warden's Gate: the road rolls on in the arena.
  const walks = useRef(run.wanders ?? 0);
  useEffect(() => {
    const now = run.wanders ?? 0;
    if (now > walks.current) sceneRef.current?.wander();
    walks.current = now;
  }, [run.wanders]);

  // A quiet node of the act map: its moment once the hero arrives (and the arena is up).
  const visit = run.visit?.kind;
  const stageKey = `${run.wanders ?? 0}:${run.stage}`;
  useEffect(() => {
    if (!visit) return;
    const timer = window.setTimeout(() => sceneRef.current?.visit(visit), 350);
    return () => window.clearTimeout(timer);
  }, [visit, stageKey]);

  return (
    <div className="idle-arena" style={arenaStyle(run)} aria-hidden="true">
      <div className="arena-host" ref={hostRef} />
    </div>
  );
}
