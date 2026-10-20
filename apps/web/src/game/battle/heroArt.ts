import { BlurFilter, Container, Graphics, Sprite, type Texture } from "pixi.js";
import {
  type PaintedTextures,
  type SceneWeaponArt,
  drawPaintedWeapon,
  paintedTextures,
} from "../camp/paintedWeapon";
import { drawWeapon, type WeaponLook } from "../camp/weaponArt";
import { INK } from "./arenaLayout";
import {
  HEIR_BACK,
  HEIR_OFF_HAND,
  type HeirCasterPose,
  type HeirCasterTextures,
  type HeirOffHand,
  type HeirTextures,
  buildHeirRig,
  heirCasterPart,
  heirCasterPose,
  heirPose,
  heirPosePart,
} from "./heirRig";

/** The hero in the arena: class look, weapon pose and grade glow, drawn as one figure. */

export interface HeroLook {
  readonly heroClass: "cinderguard" | "ashstrider" | "emberseer";
  readonly weapon: "sword" | "wand" | "axe" | "dagger" | "bow" | "crossbow" | "mace" | "staff";
  readonly offHand: HeirOffHand | null;
  /** The weapon's id (Weapon Mastery): the painted weapon of the Mastery view is in hand. */
  readonly weaponId: string;
  /** Its build: grade metal, path runes, Keystone shape. */
  readonly weaponLook: WeaponLook;
  /** Colour of the Echo worn on the weapon: its aura wraps the weapon, its motes the hero. */
  readonly echo?: number;
  /** Colour of the Draught brewed for the trip: a brew ring at the hero's feet, rising bubbles. */
  readonly draught?: number;
  /** The main Mastery's style: its aura in the arena (klassengeruest-v1.md 5). */
  readonly mastery?: "burst" | "tempo" | "ailment";
}

/** Colors per class (klassengeruest-v1.md 2): body, chest piece, headgear. */
const CLASS_LOOKS: Record<HeroLook["heroClass"], { body: number; chest: number; head: number }> = {
  cinderguard: { body: 0x8a2f1c, chest: 0x9aa0a6, head: 0x8a8f96 },
  ashstrider: { body: 0x3f5a2e, chest: 0x7a5a34, head: 0x34492a },
  emberseer: { body: 0x4b2a66, chest: 0xe8c07a, head: 0x5a5450 },
};

/**
 * The Heir: one body per class, weapon and off hand change (klassen-v2.md section 9).
 * Origin = feet. Placeholder art until the painted characters exist.
 */
/** Where the hero holds each weapon: pommel and tip in figure coordinates (feet at 0/0). */
const WEAPON_POSES: Record<HeroLook["weapon"], { from: [number, number]; to: [number, number] }> = {
  sword: { from: [52, -246], to: [172, -360] },
  axe: { from: [60, -222], to: [146, -372] },
  dagger: { from: [64, -236], to: [134, -304] },
  mace: { from: [60, -236], to: [150, -366] },
  staff: { from: [92, -140], to: [136, -452] },
  bow: { from: [108, -398], to: [108, -162] },
  crossbow: { from: [28, -258], to: [190, -272] },
  wand: { from: [62, -232], to: [142, -350] },
};

/** Grade colour of the weapon's edge light (Crude .. Exalted). */
const GRADE_LIGHT = [0x8a6a50, 0xd0803a, 0xff7a2a, 0xffc04a, 0xfff0c8];

const GRADE_LIGHT_ALPHA = [0, 0.15, 0.3, 0.5, 0.8];

/**
 * Blurred light baked into a texture once, additive. The texture gets room for the blur:
 * clipped at the shapes' own bounds, the blur would smear into a hard-edged box.
 */
function bakedGlow(children: readonly Container[], blur: number): Container {
  const inner = new Container();
  inner.addChild(...children);
  inner.filters = [new BlurFilter({ strength: blur, quality: 2 })];
  const b = inner.getLocalBounds();
  const pad = blur * 4;
  const room = new Graphics()
    .rect(b.minX - pad, b.minY - pad, b.width + pad * 2, b.height + pad * 2)
    .fill({ color: 0x000000, alpha: 0.001 });
  const wrap = new Container();
  wrap.addChild(room, inner);
  wrap.blendMode = "add";
  wrap.cacheAsTexture(true);
  return wrap;
}

