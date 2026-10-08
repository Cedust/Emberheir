import { Container, FillGradient, Graphics } from "pixi.js";

/**
 * The painted weapons of Weapon Mastery and the arena: every class weapon drawn in code, lying
 * along the x axis from its pommel (x = 0) to its tip (x = length). Layered gradients, rim light
 * and engraving lines give a painted look; the scene rotates, lights and animates them.
 *
 * The build shows on the weapon (Timo, 2026-10-08): the grade changes the metal from pitted iron
 * to radiant white gold, every learned path rank carves a glowing rune in the path's colour, and
 * the Keystone changes the weapon's shape (a parrying hook, a serrated edge, a second blade).
 */

export interface WeaponLook {
  /** Weapon grade index 0..4 (Crude, Honed, Tempered, Ascendant, Exalted). */
  readonly grade: number;
  /** Colour of the weapon's element (crystal, orb, tip light). */
  readonly accent: number;
  /** Learned ranks per path, in the tree's path order, with the path's colour. */
  readonly runes: readonly { readonly color: number; readonly ranks: number }[];
  /** The chosen Keystone's id, if any. */
  readonly keystone: string | null;
}

export const PLAIN_LOOK: WeaponLook = { grade: 0, accent: 0xff6a2a, runes: [], keystone: null };

export interface WeaponArt {
  /** The painted weapon. */
  readonly body: Container;
  /** Outline of the cutting or striking parts, for the grade's edge glow. */
  readonly edge: Graphics;
  /** The runes' light (strokes in the path colours), for an additive glow layer. */
  readonly runeGlow: Graphics;
  /** The whole silhouette (for the cast shadow and the Echo's ghost). */
  readonly silhouette: () => Graphics;
  /** Distance of the weapon's centre line from the axis at `t` (0..1), for the Refine hotspots. */
  readonly anchorY: (t: number) => number;
}

type Stops = readonly string[];

interface Palette {
  /** Blades and edges. */
  readonly steel: Stops;
  /** Heads, flanges, fittings of iron. */
  readonly iron: Stops;
  /** Guards, collars, pommels. */
  readonly fit: Stops;
  readonly wood: Stops;
  readonly leather: Stops;
  readonly bone: Stops;
  /** Colour of the gems in the fittings. */
  readonly gem: number;
}

/** Crude → Exalted: pitted iron, honed steel, blued steel, gold, radiant white gold. */
const PALETTES: readonly Palette[] = [
  {
    steel: ["#231d18", "#6b5f52", "#9c8f7c", "#4d4238", "#1c1713"],
    iron: ["#151210", "#463d34", "#7a6e60", "#352d26", "#100d0b"],
    fit: ["#18191c", "#4a4e55", "#7d838c", "#34383e", "#121316"],
    wood: ["#2a1a0e", "#6e4a2a", "#a87a4a", "#5e3e22", "#22150a"],
    leather: ["#1c100a", "#4a2a18", "#7a4a2c", "#3e2414", "#140b06"],
    bone: ["#3a3226", "#9a8c6c", "#c8bc9c", "#7a6c4c", "#2e281e"],
    gem: 0x6a5a4a,
  },
  {
    steel: ["#2c3138", "#9aa3ae", "#eef2f6", "#7d8590", "#262a30"],
    iron: ["#18191c", "#5a6069", "#a3aab4", "#3e434b", "#121316"],
    fit: ["#2a180a", "#a8732e", "#f0c77a", "#8a5a22", "#2a180a"],
    wood: ["#1e1209", "#5a3a1e", "#9a6a3a", "#4e321a", "#1a1008"],
    leather: ["#1c100a", "#4a2a18", "#7a4a2c", "#3e2414", "#140b06"],
    bone: ["#3a3226", "#b8aa8a", "#efe4c8", "#9a8c6c", "#2e281e"],
    gem: 0xd0302a,
  },
  {
    steel: ["#1a222c", "#6a84a0", "#e6f0fa", "#56708a", "#141b24"],
    iron: ["#12161c", "#3e4c5c", "#8a9cb0", "#2e3a48", "#0e1218"],
    fit: ["#2a2e34", "#9aa2ac", "#f4f6f8", "#7a828c", "#24282e"],
    wood: ["#160d07", "#4a2c16", "#7a4e2a", "#3a2210", "#120a05"],
    leather: ["#140a0a", "#3e1e1e", "#6a3434", "#321616", "#0e0606"],
    bone: ["#3a3226", "#c4b898", "#f4ead2", "#a49676", "#2e281e"],
    gem: 0x4a8ae0,
  },
  {
    steel: ["#2e333a", "#b4bcc6", "#ffffff", "#98a0aa", "#262a30"],
    iron: ["#1a1b1e", "#6a707a", "#c0c6ce", "#4a4f57", "#141518"],
    fit: ["#3a2606", "#c8902a", "#ffe9a0", "#a8741c", "#3a2606"],
    wood: ["#120808", "#3a1a14", "#6a3226", "#2e1410", "#0e0606"],
    leather: ["#120808", "#4a1414", "#7a2a22", "#3a1010", "#0c0505"],
    bone: ["#3e3424", "#d4c49a", "#fff4d8", "#b4a47a", "#32281a"],
    gem: 0xffb02a,
  },
  {
    steel: ["#4a3e30", "#e9e1d2", "#ffffff", "#d6c6a4", "#3e3428"],
    iron: ["#2a2620", "#a89c86", "#f2ead8", "#8a7e68", "#221e18"],
    fit: ["#4a3608", "#e8c060", "#fffbe6", "#d0a040", "#4a3608"],
    wood: ["#2a2010", "#8a6a3a", "#d8b878", "#6e5228", "#20180c"],
    leather: ["#2a1a10", "#7a5a3a", "#c8a070", "#6a4a2a", "#20140a"],
    bone: ["#4a4030", "#e8dcc0", "#ffffff", "#c8bc9c", "#3e3424"],
    gem: 0xfff4d0,
  },
];

function grad(stops: Stops, vertical = true): FillGradient {
  return new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: vertical ? { x: 0, y: 1 } : { x: 1, y: 0 },
    colorStops: stops.map((color, i) => ({ offset: i / (stops.length - 1), color })),
    textureSpace: "local",
  });
}

const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

/** A gem: dark rim, coloured body, a bright facet. */
function gem(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.circle(x, y, r + 2).fill(0x140b06);
  g.circle(x, y, r).fill(
    new FillGradient({
      type: "radial",
      center: { x: 0.35, y: 0.3 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: "#ffffff" },
        { offset: 0.25, color: hex(color) },
        { offset: 1, color: "#140b06" },
      ],
      textureSpace: "local",
    }),
  );
}

/** Diagonal wrap lines over a grip from x0 to x1, half width w. */
function wrap(g: Graphics, x0: number, x1: number, w: number, color = 0x0e0805): void {
  for (let x = x0 + 4; x < x1 - 2; x += 9) {
    g.moveTo(x, -w)
      .lineTo(x + 7, w)
      .stroke({ color, width: 2.2, alpha: 0.75 });
  }
  g.moveTo(x0, -w + 2)
    .lineTo(x1, -w + 2)
    .stroke({ color: 0xffffff, width: 1.5, alpha: 0.12 });
}

/** Rim light along the upper edge of a polygon (points in order). */
function rim(g: Graphics, pts: readonly number[], alpha = 0.35): void {
  g.poly([...pts], false).stroke({ color: 0xfff3d6, width: 1.6, alpha });
}

