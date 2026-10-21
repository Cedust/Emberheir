import { ACTS, GAME_DATA } from "@emberheir/content";
import {
  type CombatEvent,
  type FightSnapshot,
  type GameState,
  PROGRESSION,
  type RunState,
  eliteModifiersOf,
  encounterFight,
  encounterEnemy,
  getAct,
  heroWeapon,
  heroWeaponName,
  wornEcho,
  heroTitle,
  isFinaleAct,
  activeDraught,
  DRAUGHT_FLASK_COST,
  flaskCapacity,
  huntKillsFor,
} from "@emberheir/sim";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../ui/Icon";
import { useStageSize } from "../../ui/Stage";
import type { Settings } from "../../ui/settings";
import { RunHeader } from "../RunHeader";
import type { GameApi } from "../useGame";
import { heroLookOf } from "../heroLook";
import { heroWeaponLook } from "../weaponLook";
import { ArenaScene } from "./ArenaScene";
import type { EnemyLook } from "./enemyArt";
import { BoonBar } from "../Boons";
import type { IconName } from "../../ui/Icon";
import { HudScene } from "./hud/HudScene";
import { EnemyFrame, HeroBar, WEAPON_ICON } from "./hud/BattleHud";
import { BAR_H } from "./hud/layout";
import "./hud/hud.css";
import { QUALITY, canvasResolution } from "../pixiPacing";
import { huntView, trailTitle } from "../hunts";

interface PlaqueInfo {
  readonly name: string;
  readonly sub: string;
  readonly icon: IconName;
  readonly tag?: "ELITE" | "BOSS" | "GATEKEEPER" | "CHAMPION";
  readonly mods?: readonly string[];
}

/** `?dev` in the URL shows fight speed and Skip for testing (not part of the game design). */
export const DEV_MODE = new URLSearchParams(window.location.search).has("dev");
const DEV_SPEEDS = [1, 4, 16] as const;
/**
 * The DOM parts of the HUD (numbers, skill bar, rhythm) redraw at most this often. The Pixi
 * arena and orbs still get every frame; a React render of the whole view 60 times a second
 * was work the eye does not see.
 */
const DOM_FPS = 30;

const HEAT_TEXT = {
  cooling: "Cooling Heat",
  steady: "Steady Heat",
  warming: "Warming Heat",
  smoldering: "Smoldering Heat",
};
const ARCHETYPE_TEXT: Record<string, string> = {
  brute: "Brute",
  skirmisher: "Skirmisher",
  caster: "Caster",
  afflicter: "Afflicter",
  warden: "Warden",
  thornback: "Thornback",
};

/** The Last Ember burns in the dark. */
const FINALE_GRADIENT = ["#5a1d08", "#080404"] as const;

/** The arena sky in the act's colors (ui-look-v1.md: arena tinted per Act; an echo brings its own). */
export function arenaStyle(run: RunState): React.CSSProperties | undefined {
  const g =
    ACTS.find((a) => a.id === (run.encounter?.echo ?? run.actId))?.arenaGradient ??
    (isFinaleAct(GAME_DATA, run.actId) ? FINALE_GRADIENT : undefined);
  return g ? { background: `linear-gradient(180deg, ${g[0]} 0%, ${g[1]} 100%)` } : undefined;
}

