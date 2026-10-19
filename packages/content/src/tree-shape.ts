import type { SkillNode, SkillTreeRegion } from "@emberheir/sim";

/**
 * The Ash Tree: the web is generated as a ring (`skill-web.ts`, polar around the middle), then
 * each region is set onto the tree as one piece. The seven crown regions sit at the ends of boughs
 * that leave the trunk and its leader at different heights, the outer ones lowest, Flame at the
 * top (Timo 2026-10-19: a tree, no ferris wheel); the trunk region runs down the trunk, and the
 * roots grow down from the root collar into the earth. Masteries move with the region of their
 * anchor; those on the trunk grow out of its sides as its lowest boughs.
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
  /** How far the region sits out along `angle`, at the end of its bough. */
  readonly reach?: number;
}

/** The middle of the crown: the top of the trunk. */
const CROWN = { x: 0, y: TRUNK.top };
/**
 * A crown region: its ring angle, the direction of its bough, how high above the trunk's top the
 * bough leaves the leader, and how far out it reaches.
 */
const crown = (ring: number, angle: number, height: number, reach: number): Placement => ({
  ring,
  origin: { x: 0, y: CROWN.y - height },
  angle,
  scale: 1,
  reach,
});

export const TREE_PLACEMENT: Readonly<Record<TreeRegion, Placement>> = {
  steel: crown(150, 195, 0, 4),
  blood: crown(190, 218, 3, 4),
  venom: crown(230, 242, 6, 3.5),
  flame: crown(270, 270, 8, 3.5),
  storm: crown(310, 298, 6, 3.5),
  frost: crown(350, 322, 3, 4),
  void: crown(30, 345, 0, 4),
  trunk: { ring: 90, origin: CROWN, angle: 90, scale: 1 },
  roots: { ring: 90, origin: { x: 0, y: TRUNK.bottom }, angle: 90, scale: 1 },
};

const round = (v: number) => Math.round(v * 100) / 100;

/** Moves a point of the ring layout that belongs to `region` onto the Ash Tree. */
export function onTree(
  point: { readonly x: number; readonly y: number },
  region: TreeRegion,
): { x: number; y: number } {
  const place = TREE_PLACEMENT[region];
  // In the ring's own frame: along the region's direction and across it.
  const ring = (place.ring * Math.PI) / 180;
  const along = point.x * Math.cos(ring) + point.y * Math.sin(ring);
  const across = -point.x * Math.sin(ring) + point.y * Math.cos(ring);
  const a = (place.angle * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const out = (place.reach ?? 0) + along * place.scale;
  const side = across * place.scale;
  return {
    x: round(place.origin.x + dx * out - dy * side),
    y: round(place.origin.y + dy * out + dx * side),
  };
}

/** A Mastery as the tree needs it: where it hangs on the web and its direction on the ring. */
export interface BranchPlacement {
  readonly anchor: string;
  readonly angle: number;
  /** Distance of the branch's entry node from the middle of the ring. */
  readonly start: number;
}

/** Masteries on the trunk grow out sideways as its lowest boughs, rising a little. */
const LIMB_RISE = 12;
/** Gap between a trunk node and the first node of the bough growing out of it. */
const LIMB_GAP = 1.6;

/**
 * Sets every node onto the tree. Prestige branch nodes follow the region of their anchor; on the
 * trunk they become a bough that grows out sideways from the anchor, to the anchor's side.
 */
export function plantTree(
  nodes: readonly SkillNode[],
  branches: Readonly<Record<string, BranchPlacement>>,
): SkillNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((n) => {
    const branch = n.prestigeBranch ? branches[n.prestigeBranch] : undefined;
    const anchor = branch ? byId.get(branch.anchor) : undefined;
    const region = n.region ?? anchor?.region;
    if (!region || region === "core") return n;
    if (branch && anchor && region === "trunk") return { ...n, ...onBough(n, branch, anchor) };
    return { ...n, ...onTree(n, region) };
  });
}

/** A trunk Mastery's node, set onto a bough out of its anchor (`region` trunk). */
function onBough(
  point: { readonly x: number; readonly y: number },
  branch: BranchPlacement,
  anchor: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  const ring = (branch.angle * Math.PI) / 180;
  const along = point.x * Math.cos(ring) + point.y * Math.sin(ring) - branch.start;
  const across = -point.x * Math.sin(ring) + point.y * Math.cos(ring);
  const root = onTree(anchor, "trunk");
  const left = root.x < 0;
  const a = ((left ? 180 + LIMB_RISE : -LIMB_RISE) * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  // Mirrored on the left side, so the bough's upper edge stays on top.
  const side = left ? -across : across;
  const out = LIMB_GAP + along;
  return {
    x: round(root.x + dx * out - dy * side),
    y: round(root.y + dy * out + dx * side),
  };
}