/** A metal band around a shaft at x, half width w. */
function band(g: Graphics, stops: Stops, x: number, w: number, width = 10): void {
  g.roundRect(x - width / 2, -w - 2, width, w * 2 + 4, 2).fill(grad(stops));
}

/** Samples a closed tapering shape around a centre curve. */
function ribbon(
  length: number,
  steps: number,
  center: (t: number) => number,
  half: (t: number) => number,
): { upper: number[]; lower: number[]; poly: number[] } {
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * length;
    upper.push(x, center(t) - half(t));
    lower.push(x, center(t) + half(t));
  }
  const back: number[] = [];
  for (let i = lower.length - 2; i >= 0; i -= 2) back.push(lower[i] ?? 0, lower[i + 1] ?? 0);
  return { upper, lower, poly: [...upper, ...back] };
}

/** A circle or an arc as polygon points (for parts that need a silhouette). */
function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from = 0,
  to = Math.PI * 2,
  steps = 24,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return pts;
}

/** Teeth along a polyline, pointing to the side `out` (+1 = right of the direction). */
function teeth(line: readonly number[], every: number, size: number, out: 1 | -1): number[][] {
  const result: number[][] = [];
  for (let i = 0; i + every * 2 < line.length; i += every * 2) {
    const x0 = line[i] ?? 0;
    const y0 = line[i + 1] ?? 0;
    const x1 = line[i + every * 2] ?? 0;
    const y1 = line[i + every * 2 + 1] ?? 0;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / len) * out;
    const ny = ((x1 - x0) / len) * out;
    const mx = x0 + (x1 - x0) * 0.7;
    const my = y0 + (y1 - y0) * 0.7;
    result.push([x0, y0, mx + nx * size, my + ny * size, x1, y1]);
  }
  return result;
}

interface Part {
  readonly poly: readonly number[];
  readonly fill: FillGradient | number;
  /** Counts for the edge glow. */
  readonly edge?: boolean;
  readonly rim?: readonly number[];
  /** Light, not matter (a corona): no outline, no shadow. */
  readonly soft?: boolean;
}

/** Where a weapon carries its runes: three stretches along a centre line, one per path. */
interface RuneTrack {
  readonly spans: readonly (readonly [number, number])[];
  readonly y: (x: number) => number;
  /** Rune height. */
  readonly size: number;
}

/** Rune shapes in a unit box (x −0.5..0.5 across the axis, y −1..1 along it): stem and twigs. */
const GLYPHS: readonly (readonly number[])[] = [
  [0, -1, 0, 1, 0, -0.4, 0.5, -0.9, 0, 0.1, 0.5, -0.4],
  [0, -1, 0, 1, 0, -1, 0.5, -0.5, 0.5, -0.5, 0, 0],
  [0, -1, 0, 1, -0.5, -0.5, 0.5, 0.5],
  [-0.4, -1, -0.4, 1, 0.4, -1, 0.4, 1, -0.4, -0.2, 0.4, 0.2],
  [0, -1, 0, 1, 0, -0.2, 0.5, 0.4, 0, -0.2, -0.5, 0.4],
  [0, -1, 0, 1, -0.5, -0.8, 0, -0.3, 0.5, -0.8, 0, -0.3],
  [-0.5, -1, 0.5, 1, 0.5, -1, -0.5, 1],
  [0, -1, 0, 1, 0, -0.6, 0.5, -0.2, 0.5, -0.2, 0, 0.2, 0, 0.2, 0.5, 0.6],
];

/** Carves the runes: a dark groove in the paint, their light in `glow`. */
function carveRunes(paint: Graphics, glow: Graphics, track: RuneTrack, look: WeaponLook): void {
  look.runes.forEach((path, p) => {
    const span = track.spans[p];
    if (!span || path.ranks <= 0) return;
    const [x0, x1] = span;
    const step = Math.min(track.size * 1.5, (x1 - x0) / path.ranks);
    for (let k = 0; k < path.ranks; k++) {
      const x = x0 + step * (k + 0.5);
      const y = track.y(x);
      const glyph = GLYPHS[(p * 3 + k * 5) % GLYPHS.length] ?? [];
      const h = track.size / 2;
      for (let i = 0; i + 3 < glyph.length; i += 4) {
        // Runes stand across the axis: the glyph's y runs across the blade.
        const ax = x + (glyph[i] ?? 0) * h * 0.9;
        const ay = y + (glyph[i + 1] ?? 0) * h;
        const bx = x + (glyph[i + 2] ?? 0) * h * 0.9;
        const by = y + (glyph[i + 3] ?? 0) * h;
        paint.moveTo(ax, ay).lineTo(bx, by);
        glow.moveTo(ax, ay).lineTo(bx, by);
      }
      paint.stroke({ color: 0x0b0705, width: 3, alpha: 0.75, cap: "round" });
      paint.stroke({ color: path.color, width: 1.4, alpha: 0.95, cap: "round" });
      glow.stroke({ color: path.color, width: 4, alpha: 0.9, cap: "round" });
    }
  });
}

interface Build {
  readonly parts: readonly Part[];
  readonly details: (g: Graphics) => void;
  readonly anchorY: (t: number) => number;
  readonly track: RuneTrack;
  /** Extra light for the blurred, additive rune layer (a corona, a glowing crack). */
  readonly light?: (g: Graphics) => void;
}

function assemble(build: Build, look: WeaponLook): WeaponArt {
  const { parts } = build;
  const body = new Container();
  const paint = new Graphics();
  for (const p of parts) {
    paint.poly([...p.poly]).fill(p.fill);
    if (p.soft) continue;
    paint.poly([...p.poly]).stroke({ color: 0x0b0705, width: 2.5, alpha: 0.9 });
    if (p.rim) rim(paint, p.rim, look.grade >= 3 ? 0.55 : 0.35);
  }
  build.details(paint);
  const runeGlow = new Graphics();
  carveRunes(paint, runeGlow, build.track, look);
  build.light?.(runeGlow);
  body.addChild(paint);
  const edge = new Graphics();
  for (const p of parts) {
    if (p.edge) edge.poly([...p.poly]).stroke({ color: 0xffffff, width: 5, join: "round" });
  }
  const silhouette = () => {
    const s = new Graphics();
    for (const p of parts) if (!p.soft) s.poly([...p.poly]).fill(0xffffff);
    return s;
  };
  return { body, edge, runeGlow, silhouette, anchorY: build.anchorY };
}

/** Grade marks every weapon shares: rust on Crude iron, gilded filigree on Exalted. */
function gradeMarks(g: Graphics, look: WeaponLook, track: RuneTrack): void {
  const first = track.spans[0]?.[0] ?? 0;
  const last = track.spans[track.spans.length - 1]?.[1] ?? 0;
  if (look.grade === 0) {
    for (let i = 0; i < 9; i++) {
      const x = first + ((last - first) * ((i * 37) % 100)) / 100;
      const y = track.y(x) + (((i * 53) % 9) - 4) * 1.6;
      g.circle(x, y, 2 + (i % 3)).fill({ color: 0x7a3a1a, alpha: 0.55 });
    }
  } else if (look.grade === 4) {
    // Gold filigree vines along the rune track.
    g.moveTo(first, track.y(first));
    for (let x = first; x <= last; x += 6) {
      g.lineTo(x, track.y(x) + Math.sin(x / 9) * track.size * 0.75);
    }
    g.stroke({ color: 0xffe08a, width: 1.2, alpha: 0.7 });
  }
}

