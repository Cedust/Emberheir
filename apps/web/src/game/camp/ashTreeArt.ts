import { TREE_PLACEMENT, TRUNK, type TreeRegion, onTree } from "@emberheir/content";
import type { SkillNode } from "@emberheir/sim";
import { FillGradient, Graphics } from "pixi.js";

/**
 * The Ash Tree behind the Skill Tree, painted in code like the weapons of Weapon Mastery:
 * layered bark with a shadow side and a lit side (light from the upper left), grooves and knots
 * in the trunk, limbs up to each crown region and gnarled roots down into the earth, twigs under
 * every link that grows outwards, and a few autumn leaves at the crown's tips. The Ember sigil
 * is carved into the trunk; its grooves glow (`sigilGlow`, pulsed by the scene).
 *
 * All sizes are in tree units; `unit` turns them into stage pixels.
 */

const SHADOW = 0x070403;
const BARK = 0x2b1e15;
const BARK_MID = 0x4b3726;
const BARK_LIGHT = 0x84664a;
const GROOVE = 0x120b07;
const WOOD = "#6e5034";
const WOOD_DARK = "#2e1f14";
const EMBER = 0xff8a3a;
const EMBER_CORE = 0xffd27a;
const LEAVES = [0x8a3414, 0xa8481a, 0x6e2a10, 0xb8742a, 0x7a3a16] as const;

/** Light comes from the upper left. */
const LIGHT = { x: -0.6, y: -0.8 };

type Pt = { readonly x: number; readonly y: number };

/** Small deterministic noise, so the tree looks the same on every visit. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Point on a quadratic curve. */
function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

export interface AshTreeArt {
  /** The earth under the root collar (wide but cheap, so it is not baked). */
  readonly earth: Graphics;
  /** Trunk, limbs and roots: static, so the scene bakes them into a texture. */
  readonly wood: Graphics;
  /** Twigs under the visible nodes' outward links (redrawn when the visible nodes change). */
  readonly twigs: Graphics;
  /** The carved Ember sigil. */
  readonly sigil: Graphics;
  /** The sigil's grooves as light, for an additive glow layer. */
  readonly sigilGlow: Graphics;
  /** Wide strokes of the same light, to be blurred into a soft bloom. */
  readonly sigilBloom: Graphics;
  /** Where the sigil sits (stage pixels). */
  readonly sigilAt: Pt;
}

export const SIGIL_Y = -0.9;
const SIGIL_R = 0.95;

/** Half width of the trunk at height `y` (tree units). */
function trunkHalf(y: number): number {
  const t = (TRUNK.bottom - y) / (TRUNK.bottom - TRUNK.top);
  const profile: readonly (readonly [number, number])[] = [
    [0, 2.9],
    [0.08, 1.75],
    [0.2, 1.35],
    [0.5, 1.25],
    [0.75, 1.4],
    [0.88, 1.05],
    [1, 0.35],
  ];
  for (let i = 1; i < profile.length; i++) {
    const [t0, w0] = profile[i - 1] ?? [0, 1];
    const [t1, w1] = profile[i] ?? [1, 1];
    if (t <= t1) return lerp(w0, w1, (t - t0) / (t1 - t0));
  }
  return 0.35;
}

/**
 * A tapered limb along a curve, painted in layers: a soft cast shadow, the dark bark, a lit
 * band on the side that faces the light, a thin highlight, and a groove down the middle.
 */
