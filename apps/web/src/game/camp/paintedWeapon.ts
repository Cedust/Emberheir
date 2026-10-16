import { Assets, ColorMatrixFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { MASTERY_ART } from "./masteryArtData";
import { weaponMarks } from "./weaponArt";
import type { WeaponLook } from "./weaponLookData";

/**
 * Timo's painted weapons for Weapon Mastery (art/mastery/<weapon>-sheet-v1.png, cut by
 * tools/art/cut_mastery.py): one painting per weapon and Keystone form, lying along the x axis
 * from the pommel (x = 0) to the tip. The code keeps what the build adds on top: the grade
 * (colour filter, edge light, rust or filigree) and the glowing path runes.
 */

const URLS = import.meta.glob<string>("../../assets/mastery/*.webp", {
  eager: true,
  import: "default",
});

/** The painting and its white silhouette (for shadow, glow and the Echo's aura). */
export interface PaintedTextures {
  readonly body: Texture;
  readonly mask: Texture;
  /** The crystal or orb as grey light, tinted in the Attunement's colour (Wand, Staff). */
  readonly gem: Texture | null;
  /** The loose arrow the Bow nocks. */
  readonly arrow: Texture | null;
}

/** A weapon as the Mastery scene draws it: painted or drawn in code (weaponArt.ts). */
export interface SceneWeaponArt {
  readonly body: Container;
  readonly edge: Container;
  readonly runeGlow: Graphics;
  readonly silhouette: () => Container;
  readonly anchorY: (t: number) => number;
  /** The grade's light shines from behind the weapon instead of over it. */
  readonly glowBehind?: boolean;
}

function formOf(weaponId: string, look: WeaponLook): string | null {
  const forms = MASTERY_ART[weaponId];
  if (!forms?.plain) return null;
  return look.keystone && forms[look.keystone] ? look.keystone : "plain";
}

function urlOf(weaponId: string, form: string): string | undefined {
  return URLS[`../../assets/mastery/${weaponId}-${form}.webp`];
}

/** True when this weapon has paintings (the scene then waits for them instead of drawing). */
export function hasPainting(weaponId: string, look: WeaponLook): boolean {
  const form = formOf(weaponId, look);
  return form !== null && urlOf(weaponId, form) !== undefined;
}

const loaded = new Map<string, PaintedTextures>();
const loading = new Map<string, Promise<PaintedTextures>>();

function whiteMask(texture: Texture): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;
  const ctx = canvas.getContext("2d");
  const image = texture.source.resource as CanvasImageSource;
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return Texture.from(canvas);
}

/** The painting of the build's form if it is loaded, else a promise that loads it. */
export function paintedTextures(
  weaponId: string,
  look: WeaponLook,
): PaintedTextures | Promise<PaintedTextures> | null {
  const form = formOf(weaponId, look);
  const url = form ? urlOf(weaponId, form) : undefined;
  if (!url) return null;
  const ready = loaded.get(url);
  if (ready) return ready;
  let pending = loading.get(url);
  if (!pending) {
    const extra = (u: string | undefined) => (u ? Assets.load<Texture>(u) : Promise.resolve(null));
    pending = Promise.all([
      Assets.load<Texture>(url),
      extra(urlOf(weaponId, `${form}-gem`)),
      extra(weaponId === "bow" ? urlOf(weaponId, "arrow") : undefined),
    ]).then(([body, gem, arrow]) => {
      const textures = { body, mask: whiteMask(body), gem, arrow };
      loaded.set(url, textures);
      return textures;
    });
    loading.set(url, pending);
  }
  return pending;
}

/** Crude dull and dark, Honed as painted, Tempered crisp, Ascendant gilded, Exalted radiant. */
function gradeFilter(grade: number): ColorMatrixFilter | null {
  if (grade === 1) return null;
  const f = new ColorMatrixFilter();
  if (grade <= 0) {
    f.saturate(-0.45, false);
    return f;
  }
  if (grade === 2) {
    f.contrast(0.18, false);
    f.saturate(0.12, true);
  } else if (grade === 3) {
    f.tint(0xfff0d4, false);
    f.brightness(1.06, true);
  } else {
    f.tint(0xfff6e6, false);
    f.brightness(1.16, true);
  }
  return f;
}

/** The painted weapon, `length` pixels from the pommel to the plain form's tip. */
export function drawPaintedWeapon(
  weaponId: string,
  length: number,
  look: WeaponLook,
  textures: PaintedTextures,
): SceneWeaponArt {
  const forms = MASTERY_ART[weaponId] ?? {};
  const size = forms[formOf(weaponId, look) ?? "plain"] ?? forms.plain;
  const plain = forms.plain;
  if (!size || !plain) throw new Error(`No painting for ${weaponId}`);
  const scale = length / plain.w;
  const place = <T extends Sprite>(sprite: T): T => {
    sprite.scale.set(scale);
    sprite.position.set(0, -size.axis * scale);
    return sprite;
  };
  const body = new Container();
  const painting = place(new Sprite(textures.body));
  const filter = gradeFilter(look.grade);
  if (filter) painting.filters = [filter];
  body.addChild(painting);
  if (look.grade <= 0) {
    // Crude: a dark wash over the painting.
    const dull = place(new Sprite(textures.mask));
    dull.tint = 0x1a120c;
    dull.alpha = 0.28;
    body.addChild(dull);
  }
  if (textures.gem) {
    // The Attunement colours the crystal or orb: its light tinted, plus a soft added shine.
    const gem = place(new Sprite(textures.gem));
    gem.tint = look.accent;
    const shine = place(new Sprite(textures.gem));
    shine.tint = look.accent;
    shine.alpha = 0.35;
    shine.blendMode = "add";
    body.addChild(gem, shine);
  }
  if (textures.arrow) {
    // Arrows nocked on the string's middle, pointing away from it: three for Hailstorm.
    const arrowSize = MASTERY_ART[weaponId]?.arrow;
    const string = (size.h - size.axis - 4) * scale;
    const span = size.w * scale;
    const aim = look.keystone === "rain-of-arrows" ? [-0.3, 0.3, 0] : [0];
    for (const a of aim) {
      const arrow = new Sprite(textures.arrow);
      const s = (length * 0.42) / (arrowSize?.w ?? textures.arrow.width);
      arrow.anchor.set(0, 0.5);
      arrow.scale.set(s);
      arrow.position.set(span / 2, string);
      arrow.rotation = -Math.PI / 2 + a;
      body.addChild(arrow);
    }
  }
  const marks = new Graphics();
  const runeGlow = new Graphics();
  const anchorY = weaponMarks(weaponId, length, look, marks, runeGlow);
  body.addChild(marks);
  return {
    body,
    edge: place(new Sprite(textures.mask)),
    runeGlow,
    silhouette: () => place(new Sprite(textures.mask)),
    anchorY,
    glowBehind: true,
  };
}