// --- the weapons -----------------------------------------------------------------------------

function sword(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const top = (x: number) => -(22 - (5 * (x - L * 0.23)) / (L * 0.63));
  const blade = [L * 0.23, -22, L * 0.86, -17, L, 0, L * 0.86, 17, L * 0.23, 22];
  const behind: Part[] = [];
  const front: Part[] = [];
  if (ks === "deep-cuts") {
    // Saw teeth along the back of the blade.
    const line: number[] = [];
    for (let x = L * 0.32; x <= L * 0.82; x += 11) line.push(x, top(x) + 2);
    for (const t of teeth(line, 2, 15, -1))
      behind.push({ poly: t, fill: grad(P.steel), edge: true });
  } else if (ks === "flowing-blade") {
    // A flamberge: the edges ripple like a flame.
    const r = ribbon(
      L * 0.74,
      48,
      () => 0,
      (t) => 23 - t * 7 + Math.abs(Math.sin(t * Math.PI * 7)) * 9 * (1 - t),
    );
    behind.push({
      poly: r.poly.map((v, i) => (i % 2 === 0 ? v + L * 0.24 : v)),
      fill: grad(P.steel),
      edge: true,
    });
  } else if (ks === "final-verdict") {
    // The headsman's blade: broad and heavy towards the end.
    behind.push({
      poly: [L * 0.5, -18, L * 0.9, -36, L * 1.0, -26, L * 1.0, 26, L * 0.9, 36, L * 0.5, 18],
      fill: grad(P.steel),
      edge: true,
      rim: [L * 0.5, -18, L * 0.9, -36, L, -26],
    });
    front.push({ poly: [6, -10, -44, 0, 6, 10], fill: grad(P.iron), edge: true });
  } else if (ks === "perfect-parry") {
    // Parrying hooks that catch a blade.
    for (const s of [-1, 1]) {
      front.push({
        poly: [
          L * 0.205,
          s * 66,
          L * 0.25,
          s * 98,
          L * 0.33,
          s * 104,
          L * 0.37,
          s * 84,
          L * 0.33,
          s * 92,
          L * 0.27,
          s * 86,
          L * 0.235,
          s * 62,
        ],
        fill: grad(P.fit, false),
        edge: true,
      });
    }
  }
  return {
    parts: [
      { poly: [34, -11, L * 0.2, -11, L * 0.2, 11, 34, 11], fill: grad(P.leather) },
      ...behind,
      { poly: blade, fill: grad(P.steel), edge: true, rim: [L * 0.23, -22, L * 0.86, -17, L, 0] },
      {
        poly: [
          L * 0.2,
          -14,
          L * 0.215,
          -62,
          L * 0.2,
          -74,
          L * 0.24,
          -70,
          L * 0.235,
          -16,
          L * 0.235,
          16,
          L * 0.24,
          70,
          L * 0.2,
          74,
          L * 0.215,
          62,
          L * 0.2,
          14,
        ],
        fill: grad(P.fit, false),
        rim: [L * 0.2, -74, L * 0.24, -70],
      },
      ...front,
    ],
    details: (g) => {
      wrap(g, 34, L * 0.2, 11);
      // Fuller and the light along the blade.
      g.roundRect(L * 0.26, -5, L * 0.56, 10, 5).fill({ color: 0x1a1d22, alpha: 0.55 });
      g.moveTo(L * 0.25, -13)
        .lineTo(L * 0.84, -10)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.4 });
      g.circle(20, 0, 20).fill(grad(P.fit));
      g.circle(20, 0, 20).stroke({ color: 0x0b0705, width: 2.5 });
      gem(g, 20, 0, 8, P.gem);
      gem(g, L * 0.218, 0, 7, P.gem);
    },
    anchorY: () => 0,
    track: {
      spans: [
        [L * 0.27, L * 0.45],
        [L * 0.46, L * 0.64],
        [L * 0.65, L * 0.82],
      ],
      y: () => 0,
      size: 9,
    },
  };
}

/** Venom drops on Toxic Bloom: where along the weapon, and how far they hang. */
const TOXIC_DROPS = [
  [0.56, 14],
  [0.68, 22],
  [0.79, 12],
] as const;

/** A drop hanging from (x, y), `len` long. */
function drop(g: Graphics, x: number, y: number, len: number): void {
  const r = 4.5;
  g.moveTo(x - 1.5, y - 1)
    .bezierCurveTo(x - 1.5, y + len * 0.5, x - r, y + len - r, x - r, y + len)
    .arc(x, y + len, r, Math.PI, 0, true)
    .bezierCurveTo(x + r, y + len - r, x + 1.5, y + len * 0.5, x + 1.5, y - 1)
    .closePath()
    .fill(0x6ad04a);
  g.circle(x - 1.2, y + len - 0.8, 1.2).fill({ color: 0xeaffd8, alpha: 0.9 });
}

