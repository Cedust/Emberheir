/**
 * Shared paint for the code-drawn camp (hand-painted look without image files): soft shading,
 * warm rim light from the Hearthfire, glows, paper grain and the silhouette of locked personas.
 * Everything is vector, so it stays sharp from 1080p to 4K.
 */
export const INK = "#2a1f17";

/** A circle as path data, so it can be shaded like any other shape. */
export const circ = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

/** A painted shape: flat color, ink outline, then shadow on the far side and fire light on the near side. */
export function S(props: { d: string; fill: string; w?: number; flat?: boolean; op?: number }) {
  return (
    <>
      <path
        d={props.d}
        fill={props.fill}
        stroke={INK}
        strokeWidth={props.w ?? 2}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={props.op}
      />
      {!props.flat && <path d={props.d} fill="url(#shade-lr)" opacity={props.op} />}
    </>
  );
}

/** A thin ink line (seams, brows, mouths). */
export function L(props: { d: string; w?: number; color?: string; op?: number }) {
  return (
    <path
      d={props.d}
      fill="none"
      stroke={props.color ?? INK}
      strokeWidth={props.w ?? 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={props.op}
    />
  );
}

/** Gradients and filters every camp drawing refers to; rendered once per screen. */
export function PaintDefs() {
  return (
    <svg className="paint-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="shade-lr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1a0e14" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#1a0e14" stopOpacity="0.06" />
          <stop offset="0.72" stopColor="#ffb060" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb060" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="shade-tb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#ffd9a0" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0e14" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="ember-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#ff8a3a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb-glow">
          <stop offset="0" stopColor="#e8fbff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#6fd3ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#6fd3ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rune-glow">
          <stop offset="0" stopColor="#fff2c0" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#e8c07a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#e8c07a" stopOpacity="0" />
        </radialGradient>
        {/* Locked personas: a dark shape you can recognize by outline only. */}
        <filter id="silhouette" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 0 0.075  0 0 0 0.92 0"
          />
        </filter>
        {/* Paper grain: dark speckles inside the painted shapes only. */}
        <filter id="paint-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0 0.05  0.9 0 0 0 -0.38"
          />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <filter id="soft-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  );
}
