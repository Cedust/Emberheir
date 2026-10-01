import type { CSSProperties } from "react";
import { INK, L, S, circ } from "./paint";

/**
 * The camp scene at the Ashen Fields, drawn in code. Coordinates follow the 1440-wide mock,
 * the scene starts below the header. Wider screens see more sky, hills and ground at the sides
 * (BLEED). The Hearthfire stands at x = 720; everything is lit from there.
 */
export const SCENE_W = 1440;
export const HEARTH_X = 720;
const BLEED = 1200;
const X0 = -BLEED;
const X1 = SCENE_W + BLEED;

/** A tiny deterministic random source, so the scene looks the same on every load. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const f = (n: number) => n.toFixed(1);

/** A jagged mountain range from X0 to X1. */
function range(seed: number, base: number, amp: number, step: number, bottom: number) {
  const r = rand(seed);
  let d = `M${X0} ${bottom} L${X0} ${base}`;
  for (let x = X0; x < X1; x += step) {
    const peak = base - amp * (0.35 + 0.65 * r());
    d += ` L${f(x + step * (0.3 + 0.4 * r()))} ${f(peak)} L${x + step} ${f(base - amp * 0.2 * r())}`;
  }
  return `${d} L${X1} ${bottom} Z`;
}

/** Soft rolling hills from X0 to X1. */
function hills(seed: number, base: number, amp: number, step: number, bottom: number) {
  const r = rand(seed);
  let d = `M${X0} ${bottom} L${X0} ${base}`;
  for (let x = X0; x < X1; x += step) {
    d += ` Q${f(x + step / 2)} ${f(base - amp * (0.4 + r()))} ${x + step} ${f(base - amp * 0.3 * r())}`;
  }
  return `${d} L${X1} ${bottom} Z`;
}

/** A dead, ash-grey tree: trunk plus a few forking branches. */
function deadTree(x: number, y: number, h: number, seed: number) {
  const r = rand(seed);
  let d = `M${x} ${y} L${f(x + (r() - 0.5) * 6)} ${y - h}`;
  for (let i = 0; i < 4; i++) {
    const by = y - h * (0.45 + 0.13 * i);
    const dir = i % 2 === 0 ? -1 : 1;
    const len = h * (0.25 + 0.2 * r());
    const ex = x + dir * len;
    const ey = by - len * 0.7;
    d += ` M${x} ${f(by)} L${f(ex)} ${f(ey)} M${f(x + dir * len * 0.6)} ${f(by - len * 0.42)} l${f(dir * len * 0.25)} ${f(-len * 0.45)}`;
  }
  return d;
}

function Tent(props: { x: number; y: number; w: number; h: number; fill: string; flag: string }) {
  const { x, y, w, h } = props;
  const l = x - w / 2;
  const r = x + w / 2;
  const t = y - h;
  // The side away from the fire lies in shadow.
  const away = x < HEARTH_X ? -1 : 1;
  return (
    <g>
      <L d={`M${x} ${t} L${l - 22} ${y + 6} M${x} ${t} L${r + 22} ${y + 6}`} w={1.2} op={0.55} />
      <S d={`M${l} ${y} L${x} ${t} L${r} ${y} Z`} fill={props.fill} w={2.5} flat />
      <path
        d={`M${x} ${t} L${x + away * w * 0.5} ${y} L${x + away * w * 0.06} ${y} Z`}
        fill="#1a0e14"
        opacity={0.3}
      />
      <path
        d={`M${x} ${t} L${x - away * w * 0.5} ${y} L${x - away * w * 0.32} ${y} Z`}
        fill="#ffb060"
        opacity={0.22}
      />
      <L d={`M${x} ${t} L${x - w * 0.22} ${y} M${x} ${t} L${x + w * 0.22} ${y}`} w={1} op={0.35} />
      <S
        d={`M${x - w * 0.15} ${y} L${x} ${t + h * 0.38} L${x + w * 0.15} ${y} Z`}
        fill="#24160f"
        w={2}
        flat
      />
      <S
        d={`M${x} ${t + h * 0.38} L${x - away * w * 0.15} ${y} L${x - away * w * 0.27} ${y} Z`}
        fill={props.fill}
        w={2}
      />
      <L d={`M${x} ${t} L${x} ${t - 22}`} w={2.5} />
      <S d={`M${x} ${t - 22} L${x + 18} ${t - 16} L${x} ${t - 10} Z`} fill={props.flag} w={1.8} />
    </g>
  );
}

