import { type GameState } from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import { HEARTH_X } from "./art/CampScene";
import { PAINTED } from "./art/paintedPersonas";
import {
  type HeirGear,
  FIGURE_H,
  FIGURE_W,
  PaintedFace,
  PersonaArt,
  PORTRAIT,
} from "./art/PersonaArt";
import { type Persona } from "./campPersonas";

/** The heir as a small figure and portrait in the Camp. */

/** On-screen size of a figure at fs = 1, in stage pixels. */
const FIG_W = 96;

export const FIG_H = 168;

export function heirGear(state: GameState): HeirGear {
  const { offHand } = state.hero.equipment;
  const off = offHand?.baseId === "round-shield" ? "shield" : offHand ? "focus" : undefined;
  return {
    weapon: state.hero.weaponId === "fire-wand" ? "wand" : "sword",
    ...(off ? { offHand: off } : {}),
  };
}

export function Figure(props: { p: Persona; on: boolean; gear: HeirGear; delay: number }) {
  const { p } = props;
  const f = p.figure;
  if (!f) return null;
  // Everybody faces the Hearthfire.
  const mirror = p.x > HEARTH_X;
  const painted = PAINTED[p.id];
  if (painted) {
    // A painted figure (art/personas/, the Heir from art/heir/heir-master-v1.png).
    const h = Math.round(painted.h * f.fs);
    const cls = `figure painted${mirror ? " mirror" : ""}${props.on ? " on" : ""}`;
    return (
      <span className={cls} style={{ height: h }}>
        <span className="figure-shadow" />
        <img
          className="figure-body"
          src={painted.url}
          alt=""
          height={h}
          style={{ animationDelay: `${-props.delay}s` }}
        />
      </span>
    );
  }
  return (
    <svg
      width={Math.round(FIG_W * f.fs)}
      height={Math.round(FIG_H * f.fs)}
      viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}
      className={props.on ? "figure on" : "figure"}
      aria-hidden="true"
    >
      <g filter={p.locked ? "url(#silhouette)" : undefined}>
        <g className="figure-body" style={{ animationDelay: `${-props.delay}s` }}>
          <g transform={mirror ? `translate(${FIGURE_W} 0) scale(-1 1)` : undefined}>
            <PersonaArt id={p.id} gear={props.gear} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** The painted Heir's head, cropped round (persona card, Character medallion). */
export function HeirFace() {
  return <PaintedFace id="heir" />;
}

/** The persona's head as a round portrait for the persona card. */
export function Portrait(props: { p: Persona; gear: HeirGear }) {
  const { p } = props;
  if (PAINTED[p.id]) return <PaintedFace id={p.id} />;
  const box = PORTRAIT[p.id];
  if (!p.figure || !box) return <Icon name={p.icon} size={28} color="#f3e6c8" />;
  return (
    <svg viewBox={box} width="100%" height="100%" aria-hidden="true">
      <g filter={p.locked ? "url(#silhouette)" : undefined}>
        <PersonaArt id={p.id} gear={props.gear} />
      </g>
    </svg>
  );
}
