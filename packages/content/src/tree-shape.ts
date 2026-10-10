import type { SkillNode, SkillTreeRegion } from "@emberheir/sim";

/**
 * The Ash Tree: the web is generated as a ring of eight regions (`skill-web.ts`, polar around the
 * middle), then each region is lifted off the ring and set onto a tree as one rigid piece. The
 * five upper regions branch off the trunk at different heights and form the crown, the three
 * lower ones grow down as roots. Prestige branches move with the region of their anchor. The
 * links between neighbouring regions stay, so the inner ring runs up and down the trunk.
 */

/** Where the trunk ends: the root collar (bottom) and the top of the trunk. */
export const TRUNK = { bottom: 2.2, top: -6.6 } as const;

/** The eight regions of the web (the core is not a region). */
export type TreeRegion = Exclude<SkillTreeRegion, "core">;

interface Placement {
  /** The region's angle on the ring (0° = right, 90° = down). */
  readonly ring: number;
  /** Where the region's middle sits on the tree. */
  readonly origin: { readonly x: number; readonly y: number };
  /** The direction the region grows on the tree. */
  readonly angle: number;
  /** Size on the tree: the crown spreads wide, the roots stay a little tighter. */
  readonly scale: number;
}

export const TREE_PLACEMENT: Readonly<Record<TreeRegion, Placement>> = {
  "might-arcana": { ring: -90, origin: { x: 0, y: -6.6 }, angle: -90, scale: 1.1 },
  might: { ring: -135, origin: { x: -0.5, y: -5.4 }, angle: -128, scale: 1.1 },
  arcana: { ring: -45, origin: { x: 0.5, y: -5.4 }, angle: -52, scale: 1.1 },
  "rupture-might": { ring: 180, origin: { x: -0.9, y: -3.6 }, angle: -162, scale: 1.1 },
  "arcana-affliction": { ring: 0, origin: { x: 0.9, y: -3.6 }, angle: -18, scale: 1.1 },
  rupture: { ring: 135, origin: { x: -0.6, y: 2 }, angle: 152, scale: 0.85 },
  affliction: { ring: 45, origin: { x: 0.6, y: 2 }, angle: 28, scale: 0.85 },
  "affliction-rupture": { ring: 90, origin: { x: 0, y: 2.4 }, angle: 90, scale: 0.85 },
};

const round = (v: number) => Math.round(v * 100) / 100;

/** Moves a point of the ring layout that belongs to `region` onto the Ash Tree. */
export function onTree(
  point: { readonly x: number; readonly y: number },
  region: TreeRegion,
): { x: number; y: number } {
  const place = TREE_PLACEMENT[region];
  const turn = ((place.angle - place.ring) * Math.PI) / 180;
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const k = place.scale;
  return {
    x: round(place.origin.x + (point.x * c - point.y * s) * k),
    y: round(place.origin.y + (point.x * s + point.y * c) * k),
  };
}

/** Sets every node onto the tree; Prestige branch nodes follow the region of their anchor. */
export function plantTree(
  nodes: readonly SkillNode[],
  anchors: Readonly<Record<string, string>>,
): SkillNode[] {
  const regionOf = new Map(nodes.map((n) => [n.id, n.region]));
  return nodes.map((n) => {
    const anchor = n.prestigeBranch ? anchors[n.prestigeBranch] : undefined;
    const region = n.region ?? (anchor ? regionOf.get(anchor) : undefined);
    return region && region !== "core" ? { ...n, ...onTree(n, region) } : n;
  });
}
