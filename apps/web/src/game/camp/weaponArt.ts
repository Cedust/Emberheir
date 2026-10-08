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
  readonly alpha?: number;
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
}

function assemble(build: Build, look: WeaponLook): WeaponArt {
  const { parts } = build;
  const body = new Container();
  const paint = new Graphics();
  for (const p of parts) {
    if (p.alpha !== undefined && typeof p.fill === "number") {
      // Ghost parts (Shadowstep): no outline, see-through.
      paint.poly([...p.poly]).fill({ color: p.fill, alpha: p.alpha });
      continue;
    }
    paint.poly([...p.poly]).fill(p.fill);
    paint.poly([...p.poly]).stroke({ color: 0x0b0705, width: 2.5, alpha: 0.9 });
    if (p.rim) rim(paint, p.rim, look.grade >= 3 ? 0.55 : 0.35);
  }
  build.details(paint);
  const runeGlow = new Graphics();
  carveRunes(paint, runeGlow, build.track, look);
  body.addChild(paint);
  const edge = new Graphics();
  for (const p of parts) {
    if (p.edge) edge.poly([...p.poly]).stroke({ color: 0xffffff, width: 5, join: "round" });
  }
  const silhouette = () => {
    const s = new Graphics();
    for (const p of parts) s.poly([...p.poly]).fill(0xffffff);
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
    // A shadow twin of the blade, a step behind.
    behind.push({ poly: shift(blade, -L * 0.08, -34), fill: 0x3a2a5a, alpha: 0.45 });
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
        // Venom bulbs on the guard and a green channel down the blade.
        gem(g, L * 0.355, -56, 11, 0x6ad04a);
        gem(g, L * 0.395, 54, 11, 0x6ad04a);
        g.moveTo(L * 0.4, 2).bezierCurveTo(L * 0.55, -6, L * 0.75, -6, L * 0.9, -3);
        g.stroke({ color: 0x6ad04a, width: 3, alpha: 0.85 });
        for (const x of [0.6, 0.72, 0.84])
          g.circle(L * x, 14, 3).fill({ color: 0x8af06a, alpha: 0.9 });
      }
    },
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

