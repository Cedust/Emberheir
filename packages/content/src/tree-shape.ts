import type { SkillNode, SkillTreeRegion } from "@emberheir/sim";

/**
 * The Ash Tree: the web is generated as a ring (`skill-web.ts`, polar around the middle), then
 * each crown region is set onto the tree as one piece. The seven crown regions sit at the ends of
 * boughs that leave the trunk and its leader at different heights, the outer ones lowest, Flame
 * at the top (Timo 2026-10-19: a tree, no ferris wheel). Each region's inner travel node sits on
 * the leader where its bough leaves it, so the regions meet there like rungs of a ladder.
 * The trunk and the roots are laid out by hand (`TRUNK_AND_ROOTS`): the trunk's nodes inside the
 * trunk, the roots' on the painted roots of the trunk base, and no path through the sigil.
 * Masteries move with the region of their anchor; those on the trunk grow out of its sides as
 * its lowest boughs.
 */

/** Where the trunk ends: the root collar (bottom) and the top of the trunk. */
export const TRUNK = { bottom: 3.4, top: -9 } as const;

/** Where the Ember sigil sits in the trunk's foot, and its size (tree units). */
export const SIGIL = { x: 0, y: 1.3, radius: 1.13 } as const;

/** Half width of the trunk by height: (y, half width), from the foot up. */
const TRUNK_PROFILE: readonly (readonly [number, number])[] = [
  [TRUNK.bottom, 3.2],
  [1, 3],
  [-1, 2.85],
  [-2.4, 2.65],
  [-4, 2.35],
  [-6, 1.9],
  [-8, 1.4],
  [TRUNK.top, 1.15],
];

/** Half width of the trunk at height `y` (tree units); the painted trunk base matches it. */
export function trunkHalf(y: number): number {
  for (let i = 1; i < TRUNK_PROFILE.length; i++) {
    const [y0, w0] = TRUNK_PROFILE[i - 1] ?? [0, 1];
    const [y1, w1] = TRUNK_PROFILE[i] ?? [0, 1];
    if (y >= y1) return w0 + ((w1 - w0) * (y0 - Math.min(y, y0))) / (y0 - y1);
  }
  return TRUNK_PROFILE[TRUNK_PROFILE.length - 1]?.[1] ?? 1;
}

/**
 * The trunk's and the roots' nodes, by hand. The trunk: its hub at the top, three paths down,
 * the Keystone path and the Ward bud along its sides past the sigil. The roots: the hub on the
 * left root (so the path from Iron Will passes the sigil), the paths out along the painted roots,
 * the deep Keystones on thin roots further down.
 */
const TRUNK_AND_ROOTS: Readonly<Record<string, readonly [number, number]>> = {
  "trunk-sinew": [-0.75, -7.3],
  "trunk-heartwood": [0, -8.05],
  "trunk-plating": [-0.95, -6.3],
  "trunk-stalwart": [-1.3, -5.3],
  "trunk-fortress": [-1.6, -4.3],
  "trunk-unbreakable": [-2.05, -3.2],
  "trunk-retaliation": [-1.0, -3.2],
  "trunk-iron-hide": [0, -6.1],
  "trunk-resolve": [0, -5.1],
  "trunk-ashguard": [0, -4.1],
  "trunk-iron-will": [0, -2.9],
  "trunk-bulwark": [0.95, -6.3],
  "trunk-iron-bastion": [1.3, -5.3],
  "trunk-stone-skin": [1.6, -4.3],
  "trunk-shield-wall": [2.05, -3.2],
  "trunk-shield-bash": [1.0, -3.2],
  "trunk-old-bark": [1.95, -2.1],
  "trunk-deep-grain": [2.1, -1.05],
  "trunk-juggernaut": [2.2, 0.1],
  "trunk-scar-tissue": [-1.95, -2.1],
  "trunk-bark-skin": [-2.15, -1.05],
  "trunk-old-growth": [-2.35, 0.0],
  "trunk-stoneskin": [-2.55, 1.1],
  "trunk-rune-socket": [-0.95, -2.0],
  "roots-taproot": [-2.4, 3.7],
  "roots-root-warmth": [-3.3, 3.0],
  "roots-kiln-wall": [-2.7, 4.6],
  "roots-steady-breath": [-2.65, 5.6],
  "roots-hearth-blood": [-3.55, 6.35],
  "roots-stoked": [-4.6, 7.25],
  "roots-ember-vein": [-4.6, 4.7],
  "roots-rune-socket": [-3.9, 3.9],
  "roots-side-step": [-5.6, 5.2],
  "roots-wiry": [-6.6, 5.7],
  "roots-shadow-dancer": [-7.6, 6.1],
  "roots-steady-pulse": [-1.5, 4.5],
  "roots-warm-hide": [-1.1, 5.5],
  "roots-first-light": [-0.6, 6.4],
  "roots-refund": [-1.2, 7.4],
  "roots-battle-trance": [0.3, 7.2],
  "roots-deep-roots": [0.0, 8.2],
  "roots-long-count": [0.6, 9.0],
  "roots-grand-strategy": [1.2, 9.9],
  "roots-lodestone": [-1.2, 8.5],
  "roots-echo-root": [-1.8, 9.4],
  "roots-upflow": [-2.4, 10.2],
  "roots-arcane-conduit": [-3.0, 11.1],
  "roots-battle-scars": [0.4, 4.7],
  "roots-rally": [1.4, 5.4],
  "roots-grudge": [2.3, 6.1],
  "roots-unbroken": [3.2, 6.8],
  "roots-swift-recovery": [4.2, 7.3],
  "roots-scarred": [5.1, 7.7],
  "roots-glass-focus": [6.1, 8.1],
};

