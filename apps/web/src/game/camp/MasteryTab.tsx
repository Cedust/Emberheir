import { GAME_DATA, MASTERY_LAYOUT, echoStageName } from "@emberheir/content";
import {
  type GameState,
  MASTERY,
  type MasteryBlockReason,
  type MasteryNode,
  type MasteryState,
  MAX_WEAPON_RANK,
  WEAPON_GRADES,
  heroWeapon,
  heroWeaponName,
  heroWeaponRank,
  learnMastery,
  masteryBlockReason,
  masteryRanks,
  pointsSpent,
  weaponGrade,
} from "@emberheir/sim";
import { useEffect, useRef, useState } from "react";
import { useStageSize } from "../../ui/Stage";
import { useSettings } from "../../ui/settings";
import { GRADE_COLOR, gradeIndex as gradeOf } from "../WeaponSlot";
import type { GameApi } from "../useGame";
import {
  ELEMENT_COLOR,
  HEAT_FORM_COLOR,
  type MasteryNodeView,
  MasteryScene,
  type MasteryView,
} from "./MasteryScene";

const KIND_LABEL: Record<MasteryNode["kind"], string> = {
  refine: "Refine",
  minor: "Minor",
  notable: "Notable",
  keystone: "Keystone",
  heatForm: "Heat Form",
  innateForm: "Innate Form",
  attunement: "Attunement",
};

const BLOCK_TEXT: Record<MasteryBlockReason, string> = {
  maxed: "Fully refined",
  noPoints: "No Mastery Points left. Every Weapon Rank gives one",
  notConnected: "Learn the node before it first",
  rankLocked: "Weapon Rank too low",
  keystoneLocked: `Opens after ${MASTERY.keystonePoints} points`,
  chosen: "Chosen",
};

const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
const pct = (v: number) => `${Math.round(v * 100)} %`;

/** The Mastery as it would be after the pending points. */
function withPending(
  mastery: MasteryState,
  pending: readonly string[],
  weaponId: string,
  rank: number,
): MasteryState {
  const tree = GAME_DATA.weaponMastery[weaponId];
  if (!tree) return mastery;
  let m = mastery;
  for (const id of pending) {
    try {
      m = learnMastery(tree, m, id, rank);
    } catch {
      break;
    }
  }
  return m;
}

