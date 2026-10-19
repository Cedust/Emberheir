import {
  LEADER_NODES,
  SIGIL,
  TREE_PLACEMENT,
  TRUNK,
  type TreeRegion,
  fixedSpot,
  onLeader,
  onTree,
  trunkHalf,
} from "@emberheir/content";
import type { SkillNode } from "@emberheir/sim";
import { Assets, Container, FillGradient, Graphics, Matrix, Sprite, Texture } from "pixi.js";

/**
 * The Ash Tree behind the web, painted in code like the weapons of the Heirloom:
 * layered bark with a shadow side and a lit side (light from the upper left), grooves and knots
 * in the trunk, limbs up to each crown region and gnarled roots down into the earth, twigs under
 * every link that grows outwards, and a few autumn leaves at the crown's tips. The Ember sigil
 * is carved into the trunk; its grooves glow (`sigilGlow`, pulsed by the scene).
 *
 * Timo's painted material (`assets/tree/`, cut by `tools/art/cut_ash_tree.py`) dresses it once
 * loaded: bark on the trunk, limbs and roots, the painted trunk base with its bare patch for the
 * sigil, and leaf sprigs at the crown's tips. Until then (or if it fails) the code paints it all.
 *
 * All sizes are in tree units; `unit` turns them into stage pixels.
 */

const URLS = import.meta.glob<string>("../../assets/tree/*.webp", {
  eager: true,
  import: "default",
});
const urlOf = (name: string) => URLS[`../../assets/tree/${name}.webp`];

/** Timo's painted material for the tree. */
export interface AshTreeTextures {
  readonly bark: Texture;
  readonly base: Texture;
  readonly leaves: readonly Texture[];
}

let loading: Promise<AshTreeTextures | null> | null = null;

/** Loads the painted material once; null if any of it is missing or fails to load. */
export function loadAshTreeTextures(): Promise<AshTreeTextures | null> {
  loading ??= (async () => {
    const leafUrls = Array.from({ length: 8 }, (_, i) => urlOf(`leaves-${i + 1}`));
    const bark = urlOf("bark");
    const base = urlOf("trunk-base");
    if (!bark || !base || leafUrls.some((u) => !u)) return null;
    try {
      const [barkTex, baseTex, ...leaves] = await Promise.all(
        [bark, base, ...(leafUrls as string[])].map((u) => Assets.load<Texture>(u)),
      );
      if (!barkTex || !baseTex) return null;
      // The tile repeats over every limb.
      barkTex.source.addressMode = "repeat";
      return { bark: barkTex, base: baseTex, leaves };
    } catch {
      return null;
    }
  })();
  return loading;
}

/**
 * The painted trunk base (`trunk-base.webp`, 1024 px wide): where the middle of its bare patch
 * sits (texture pixels), and its pixels per tree unit, so that the patch holds the sigil and the
 * roots' nodes sit on its painted roots (tree-shape.ts).
 */
const BASE = { patchX: 516, patchY: 234, perUnit: 64 } as const;
/** Below this the painted roots end: deeper root nodes hang on thin roots of code. */
const PAINTED_ROOTS_END = 7.9;
/**
 * The bark tile is a cool grey brown, the trunk base a warm orange brown: both are tinted to
 * meet in the middle, so the trunk runs into its foot without a colour jump (Timo 2026-10-19).
 */
const BARK_TINT = 0xffe2bc;
const BASE_TINT = 0xd4c4bc;
/** Bark tile size on the tree (tree units per tile). */
const BARK_TILE = 3.2;

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
  readonly wood: Container;
  /** Twigs under the visible nodes' outward links (redrawn when the visible nodes change). */
  readonly twigs: Graphics;
  /** The painted leaf sprigs at the crown's tips (refilled with the twigs). */
  readonly leaves: Container;
  /** The carved Ember sigil. */
  readonly sigil: Graphics;
  /** The sigil's grooves as light, for an additive glow layer. */
  readonly sigilGlow: Graphics;
  /** Wide strokes of the same light, to be blurred into a soft bloom. */
  readonly sigilBloom: Graphics;
  /** Where the sigil sits (stage pixels). */
  readonly sigilAt: Pt;
}