function useLooks(state: GameState, run: RunState) {
  const encounter = run.encounter;
  const act = getAct(GAME_DATA, run.actId);
  const enemyDef = encounter ? encounterEnemy(encounter, act, GAME_DATA) : undefined;
  const echo = encounter?.echo ? getAct(GAME_DATA, encounter.echo) : undefined;
  const draught = activeDraught(state, GAME_DATA);
  const mastery = GAME_DATA.skillTree.prestigeBranches?.find(
    (b) => b.id === state.legacy.branches[0],
  );
  const heroLook = {
    ...heroLookOf(
      state.hero.classId,
      state.hero.weaponId,
      state.hero.equipment,
      wornEcho(state, GAME_DATA)?.def.color,
      heroWeaponLook(state),
    ),
    ...(draught ? { draught: draught.color } : {}),
    ...(mastery?.axis ? { mastery: mastery.axis } : {}),
  };
  const weapon = heroWeapon(state, GAME_DATA).weapon;
  const mods = encounter ? eliteModifiersOf(encounter, GAME_DATA).map((m) => m.name) : [];
  const enemyLook: EnemyLook = {
    ...(enemyDef ? { id: enemyDef.id } : {}),
    archetype: enemyDef?.archetype ?? "brute",
    boss: encounter?.boss ?? false,
    elite: mods.length > 0,
    act: (echo ?? act).number,
    ranged: enemyDef?.weapon.range === "ranged",
    ...(encounter?.thief ? { thief: true } : {}),
    ...(encounter?.gate ? { gate: true } : {}),
    ...(encounter?.champion ? { champion: true } : {}),
    ...(run.wildfire ? { wildfire: run.wildfire } : {}),
    ...(encounter ? { levelGap: encounter.level - state.hero.level } : {}),
  };
  const heroInfo: PlaqueInfo = {
    name: heroTitle(state, GAME_DATA),
    sub: `${heroWeaponName(state, GAME_DATA)} · ${HEAT_TEXT[weapon.heatBehavior]}`,
    icon: "user",
  };
  // An Elite carries the name of its act modifier ("Rootbound Barkhide", neuausrichtung 6.1).
  const plain = enemyDef?.name ?? "Enemy";
  const titled =
    mods.length && !encounter?.boss && !encounter?.gate ? `${mods[0]} ${plain}` : plain;
  const enemyInfo: PlaqueInfo = {
    name: echo ? `Echo of ${enemyDef?.name ?? ""}` : titled,
    sub: `${echo ? "Warden Echo" : isFinaleAct(GAME_DATA, act.id) ? "Last Flame" : encounter?.boss ? "Act Boss" : (ARCHETYPE_TEXT[enemyDef?.archetype ?? ""] ?? "")} · ${enemyDef?.description ?? ""}`,
    icon: encounter?.boss ? "boss" : ((enemyDef?.archetype ?? "brute") as "brute"),
    ...(encounter?.boss
      ? { tag: "BOSS" as const }
      : encounter?.gate
        ? { tag: "GATEKEEPER" as const }
        : encounter?.champion
          ? { tag: "CHAMPION" as const }
          : mods.length
            ? { tag: "ELITE" as const }
            : {}),
    mods,
  };
  const enemyAttackIcon: IconName = enemyLook.ranged
    ? enemyDef?.archetype === "caster"
      ? "bolt"
      : "bow"
    : "strike";
  return { act, heroLook, enemyLook, heroInfo, enemyInfo, enemyAttackIcon };
}