/**
 * The painted weapon of Weapon Mastery in the hero's hand, in the build's look: grade metal,
 * glowing path runes and the Keystone's shape. Its light is baked once into a texture.
 */
function heldWeapon(look: HeroLook, painted: PaintedTextures | null): Container {
  const pose = WEAPON_POSES[look.weapon];
  const [x0, y0] = pose.from;
  const [x1, y1] = pose.to;
  const { holder } = weaponArt(look, painted);
  holder.position.set(x0, y0);
  holder.rotation = Math.atan2(y1 - y0, x1 - x0);
  holder.scale.set(Math.hypot(x1 - x0, y1 - y0) / WEAPON_LENGTH);
  return holder;
}

/** The weapon is drawn this long, pommel at 0, tip at +x; holders scale it. */
const WEAPON_LENGTH = 520;

/**
 * The weapon art with its grade light, Echo aura and tip marker, pommel at 0/0: Timo's painting
 * of the build's Keystone form when it is loaded (the same one Weapon Mastery shows), else the
 * code-drawn weapon.
 */
function weaponArt(
  look: HeroLook,
  painted: PaintedTextures | null,
  unstrung = false,
): { holder: Container; stringEnds?: SceneWeaponArt["stringEnds"] } {
  const length = WEAPON_LENGTH;
  const art = painted
    ? drawPaintedWeapon(look.weaponId, length, look.weaponLook, painted, unstrung)
    : drawWeapon(look.weaponId, length, look.weaponLook);
  const holder = new Container();
  const grade = Math.max(0, Math.min(4, look.weaponLook.grade));
  art.edge.tint = GRADE_LIGHT[grade] ?? 0xffffff;
  art.edge.alpha = GRADE_LIGHT_ALPHA[grade] ?? 0;
  const edge = bakedGlow([art.edge], 6);
  const runes = bakedGlow([art.runeGlow], 6);
  // A dark outline keeps the painted weapon readable on the bright arena.
  // In its own container: a painting's silhouette is a sprite that carries its own scale.
  const outline = new Container();
  outline.addChild(art.silhouette());
  outline.tint = INK;
  outline.scale.set(1.02);
  holder.addChild(outline);
  if (look.echo !== undefined) {
    // The worn Echo wraps the weapon in its colour; the scene lets it breathe.
    const shape = art.silhouette();
    shape.tint = look.echo;
    const aura = bakedGlow([shape], 14);
    aura.label = "weapon-echo";
    aura.alpha = 0.55;
    holder.addChild(aura);
  }
  // A painting's edge is its whole silhouette: its light shines from behind the weapon.
  if ("glowBehind" in art && art.glowBehind) holder.addChild(edge, art.body, runes);
  else holder.addChild(art.body, edge, runes);
  const tip = new Container({ label: "weapon-tip" });
  tip.position.set(length * 0.8, 0);
  holder.addChild(tip);
  return "stringEnds" in art && art.stringEnds
    ? { holder, stringEnds: art.stringEnds }
    : { holder };
}

/**
 * How the painted Heir holds each weapon in the fist: angle at rest (radians, 0 = pointing at
 * the enemy, negative = up), drawn length in figure units, where along it the fist grips, and
 * an optional nudge of the grip (figure units) so a thick shaft does not cover the palm, and an
 * optional slimming of the painting across its shaft so the thumb stays in sight over it.
 */
const HEIR_GRIPS: Record<
  HeroLook["weapon"],
  { angle: number; length: number; at: number; nudge?: [number, number]; slim?: number }
> = {
  sword: { angle: -0.7, length: 210, at: 0.1 },
  axe: { angle: -0.8, length: 200, at: 0.14, nudge: [4, 2], slim: 0.8 },
  dagger: { angle: -0.6, length: 120, at: 0.2 },
  mace: { angle: -0.75, length: 190, at: 0.14 },
  staff: { angle: -1.05, length: 380, at: 0.42, nudge: [5, -2] },
  bow: { angle: Math.PI / 2, length: 280, at: 0.5 },
  crossbow: { angle: -0.08, length: 200, at: 0.36 },
  wand: { angle: -0.7, length: 120, at: 0.14 },
};

