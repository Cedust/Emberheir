import { Container, FillGradient, Graphics } from "pixi.js";

/**
 * The painted weapons of the Weapon Mastery view: every class weapon drawn in code, lying along
 * the x axis from its pommel (x = 0) to its tip (x = length). Layered gradients, rim light and
 * engraving lines give a painted look; the scene rotates, lights and animates them.
 */

export interface WeaponArt {
  /** The painted weapon. */
  readonly body: Container;
  /** Outline of the cutting or striking parts, for the grade's edge glow. */
  readonly edge: Graphics;
  /** The whole silhouette (for the cast shadow and the Echo's ghost). */
  readonly silhouette: () => Graphics;
  /** Distance of the weapon's centre line from the axis at `t` (0..1), for the Refine hotspots. */
  readonly anchorY: (t: number) => number;
}

type Stops = readonly string[];

const STEEL: Stops = ["#2c3138", "#9aa3ae", "#eef2f6", "#7d8590", "#262a30"];
const DARK_IRON: Stops = ["#18191c", "#5a6069", "#a3aab4", "#3e434b", "#121316"];
const BRONZE: Stops = ["#2a180a", "#a8732e", "#f0c77a", "#8a5a22", "#2a180a"];
const LEATHER: Stops = ["#1c100a", "#4a2a18", "#7a4a2c", "#3e2414", "#140b06"];
const WOOD: Stops = ["#1e1209", "#5a3a1e", "#9a6a3a", "#4e321a", "#1a1008"];
const BONE: Stops = ["#3a3226", "#b8aa8a", "#efe4c8", "#9a8c6c", "#2e281e"];

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
function band(g: Graphics, x: number, w: number, width = 10, stops: Stops = BRONZE): void {
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

interface Part {
  readonly poly: readonly number[];
  readonly fill: FillGradient | number;
  /** Counts for the edge glow. */
  readonly edge?: boolean;
  readonly rim?: readonly number[];
}

function assemble(
  parts: readonly Part[],
  details: (g: Graphics) => void,
  anchorY: (t: number) => number,
): WeaponArt {
  const body = new Container();
  const paint = new Graphics();
  for (const p of parts) {
    paint.poly([...p.poly]).fill(p.fill);
    paint.poly([...p.poly]).stroke({ color: 0x0b0705, width: 2.5, alpha: 0.9 });
    if (p.rim) rim(paint, p.rim);
  }
  details(paint);
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
  return { body, edge, silhouette, anchorY };
}

// --- the weapons -----------------------------------------------------------------------------

function sword(L: number): WeaponArt {
  const blade = [L * 0.23, -22, L * 0.86, -17, L, 0, L * 0.86, 17, L * 0.23, 22];
  return assemble(
    [
      { poly: [34, -11, L * 0.2, -11, L * 0.2, 11, 34, 11], fill: grad(LEATHER) },
      { poly: blade, fill: grad(STEEL), edge: true, rim: [L * 0.23, -22, L * 0.86, -17, L, 0] },
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
        fill: grad(BRONZE, false),
        rim: [L * 0.2, -74, L * 0.24, -70],
      },
    ],
    (g) => {
      wrap(g, 34, L * 0.2, 11);
      // Fuller and the light along the blade.
      g.roundRect(L * 0.26, -4, L * 0.52, 8, 4).fill({ color: 0x1a1d22, alpha: 0.55 });
      g.moveTo(L * 0.25, -12)
        .lineTo(L * 0.84, -9)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.4 });
      g.circle(20, 0, 20).fill(grad(BRONZE));
      g.circle(20, 0, 20).stroke({ color: 0x0b0705, width: 2.5 });
      gem(g, 20, 0, 8, 0xd0302a);
      gem(g, L * 0.218, 0, 7, 0xd0302a);
    },
    () => 0,
  );
}

