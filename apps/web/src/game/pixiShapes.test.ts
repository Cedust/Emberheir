import { buildContextBatches, Graphics } from "pixi.js";
import { describe, expect, it } from "vitest";
import { arcPath } from "./pixiShapes";

/** Non-finite stroke vertices: a GPU draws them as stray lines across the canvas. */
function badVertices(g: Graphics): number {
  const gpu = { geometryData: { vertices: [], uvs: [], indices: [] }, batches: [] };
  buildContextBatches(g.context, gpu as unknown as Parameters<typeof buildContextBatches>[1]);
  return (gpu.geometryData.vertices as number[]).filter((v) => !Number.isFinite(v)).length;
}

describe("arcPath", () => {
  it("strokes arc after arc without invalid vertices", () => {
    const g = new Graphics();
    arcPath(g, 10, 10, 6, 0, Math.PI * 1.4).stroke({ color: 0xffffff, width: 2 });
    arcPath(g, 10, 10, 90, -1.2, 1.2).stroke({ color: 0xffffff, width: 11 });
    arcPath(g, 10, 10, 300, 2, 3).stroke({ color: 0xffffff, width: 12 });
    arcPath(g, 10, 10, 90, -1.2, -1.2).stroke({ color: 0xffffff, width: 11 });
    expect(badVertices(g)).toBe(0);
  });

  it("is what Pixi's own arc gets wrong", () => {
    const g = new Graphics();
    g.moveTo(16, 10).arc(10, 10, 6, 0, 4).stroke({ color: 0xffffff, width: 2 });
    expect(badVertices(g)).toBeGreaterThan(0);
  });
});