function limb(
  g: Graphics,
  unit: number,
  pts: readonly Pt[],
  w0: number,
  w1: number,
  opts: { shadow?: boolean; grooves?: boolean } = {},
): void {
  const u = (v: number) => v * unit;
  const normals = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)] ?? p;
    const b = pts[Math.min(pts.length - 1, i + 1)] ?? p;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  });
  const mid = normals[Math.floor(normals.length / 2)] ?? { x: 1, y: 0 };
  const lit = mid.x * LIGHT.x + mid.y * LIGHT.y > 0 ? 1 : -1;
  const band = (scale: number, shift: number, dx = 0, dy = 0): number[] => {
    const left: number[] = [];
    const right: number[] = [];
    pts.forEach((p, i) => {
      const n = normals[i] ?? mid;
      const w = lerp(w0, w1, i / (pts.length - 1));
      const c = shift * w * lit;
      left.push(u(p.x + n.x * (c + w * scale) + dx), u(p.y + n.y * (c + w * scale) + dy));
      right.push(u(p.x + n.x * (c - w * scale) + dx), u(p.y + n.y * (c - w * scale) + dy));
    });
    const back: number[] = [];
    for (let i = right.length - 2; i >= 0; i -= 2) back.push(right[i] ?? 0, right[i + 1] ?? 0);
    return [...left, ...back];
  };
  if (opts.shadow !== false) g.poly(band(1.15, 0, 0.08, 0.12)).fill({ color: SHADOW, alpha: 0.45 });
  g.poly(band(1, 0)).fill({ color: BARK });
  g.poly(band(0.5, 0.35)).fill({ color: BARK_MID, alpha: 0.9 });
  g.poly(band(0.14, 0.72)).fill({ color: BARK_LIGHT, alpha: 0.55 });
  if (opts.grooves !== false && w0 > 0.12) {
    for (const side of [-0.25, 0.15]) {
      pts.forEach((p, i) => {
        const n = normals[i] ?? mid;
        const w = lerp(w0, w1, i / (pts.length - 1));
        const x = u(p.x + n.x * w * side);
        const y = u(p.y + n.y * w * side);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke({ color: GROOVE, width: 1.5, alpha: 0.6 });
    }
  }
}

/** Samples a bent line from `a` to `b`: `bend` lifts the middle sideways (tree units). */
function bent(a: Pt, b: Pt, bend: number, lift = 0, steps = 10): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const c = { x: (a.x + b.x) / 2 + n.x * bend, y: (a.y + b.y) / 2 + n.y * bend - lift };
  return Array.from({ length: steps + 1 }, (_, i) => quad(a, c, b, i / steps));
}

function hubOf(region: TreeRegion): Pt {
  const a = (TREE_PLACEMENT[region].ring * Math.PI) / 180;
  return onTree({ x: Math.cos(a) * 2.6, y: Math.sin(a) * 2.6 }, region);
}

const isRoot = (region: TreeRegion) => TREE_PLACEMENT[region].origin.y > 0;

/** The earth under the root collar: the roots grow into it. */
function drawEarth(g: Graphics, unit: number): void {
  const u = (v: number) => v * unit;
  const top = TRUNK.bottom + 0.35;
  g.rect(u(-80), u(top), u(160), u(16)).fill(
    new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: "rgba(30, 20, 13, 0.7)" },
        { offset: 0.25, color: "rgba(18, 11, 7, 0.5)" },
        { offset: 1, color: "rgba(8, 5, 3, 0)" },
      ],
      textureSpace: "local",
    }),
  );
  // The ground line, dusted with ash.
  for (let i = 0; i <= 320; i++) {
    const x = -80 + i * 0.5;
    const y =
      top + Math.sin(i * 1.7) * 0.04 + Math.sin(i * 0.37) * 0.08 - Math.exp((-x * x) / 6) * 0.35;
    if (i === 0) g.moveTo(u(x), u(y));
    else g.lineTo(u(x), u(y));
  }
  g.stroke({ color: 0x8a7a68, width: 2, alpha: 0.35 });
  for (let i = 0; i < 60; i++) {
    const x = -20 + hash(`ash${i}`) * 40;
    const y = top - Math.exp((-x * x) / 6) * 0.35 + hash(`ashy${i}`) * 0.25 - 0.05;
    g.circle(u(x), u(y), 1 + hash(`ashr${i}`) * 1.6).fill({ color: 0x9a8a78, alpha: 0.25 });
  }
}