function dagger(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  // Leaf blade, a little curved.
  const r = ribbon(
    L * 0.62,
    24,
    (t) => -Math.sin(t * Math.PI) * 10,
    (t) => (t < 0.35 ? 22 + t * 60 : 43 * Math.pow(Math.max(0, 1 - t) / 0.65, 0.8)),
  );
  const shift = (pts: readonly number[], dx: number, dy = 0) =>
    pts.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
  const blade = shift(r.poly, L * 0.38);
  const upper = shift(r.upper, L * 0.38);
  const lower = shift(r.lower, L * 0.38);
  const centerY = (x: number) => {
    const t = (x - L * 0.38) / (L * 0.62);
    return t > 0 ? -Math.sin(t * Math.PI) * 10 : 0;
  };
  const lowerAt = (x: number) => {
    for (let i = 0; i + 3 < lower.length; i += 2) {
      const x0 = lower[i] ?? 0;
      const x1 = lower[i + 2] ?? 0;
      if (x >= x0 && x <= x1)
        return (
          (lower[i + 1] ?? 0) +
          (((lower[i + 3] ?? 0) - (lower[i + 1] ?? 0)) * (x - x0)) / (x1 - x0 || 1)
        );
    }
    return 0;
  };
  const behind: Part[] = [];
  const front: Part[] = [];
  if (ks === "thousand-cuts") {
    for (const t of teeth(upper.slice(4, -4), 1, 9, -1))
      behind.push({ poly: t, fill: grad(P.steel), edge: true });
    for (const t of teeth(lower.slice(4, -4), 1, 9, 1))
      behind.push({ poly: t, fill: grad(P.steel), edge: true });
  } else if (ks === "assassinate") {
    behind.push({ poly: [L * 0.9, -6, L * 1.16, 0, L * 0.9, 6], fill: grad(P.steel), edge: true });
  } else if (ks === "shadowstep") {
    // Afterimages of the blade, a step behind, fading into smoke toward the hilt.
    for (const [k, a] of [
      [2, "66"],
      [1, "aa"],
    ] as const) {
      behind.push({
        poly: shift(blade, -L * 0.06 * k, -40 * k),
        fill: new FillGradient({
          type: "linear",
          start: { x: 0, y: 0 },
          end: { x: 1, y: 0 },
          colorStops: [
            { offset: 0, color: "#2a1f4000" },
            { offset: 0.5, color: `#3a2a5a${a}` },
            { offset: 1, color: `#6a58a0${a}` },
          ],
          textureSpace: "local",
        }),
        soft: true,
      });
    }
  }
  return {
    parts: [
      { poly: [30, -13, L * 0.33, -11, L * 0.33, 11, 30, 13], fill: grad(P.bone) },
      ...behind,
      { poly: blade, fill: grad(P.steel), edge: true, rim: upper },
      {
        poly: [
          L * 0.33,
          -16,
          L * 0.31,
          -50,
          L * 0.36,
          -58,
          L * 0.38,
          -18,
          L * 0.38,
          18,
          L * 0.42,
          52,
          L * 0.37,
          50,
          L * 0.33,
          16,
        ],
        fill: grad(P.fit, false),
      },
      ...front,
    ],
    details: (g) => {
      for (let x = 40; x < L * 0.32; x += 16) {
        g.moveTo(x, -12).lineTo(x, 12).stroke({ color: 0x2e281e, width: 2, alpha: 0.6 });
      }
      g.moveTo(L * 0.4, -4).bezierCurveTo(L * 0.55, -14, L * 0.75, -12, L * 0.92, -6);
      g.stroke({ color: 0xffffff, width: 2, alpha: 0.35 });
      g.circle(18, 0, 17).fill(grad(P.fit));
      g.circle(18, 0, 17).stroke({ color: 0x0b0705, width: 2.5 });
      gem(g, 18, 0, 7, ks === "toxic-bloom" ? 0x6ad04a : P.gem);
      if (ks === "toxic-bloom") {
        // A venom channel down the blade, and drops gathering on its lower edge.
        g.moveTo(L * 0.4, 2).bezierCurveTo(L * 0.55, -6, L * 0.75, -6, L * 0.9, -3);
        g.stroke({ color: 0x1c3a12, width: 6, alpha: 0.9, cap: "round" });
        g.moveTo(L * 0.4, 2).bezierCurveTo(L * 0.55, -6, L * 0.75, -6, L * 0.9, -3);
        g.stroke({ color: 0x8af06a, width: 2.5, alpha: 0.95, cap: "round" });
        for (const [t, len] of TOXIC_DROPS) drop(g, L * t, lowerAt(L * t), len);
      }
    },
    ...(ks === "toxic-bloom"
      ? {
          light: (g: Graphics) => {
            g.moveTo(L * 0.4, 2).bezierCurveTo(L * 0.55, -6, L * 0.75, -6, L * 0.9, -3);
            g.stroke({ color: 0x6ad04a, width: 8, alpha: 0.8, cap: "round" });
            for (const [t, len] of TOXIC_DROPS)
              g.circle(L * t, lowerAt(L * t) + len, 5).fill({ color: 0x8af06a, alpha: 0.8 });
          },
        }
      : {}),
    anchorY: (t) => (t > 0.38 ? -Math.sin(((t - 0.38) / 0.62) * Math.PI) * 10 : 0),
    track: {
      spans: [
        [L * 0.44, L * 0.58],
        [L * 0.59, L * 0.73],
        [L * 0.74, L * 0.88],
      ],
      y: centerY,
      size: 10,
    },
  };
}

function mace(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const hx = L * 0.8;
  const behind: Part[] = [];
  const front: Part[] = [];
  const flanges: Part[] = [];
  for (const side of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      const x = hx + k * 34;
      flanges.push({
        poly: [x - 20, side * 30, x - 8, side * 82, x + 14, side * 86, x + 18, side * 30],
        fill: grad(P.iron),
        edge: true,
      });
    }
  }
  if (ks === "earthshaker") {
    for (const side of [-1, 1]) {
      for (const k of [-1, 0, 1]) {
        const x = hx + k * 34;
        behind.push({
          poly: [x - 8, side * 80, x + 4, side * 128, x + 14, side * 80],
          fill: grad(P.steel),
          edge: true,
        });
      }
    }
  } else if (ks === "anvil") {
    front.push({
      poly: [hx + 30, -66, L + 26, -60, L + 34, -48, L + 34, 48, L + 26, 60, hx + 30, 66],
      fill: grad(P.iron),
      edge: true,
      rim: [hx + 30, -66, L + 26, -60, L + 34, -48],
    });
  } else if (ks === "siege") {
    front.push({ poly: [L - 14, -16, L + 104, 0, L - 14, 16], fill: grad(P.steel), edge: true });
    front.push({ poly: [6, -10, -56, 0, 6, 10], fill: grad(P.steel), edge: true });
  } else if (ks === "bastion") {
    front.push({ poly: arc(L * 0.3, 0, 16, 66), fill: grad(P.fit, false), edge: true });
  }
  return {
    parts: [
      { poly: [0, -12, hx, -12, hx, 12, 0, 12], fill: grad(P.wood) },
      ...behind,
      ...flanges,
      {
        poly: [
          hx - 70,
          -38,
          hx + 60,
          -40,
          hx + 80,
          -16,
          L,
          0,
          hx + 80,
          16,
          hx + 60,
          40,
          hx - 70,
          38,
        ],
        fill: grad(P.iron),
        edge: true,
        rim: [hx - 70, -38, hx + 60, -40, hx + 80, -16, L, 0],
      },
      ...front,
    ],
    details: (g) => {
      g.roundRect(28, -14, L * 0.22, 28, 4).fill(grad(P.leather));
      wrap(g, 28, 28 + L * 0.22, 14);
      band(g, P.fit, 28 + L * 0.22, 13, 12);
      band(g, P.fit, L * 0.5, 12, 10);
      band(g, P.fit, hx - 76, 16, 14);
      for (const k of [-1, 0, 1]) gem(g, hx + k * 36, 0, 7, P.gem);
      g.circle(14, 0, 18).fill(grad(P.fit));
      g.circle(14, 0, 18).stroke({ color: 0x0b0705, width: 2.5 });
      if (ks === "bastion") {
        for (const y of [-44, 0, 44]) g.circle(L * 0.3, y, 4).fill(grad(P.iron));
      }
    },
    anchorY: () => 0,
    track: {
      spans: [
        [L * 0.31, L * 0.43],
        [L * 0.53, L * 0.63],
        [L * 0.64, L * 0.74],
      ],
      y: () => 0,
      size: 8,
    },
  };
}

/** Points of a quadratic curve from a over control c to b (without a). */
function quad(
  a: readonly number[],
  c: readonly number[],
  b: readonly number[],
  steps = 10,
): number[] {
  const pts: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push(
      u * u * (a[0] ?? 0) + 2 * u * t * (c[0] ?? 0) + t * t * (b[0] ?? 0),
      u * u * (a[1] ?? 0) + 2 * u * t * (c[1] ?? 0) + t * t * (b[1] ?? 0),
    );
  }
  return pts;
}

/**
 * A crescent axe bit on side s (+1 below the haft, −1 above): it flares from the eye with
 * hollow cheeks into a wide, curved edge, like a forged double axe.
 */
function crescentBit(hx: number, s: 1 | -1, reach: number, half: number): number[] {
  const eye = [hx + 24, s * 14];
  const tipBack = [hx - half, s * reach * 0.86];
  const tipFront = [hx + half, s * reach * 0.86];
  return [
    hx - 24,
    s * 14,
    ...quad([hx - 24, s * 14], [hx - 10, s * reach * 0.55], tipBack),
    ...quad(tipBack, [hx, s * reach * 1.18], tipFront, 16),
    ...quad(tipFront, [hx + 10, s * reach * 0.55], eye),
  ];
}