/**
 * The Heir in the arena. With the painted parts loaded it is the otter cutout rig, the weapon in
 * its fist; without them the old placeholder figure.
 */
export function drawHero(
  look: HeroLook,
  heir?: HeirTextures | null,
  weapon: PaintedTextures | null = null,
): Container {
  return heir ? drawPaintedHero(look, heir, weapon) : drawPlaceholderHero(look, weapon);
}

/** Loads the painting of the hero's weapon in its Keystone form; null when it has none. */
export async function loadHeroWeapon(look: HeroLook): Promise<PaintedTextures | null> {
  try {
    return await paintedTextures(look.weaponId, look.weaponLook);
  } catch {
    return null;
  }
}

/** Bow and Crossbow carry a Quiver on the back (the Hunter's look); a Dagger does not. */
const SHOOTERS = new Set<HeroLook["weapon"]>(["bow", "crossbow"]);

/** In the ranged pose the Quiver stands steeper, its arrows over the shoulder behind the head. */
const RANGED_QUIVER_TILT = -0.45;

/**
 * How the Heir carries each painted off hand: drawn size (longest side, figure units), the point
 * of the picture (0..1) that sits on the fist or the back, an offset from there, a tilt
 * (radians), a squash of its width (a shield turned towards the enemy is seen at an angle;
 * negative mirrors it). A `floating` one hovers over the fist or the open paw in its light, bobbing
 * in the scene.
 */
const OFF_HAND_HOLDS: Record<
  HeirOffHand,
  {
    size: number;
    anchor: [number, number];
    offset: [number, number];
    tilt: number;
    squash?: number;
    /** Hovers in a light of this colour. */
    floating?: number;
  }
> = {
  shield: { size: 112, anchor: [0.5, 0.5], offset: [8, 10], tilt: 0.06, squash: 0.84 },
  // The orb hovers over the fist.
  focus: { size: 42, anchor: [0.5, 0.5], offset: [0, -34], tilt: 0, floating: 0xff8a2a },
  // In front of the hand, the knot just under the fist.
  talisman: { size: 62, anchor: [0.6, 0.18], offset: [0, 20], tilt: -0.1 },
  grimoire: {
    size: 70,
    anchor: [0.5, 0.5],
    offset: [40, -10],
    tilt: 0.62,
    squash: -1,
    floating: 0x7a3cd0,
  },
  quiver: { size: 147, anchor: [0.55, 0.42], offset: [0, 0], tilt: -0.5 },
};

/** How far over the open paw a floating off hand hovers (figure units, under its picture). */
const PALM_GAP = 6;

/** The Grimoire open over a paw, at the size it is painted over the Staff pose. */
const OPEN_GRIMOIRE: (typeof OFF_HAND_HOLDS)[HeirOffHand] = {
  size: 100,
  anchor: [0.5, 0.5],
  offset: [0, 0],
  tilt: 0,
  floating: 0x7a3cd0,
};

/**
 * The painted off-hand item in its hold, at the off-hand fist (or `at`, the back or an open
 * paw). A floating one gets its light: a halo around the Ember Focus' orb, a glow under the
 * Grimoire, and a soft light on the paw under it; the scene lets it bob and the light breathe.
 */