function drawTrunk(g: Graphics, unit: number, sigil: Pt): void {
  const u = (v: number) => v * unit;
  const steps = 40;
  const ys = Array.from({ length: steps + 1 }, (_, i) =>
    lerp(TRUNK.bottom + 0.45, TRUNK.top + 0.2, i / steps),
  );
  const wobble = (y: number, k: number) =>
    Math.sin(y * 2.3 + k) * 0.05 + Math.sin(y * 5.1 + k * 2) * 0.025;
  const edge = (side: 1 | -1, scale: number, shift = 0) =>
    ys.map(
      (y) =>
        [u(side * trunkHalf(y) * scale + shift * trunkHalf(y) + wobble(y, side)), u(y)] as const,
    );
  const shape = (scale: number, shift = 0) => {
    const l = edge(-1, scale, shift);
    const r = edge(1, scale, shift).reverse();
    return [...l, ...r].flat();
  };
  // Cast shadow, bark, the lit left side, a highlight, the shadow side.
  g.poly(shape(1.06, 0.06).map((v, i) => v + (i % 2 ? u(0.1) : u(0.08)))).fill({
    color: SHADOW,
    alpha: 0.5,
  });
  g.poly(shape(1)).fill(
    new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: "#3a2a1c" },
        { offset: 0.18, color: "#5a4230" },
        { offset: 0.4, color: "#3e2c1e" },
        { offset: 0.75, color: "#25190f" },
        { offset: 1, color: "#140c07" },
      ],
      textureSpace: "local",
    }),
  );
  // Bark plates: grooves running up the trunk, each with a lit lip on its left.
  const plates = 11;
  for (let k = 0; k < plates; k++) {
    const f = -0.9 + (1.8 * (k + 0.5)) / plates;
    const seed = hash(`groove${k}`);
    let drawing = false;
    for (const [i, y] of ys.entries()) {
      const x = trunkHalf(y) * f + Math.sin(y * (1.8 + seed) + k) * 0.07;
      const inSigil = Math.hypot(x - sigil.x, y - sigil.y) < SIGIL_R + 0.25;
      const gap = hash(`gap${k}-${Math.floor(i / 6)}`) < 0.12;
      if (inSigil || gap) {
        if (drawing) g.stroke({ color: GROOVE, width: 3.2, alpha: 0.75 });
        drawing = false;
        continue;
      }
      if (!drawing) g.moveTo(u(x), u(y));
      else g.lineTo(u(x), u(y));
      drawing = true;
    }
    if (drawing) g.stroke({ color: GROOVE, width: 3.2, alpha: 0.75 });
    drawing = false;
    for (const y of ys) {
      const x = trunkHalf(y) * f + Math.sin(y * (1.8 + seed) + k) * 0.07 - 0.05;
      if (Math.hypot(x - sigil.x, y - sigil.y) < SIGIL_R + 0.3) {
        if (drawing) g.stroke({ color: BARK_LIGHT, width: 1.2, alpha: 0.35 });
        drawing = false;
        continue;
      }
      if (!drawing) g.moveTo(u(x), u(y));
      else g.lineTo(u(x), u(y));
      drawing = true;
    }
    if (drawing) g.stroke({ color: BARK_LIGHT, width: 1.2, alpha: 0.35 });
  }
  // Knots.
  for (const [x, y, r] of [
    [-0.75, -4.6, 0.22],
    [0.62, 1.2, 0.18],
    [0.35, -5.6, 0.12],
  ] as const) {
    g.ellipse(u(x), u(y), u(r * 1.3), u(r)).fill({ color: GROOVE, alpha: 0.85 });
    g.ellipse(u(x - 0.02), u(y - 0.02), u(r * 0.9), u(r * 0.6)).stroke({
      color: BARK_LIGHT,
      width: 1.2,
      alpha: 0.45,
    });
    g.ellipse(u(x), u(y), u(r * 1.7), u(r * 1.25)).stroke({ color: GROOVE, width: 2, alpha: 0.5 });
  }
  // Rim light on the lit edge.
  const rim = edge(-1, 0.97);
  for (const [i, [x, y]] of rim.entries()) {
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke({ color: BARK_LIGHT, width: 2, alpha: 0.4 });
}

/** Roots from the collar to the root hubs, with side roots wandering into the earth. */
function drawRoots(g: Graphics, unit: number): void {
  const regions = Object.keys(TREE_PLACEMENT) as TreeRegion[];
  // Roots first, so the trunk's foot covers their start.
  for (const region of regions.filter(isRoot)) {
    const place = TREE_PLACEMENT[region];
    const hub = hubOf(region);
    const from = { x: place.origin.x * 1.6, y: TRUNK.bottom + 0.2 };
    limb(g, unit, bent(from, hub, (hash(region) - 0.5) * 0.8, -0.3, 14), 0.75, 0.2);
    // Side roots that wander off into the earth.
    for (let k = 0; k < 1; k++) {
      const a = ((place.angle + (hash(region) < 0.5 ? 40 : -40)) * Math.PI) / 180;
      const len = 2.4 + hash(`${region}${k}`) * 1.6;
      const start = { x: lerp(from.x, hub.x, 0.35), y: lerp(from.y, hub.y, 0.35) };
      const end = { x: start.x + Math.cos(a) * len, y: start.y + Math.sin(a) * len };
      limb(
        g,
        unit,
        bent(start, end, (hash(`${region}b${k}`) < 0.5 ? -1 : 1) * 0.7, 0, 12),
        0.22,
        0.03,
        {
          grooves: false,
        },
      );
    }
  }
}

/** Limbs leave the trunk for each crown hub; drawn over the trunk so they grow out of it. */
function drawCrownLimbs(g: Graphics, unit: number): void {
  const regions = Object.keys(TREE_PLACEMENT) as TreeRegion[];
  for (const region of regions.filter((r) => !isRoot(r))) {
    const place = TREE_PLACEMENT[region];
    const hub = hubOf(region);
    const from = { x: place.origin.x * 0.4, y: Math.max(place.origin.y + 0.9, TRUNK.top + 1.1) };
    limb(g, unit, bent(from, hub, (hash(region) - 0.5) * 0.6, 0.45, 12), 0.62, 0.2);
  }
}

