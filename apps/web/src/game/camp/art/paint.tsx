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
export function S(props: {
  d: string;
  fill: string;
  w?: number | undefined;
  flat?: boolean;
  op?: number | undefined;
}) {
  return (
    <>
      <path
        d={props.d}
        fill={props.fill}
        stroke={INK}
        strokeWidth={props.w ?? 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={props.op}
      />
      {!props.flat && <path d={props.d} fill="url(#shade-lr)" opacity={props.op} />}
    </>
  );
}

/**
 * A furry or feathered volume: a painted shape plus soft roundness (light from the Hearthfire
 * side, falling off into shadow) and an optional grain of fur strokes or feather scales.
 */
export function F(props: {
  d: string;
  fill: string;
  w?: number;
  tex?: "fur" | "fur-light" | "feather" | "feather-light";
  op?: number;
}) {
  return (
    <>
      <S d={props.d} fill={props.fill} w={props.w} op={props.op} />
      <path d={props.d} fill="url(#vol)" opacity={props.op} />
      {props.tex && <path d={props.d} fill={`url(#${props.tex})`} opacity={props.op} />}
    </>
  );
}

/**
 * A glossy animal eye: dark ball, optional coloured iris, two catchlights and a lid that blinks
 * now and then (`lid` = colour of the fur around it). `half` keeps the lid half shut (sleepy,
 * dreamy or cool).
 */
export function Eye(props: {
  x: number;
  y: number;
  r: number;
  iris?: string;
  lid?: string;
  half?: number;
  blink?: number;
  /** Where the eye looks, as a fraction of its radius (iris and catchlight shift). */
  look?: [number, number];
}) {
  const { x, y, r } = props;
  const [lx, ly] = props.look ?? [0.12, 0.08];
  const ry = r * 1.12;
  const half = props.half ?? 0;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={ry} fill={INK} />
      {props.iris && (
        <>
          <ellipse cx={x + r * lx} cy={y + r * ly} rx={r * 0.74} ry={ry * 0.78} fill={props.iris} />
          <ellipse
            cx={x + r * lx * 1.3}
            cy={y + r * ly * 1.3}
            rx={r * 0.36}
            ry={ry * 0.44}
            fill={INK}
          />
        </>
      )}
      <circle cx={x + r * 0.34} cy={y - r * 0.38} r={r * 0.36} fill="#fff" />
      <circle cx={x - r * 0.3} cy={y + r * 0.42} r={r * 0.16} fill="#fff" opacity="0.8" />
      {props.lid && half > 0 && (
        <path
          d={`M${x - r - 0.6} ${y - ry - 0.6} H${x + r + 0.6} V${y - ry + 2 * ry * half} Q${x} ${y - ry + 2 * ry * half - r * 0.45} ${x - r - 0.6} ${y - ry + 2 * ry * half} Z`}
          fill={props.lid}
        />
      )}
      {props.lid && half > 0 && (
        <path
          d={`M${x - r - 0.4} ${y - ry + 2 * ry * half} Q${x} ${y - ry + 2 * ry * half - r * 0.45} ${x + r + 0.4} ${y - ry + 2 * ry * half}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
      )}
      {props.lid && (
        <g className="lid" style={{ animationDelay: `${-(props.blink ?? 0)}s` }}>
          <ellipse cx={x} cy={y} rx={r + 0.8} ry={ry + 0.8} fill={props.lid} />
          <path
            d={`M${x - r} ${y + ry * 0.6} Q${x} ${y + ry * 1.2} ${x + r} ${y + ry * 0.6}`}
            fill="none"
            stroke={INK}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
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
        {/* Roundness of fur and feathers: light from the fire side above, shadow below behind. */}
        <radialGradient id="vol" cx="0.68" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#fff4dc" stopOpacity="0.36" />
          <stop offset="0.38" stopColor="#fff4dc" stopOpacity="0" />
          <stop offset="0.72" stopColor="#1a0e14" stopOpacity="0.06" />
          <stop offset="1" stopColor="#1a0e14" stopOpacity="0.42" />
        </radialGradient>
        {/* Fine fur strokes and feather scales, painted over a shape at low contrast. */}
        <pattern id="fur" width="6" height="5" patternUnits="userSpaceOnUse">
          <path
            d="M1 4.6 q1 -1.8 0.7 -3.6 M4 5 q1.1 -2 0.6 -3.8"
            fill="none"
            stroke="#1a0e14"
            strokeOpacity="0.26"
            strokeWidth="0.55"
            strokeLinecap="round"
          />
        </pattern>
        <pattern id="fur-light" width="6" height="5" patternUnits="userSpaceOnUse">
          <path
            d="M1 4.6 q1 -1.8 0.7 -3.6 M4 5 q1.1 -2 0.6 -3.8"
            fill="none"
            stroke="#fff4dc"
            strokeOpacity="0.2"
            strokeWidth="0.55"
            strokeLinecap="round"
          />
        </pattern>
        <pattern id="feather" width="7" height="5" patternUnits="userSpaceOnUse">
          <path
            d="M0 5 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0 M-3.5 2.5 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0"
            fill="none"
            stroke="#1a0e14"
            strokeOpacity="0.16"
            strokeWidth="0.55"
          />
        </pattern>
        <pattern id="feather-light" width="7" height="5" patternUnits="userSpaceOnUse">
          <path
            d="M0 5 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0 M-3.5 2.5 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0 q1.75 -3.4 3.5 0"
            fill="none"
            stroke="#c8d6ff"
            strokeOpacity="0.2"
            strokeWidth="0.55"
          />
        </pattern>
        {/* The raven's plumage: a blue-violet sheen where the light catches it. */}
        <linearGradient id="sheen" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0.25" stopColor="#5a4aff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#7a8aff" stopOpacity="0.2" />
          <stop offset="0.75" stopColor="#c08aff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#5a4aff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="moon-glow">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#d8e4ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#9ab4ff" stopOpacity="0" />
        </radialGradient>
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
