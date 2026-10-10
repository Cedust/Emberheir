import type { Graphics } from "pixi.js";

/**
 * Adds an open arc as its own path: a moveTo to its first point, then straight segments.
 *
 * Pixi's own arc() is unsafe for strokes here: started without a moveTo it continues from the
 * last path's end (NaN after an arc), and with a moveTo to its first point the doubled point
 * makes NaN stroke vertices. A GPU draws NaN vertices as long stray lines.
 */
export function arcPath(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
): Graphics {
  // A zero-length arc (a slash on its first frame) would be all doubled points.
  if (r <= 0 || Math.abs(to - from) < 1e-3) return g;
  const steps = Math.max(2, Math.ceil((Math.abs(to - from) * Math.max(r, 4)) / 6));
  g.moveTo(cx + Math.cos(from) * r, cy + Math.sin(from) * r);
  for (let i = 1; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return g;
}

/**
 * A polygon's points without doubled neighbours (a blade tip where both edges meet, a closing
 * point equal to the first). Pixi strokes a doubled point with NaN vertices: stray lines.
 */
export function cleanPoly(points: readonly number[], closed = true): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    const n = out.length;
    if (n >= 2 && Math.abs((out[n - 2] ?? 0) - x) < 1e-6 && Math.abs((out[n - 1] ?? 0) - y) < 1e-6)
      continue;
    out.push(x, y);
  }
  if (closed && out.length >= 4) {
    const n = out.length;
    if (
      Math.abs((out[0] ?? 0) - (out[n - 2] ?? 0)) < 1e-6 &&
      Math.abs((out[1] ?? 0) - (out[n - 1] ?? 0)) < 1e-6
    )
      out.length = n - 2;
  }
  return out;
}
