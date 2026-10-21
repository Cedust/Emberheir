import { GAME_DATA } from "@emberheir/content";
import {
  type EventGain,
  type GameState,
  type MapNode,
  type NodeKind,
  type RunState,
  type VisitBlockReason,
  chosenNext,
  currentNode,
  eventBlockReason,
  eventPrice,
  gateStages,
  getAct,
  getEvent,
  hearthHeal,
  isWallAct,
  nextNodes,
  nodeBlockReason,
  PROGRESSION,
  ROAD_GAMBLE,
  roadGambleBlockReason,
  roadGamblePrice,
  SLOT_NAMES,
  singleRows,
  waymarkKey,
  waymarkStages,
} from "@emberheir/sim";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useNoteHover } from "../../ui/ItemTooltip";
import { Window, WindowHeader, WindowLayer } from "../../ui/kit/Window";
import { Icon, type IconName } from "../../ui/Icon";
import { Price } from "../../ui/kit/Currency";
import { emptySlotArt } from "../../ui/items";
import type { GameApi } from "../useGame";

/**
 * The act map (act-karte-entwurf-v1.md, Slay the Spire): the road through the act as three
 * lanes from Stage 1 at the bottom to the boss at the top. The hero's path glows, the nodes it
 * can walk to next pulse; a click picks one. Quiet nodes get their cards in the middle.
 */

/** What each node holds, in one line for its card and tooltip. */
export const NODE_TEXT: Record<NodeKind, { name: string; text: string; icon: IconName }> = {
  fight: { name: "Fight", text: "An enemy of the act. Sometimes an Elite.", icon: "strike" },
  elite: { name: "Elite", text: "A sure Elite, with loot of its theme.", icon: "boss" },
  thief: { name: "Thief's Trail", text: "The Ember Thief waits here.", icon: "target" },
  shrine: { name: "Ember Shrine", text: "Steal 1 of 3 Boons. No fight.", icon: "flame" },
  hearth: {
    name: "Hearth",
    text: `Rest: +${Math.round(PROGRESSION.hearthNode * 100)} % Life, or 1 Flask charge. No fight.`,
    icon: "fire",
  },
  cache: { name: "Cache", text: "An item, Runes or Ember Coal. No fight.", icon: "box" },
  event: { name: "Event", text: "Something happens on the road. No fight.", icon: "eye" },
  marisha: {
    name: "Marisha",
    text: `She gambles on ${ROAD_GAMBLE.slots} slots, ${Math.round(ROAD_GAMBLE.discount * 100)} % cheaper. No fight.`,
    icon: "coins",
  },
};

/** Timo's painted node medallions (icon sheet 10, tools/art/cut_map_nodes.py). */
const NODE_ART = import.meta.glob<string>("../../assets/map/node-*.webp", {
  eager: true,
  import: "default",
});
const nodeArt = (kind: NodeKind) => NODE_ART[`../../assets/map/node-${kind}.webp`];

/** Map geometry in stage pixels. */
const LANE_X = [36, 120, 204];
const NODE = 30;
/** Row distance in the planning window: roomy, the window zooms and pans (Timo 2026-10-21). */
const BIG_ROW = 84;
const ZOOM = { min: 0.5, max: 2, step: 1.2 };

function nodeLabel(
  state: GameState,
  run: RunState,
  row: number,
  node: MapNode,
): { name: string; text: string; icon: IconName; marker?: string } {
  const act = getAct(GAME_DATA, run.actId);
  if (row === act.stages)
    return { name: "Boss", text: "The act's boss.", icon: "boss", marker: "boss" };
  if (waymarkStages(act).includes(row)) {
    const gate = isWallAct(GAME_DATA, act, state.legacy.prestige) && gateStages(act).includes(row);
    const shrine = act.shrineStages.includes(row);
    return {
      name: gate ? "Gatekeeper" : "Waymark",
      text: `${gate ? "An Elite guards this Waymark." : "A fight at the Waymark."} +1 Skill Point the first time${shrine ? ", then an Ember Shrine" : ""}.`,
      icon: gate ? "warden" : "tree",
      marker: gate ? "gate" : "waymark",
    };
  }
  return NODE_TEXT[node.kind];
}