function paintedOffHand(
  kind: HeirOffHand,
  texture: Texture,
  at?: readonly [number, number],
  tilt?: number,
  overPalm = false,
): Container {
  // Over an open paw the Grimoire lies open, its pages towards the otter, painted as it is seen.
  const hold = overPalm && kind === "grimoire" ? OPEN_GRIMOIRE : OFF_HAND_HOLDS[kind];
  const sprite = new Sprite(texture);
  sprite.anchor.set(hold.anchor[0], hold.anchor[1]);
  const scale = hold.size / Math.max(texture.width, texture.height);
  sprite.scale.set(scale * (hold.squash ?? 1), scale);
  const w = texture.width * scale;
  const h = texture.height * scale;
  const [x, y] = at ?? (kind === "quiver" ? HEIR_BACK : HEIR_OFF_HAND);
  const c = new Container({ label: kind === "quiver" ? "heir-quiver" : "heir-off-hand" });
  // Over an open paw it hovers just above the palm; otherwise at its hold's offset.
  if (overPalm) c.position.set(x, y - h / 2 - PALM_GAP);
  else c.position.set(x + hold.offset[0], y + hold.offset[1]);
  if (hold.floating === undefined) {
    c.rotation = tilt ?? hold.tilt;
    c.addChild(sprite);
    return c;
  }
  // A hovering item tilts on its own; the light under it stays level.
  sprite.rotation = tilt ?? hold.tilt;
  const float = new Container({ label: "off-hand-float" });
  const round = kind === "focus";
  const glow = bakedGlow(
    [
      round
        ? new Graphics().circle(0, 0, w * 0.62).fill(hold.floating)
        : new Graphics().ellipse(0, h * 0.55, w * 0.3, h * 0.07).fill(hold.floating),
    ],
    8,
  );
  glow.label = "off-hand-glow";
  glow.alpha = 0.45;
  if (round) {
    float.addChild(glow, sprite);
    c.addChild(float);
  } else {
    float.addChild(sprite);
    c.addChild(glow, float);
  }
  if (overPalm) {
    // The item's light falls on the open paw.
    const light = bakedGlow(
      [new Graphics().ellipse(0, h / 2 + PALM_GAP, w * 0.4, 5).fill(hold.floating)],
      6,
    );
    light.alpha = 0.5;
    c.addChildAt(light, 0);
  }
  return c;
}

function drawPaintedHero(
  look: HeroLook,
  heir: HeirTextures,
  painted: PaintedTextures | null,
): Container {
  const c = new Container();
  const rig = buildHeirRig(heir);
  // A quiver rides on the back, behind everything (a Hunter always wears one).
  const quiver = SHOOTERS.has(look.weapon);
  const quiverArt = heir.offHands.quiver;
  const pose = look.weapon === "bow" || look.weapon === "crossbow" ? look.weapon : null;
  const poseArt = pose ? heir.ranged[pose] : undefined;
  if (pose && poseArt) {
    // Bow and Crossbow: the otter aims, both paws on the weapon (its own pose).
    if (quiver && quiverArt)
      c.addChild(paintedOffHand("quiver", quiverArt, heirPose(pose).back, RANGED_QUIVER_TILT));
    // The weapon lies in front, under the drawing paw and the front paw's fingers.
    c.addChild(
      heirPosePart(poseArt, pose, "body"),
      new RangedHold(look, painted),
      heirPosePart(poseArt, pose, "arm"),
      heirPosePart(poseArt, pose, "hand"),
    );
    return c;
  }
  const held = look.offHand && look.offHand !== "quiver" ? look.offHand : null;
  const heldArt = held ? heir.offHands[held] : undefined;
  const caster =
    look.weapon === "wand" || look.weapon === "staff" || look.weapon === "dagger"
      ? look.weapon
      : null;
  const casterArt = caster ? heir.caster[caster] : undefined;
  // Wand, Staff and Dagger have their own pose when the other paw is free for a floating off
  // hand (or empty), and the Dagger's open paw also lets a Talisman dangle from it: a Shield (or
  // a caster's Talisman) is held in the fist, so it keeps the melee pose.
  const freePaw =
    !held ||
    OFF_HAND_HOLDS[held].floating !== undefined ||
    (caster === "dagger" && held === "talisman");
  if (caster && casterArt && freePaw) {
    c.addChild(
      heirCasterPart(casterArt.body, caster, "body"),
      new CasterHold(look, painted, caster, casterArt),
    );
    const art = held === "grimoire" ? (heir.grimoireOpen ?? heldArt) : heldArt;
    const floating = held ? OFF_HAND_HOLDS[held].floating !== undefined : false;
    if (held && art)
      c.addChild(paintedOffHand(held, art, heirCasterPose(caster).palm, undefined, floating));
    return c;
  }
  if (quiver && quiverArt) c.addChild(paintedOffHand("quiver", quiverArt));
  const grip = HEIR_GRIPS[look.weapon];
  const { holder: weapon } = weaponArt(look, painted);
  weapon.rotation = grip.angle;
  weapon.scale.set(grip.length / WEAPON_LENGTH, (grip.length / WEAPON_LENGTH) * (grip.slim ?? 1));
  weapon.pivot.set(grip.at * WEAPON_LENGTH, 0);
  if (grip.nudge) weapon.position.set(grip.nudge[0], grip.nudge[1]);
  rig.grip.addChild(weapon);
  // The forearm comes out of the sleeve, so it and the weapon sit behind the body.
  c.addChild(rig.sleeveMask, rig.arm, rig.body);
  // The off hand is held in the raised fist, in front of the chest.
  if (held && heldArt) c.addChild(paintedOffHand(held, heldArt));
  return c;
}

