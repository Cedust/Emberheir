import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import talismanUrl from "../../assets/items/blood-talisman.webp";
import focusUrl from "../../assets/items/ember-focus.webp";
import grimoireUrl from "../../assets/items/grimoire.webp";
import shieldUrl from "../../assets/items/round-shield.webp";
import armUrl from "./heir/heir-arm.webp";
import bodyUrl from "./heir/heir-body.webp";
import thumbUrl from "./heir/heir-thumb.webp";
import quiverUrl from "./heir/offhand-quiver.webp";
import bowArmUrl from "./heir/heir-bow-arm.webp";
import bowHandUrl from "./heir/heir-bow-hand.webp";
import bowUrl from "./heir/heir-bow.webp";
import crossbowArmUrl from "./heir/heir-crossbow-arm.webp";
import crossbowHandUrl from "./heir/heir-crossbow-hand.webp";
import crossbowUrl from "./heir/heir-crossbow.webp";
import staffArmUrl from "./heir/heir-staff-arm.webp";
import staffHandUrl from "./heir/heir-staff-hand.webp";
import staffUrl from "./heir/heir-staff.webp";
import wandArmUrl from "./heir/heir-wand-arm.webp";
import wandHandUrl from "./heir/heir-wand-hand.webp";
import wandUrl from "./heir/heir-wand.webp";
import grimoireOpenUrl from "./heir/offhand-grimoire-open.webp";

/**
 * The painted Heir (an otter) as a cutout rig: the body and the weapon forearm are two parts of
 * one painting (/mnt/project-files/art/heir/heir-master-v2.png), cut apart by
 * `tools/art/cut_heir.py`. The code-drawn weapon lies over the fist and under the thumb, which
 * is cut out once more and drawn on top, and the forearm turns at the elbow.
 */

/**
 * The off hands the Heir can carry: the painted item bases of the inventory. The Quiver (without
 * its strap) is cut for the arena by `tools/art/cut_offhands.py`.
 */
export type HeirOffHand = "shield" | "focus" | "quiver" | "talisman" | "grimoire";

const OFF_HAND_URLS: Record<HeirOffHand, string> = {
  shield: shieldUrl,
  focus: focusUrl,
  quiver: quiverUrl,
  talisman: talismanUrl,
  grimoire: grimoireUrl,
};

export interface HeirTextures {
  readonly body: Texture;
  readonly arm: Texture;
  readonly thumb: Texture;
  /** The painted off-hand items; one that fails to load is simply not drawn. */
  readonly offHands: Partial<Record<HeirOffHand, Texture>>;
  /** The otter's ranged poses (Bow, Crossbow); a missing one draws that weapon in the melee pose. */
  readonly ranged: Partial<Record<HeirRangedPose, HeirPoseTextures>>;
  /** The otter's caster poses (Wand, Staff); a missing one draws that weapon in the melee pose. */
  readonly caster: Partial<Record<HeirCasterPose, HeirCasterTextures>>;
  /**
   * The Grimoire open over a paw, its pages towards the otter (painted over the Staff pose, cut
   * by `tools/art/cut_heir_caster.py`); null draws the closed book there.
   */
  readonly grimoireOpen: Texture | null;
}

/** The weapons with a pose of their own: both paws on the weapon, aiming. */
export type HeirRangedPose = "bow" | "crossbow";

/** A ranged pose: the whole otter, and its drawing arm and front paw's fingers once more. */
export interface HeirPoseTextures {
  readonly body: Texture;
  readonly arm: Texture;
  readonly hand: Texture;
}

const POSE_URLS: Record<HeirRangedPose, [string, string, string]> = {
  bow: [bowUrl, bowArmUrl, bowHandUrl],
  crossbow: [crossbowUrl, crossbowArmUrl, crossbowHandUrl],
};

/** The weapons of the caster poses: the weapon in one fist, the off hand floats over the other. */
export type HeirCasterPose = "wand" | "staff";

/**
 * A caster pose: the whole otter, the paw on the weapon once more (the Wand's thumb, the Staff's
 * fist) and the forearm that swings it on a cast (taken out of the otter).
 */
export interface HeirCasterTextures {
  readonly body: Texture;
  readonly hand: Texture;
  readonly arm: Texture | null;
}

const CASTER_URLS: Record<HeirCasterPose, [string, string, string | null]> = {
  wand: [wandUrl, wandHandUrl, wandArmUrl],
  staff: [staffUrl, staffHandUrl, staffArmUrl],
};

let loading: Promise<HeirTextures | null> | null = null;

