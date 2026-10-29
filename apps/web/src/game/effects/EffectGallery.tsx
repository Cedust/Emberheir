import { ACTS } from "@emberheir/content";
import { type CombatEvent, type FightSnapshot, Fight } from "@emberheir/sim";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, useStageSize } from "../../ui/Stage";
import { useSettings } from "../../ui/settings";
import { ArenaScene } from "../battle/ArenaScene";
import type { EnemyLook } from "../battle/enemyArt";
import { dummyPreview } from "../classPreview";
import { QUALITY, canvasResolution } from "../pixiPacing";
import {
  EFFECTS,
  type EffectEntry,
  GROUPS,
  type GroupId,
  type Kit,
  type Player,
  VERDICT_LABEL,
} from "./effectList";
import { CHOICE_LABEL, type Choice, exportReview, loadReview, saveReview, setPick } from "./review";
import "./effects.css";

const PANEL_W = 560;
/** With Repeat on, an effect plays again after this many seconds. */
const REPEAT_SECONDS = 3.2;
const FINALE_GRADIENT = ["#5a1d08", "#080404"] as const;

const BASE_KIT: Kit = { classId: "cinderguard", weapon: "sword" };
const BASE_ENEMY: EnemyLook = {
  id: "ashen-brute",
  archetype: "brute",
  boss: false,
  elite: false,
  act: 1,
};

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * `?effects`: the effect gallery (performance-kampfeffekte-v1.md). Every arena effect of a
 * fight, played on its own in the real arena, with a plain explanation and the review's verdict.
 * A developer page: no fight runs. Timo's own picks (keep or remove) stay in this browser and
 * export as JSON.
 */
export function EffectGallery() {
  return (
    <Stage>
      <Gallery />
    </Stage>
  );
}