/**
 * Twigs under every link that grows outwards (from the trunk's side to the tip); links that
 * run across, like the rings between spokes, stay plain lines.
 */
export function drawTwigs(
  g: Graphics,
  unit: number,
  nodes: readonly SkillNode[],
  regionOf: (n: SkillNode) => TreeRegion | undefined,
): void {
  g.clear();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const tips: { n: SkillNode; from: Pt }[] = [];
  for (const a of nodes) {
    const region = regionOf(a);
    if (!region) continue;
    const o = TREE_PLACEMENT[region].origin;
    const da = Math.hypot(a.x - o.x, a.y - o.y);
    for (const id of a.links) {
      const b = byId.get(id);
      if (!b || regionOf(b) !== region) continue;
      const db = Math.hypot(b.x - o.x, b.y - o.y);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (Math.abs(db - da) < len * 0.55) continue;
      const [inner, outer, di, dout] = da < db ? [a, b, da, db] : [b, a, db, da];
      const w = (d: number) => Math.max(0.05, 0.2 - d * 0.013) * (isRoot(region) ? 1.1 : 1);
      limb(
        g,
        unit,
        bent(inner, outer, (hash(inner.id + outer.id) - 0.5) * 0.25, 0, 6),
        w(di),
        w(dout),
        {
          grooves: false,
          shadow: true,
        },
      );
      if (!isRoot(region) && (outer.kind === "notable" || outer.kind === "keystone")) {
        tips.push({ n: outer, from: inner });
      }
    }
  }
  for (const { n, from } of tips) leaves(g, unit, n, from);
}

/** A sprig of ash leaves (pairs of leaflets) beyond a crown tip. */
function leaves(g: Graphics, unit: number, n: SkillNode, from: Pt): void {
  const u = (v: number) => v * unit;
  const len = Math.hypot(n.x - from.x, n.y - from.y) || 1;
  const dir = { x: (n.x - from.x) / len, y: (n.y - from.y) / len };
  for (const side of [-1, 1]) {
    const turn = side * (0.5 + hash(n.id + side) * 0.5);
    const d = {
      x: dir.x * Math.cos(turn) - dir.y * Math.sin(turn),
      y: dir.x * Math.sin(turn) + dir.y * Math.cos(turn),
    };
    const stemLen = 0.8 + hash(`${n.id}s${side}`) * 0.35;
    const base = { x: n.x + d.x * 0.25, y: n.y + d.y * 0.25 };
    g.moveTo(u(base.x), u(base.y))
      .lineTo(u(base.x + d.x * stemLen), u(base.y + d.y * stemLen))
      .stroke({ color: BARK_MID, width: 1.4, alpha: 0.7 });
    const count = 3;
    for (let k = 0; k <= count; k++) {
      const t = 0.25 + (k / count) * 0.75;
      const p = { x: base.x + d.x * stemLen * t, y: base.y + d.y * stemLen * t };
      const color = LEAVES[Math.floor(hash(`${n.id}${side}${k}`) * LEAVES.length)] ?? LEAVES[0];
      for (const s of k === count ? [0] : [-1, 1]) {
        const a = Math.atan2(d.y, d.x) + s * 0.9;
        leaf(g, unit, p, a, 0.3 - k * 0.02, color);
      }
    }
  }
}

/** One lens-shaped leaflet with a midrib. */
function leaf(g: Graphics, unit: number, at: Pt, angle: number, size: number, color: number): void {
  const u = (v: number) => v * unit;
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const pts: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const along = t * size;
    const across = Math.sin(t * Math.PI) * size * 0.34;
    pts.push(u(at.x + c * along - s * across), u(at.y + s * along + c * across));
  }
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    const along = t * size;
    const across = -Math.sin(t * Math.PI) * size * 0.34;
    pts.push(u(at.x + c * along - s * across), u(at.y + s * along + c * across));
  }
  g.poly(pts).fill({ color, alpha: 0.7 });
  g.moveTo(u(at.x), u(at.y))
    .lineTo(u(at.x + c * size * 0.9), u(at.y + s * size * 0.9))
    .stroke({ color: 0x2a1208, width: 1, alpha: 0.6 });
}