function dagger(L: number): WeaponArt {
  // Leaf blade, a little curved.
  const r = ribbon(
    L * 0.62,
    24,
    (t) => -Math.sin(t * Math.PI) * 10,
    (t) => (t < 0.35 ? 22 + t * 60 : 43 * Math.pow(Math.max(0, 1 - t) / 0.65, 0.8)),
  );
  const blade = r.poly.map((v, i) => (i % 2 === 0 ? v + L * 0.38 : v));
  const upper = r.upper.map((v, i) => (i % 2 === 0 ? v + L * 0.38 : v));
  return assemble(
    [
      { poly: [30, -13, L * 0.33, -11, L * 0.33, 11, 30, 13], fill: grad(BONE) },
      { poly: blade, fill: grad(STEEL), edge: true, rim: upper },
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
        fill: grad(BRONZE, false),
      },
    ],
    (g) => {
      for (let x = 40; x < L * 0.32; x += 16) {
        g.moveTo(x, -12).lineTo(x, 12).stroke({ color: 0x2e281e, width: 2, alpha: 0.6 });
      }
      g.moveTo(L * 0.4, -4).bezierCurveTo(L * 0.55, -14, L * 0.75, -12, L * 0.92, -6);
      g.stroke({ color: 0xffffff, width: 2, alpha: 0.35 });
      g.circle(18, 0, 17).fill(grad(BRONZE));
      g.circle(18, 0, 17).stroke({ color: 0x0b0705, width: 2.5 });
      gem(g, 18, 0, 7, 0x6ad04a);
    },
    (t) => (t > 0.38 ? -Math.sin(((t - 0.38) / 0.62) * Math.PI) * 10 : 0),
  );
}

function mace(L: number): WeaponArt {
  const hx = L * 0.8;
  const flanges: Part[] = [];
  for (const side of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      const x = hx + k * 34;
      flanges.push({
        poly: [x - 20, side * 30, x - 8, side * 82, x + 14, side * 86, x + 18, side * 30],
        fill: grad(DARK_IRON),
        edge: true,
      });
    }
  }
  return assemble(
    [
      { poly: [0, -12, hx, -12, hx, 12, 0, 12], fill: grad(WOOD) },
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
        fill: grad(DARK_IRON),
        edge: true,
        rim: [hx - 70, -38, hx + 60, -40, hx + 80, -16, L, 0],
      },
    ],
    (g) => {
      g.roundRect(28, -14, L * 0.22, 28, 4).fill(grad(LEATHER));
      wrap(g, 28, 28 + L * 0.22, 14);
      band(g, 28 + L * 0.22, 13, 12);
      band(g, L * 0.5, 12, 10);
      band(g, hx - 76, 16, 14);
      for (const k of [-1, 0, 1]) gem(g, hx + k * 36, 0, 7, 0xe0b45a);
      g.circle(14, 0, 18).fill(grad(BRONZE));
      g.circle(14, 0, 18).stroke({ color: 0x0b0705, width: 2.5 });
    },
    () => 0,
  );
}

function axe(L: number): WeaponArt {
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
  return assemble(
    [
      { poly: [0, -12, L * 0.93, -10, L * 0.93, 10, 0, 12], fill: grad(WOOD) },
      { poly: blade, fill: grad(STEEL), edge: true },
      {
        poly: [hx - 36, -18, hx + 38, -18, hx + 34, 22, hx - 32, 22],
        fill: grad(DARK_IRON),
        rim: [hx - 36, -18, hx + 38, -18],
      },
      {
        poly: [hx - 16, -18, hx - 4, -72, hx + 10, -78, hx + 18, -18],
        fill: grad(DARK_IRON),
        edge: true,
      },
      { poly: [L * 0.93, -10, L, 0, L * 0.93, 10], fill: grad(STEEL), edge: true },
    ],
    (g) => {
      g.roundRect(26, -14, L * 0.22, 28, 4).fill(grad(LEATHER));
      wrap(g, 26, 26 + L * 0.22, 14);
      // Grain of the haft, the bevel of the blade.
      g.moveTo(L * 0.3, -3).bezierCurveTo(L * 0.45, -6, L * 0.6, 2, hx - 40, -2);
      g.stroke({ color: 0x1a1008, width: 1.5, alpha: 0.6 });
      g.moveTo(hx + 54, 44)
        .lineTo(hx + 84, 128)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.45 });
      g.moveTo(hx - 10, 76).bezierCurveTo(hx + 10, 100, hx + 40, 110, hx + 70, 120);
      g.stroke({ color: 0x1a1d22, width: 2, alpha: 0.5 });
      band(g, 26 + L * 0.22, 13, 12);
      g.circle(hx, 2, 7).fill(grad(BRONZE));
    },
    () => 0,
  );
}