function Gallery() {
  const { settings } = useSettings();
  const stage = useStageSize();
  const [group, setGroup] = useState<GroupId>("hits");
  const [picked, setPicked] = useState<EffectEntry>(EFFECTS[0] as EffectEntry);
  const [repeat, setRepeat] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [mountId, setMountId] = useState(0);
  const [ready, setReady] = useState<number | null>(null);
  const [review, setReview] = useState(loadReview);
  const [copied, setCopied] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ArenaScene | null>(null);

  const kit = picked.kit ?? BASE_KIT;
  const preview = useMemo(() => dummyPreview(kit.classId, kit.weapon), [kit.classId, kit.weapon]);
  const base = useMemo(() => new Fight(preview.hero, preview.enemy, 1).snapshot(), [preview]);
  const heroLook = picked.hero ? picked.hero(preview.heroLook) : preview.heroLook;
  const enemyLook = picked.enemy ? picked.enemy(BASE_ENEMY) : BASE_ENEMY;
  const noEnemy = picked.noEnemy === true;
  const lookKey = JSON.stringify([heroLook, enemyLook, noEnemy, numbers, mountId]);

  const arenaW = stage.w - PANEL_W;
  const arenaH = stage.h;
  const scale = Math.min(arenaW / 1440, arenaH / 708) * 0.92;
  const resolution = canvasResolution(stage.scale, QUALITY[settings.graphicsQuality].maxResolution);

  // One arena per look: a new hero, enemy or act builds it again.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new ArenaScene();
    scene.showNumbers = numbers;
    scene.motion = settings.screenShake && !reducedMotion();
    scene.quality = settings.graphicsQuality;
    scene.layout(arenaW, arenaH, resolution, scale, 40);
    sceneRef.current = scene;
    setReady(null);
    let live = true;
    void scene.mount(host, heroLook, enemyLook).then((app) => {
      if (noEnemy) scene.hideEnemy();
      if (live && app) setReady(mountId);
    });
    return () => {
      live = false;
      scene.destroy();
      sceneRef.current = null;
    };
    // The look key covers hero, enemy, numbers and the rebuild counter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  useEffect(() => {
    sceneRef.current?.layout(arenaW, arenaH, resolution, scale, 40);
  }, [arenaW, arenaH, resolution, scale]);

  // Plays the picked effect (and holds its state) once its arena stands.
  useEffect(() => {
    const scene = sceneRef.current;
    if (ready === null || !scene) return;
    const timers: number[] = [];
    let held: ((s: FightSnapshot) => FightSnapshot) | null = picked.state ?? null;
    const show = () => scene.onSnapshot(held ? held(base) : base);
    const player: Player = {
      events: (list: readonly CombatEvent[]) => scene.onEvents(list),
      after: (seconds, run) => {
        timers.push(window.setTimeout(run, seconds * 1000));
      },
      state: (change) => {
        held = change ?? picked.state ?? null;
        show();
      },
      reset: (seconds) => {
        timers.push(window.setTimeout(() => setMountId((n) => n + 1), seconds * 1000));
      },
      arena: (run) => run(scene),
    };
    show();
    const play = () => picked.play?.(player);
    play();
    const loop = repeat && picked.play ? window.setInterval(play, REPEAT_SECONDS * 1000) : 0;
    return () => {
      window.clearInterval(loop);
      for (const t of timers) window.clearTimeout(t);
      scene.onSnapshot(base);
    };
  }, [ready, picked, repeat, base]);

  const list = EFFECTS.filter((e) => e.group === group);
  const pick = review[picked.id] ?? {};
  const decided = EFFECTS.filter((e) => review[e.id]?.choice).length;
  const update = (change: { choice?: Choice | undefined; note?: string }) => {
    const next = setPick(review, picked.id, {
      ...pick,
      ...change,
    });
    setReview(next);
    saveReview(next);
  };
  const json = () => exportReview(EFFECTS, review, new Date());
  const download = () => {
    const url = URL.createObjectURL(new Blob([json()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `effekt-auswahl-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = () => {
    void navigator.clipboard
      ?.writeText(json())
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };
  const counts = { keep: 0, change: 0, cut: 0 };
  for (const e of EFFECTS) counts[e.verdict] += 1;
  const act = enemyLook.act;
  const gradient =
    ACTS.find((a) => a.number === act)?.arenaGradient ?? (act === 8 ? FINALE_GRADIENT : null);

  return (
    <div className="fx-gallery">
      <aside className="fx-panel" style={{ width: PANEL_W }}>
        <header className="fx-head">
          <h1 className="title-font">Effect Gallery</h1>
          <p>
            Jeder Kampfeffekt einzeln. Klick einen an, er spielt in der Arena rechts.{" "}
            <span className="fx-sum">
              {counts.keep} {VERDICT_LABEL.keep} · {counts.change} {VERDICT_LABEL.change} ·{" "}
              {counts.cut} {VERDICT_LABEL.cut}
            </span>
          </p>
        </header>
        <nav className="fx-groups" aria-label="Gruppen">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={g.id === group ? "on" : ""}
              aria-pressed={g.id === group}
              onClick={() => setGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
        </nav>
        <ul className="fx-list" aria-label="Effekte">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={e.id === picked.id ? "on" : ""}
                aria-pressed={e.id === picked.id}
                data-testid={`fx-${e.id}`}
                onClick={() => {
                  if (e.id === picked.id) setMountId((n) => n + 1);
                  else setPicked(e);
                }}
              >
                <span className={`fx-verdict ${e.verdict}`}>{VERDICT_LABEL[e.verdict]}</span>
                <span className="fx-name">{e.name}</span>
                {review[e.id]?.choice && (
                  <span
                    className={`fx-mine ${review[e.id]?.choice}`}
                    title={`Deine Wahl: ${CHOICE_LABEL[review[e.id]?.choice ?? "keep"]}`}
                  >
                    {review[e.id]?.choice === "keep" ? "✓" : "✗"}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="fx-export">
          <span className="mono" data-testid="fx-progress">
            {decided} / {EFFECTS.length} entschieden
          </span>
          <button type="button" onClick={download}>
            Exportieren (JSON)
          </button>
          <button type="button" onClick={copy}>
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>
        <footer className="fx-foot">
          <label>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            Wiederholen
          </label>
          <label>
            <input
              type="checkbox"
              checked={numbers}
              onChange={(e) => setNumbers(e.target.checked)}
            />
            Zahlen
          </label>
          <a href="./">Zum Spiel</a>
        </footer>
      </aside>
      <section
        className="fx-stage"
        style={
          gradient
            ? { background: `linear-gradient(180deg, ${gradient[0]} 0%, ${gradient[1]} 100%)` }
            : undefined
        }
      >
        <div className="fx-arena" ref={hostRef} />
        <article className="fx-card" aria-live="polite">
          <h2 className="title-font">
            {picked.name}
            <span className={`fx-verdict ${picked.verdict}`}>{VERDICT_LABEL[picked.verdict]}</span>
          </h2>
          <dl>
            <dt>Was passiert</dt>
            <dd>{picked.what}</dd>
            <dt>Was man sieht</dt>
            <dd>{picked.see}</dd>
            <dt>Vorschlag</dt>
            <dd>{picked.plan}</dd>
          </dl>
          <div className="fx-choice" role="radiogroup" aria-label="Deine Wahl">
            <span>Deine Wahl</span>
            {(["keep", "remove"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={pick.choice === c}
                className={`${c}${pick.choice === c ? " on" : ""}`}
                onClick={() => update({ choice: pick.choice === c ? undefined : c })}
              >
                {CHOICE_LABEL[c]}
              </button>
            ))}
          </div>
          <textarea
            key={picked.id}
            className="fx-note"
            aria-label="Anmerkung"
            placeholder="Anmerkung (optional), z. B. „kleiner machen“"
            defaultValue={pick.note ?? ""}
            onBlur={(e) => {
              if (e.target.value !== (pick.note ?? "")) update({ note: e.target.value });
            }}
          />
          {!picked.play && (
            <p className="fx-hint">Ein Zustand: er bleibt, solange er gewählt ist.</p>
          )}
        </article>
      </section>
    </div>
  );
}