function axe(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const hx = L * 0.78;
  const standard = [
    hx - 30,
    10,
    hx + 34,
    10,
    hx + 62,
    40,
    hx + 96,
    132,
    hx + 40,
    150,
    hx - 20,
    136,
    hx - 6,
    70,
  ];
  // Gore: a bearded axe, the lower blade hooks back along the haft to catch and tear.
  const bearded = [
    hx - 30,
    10,
    hx + 34,
    10,
    ...quad([hx + 34, 10], [hx + 70, 40], [hx + 84, 120]),
    ...quad([hx + 84, 120], [hx + 70, 168], [hx - 10, 184]),
    hx - 64,
    186,
    hx - 52,
    170,
    ...quad([hx - 52, 170], [hx - 16, 150], [hx - 12, 80]),
  ];
  const scale = (pts: readonly number[], f: number, cx: number, cy: number) =>
    pts.map((v, i) => (i % 2 === 0 ? cx + (v - cx) * f : cy + (v - cy) * f));
  // Executioner: one broad headsman's blade instead of the normal bit.
  const blade =
    ks === "gore" ? bearded : ks === "executioner" ? scale(standard, 1.4, hx, 10) : standard;
  const double = ks === "rampage";
  const behind: Part[] = [];
  const front: Part[] = [];
  if (ks === "bloodbath") {
    const edgeLine = [hx + 62, 40, hx + 74, 72, hx + 85, 102, hx + 96, 132];
    for (const t of teeth(edgeLine, 1, 14, -1))
      behind.push({ poly: t, fill: grad(P.steel), edge: true });
  }
  const bits: Part[] = double
    ? [1, -1].map((side) => ({
        poly: crescentBit(hx, side as 1 | -1, 150, 66),
        fill: grad(P.steel),
        edge: true,
      }))
    : [{ poly: blade, fill: grad(P.steel), edge: true }];
  return {
    parts: [
      {
        poly: double
          ? [0, -12, hx + 36, -11, hx + 36, 11, 0, 12]
          : [0, -12, L * 0.93, -10, L * 0.93, 10, 0, 12],
        fill: grad(P.wood),
      },
      ...behind,
      ...bits,
      {
        poly: [hx - 36, -18, hx + 38, -18, hx + 34, 22, hx - 32, 22],
        fill: grad(P.iron),
        rim: [hx - 36, -18, hx + 38, -18],
      },
      ...(double || ks === "gore"
        ? []
        : [
            {
              poly: [hx - 16, -18, hx - 4, -72, hx + 10, -78, hx + 18, -18],
              fill: grad(P.iron),
              edge: true,
            },
          ]),
      ...(double
        ? []
        : [{ poly: [L * 0.93, -10, L, 0, L * 0.93, 10], fill: grad(P.steel), edge: true }]),
      ...front,
    ],
    details: (g) => {
      g.roundRect(26, -14, L * 0.22, 28, 4).fill(grad(P.leather));
      wrap(g, 26, 26 + L * 0.22, 14);
      // Grain of the haft, the bevel of the blade.
      g.moveTo(L * 0.3, -3).bezierCurveTo(L * 0.45, -6, L * 0.6, 2, hx - 40, -2);
      g.stroke({ color: 0x1a1008, width: 1.5, alpha: 0.6 });
      if (double) {
        // Bright bevels along both curved edges, dark forge skin on the cheeks.
        for (const side of [1, -1]) {
          g.moveTo(hx - 58, side * 122)
            .quadraticCurveTo(hx, side * 168, hx + 58, side * 122)
            .stroke({ color: 0xffffff, width: 3, alpha: 0.5 });
          g.moveTo(hx - 20, side * 30)
            .quadraticCurveTo(hx, side * 80, hx + 20, side * 30)
            .stroke({ color: 0x1a1d22, width: 2, alpha: 0.4 });
        }
      } else if (ks === "gore") {
        g.moveTo(hx + 70, 50)
          .quadraticCurveTo(hx + 82, 120, hx + 60, 160)
          .stroke({ color: 0xffffff, width: 3, alpha: 0.45 });
        g.moveTo(hx - 4, 60)
          .quadraticCurveTo(hx - 6, 130, hx - 44, 168)
          .stroke({ color: 0x1a1d22, width: 2, alpha: 0.5 });
      } else {
        g.moveTo(hx + 54, 44)
          .lineTo(hx + 84, 128)
          .stroke({ color: 0xffffff, width: 3, alpha: 0.45 });
        g.moveTo(hx - 10, 76).bezierCurveTo(hx + 10, 100, hx + 40, 110, hx + 70, 120);
        g.stroke({ color: 0x1a1d22, width: 2, alpha: 0.5 });
      }
      band(g, P.fit, 26 + L * 0.22, 13, 12);
      g.circle(hx, 2, 7).fill(grad(P.fit));
    },
    anchorY: () => 0,
    track: {
      spans: [
        [L * 0.3, L * 0.43],
        [L * 0.44, L * 0.57],
        [L * 0.58, L * 0.71],
      ],
      y: () => 0,
      size: 8,
    },
  };
}

