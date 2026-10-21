import { INK, L, S } from "./paint";

import type { CSSProperties } from "react";
import type { CampLightSource } from "./CampLight";
import type { CollectionId } from "../../collections";
import campAshenFields from "../../../assets/camp/camp-ashen-fields.webp";
import hearthBowl from "../../../assets/camp/hearthfire-bowl.webp";

/**
 * The camp scene: a painted backdrop with code-drawn fire, braziers and lights on top.
 * Coordinates follow the 1440-wide mock, the scene starts below the header. Wider screens see
 * more of the painting at the sides. The Hearthfire stands at x = 720; everything is lit from there.
 */
export const SCENE_W = 1440;
export const HEARTH_X = 725;
/** Where the Hearthfire stands in the painting's stone ring. */
const HEARTH_Y = 580;

/** A tiny deterministic random source, so the scene looks the same on every load. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const f = (n: number) => n.toFixed(1);

/**
 * The painted backdrop (Timo's image, 1916 × 821). It is as tall as the scene; its stone ring
 * (image x 945) sits under the Hearthfire. Wider screens see mirrored copies at the sides.
 */
const IMG_W = 1916;
const IMG_H = 821;
const IMG_RING_X = 945;

/** How far right of x = 1300 Eldrin's painted signpost stands. */
export const SIGNPOST_DX = 100;

/** Collection banners (spielzeit-v1.md, E): one per full collection, on the palisade. */
const BANNERS: Record<CollectionId, { x: number; cloth: string; emblem: string }> = {
  trophies: {
    x: 1200,
    cloth: "#c98a2a",
    emblem: "M-10 -6 h20 v6 a10 10 0 0 1 -20 0 Z M-3 10 h6 v6 h-6 Z M-8 18 h16",
  },
  runewords: {
    x: 1262,
    cloth: "#2d5bd0",
    emblem: "M0 -14 L10 -6 V8 L0 16 L-10 8 V-6 Z M0 -6 V10 M-5 0 L0 4 L5 0",
  },
  codex: {
    x: 1324,
    cloth: "#a8401a",
    emblem: "M0 -14 a14 14 0 1 0 0.1 0 Z M0 -8 L6 4 L0 10 L-6 4 Z",
  },
  // A paw print for the Bestiary.
  hunts: {
    x: 1386,
    cloth: "#6b4a2a",
    emblem:
      "M0 2 c-7 0 -10 6 -8 10 c2 3 6 2 8 2 c2 0 6 1 8 -2 c2 -4 -1 -10 -8 -10 Z M-9 -4 a3 4 0 1 0 0.1 0 Z M9 -4 a3 4 0 1 0 0.1 0 Z M-4 -11 a3 4 0 1 0 0.1 0 Z M4 -11 a3 4 0 1 0 0.1 0 Z",
  },
};