function drawPlaceholderHero(look: HeroLook, painted: PaintedTextures | null): Container {
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  const colors = CLASS_LOOKS[look.heroClass];
  // Off hand and back gear sit behind the body.
  if (SHOOTERS.has(look.weapon)) {
    c.addChild(
      new Graphics().roundRect(-78, -330, 30, 120, 8).fill(0x7a5a34).stroke(line),
      new Graphics()
        .poly([-74, -330, -70, -360, -66, -330])
        .poly([-62, -330, -58, -366, -54, -330])
        .fill(0xe8e2d6)
        .stroke({ color: INK, width: 2 }),
    );
  }
  if (look.offHand === "shield") {
    c.addChild(new Graphics().ellipse(-56, -240, 38, 50).fill(0x6b5a3e).stroke(line));
    c.addChild(new Graphics().ellipse(-56, -240, 20, 28).fill(0xc9a063).stroke(line));
  } else if (look.offHand === "focus") {
    c.addChild(new Graphics().circle(-62, -250, 22).fill(0x5b8cff).stroke(line));
  } else if (look.offHand === "talisman") {
    c.addChild(
      new Graphics().moveTo(-60, -300).lineTo(-60, -262).stroke({ color: INK, width: 2 }),
      new Graphics().poly([-60, -262, -46, -244, -60, -222, -74, -244]).fill(0xc8202f).stroke(line),
    );
  } else if (look.offHand === "grimoire") {
    c.addChild(
      new Graphics().roundRect(-92, -272, 52, 62, 6).fill(0x3a1f4a).stroke(line),
      new Graphics().circle(-66, -241, 10).fill(0xa35cff).stroke({ color: INK, width: 2 }),
    );
  }
  // Robes reach the ground and flare; armor and leather stop at the knees.
  const robe = look.heroClass === "emberseer";
  const body = new Graphics();
  if (robe) {
    body
      .moveTo(-84, -150)
      .bezierCurveTo(-70, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 70, -260, 84, -150);
    if (look.heroClass === "emberseer") {
      // A tattered hem.
      for (let x = 84; x > -84; x -= 24) body.lineTo(x - 12, -164).lineTo(x - 24, -150);
    }
    body.closePath();
  } else {
    body
      .moveTo(-70, -150)
      .bezierCurveTo(-74, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 74, -260, 70, -150)
      .closePath();
  }
  c.addChild(body.fill(colors.body).stroke(line));
  if (robe) {
    c.addChild(
      new Graphics().rect(-8, -300, 16, 150).fill(colors.chest).stroke(line),
      new Graphics()
        .circle(-40, -200, 4)
        .circle(40, -220, 4)
        .circle(-30, -260, 3)
        .fill({ color: 0xa35cff, alpha: 0.9 }),
    );
  } else {
    c.addChild(
      new Graphics()
        .moveTo(-30, -150)
        .lineTo(-22, -240)
        .lineTo(22, -240)
        .lineTo(30, -150)
        .fill(colors.chest)
        .stroke(line),
    );
  }
  c.addChild(new Graphics().circle(0, -364, 40).fill(0xf0c9a0).stroke(line));
  const head = new Graphics();
  switch (look.heroClass) {
    case "cinderguard":
      // Half helm with a nose guard.
      head
        .moveTo(-44, -360)
        .bezierCurveTo(-44, -414, 44, -414, 44, -360)
        .lineTo(-44, -360)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      head.rect(-4, -362, 8, 22).fill(colors.head).stroke({ color: INK, width: 2 });
      break;
    case "ashstrider":
      // A hood that frames the face.
      head
        .moveTo(-48, -330)
        .bezierCurveTo(-60, -400, -20, -420, 0, -420)
        .bezierCurveTo(20, -420, 60, -400, 48, -330)
        .bezierCurveTo(40, -380, -40, -380, -48, -330)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      break;
    case "emberseer":
      // A pointed, sagging hood.
      head
        .moveTo(-50, -330)
        .bezierCurveTo(-60, -390, -30, -420, 10, -446)
        .bezierCurveTo(30, -410, 60, -390, 50, -330)
        .bezierCurveTo(40, -380, -40, -380, -50, -330)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      break;
  }
  c.addChild(head);
  c.addChild(heldWeapon(look, painted));
  c.y = 150;
  return c;
}