/** Loads the painted parts once; null when they cannot be loaded (the placeholder is drawn). */
export function loadHeirTextures(): Promise<HeirTextures | null> {
  loading ??= Promise.all([
    Promise.all([bodyUrl, armUrl, thumbUrl].map((u) => Assets.load<Texture>(u))),
    loadOffHands(),
    loadPoses(),
    loadCasterPoses(),
    Assets.load<Texture>(grimoireOpenUrl).catch(() => null),
  ]).then(
    ([[body, arm, thumb], offHands, ranged, caster, grimoireOpen]) =>
      body && arm && thumb
        ? {
            body,
            arm,
            thumb,
            offHands,
            ranged,
            caster,
            grimoireOpen: grimoireOpen ?? null,
          }
        : null,
    () => null,
  );
  return loading;
}

async function loadPoses(): Promise<HeirTextures["ranged"]> {
  const loaded = await Promise.all(
    (Object.keys(POSE_URLS) as HeirRangedPose[]).map((pose) =>
      Promise.all(POSE_URLS[pose].map((u) => Assets.load<Texture>(u))).then(
        ([body, arm, hand]) => [pose, body && arm && hand ? { body, arm, hand } : null] as const,
        () => [pose, null] as const,
      ),
    ),
  );
  const out: Partial<Record<HeirRangedPose, HeirPoseTextures>> = {};
  for (const [pose, t] of loaded) if (t) out[pose] = t;
  return out;
}

async function loadCasterPoses(): Promise<HeirTextures["caster"]> {
  const loaded = await Promise.all(
    (Object.keys(CASTER_URLS) as HeirCasterPose[]).map((pose) => {
      const [bodyUrl, handUrl, armUrl] = CASTER_URLS[pose];
      return Promise.all([
        Assets.load<Texture>(bodyUrl),
        Assets.load<Texture>(handUrl),
        armUrl ? Assets.load<Texture>(armUrl) : null,
      ]).then(
        ([body, hand, arm]) =>
          [pose, body && hand ? { body, hand, arm: arm ?? null } : null] as const,
        () => [pose, null] as const,
      );
    }),
  );
  const out: Partial<Record<HeirCasterPose, HeirCasterTextures>> = {};
  for (const [pose, t] of loaded) if (t) out[pose] = t;
  return out;
}

async function loadOffHands(): Promise<HeirTextures["offHands"]> {
  const loaded = await Promise.all(
    (Object.keys(OFF_HAND_URLS) as HeirOffHand[]).map((kind) =>
      Assets.load<Texture>(OFF_HAND_URLS[kind]).then(
        (t) => [kind, t] as const,
        () => [kind, null] as const,
      ),
    ),
  );
  const out: Partial<Record<HeirOffHand, Texture>> = {};
  for (const [kind, t] of loaded) if (t) out[kind] = t;
  return out;
}

