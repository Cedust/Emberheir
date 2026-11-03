import {
  BitmapFont,
  BitmapText,
  Container,
  FillGradient,
  Sprite,
  Text,
  Texture,
  type TextStyleOptions,
} from "pixi.js";

/**
 * Floating numbers and names over the fighters. They are BitmapText from two fonts drawn once
 * (white, tinted per number): a plain Text paints its own canvas and uploads a new texture for
 * every number, which a fast fight (and every Lifesteal heal) does many times a second. The
 * text objects are reused.
 *
 * Only a Mighty Crit (rare) is a plain Text: its fill runs from orange to dark orange-red over
 * the whole number, which a tinted bitmap font cannot do. A Mighty Hit carries a small hammer
 * drawn once into a texture (the number font has no hammer glyph).
 */

const PLAIN = "arena-float";
const CRIT = "arena-float-crit";
/** Size the fonts are drawn at; numbers scale from it. */
const BASE = 48;
const CHARS = "0123456789,.!+-% ⛨↺⚔ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'";
const INK = 0x1c1a18;

/** Crit and Mighty Hit number colours (also in `DAMAGE_COLORS`). */
export const CRIT_ORANGE = 0xff9a2e;
export const MIGHTY_RED = 0xe5532a;

const CRIT_STYLE = {
  fontFamily: "JetBrains Mono, monospace",
  fontWeight: "700",
  fontSize: BASE,
  fill: 0xffffff,
  stroke: { color: INK, width: (5 * BASE) / 46 },
  dropShadow: { color: 0xffffff, alpha: 0.45, blur: 10, distance: 0 },
} as const;

let installed = false;

function installFonts(): void {
  if (installed) return;
  installed = true;
  const common = {
    fontFamily: "JetBrains Mono, monospace",
    fontWeight: "700",
    fontSize: BASE,
    fill: 0xffffff,
  } as const;
  // Stroke widths match the old Text at 28 px (4) and 46 px (5), scaled to the base size.
  BitmapFont.install({
    name: PLAIN,
    style: { ...common, stroke: { color: INK, width: (4 * BASE) / 28 } },
    chars: CHARS,
    resolution: 2,
  });
  BitmapFont.install({
    name: CRIT,
    style: CRIT_STYLE,
    chars: CHARS,
    resolution: 2,
    padding: 12,
  });
}

/** The Mighty Crit fill: bright orange on top, deep red at the foot of the digits. */
function mightyCritStyle(): TextStyleOptions {
  return {
    ...CRIT_STYLE,
    fill: new FillGradient({
      type: "linear",
      start: { x: 0, y: 0.2 },
      end: { x: 0, y: 0.85 },
      colorStops: [
        { offset: 0, color: 0xffc04a },
        { offset: 1, color: 0xc4280f },
      ],
      textureSpace: "local",
    }),
  };
}

let hammerTexture: Texture | null = null;

/** A small hammer, white with a dark outline so it takes the number's tint. */
function hammer(): Texture {
  if (hammerTexture) return hammerTexture;
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) {
    g.translate(size / 2, size / 2);
    g.rotate(-Math.PI / 4);
    g.lineJoin = "round";
    g.lineWidth = 9;
    g.strokeStyle = "#1c1a18";
    g.fillStyle = "#ffffff";
    const shape = () => {
      g.beginPath();
      // Handle, then the head across its top.
      g.rect(-6, -14, 12, 52);
      g.rect(-28, -36, 56, 26);
    };
    shape();
    g.stroke();
    shape();
    g.fill();
  }
  hammerTexture = Texture.from(canvas);
  return hammerTexture;
}

/** Loads the number font before the fonts are drawn (else the canvas falls back to another). */
export async function prepareFloaterFonts(): Promise<void> {
  try {
    await document.fonts?.load(`700 ${BASE}px "JetBrains Mono"`);
  } catch {
    // The fallback font still works.
  }
  installFonts();
}

type Kind = "plain" | "crit" | "mighty";

/** One floater: its text, and the hammer when it is a Mighty Hit. */
interface Piece {
  readonly box: Container;
  readonly text: BitmapText | Text;
  readonly icon: Sprite;
  readonly kind: Kind;
}

interface Floater {
  readonly piece: Piece;
  vx: number;
  vy: number;
  age: number;
  life: number;
  pop: boolean;
}

export interface FloatOptions {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly color: number;
  readonly fontSize: number;
  readonly crit: boolean;
  /** A Mighty Crit: the gradient number, not tinted. */
  readonly mightyCrit?: boolean;
  /** A Mighty Hit: a hammer after the number, in its tint. */
  readonly hammer?: boolean;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
}

export class Floaters {
  private live: Floater[] = [];
  private readonly spare: Record<Kind, Piece[]> = { plain: [], crit: [], mighty: [] };

  constructor(private readonly parent: Container) {}

  get count(): number {
    return this.live.length;
  }

  private make(kind: Kind): Piece {
    const text =
      kind === "mighty"
        ? new Text({ text: "", style: mightyCritStyle() })
        : new BitmapText({
            text: "",
            style: { fontFamily: kind === "crit" ? CRIT : PLAIN, fontSize: BASE },
          });
    text.anchor.set(0.5);
    const icon = new Sprite(hammer());
    icon.anchor.set(0.5);
    const box = new Container();
    box.addChild(text, icon);
    return { box, text, icon, kind };
  }

  spawn(o: FloatOptions): void {
    installFonts();
    const kind: Kind = o.mightyCrit ? "mighty" : o.crit ? "crit" : "plain";
    const piece = this.spare[kind].pop() ?? this.make(kind);
    const { box, text, icon } = piece;
    text.text = o.label;
    text.style.fontSize = o.fontSize;
    text.tint = kind === "mighty" ? 0xffffff : o.color;
    icon.visible = o.hammer === true;
    if (icon.visible) {
      const h = o.fontSize * 0.95;
      icon.width = h;
      icon.height = h;
      icon.tint = kind === "mighty" ? MIGHTY_RED : o.color;
      icon.position.set(text.width / 2 + h * 0.45, o.fontSize * 0.02);
    }
    box.position.set(o.x, o.y);
    box.rotation = kind === "plain" ? 0 : -0.14;
    box.scale.set(1);
    box.alpha = 1;
    this.parent.addChild(box);
    this.live.push({ piece, vx: o.vx, vy: o.vy, age: 0, life: o.life, pop: kind !== "plain" });
  }

  update(dt: number): void {
    let keep = 0;
    for (const f of this.live) {
      const box = f.piece.box;
      f.age += dt;
      box.x += f.vx * dt;
      box.y += f.vy * dt;
      const t = f.age / f.life;
      if (t >= 1) {
        box.removeFromParent();
        this.spare[f.piece.kind].push(f.piece);
        continue;
      }
      box.scale.set(f.pop && f.age < 0.15 ? 1 + (0.15 - f.age) * 3 : 1);
      box.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      this.live[keep++] = f;
    }
    this.live.length = keep;
  }

  destroy(): void {
    for (const p of [...this.spare.plain, ...this.spare.crit, ...this.spare.mighty])
      p.box.destroy({ children: true });
    this.spare.plain = [];
    this.spare.crit = [];
    this.spare.mighty = [];
    this.live = [];
  }
}
