import { ACTS, ITEM_CATALOG, GAME_DATA } from "@emberheir/content";
import {
  type CombatEvent,
  Fight,
  type FightSnapshot,
  type GameState,
  PROGRESSION,
  type RunState,
  currentFight,
  eliteModifiersOf,
  encounterEnemy,
  getAct,
  getBase,
  isFinaleAct,
} from "@emberheir/sim";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../ui/Icon";
import { useStageSize } from "../../ui/Stage";
import type { Settings } from "../../ui/settings";
import { RunHeader } from "../RunHeader";
import type { GameApi } from "../useGame";
import { ArenaScene, type EnemyLook, type HeroLook } from "./ArenaScene";
import { BoonBar } from "../Boons";
import { Plaque, type PlaqueInfo } from "./Plaque";
import { skillIcon, skillTint } from "./skills";

/** Arena area between the run header and the skill footer, in stage pixels. */
const ARENA_TOP = 60;
const FOOTER_H = 132;

/** `?dev` in the URL shows fight speed and Skip for testing (not part of the game design). */
export const DEV_MODE = new URLSearchParams(window.location.search).has("dev");
const DEV_SPEEDS = [1, 4, 16] as const;

const HEAT_TEXT = { cooling: "Cooling Heat", steady: "Steady Heat", warming: "Warming Heat" };
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
function arenaStyle(run: RunState): React.CSSProperties | undefined {
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
  const mainHand = state.hero.equipment.mainHand;
  const offHand = state.hero.equipment.offHand;
  const weapon = mainHand ? getBase(ITEM_CATALOG, mainHand.baseId) : undefined;
  const off = offHand ? getBase(ITEM_CATALOG, offHand.baseId) : undefined;
  const kind = weapon?.weapon?.id;
  const heroLook: HeroLook = {
    weapon:
      kind === "axe" ||
      kind === "dagger" ||
      kind === "bow" ||
      kind === "crossbow" ||
      kind === "mace" ||
      kind === "staff"
        ? kind
        : weapon?.weapon?.range === "ranged"
          ? "wand"
          : "sword",
    offHand: off ? (off.fitsWeaponRange === "ranged" ? "focus" : "shield") : null,
  };
  const mods = encounter ? eliteModifiersOf(encounter, GAME_DATA).map((m) => m.name) : [];
  const enemyLook: EnemyLook = {
    archetype: enemyDef?.archetype ?? "brute",
    boss: encounter?.boss ?? false,
    elite: mods.length > 0,
    act: (echo ?? act).number,
    ...(encounter?.thief ? { thief: true } : {}),
  };
  const heroInfo: PlaqueInfo = {
    name: "Heir of the Ember",
    sub: `${weapon?.name ?? "Unarmed"} · ${weapon?.weapon ? HEAT_TEXT[weapon.weapon.heatBehavior] : ""}`,
    icon: "user",
  };
  const enemyInfo: PlaqueInfo = {
    name: echo ? `Echo of ${enemyDef?.name ?? ""}` : (enemyDef?.name ?? "Enemy"),
    sub: `${echo ? "Warden Echo" : isFinaleAct(GAME_DATA, act.id) ? "Last Flame" : encounter?.boss ? "Act Boss" : (ARCHETYPE_TEXT[enemyDef?.archetype ?? ""] ?? "")} · ${enemyDef?.description ?? ""}`,
    icon: encounter?.boss ? "boss" : ((enemyDef?.archetype ?? "brute") as "brute"),
    ...(encounter?.boss ? { tag: "BOSS" as const } : mods.length ? { tag: "ELITE" as const } : {}),
    mods,
  };
  return { act, heroLook, enemyLook, heroInfo, enemyInfo };
}