export function MasteryTab(props: { state: GameState; game: GameApi; viewOnly: boolean }) {
  const { state, game, viewOnly } = props;
  const weaponId = state.hero.weaponId;
  const tree = GAME_DATA.weaponMastery[weaponId];
  const rank = heroWeaponRank(state);
  const [pending, setPending] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("precision");
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [respec, setRespec] = useState(false);
  const stage = useStageSize();
  const { settings } = useSettings();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<MasteryScene | null>(null);

  const preview = withPending(state.hero.mastery, pending, weaponId, rank);
  const previewState: GameState = { ...state, hero: { ...state.hero, mastery: preview } };
  const build = heroWeapon(previewState, GAME_DATA);
  const name = heroWeaponName(previewState, GAME_DATA);
  const spent = tree ? pointsSpent(tree, preview) : 0;
  const left = Math.max(0, rank - spent);
  const gradeIndex = gradeOf(rank);
  const nodes = tree?.nodes ?? [];
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const reasonOf = (id: string) => (tree ? masteryBlockReason(tree, preview, id, rank) : "maxed");
  const reason = selected ? reasonOf(selected.id) : undefined;
  const echo = state.hero.mastery.echo
    ? GAME_DATA.echoes.find((e) => e.id === state.hero.mastery.echo)
    : undefined;
  const attunement = nodes.find(
    (n) => n.kind === "attunement" && tree && masteryRanks(tree, preview, n.id) > 0,
  );
  const chosenForm = nodes.find(
    (n) => n.kind === "heatForm" && tree && masteryRanks(tree, preview, n.id) > 0,
  );
  const accent =
    ELEMENT_COLOR[attunement?.effect.attunement?.damageType ?? build.weapon.damageType] ?? 0xff6a2a;

  const lockOf = (n: MasteryNode, why: MasteryBlockReason | undefined): string | undefined => {
    if (why === "rankLocked") {
      return `R${n.group === "heatForm" ? MASTERY.heatFormRank : MASTERY.innateFormRank}`;
    }
    if (why === "keystoneLocked") return `${spent}/${MASTERY.keystonePoints}`;
    return undefined;
  };

  const view: MasteryView = {
    weaponId,
    paths: tree?.paths ?? [],
    grade: gradeIndex,
    accent,
    echoColor: echo?.color ?? null,
    pommel: MASTERY_LAYOUT.pommel,
    tip: MASTERY_LAYOUT.tip,
    pointsLeft: left > 0 && !viewOnly,
    nodes: nodes.map((node): MasteryNodeView => {
      const ranks = tree ? masteryRanks(tree, preview, node.id) : 0;
      const why = reasonOf(node.id);
      const locked = why === "rankLocked" || why === "keystoneLocked";
      const lock = lockOf(node, why);
      return {
        node,
        state:
          ranks > 0
            ? "learned"
            : locked
              ? "locked"
              : why === undefined || why === "noPoints"
                ? "available"
                : "unavailable",
        pending: pending.includes(node.id) && ranks > 0,
        selected: node.id === selected?.id,
        ranks,
        maxRanks: node.maxRanks ?? 1,
        ...(lock ? { lock } : {}),
      };
    }),
  };

  // Callbacks of the scene read the latest state through this ref.
  const learnRef = useRef<(id: string) => void>(() => undefined);
  useEffect(() => {
    learnRef.current = (id: string) => {
      if (viewOnly) return;
      setSelectedId(id);
      if (!reasonOf(id)) setPending((p) => [...p, id]);
    };
  });

  const [box, setBox] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setBox({ w: host.clientWidth, h: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  const resolution = Math.min(3, (window.devicePixelRatio || 1) * stage.scale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new MasteryScene({
      onSelect: (id) => setSelectedId(id),
      onLearn: (id) => learnRef.current(id),
      onHover: (id, x, y) => setHover(id ? { id, x, y } : null),
    });
    scene.layout(host.clientWidth, host.clientHeight, resolution);
    scene.setView(view);
    sceneRef.current = scene;
    void scene.mount(host).then((ok) => {
      if (!ok && sceneRef.current === scene) setFailed(true);
    });
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // The scene lives as long as the tab; size and view updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    sceneRef.current?.layout(box.w, box.h, resolution);
  }, [box.w, box.h, resolution]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.shake = settings.screenShake;
    sceneRef.current?.setView(view);
  });

  if (!tree) return <p className="sub">This weapon has no Mastery.</p>;

  const hovered = hover ? nodes.find((n) => n.id === hover.id) : undefined;
  const path = selected?.path ? tree.paths.find((p) => p.id === selected.path) : undefined;
  const earned = GAME_DATA.echoes.filter((e) => (state.legacy.echoes[e.id]?.stage ?? 0) > 0);
  const hasSpent =
    pointsSpent(tree, state.hero.mastery) > 0 || Object.keys(state.hero.mastery.choices).length > 0;
  const nextGrade = WEAPON_GRADES[gradeIndex + 1];
  const accentOf = (n: MasteryNode) =>
    n.kind === "heatForm"
      ? hex(HEAT_FORM_COLOR[n.id] ?? 0xff8a3a)
      : n.kind === "keystone"
        ? "var(--rarity-legendary)"
        : path
          ? hex(path.color)
          : (GRADE_COLOR[gradeIndex] ?? "#d0803a");

  return (
    <div className="tree-layout mastery-layout">
      <div
        className="tree-canvas tree-pixi mastery-canvas"
        style={
          {
            "--forge": hex(HEAT_FORM_COLOR[chosenForm?.id ?? ""] ?? 0xffb13b),
            "--grade": GRADE_COLOR[gradeIndex],
          } as React.CSSProperties
        }
      >
        <div ref={hostRef} className="tree-host mastery-host" data-testid="mastery-canvas" />
        {failed && <p className="tree-fallback sub">Weapon Mastery needs WebGL.</p>}
        <div className="mastery-plate" data-testid="weapon-name">
          <span className="eyebrow" style={{ color: GRADE_COLOR[gradeIndex] }}>
            {weaponGrade(rank).toUpperCase()} · RANK {rank}
          </span>
          <h2 className="title-font">{name}</h2>
          <div
            className="rank-gauge"
            role="meter"
            aria-label="Weapon Rank"
            aria-valuemin={0}
            aria-valuemax={MAX_WEAPON_RANK}
            aria-valuenow={rank}
          >
            {Array.from({ length: MAX_WEAPON_RANK }, (_, i) => {
              const g = WEAPON_GRADES.filter((w) => i + 1 >= w.from).length - 1;
              return (
                <i
                  key={i}
                  className={i < rank ? "on" : ""}
                  style={i < rank ? { background: GRADE_COLOR[g] } : undefined}
                />
              );
            })}
          </div>
          {nextGrade && (
            <span className="sub small">
              {nextGrade.name} at Rank {nextGrade.from}
            </span>
          )}
        </div>
        {hovered && hover && (
          <div
            className="tree-tip panel-card"
            style={{ left: hover.x, top: hover.y }}
            role="tooltip"
          >
            <span className="eyebrow">{KIND_LABEL[hovered.kind]}</span>
            <b className="title-font">{hovered.name}</b>
            <span className="small">{hovered.description}</span>
          </div>
        )}
        <div className="sr-only" role="group" aria-label="Weapon Mastery">
          {nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-label={n.name}
              aria-pressed={n.id === selected?.id}
              onClick={() => setSelectedId(n.id)}
            />
          ))}
        </div>
      </div>
      <aside className="tree-side">
        <section className="panel-card weapon-stats" aria-label="Weapon">
          <div className="section-row">
            <span className="eyebrow">WEAPON</span>
            <span className="eyebrow" data-testid="mastery-points">
              {left} Mastery Point{left === 1 ? "" : "s"}
            </span>
          </div>
          <dl className="stat-grid">
            <dt>Damage</dt>
            <dd className="mono">
              {Math.round(build.weapon.damage.min)}–{Math.round(build.weapon.damage.max)}
            </dd>
            <dt>Precision</dt>
            <dd className="mono">{pct(build.precision)}</dd>
            <dt>Heat</dt>
            <dd>
              {build.weapon.heatBehavior.charAt(0).toUpperCase() +
                build.weapon.heatBehavior.slice(1)}
            </dd>
            <dt>Innate</dt>
            <dd>{build.innate?.name ?? "—"}</dd>
          </dl>
        </section>
        {selected && (
          <section
            className="node-detail panel-card"
            aria-label="Node details"
            style={{ borderTopColor: accentOf(selected) }}
          >
            <div className="section-row">
              <span className="eyebrow">
                {(path?.name ?? KIND_LABEL[selected.kind]).toUpperCase()}
              </span>
              <span className="eyebrow">
                {path ? KIND_LABEL[selected.kind] : ""}
                {(selected.maxRanks ?? 1) > 1
                  ? ` · ${masteryRanks(tree, preview, selected.id)}/${selected.maxRanks}`
                  : ""}
              </span>
            </div>
            <h3 className="title-font">{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.form && <p className="sub small">Names the weapon: {selected.form}.</p>}
            {!viewOnly && (
              <>
                <button
                  type="button"
                  className="btn primary"
                  disabled={reason !== undefined}
                  onClick={() => setPending((p) => [...p, selected.id])}
                >
                  {reason === "chosen"
                    ? "Chosen"
                    : selected.group
                      ? selected.default || selected.kind === "attunement"
                        ? "Choose · free"
                        : masteryRanks(tree, preview, selected.id) === 0 &&
                            preview.choices[selected.group]
                          ? "Switch · free"
                          : "Choose · 1 Point"
                      : "Learn · 1 Point"}
                </button>
                {reason && reason !== "chosen" && (
                  <p className="block warn">
                    {reason === "rankLocked"
                      ? `Opens at Weapon Rank ${selected.group === "heatForm" ? MASTERY.heatFormRank : MASTERY.innateFormRank}`
                      : BLOCK_TEXT[reason]}
                  </p>
                )}
              </>
            )}
          </section>
        )}
        <section className="panel-card echo-picker" aria-label="Echo">
          <span className="eyebrow">ECHO</span>
          {earned.length === 0 && <p className="sub small">Act bosses leave Echoes.</p>}
          <div className="echo-list">
            {earned.map((e) => {
              const stageNo = state.legacy.echoes[e.id]?.stage ?? 1;
              const worn = state.hero.mastery.echo === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`echo-row ${worn ? "on" : ""}`}
                  disabled={viewOnly}
                  aria-pressed={worn}
                  title={e.description(stageNo)}
                  onClick={() => game.dispatch({ type: "setEcho", echoId: worn ? null : e.id })}
                >
                  <i style={{ background: hex(e.color), boxShadow: `0 0 10px ${hex(e.color)}` }} />
                  <span className="echo-name">
                    {e.name} <span className="mono">{echoStageName(stageNo)}</span>
                  </span>
                  <span className="small sub">{e.description(stageNo)}</span>
                </button>
              );
            })}
          </div>
        </section>
        {!viewOnly && (
          <section className="pending-bar panel-card">
            <span className={pending.length ? "strong" : "sub"}>{pending.length} pending</span>
            <div className="grow" />
            {respec ? (
              <>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    game.dispatch({ type: "respecMastery" });
                    setPending([]);
                    setRespec(false);
                  }}
                >
                  Yes, respec
                </button>
                <button type="button" className="btn" onClick={() => setRespec(false)}>
                  No
                </button>
              </>
            ) : pending.length ? (
              <>
                <button type="button" className="btn" onClick={() => setPending([])}>
                  Undo
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    game.dispatchAll(
                      pending.map((nodeId) => ({ type: "learnMastery" as const, nodeId })),
                    );
                    setPending([]);
                  }}
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={!hasSpent || state.wallet.gold < MASTERY.respecGold}
                title="All Mastery Points come back. The Echo stays."
                onClick={() => setRespec(true)}
              >
                Respec · {MASTERY.respecGold} Gold
              </button>
            )}
          </section>
        )}
        {viewOnly && <p className="sub small view-only-hint">View only</p>}
      </aside>
    </div>
  );
}