/** `?dev`: frames per second and what the arena keeps alive, to keep the effect budget honest. */
function DevMeter(props: { scene: React.RefObject<ArenaScene | null> }) {
  const [text, setText] = useState("");
  useEffect(() => {
    let frames = 0;
    let since = performance.now();
    let raf = 0;
    const count = () => {
      frames += 1;
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);
    const timer = window.setInterval(() => {
      const now = performance.now();
      const fps = (frames * 1000) / (now - since);
      frames = 0;
      since = now;
      const s = props.scene.current?.stats;
      setText(`${fps.toFixed(0)} FPS · ${s?.particles ?? 0} particles · ${s?.floaters ?? 0} texts`);
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [props.scene]);
  return (
    <span className="dev-meter mono" data-testid="dev-meter">
      {text}
    </span>
  );
}

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * The Battle view: the PixiJS arena, the enemy frame at the top and the Diablo-style bottom bar
 * (Life and Heat orbs, skill bar with the Default Attack's rhythm, flasks, statuses, Boons).
 *
 * The sim keeps one fight per encounter (`encounterFight`). This view plays it in real time,
 * pausing while an overlay is open; `resolveFight` then reads how that same fight ended, so it
 * is simulated only once.
 */
export function BattleView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  settings: Settings;
  paused: boolean;
  onCharacter: () => void;
  onTree: () => void;
  onMenu: () => void;
}) {
  const { state, run, game, settings } = props;
  const looks = useLooks(state, run);
  // GameApp remounts this view for every encounter (key = fight seed).
  const [fight] = useState(() => encounterFight(state, GAME_DATA));
  const [snapshot, setSnapshot] = useState<FightSnapshot>(() => fight.snapshot());
  const [flash, setFlash] = useState<{ slot: number; n: number } | null>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [boonFlash, setBoonFlash] = useState<ReadonlySet<string>>(() => new Set());
  const sceneRef = useRef<ArenaScene | null>(null);
  const stage = useStageSize();
  // The arena canvas covers the whole stage: the world stands on the bar, the HUD sits on top.
  const arenaW = stage.w;
  const arenaH = stage.h;
  const arenaRes = canvasResolution(stage.scale, QUALITY[settings.graphicsQuality].maxResolution);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HudScene | null>(null);
  const pausedRef = useRef(props.paused);
  const speedRef = useRef(speed);
  useEffect(() => {
    pausedRef.current = props.paused;
    if (sceneRef.current) sceneRef.current.paused = props.paused;
    if (hudRef.current) hudRef.current.paused = props.paused;
  }, [props.paused]);
  useEffect(() => {
    speedRef.current = speed;
    if (sceneRef.current) sceneRef.current.speed = speed;
  }, [speed]);

  // Mount the PixiJS arena once per fight.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new ArenaScene();
    scene.showNumbers = settings.damageNumbers;
    scene.motion = settings.screenShake && !reducedMotion();
    scene.quality = settings.graphicsQuality;
    scene.layout(arenaW, arenaH, arenaRes, 1, BAR_H);
    sceneRef.current = scene;
    const hud = new HudScene();
    hud.layout(arenaW, arenaH);
    hud.onSnapshot(fight.snapshot(), true);
    hudRef.current = hud;
    void scene.mount(host, looks.heroLook, looks.enemyLook).then((app) => {
      if (app) hud.attach(app, scene.overlay, run.encounter?.boss === true);
    });
    return () => {
      hud.destroy();
      scene.destroy();
      sceneRef.current = null;
      hudRef.current = null;
    };
    // The looks are fixed for one encounter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    sceneRef.current?.layout(arenaW, arenaH, arenaRes, 1, BAR_H);
  }, [arenaW, arenaH, arenaRes]);

  useEffect(() => {
    hudRef.current?.layout(stage.w, stage.h);
  }, [stage.w, stage.h]);

  // The fight loop. A boss on its last breath falls in slow motion (Teil 3 D).
  const bossFight = run.encounter?.boss === true;
  const slowRef = useRef(1);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let shown = -Infinity;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000) * speedRef.current * slowRef.current;
      last = now;
      // A hit-stop holds the fight for a few frames; the lost time is simply skipped.
      if (!pausedRef.current && !sceneRef.current?.frozen) publish(fight.advance(dt), now);
      if (!fight.over) frame = requestAnimationFrame(loop);
    };
    const publish = (fresh: readonly CombatEvent[], now: number) => {
      const snap = fight.snapshot();
      sceneRef.current?.onEvents(fresh);
      sceneRef.current?.onSnapshot(snap);
      hudRef.current?.onSnapshot(snap);
      const used = [...fresh].reverse().find((e) => e.type === "skill" && e.side === "hero");
      if (used?.type === "skill") {
        const reaction = used.via === "reaction";
        const list = reaction ? snap.hero.reactions : snap.hero.rotation;
        const index = list.findIndex((r) => r.name === used.skill);
        const slot = reaction ? 10 + index : index;
        if (index >= 0) setFlash((f) => ({ slot, n: (f?.n ?? 0) + 1 }));
      }
      const fired = fresh.flatMap((e) =>
        e.type === "trigger" && e.side === "hero" ? [e.name] : [],
      );
      if (fired.length) setBoonFlash(new Set(fired));
      if (bossFight) slowRef.current = snap.enemy.life / snap.enemy.maxLife < 0.08 ? 0.35 : 1;
      if (snap.over || now - shown >= 1000 / DOM_FPS - 1) {
        shown = now;
        setSnapshot(snap);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [fight, bossFight]);

  useEffect(() => {
    if (!boonFlash.size) return;
    const timer = window.setTimeout(() => setBoonFlash(new Set()), 450);
    return () => window.clearTimeout(timer);
  }, [boonFlash]);

  // The enemy's Trail (hunts-entwurf-v1.md): echoes of the finale have none.
  const encounter = run.encounter;
  const huntable = !!encounter && !encounter.echo && !isFinaleAct(GAME_DATA, run.actId);
  const won = snapshot.over && snapshot.winner === "hero";
  const hunt = huntable && encounter ? huntView(state, encounter.enemyId) : undefined;
  const after =
    hunt && encounter && won
      ? huntView(
          state,
          encounter.enemyId,
          huntKillsFor(
            {
              elite: encounter.eliteModifiers.length > 0 && !encounter.boss,
              champion: encounter.champion === true,
              boss: encounter.boss,
            },
            encounter.hunt === true,
          ),
        )
      : hunt;
  const trailUp = hunt && after && after.tier > hunt.tier ? after.tier : 0;
  const skipped = useRef(false);
  useEffect(() => {
    if (trailUp && !skipped.current) sceneRef.current?.trail(trailUp);
  }, [trailUp]);

  // When the fight is over, show the banner briefly, then let the sim resolve it.
  const over = snapshot.over;
  useEffect(() => {
    if (!over) return;
    const timer = window.setTimeout(
      () => game.dispatch({ type: "resolveFight" }),
      bossFight && snapshot.winner === "hero" ? 2400 : 1600,
    );
    return () => window.clearTimeout(timer);
  }, [over, game, bossFight, snapshot.winner]);

  const skip = () => {
    skipped.current = true;
    sceneRef.current?.onEvents(fight.finish());
    hudRef.current?.onSnapshot(fight.snapshot(), true);
    setSnapshot(fight.snapshot());
  };

  const hero = snapshot.hero;
  const enemy = snapshot.enemy;
  const result = over
    ? snapshot.winner === "hero"
      ? "VICTORY"
      : snapshot.winner === "enemy"
        ? "DEFEAT"
        : snapshot.fled === "enemy"
          ? "ESCAPED"
          : "DRAW"
    : null;
  const thiefLeft = run.encounter?.thief
    ? Math.max(0, Math.ceil(PROGRESSION.thiefFleeSeconds - snapshot.time))
    : null;
  // A brewed Draught takes the Flask charges it cost for this trip.
  const flaskDraught = activeDraught(state, GAME_DATA);
  const flaskMax = Math.max(
    flaskCapacity(state, GAME_DATA) - (flaskDraught ? DRAUGHT_FLASK_COST : 0),
    state.flaskCharges,
  );
  const stages = looks.act.stages;

  return (
    <section className="screen battle" aria-label="Battle" style={arenaStyle(run)}>
      <div className="arena-host" ref={hostRef} />
      <RunHeader
        act={looks.act}
        stage={run.stage}
        sub={`Stage ${run.stage} / ${stages}`}
        cleared={false}
        attributePoints={state.hero.unspentAttributePoints}
        skillPoints={state.hero.unspentSkillPoints}
        waymarks={state.progress.waymarks}
        prestige={state.legacy.prestige}
        {...(run.wildfire ? { wildfire: run.wildfire } : {})}
        onCharacter={props.onCharacter}
        onTree={props.onTree}
        onMenu={props.onMenu}
      />

      <EnemyFrame
        enemy={enemy}
        name={looks.enemyInfo.name}
        sub={looks.enemyInfo.sub}
        icon={looks.enemyInfo.icon}
        {...(looks.enemyInfo.tag ? { tag: looks.enemyInfo.tag } : {})}
        mods={looks.enemyInfo.mods ?? []}
        attackIcon={looks.enemyAttackIcon}
        thiefLeft={over ? null : thiefLeft}
        heroLevel={state.hero.level}
        noLevelMalus={Boolean(state.run?.wildfire)}
        {...(after ? { hunt: after } : {})}
      />

      {result && (
        <div
          className={`fight-banner ${result.toLowerCase()}${bossFight && snapshot.winner === "hero" ? " boss-kill" : ""}`}
          data-testid="fight-result"
        >
          {result}
          {trailUp > 0 && (
            <span className="trail-banner title-font" data-testid="trail-banner">
              {trailTitle(trailUp)}
            </span>
          )}
        </div>
      )}
      {props.paused && !result && (
        <div className="paused-tag" aria-live="polite">
          Fight paused
        </div>
      )}

      {/* Dev readout and speed at the top right, away from the skill bar (Timo). */}
      {DEV_MODE && !result && (
        <div className="dev-tools">
          <DevMeter scene={sceneRef} />
          {DEV_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={speed === s ? "active" : ""}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
          <button type="button" onClick={skip}>
            Skip fight
          </button>
        </div>
      )}

      <HeroBar
        hero={hero}
        heroTitle={looks.heroInfo.name}
        weaponIcon={WEAPON_ICON[looks.heroLook.weapon] ?? "strike"}
        flaskCharges={state.flaskCharges}
        flaskMax={flaskMax}
        draught={flaskDraught}
        flash={flash}
        stageW={stage.w}
        stageH={stage.h}
        boons={<BoonBar state={state} flash={boonFlash} className="battle-boons" />}
        right={
          <button
            type="button"
            className="btn hud-retreat"
            disabled={over}
            aria-label="Retreat to Camp"
            title="Retreat to Camp"
            onClick={() => game.dispatch({ type: "retreat" })}
          >
            <Icon name="retreat" size={18} />
            Retreat
          </button>
        }
      />
    </section>
  );
}
