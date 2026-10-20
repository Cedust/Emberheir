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
  /** Per pixel column, the middle row of the painting's thickest part (null where empty). */
  readonly centre: readonly (number | null)[];
  /** The Bow without its painted string, for a hand that draws it (the arena's ranged pose). */
  readonly unstrung: Unstrung | null;
}

/** A painted Bow with its string taken out: the code draws the string between its two ends. */
export interface Unstrung {
  readonly body: Texture;
  readonly mask: Texture;
  /** Where the string met the limbs, in painting pixels. */
  readonly ends: readonly [readonly [number, number], readonly [number, number]];
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
  /** Refine hotspots moved along the weapon to sit on a painted part (node id -> t). */
  readonly refineT?: Readonly<Record<string, number>>;
  /** The painting's tip (x along, y across the axis), where a Wand's or Staff's orbs hang. */
  readonly tip?: { readonly x: number; readonly y: number };
  /** An unstrung Bow: where its string meets the limbs (x along, y across the axis). */
  readonly stringEnds?: readonly [readonly [number, number], readonly [number, number]];
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

/** The middle of the longest opaque run in each column (a bow's limb, not its thin string). */
function centreLine(alpha: Uint8ClampedArray, w: number, h: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let x = 0; x < w; x++) {
    let best = 0;
    let mid: number | null = null;
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const on = y < h && (alpha[(y * w + x) * 4 + 3] ?? 0) > 128;
      if (on && start < 0) start = y;
      if (!on && start >= 0) {
        if (y - start > best) {
          best = y - start;
          mid = (start + y) / 2;
        }
        start = -1;
      }
    }
    out.push(mid);
  }
  return out;
}

/** The opaque runs (start, end) of one pixel column. */
function runs(alpha: Uint8ClampedArray, w: number, h: number, x: number): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let y = 0; y <= h; y++) {
    const on = y < h && (alpha[(y * w + x) * 4 + 3] ?? 0) > 128;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      out.push([start, y]);
      start = -1;
    }
  }
  return out;
}

/**
 * Takes the painted string out of a Bow: in each column, a thin run below the limb. What is
 * left of the string's soft edge goes with it. Null when no string is found.
 */