/** Points in the source painting (1024 × 1536 px). */
const SRC = {
  /** Between the feet, on the ground. */
  feet: [600, 1445],
  /** Top left of each cut part's bounding box (the parts are stored at half size). */
  body: [50, 158],
  arm: [708, 697],
  thumb: [827, 840],
  /** Where the forearm turns, hidden in the sleeve. */
  elbow: [762, 750],
  /** Where the weapon's grip crosses the fist, under the thumb. */
  grip: [846, 884],
  /** The sleeve's lower edge, cuff to cuff: the forearm never shows above this line. */
  sleeve: [
    [728, 772],
    [804, 731],
  ],
  /** The middle of the raised off-hand fist. */
  offGrip: [520, 645],
  /** Between the shoulder blades, where a quiver's strap sits. */
  back: [372, 612],
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

/** Where a quiver hangs on the back, in figure coordinates. */
export const HEIR_BACK = at(SRC.back);

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

type Pt = readonly [number, number];

interface PoseSource {
  /** Between the feet, on the ground. */
  readonly feet: Pt;
  /** Top left of the cut otter, its drawing arm and front paw (stored at half size). */
  readonly body: Pt;
  readonly arm: Pt;
  readonly hand: Pt;
  /** Where the front paw holds the weapon: a Bow's grip, a Crossbow's fore end. */
  readonly grip: Pt;
  /** The back paw at the jaw: where a Bow's string is drawn to, a Crossbow's stock is held. */
  readonly jaw: Pt;
  /** Between the shoulder blades, where a quiver's strap sits. */
  readonly back: Pt;
}

/**
 * The ranged poses (/mnt/project-files/art/heir/heir-ranged-v1.png for the Bow, heir-crossbow-v1.png
 * for the Crossbow, cut by `tools/art/cut_heir_ranged.py`): the drawing paw at the jaw, the front
 * paw on the weapon. Points in those paintings (1024 × 1536 px), same scale as the melee pose.
 */
const RANGED_POSES: Record<HeirRangedPose, PoseSource> = {
  bow: {
    feet: [580, 1350],
    body: [42, 184],
    arm: [151, 358],
    hand: [906, 418],
    // In the middle of the fist, under thumb and fingers.
    grip: [958, 474],
    jaw: [448, 402],
    back: [380, 420],
  },
  crossbow: {
    feet: [600, 1355],
    body: [26, 165],
    arm: [193, 345],
    hand: [820, 404],
    // On the palm, in the curled fingers.
    grip: [905, 452],
    jaw: [505, 398],
    back: [400, 430],
  },
};

/** A ranged pose's points in figure coordinates (feet at 0/0). */
export function heirPose(pose: HeirRangedPose): {
  grip: [number, number];
  jaw: [number, number];
  back: [number, number];
} {
  const src = RANGED_POSES[pose];
  const at = (p: Pt): [number, number] => [
    (p[0] - src.feet[0]) * HEIR_SCALE,
    (p[1] - src.feet[1]) * HEIR_SCALE,
  ];
  return { grip: at(src.grip), jaw: at(src.jaw), back: at(src.back) };
}

/** A part of a ranged pose (the otter, drawing arm, front paw's fingers) in figure coordinates. */
export function heirPosePart(
  textures: HeirPoseTextures,
  pose: HeirRangedPose,
  part: "body" | "arm" | "hand",
): Sprite {
  const src = RANGED_POSES[pose];
  const s = new Sprite(textures[part]);
  s.scale.set(HEIR_SCALE / STORED);
  s.position.set(
    (src[part][0] - src.feet[0]) * HEIR_SCALE,
    (src[part][1] - src.feet[1]) * HEIR_SCALE,
  );
  return s;
}

interface CasterSource {
  /** Between the feet, on the ground. */
  readonly feet: Pt;
  /** Top left of the cut otter, the paw on the weapon and the forearm (stored at half size). */
  readonly body: Pt;
  readonly hand: Pt;
  readonly arm?: Pt;
  /** Where the forearm turns, inside the sleeve. */
  readonly elbow?: Pt;
  /** Where the weapon crosses the fist. */
  readonly grip: Pt;
  /** The middle of the open paw, palm up: the off hand floats over it. */
  readonly palm: Pt;
}

/**
 * The caster poses (/mnt/project-files/art/heir/heir-wand-v1.png and heir-staff-v1.png, cut by
 * `tools/art/cut_heir_caster.py`): Wand stretched at the enemy with the open paw before the belly,
 * or the Staff upright in the raised fist with the other paw reaching forward. Points in those
 * paintings (1024 × 1536 px), same scale as the melee pose.
 */
const CASTER_POSES: Record<HeirCasterPose, CasterSource> = {
  wand: {
    feet: [600, 1395],
    body: [22, 183],
    hand: [895, 493],
    arm: [788, 429],
    elbow: [790, 510],
    // Out of the fist's middle, slanted up at the enemy; its end under the thumb.
    grip: [945, 478],
    palm: [670, 686],
  },
  staff: {
    feet: [600, 1390],
    body: [17, 166],
    hand: [436, 557],
    arm: [299, 557],
    elbow: [317, 700],
    grip: [497, 612],
    palm: [935, 636],
  },
};

/** A caster pose's points in figure coordinates (feet at 0/0). */
export function heirCasterPose(pose: HeirCasterPose): {
  grip: [number, number];
  palm: [number, number];
  /** The Staff's elbow; the Wand's arm does not move. */
  elbow: [number, number] | null;
} {
  const src = CASTER_POSES[pose];
  const at = (p: Pt): [number, number] => [
    (p[0] - src.feet[0]) * HEIR_SCALE,
    (p[1] - src.feet[1]) * HEIR_SCALE,
  ];
  return { grip: at(src.grip), palm: at(src.palm), elbow: src.elbow ? at(src.elbow) : null };
}

/** A part of a caster pose (the otter, the paw on the weapon, the forearm) in figure coordinates. */
export function heirCasterPart(
  texture: Texture,
  pose: HeirCasterPose,
  part: "body" | "hand" | "arm",
): Sprite {
  const src = CASTER_POSES[pose];
  const topLeft = src[part] ?? src.body;
  const s = new Sprite(texture);
  s.scale.set(HEIR_SCALE / STORED);
  s.position.set((topLeft[0] - src.feet[0]) * HEIR_SCALE, (topLeft[1] - src.feet[1]) * HEIR_SCALE);
  return s;
}
