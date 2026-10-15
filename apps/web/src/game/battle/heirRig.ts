import { Assets, Container, Sprite, type Texture } from "pixi.js";
import armUrl from "./heir/heir-arm.webp";
import bodyUrl from "./heir/heir-body.webp";

/**
 * The painted Heir (an otter) as a cutout rig: the body and the weapon forearm are two parts of
 * one painting (/mnt/project-files/art/heir/heir-master-v2.png), cut apart by a script. The
 * code-drawn weapon sits in the fist and the forearm turns at the elbow to swing it.
 */

export interface HeirTextures {
  readonly body: Texture;
  readonly arm: Texture;
}

let loading: Promise<HeirTextures | null> | null = null;

/** Loads the painted parts once; null when they cannot be loaded (the placeholder is drawn). */
export function loadHeirTextures(): Promise<HeirTextures | null> {
  loading ??= Promise.all([Assets.load<Texture>(bodyUrl), Assets.load<Texture>(armUrl)]).then(
    ([body, arm]) => ({ body, arm }),
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
  arm: [681, 648],
  /** Where the forearm turns, hidden in the sleeve. */
  elbow: [762, 750],
  /** The middle of the weapon fist. */
  grip: [866, 884],
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
  /** Turns at the elbow; holds the forearm and, behind the fist, the weapon. */
  readonly arm: Container;
  /** The weapon goes in here: its origin is the middle of the fist. */
  readonly fist: Container;
}

/** The two painted parts, placed in figure coordinates (feet at 0/0). */
export function buildHeirRig(textures: HeirTextures): HeirRig {
  const body = part(textures.body, SRC.body, [0, 0]);
  const elbow = at(SRC.elbow);
  const arm = new Container({ label: "heir-arm" });
  arm.position.set(elbow[0], elbow[1]);
  const fist = new Container({ label: "heir-fist" });
  fist.position.set(HEIR_GRIP_FROM_ELBOW[0], HEIR_GRIP_FROM_ELBOW[1]);
  // The weapon sits behind the forearm, so its grip vanishes inside the paw.
  arm.addChild(fist, part(textures.arm, SRC.arm, elbow));
  return { body, arm, fist };
}

/**
 * Forearm turn (radians) during an attack, `t` 0 → 1 over the swing. Melee winds up (the weapon
 * tips back), strikes through and settles; ranged weapons lift a little and drop back.
 */
export function armSwing(t: number, ranged: boolean): number {
  if (t <= 0 || t >= 1) return 0;
  if (ranged) return -0.35 * Math.sin(t * Math.PI);
  if (t < 0.2) return -1.1 * (t / 0.2);
  if (t < 0.4) return -1.1 + 1.85 * ((t - 0.2) / 0.2);
  return 0.75 * (1 - (t - 0.4) / 0.6);
}