function Wheel(props: { cx: number; cy: number; r: number }) {
  const { cx, cy, r } = props;
  const spokes = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const a = (i * Math.PI) / 3 + 0.3;
      return `M${f(cx + Math.cos(a) * 5)} ${f(cy + Math.sin(a) * 5)} L${f(cx + Math.cos(a) * (r - 3))} ${f(cy + Math.sin(a) * (r - 3))}`;
    })
    .join(" ");
  return (
    <g>
      <S d={circ(cx, cy, r)} fill="#4a3424" w={2.5} />
      <circle cx={cx} cy={cy} r={r - 4} fill="#2a1d14" stroke={INK} strokeWidth={1.5} />
      <L d={spokes} color="#7a5a3a" w={3} />
      <S d={circ(cx, cy, 5)} fill="#5e4a36" w={1.6} />
    </g>
  );
}

/** A covered wagon; x is the left edge, y the ground below the wheels. */
function Wagon(props: {
  x: number;
  y: number;
  w: number;
  cover: string;
  wood: string;
  tongue: -1 | 1;
}) {
  const { x, y, w } = props;
  const top = y - 64;
  const bottom = y - 32;
  const tx = props.tongue < 0 ? x : x + w;
  return (
    <g>
      <L d={`M${tx} ${bottom - 6} L${tx + props.tongue * 56} ${y - 4}`} color="#5e3a20" w={5} />
      <L d={`M${tx} ${bottom - 6} L${tx + props.tongue * 56} ${y - 4}`} w={1.2} op={0.6} />
      <S
        d={`M${x + 8} ${top} C${x + 8} ${top - 96} ${x + w - 8} ${top - 96} ${x + w - 8} ${top} Z`}
        fill={props.cover}
        w={2.5}
      />
      <L
        d={`M${x + w * 0.3} ${top} C${x + w * 0.28} ${top - 60} ${x + w * 0.34} ${top - 70} ${x + w * 0.4} ${top - 72} M${x + w * 0.68} ${top} C${x + w * 0.7} ${top - 60} ${x + w * 0.66} ${top - 70} ${x + w * 0.6} ${top - 72}`}
        w={1.3}
        op={0.5}
      />
      <S
        d={`M${x} ${top} L${x + w} ${top} L${x + w - 6} ${bottom} L${x + 6} ${bottom} Z`}
        fill={props.wood}
        w={2.5}
      />
      <L
        d={`M${x + 3} ${top + 11} L${x + w - 3} ${top + 11} M${x + 5} ${top + 22} L${x + w - 5} ${top + 22}`}
        op={0.5}
      />
      <Wheel cx={x + 30} cy={y - 24} r={24} />
      <Wheel cx={x + w - 30} cy={y - 24} r={24} />
    </g>
  );
}

function Crate(props: { x: number; y: number; s: number; fill?: string }) {
  const { x, y, s } = props;
  return (
    <g>
      <S d={`M${x} ${y} h${s} v${-s} h${-s} Z`} fill={props.fill ?? "#a07040"} w={2} />
      <L
        d={`M${x + 3} ${y - 3} L${x + s - 3} ${y - s + 3} M${x + 3} ${y - s + 3} L${x + s - 3} ${y - 3}`}
        op={0.45}
      />
    </g>
  );
}

function Barrel(props: { x: number; y: number }) {
  const { x, y } = props;
  return (
    <g>
      <S
        d={`M${x - 15} ${y} C${x - 19} ${y - 18} ${x - 19} ${y - 30} ${x - 15} ${y - 46} L${x + 15} ${y - 46} C${x + 19} ${y - 30} ${x + 19} ${y - 18} ${x + 15} ${y} Z`}
        fill="#7a4a28"
        w={2}
      />
      <L
        d={`M${x - 17} ${y - 12} L${x + 17} ${y - 12} M${x - 17} ${y - 34} L${x + 17} ${y - 34}`}
        color="#3b3430"
        w={2.4}
      />
    </g>
  );
}

/** Ground details: grass tufts and pebbles scattered around the clearing. */
function groundBits(h: number) {
  const r = rand(11);
  const tufts: string[] = [];
  const stones: { x: number; y: number; rx: number }[] = [];
  for (let i = 0; i < 90; i++) {
    const x = X0 + r() * (X1 - X0);
    const y = 330 + r() * (h - 340);
    // Keep the middle of the clearing tidy.
    if (Math.abs(x - HEARTH_X) < 260 && y > 380 && y < 640) continue;
    if (r() < 0.65) {
      tufts.push(
        `M${f(x)} ${f(y)} l-4 -12 M${f(x + 3)} ${f(y)} l1 -15 M${f(x + 6)} ${f(y)} l5 -10`,
      );
    } else {
      stones.push({ x, y, rx: 4 + r() * 8 });
    }
  }
  return { tufts: tufts.join(" "), stones };
}