function bow(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const bulge = 70;
  const center = (t: number) => bulge * (1 - 4 * t * (1 - t)) - bulge * 0.5;
  const r = ribbon(L, 40, center, (t) => 5 + 9 * (1 - Math.abs(2 * t - 1)));
  const tip = center(0);
  const gy = center(0.5);
  const behind: Part[] = [];
  const front: Part[] = [];
  if (ks === "patient-draw") {
    // Recurve tips that curl forward.
    for (const s of [1, -1]) {
      const x0 = s === 1 ? 0 : L;
      const m = (pts: number[]) => pts.map((v, i) => (i % 2 === 0 ? x0 + s * v : v));
      front.push({
        poly: m([
          2,
          tip - 6,
          -22,
          tip - 24,
          -30,
          tip - 50,
          -20,
          tip - 46,
          -12,
          tip - 26,
          8,
          tip + 2,
        ]),
        fill: grad(P.wood, false),
        edge: true,
      });
    }
  } else if (ks === "wild-shot") {
    // Curved blades forged onto the back of both limbs, sweeping toward the tips.
    const back = (t: number) => center(t) - (5 + 9 * (1 - Math.abs(2 * t - 1)));
    for (const [t0, t1] of [
      [0.36, 0.1],
      [0.64, 0.9],
    ] as const) {
      const inner: number[] = [];
      const outer: number[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = t0 + ((t1 - t0) * i) / 12;
        const k = i / 12;
        inner.push(t * L, back(t) + 3);
        // Walked back from the tip, so the outline closes.
        const tb = t1 - ((t1 - t0) * i) / 12;
        const kb = 1 - k;
        outer.push(tb * L, back(tb) - 24 * Math.sin(Math.PI * Math.pow(kb, 1.5)) - 6 * kb);
      }
      // Ends in a hooked point past the limb.
      const tipX = (t1 + (t1 - t0) * 0.1) * L;
      const tipY = back(t1) - 20;
      behind.push({
        poly: [...inner, tipX, tipY, ...outer],
        fill: grad(P.steel),
        edge: true,
      });
    }
  }
  return {
    parts: [
      ...behind,
      { poly: r.poly, fill: grad(P.wood, false), edge: true, rim: r.upper },
      ...front,
    ],
    details: (g) => {
      // String, grip wrap, horn nocks.
      g.moveTo(4, tip)
        .lineTo(L - 4, tip)
        .stroke({ color: 0xe8e2d6, width: 2, alpha: 0.85 });
      g.roundRect(L * 0.44, gy - 16, L * 0.12, 32, 5).fill(grad(P.leather));
      wrap(g, L * 0.44, L * 0.56, 15);
      for (const x of [0, L]) gem(g, x, tip, 7, P.gem);
      // Arrows on the string, ready: three for a Rain of Arrows.
      const arrows = ks === "rain-of-arrows" ? [-0.3, 0.3, 0] : [0];
      for (const a of arrows) {
        const len = tip - gy + 70;
        const hx = L * 0.5 + Math.sin(a) * len;
        const hy = tip - Math.cos(a) * len;
        const dx = Math.sin(a);
        const dy = -Math.cos(a);
        g.moveTo(L * 0.5, tip)
          .lineTo(hx, hy)
          .stroke({ color: 0x0b0705, width: 6 });
        g.moveTo(L * 0.5, tip)
          .lineTo(hx, hy)
          .stroke({ color: 0x8a6a40, width: 3.5 });
        // Broadhead.
        g.poly([
          hx + dx * 20,
          hy + dy * 20,
          hx - dy * 9,
          hy + dx * 9,
          hx + dy * 9,
          hy - dx * 9,
        ]).fill(grad(P.steel));
        // Fletching at the nock.
        for (const sd of [-1, 1]) {
          const fx = L * 0.5 + dx * 8;
          const fy = tip + dy * 8;
          g.poly([
            fx,
            fy,
            fx + dx * 26 - dy * sd * 9,
            fy + dy * 26 + dx * sd * 9,
            fx + dx * 30,
            fy + dy * 30,
          ]).fill(0xc8423a);
        }
      }
      if (ks === "hunters-mark") {
        // A sight ring and the red mark on the grip.
        g.circle(L * 0.5, gy - 36, 15).stroke({ color: 0x0b0705, width: 5 });
        g.circle(L * 0.5, gy - 36, 15).stroke({ color: 0xe04a3a, width: 2.5 });
        g.moveTo(L * 0.5 - 22, gy - 36)
          .lineTo(L * 0.5 + 22, gy - 36)
          .stroke({ color: 0xe04a3a, width: 1.5 });
        gem(g, L * 0.5, gy, 8, 0xe04a3a);
      }
    },
    anchorY: center,
    track: {
      spans: [
        [L * 0.07, L * 0.3],
        [L * 0.445, L * 0.555],
        [L * 0.7, L * 0.93],
      ],
      y: (x) => center(x / L),
      size: 9,
    },
  };
}

function crossbow(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const px = L * 0.78;
  const prod = ribbon(
    340,
    30,
    (t) => -Math.sin(t * Math.PI) * 46,
    (t) => 5 + 7 * Math.sin(t * Math.PI),
  );
  // The prod stands across the stock: swap axes and move it to px.
  const toProd = (pts: number[]) =>
    pts.flatMap((_, i) => (i % 2 === 0 ? [px - (pts[i + 1] ?? 0) - 20, (pts[i] ?? 0) - 170] : []));
  const front: Part[] = [];
  if (ks === "deadeye") {
    front.push({
      poly: [L * 0.38, -46, L * 0.62, -46, L * 0.62, -28, L * 0.38, -28],
      fill: grad(P.iron),
      edge: true,
    });
  } else if (ks === "repeater") {
    front.push({
      poly: [L * 0.5, -70, L * 0.68, -70, L * 0.68, -14, L * 0.5, -14],
      fill: grad(P.wood),
      rim: [L * 0.5, -70, L * 0.68, -70],
    });
  } else if (ks === "siege-engine") {
    front.push({ poly: arc(L * 0.14, 40, 30, 30), fill: grad(P.iron), edge: true });
  } else if (ks === "harpoon") {
    for (const s of [-1, 1]) {
      front.push({
        poly: [L - 26, s * 4, L - 52, s * 26, L - 40, s * 4],
        fill: grad(P.steel),
        edge: true,
      });
    }
  }
  return {
    parts: [
      {
        poly: [0, -26, 70, -18, L * 0.82, -14, L * 0.82, 14, 70, 18, 0, 34],
        fill: grad(P.wood),
        rim: [0, -26, 70, -18, L * 0.82, -14],
      },
      { poly: toProd(prod.poly), fill: grad(P.steel, false), edge: true },
      {
        poly: [L * 0.55, -6, L * 0.95, -5, L, 0, L * 0.95, 5, L * 0.55, 6],
        fill: grad(P.steel),
        edge: true,
      },
      ...front,
    ],
    details: (g) => {
      // String to the latch, trigger, fittings.
      g.moveTo(px - 20, -170)
        .lineTo(L * 0.48, 0)
        .lineTo(px - 20, 170);
      g.stroke({ color: 0xe8e2d6, width: 2, alpha: 0.85 });
      g.poly([L * 0.36, 14, L * 0.38, 48, L * 0.4, 46, L * 0.4, 14]).fill(grad(P.iron));
      band(g, P.fit, L * 0.5, 15, 14);
      band(g, P.fit, px - 20, 16, 22);
      g.poly([L * 0.55, -6, L * 0.52, -14, L * 0.57, -6]).fill(0xc8423a);
      g.moveTo(L * 0.1, -8).bezierCurveTo(L * 0.3, -12, L * 0.5, -4, L * 0.7, -8);
      g.stroke({ color: 0x1a1008, width: 1.5, alpha: 0.6 });
      if (ks === "deadeye") {
        gem(g, L * 0.62, -37, 8, look.accent);
        band(g, P.fit, L * 0.45, -0, 6);
      } else if (ks === "repeater") {
        for (const x of [0.54, 0.59, 0.64]) {
          g.moveTo(L * x, -70)
            .lineTo(L * x, -84)
            .stroke({ color: 0x8a6a40, width: 4 });
          g.poly([L * x, -92, L * x - 5, -82, L * x + 5, -82]).fill(grad(P.steel));
        }
      } else if (ks === "siege-engine") {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          g.moveTo(L * 0.14, 40).lineTo(L * 0.14 + Math.cos(a) * 26, 40 + Math.sin(a) * 26);
        }
        g.stroke({ color: 0x0b0705, width: 3 });
        g.circle(L * 0.14, 40, 8).fill(grad(P.fit));
      } else if (ks === "harpoon") {
        // A braided rope runs from the bolt back to a coil under the stock.
        const rope = (gg: Graphics) =>
          gg.moveTo(L * 0.6, 8).bezierCurveTo(L * 0.52, 58, L * 0.36, 66, L * 0.26, 40);
        rope(g).stroke({ color: 0x2a1a0c, width: 7, cap: "round" });
        rope(g).stroke({ color: 0xc8a878, width: 4, cap: "round" });
        for (let k = 0; k < 14; k++) {
          // Braid ticks along the curve.
          const t = (k + 0.5) / 14;
          const u = 1 - t;
          const x =
            u * u * u * L * 0.6 +
            3 * u * u * t * L * 0.52 +
            3 * u * t * t * L * 0.36 +
            t * t * t * L * 0.26;
          const y = u * u * u * 8 + 3 * u * u * t * 58 + 3 * u * t * t * 66 + t * t * t * 40;
          g.moveTo(x - 2, y - 2)
            .lineTo(x + 2, y + 2)
            .stroke({ color: 0x6a4a28, width: 1.5 });
        }
        for (const [dx, r] of [
          [0, 18],
          [3, 13],
          [6, 8],
        ] as const) {
          g.ellipse(L * 0.26 + dx, 40, r, r * 0.55).stroke({ color: 0x2a1a0c, width: 6 });
          g.ellipse(L * 0.26 + dx, 40, r, r * 0.55).stroke({ color: 0xc8a878, width: 3 });
        }
      }
    },
    anchorY: () => 0,
    track: {
      spans: [
        [L * 0.06, L * 0.2],
        [L * 0.21, L * 0.34],
        [L * 0.35, L * 0.47],
      ],
      y: () => 2,
      size: 10,
    },
  };
}

