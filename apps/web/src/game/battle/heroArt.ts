import { BlurFilter, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { drawWeapon, type WeaponLook } from "../camp/weaponArt";
import { INK } from "./arenaLayout";
import {
  HEIR_BACK,
  HEIR_OFF_HAND,
  type HeirOffHand,
  type HeirTextures,
  buildHeirRig,
  heirOffFist,
} from "./heirRig";

/** The hero in the arena: class look, weapon pose and grade glow, drawn as one figure. */

export interface HeroLook {
  readonly heroClass: "warrior" | "reaver" | "hunter" | "sorcerer" | "warlock";
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
}

/** Colors per class (klassen-v2.md section 9): body, chest piece, headgear. */
const CLASS_LOOKS: Record<HeroLook["heroClass"], { body: number; chest: number; head: number }> = {
  warrior: { body: 0x8a2f1c, chest: 0x9aa0a6, head: 0x8a8f96 },
  reaver: { body: 0x4a3426, chest: 0x8a1c24, head: 0x2e2119 },
  hunter: { body: 0x3f5a2e, chest: 0x7a5a34, head: 0x34492a },
  sorcerer: { body: 0x2d4a8a, chest: 0xe8c07a, head: 0xe8c07a },
  warlock: { body: 0x4b2a66, chest: 0x6a6460, head: 0x5a5450 },
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
function heldWeapon(look: HeroLook): Container {
  const pose = WEAPON_POSES[look.weapon];
  const [x0, y0] = pose.from;
  const [x1, y1] = pose.to;
  const holder = weaponArt(look);
  holder.position.set(x0, y0);
  holder.rotation = Math.atan2(y1 - y0, x1 - x0);
  holder.scale.set(Math.hypot(x1 - x0, y1 - y0) / WEAPON_LENGTH);
  return holder;
}

/** The weapon is drawn this long, pommel at 0, tip at +x; holders scale it. */
const WEAPON_LENGTH = 520;

/** The weapon art with its grade light, Echo aura and tip marker, pommel at 0/0. */
function weaponArt(look: HeroLook): Container {
  const length = WEAPON_LENGTH;
  const art = drawWeapon(look.weaponId, length, look.weaponLook);
  const holder = new Container();
  const grade = Math.max(0, Math.min(4, look.weaponLook.grade));
  art.edge.tint = GRADE_LIGHT[grade] ?? 0xffffff;
  art.edge.alpha = GRADE_LIGHT_ALPHA[grade] ?? 0;
  const light = bakedGlow([art.edge, art.runeGlow], 6);
  // A dark outline keeps the painted weapon readable on the bright arena.
  const outline = art.silhouette();
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
  holder.addChild(art.body, light);
  const tip = new Container({ label: "weapon-tip" });
  tip.position.set(length * 0.8, 0);
  holder.addChild(tip);
  return holder;
}

/**
 * How the painted Heir holds each weapon in the fist: angle at rest (radians, 0 = pointing at
 * the enemy, negative = up), drawn length in figure units, where along it the fist grips, and
 * an optional nudge of the grip (figure units) so a thick shaft does not cover the palm.
 */
const HEIR_GRIPS: Record<
  HeroLook["weapon"],
  { angle: number; length: number; at: number; nudge?: [number, number] }
> = {
  sword: { angle: -0.7, length: 210, at: 0.1 },
  axe: { angle: -0.8, length: 200, at: 0.14 },
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
export function drawHero(look: HeroLook, heir?: HeirTextures | null): Container {
  return heir ? drawPaintedHero(look, heir) : drawPlaceholderHero(look);
}

/**
 * How the Heir carries each painted off hand: drawn size (longest side, figure units), the point
 * of the picture (0..1) that sits on the fist or the back, an offset from there, a tilt
 * (radians), a squash of its width (a shield turned towards the enemy is seen at an angle) and
 * whether it is mirrored. Held items (`gripped`) go under the fist, which is drawn again on top;
 * a `floating` one hovers over the fist, bobbing in the scene.
 */
const OFF_HAND_HOLDS: Record<
  HeirOffHand,
  {
    size: number;
    anchor: [number, number];
    offset: [number, number];
    tilt: number;
    squash?: number;
    gripped?: boolean;
    floating?: boolean;
  }
> = {
  shield: { size: 112, anchor: [0.5, 0.5], offset: [8, 10], tilt: 0.06, squash: 0.84 },
  // The hand goes through the root ring: its right side in the fist, its left over the arm.
  focus: { size: 84, anchor: [0.44, 0.7], offset: [-4, 2], tilt: 0, gripped: true },
  // In front of the hand, the knot just under the fist.
  talisman: { size: 62, anchor: [0.6, 0.18], offset: [0, 20], tilt: -0.1 },
  grimoire: {
    size: 70,
    anchor: [0.5, 0.5],
    offset: [40, -10],
    tilt: 0.62,
    squash: -1,
    floating: true,
  },
  quiver: { size: 147, anchor: [0.55, 0.42], offset: [0, 0], tilt: -0.5 },
};

/** The painted off-hand item in its hold; the Ember Focus' orb gets a glow the scene breathes. */
function paintedOffHand(kind: HeirOffHand, texture: Texture, front = false): Container {
  const hold = OFF_HAND_HOLDS[kind];
  const [x, y] = kind === "quiver" ? HEIR_BACK : HEIR_OFF_HAND;
  const c = new Container({ label: kind === "quiver" ? "heir-quiver" : "heir-off-hand" });
  c.position.set(x + hold.offset[0], y + hold.offset[1]);
  // A hovering book tilts on its own; the light under it stays level.
  if (!hold.floating) c.rotation = hold.tilt;
  const sprite = new Sprite(texture);
  sprite.anchor.set(hold.anchor[0], hold.anchor[1]);
  const scale = hold.size / Math.max(texture.width, texture.height);
  sprite.scale.set(scale * (hold.squash ?? 1), scale);
  const w = texture.width * scale;
  const h = texture.height * scale;
  if (hold.floating) {
    // Void light under the hovering book; the scene lets the book bob and the light breathe.
    const glow = bakedGlow(
      [new Graphics().ellipse(0, h * 0.55, w * 0.3, h * 0.07).fill(0x7a3cd0)],
      8,
    );
    glow.label = "off-hand-glow";
    glow.alpha = 0.45;
    const book = new Container({ label: "off-hand-float" });
    sprite.rotation = hold.tilt;
    book.addChild(sprite);
    c.addChild(glow, book);
  } else {
    c.addChild(sprite);
  }
  if (kind === "focus" && !front) {
    // The ember in the orb glows over the painting.
    const orb = new Graphics()
      .circle((0.57 - hold.anchor[0]) * w, (0.25 - hold.anchor[1]) * h, w * 0.16)
      .fill(0xff8a2a);
    const glow = bakedGlow([orb], 8);
    glow.label = "off-hand-glow";
    glow.alpha = 0.45;
    c.addChild(glow);
  }
  return c;
}

function drawPaintedHero(look: HeroLook, heir: HeirTextures): Container {
  const c = new Container();
  const rig = buildHeirRig(heir);
  // A quiver rides on the back, behind everything (a Hunter always wears one).
  const quiver = look.offHand === "quiver" || look.heroClass === "hunter";
  const quiverArt = heir.offHands.quiver;
  if (quiver && quiverArt) c.addChild(paintedOffHand("quiver", quiverArt));
  const grip = HEIR_GRIPS[look.weapon];
  const weapon = weaponArt(look);
  weapon.rotation = grip.angle;
  weapon.scale.set(grip.length / WEAPON_LENGTH);
  weapon.pivot.set(grip.at * WEAPON_LENGTH, 0);
  if (grip.nudge) weapon.position.set(grip.nudge[0], grip.nudge[1]);
  rig.grip.addChild(weapon);
  // The forearm comes out of the sleeve, so it and the weapon sit behind the body.
  c.addChild(rig.sleeveMask, rig.arm, rig.body);
  // The off hand is held in the raised fist, in front of the chest.
  const held = look.offHand && look.offHand !== "quiver" ? look.offHand : null;
  const heldArt = held ? heir.offHands[held] : undefined;
  if (held && heldArt) {
    c.addChild(paintedOffHand(held, heldArt));
    if (OFF_HAND_HOLDS[held].gripped) c.addChild(heirOffFist(heir));
    if (held === "focus" && heir.focusFront)
      c.addChild(paintedOffHand(held, heir.focusFront, true));
  }
  return c;
}

function drawPlaceholderHero(look: HeroLook): Container {
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  const colors = CLASS_LOOKS[look.heroClass];
  // Off hand and back gear sit behind the body.
  if (look.offHand === "quiver" || look.heroClass === "hunter") {
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
  const robe = look.heroClass === "sorcerer" || look.heroClass === "warlock";
  const body = new Graphics();
  if (robe) {
    body
      .moveTo(-84, -150)
      .bezierCurveTo(-70, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 70, -260, 84, -150);
    if (look.heroClass === "warlock") {
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
  if (look.heroClass === "reaver") {
    // A blood-red sash across the chest.
    c.addChild(
      new Graphics()
        .poly([-50, -300, -30, -310, 52, -186, 32, -176])
        .fill(colors.chest)
        .stroke(line),
    );
  } else if (robe) {
    c.addChild(
      new Graphics().rect(-8, -300, 16, 150).fill(colors.chest).stroke(line),
      new Graphics()
        .circle(-40, -200, 4)
        .circle(40, -220, 4)
        .circle(-30, -260, 3)
        .fill({ color: look.heroClass === "sorcerer" ? 0xff8a3a : 0xa35cff, alpha: 0.9 }),
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
    case "warrior":
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
    case "reaver":
    case "hunter":
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
    case "sorcerer":
      // Hair and a high gold collar.
      head
        .moveTo(-40, -372)
        .bezierCurveTo(-34, -400, 34, -400, 40, -372)
        .lineTo(40, -364)
        .bezierCurveTo(30, -384, -30, -384, -40, -364)
        .closePath()
        .fill(0x3a2a1e)
        .stroke(line);
      head
        .moveTo(-52, -310)
        .quadraticCurveTo(-62, -350, -44, -372)
        .moveTo(52, -310)
        .quadraticCurveTo(62, -350, 44, -372)
        .stroke({ color: colors.head, width: 7, cap: "round" });
      break;
    case "warlock":
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
  c.addChild(heldWeapon(look));
  c.y = 150;
  return c;
}

export const RANGED_WEAPONS = new Set<HeroLook["weapon"]>(["wand", "staff", "bow", "crossbow"]);