export const SIGIL_Y = SIGIL.y;
const SIGIL_R = SIGIL.radius;
/** The sigil's lines are drawn for a radius of 0.95 and scaled to its size. */
export const SIGIL_SCALE = SIGIL.radius / 0.95;

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
  opts: { shadow?: boolean; grooves?: boolean; bark?: Texture | null } = {},
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
  if (opts.bark) {
    // The painted bark, its furrows running along the limb; the code adds shade and light.
    const first = pts[0] ?? { x: 0, y: 0 };
    const last = pts[pts.length - 1] ?? first;
    const along = Math.atan2(last.y - first.y, last.x - first.x);
    g.poly(band(1, 0)).fill({
      texture: opts.bark,
      color: BARK_TINT,
      matrix: barkMatrix(unit, along - Math.PI / 2),
      textureSpace: "global",
    });
    g.poly(band(0.55, -0.45)).fill({ color: SHADOW, alpha: 0.4 });
    g.poly(band(0.14, 0.72)).fill({ color: BARK_LIGHT, alpha: 0.35 });
    return;
  }
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

/** Maps the bark tile onto the tree: `BARK_TILE` units per tile, turned by `angle`. */
function barkMatrix(unit: number, angle: number): Matrix {
  const scale = (BARK_TILE * unit) / 512;
  return new Matrix().scale(scale, scale).rotate(angle);
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
/** The roots' hub, laid out by hand on the painted roots. */
const ROOT_HUB = "roots-taproot";
const LEADER = new Set(Object.keys(LEADER_NODES));

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

/**
 * The trunk, and the leader that grows on out of its top up into the highest crown region, in
 * one piece: the boughs leave it from behind, so no cut end shows (Timo 2026-10-19).
 */
function drawTrunk(g: Graphics, unit: number, sigil: Pt, bark: Texture | null): void {
  const u = (v: number) => v * unit;
  const top = leaderTop().y;
  const steps = 90;
  const ys = Array.from({ length: steps + 1 }, (_, i) => lerp(TRUNK.bottom + 0.45, top, i / steps));
  const wobble = (y: number, k: number) =>
    Math.sin(y * 2.3 + k) * 0.05 + Math.sin(y * 5.1 + k * 2) * 0.025;
  const edge = (side: 1 | -1, scale: number, shift = 0) =>
    ys.map(
      (y) => [u(side * woodHalf(y) * scale + shift * woodHalf(y) + wobble(y, side)), u(y)] as const,
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
  const roundness = new FillGradient({
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
  });
  if (bark) {
    // Painted bark, rounded by the same light and shade, only lighter; the base is painted.
    g.poly(shape(1)).fill({
      texture: bark,
      color: BARK_TINT,
      matrix: barkMatrix(unit, 0),
      textureSpace: "global",
    });
    g.poly(shape(1)).fill({ fill: roundness, alpha: 0.35 });
    const rim = edge(-1, 0.97);
    for (const [i, [x, y]] of rim.entries()) {
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke({ color: BARK_LIGHT, width: 2, alpha: 0.3 });
    return;
  }
  g.poly(shape(1)).fill(roundness);
  // Bark plates: grooves running up the trunk, each with a lit lip on its left.
  const plates = 11;
  for (let k = 0; k < plates; k++) {
    const f = -0.9 + (1.8 * (k + 0.5)) / plates;
    const seed = hash(`groove${k}`);
    let drawing = false;
    for (const [i, y] of ys.entries()) {
      const x = woodHalf(y) * f + Math.sin(y * (1.8 + seed) + k) * 0.07;
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
      const x = woodHalf(y) * f + Math.sin(y * (1.8 + seed) + k) * 0.07 - 0.05;
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
    [-0.75, -6.4, 0.22],
    [0.62, 1.2, 0.18],
    [0.35, -7.6, 0.12],
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

/**
 * Without the painted trunk base: a root from the collar to the roots' hub, with side roots
 * wandering into the earth (the roots' paths get their own twigs).
 */
function drawRoots(g: Graphics, unit: number, bark: Texture | null): void {
  const regions = Object.keys(TREE_PLACEMENT) as TreeRegion[];
  // Roots first, so the trunk's foot covers their start.
  for (const region of regions.filter(isRoot)) {
    const place = TREE_PLACEMENT[region];
    const hub = fixedSpot(ROOT_HUB) ?? hubOf(region);
    const from = { x: hub.x * 0.4, y: TRUNK.bottom - 0.6 };
    limb(g, unit, bent(from, hub, (hash(region) - 0.5) * 0.8, -0.3, 14), 0.75, 0.2, { bark });
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
        { grooves: false, bark },
      );
    }
  }
}

/** The highest crown region: the leader grows on up into it as its bough. */
function topRegion(): TreeRegion {
  return [...CROWN_REGIONS].sort(
    (a, b) => TREE_PLACEMENT[a].origin.y - TREE_PLACEMENT[b].origin.y,
  )[0] as TreeRegion;
}

/** The leader's half width at its top (at its foot it is as wide as the trunk). */
const LEADER_TOP_WIDTH = 0.25;

/** Where the leader ends: in the highest region's hub. */
const leaderTop = (): Pt => hubOf(topRegion());

/** Half width of the wood: the trunk, then the leader tapering up to its top. */
function woodHalf(y: number): number {
  if (y >= TRUNK.top) return trunkHalf(y);
  const top = leaderTop().y;
  return lerp(trunkHalf(TRUNK.top), LEADER_TOP_WIDTH, (TRUNK.top - y) / (TRUNK.top - top));
}

const CROWN_REGIONS = (Object.keys(TREE_PLACEMENT) as TreeRegion[]).filter(
  (r) => r !== "trunk" && !isRoot(r),
);

/**
 * The crown's boughs: each crown region but the highest (the leader grows into that one) gets a
 * bough from the leader at its own height, the lowest ones from the trunk's top, like an oak's
 * limbs. Drawn before the trunk, which covers their feet.
 */
function drawCrownLimbs(g: Graphics, unit: number, bark: Texture | null): void {
  const crest = topRegion();
  // Highest boughs first, so the lower, thicker ones lie over them.
  const order = [...CROWN_REGIONS]
    .filter((r) => r !== crest)
    .sort((a, b) => TREE_PLACEMENT[a].origin.y - TREE_PLACEMENT[b].origin.y);
  for (const region of order) {
    const hub = hubOf(region);
    const at = onLeader(region);
    // Out of the leader's middle, a little below the bough's rung; never wider than the leader.
    const from = { x: 0, y: Math.min(at.y + 0.5, TRUNK.top + 1.1) };
    const w = Math.min(0.75, woodHalf(Math.min(from.y, TRUNK.top)) * 0.95);
    limb(g, unit, bent(from, hub, (hash(region) - 0.5) * 0.8, 0.5, 12), w, 0.2, { bark });
  }
}

/**
 * Wood under the paths: from each region's foot (its rung on the leader, the trunk's bark, the
 * roots' hub) every visible node gets one twig back towards it, the first link that reaches it,
 * so no path hangs in the air (Timo 2026-10-19). Links that close a loop, like the rings between
 * spokes, stay plain lines. The trunk's own paths are bark; the Masteries growing out of its
 * sides are boughs from its edge. The painted roots carry their nodes; only the deep ones below
 * them get thin roots. Notables and Keystones of the crown get leaves.
 */
export function drawTwigs(
  g: Graphics,
  unit: number,
  nodes: readonly SkillNode[],
  regionOf: (n: SkillNode) => TreeRegion | undefined,
  painted: { layer: Container; leaves: readonly Texture[] } | null = null,
): void {
  g.clear();
  if (painted) for (const old of painted.layer.removeChildren()) old.destroy();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const near = new Map<string, SkillNode[]>();
  const join = (a: SkillNode, b: SkillNode) => {
    if (regionOf(a) !== regionOf(b)) return;
    near.set(a.id, [...(near.get(a.id) ?? []), b]);
    near.set(b.id, [...(near.get(b.id) ?? []), a]);
  };
  for (const a of nodes) {
    for (const id of a.links) {
      const b = byId.get(id);
      if (b) join(a, b);
    }
  }
  // The feet: wood is there already.
  const bark = (n: SkillNode) => regionOf(n) === "trunk" && !n.prestigeBranch;
  const feet = nodes.filter((n) => LEADER.has(n.id) || bark(n) || n.id === ROOT_HUB);
  const reached = new Set(feet.map((n) => n.id));
  const queue = [...feet];
  // Each twig is at most as thick as the wood it grows out of, so a side branch never looks
  // stronger than its parent (Timo 2026-10-19: the Ward buds seemed to float).
  const thick = new Map<string, number>();
  // A tip whose path goes on further out keeps no leaves: they would hide where the twig starts.
  const grown = (n: SkillNode) => {
    const region = regionOf(n);
    if (!region) return false;
    const o = TREE_PLACEMENT[region].origin;
    const out = (p: Pt) => Math.hypot(p.x - o.x, p.y - o.y);
    return (near.get(n.id) ?? []).some((m) => out(m) > out(n) + 0.3);
  };
  const tips: { n: SkillNode; from: Pt }[] = [];
  for (let a = queue.shift(); a; a = queue.shift()) {
    const region = regionOf(a);
    if (!region) continue;
    const o = TREE_PLACEMENT[region].origin;
    // Thinner the further out; a bough on the trunk grows out from the trunk's axis.
    const out = (n: Pt) => (region === "trunk" ? Math.abs(n.x) : Math.hypot(n.x - o.x, n.y - o.y));
    const w = (d: number) => Math.max(0.05, 0.2 - d * 0.013) * (isRoot(region) ? 1.1 : 1);
    const wa = thick.get(a.id) ?? w(out(a));
    // Out of the nearest node first, so each twig takes the shortest way back.
    const next = [...(near.get(a.id) ?? [])]
      .filter((b) => !reached.has(b.id))
      .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    for (const b of next) {
      reached.add(b.id);
      queue.push(b);
      const wb = Math.max(0.04, Math.min(w(out(b)), wa * 0.85));
      thick.set(b.id, wb);
      // The rung's link to its hub runs along the bough.
      if (LEADER.has(a.id)) continue;
      if (isRoot(region) && painted && Math.max(a.y, b.y) < PAINTED_ROOTS_END) continue;
      // A Mastery on the trunk grows out of the bark's edge, not out of its anchor.
      const from = bark(a) ? { x: Math.sign(b.x - a.x) * trunkHalf(a.y) * 0.92, y: a.y } : a;
      limb(
        g,
        unit,
        bent(from, b, (hash(a.id + b.id) - 0.5) * 0.25, 0, 6),
        bark(a) ? w(out(from)) : wa,
        wb,
        { grooves: false, shadow: true },
      );
      if (!isRoot(region) && (b.kind === "notable" || b.kind === "keystone")) {
        tips.push({ n: b, from });
      }
    }
  }
  for (const { n, from } of tips) {
    if (grown(n)) continue;
    if (painted) sprigs(painted.layer, unit, n, from, painted.leaves);
    else leaves(g, unit, n, from);
  }
}

/** The painted sprigs point up and to the right at this angle (radians, y down). */
const SPRIG_ANGLE = -0.5;
/** Length of a painted sprig on the tree (tree units). */
const SPRIG_LENGTH = 1.3;

/** Two painted leaf sprigs beyond a crown tip, fanned to both sides. */
function sprigs(
  layer: Container,
  unit: number,
  n: SkillNode,
  from: Pt,
  textures: readonly Texture[],
): void {
  const dir = Math.atan2(n.y - from.y, n.x - from.x);
  for (const side of [-1, 1]) {
    const texture = textures[Math.floor(hash(`${n.id}${side}`) * textures.length)] ?? textures[0];
    if (!texture) continue;
    const s = new Sprite(texture);
    // The stem's foot sits at the node, a little out along the link.
    s.anchor.set(0.04, 0.85);
    const size = (SPRIG_LENGTH * (0.85 + hash(`${n.id}z${side}`) * 0.3) * unit) / texture.width;
    // Mirrored on one side, so the leaves fan out away from the link.
    s.scale.set(size, side * size);
    s.rotation = dir + side * (0.45 + hash(`${n.id}t${side}`) * 0.35) - side * SPRIG_ANGLE;
    s.position.set((n.x + Math.cos(dir) * 0.2) * unit, (n.y + Math.sin(dir) * 0.2) * unit);
    s.alpha = 0.92;
    layer.addChild(s);
  }
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
  const k = SIGIL_SCALE;
  return {
    rings: [0.9 * k, 0.68 * k],
    lines: [flame(1.15, 0.36, 0.55), flame(0.6, 0.17, 0.45), ...notches].map((line) =>
      line.map((p) => ({ x: p.x * k, y: p.y * k })),
    ),
  };
}

/**
 * The sigil carved into the trunk. On the painted base its bare patch is the cut, so only the
 * grooves are carved; on the code-drawn trunk the bark is cut away first.
 */
function carveSigil(sigil: Graphics, unit: number, at: Pt, painted: boolean): void {
  sigil.clear();
  if (!painted) cutBark(sigil, unit, at);
  const { rings, lines } = sigilLines();
  const path = sigilPath(unit, at, rings, lines);
  // Carved: a lit lower lip, the dark groove, and the ember in its floor.
  path(sigil, 0.02, 0.025, { color: 0xa88460, width: 6, alpha: 0.45 });
  path(sigil, 0, 0, { color: GROOVE, width: 6, alpha: 1 });
  path(sigil, 0, 0, { color: 0x5a1e08, width: 2.5, alpha: 1 });
}

/** The light in the sigil's grooves, and its wide strokes for the bloom. */
function lightSigil(glow: Graphics, bloom: Graphics, unit: number, at: Pt): void {
  const { rings, lines } = sigilLines();
  const path = sigilPath(unit, at, rings, lines);
  path(glow, 0, 0, { color: EMBER, width: 7, alpha: 0.35 });
  path(glow, 0, 0, { color: EMBER, width: 3, alpha: 0.9 });
  path(glow, 0, 0, { color: EMBER_CORE, width: 1.2, alpha: 0.9 });
  path(bloom, 0, 0, { color: EMBER, width: 12, alpha: 0.7 });
}

function sigilPath(unit: number, at: Pt, rings: number[], lines: Pt[][]) {
  const u = (v: number) => v * unit;
  return (
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
}

/** The bark cut away for the sigil: a round of lighter wood with a dark cut edge. */
function cutBark(sigil: Graphics, unit: number, at: Pt): void {
  const u = (v: number) => v * unit;
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
}

/** Paints the tree. Twigs are drawn separately (`drawTwigs`) because they follow the nodes. */
export function paintAshTree(unit: number): AshTreeArt {
  const earth = new Graphics();
  drawEarth(earth, unit);
  const wood = new Container();
  paintWood(wood, unit, null);
  const at = { x: 0, y: SIGIL_Y };
  const sigil = new Graphics();
  const sigilGlow = new Graphics();
  const sigilBloom = new Graphics();
  carveSigil(sigil, unit, at, false);
  lightSigil(sigilGlow, sigilBloom, unit, at);
  return {
    earth,
    wood,
    twigs: new Graphics(),
    leaves: new Container(),
    sigil,
    sigilGlow,
    sigilBloom,
    sigilAt: { x: at.x * unit, y: at.y * unit },
  };
}

/** Repaints the wood with Timo's painted material (or the code's own, without it). */
export function dressAshTree(art: AshTreeArt, unit: number, textures: AshTreeTextures): void {
  paintWood(art.wood, unit, textures);
  carveSigil(art.sigil, unit, { x: 0, y: SIGIL_Y }, true);
}

function paintWood(wood: Container, unit: number, textures: AshTreeTextures | null): void {
  for (const old of wood.removeChildren()) old.destroy();
  const bark = textures?.bark ?? null;
  const roots = new Graphics();
  // The painted trunk base brings its own roots.
  if (!textures) drawRoots(roots, unit, bark);
  const trunk = new Graphics();
  drawTrunk(trunk, unit, { x: 0, y: SIGIL_Y }, bark);
  const limbs = new Graphics();
  drawCrownLimbs(limbs, unit, bark);
  wood.addChild(roots, limbs, trunk);
  if (textures) {
    // The painted foot of the trunk, its bare patch around the sigil.
    const base = new Sprite(textures.base);
    base.anchor.set(BASE.patchX / textures.base.width, BASE.patchY / textures.base.height);
    base.scale.set(unit / BASE.perUnit);
    base.position.set(0, SIGIL_Y * unit);
    // Toned to meet the bark tile above it.
    base.tint = BASE_TINT;
    wood.addChild(base);
  }
}
