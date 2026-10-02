import { INK } from "./paint";

/**
 * Ground structure for the camp: dirt texture, the flagstone ring around the Hearthfire, a
 * palisade behind the camp and dark foreground shapes for depth. All deterministic.
 */

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const f = (n: number) => n.toFixed(1);

/** Speckles and pebbles, tiled over the ground. */
export function DirtPattern() {
  const r = rand(17);
  const specks = Array.from({ length: 26 }, () => ({
    x: r() * 90,
    y: r() * 56,
    rx: 0.8 + r() * 2.6,
    dark: r() < 0.6,
  }));
  return (
    <pattern id="camp-dirt" width="90" height="56" patternUnits="userSpaceOnUse">
      {specks.map((s, i) => (
        <ellipse
          key={i}
          cx={f(s.x)}
          cy={f(s.y)}
          rx={f(s.rx)}
          ry={f(s.rx * 0.6)}
          fill={s.dark ? "#1e150e" : "#d8b888"}
          opacity={s.dark ? 0.35 : 0.18}
        />
      ))}
      <path
        d="M8 40 q10 -3 18 1 M52 14 q8 2 14 -2"
        stroke="#1e150e"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />
    </pattern>
  );
}

const STONES = ["#584c40", "#4f443a", "#5f5245", "#4a4036", "#554a3f"];

/** Irregular flagstones in rings around the Hearthfire, seen at an angle. */
export function HearthPlaza(props: { cx: number; cy: number }) {
  const { cx, cy } = props;
  const r = rand(31);
  const tilt = 0.32;
  const rings: [number, number][] = [
    [124, 9],
    [180, 13],
    [238, 17],
  ];
  const stones: { d: string; fill: string }[] = [];
  let inner = 74;
  for (const [outer, n] of rings) {
    const off = r() * Math.PI;
    for (let i = 0; i < n; i++) {
      // The outer rings fray: some stones are missing.
      if (outer > 170 && r() < (outer - 150) / 260) continue;
      const a0 = off + (i / n) * Math.PI * 2 + 0.025;
      const a1 = off + ((i + 1) / n) * Math.PI * 2 - 0.025;
      const am = (a0 + a1) / 2;
      const pt = (rad: number, a: number) => {
        const j = rad * (1 + (r() - 0.5) * 0.06);
        return `${f(cx + Math.cos(a) * j)} ${f(cy + Math.sin(a) * j * tilt)}`;
      };
      const ri = inner + 5;
      const ro = outer - 5;
      stones.push({
        d: `M${pt(ri, a0)} L${pt(ro, a0)} L${pt(ro + 4, am)} L${pt(ro, a1)} L${pt(ri, a1)} L${pt(ri - 2, am)} Z`,
        fill: STONES[Math.floor(r() * STONES.length)] ?? "#6f6253",
      });
    }
    inner = outer;
  }
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="250" ry={250 * tilt} fill="#2a2018" opacity="0.35" />
      {stones.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.fill}
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ))}
      {stones.map((s, i) => (
        <path key={`h${i}`} d={s.d} fill="url(#shade-tb)" />
      ))}
    </g>
  );
}

/** A palisade of pointed stakes from x0 to x1, standing on y. */
export function Palisade(props: { x0: number; x1: number; y: number }) {
  const { x0, x1, y } = props;
  const r = rand(x0 + 5000);
  let posts = "";
  for (let x = x0; x < x1; x += 15) {
    const h = 34 + r() * 10;
    posts += ` M${x} ${y} L${x} ${f(y - h)} L${x + 6} ${f(y - h - 9)} L${x + 12} ${f(y - h)} L${x + 12} ${y} Z`;
  }
  return (
    <g>
      <path d={posts} fill="#4e3a2a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d={`M${x0 - 4} ${y - 14} L${x1 + 4} ${y - 14} L${x1 + 4} ${y - 8} L${x0 - 4} ${y - 8} Z`}
        fill="#3b2a1e"
        stroke={INK}
        strokeWidth="1.6"
      />
    </g>
  );
}

/** Dark bushes and rocks at the bottom edge, so the camp gets a near and a far. */
export function Foreground(props: { x0: number; x1: number; h: number }) {
  const r = rand(77);
  const { h } = props;
  let d = "";
  for (let x = props.x0; x < props.x1; x += 180 + r() * 220) {
    const w = 60 + r() * 90;
    const top = h - 10 - r() * 26;
    d += ` M${f(x)} ${h + 4} C${f(x)} ${f(top + 20)} ${f(x + w * 0.2)} ${f(top)} ${f(x + w * 0.45)} ${f(top + 6)} C${f(x + w * 0.6)} ${f(top - 10)} ${f(x + w)} ${f(top + 10)} ${f(x + w)} ${h + 4} Z`;
  }
  return <path d={d} fill="#140e0a" stroke="#0a0705" strokeWidth="2" opacity="0.92" />;
}
