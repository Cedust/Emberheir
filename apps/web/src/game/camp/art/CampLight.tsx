import type { CSSProperties } from "react";

/**
 * Lighting for the camp, laid over the drawn scene AND the personas (and later over painted
 * images): a darkness layer (multiply) with holes where lights are, and a glow layer (screen)
 * that flickers. Light positions use the scene's coordinates.
 */
export interface CampLightSource {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly color: string;
  /** Glow opacity, 0..1. */
  readonly strength: number;
  readonly flicker?: "fire" | "soft";
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const f = (n: number) => n.toFixed(1);

/** How strongly a light also cuts into the darkness, relative to its glow. */
const HOLE = 1.25;

export function CampLight(props: {
  w: number;
  h: number;
  ox: number;
  lights: readonly CampLightSource[];
}) {
  const { w, h, ox, lights } = props;
  const view = `${-ox} 0 ${w} ${h}`;
  const motes = rand(41);
  return (
    <>
      <svg className="camp-dark" width={w} height={h} viewBox={view} aria-hidden="true">
        <defs>
          <linearGradient id="camp-dark-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a7a7a" />
            <stop offset="0.38" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient id="camp-hole">
            <stop offset="0" stopColor="#000" stopOpacity="1" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.6" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <mask id="camp-dark-mask" maskUnits="userSpaceOnUse" x={-ox} y="0" width={w} height={h}>
            <rect x={-ox} y="0" width={w} height={h} fill="url(#camp-dark-base)" />
            {lights.map((l, i) => (
              <ellipse
                key={i}
                cx={l.x}
                cy={l.y}
                rx={l.rx * HOLE}
                ry={l.ry * HOLE}
                fill="url(#camp-hole)"
              />
            ))}
          </mask>
        </defs>
        <rect
          x={-ox}
          y="0"
          width={w}
          height={h}
          fill="#0c0f22"
          opacity="0.62"
          mask="url(#camp-dark-mask)"
        />
      </svg>
      <svg className="camp-glow" width={w} height={h} viewBox={view} aria-hidden="true">
        <defs>
          {lights.map((l, i) => (
            <radialGradient key={i} id={`camp-light-${i}`}>
              <stop offset="0" stopColor={l.color} stopOpacity="1" />
              <stop offset="0.35" stopColor={l.color} stopOpacity="0.5" />
              <stop offset="1" stopColor={l.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        {lights.map((l, i) => (
          <ellipse
            key={i}
            className={l.flicker ? `light ${l.flicker}` : "light"}
            cx={l.x}
            cy={l.y}
            rx={l.rx}
            ry={l.ry}
            fill={`url(#camp-light-${i})`}
            opacity={l.strength}
            style={{ animationDelay: `${-i * 0.37}s` }}
          />
        ))}
        <g fill="#ffd27a">
          {Array.from({ length: 18 }, (_, i) => (
            <circle
              key={i}
              className="mote"
              cx={f(380 + motes() * 680)}
              cy={f(300 + motes() * 330)}
              r={f(1.2 + motes() * 1.6)}
              style={
                {
                  "--dx": `${f(-30 + motes() * 60)}px`,
                  "--dy": `${f(-40 - motes() * 60)}px`,
                  animationDuration: `${f(6 + motes() * 6)}s`,
                  animationDelay: `${f(-motes() * 12)}s`,
                } as CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </>
  );
}
