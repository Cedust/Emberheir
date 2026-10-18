import type { SkillNode, SkillTreeRegion } from "@emberheir/sim";

/**
 * The Ash Tree: the web is generated as a ring (`skill-web.ts`, polar around the middle), then
 * each region is set onto the tree as one rigid piece. The seven crown regions keep their places
 * on the ring around the top of the trunk; the trunk region grows down the trunk from the middle
 * of the crown, and the roots grow down from the root collar into the earth. Masteries move with
 * the region of their anchor.
 */

/** Where the trunk ends: the root collar (bottom) and the top of the trunk. */
export const TRUNK = { bottom: 3.4, top: -9 } as const;

/** The regions of the web (the core is not a region). */
export type TreeRegion = Exclude<SkillTreeRegion, "core">;

interface Placement {
  /** The region's angle on the ring (0° = right, 90° = down). */
  readonly ring: number;
  /** Where the middle of the region's ring sits on the tree. */
  readonly origin: { readonly x: number; readonly y: number };
  /** The direction the region grows on the tree. */
  readonly angle: number;
  /** Size on the tree. */
  readonly scale: number;
}

/** The middle of the crown: the top of the trunk. */
const CROWN = { x: 0, y: TRUNK.top };
const crown = (ring: number): Placement => ({ ring, origin: CROWN, angle: ring, scale: 1.1 });

export const TREE_PLACEMENT: Readonly<Record<TreeRegion, Placement>> = {
  steel: crown(150),
  blood: crown(190),
  venom: crown(230),
  flame: crown(270),
  storm: crown(310),
  frost: crown(350),
  void: crown(30),
  trunk: crown(90),
  roots: { ring: 90, origin: { x: 0, y: TRUNK.bottom }, angle: 90, scale: 1 },
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