function wand(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const accent = look.accent;
  const rod = ribbon(
    L * 0.8,
    20,
    (t) => Math.sin(t * 9) * 2,
    (t) => 13 - t * 5,
  );
  const cx = L * 0.88;
  const crystalFill = (c: number) => grad(["#140b06", hex(c), "#ffffff", hex(c), "#140b06"]);
  /** The crystal, scaled by f and turned by `angle` around its back point, moved by dx/dy. */
  const crystal = (f: number, dx = 0, dy = 0, angle = 0) => {
    const shape = [0, 0, 38, -26, 100, 0, 38, 26];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const out: number[] = [];
    for (let i = 0; i < shape.length; i += 2) {
      const x = (shape[i] ?? 0) * f;
      const y = (shape[i + 1] ?? 0) * f;
      out.push(cx - 46 + dx + x * cos - y * sin, dy + x * sin + y * cos);
    }
    return out;
  };
  const behind: Part[] = [];
  if (ks === "prism") {
    behind.push({ poly: crystal(0.85, 6, 0, -0.45), fill: crystalFill(0x8ec8f0), edge: true });
    behind.push({ poly: crystal(0.85, 6, 0, 0.45), fill: crystalFill(0xffe066), edge: true });
  } else if (ks === "wild-magic") {
    for (const a of [-1.2, -0.6, 0.6, 1.2]) {
      behind.push({ poly: crystal(0.5, 34, 0, a), fill: crystalFill(accent), edge: true });
    }
  }
  const main = ks === "glass-cannon" ? crystal(1.6, -6) : crystal(1);
  return {
    parts: [
      { poly: rod.poly, fill: grad(P.wood), rim: rod.upper },
      ...behind,
      { poly: main, fill: crystalFill(ks === "prism" ? 0xffffff : accent), edge: true },
    ],
    details: (g) => {
      // Spiral carving, collars, claws around the crystal.
      for (let x = 30; x < L * 0.76; x += 22) {
        g.moveTo(x, -10).bezierCurveTo(x + 8, -4, x + 4, 6, x + 14, 10);
        g.stroke({ color: 0x1a1008, width: 2, alpha: 0.55 });
      }
      band(g, P.fit, L * 0.3, 12, 10);
      band(g, P.fit, L * 0.78, 10, 14);
      const fitColor = Number.parseInt((P.fit[1] ?? "#a8732e").slice(1), 16);
      for (const s of [-1, 1]) {
        g.moveTo(L * 0.79, s * 8).bezierCurveTo(cx - 40, s * 34, cx - 10, s * 36, cx + 6, s * 22);
        g.stroke({ color: fitColor, width: 4 });
      }
      g.moveTo(cx - 40, -2)
        .lineTo(cx + 40, -2)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      if (ks === "glass-cannon") {
        // Cracks in the overcharged crystal.
        g.moveTo(cx - 20, -14)
          .lineTo(cx, 4)
          .lineTo(cx + 18, -6)
          .lineTo(cx + 40, 10);
        g.moveTo(cx, 4).lineTo(cx - 6, 24);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.85 });
      } else if (ks === "focused-will") {
        // A golden halo holds the crystal.
        g.ellipse(cx + 4, 0, 18, 52).stroke({ color: 0x0b0705, width: 6 });
        g.ellipse(cx + 4, 0, 18, 52).stroke({ color: 0xffd27a, width: 3 });
        for (const y of [-52, 52]) g.circle(cx + 4, y, 5).fill(0xffd27a);
      }
      g.circle(12, 0, 14).fill(grad(P.fit));
    },
    anchorY: (t) => (t < 0.8 ? Math.sin((t / 0.8) * 9) * 2 : 0),
    track: {
      spans: [
        [L * 0.08, L * 0.28],
        [L * 0.33, L * 0.54],
        [L * 0.56, L * 0.76],
      ],
      y: (x) => Math.sin((x / L / 0.8) * 9) * 2,
      size: 9,
    },
  };
}

/** A flame tongue from radius r0 at angle a around (cx, 0), `len` long, bent sideways. */
function flame(cx: number, a: number, r0: number, len: number, w: number, bend: number): number[] {
  const left: number[] = [];
  const right: number[] = [];
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const along = r0 + len * u;
    const side = bend * u * u;
    const half = w * Math.pow(1 - u, 0.9) * (1 + 0.35 * Math.sin(u * Math.PI));
    const x = cx + dx * along - dy * side;
    const y = dy * along + dx * side;
    left.push(x - dy * half, y + dx * half);
    right.unshift(x + dy * half, y - dx * half);
  }
  return [...left, ...right];
}

/** A crescent: the outer circle (cx, R) minus a circle shifted right by `shift` with radius r. */
function crescent(cx: number, R: number, shift: number, r: number): number[] {
  // Where both circles meet: x from the centre of the outer one.
  const mx = (R * R - r * r + shift * shift) / (2 * shift);
  const my = Math.sqrt(Math.max(0, R * R - mx * mx));
  const outer = Math.atan2(my, mx);
  const inner = Math.atan2(my, mx - shift);
  return [
    ...arc(cx, 0, R, R, outer, Math.PI * 2 - outer, 40),
    ...arc(cx + shift, 0, r, r, Math.PI * 2 - inner, inner, 40),
  ];
}

function moonFill(): FillGradient {
  return new FillGradient({
    type: "radial",
    center: { x: 0.25, y: 0.4 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.6,
    colorStops: [
      { offset: 0, color: "#f4f8ff" },
      { offset: 0.45, color: "#c2cee2" },
      { offset: 0.8, color: "#6e7c98" },
      { offset: 1, color: "#2a3346" },
    ],
    textureSpace: "local",
  });
}

/** The black sun: dark to the rim, where the hidden light burns through. */
function corona(color: number): FillGradient {
  return new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: "#000000" },
      { offset: 0.68, color: "#06040a" },
      { offset: 0.8, color: hex(color) },
      { offset: 1, color: `${hex(color)}00` },
    ],
    textureSpace: "local",
  });
}

/** A four-pointed twinkle. */
function star(g: Graphics, x: number, y: number, r: number): void {
  const q = r * 0.22;
  g.poly([
    x,
    y - r,
    x + q,
    y - q,
    x + r,
    y,
    x + q,
    y + q,
    x,
    y + r,
    x - q,
    y + q,
    x - r,
    y,
    x - q,
    y - q,
  ]).fill(0xf4f8ff);
  g.circle(x, y, r * 0.9).fill({ color: 0xbfd4ff, alpha: 0.18 });
}