/**
 * The Battle view (Battle v3 mock): plaques with VS medallion, the PixiJS arena, the skill bar,
 * flask and Retreat. The fight plays in real time and pauses while an overlay is open; the sim
 * resolves the same fight (same setups and seed) when it ends.
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
  const [fight] = useState(() => {
    const setups = currentFight(state, GAME_DATA);
    return new Fight(setups.hero, setups.enemy, setups.seed);
  });
  const [snapshot, setSnapshot] = useState<FightSnapshot>(() => fight.snapshot());
  const [flash, setFlash] = useState<{ slot: number; n: number } | null>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [boonFlash, setBoonFlash] = useState<ReadonlySet<string>>(() => new Set());
  const sceneRef = useRef<ArenaScene | null>(null);
  const stage = useStageSize();
  const arenaW = stage.w;
  const arenaH = stage.h - ARENA_TOP - FOOTER_H;
  const arenaRes = Math.min(4, (window.devicePixelRatio || 1) * stage.scale);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(props.paused);
  const speedRef = useRef(speed);
  useEffect(() => {
    pausedRef.current = props.paused;
    if (sceneRef.current) sceneRef.current.paused = props.paused;
  }, [props.paused]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Mount the PixiJS arena once per fight.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new ArenaScene();
    scene.showNumbers = settings.damageNumbers;
    scene.layout(arenaW, arenaH, arenaRes);
    sceneRef.current = scene;
    void scene.mount(host, looks.heroLook, looks.enemyLook);
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // The looks are fixed for one encounter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    sceneRef.current?.layout(arenaW, arenaH, arenaRes);
  }, [arenaW, arenaH, arenaRes]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.showNumbers = settings.damageNumbers;
  }, [settings.damageNumbers]);

  // The fight loop. A boss on its last breath falls in slow motion (Teil 3 D).
  const bossFight = run.encounter?.boss === true;
  const slowRef = useRef(1);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000) * speedRef.current * slowRef.current;
      last = now;
      if (!pausedRef.current) {
        const before = fight.events.length;
        fight.advance(dt);
        publish(fight.events.slice(before));
      }
      if (!fight.over) frame = requestAnimationFrame(loop);
    };
    const publish = (fresh: readonly CombatEvent[]) => {
      const snap = fight.snapshot();
      sceneRef.current?.onEvents(fresh);
      sceneRef.current?.onSnapshot(snap);
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
      setSnapshot(snap);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [fight, bossFight]);

  useEffect(() => {
    if (!boonFlash.size) return;
    const timer = window.setTimeout(() => setBoonFlash(new Set()), 450);
    return () => window.clearTimeout(timer);
  }, [boonFlash]);

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
    const before = fight.events.length;
    fight.runToEnd();
    sceneRef.current?.onEvents(fight.events.slice(before));
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
  const flaskMax = Math.max(PROGRESSION.flaskStartCharges, state.flaskCharges);
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
        onCharacter={props.onCharacter}
        onTree={props.onTree}
        onMenu={props.onMenu}
      />

      <div className="plaques">
        <div className="hero-column">
          <Plaque fighter={hero} info={looks.heroInfo} />
          <BoonBar state={state} flash={boonFlash} className="battle-boons" />
        </div>
        <div className="vs-medallion" aria-hidden="true">
          <div className="vs-inner title-font">VS</div>
        </div>
        <div className="enemy-column">
          <Plaque fighter={enemy} info={looks.enemyInfo} mirrored />
          <div className="enemy-skills">
            {thiefLeft !== null && !over && (
              <div
                className={`thief-timer${thiefLeft <= 5 ? " hurry" : ""}`}
                role="timer"
                data-testid="thief-timer"
              >
                <Icon name="retreat" size={18} color="#ffd84a" />
                <span>Flees in {thiefLeft}s</span>
              </div>
            )}
            {enemy.telegraph && (
              <div className="telegraph-warning" role="alert">
                <Icon name="warning" size={18} color="#ffb13b" />
                <span>Charging {enemy.telegraph.skill}</span>
              </div>
            )}
            {enemy.rotation.map((slot, i) => (
              <div
                key={slot.skillId}
                className={`enemy-slot ${i === enemy.nextSlot ? "next" : ""}`}
                title={`${slot.name} · ${slot.heatCost} Heat`}
                style={{ background: skillTint(slot.skillId) }}
              >
                <Icon name={skillIcon(slot.skillId)} size={24} color="#fff6e4" />
                <span className="corner mono">{slot.heatCost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div
          className={`fight-banner ${result.toLowerCase()}${bossFight && snapshot.winner === "hero" ? " boss-kill" : ""}`}
          data-testid="fight-result"
        >
          {result}
        </div>
      )}
      {props.paused && !result && (
        <div className="paused-tag" aria-live="polite">
          Fight paused
        </div>
      )}

      <footer className="battle-footer bar-bottom">
        <div className="flask" title="Ember Flask: usable between stages">
          <div className="flask-pips">
            {Array.from({ length: flaskMax }, (_, i) => (
              <span key={i} className={`flask-pip ${i < state.flaskCharges ? "full" : ""}`} />
            ))}
          </div>
          <div className="flask-text">
            <span className="title-font">
              Ember Flask {state.flaskCharges}/{flaskMax}
            </span>
            <span className="sub">Between stages</span>
          </div>
        </div>

        <div className="skillbar" aria-label="Battle Plan">
          {hero.rotation.map((slot, i) => {
            const next = i === hero.nextSlot;
            const fill = next ? Math.min(100, (hero.heat / slot.threshold) * 100) : 0;
            return (
              <div
                key={slot.skillId}
                className="skill-slot-wrap"
                title={`${slot.name} · ${slot.heatCost} Heat`}
              >
                <div
                  className={`skill-slot ${next ? "next" : ""} ${flash?.slot === i ? `fired-${flash.n % 2}` : ""}`}
                  style={{ background: skillTint(slot.skillId) }}
                  data-testid="skill-slot"
                >
                  <div className="heat-fill" style={{ height: `${fill}%` }} />
                  <Icon name={skillIcon(slot.skillId)} size={34} color="#fff6e4" />
                  <span className="pos mono">{i + 1}</span>
                  <span className="corner mono">
                    {next ? `${Math.floor(hero.heat)}/${slot.threshold}` : slot.heatCost}
                  </span>
                </div>
                <span className={`skill-caption ${next ? "next" : ""}`}>
                  {next ? `Next: ${slot.name}` : slot.name}
                </span>
              </div>
            );
          })}
          {hero.reactions.length > 0 && <span className="skillbar-divider" aria-hidden="true" />}
          {hero.reactions.map((slot, i) => (
            <div
              key={`r-${slot.skillId}`}
              className="skill-slot-wrap reaction"
              title={`Reaction: ${slot.name} · ${slot.heatCost} Heat`}
            >
              <div
                className={`skill-slot reaction ${slot.cooldownLeft > 0 ? "cooling" : ""} ${flash?.slot === 10 + i ? `fired-${flash.n % 2}` : ""}`}
                style={{ background: skillTint(slot.skillId) }}
                data-testid="reaction-slot"
              >
                <Icon name={skillIcon(slot.skillId)} size={26} color="#fff6e4" />
                <span className="pos mono">R{i + 1}</span>
                {slot.cooldownLeft > 0 && (
                  <span className="cooldown mono">{Math.ceil(slot.cooldownLeft)}</span>
                )}
              </div>
              <span className="skill-caption">{slot.name}</span>
            </div>
          ))}
        </div>

        <div className="footer-right">
          {DEV_MODE && !result && (
            <div className="dev-tools">
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
          <button
            type="button"
            className="btn"
            disabled={over}
            onClick={() => game.dispatch({ type: "retreat" })}
          >
            <Icon name="retreat" size={18} />
            Retreat to Camp
          </button>
        </div>
      </footer>
    </section>
  );
}