/** Where a node of the trunk or the roots sits, if it is laid out by hand. */
export const fixedSpot = (id: string): { x: number; y: number } | undefined => {
  const at = TRUNK_AND_ROOTS[id];
  return at ? { x: at[0], y: at[1] } : undefined;
};

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

/** Rungs on the leader sit this far left and right of its middle. */
const LEADER_SPREAD = 0.4;

/** A crown region's spot on the leader: where its bough leaves it. */
export function onLeader(region: TreeRegion): { x: number; y: number } {
  const place = TREE_PLACEMENT[region];
  const side = Math.sign(Math.round(Math.cos((place.angle * Math.PI) / 180) * 100));
  return { x: side * LEADER_SPREAD, y: place.origin.y };
}

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
/** How far past the trunk's bark the first node of such a bough sits. */
const LIMB_OUT = 1.2;

/**
 * Sets every node onto the tree. `leader` names each crown region's inner travel node, which
 * sits on the leader. Prestige branch nodes follow the region of their anchor; on the trunk
 * they become a bough that grows out sideways from the anchor, to the anchor's side.
 */
export function plantTree(
  nodes: readonly SkillNode[],
  branches: Readonly<Record<string, BranchPlacement>>,
  leader: Readonly<Record<string, TreeRegion>>,
): SkillNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const spot = (n: SkillNode): { x: number; y: number } | undefined => {
    const rung = leader[n.id];
    if (rung) return onLeader(rung);
    const fixed = fixedSpot(n.id);
    if (fixed) return fixed;
    const region = n.region;
    if (!region || region === "core") return undefined;
    return onTree(n, region);
  };
  return nodes.map((n) => {
    const branch = n.prestigeBranch ? branches[n.prestigeBranch] : undefined;
    const anchor = branch ? byId.get(branch.anchor) : undefined;
    if (branch && anchor) {
      const region = anchor.region;
      if (!region || region === "core") return n;
      const root = spot(anchor);
      if (region === "trunk" && root) return { ...n, ...onBough(n, branch, root) };
      return { ...n, ...onTree(n, region) };
    }
    const at = spot(n);
    return at ? { ...n, ...at } : n;
  });
}

/** A trunk Mastery's node, set onto a bough out of its anchor (`root`, already on the tree). */
function onBough(
  point: { readonly x: number; readonly y: number },
  branch: BranchPlacement,
  root: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  const ring = (branch.angle * Math.PI) / 180;
  const along = point.x * Math.cos(ring) + point.y * Math.sin(ring) - branch.start;
  const across = -point.x * Math.sin(ring) + point.y * Math.cos(ring);
  const left = root.x < 0;
  const a = ((left ? 180 + LIMB_RISE : -LIMB_RISE) * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  // Mirrored on the left side, so the bough's upper edge stays on top.
  const side = left ? -across : across;
  const out = trunkHalf(root.y) - Math.abs(root.x) + LIMB_OUT + along;
  return {
    x: round(root.x + dx * out - dy * side),
    y: round(root.y + dy * out + dx * side),
  };
}