/** The still part of the camp: sky, hills, tents, wagons, stall, anvil and the road. */
export function CampBackdrop(props: { roadName: string; w: number; h: number; ox: number }) {
  const { w, h, ox } = props;
  const stars = rand(5);
  const bits = groundBits(h);
  return (
    <svg
      className="camp-scene"
      width={w}
      height={h}
      viewBox={`${-ox} 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="camp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2230" />
          <stop offset="0.35" stopColor="#3a3646" />
          <stop offset="0.62" stopColor="#7a5250" />
          <stop offset="0.84" stopColor="#d07c48" />
          <stop offset="1" stopColor="#f2b062" />
        </linearGradient>
        <linearGradient id="camp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a4632" />
          <stop offset="0.4" stopColor="#3e3124" />
          <stop offset="1" stopColor="#1e1812" />
        </linearGradient>
        <radialGradient id="camp-clearing">
          <stop offset="0" stopColor="#b48a52" />
          <stop offset="0.55" stopColor="#7c5f3a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#4a3a28" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="camp-moon">
          <stop offset="0" stopColor="#fff3d0" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff3d0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="camp-vignette" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.55" stopColor="#0e0a08" stopOpacity="0" />
          <stop offset="1" stopColor="#0e0a08" stopOpacity="0.7" />
        </radialGradient>
        <linearGradient id="camp-road" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a07c4e" />
          <stop offset="1" stopColor="#6a5234" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x={X0} y="0" width={X1 - X0} height="340" fill="url(#camp-sky)" />
      <g fill="#fff6dc">
        {Array.from({ length: 70 }, (_, i) => (
          <circle
            key={i}
            cx={f(X0 + stars() * (X1 - X0))}
            cy={f(stars() * 150)}
            r={f(0.6 + stars() * 1.3)}
            opacity={f(0.25 + stars() * 0.6)}
          />
        ))}
      </g>
      <circle cx="1180" cy="112" r="80" fill="url(#camp-moon)" />
      <S d={circ(1180, 112, 27)} fill="#f6e2b4" w={2} flat />
      <circle cx="1172" cy="104" r="5" fill="#d9c08e" opacity="0.6" />
      <circle cx="1190" cy="120" r="3.5" fill="#d9c08e" opacity="0.6" />
      <g filter="url(#soft-blur)" fill="#e8a070" opacity="0.4">
        <ellipse cx="220" cy="190" rx="220" ry="12" />
        <ellipse cx="900" cy="170" rx="260" ry="10" />
        <ellipse cx="1500" cy="205" rx="300" ry="13" />
        <ellipse cx="-500" cy="180" rx="280" ry="11" />
        <ellipse cx="2200" cy="185" rx="260" ry="12" />
      </g>

      {/* Ash mountains, far to near */}
      <path d={range(3, 262, 90, 150, 340)} fill="#7a5e5a" opacity="0.75" />
      <path d={range(9, 286, 70, 110, 340)} fill="#5c4744" />
      <path d={hills(4, 305, 22, 220, 360)} fill="#4a3a30" stroke={INK} strokeWidth="2" />
      <path
        d={[
          deadTree(-140, 298, 70, 1),
          deadTree(30, 300, 54, 2),
          deadTree(1300, 296, 64, 3),
          deadTree(1520, 300, 50, 4),
          deadTree(-520, 300, 60, 5),
          deadTree(1900, 298, 72, 6),
        ].join(" ")}
        fill="none"
        stroke="#2a201c"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Ground, firelit clearing and the road out of camp */}
      <rect
        x={X0}
        y="300"
        width={X1 - X0}
        height={Math.max(540, h - 300)}
        fill="url(#camp-ground)"
      />
      <ellipse cx={HEARTH_X} cy="540" rx="700" ry="290" fill="url(#camp-clearing)" />
      <path
        d="M2640 400 L1440 470 C1330 500 1260 560 1250 620 C1240 700 1300 780 1320 836 L1360 1400 L2640 1400 Z"
        fill="url(#camp-road)"
        opacity="0.85"
      />
      <L
        d="M2640 400 L1440 470 C1330 500 1260 560 1250 620 C1240 700 1300 780 1320 836 L1360 1400"
        w={2.5}
        op={0.6}
      />
      <L
        d="M1460 520 l14 -2 M1330 640 l10 2 M1350 760 l12 1 M1600 500 l16 -2"
        color="#4a3a28"
        w={2}
        op={0.7}
      />
      <L d={bits.tufts} color="#2e3a22" w={2} op={0.85} />
      {bits.stones.map((s, i) => (
        <ellipse
          key={i}
          cx={f(s.x)}
          cy={f(s.y)}
          rx={f(s.rx)}
          ry={f(s.rx * 0.55)}
          fill="#6a5a48"
          stroke={INK}
          strokeWidth="1.5"
        />
      ))}

      {/* Tents behind the fire, with a string of lanterns */}
      <Tent x={540} y={302} w={150} h={88} fill="#c9a979" flag="#a8401a" />
      <Tent x={720} y={292} w={124} h={64} fill="#a8401a" flag="#e8c07a" />
      <Tent x={876} y={300} w={156} h={92} fill="#b89768" flag="#2d5bd0" />
      <L d="M540 214 Q630 250 720 228 Q800 252 876 208" w={1.4} op={0.8} />
      {[
        [585, 233],
        [630, 240],
        [675, 236],
        [765, 239],
        [810, 236],
        [845, 224],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={(y ?? 0) + 6} r="11" fill="url(#ember-glow)" />
          <S d={circ(x ?? 0, (y ?? 0) + 6, 3.6)} fill="#ffd27a" w={1.2} flat />
        </g>
      ))}

      {/* Thoric's forge wagon and anvil */}
      <Wagon x={96} y={470} w={190} cover="#d9c6a0" wood="#7a4a28" tongue={-1} />
      <Barrel x={60} y={480} />
      <g>
        <S d="M270 520 L272 488 L312 488 L314 520 Z" fill="#6a4a2c" w={2.2} />
        <ellipse cx="292" cy="488" rx="20" ry="5" fill="#8a6a44" stroke={INK} strokeWidth="2" />
        <S
          d="M262 470 L322 470 L330 462 L340 466 L322 476 L310 476 L306 486 L278 486 L274 476 L262 476 Z"
          fill="#4a4a52"
          w={2.2}
        />
        <L d="M266 471 L320 471" color="#c9c2b8" w={1.4} />
        <circle cx="292" cy="466" r="10" fill="url(#ember-glow)" />
        <path
          d="M284 468 C284 458 300 458 300 468"
          fill="none"
          stroke="#ff8a3a"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/* Marisha's stall */}
      <g>
        <L d="M362 438 L362 360 M474 438 L474 360" w={3} color="#5e3a20" />
        <S d="M346 372 L490 372 L476 346 L360 346 Z" fill="#e6d6b4" w={2.2} />
        <path
          d="M374 346 L370 372 L392 372 L396 346 Z M420 346 L418 372 L440 372 L440 346 Z M462 346 L464 372 L486 372 L476 346 Z"
          fill="#a8401a"
          opacity="0.9"
        />
        <S d="M356 402 L480 402 L480 438 L356 438 Z" fill="#8a5a32" w={2.2} />
        <L d="M358 414 L478 414" op={0.45} />
        <S d={circ(382, 396, 6)} fill="#ffd84a" w={1.5} />
        <S d={circ(392, 398, 4.5)} fill="#ffd84a" w={1.5} />
        <S d="M410 400 L410 386 L414 382 L420 382 L424 386 L424 400 Z" fill="#5b8cff" w={1.6} />
        <S d="M444 400 L438 392 L446 384 L454 392 Z" fill="#b36bff" w={1.6} />
        <S d="M460 400 L460 388 L472 388 L472 400 Z" fill="#c9a063" w={1.6} />
      </g>

      {/* Supply Wagon with its crates and barrels */}
      <Wagon x={996} y={412} w={180} cover="#e6d6b4" wood="#8a5a32" tongue={1} />
      <Crate x={1036} y={348} s={30} />
      <Crate x={1070} y={348} s={24} fill="#8a6038" />
      <Crate x={1188} y={432} s={34} />
      <Crate x={1196} y={398} s={26} fill="#8a6038" />
      <Barrel x={1246} y={436} />

      {/* Firewood near the Hearthfire */}
      <g>
        <S d="M566 628 L626 620 L628 630 L568 638 Z" fill="#7a4a28" w={1.8} />
        <S d="M572 618 L630 614 L631 623 L573 628 Z" fill="#8a5a32" w={1.8} />
        <S d={circ(568, 633, 5)} fill="#c9a063" w={1.4} />
        <S d={circ(573, 623, 5)} fill="#c9a063" w={1.4} />
      </g>

      {/* Signpost to the Act */}
      <g>
        <S d="M1296 560 L1306 560 L1306 676 L1296 676 Z" fill="#7a5a24" w={2.2} />
        <S d="M1220 574 L1370 574 L1392 596 L1370 618 L1220 618 Z" fill="#e6d6b4" w={2.5} />
        <text
          x="1300"
          y="602"
          textAnchor="middle"
          fill={INK}
          className="title-font"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {props.roadName}
        </text>
      </g>

      <rect x={X0} y="0" width={X1 - X0} height={h} fill="url(#camp-vignette)" />
      <rect x={X0} y="0" width={X1 - X0} height={h} filter="url(#paint-grain)" opacity="0.8" />
    </svg>
  );
}

const SPARKS = [
  { x: 702, d: 0, dx: -18 },
  { x: 716, d: 0.7, dx: 10 },
  { x: 730, d: 1.4, dx: -6 },
  { x: 742, d: 0.35, dx: 22 },
  { x: 724, d: 1.9, dx: -14 },
  { x: 710, d: 2.3, dx: 16 },
];

/** The moving part of the camp: the Hearthfire with its glow and sparks, and drifting ash. */
export function CampFx(props: { w: number; h: number; ox: number }) {
  const { w, h, ox } = props;
  const ash = rand(21);
  const stones = Array.from({ length: 13 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2 + 0.2;
    return { x: HEARTH_X + Math.cos(a) * 76, y: 618 + Math.sin(a) * 12, r: 7 + (i % 3) * 1.5 };
  });
  return (
    <svg className="camp-fx" width={w} height={h} viewBox={`${-ox} 0 ${w} ${h}`} aria-hidden="true">
      <ellipse
        className="hearth-glow"
        cx={HEARTH_X}
        cy="540"
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

      {/* Back half of the stone ring, the tripod, the iron bowl, then the fire. */}
      {stones
        .filter((s) => s.y < 618)
        .map((s, i) => (
          <S key={i} d={circ(s.x, s.y, s.r * 0.8)} fill="#6a5a50" w={1.8} />
        ))}
      <L d="M686 612 L702 566 M754 612 L738 566 M720 616 L720 570" color="#2a2622" w={6} />
      <L d="M686 612 L702 566 M754 612 L738 566 M720 616 L720 570" color="#5a5a62" w={3} />
      <g className="flames">
        <path
          className="flame f1"
          d="M668 548 C658 520 676 500 682 478 C686 492 694 496 697 488 C694 466 706 450 712 424 C718 444 726 452 730 446 C738 432 736 416 732 402 C752 424 760 452 754 476 C762 470 766 460 766 450 C780 474 778 516 772 548 Z"
          fill="#ff6a2b"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          className="flame f2"
          d="M686 548 C682 526 694 512 700 496 C704 506 710 508 712 500 C712 486 718 474 724 460 C732 480 740 490 738 506 C746 500 750 494 750 486 C758 506 758 530 754 548 Z"
          fill="#ffb13b"
        />
        <path
          className="flame f3"
          d="M704 548 C700 534 708 522 714 510 C718 520 722 522 724 514 C732 526 736 538 732 548 Z"
          fill="#fff0c0"
        />
      </g>
      <S d="M650 546 Q720 612 790 546 Z" fill="#4a4a52" w={2.5} />
      <ellipse
        cx={HEARTH_X}
        cy="547"
        rx="70"
        ry="7"
        fill="#ff8a3a"
        stroke={INK}
        strokeWidth="2.5"
      />
      <L d="M656 556 Q720 600 784 556" color="#8a8a92" w={1.6} op={0.7} />
      {[668, 694, 746, 772].map((x) => (
        <circle key={x} cx={x} cy={x < 700 || x > 740 ? 562 : 574} r="2.2" fill="#2a2622" />
      ))}
      {stones
        .filter((s) => s.y >= 618)
        .map((s, i) => (
          <S key={i} d={circ(s.x, s.y, s.r)} fill="#7a6a5c" w={1.8} />
        ))}
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
    </svg>
  );
}
