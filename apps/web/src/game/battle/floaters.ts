import { BitmapFont, BitmapText, type Container } from "pixi.js";

/**
 * Floating numbers and names over the fighters. They are BitmapText from two fonts drawn once
 * (white, tinted per number): a plain Text paints its own canvas and uploads a new texture for
 * every number, which a fast fight (and every Lifesteal heal) does many times a second. The
 * text objects are reused.
 */

const PLAIN = "arena-float";
const CRIT = "arena-float-crit";
/** Size the fonts are drawn at; numbers scale from it. */
const BASE = 48;
const CHARS = "0123456789,.!+-% ⚒⛨↺⚔ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'";

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
    style: { ...common, stroke: { color: 0x1c1a18, width: (4 * BASE) / 28 } },
    chars: CHARS,
    resolution: 2,
  });
  BitmapFont.install({
    name: CRIT,
    style: {
      ...common,
      stroke: { color: 0x1c1a18, width: (5 * BASE) / 46 },
      dropShadow: { color: 0xffffff, alpha: 0.45, blur: 10, distance: 0 },
    },
    chars: CHARS,
    resolution: 2,
    padding: 12,
  });
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

interface Floater {
  readonly text: BitmapText;
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
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
}

export class Floaters {
  private live: Floater[] = [];
  private readonly spare: Record<"plain" | "crit", BitmapText[]> = { plain: [], crit: [] };

  constructor(private readonly parent: Container) {}

  get count(): number {
    return this.live.length;
  }

  spawn(o: FloatOptions): void {
    installFonts();
    const kind = o.crit ? "crit" : "plain";
    const text =
      this.spare[kind].pop() ??
      new BitmapText({ text: "", style: { fontFamily: o.crit ? CRIT : PLAIN, fontSize: BASE } });
    text.text = o.label;
    text.style.fontSize = o.fontSize;
    text.tint = o.color;
    text.anchor.set(0.5);
    text.position.set(o.x, o.y);
    text.rotation = o.crit ? -0.14 : 0;
    text.scale.set(1);
    text.alpha = 1;
    text.visible = true;
    text.label = kind;
    this.parent.addChild(text);
    this.live.push({ text, vx: o.vx, vy: o.vy, age: 0, life: o.life, pop: o.crit });
  }

  update(dt: number): void {
    let keep = 0;
    for (const f of this.live) {
      f.age += dt;
      f.text.x += f.vx * dt;
      f.text.y += f.vy * dt;
      const t = f.age / f.life;
      if (t >= 1) {
        f.text.removeFromParent();
        this.spare[f.text.label === "crit" ? "crit" : "plain"].push(f.text);
        continue;
      }
      f.text.scale.set(f.pop && f.age < 0.15 ? 1 + (0.15 - f.age) * 3 : 1);
      f.text.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      this.live[keep++] = f;
    }
    this.live.length = keep;
  }

  destroy(): void {
    for (const t of [...this.spare.plain, ...this.spare.crit]) t.destroy();
    this.spare.plain = [];
    this.spare.crit = [];
    this.live = [];
  }
}