function staff(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const accent = look.accent;
  const shaft = ribbon(
    L * 0.84,
    32,
    (t) => Math.sin(t * 7) * 5 + Math.sin(t * 17) * 2,
    (t) => 11 + Math.sin(t * 23) * 2 + (t > 0.85 ? (t - 0.85) * 60 : 0),
  );
  const ox = L * 0.92;
  const behind: Part[] = [];
  if (ks === "endless-night") {
    // A pale crescent moon cradles the orb, its horns reaching past it toward the tip.
    behind.push({ poly: crescent(ox - 8, 70, 20, 58), fill: moonFill(), edge: true });
  } else if (ks === "pyre") {
    // A crown of flame tongues licking out of the orb, each bent like a gust took it.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.2;
      const len = k % 2 === 0 ? 48 : 36;
      const bend = (k % 3 === 0 ? -1 : 1) * 12;
      behind.push({ poly: flame(ox, a, 32, len, 13, bend), fill: 0xd8401a, edge: true });
      behind.push({
        poly: flame(ox, a, 32, len * 0.62, 7, bend * 0.6),
        fill: 0xffc65a,
        soft: true,
      });
    }
  } else if (ks === "siphon") {
    // Fangs that drink.
    for (const s of [-1, 1]) {
      behind.push({
        poly: [
          L * 0.8,
          s * 10,
          L * 0.74,
          s * 60,
          L * 0.64,
          s * 92,
          L * 0.7,
          s * 58,
          L * 0.76,
          s * 14,
        ],
        fill: grad(P.bone),
        edge: true,
      });
    }
  } else if (ks === "eclipse") {
    // The orb has swallowed its light: a black sun whose corona burns in the element's colour.
    behind.push({ poly: arc(ox, 0, 54, 54, 0, Math.PI * 2, 48), fill: corona(accent), soft: true });
  }
  return {
    parts: [...behind, { poly: shaft.poly, fill: grad(P.wood), rim: shaft.upper }],
    details: (g) => {
      // Knots, wraps, the claw and the orb.
      for (const t of [0.18, 0.42, 0.63]) g.ellipse(L * 0.84 * t, -6, 7, 4).fill(0x2a1a0e);
      g.roundRect(L * 0.24, -14, L * 0.1, 28, 4).fill(grad(P.leather));
      wrap(g, L * 0.24, L * 0.34, 14);
      for (const s of [-1, 1]) {
        g.moveTo(L * 0.84, s * 8)
          .bezierCurveTo(ox - 40, s * 66, ox + 40, s * 70, ox + 40, s * 22)
          .stroke({ color: 0x3a2412, width: 10 });
        g.moveTo(L * 0.84, s * 8)
          .bezierCurveTo(ox - 40, s * 66, ox + 40, s * 70, ox + 40, s * 22)
          .stroke({
            color: Number.parseInt((P.wood[2] ?? "#8a5a30").slice(1), 16),
            width: 3,
            alpha: 0.7,
          });
      }
      gem(g, ox, 0, 36, ks === "eclipse" ? 0x1a1020 : accent);
      if (ks === "eclipse") {
        // Only a thin ring of light is left around the dark orb, brightest where it breaks out.
        g.circle(ox, 0, 38).stroke({ color: accent, width: 4, alpha: 0.85 });
        g.circle(ox, 0, 38).stroke({ color: 0xffffff, width: 1.2, alpha: 0.7 });
        g.circle(ox + Math.cos(-0.8) * 38, Math.sin(-0.8) * 38, 4).fill(0xffffff);
        g.circle(ox + Math.cos(-0.8) * 38, Math.sin(-0.8) * 38, 8).fill({
          color: 0xffffff,
          alpha: 0.35,
        });
      } else if (ks === "endless-night") {
        // Stars caught in the night around the moon.
        for (const [sx, sy, r] of [
          [ox + 70, -58, 7],
          [ox + 52, 70, 5],
          [ox - 30, -72, 4],
        ] as const)
          star(g, sx, sy, r);
      } else if (ks === "siphon") {
        for (const s of [-1, 1]) {
          g.moveTo(L * 0.66, s * 86).bezierCurveTo(
            L * 0.72,
            s * 50,
            ox - 30,
            s * 30,
            ox - 20,
            s * 8,
          );
          g.stroke({ color: accent, width: 2.5, alpha: 0.8 });
        }
      }
      g.circle(10, 0, 14).fill(grad(P.fit));
    },
    anchorY: (t) => (t < 0.84 ? Math.sin((t / 0.84) * 7) * 5 : 0),
    ...(ks === "pyre"
      ? {
          light: (g: Graphics) => {
            for (let k = 0; k < 9; k++) {
              const a = (k / 9) * Math.PI * 2 + 0.2;
              g.poly(flame(ox, a, 32, k % 2 === 0 ? 40 : 30, 8, 0)).fill({
                color: 0xff8a2a,
                alpha: 0.7,
              });
            }
          },
        }
      : {}),
    ...(ks === "eclipse"
      ? {
          light: (g: Graphics) => {
            // Corona flares, soft from the blur of the light layer.
            for (let k = 0; k < 14; k++) {
              const a = (k / 14) * Math.PI * 2 + 0.2;
              const long = [86, 64, 76, 58][k % 4] ?? 70;
              const bend = 0.18 * Math.sin(k * 2.3);
              g.moveTo(ox + Math.cos(a) * 42, Math.sin(a) * 42)
                .quadraticCurveTo(
                  ox + Math.cos(a + bend * 0.5) * (long * 0.75),
                  Math.sin(a + bend * 0.5) * (long * 0.75),
                  ox + Math.cos(a + bend) * long,
                  Math.sin(a + bend) * long,
                )
                .stroke({ color: accent, width: k % 2 === 0 ? 5 : 3, alpha: 0.75, cap: "round" });
            }
            g.circle(ox, 0, 42).stroke({ color: accent, width: 9, alpha: 0.9 });
            g.circle(ox, 0, 40).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
          },
        }
      : {}),
    track: {
      spans: [
        [L * 0.04, L * 0.22],
        [L * 0.36, L * 0.58],
        [L * 0.6, L * 0.82],
      ],
      y: (x) => {
        const t = x / (L * 0.84);
        return Math.sin(t * 7) * 5 + Math.sin(t * 17) * 2;
      },
      size: 9,
    },
  };
}

/** The painted weapon of a weapon id, `length` pixels long, in the build's look. */
export function drawWeapon(
  weaponId: string,
  length: number,
  look: WeaponLook = PLAIN_LOOK,
): WeaponArt {
  const P = PALETTES[Math.max(0, Math.min(PALETTES.length - 1, look.grade))] ?? PALETTES[1];
  if (!P) throw new Error("No palette");
  const build = (() => {
    switch (weaponId) {
      case "dagger":
        return dagger(length, P, look);
      case "mace":
        return mace(length, P, look);
      case "axe":
        return axe(length, P, look);
      case "bow":
        return bow(length, P, look);
      case "crossbow":
        return crossbow(length, P, look);
      case "fire-wand":
        return wand(length, P, look);
      case "staff":
        return staff(length, P, look);
      default:
        return sword(length, P, look);
    }
  })();
  const details = build.details;
  return assemble(
    {
      ...build,
      details: (g) => {
        details(g);
        gradeMarks(g, look, build.track);
      },
    },
    look,
  );
}