function unstring(texture: Texture): Unstrung | null {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = texture.width);
  const h = (canvas.height = texture.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(texture.source.resource as CanvasImageSource, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  let first: [number, number] | null = null;
  let last: [number, number] | null = null;
  let seen: [number, number] | null = null;
  const merged: [number, number, number][] = [];
  for (let x = 0; x < w; x++) {
    const col = runs(px, w, h, x);
    const limb = col.reduce<[number, number] | null>(
      (best, r) => (!best || r[1] - r[0] > best[1] - best[0] ? r : best),
      null,
    );
    if (!limb) continue;
    const string = col.find((r) => r[0] > limb[1] + 1 && r[1] - r[0] <= 8);
    if (!string) {
      // At the grip the string runs into the limb's lower edge: cut it off there too (once the
      // string shows again further on, so the limbs' tips stay whole).
      if (seen && limb[1] >= seen[1] - 1) merged.push([x, seen[0] - 1, limb[1] + 3]);
      continue;
    }
    seen = string;
    const mid = (string[0] + string[1]) / 2;
    first ??= [x, mid];
    last = [x, mid];
    for (let y = Math.max(limb[1] + 1, string[0] - 3); y < Math.min(h, string[1] + 3); y++)
      px[(y * w + x) * 4 + 3] = 0;
  }
  if (!first || !last || last[0] - first[0] < w / 2) return null;
  for (const [x, from, to] of merged) {
    if (x > last[0]) break;
    for (let y = from; y < Math.min(h, to); y++) px[(y * w + x) * 4 + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  const body = Texture.from(canvas);
  const white = document.createElement("canvas");
  white.width = w;
  white.height = h;
  const wctx = white.getContext("2d");
  if (wctx) {
    wctx.drawImage(canvas, 0, 0);
    wctx.globalCompositeOperation = "source-in";
    wctx.fillStyle = "#ffffff";
    wctx.fillRect(0, 0, w, h);
  }
  return { body, mask: Texture.from(white), ends: [first, last] };
}

function whiteMask(texture: Texture): { mask: Texture; centre: (number | null)[] } {
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = texture.source.resource as CanvasImageSource;
  let centre: (number | null)[] = [];
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    centre = centreLine(pixels, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return { mask: Texture.from(canvas), centre };
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
      const unstrung = weaponId === "bow" ? unstring(body) : null;
      const textures = { body, ...whiteMask(body), gem, arrow, unstrung };
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

/**
 * Refine hotspots moved onto the painted Bow's parts, per form: Steady Hand on the right grip
 * ring (clear of the nocked arrow), Full Swing lower on the right limb (clear of the Volley path).
 */
const BOW_REFINE: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  plain: { "steady-hand": 0.57, "full-swing": 0.737 },
  "rain-of-arrows": { "steady-hand": 0.573, "full-swing": 0.72 },
  "patient-draw": { "steady-hand": 0.6, "full-swing": 0.72 },
  "hunters-mark": { "steady-hand": 0.571, "full-swing": 0.737 },
  "wild-shot": { "steady-hand": 0.586, "full-swing": 0.72 },
};

/** Weapons whose painting is shaped unlike the code build: runes and Refine hotspots follow it. */
const PAINTED_CENTRE = new Set(["bow"]);

/** The painting's centre line as an offset from its axis, `t` from the pommel (0) to the tip (1). */
function paintedCentre(
  centre: readonly (number | null)[],
  axis: number,
  scale: number,
  plainW: number,
): (t: number) => number {
  const at = (x: number): number | null =>
    centre[Math.min(centre.length - 1, Math.max(0, x))] ?? null;
  return (t) => {
    const x = Math.round(t * plainW);
    // Average a few columns either side: the limb's bands and wraps make single columns jumpy.
    let sum = 0;
    let n = 0;
    for (let d = -12; d <= 12; d++) {
      const c = at(x + d);
      if (c !== null) {
        sum += c;
        n++;
      }
    }
    return n ? (sum / n - axis) * scale : 0;
  };
}

/** The painting's last opaque columns: its tip, in painting pixels from the pommel and axis. */
function paintedTip(centre: readonly (number | null)[], axis: number): { x: number; y: number } {
  for (let x = centre.length - 1; x >= 0; x--) {
    const c = centre[x];
    if (c == null) continue;
    // A few columns in: the very last ones are a pixel or two of soft edge.
    const inner = centre.slice(Math.max(0, x - 4), x + 1).filter((v): v is number => v != null);
    return { x, y: inner.reduce((a, b) => a + b, 0) / inner.length - axis };
  }
  return { x: centre.length, y: 0 };
}

/** The painted weapon, `length` pixels from the pommel to the plain form's tip. */
export function drawPaintedWeapon(
  weaponId: string,
  length: number,
  look: WeaponLook,
  textures: PaintedTextures,
  /** Without its painted string and nocked arrow (a Bow the hand draws), when it has one. */
  unstrung = false,
): SceneWeaponArt {
  const bare = unstrung ? textures.unstrung : null;
  const bodyTexture = bare?.body ?? textures.body;
  const maskTexture = bare?.mask ?? textures.mask;
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
  const painting = place(new Sprite(bodyTexture));
  const filter = gradeFilter(look.grade);
  if (filter) painting.filters = [filter];
  body.addChild(painting);
  if (look.grade <= 0) {
    // Crude: a dark wash over the painting.
    const dull = place(new Sprite(maskTexture));
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
  if (textures.arrow && !bare) {
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
  const anchorY = weaponMarks(
    weaponId,
    length,
    look,
    marks,
    runeGlow,
    PAINTED_CENTRE.has(weaponId)
      ? paintedCentre(textures.centre, size.axis, scale, plain.w)
      : undefined,
  );
  body.addChild(marks);
  const tip = paintedTip(textures.centre, size.axis);
  return {
    body,
    edge: place(new Sprite(maskTexture)),
    runeGlow,
    silhouette: () => place(new Sprite(maskTexture)),
    anchorY,
    glowBehind: true,
    tip: { x: tip.x * scale, y: tip.y * scale },
    ...(bare
      ? {
          stringEnds: [
            [bare.ends[0][0] * scale, (bare.ends[0][1] - size.axis) * scale],
            [bare.ends[1][0] * scale, (bare.ends[1][1] - size.axis) * scale],
          ] as const,
        }
      : {}),
    ...(weaponId === "bow" ? { refineT: BOW_REFINE[formOf(weaponId, look) ?? "plain"] ?? {} } : {}),
  };
}