function axe(L: number, P: Palette, look: WeaponLook): Build {
  const ks = look.keystone;
  const hx = L * 0.78;
  const blade = [
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
  const scale = (pts: readonly number[], f: number, cx: number, cy: number) =>
    pts.map((v, i) => (i % 2 === 0 ? cx + (v - cx) * f : cy + (v - cy) * f));
  const behind: Part[] = [];
  const front: Part[] = [];
  if (ks === "executioner") {
    behind.push({ poly: scale(blade, 1.4, hx, 10), fill: grad(P.steel), edge: true });
  } else if (ks === "rampage") {
    // A second bit on the back: a double axe.
    behind.push({
      poly: blade.map((v, i) => (i % 2 === 1 ? -v : v)),
      fill: grad(P.steel),
      edge: true,
    });
  } else if (ks === "bloodbath") {
    const edgeLine = [hx + 62, 40, hx + 74, 72, hx + 85, 102, hx + 96, 132];
    for (const t of teeth(edgeLine, 1, 14, -1))
      behind.push({ poly: t, fill: grad(P.steel), edge: true });
  } else if (ks === "gore") {
    front.push({
      poly: [hx - 20, 128, hx - 70, 176, hx - 82, 160, hx - 46, 132, hx - 10, 96],
      fill: grad(P.steel),
      edge: true,
    });
  }
  return {
    parts: [
      { poly: [0, -12, L * 0.93, -10, L * 0.93, 10, 0, 12], fill: grad(P.wood) },
      ...behind,
      { poly: blade, fill: grad(P.steel), edge: true },
      {
        poly: [hx - 36, -18, hx + 38, -18, hx + 34, 22, hx - 32, 22],
        fill: grad(P.iron),
        rim: [hx - 36, -18, hx + 38, -18],
      },
      ...(ks === "rampage"
        ? []
        : [
            {
              poly: [hx - 16, -18, hx - 4, -72, hx + 10, -78, hx + 18, -18],
              fill: grad(P.iron),
              edge: true,
            },
          ]),
      { poly: [L * 0.93, -10, L, 0, L * 0.93, 10], fill: grad(P.steel), edge: true },
      ...front,
    ],
    details: (g) => {
      g.roundRect(26, -14, L * 0.22, 28, 4).fill(grad(P.leather));
      wrap(g, 26, 26 + L * 0.22, 14);
      // Grain of the haft, the bevel of the blade.
      g.moveTo(L * 0.3, -3).bezierCurveTo(L * 0.45, -6, L * 0.6, 2, hx - 40, -2);
      g.stroke({ color: 0x1a1008, width: 1.5, alpha: 0.6 });
      g.moveTo(hx + 54, 44)
        .lineTo(hx + 84, 128)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.45 });
      g.moveTo(hx - 10, 76).bezierCurveTo(hx + 10, 100, hx + 40, 110, hx + 70, 120);
      g.stroke({ color: 0x1a1d22, width: 2, alpha: 0.5 });
      if (ks === "bloodbath") {
        for (const [x, y, r] of [
          [hx + 30, 100, 9],
          [hx + 52, 126, 6],
          [hx + 10, 120, 5],
        ] as const) {
          g.circle(x, y, r).fill({ color: 0x8a1010, alpha: 0.7 });
        }
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
    // Blades along the back of the limbs.
    for (const t of [0.14, 0.26, 0.74, 0.86]) {
      const x = t * L;
      const y = center(t) - (5 + 9 * (1 - Math.abs(2 * t - 1)));
      const dir = t < 0.5 ? -1 : 1;
      behind.push({
        poly: [x - 12, y + 4, x + dir * 16, y - 34, x + 12, y + 4],
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
      const arrows = ks === "rain-of-arrows" ? [-0.12, 0, 0.12] : [0];
      for (const a of arrows) {
        const hx = L * 0.5 + Math.sin(a) * 120;
        const hy = gy - 60 - Math.abs(a) * -20;
        g.moveTo(L * 0.5, tip)
          .lineTo(hx, hy)
          .stroke({ color: 0x8a6a40, width: 4 });
        g.poly([hx, hy - 18, hx - 9, hy + 2, hx + 9, hy + 2]).fill(grad(P.steel));
      }
      g.poly([L * 0.5, tip - 4, L * 0.5 - 10, tip + 18, L * 0.5, tip + 10, L * 0.5 + 10, tip + 18]);
      g.fill(0xc8423a);
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
        // The rope runs back to the stock.
        g.moveTo(L * 0.6, 6).bezierCurveTo(L * 0.5, 60, L * 0.3, 70, L * 0.2, 30);
        g.stroke({ color: 0xc8a878, width: 3 });
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
    // A crescent moon behind the orb.
    const outer = arc(ox + 4, 0, 70, 70, -2.3, 2.3, 28);
    const inner = arc(ox + 26, 0, 56, 56, 2.0, -2.0, 28);
    behind.push({
      poly: [...outer, ...inner],
      fill: grad(["#20242c", "#9aa6b8", "#e8eef8", "#7a8698", "#1a1e26"]),
      edge: true,
    });
  } else if (ks === "pyre") {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const x = ox + Math.cos(a) * 34;
      const y = Math.sin(a) * 34;
      const tx = ox + Math.cos(a) * 74;
      const ty = Math.sin(a) * 74;
      const nx = -Math.sin(a) * 12;
      const ny = Math.cos(a) * 12;
      behind.push({
        poly: [x + nx, y + ny, tx, ty, x - nx, y - ny],
        fill: grad(["#401004", "#ff5a1a", "#ffd27a", "#ff7a2a", "#401004"]),
        edge: true,
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
    behind.push({ poly: arc(ox, 0, 52, 52), fill: 0x0c0810, edge: true });
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
        // Only a ring of light is left around the dark orb.
        g.circle(ox, 0, 44).stroke({ color: accent, width: 3, alpha: 0.9 });
        g.circle(ox, 0, 50).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
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