/** The map in the Intermission's right column; `big` is the planning window (M). */
export function ActMapView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  big?: boolean;
  onBig?: () => void;
}) {
  const { state, run, game } = props;
  const map = run.map;
  if (!map) return null;
  const act = getAct(GAME_DATA, run.actId);
  const rows = map.rows.length;
  const rowH = props.big ? BIG_ROW : Math.min(44, 600 / rows);
  const scale = props.big ? 2.4 : 1;
  // The planning window keeps room around the first and last row for the nodes' glow.
  const pad = props.big ? 56 : 4;
  const height = rowH * (rows - 1) + NODE + 2 * pad;
  const yOf = (row: number) => pad + (rows - row) * rowH + NODE / 2;
  const xOf = (row: number, lane: number) =>
    ((map.rows[row - 1]?.length ?? 0) === 1 ? (LANE_X[1] ?? 120) : (LANE_X[lane] ?? 120)) * scale;
  const here = currentNode(run);
  const path = run.path ?? [];
  const onPath = (row: number, lane: number) =>
    row <= run.stage && (map.rows[row - 1]?.length === 1 || path[row - 1] === lane);
  // The next row is open for a choice after a fight's rewards or at a quiet node.
  const choosing =
    (run.phase === "rewards" && !run.encounter?.boss) ||
    (run.phase === "intermission" && !!run.visit);
  const ahead = choosing ? nextNodes(run) : [];
  const chosen = chosenNext(run);
  const lines: React.ReactNode[] = [];
  map.rows.forEach((row, r) => {
    for (const node of row) {
      for (const lane of node.next) {
        const from = { x: xOf(r + 1, node.lane), y: yOf(r + 1) };
        const to = { x: xOf(r + 2, lane), y: yOf(r + 2) };
        const walked = onPath(r + 1, node.lane) && onPath(r + 2, lane) && r + 2 <= run.stage;
        const next =
          r + 1 === run.stage &&
          here?.lane === node.lane &&
          (chosen === undefined ? choosing : chosen === lane);
        lines.push(
          <line
            key={`${r}-${node.lane}-${lane}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className={walked ? "walked" : next ? "ahead" : ""}
          />,
        );
      }
    }
  });
  const width = (LANE_X[2] ?? 204) * scale + 36;
  return (
    <section
      className={`panel-card act-map${props.big ? " big" : ""}`}
      aria-label="Act map"
      data-testid={props.big ? "act-map-big" : "act-map"}
    >
      {!props.big && (
        <div className="section-row">
          <span className="eyebrow">{act.name}</span>
          {props.onBig && (
            <button type="button" className="act-map-big-btn" onClick={props.onBig}>
              <Icon name="eye" size={13} /> Map <kbd>M</kbd>
            </button>
          )}
        </div>
      )}
      {props.big ? (
        <MapViewport width={width} height={height} focusY={yOf(Math.min(rows, run.stage + 1))}>
          <div className="act-map-field" style={{ width, height }}>
            <svg className="act-map-lines" width={width} height={height} aria-hidden="true">
              {lines}
            </svg>
            {map.rows.map((row, r) =>
              row.map((node) => {
                const stage = r + 1;
                const lane = row.length === 1 ? 1 : node.lane;
                const isAhead = stage === run.stage + 1 && ahead.some((n) => n.lane === lane);
                return (
                  <MapNodeButton
                    key={`${stage}-${lane}`}
                    state={state}
                    run={run}
                    stage={stage}
                    node={node}
                    x={xOf(stage, lane) - NODE / 2}
                    y={yOf(stage) - NODE / 2}
                    current={stage === run.stage && here?.lane === node.lane}
                    walked={onPath(stage, lane) && stage < run.stage}
                    ahead={isAhead && ahead.length > 1}
                    chosen={isAhead && chosen === lane}
                    waymarkTaken={
                      singleRows(act).includes(stage) &&
                      state.progress.waymarks.includes(waymarkKey(act.id, stage))
                    }
                    onPick={() => game.dispatch({ type: "chooseNode", lane })}
                  />
                );
              }),
            )}
          </div>
        </MapViewport>
      ) : (
        <div className="act-map-field" style={{ width, height }}>
          <svg className="act-map-lines" width={width} height={height} aria-hidden="true">
            {lines}
          </svg>
          {map.rows.map((row, r) =>
            row.map((node) => {
              const stage = r + 1;
              const lane = row.length === 1 ? 1 : node.lane;
              const isAhead = stage === run.stage + 1 && ahead.some((n) => n.lane === lane);
              return (
                <MapNodeButton
                  key={`${stage}-${lane}`}
                  state={state}
                  run={run}
                  stage={stage}
                  node={node}
                  x={xOf(stage, lane) - NODE / 2}
                  y={yOf(stage) - NODE / 2}
                  current={stage === run.stage && here?.lane === node.lane}
                  walked={onPath(stage, lane) && stage < run.stage}
                  ahead={isAhead && ahead.length > 1}
                  chosen={isAhead && chosen === lane}
                  waymarkTaken={
                    singleRows(act).includes(stage) &&
                    state.progress.waymarks.includes(waymarkKey(act.id, stage))
                  }
                  onPick={() => game.dispatch({ type: "chooseNode", lane })}
                />
              );
            }),
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The planning window's view on the map: the wheel zooms around the cursor, a drag pans, the
 * buttons zoom and bring the next row back into view. Opens on the row ahead.
 */
function MapViewport(props: {
  width: number;
  height: number;
  focusY: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });

  // Stage pixels per screen pixel: the stage is scaled to the window (ui/Stage.tsx).
  const unit = () => {
    const el = box.current;
    return el && el.offsetWidth ? el.offsetWidth / el.getBoundingClientRect().width : 1;
  };
  // Measured live: the window settles its size after it opens.
  const room = () => ({ w: box.current?.offsetWidth ?? 0, h: box.current?.offsetHeight ?? 0 });
  const clamp = (v: { x: number; y: number; z: number }) => {
    const { w, h } = room();
    const z = Math.min(ZOOM.max, Math.max(ZOOM.min, v.z));
    const fit = (pos: number, content: number, space: number) =>
      content <= space ? (space - content) / 2 : Math.min(0, Math.max(space - content, pos));
    return { z, x: fit(v.x, props.width * z, w), y: fit(v.y, props.height * z, h) };
  };
  const centered = (z: number) => {
    const { w, h } = room();
    return clamp({ z, x: (w - props.width * z) / 2, y: h / 2 - props.focusY * z });
  };
  const fitted = () => {
    const { h } = room();
    return centered(Math.max(ZOOM.min, Math.min(1, (h - 16) / props.height)));
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setView(centered(1));
    // The view stays where the player put it, only kept inside the map when the window resizes.
    const watch = new ResizeObserver(() => setView((v) => clamp(v)));
    watch.observe(el);
    return () => watch.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAt = (factor: number, px = room().w / 2, py = room().h / 2) =>
    setView((v) => {
      const z = Math.min(ZOOM.max, Math.max(ZOOM.min, v.z * factor));
      const k = z / v.z;
      return clamp({ z, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // A native listener: React's wheel listener is passive and cannot stop the page scroll.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const u = unit();
      zoomAt(
        e.deltaY < 0 ? ZOOM.step : 1 / ZOOM.step,
        (e.clientX - r.left) * u,
        (e.clientY - r.top) * u,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  return (
    <div
      ref={box}
      className="act-map-viewport"
      data-testid="act-map-viewport"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) box.current?.setPointerCapture(e.pointerId);
        d.moved = true;
        d.x = e.clientX;
        d.y = e.clientY;
        const u = unit();
        setView((v) => clamp({ ...v, x: v.x + dx * u, y: v.y + dy * u }));
      }}
      onPointerUp={() => {
        // A drag that moved keeps its click from picking the node under the cursor.
        const moved = drag.current?.moved;
        drag.current = null;
        if (moved) {
          const stop = (ev: MouseEvent) => ev.stopPropagation();
          window.addEventListener("click", stop, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
        }
      }}
      onPointerCancel={() => (drag.current = null)}
    >
      <div
        className="act-map-pan"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
      >
        {props.children}
      </div>
      <div className="tree-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn icon-btn"
          aria-label="Zoom in"
          onClick={() => zoomAt(ZOOM.step)}
        >
          +
        </button>
        <button
          type="button"
          className="btn icon-btn"
          aria-label="Zoom out"
          onClick={() => zoomAt(1 / ZOOM.step)}
        >
          −
        </button>
        <button type="button" className="btn" onClick={() => setView(fitted())}>
          Fit
        </button>
        <button type="button" className="btn" onClick={() => setView(centered(1))}>
          Ahead
        </button>
      </div>
    </div>
  );
}

function MapNodeButton(props: {
  state: GameState;
  run: RunState;
  stage: number;
  node: MapNode;
  x: number;
  y: number;
  current: boolean;
  walked: boolean;
  ahead: boolean;
  chosen: boolean;
  waymarkTaken: boolean;
  onPick: () => void;
}) {
  const label = nodeLabel(props.state, props.run, props.stage, props.node);
  const hover = useNoteHover({
    name: label.name,
    kind: `Stage ${props.stage}`,
    explain: label.text,
    ...(props.ahead ? { status: "Click to walk here next" } : {}),
  });
  const cls = [
    "map-node",
    `map-${label.marker ?? props.node.kind}`,
    props.current ? "current" : "",
    props.walked ? "walked" : "",
    props.ahead ? "ahead" : "",
    props.chosen ? "chosen" : "",
    props.waymarkTaken ? "taken" : "",
  ].join(" ");
  const style = { left: props.x, top: props.y, width: NODE, height: NODE };
  const art = label.marker ? null : (
    <img src={nodeArt(props.node.kind)} alt="" className="map-node-art" draggable={false} />
  );
  return props.ahead ? (
    <button
      type="button"
      className={cls}
      style={style}
      aria-label={`${label.name}, Stage ${props.stage}`}
      aria-pressed={props.chosen}
      onClick={props.onPick}
      {...hover}
    >
      {art}
    </button>
  ) : (
    <span
      className={cls}
      style={style}
      aria-label={`${label.name}, Stage ${props.stage}`}
      {...hover}
    >
      {art}
    </span>
  );
}

/** The planning window over the Intermission (M). */
export function ActMapWindow(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [props]);
  const act = getAct(GAME_DATA, props.run.actId);
  return (
    <WindowLayer>
      <Window
        label="Act map"
        role="dialog"
        className="act-map-window"
        header={<WindowHeader title={act.name} sub="Act map" onClose={props.onClose} />}
      >
        <ActMapView state={props.state} run={props.run} game={props.game} big />
        <p className="sub act-map-legend">
          {(["fight", "elite", "shrine", "hearth", "cache", "event", "marisha"] as const).map(
            (k) => (
              <span key={k} className="legend-item">
                <img src={nodeArt(k)} alt="" className="legend-node" />
                {NODE_TEXT[k].name}
              </span>
            ),
          )}
        </p>
      </Window>
    </WindowLayer>
  );
}

/** The nodes ahead as big cards in the middle: pick where the road goes next. */
export function NodeCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const chosen = chosenNext(run);
  return (
    <div className="path-cards node-cards" role="radiogroup" aria-label="Choose a path">
      {nextNodes(run).map((node) => {
        const text = nodeLabel(state, run, run.stage + 1, node);
        return (
          <button
            key={node.lane}
            type="button"
            role="radio"
            aria-checked={chosen === node.lane}
            aria-label={text.name}
            className={`path-card panel-card path-${node.kind}${chosen === node.lane ? " chosen" : ""}`}
            onClick={() => game.dispatch({ type: "chooseNode", lane: node.lane })}
          >
            <span className="path-sigil painted">
              <img src={nodeArt(node.kind)} alt="" />
            </span>
            <strong className="title-font">{text.name}</strong>
            <span className="sub">{text.text}</span>
            <span className="node-lane sub">{["Left", "Middle", "Right"][node.lane]}</span>
          </button>
        );
      })}
    </div>
  );
}

const BLOCK_TEXT: Record<VisitBlockReason, string> = {
  life: "Too little Life",
  flask: "Not enough Flask charges",
  flaskFull: "The Flask is full",
  acorns: "Not enough Acorns",
  ash: "Not enough Ash",
  room: "No room in the inventory",
  sold: "Sold",
};

/** Title and line over the cards of a quiet node. */
export function visitTitle(run: RunState): { title: string; sub: string } {
  const visit = run.visit;
  if (!visit) return { title: "", sub: "" };
  if (visit.kind === "event" && visit.event) {
    const event = getEvent(GAME_DATA, visit.event);
    return { title: event.name.toUpperCase(), sub: event.text };
  }
  switch (visit.kind) {
    case "hearth":
      return { title: "HEARTH", sub: "A quiet fire by the road" };
    case "cache":
      return { title: "CACHE", sub: "Take 1 of 3" };
    case "marisha":
      return {
        title: "MARISHA",
        sub: `Gambling on the road · ${Math.round(ROAD_GAMBLE.discount * 100)} % off`,
      };
    case "shrine":
      return { title: "EMBER SHRINE", sub: "" };
    default:
      return { title: NODE_TEXT[visit.kind].name.toUpperCase(), sub: "" };
  }
}

/** The choice at a quiet node: Hearth, Cache, Event or Marisha, and always Walk On. */
export function VisitCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const visit = run.visit;
  if (!visit || visit.done) return null;
  const choose = (choice: number) => game.dispatch({ type: "visitNode", choice });
  const walkOn = (
    <ChoiceCard
      key="walk"
      kind="walk"
      icon="next"
      name="Walk On"
      text="Leave it and go on."
      onClick={() => choose(-1)}
    />
  );
  let cards: React.ReactNode[] = [];
  if (visit.kind === "hearth") {
    cards = [
      <ChoiceCard
        key="rest"
        kind="rest"
        icon="fire"
        name="Rest"
        text={`Heal ${Math.round(hearthHeal(state, GAME_DATA) * 100)} % Life.`}
        blocked={run.lifeFraction >= 1 ? "Life is full" : undefined}
        onClick={() => choose(0)}
      />,
      <ChoiceCard
        key="flask"
        kind="flask"
        icon="flask"
        name="Kindle the Flask"
        text="Gain 1 Ember Flask charge."
        blocked={reason(nodeBlockReason(state, GAME_DATA, 1))}
        onClick={() => choose(1)}
      />,
    ];
  } else if (visit.kind === "cache") {
    const rune = visit.runes?.[0] ? GAME_DATA.items.runes.get(visit.runes[0]) : undefined;
    cards = [
      <ChoiceCard
        key="item"
        kind="item"
        icon="armor"
        name="Item"
        text="Choose 1 of 3 items."
        onClick={() => choose(0)}
      />,
      <ChoiceCard
        key="rune"
        kind="rune"
        icon="rune"
        name={rune ? `${rune.name} Rune` : "Runes"}
        text="Into the Rune pouch."
        blocked={rune ? undefined : "Empty"}
        onClick={() => choose(1)}
      />,
      <ChoiceCard
        key="coal"
        kind="coal"
        icon="stone"
        name="Ember Coal"
        text=""
        onClick={() => choose(2)}
      >
        <Price id="coal" amount={visit.emberCoal ?? 0} plus />
      </ChoiceCard>,
    ];
  } else if (visit.kind === "event" && visit.event) {
    const event = getEvent(GAME_DATA, visit.event);
    cards = event.options.map((option, i) => {
      const price = eventPrice(state, GAME_DATA, option);
      return (
        <ChoiceCard
          key={option.id}
          kind={`event-${option.id}`}
          icon={eventIcon(option.gain)}
          name={option.label}
          text={option.text}
          blocked={reason(eventBlockReason(state, GAME_DATA, option))}
          onClick={() => choose(i)}
        >
          {price.acorns > 0 && <Price id="acorns" amount={price.acorns} />}
          {price.ash > 0 && <Price id="ash" amount={price.ash} />}
        </ChoiceCard>
      );
    });
  } else if (visit.kind === "marisha") {
    const price = roadGamblePrice(state, GAME_DATA);
    cards = (visit.slots ?? []).map((slot, i) => {
      const art = emptySlotArt(slot);
      const sold = visit.bought?.includes(i);
      return (
        <ChoiceCard
          key={slot}
          kind="gamble"
          icon="coins"
          name={SLOT_NAMES[slot]}
          text={sold ? "Bought: it waits in your inventory." : "A random item for this slot."}
          art={art}
          blocked={reason(roadGambleBlockReason(state, GAME_DATA, i))}
          onClick={() => choose(i)}
        >
          {!sold && <Price id="acorns" amount={price} />}
        </ChoiceCard>
      );
    });
  }
  return (
    <div className="path-cards visit-cards" aria-label="Choose">
      {cards}
      {walkOn}
    </div>
  );
}

const reason = (r: VisitBlockReason | undefined) => (r ? BLOCK_TEXT[r] : undefined);

function eventIcon(gain: EventGain | undefined): IconName {
  if (!gain) return "eye";
  if (gain.boons) return "flame";
  if (gain.items) return "box";
  if (gain.rune !== undefined) return "rune";
  if (gain.flask) return "flask";
  if (gain.challenge) return "boss";
  if (gain.xpFights || gain.lucky) return "star";
  if (gain.emberCoal) return "stone";
  if (gain.life) return "fire";
  return "eye";
}

function ChoiceCard(props: {
  kind: string;
  icon: IconName;
  name: string;
  text: string;
  art?: string | undefined;
  blocked?: string | undefined;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const hover = useNoteHover(
    props.blocked ? { name: props.name, kind: "", explain: props.blocked } : undefined,
  );
  return (
    <button
      type="button"
      aria-label={props.name}
      aria-disabled={props.blocked ? true : undefined}
      className={`path-card panel-card choice-${props.kind}${props.blocked ? " blocked" : ""}`}
      onClick={props.blocked ? undefined : props.onClick}
      {...hover}
    >
      <span className="path-sigil">
        {props.art ? (
          <img src={props.art} alt="" className="choice-art" />
        ) : (
          <Icon name={props.icon} size={34} />
        )}
      </span>
      <strong className="title-font">{props.name}</strong>
      {props.text && <span className="sub">{props.text}</span>}
      {props.children && <span className="choice-price">{props.children}</span>}
    </button>
  );
}