type Point = readonly [number, number];

const lerp = (a: Point, b: Point, t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Drawn sizes in the ranged pose (figure units): Bow tip to tip, the arrow, the Crossbow. */
const RANGED_SIZES = { bow: 270, arrow: 180 };

/**
 * Where the paws hold the painted Crossbow, along it (0 = butt, 1 = front): the stock's wrist
 * behind the trigger and the fore end just behind the latch, and across it (the fore end's
 * underside rests on the palm).
 */
const CROSSBOW_HOLDS = { stock: 0.24, fore: 0.66, across: -8 };

/** String colour of the drawn Bow. */
const STRING = 0x3a2a1c;

/**
 * Bow or Crossbow in its pose, in front of the otter, held by the front paw and the paw at the
 * jaw. `pose` plays a shot: the Bow's string snaps forward and shivers, a new arrow is nocked and drawn back to the jaw; the Crossbow kicks into the
 * shoulder. Visual only.
 */
export class RangedHold extends Container {
  private readonly bow: boolean;
  private readonly weapon: Container;
  private readonly string = new Graphics();
  private readonly arrow: Sprite | null = null;
  private readonly ends: [Point, Point] | null = null;
  private readonly jaw: Point;
  private readonly rest: Point;
  private readonly aim: Point;
  private readonly base: { x: number; y: number; rotation: number };

  constructor(look: HeroLook, painted: PaintedTextures | null) {
    super({ label: "heir-ranged" });
    this.bow = look.weapon === "bow";
    const shot = new Container({ label: "heir-shot" });
    const { grip, jaw } = heirPose(this.bow ? "bow" : "crossbow");
    this.jaw = jaw;
    this.rest = grip;
    if (this.bow) {
      const { holder, stringEnds } = weaponArt(look, painted, true);
      const k = RANGED_SIZES.bow / WEAPON_LENGTH;
      holder.scale.set(k);
      holder.pivot.set(WEAPON_LENGTH / 2, 0);
      holder.rotation = Math.PI / 2;
      holder.position.set(grip[0], grip[1]);
      this.weapon = holder;
      // The arrow rests on the bow fist's knuckles.
      this.aim = [grip[0] - 6, grip[1] - 14];
      if (stringEnds) {
        // Painting along the axis → figure: turned a quarter, the string side towards the otter.
        const place = ([x, y]: Point): Point => [
          grip[0] - (y - 0) * k,
          grip[1] + (x - WEAPON_LENGTH / 2) * k,
        ];
        this.ends = [place(stringEnds[0]), place(stringEnds[1])];
        this.rest = lerp(this.ends[0], this.ends[1], 0.5);
      }
      const arrowTexture = painted?.arrow;
      if (arrowTexture) {
        this.arrow = new Sprite(arrowTexture);
        this.arrow.anchor.set(0, 0.5);
        this.arrow.scale.set(RANGED_SIZES.arrow / arrowTexture.width);
      }
      this.addChild(holder, this.string);
      if (this.arrow) this.addChild(this.arrow);
      // Arrows leave from the head of the fully drawn arrow.
      const dir = Math.atan2(this.aim[1] - jaw[1], this.aim[0] - jaw[0]);
      shot.position.set(
        jaw[0] + Math.cos(dir) * RANGED_SIZES.arrow,
        jaw[1] + Math.sin(dir) * RANGED_SIZES.arrow,
      );
    } else {
      const { holder } = weaponArt(look, painted);
      const stock = jaw;
      const span = Math.hypot(grip[0] - stock[0], grip[1] - stock[1]);
      const k = span / ((CROSSBOW_HOLDS.fore - CROSSBOW_HOLDS.stock) * WEAPON_LENGTH);
      holder.scale.set(k);
      holder.pivot.set(CROSSBOW_HOLDS.stock * WEAPON_LENGTH, CROSSBOW_HOLDS.across);
      holder.rotation = Math.atan2(grip[1] - stock[1], grip[0] - stock[0]);
      holder.position.set(stock[0], stock[1]);
      this.weapon = holder;
      this.aim = grip;
      // Bolts leave from the Crossbow's front.
      shot.position.set(WEAPON_LENGTH, CROSSBOW_HOLDS.across);
      holder.addChild(shot);
      this.addChild(holder);
    }
    if (this.bow) this.addChild(shot);
    this.base = { x: this.weapon.x, y: this.weapon.y, rotation: this.weapon.rotation };
    this.pose(Infinity, 0, false);
  }

  /** The shot `age` seconds ago (Infinity: none yet), `clock` for the shiver, `motion` off stills it. */
  pose(age: number, clock: number, motion: boolean): void {
    if (this.bow) this.poseBow(age, clock, motion);
    else this.poseCrossbow(age, motion);
  }

  private poseBow(age: number, clock: number, motion: boolean): void {
    // Released (string snaps and shivers), then a new arrow on the string, drawn to the jaw.
    // The arrow keeps its aim: it slides along the line from the jaw over the knuckles.
    const draw = age < 0.18 ? 0 : Math.min(1, (age - 0.18) / 0.4);
    const eased = draw * draw * (3 - 2 * draw);
    const jaw = this.jaw;
    const angle = Math.atan2(this.aim[1] - jaw[1], this.aim[0] - jaw[0]);
    const along =
      (this.rest[0] - jaw[0]) * Math.cos(angle) + (this.rest[1] - jaw[1]) * Math.sin(angle);
    const loose: Point = [jaw[0] + Math.cos(angle) * along, jaw[1] + Math.sin(angle) * along];
    const nock = lerp(loose, jaw, eased);
    const shiver = motion && age < 0.18 ? Math.sin(clock * 90) * 4 * (1 - age / 0.18) : 0;
    const g = this.string.clear();
    if (this.ends) {
      g.moveTo(this.ends[0][0], this.ends[0][1])
        .lineTo(nock[0] - shiver, nock[1])
        .lineTo(this.ends[1][0], this.ends[1][1])
        .stroke({ color: STRING, width: 2, join: "round", cap: "round" });
    }
    if (this.arrow) {
      this.arrow.visible = age >= 0.18;
      this.arrow.position.set(nock[0], nock[1]);
      this.arrow.rotation = angle;
    }
  }

  private poseCrossbow(age: number, motion: boolean): void {
    // The kick: back into the shoulder and the front up, then settling.
    const kick = motion && age < 0.3 ? Math.sin((age / 0.3) * Math.PI) * (1 - age / 0.3) : 0;
    const back = 7 * kick;
    this.weapon.rotation = this.base.rotation - 0.08 * kick;
    this.weapon.position.set(
      this.base.x - Math.cos(this.base.rotation) * back,
      this.base.y - Math.sin(this.base.rotation) * back,
    );
  }
}

/**
 * How the caster poses hold their weapon: angle at rest (radians, 0 = at the enemy, negative =
 * up), drawn length in figure units and where along it the fist grips. The Wand points up at the
 * enemy from the stretched fist; the Staff's foot stands on the ground between the feet.
 */
const CASTER_GRIPS: Record<HeirCasterPose, { angle: number; length: number; at: number }> = {
  wand: { angle: -0.6, length: 120, at: 0.2 },
  staff: { angle: -Math.PI / 2 - 0.03, length: 390, at: 0.6 },
  // Reverse grip: the blade points down out of the fist, the pommel shows above it.
  dagger: { angle: Math.PI / 2 + 0.15, length: 120, at: 0.22 },
};

/**
 * Wand or Staff in its caster pose, drawn over the otter: the weapon in front of the fist, the
 * paw on it once more on top (the Wand's thumb, the Staff's fist), and the forearm, which turns
 * at the elbow. `pose` plays a cast: the Wand's arm draws back and thrusts the Wand at the enemy;
 * the Staff's arm lifts it and brings it down, its head dipping. Spells leave from the weapon's tip.
 * The Dagger's pose works the same way: its fist, raised before the chest, rips the blade down on
 * a strike. Visual only.
 */
export class CasterHold extends Container {
  private readonly kind: HeirCasterPose;
  private readonly weapon: Container;
  private readonly arm: Container;
  private readonly rest: number;

  constructor(
    look: HeroLook,
    painted: PaintedTextures | null,
    pose: HeirCasterPose,
    art: HeirCasterTextures,
  ) {
    super({ label: "heir-caster" });
    this.kind = pose;
    const grip = CASTER_GRIPS[pose];
    const { grip: at, elbow } = heirCasterPose(pose);
    const { holder } = weaponArt(look, painted);
    holder.scale.set(grip.length / WEAPON_LENGTH);
    holder.pivot.set(grip.at * WEAPON_LENGTH, 0);
    holder.rotation = grip.angle;
    holder.position.set(at[0], at[1]);
    const shot = new Container({ label: "heir-shot" });
    shot.position.set(WEAPON_LENGTH, 0);
    holder.addChild(shot);
    // Turns at the elbow, its parts kept in figure coordinates.
    this.arm = new Container({ label: "heir-caster-arm" });
    const [ex, ey] = elbow ?? at;
    this.arm.pivot.set(ex, ey);
    this.arm.position.set(ex, ey);
    if (art.arm) this.arm.addChild(heirCasterPart(art.arm, pose, "arm"));
    this.arm.addChild(holder, heirCasterPart(art.hand, pose, "hand"));
    this.addChild(this.arm);
    this.weapon = holder;
    this.rest = grip.angle;
  }

  /**
   * The cast `age` seconds ago (Infinity: none yet), or for the Dagger the melee `swing` timer
   * (1 → 0 over a strike); `motion` off keeps the weapon still.
   */
  pose(age: number, _clock: number, motion: boolean, swing = 0): void {
    let turn = 0;
    let lift = 0;
    if (this.kind === "dagger") {
      if (motion && swing > 0) {
        // The fist draws up and back, then rips down at the enemy past rest and settles; the
        // blade leads the cut.
        const t = 1 - swing;
        if (t < 0.25) lift = -0.14 * (t / 0.25);
        else if (t < 0.45) lift = -0.14 + 0.36 * ((t - 0.25) / 0.2);
        else lift = 0.22 * (1 - (t - 0.45) / 0.55);
        turn = -0.6 * Math.max(0, lift);
      }
    } else if (motion && age < 0.45) {
      const t = age / 0.45;
      if (this.kind === "wand") {
        // The arm draws back up, then thrusts at the enemy a little past rest; the Wand flicks.
        if (t < 0.3) lift = -0.08 * Math.sin((t / 0.3) * (Math.PI / 2));
        else if (t < 0.45) lift = -0.08 + 0.12 * ((t - 0.3) / 0.15);
        else lift = 0.04 * (1 - (t - 0.45) / 0.55);
        if (t < 0.3) turn = -0.1 * (t / 0.3);
        else if (t < 0.45) turn = -0.1 + 0.25 * ((t - 0.3) / 0.15);
        else turn = 0.15 * (1 - (t - 0.45) / 0.55);
      } else {
        // The arm lifts the Staff, then brings it down a little past rest; its head dips.
        if (t < 0.4) lift = -0.12 * Math.sin((t / 0.4) * (Math.PI / 2));
        else if (t < 0.6) lift = -0.12 + 0.16 * ((t - 0.4) / 0.2);
        else lift = 0.04 * (1 - (t - 0.6) / 0.4);
        turn = 0.1 * Math.sin(t * Math.PI);
      }
    }
    this.arm.rotation = lift;
    this.weapon.rotation = this.rest + turn;
  }
}

export const RANGED_WEAPONS = new Set<HeroLook["weapon"]>(["wand", "staff", "bow", "crossbow"]);
