import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import armUrl from "./heir/heir-arm.webp";
import bodyUrl from "./heir/heir-body.webp";
import thumbUrl from "./heir/heir-thumb.webp";

/**
 * The painted Heir (an otter) as a cutout rig: the body and the weapon forearm are two parts of
 * one painting (/mnt/project-files/art/heir/heir-master-v2.png), cut apart by
 * `tools/art/cut_heir.py`. The code-drawn weapon lies over the fist and under the thumb, which
 * is cut out once more and drawn on top, and the forearm turns at the elbow.
 */

export interface HeirTextures {
  readonly body: Texture;
  readonly arm: Texture;
  readonly thumb: Texture;
}

let loading: Promise<HeirTextures | null> | null = null;

/** Loads the painted parts once; null when they cannot be loaded (the placeholder is drawn). */
export function loadHeirTextures(): Promise<HeirTextures | null> {
  loading ??= Promise.all([bodyUrl, armUrl, thumbUrl].map((u) => Assets.load<Texture>(u))).then(
    ([body, arm, thumb]) => (body && arm && thumb ? { body, arm, thumb } : null),
    () => null,
  );
  return loading;
}

/** Points in the source painting (1024 × 1536 px). */
const SRC = {
  /** Between the feet, on the ground. */
  feet: [600, 1445],
  /** Top left of each cut part's bounding box (the parts are stored at half size). */
  body: [50, 158],
  arm: [708, 697],
  thumb: [860, 849],
  /** Where the forearm turns, hidden in the sleeve. */
  elbow: [762, 750],
  /** Where the weapon's grip crosses the fist, under the thumb. */
  grip: [882, 880],
  /** The sleeve's lower edge, cuff to cuff: the forearm never shows above this line. */
  sleeve: [
    [728, 772],
    [804, 731],
  ],
  /** The middle of the raised off-hand fist. */
  offGrip: [520, 645],
} as const;

/** The parts are stored at half the painting's size. */
const STORED = 0.5;

/** Painting pixels → figure units: the otter stands about 385 units tall. */
export const HEIR_SCALE = 0.3;

/** A painting point in figure coordinates (feet at 0/0). */
function at(p: readonly [number, number]): [number, number] {
  return [(p[0] - SRC.feet[0]) * HEIR_SCALE, (p[1] - SRC.feet[1]) * HEIR_SCALE];
}

/** Where the off hand (Shield, Focus, Talisman, Grimoire) is held, in figure coordinates. */
export const HEIR_OFF_HAND = at(SRC.offGrip);

/** The weapon fist relative to the elbow, in figure units. */
export const HEIR_GRIP_FROM_ELBOW: [number, number] = [
  (SRC.grip[0] - SRC.elbow[0]) * HEIR_SCALE,
  (SRC.grip[1] - SRC.elbow[1]) * HEIR_SCALE,
];

function part(texture: Texture, topLeft: readonly [number, number], origin: [number, number]) {
  const s = new Sprite(texture);
  s.scale.set(HEIR_SCALE / STORED);
  s.position.set(
    (topLeft[0] - SRC.feet[0]) * HEIR_SCALE - origin[0],
    (topLeft[1] - SRC.feet[1]) * HEIR_SCALE - origin[1],
  );
  return s;
}

export interface HeirRig {
  /** The painted body (head, torso, legs, tail and the raised off-hand arm). */
  readonly body: Sprite;
  /** Turns at the elbow: forearm and fist, the weapon, then the thumb on top. */
  readonly arm: Container;
  /** The weapon goes in here: its origin is the middle of the fist. */
  readonly grip: Container;
  /**
   * Keeps the forearm below the sleeve: it stays still while the arm turns, so the part of the
   * forearm hidden in the sleeve never pokes out above it. Add it to the figure.
   */
  readonly sleeveMask: Graphics;
}

/** The painted parts, placed in figure coordinates (feet at 0/0). */
export function buildHeirRig(textures: HeirTextures): HeirRig {
  const body = part(textures.body, SRC.body, [0, 0]);
  const elbow = at(SRC.elbow);
  const arm = new Container({ label: "heir-arm" });
  arm.position.set(elbow[0], elbow[1]);
  const grip = new Container({ label: "heir-fist" });
  grip.position.set(HEIR_GRIP_FROM_ELBOW[0], HEIR_GRIP_FROM_ELBOW[1]);
  const forearm = part(textures.arm, SRC.arm, elbow);
  // Everything below the sleeve's edge, the edge drawn out far to both sides.
  const [a, b] = SRC.sleeve.map(at) as [[number, number], [number, number]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const far = 400;
  const sleeveMask = new Graphics()
    .poly([
      a[0] - ux * far,
      a[1] - uy * far,
      b[0] + ux * far,
      b[1] + uy * far,
      b[0] + ux * far,
      far,
      a[0] - ux * far,
      far,
    ])
    .fill(0xffffff);
  forearm.mask = sleeveMask;
  // The weapon lies over the fist; the thumb on top holds it down.
  arm.addChild(forearm, grip, part(textures.thumb, SRC.thumb, elbow));
  return { body, arm, grip, sleeveMask };
}

/**
 * Forearm turn (radians) during an attack, `t` 0 → 1 over the swing. Melee winds up (the weapon
 * tips back), strikes through and settles; ranged weapons lift a little and drop back.
 */
export function armSwing(t: number, ranged: boolean): number {
  if (t <= 0 || t >= 1) return 0;
  if (ranged) return -0.35 * Math.sin(t * Math.PI);
  if (t < 0.2) return -0.95 * (t / 0.2);
  if (t < 0.4) return -0.95 + 1.6 * ((t - 0.2) / 0.2);
  return 0.65 * (1 - (t - 0.4) / 0.6);
}