function bow(L: number): WeaponArt {
  const bulge = 70;
  const center = (t: number) => bulge * (1 - 4 * t * (1 - t)) - bulge * 0.5;
  const r = ribbon(L, 40, center, (t) => 5 + 9 * (1 - Math.abs(2 * t - 1)));
  const tip = center(0);
  return assemble(
    [{ poly: r.poly, fill: grad(WOOD, false), edge: true, rim: r.upper }],
    (g) => {
      // String, grip wrap, horn nocks.
      g.moveTo(4, tip)
        .lineTo(L - 4, tip)
        .stroke({ color: 0xe8e2d6, width: 2, alpha: 0.85 });
      const gy = center(0.5);
      g.roundRect(L * 0.44, gy - 16, L * 0.12, 32, 5).fill(grad(LEATHER));
      wrap(g, L * 0.44, L * 0.56, 15);
      for (const x of [0, L]) gem(g, x, tip, 7, 0xe0b45a);
      // An arrow on the string, ready.
      g.moveTo(L * 0.5, tip)
        .lineTo(L * 0.5, gy - 60)
        .stroke({ color: 0x8a6a40, width: 4 });
      g.poly([L * 0.5, gy - 78, L * 0.5 - 9, gy - 58, L * 0.5 + 9, gy - 58]).fill(grad(STEEL));
      g.poly([L * 0.5, tip - 4, L * 0.5 - 10, tip + 18, L * 0.5, tip + 10, L * 0.5 + 10, tip + 18]);
      g.fill(0xc8423a);
    },
    center,
  );
}

function crossbow(L: number): WeaponArt {
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
  return assemble(
    [
      {
        poly: [0, -26, 70, -18, L * 0.82, -14, L * 0.82, 14, 70, 18, 0, 34],
        fill: grad(WOOD),
        rim: [0, -26, 70, -18, L * 0.82, -14],
      },
      { poly: toProd(prod.poly), fill: grad(STEEL, false), edge: true },
      {
        poly: [L * 0.55, -6, L * 0.95, -5, L, 0, L * 0.95, 5, L * 0.55, 6],
        fill: grad(STEEL),
        edge: true,
      },
    ],
    (g) => {
      // String to the latch, trigger, fittings.
      g.moveTo(px - 20, -170)
        .lineTo(L * 0.48, 0)
        .lineTo(px - 20, 170);
      g.stroke({ color: 0xe8e2d6, width: 2, alpha: 0.85 });
      g.poly([L * 0.36, 14, L * 0.38, 48, L * 0.4, 46, L * 0.4, 14]).fill(grad(DARK_IRON));
      band(g, L * 0.5, 15, 14, DARK_IRON);
      band(g, px - 20, 16, 22, DARK_IRON);
      g.poly([L * 0.55, -6, L * 0.52, -14, L * 0.57, -6]).fill(0xc8423a);
      g.moveTo(L * 0.1, -8).bezierCurveTo(L * 0.3, -12, L * 0.5, -4, L * 0.7, -8);
      g.stroke({ color: 0x1a1008, width: 1.5, alpha: 0.6 });
    },
    () => 0,
  );
}