function Banner(props: { id: CollectionId }) {
  const b = BANNERS[props.id];
  const top = 214;
  return (
    <g className={`camp-banner banner-${props.id}`} data-testid={`banner-${props.id}`}>
      <L
        d={`M${b.x} 352 L${b.x} ${top - 8} M${b.x - 30} ${top} L${b.x + 30} ${top}`}
        w={4}
        color="#4a3220"
      />
      <S
        d={`M${b.x - 26} ${top} L${b.x + 26} ${top} L${b.x + 26} ${top + 96} L${b.x} ${top + 80} L${b.x - 26} ${top + 96} Z`}
        fill={b.cloth}
        w={2.2}
      />
      <path
        d={b.emblem}
        transform={`translate(${b.x} ${top + 40})`}
        fill="none"
        stroke="#ffd27a"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * The ancestor portrait (spielzeit-v1.md, D): hangs on the palisade once the Lineage is full. A
 * framed Heir otter in gold, lit from below by a small ember.
 */
function AncestorPortrait() {
  const x = 205;
  const y = 196;
  return (
    <g className="camp-ancestor" data-testid="ancestor-portrait">
      <L d={`M${x - 34} ${y - 4} L${x} ${y - 30} L${x + 34} ${y - 4}`} w={2.5} color="#4a3220" />
      <S d={`M${x - 44} ${y - 6} h88 v118 h-88 Z`} fill="#c98a2a" w={2.4} />
      <S d={`M${x - 34} ${y + 4} h68 v98 h-68 Z`} fill="#2a1f1a" w={1.8} />
      <ellipse cx={x} cy={y + 96} rx="30" ry="20" fill="#ff8a3a" opacity="0.35" />
      {/* The ancestor: head, ears, muzzle, shoulders */}
      <path
        d={`M${x - 24} ${y + 102} C${x - 22} ${y + 74} ${x + 22} ${y + 74} ${x + 24} ${y + 102} Z`}
        fill="#7a5034"
      />
      <circle cx={x - 13} cy={y + 30} r="5" fill="#7a5034" />
      <circle cx={x + 13} cy={y + 30} r="5" fill="#7a5034" />
      <ellipse cx={x} cy={y + 46} rx="17" ry="19" fill="#8e5e3c" />
      <ellipse cx={x} cy={y + 56} rx="10" ry="7" fill="#d9b48a" />
      <circle cx={x - 6} cy={y + 42} r="2.2" fill="#1a1210" />
      <circle cx={x + 6} cy={y + 42} r="2.2" fill="#1a1210" />
      <circle cx={x} cy={y + 52} r="2.6" fill="#1a1210" />
      <path
        d={`M${x} ${y + 128} c-6 -8 -4 -14 0 -20 c4 6 6 12 0 20 Z`}
        fill="#ffb13b"
        stroke={INK}
        strokeWidth="1.4"
      />
    </g>
  );
}

export function CampBackdrop(props: {
  w: number;
  h: number;
  ox: number;
  /** Full collections: each hangs its banner. */
  banners?: readonly CollectionId[];
  /** Full Lineage: the ancestor portrait hangs on the palisade. */
  ancestor?: boolean;
}) {
  const { w, h, ox } = props;
  const k = h / IMG_H;
  const iw = IMG_W * k;
  const left = HEARTH_X - IMG_RING_X * k;
  const right = left + iw;
  return (
    <svg
      className="camp-scene"
      width={w}
      height={h}
      viewBox={`${-ox} 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="camp-vignette" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.6" stopColor="#0e0a08" stopOpacity="0" />
          <stop offset="1" stopColor="#0e0a08" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <image
        href={campAshenFields}
        x={left}
        y="0"
        width={iw}
        height={h}
        preserveAspectRatio="none"
      />
      {/* Ultrawide: the painting continues mirrored at both sides. */}
      {-ox < left && (
        <image
          href={campAshenFields}
          x={-left}
          y="0"
          width={iw}
          height={h}
          preserveAspectRatio="none"
          transform="scale(-1 1)"
        />
      )}
      {w - ox > right && (
        <image
          href={campAshenFields}
          x={-right - iw}
          y="0"
          width={iw}
          height={h}
          preserveAspectRatio="none"
          transform="scale(-1 1)"
        />
      )}

      {props.banners?.map((id) => (
        <Banner key={id} id={id} />
      ))}
      {props.ancestor && <AncestorPortrait />}

      <rect x={-ox} y="0" width={w} height={h} fill="url(#camp-vignette)" />
    </svg>
  );
}

const FLAME_OUTER =
  "M668 548 C658 520 676 500 682 478 C686 492 694 496 697 488 C694 466 706 450 712 424 C718 444 726 452 730 446 C738 432 736 416 732 402 C752 424 760 452 754 476 C762 470 766 460 766 450 C780 474 778 516 772 548 Z";
const FLAME_MID =
  "M686 548 C682 526 694 512 700 496 C704 506 710 508 712 500 C712 486 718 474 724 460 C732 480 740 490 738 506 C746 500 750 494 750 486 C758 506 758 530 754 548 Z";
const FLAME_CORE =
  "M704 548 C700 534 708 522 714 510 C718 520 722 522 724 514 C732 526 736 538 732 548 Z";

/** The Hearthfire's flames (base center at 720, 548), painted to match the bowl: saturated
 * tongues with a thin dark-red ink edge, hot yellow at the root and deep red at the tips. Only
 * the blurred halo is added onto the scene, so the flames keep their color on the bright tents. */
function Flames() {
  const side = (dx: number, k: number) =>
    `translate(${720 + dx} 548) scale(${k}) translate(-720 -548)`;
  const ink = {
    stroke: "#5a1606",
    strokeWidth: 1.6,
    strokeOpacity: 0.55,
    strokeLinejoin: "round",
  } as const;
  return (
    <g className="flames" transform="translate(720 548) scale(0.95 0.7) translate(-720 -548)">
      <defs>
        <linearGradient id="hf-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffb13c" />
          <stop offset="0.4" stopColor="#f2621c" />
          <stop offset="1" stopColor="#a8230d" />
        </linearGradient>
        <linearGradient id="hf-mid" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.65" stopColor="#ffa531" />
          <stop offset="1" stopColor="#f2621c" />
        </linearGradient>
        <linearGradient id="hf-core" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="1" stopColor="#ffe48a" />
        </linearGradient>
        <filter id="hf-halo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <path
        className="flame f1"
        d={FLAME_OUTER}
        fill="#ff7a2a"
        opacity="0.6"
        filter="url(#hf-halo)"
        style={{ mixBlendMode: "screen" }}
      />
      <g transform={side(-28, 0.52)}>
        <path className="flame f4" d={FLAME_OUTER} fill="url(#hf-outer)" {...ink} />
      </g>
      <g transform={side(32, 0.46)}>
        <path className="flame f5" d={FLAME_OUTER} fill="url(#hf-outer)" {...ink} />
      </g>
      <path className="flame f1" d={FLAME_OUTER} fill="url(#hf-outer)" {...ink} />
      <path className="flame f2" d={FLAME_MID} fill="url(#hf-mid)" />
      <path className="flame f3" d={FLAME_CORE} fill="url(#hf-core)" />
    </g>
  );
}

/** The painted lanterns (string between the tents, tent doors, wagons), in scene coordinates. */
const LANTERNS = [
  [430, 287],
  [483, 295],
  [557, 287],
  [613, 270],
  [781, 255],
  [832, 280],
  [893, 290],
  [954, 280],
  [379, 351],
  [703, 318],
  [1041, 346],
  [-217, 358],
  [137, 346],
  [1367, 351],
] as const;

/** Every light in the camp, for the lighting layer. */
export function campLights(opts: { orb: boolean }): CampLightSource[] {
  return [
    {
      x: HEARTH_X,
      y: HEARTH_Y - 70,
      rx: 420,
      ry: 260,
      color: "#ff8a3a",
      strength: 0.55,
      flicker: "fire",
    },
    {
      x: HEARTH_X,
      y: HEARTH_Y - 90,
      rx: 160,
      ry: 130,
      color: "#ffd27a",
      strength: 0.5,
      flicker: "fire",
    },
    // Marisha's corner by the Supply Wagon.
    { x: 220, y: 480, rx: 110, ry: 90, color: "#ffb060", strength: 0.35, flicker: "soft" },
    // Eldrin on the signpost.
    {
      x: 1300 + SIGNPOST_DX,
      y: 520,
      rx: 130,
      ry: 130,
      color: "#ffb060",
      strength: 0.4,
      flicker: "soft",
    },
    // Thoric at his anvil.
    { x: 1205, y: 450, rx: 130, ry: 130, color: "#ffb060", strength: 0.4, flicker: "soft" },
    // The anvil by Thoric's forge wagon.
    { x: 1290, y: 450, rx: 90, ry: 70, color: "#ff7a2a", strength: 0.45, flicker: "soft" },
    ...LANTERNS.map(([x, y]) => ({ x, y, rx: 46, ry: 40, color: "#ffc070", strength: 0.4 })),
    ...(opts.orb
      ? [
          {
            x: 405,
            y: 395,
            rx: 80,
            ry: 80,
            color: "#6fd3ff",
            strength: 0.5,
            flicker: "soft" as const,
          },
        ]
      : []),
    { x: 1188, y: 76, rx: 520, ry: 300, color: "#8ea6d8", strength: 0.18 },
  ];
}

const SPARKS = [
  { x: 702, d: 0, dx: -18 },
  { x: 716, d: 0.7, dx: 10 },
  { x: 730, d: 1.4, dx: -6 },
  { x: 742, d: 0.35, dx: 22 },
  { x: 724, d: 1.9, dx: -14 },
  { x: 710, d: 2.3, dx: 16 },
];

/** Moves the fire (drawn with its feet at y = 614) into the painted stone ring, a bit smaller. */
const HEARTH_FIT = `translate(${HEARTH_X} ${HEARTH_Y}) scale(0.85) translate(-${HEARTH_X} -614)`;

/**
 * The moving part of the camp: the Hearthfire with its glow and sparks, and drifting ash. The Camp
 * draws it in two parts, so the bowl and flames stand in front of the personas behind the fire.
 */
export function CampFx(props: { w: number; h: number; ox: number; part?: "back" | "hearth" }) {
  const { w, h, ox, part } = props;
  const ash = rand(21);
  const cls = part === "hearth" ? "camp-fx camp-hearth" : "camp-fx";
  return (
    <svg className={cls} width={w} height={h} viewBox={`${-ox} 0 ${w} ${h}`} aria-hidden="true">
      {part !== "hearth" && <CampAir ash={ash} w={w} h={h} ox={ox} />}
      {part !== "back" && <Hearthfire />}
    </svg>
  );
}

/** The fire's glow on the ground and the drifting ash. */
function CampAir(props: { ash: () => number; w: number; h: number; ox: number }) {
  const { ash, w, h, ox } = props;
  return (
    <>
      <ellipse
        className="hearth-glow"
        cx={HEARTH_X}
        cy={HEARTH_Y - 60}
        rx="300"
        ry="190"
        fill="url(#ember-glow)"
        opacity="0.55"
      />
      <g fill="#c9c2b8">
        {Array.from({ length: 34 }, (_, i) => (
          <circle
            key={i}
            className="ash"
            cx={f(-ox + ash() * w)}
            cy={f(ash() * h * 0.6)}
            r={f(1 + ash() * 1.6)}
            opacity={f(0.25 + ash() * 0.35)}
            style={
              {
                "--dx": `${f(-60 + ash() * 120)}px`,
                animationDuration: `${f(14 + ash() * 14)}s`,
                animationDelay: `${f(-ash() * 28)}s`,
              } as CSSProperties
            }
          />
        ))}
      </g>
    </>
  );
}

/** Timo's painted iron bowl with its glowing coals; the flames rise from behind the coals. */
function Hearthfire() {
  return (
    <g transform={HEARTH_FIT}>
      <Flames />
      <image href={hearthBowl} x="635" y="517" width="170" height="98" />
      <ellipse
        className="coal-glow"
        cx={HEARTH_X}
        cy="538"
        rx="62"
        ry="14"
        fill="url(#ember-glow)"
        style={{ mixBlendMode: "screen" }}
      />
      <g fill="#ffcf6a">
        {SPARKS.map((s) => (
          <circle
            key={s.x}
            className="spark"
            cx={s.x}
            cy="440"
            r="2.4"
            style={{ "--dx": `${s.dx}px`, animationDelay: `${-s.d}s` } as CSSProperties}
          />
        ))}
      </g>
      <g fill="#8a8078" filter="url(#soft-blur)">
        {[0, 2.2, 4.4].map((d) => (
          <ellipse
            key={d}
            className="smoke"
            cx={HEARTH_X}
            cy="400"
            rx="26"
            ry="18"
            style={{ animationDelay: `${-d}s` }}
          />
        ))}
      </g>
    </g>
  );
}