/** The Ember sigil's lines (tree units, around 0,0): a ring of eight notches and a flame. */
function sigilLines(): { rings: number[]; lines: Pt[][] } {
  // A teardrop flame: the tip on top (t = 0), the round foot at y0 (t = π).
  const flame = (h: number, w: number, y0: number): Pt[] =>
    Array.from({ length: 33 }, (_, i) => {
      const t = (i / 32) * Math.PI * 2;
      return { x: w * Math.sin(t) * Math.sin(t / 2), y: y0 - (h * (1 + Math.cos(t))) / 2 };
    });
  const notches: Pt[][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    notches.push([
      { x: Math.cos(a) * 0.72, y: Math.sin(a) * 0.72 },
      { x: Math.cos(a) * 0.86, y: Math.sin(a) * 0.86 },
    ]);
  }
  return {
    rings: [0.9, 0.68],
    lines: [flame(1.15, 0.36, 0.55), flame(0.6, 0.17, 0.45), ...notches],
  };
}

function drawSigil(sigil: Graphics, glow: Graphics, bloom: Graphics, unit: number, at: Pt): void {
  const u = (v: number) => v * unit;
  // The bark is cut away: a round of lighter wood with a dark cut edge.
  sigil
    .circle(u(at.x), u(at.y), u(SIGIL_R + 0.12))
    .fill({ color: GROOVE, alpha: 0.9 })
    .circle(u(at.x), u(at.y), u(SIGIL_R))
    .fill(
      new FillGradient({
        type: "radial",
        center: { x: 0.4, y: 0.35 },
        innerRadius: 0,
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
          { offset: 0, color: WOOD },
          { offset: 1, color: WOOD_DARK },
        ],
        textureSpace: "local",
      }),
    )
    .circle(u(at.x - 0.02), u(at.y - 0.02), u(SIGIL_R - 0.03))
    .stroke({ color: BARK_LIGHT, width: 1.5, alpha: 0.5 });
  // Wood grain in the cut.
  for (let k = -3; k <= 3; k++) {
    const x = at.x + k * 0.24;
    const half = Math.sqrt(Math.max(0, (SIGIL_R - 0.08) ** 2 - (k * 0.24) ** 2));
    sigil
      .moveTo(u(x), u(at.y - half))
      .bezierCurveTo(
        u(x + 0.06),
        u(at.y - half / 3),
        u(x - 0.06),
        u(at.y + half / 3),
        u(x),
        u(at.y + half),
      )
      .stroke({ color: WOOD_DARK, width: 1, alpha: 0.35 });
  }
  const { rings, lines } = sigilLines();
  const path = (
    g: Graphics,
    dx: number,
    dy: number,
    style: { color: number; width: number; alpha: number },
  ) => {
    for (const r of rings) g.circle(u(at.x + dx), u(at.y + dy), u(r)).stroke(style);
    for (const line of lines) {
      for (const [i, p] of line.entries()) {
        if (i === 0) g.moveTo(u(at.x + p.x + dx), u(at.y + p.y + dy));
        else g.lineTo(u(at.x + p.x + dx), u(at.y + p.y + dy));
      }
      g.stroke({ ...style, cap: "round", join: "round" });
    }
  };
  // Carved: a lit lower lip, the dark groove, and the ember in its floor.
  path(sigil, 0.02, 0.025, { color: 0xa88460, width: 6, alpha: 0.45 });
  path(sigil, 0, 0, { color: GROOVE, width: 6, alpha: 1 });
  path(sigil, 0, 0, { color: 0x5a1e08, width: 2.5, alpha: 1 });
  // The light in the grooves.
  path(glow, 0, 0, { color: EMBER, width: 7, alpha: 0.35 });
  path(glow, 0, 0, { color: EMBER, width: 3, alpha: 0.9 });
  path(glow, 0, 0, { color: EMBER_CORE, width: 1.2, alpha: 0.9 });
  path(bloom, 0, 0, { color: EMBER, width: 12, alpha: 0.7 });
}

/** Paints the tree. Twigs are drawn separately (`drawTwigs`) because they follow the nodes. */
export function paintAshTree(unit: number): AshTreeArt {
  const earth = new Graphics();
  drawEarth(earth, unit);
  const wood = new Graphics();
  const at = { x: 0, y: SIGIL_Y };
  drawRoots(wood, unit);
  drawTrunk(wood, unit, at);
  drawCrownLimbs(wood, unit);
  const sigil = new Graphics();
  const sigilGlow = new Graphics();
  const sigilBloom = new Graphics();
  drawSigil(sigil, sigilGlow, sigilBloom, unit, at);
  return {
    earth,
    wood,
    twigs: new Graphics(),
    sigil,
    sigilGlow,
    sigilBloom,
    sigilAt: { x: at.x * unit, y: at.y * unit },
  };
}