function wand(L: number, accent: number): WeaponArt {
  const rod = ribbon(
    L * 0.8,
    20,
    (t) => Math.sin(t * 9) * 2,
    (t) => 13 - t * 5,
  );
  const cx = L * 0.88;
  return assemble(
    [
      { poly: rod.poly, fill: grad(WOOD), rim: rod.upper },
      {
        poly: [cx - 46, 0, cx - 8, -26, cx + 54, 0, cx - 8, 26],
        fill: grad(["#140b06", hex(accent), "#ffffff", hex(accent), "#140b06"]),
        edge: true,
      },
    ],
    (g) => {
      // Spiral carving, bronze collars, claws around the crystal.
      for (let x = 30; x < L * 0.76; x += 22) {
        g.moveTo(x, -10).bezierCurveTo(x + 8, -4, x + 4, 6, x + 14, 10);
        g.stroke({ color: 0x1a1008, width: 2, alpha: 0.55 });
      }
      band(g, L * 0.3, 12, 10);
      band(g, L * 0.78, 10, 14);
      for (const s of [-1, 1]) {
        g.moveTo(L * 0.79, s * 8).bezierCurveTo(cx - 40, s * 34, cx - 10, s * 36, cx + 6, s * 22);
        g.stroke({ color: 0xa8732e, width: 4 });
      }
      g.moveTo(cx - 40, -2)
        .lineTo(cx + 40, -2)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      g.circle(12, 0, 14).fill(grad(BRONZE));
    },
    (t) => (t < 0.8 ? Math.sin((t / 0.8) * 9) * 2 : 0),
  );
}

function staff(L: number, accent: number): WeaponArt {
  const shaft = ribbon(
    L * 0.84,
    32,
    (t) => Math.sin(t * 7) * 5 + Math.sin(t * 17) * 2,
    (t) => 11 + Math.sin(t * 23) * 2 + (t > 0.85 ? (t - 0.85) * 60 : 0),
  );
  const ox = L * 0.92;
  return assemble(
    [{ poly: shaft.poly, fill: grad(WOOD), rim: shaft.upper }],
    (g) => {
      // Knots, wraps, the claw and the orb.
      for (const t of [0.18, 0.42, 0.63]) g.ellipse(L * 0.84 * t, -6, 7, 4).fill(0x2a1a0e);
      g.roundRect(L * 0.24, -14, L * 0.1, 28, 4).fill(grad(LEATHER));
      wrap(g, L * 0.24, L * 0.34, 14);
      for (const s of [-1, 1]) {
        g.moveTo(L * 0.84, s * 8)
          .bezierCurveTo(ox - 40, s * 66, ox + 40, s * 70, ox + 40, s * 22)
          .stroke({ color: 0x3a2412, width: 10 });
        g.moveTo(L * 0.84, s * 8)
          .bezierCurveTo(ox - 40, s * 66, ox + 40, s * 70, ox + 40, s * 22)
          .stroke({ color: 0x8a5a30, width: 3, alpha: 0.7 });
      }
      gem(g, ox, 0, 36, accent);
      g.circle(10, 0, 14).fill(grad(BRONZE));
    },
    (t) => (t < 0.84 ? Math.sin((t / 0.84) * 7) * 5 : 0),
  );
}

/** The painted weapon of a weapon id, `length` pixels long. */
export function drawWeapon(weaponId: string, length: number, accent: number): WeaponArt {
  switch (weaponId) {
    case "dagger":
      return dagger(length);
    case "mace":
      return mace(length);
    case "axe":
      return axe(length);
    case "bow":
      return bow(length);
    case "crossbow":
      return crossbow(length);
    case "fire-wand":
      return wand(length, accent);
    case "staff":
      return staff(length, accent);
    default:
      return sword(length);
  }
}
