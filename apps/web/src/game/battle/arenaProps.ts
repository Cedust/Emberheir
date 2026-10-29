import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import gateBrokenUrl from "../../assets/arena/gatekeeper-gate-broken.webp";
import gateUrl from "../../assets/arena/gatekeeper-gate.webp";
import { BLEED, ENEMY_X, GROUND_Y, H, HERO_X, INK, lighten, W } from "./arenaLayout";

/** Arena props: ground, stun stars, the Gatekeeper's gate and the glows around the fight. */

/** Three little stars circling a stunned fighter's head. */
export function drawStars(g: Graphics, clock: number, y: number): void {
  g.clear();
  for (let i = 0; i < 3; i++) {
    const a = clock * 4 + (i * Math.PI * 2) / 3;
    const x = Math.cos(a) * 46;
    const yy = y + Math.sin(a) * 12;
    const r = 9;
    const pts: number[] = [];
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? r * 0.45 : r;
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      pts.push(x + Math.cos(ang) * rr, yy + Math.sin(ang) * rr);
    }
    g.poly(pts)
      .fill({ color: 0xffe14d, alpha: Math.sin(a) > -0.3 ? 1 : 0.5 })
      .stroke({
        color: 0x2a1f17,
        width: 2,
      });
  }
}

export function drawGround(): Container {
  const c = new Container();
  c.addChild(
    new Graphics()
      .moveTo(-BLEED, 380)
      .quadraticCurveTo(-600, 160, 0, 410)
      .quadraticCurveTo(180, 110, 360, 145)
      .quadraticCurveTo(540, 180, 720, 130)
      .quadraticCurveTo(900, 120, 1080, 140)
      .quadraticCurveTo(1260, 160, 1440, 120)
      .quadraticCurveTo(2000, 180, W + BLEED, 150)
      .lineTo(W + BLEED, H + BLEED)
      .lineTo(-BLEED, H + BLEED)
      .closePath()
      .fill({ color: 0x000000, alpha: 0.16 }),
    new Graphics()
      .moveTo(-BLEED, 260)
      .quadraticCurveTo(-500, 240, 0, 500)
      .quadraticCurveTo(260, 220, 520, 240)
      .quadraticCurveTo(780, 260, 1040, 235)
      .quadraticCurveTo(1240, 220, 1440, 225)
      .quadraticCurveTo(1900, 260, W + BLEED, 240)
      .lineTo(W + BLEED, H + BLEED)
      .lineTo(-BLEED, H + BLEED)
      .closePath()
      .fill({ color: 0x000000, alpha: 0.18 }),
    new Graphics()
      .poly([60, 410, 90, 360, 120, 410])
      .poly([1300, 395, 1335, 335, 1370, 395])
      .poly([1350, 400, 1380, 360, 1410, 400])
      .fill({ color: 0x000000, alpha: 0.22 })
      .stroke({ color: INK, width: 2, alpha: 0.5 }),
  );
  return c;
}

/** Timo's painted gate, whole and broken, in one frame (tools/art/cut_gate.py). */
const GATE_URLS = { whole: gateUrl, broken: gateBrokenUrl } as const;

export type GateTextures = { readonly whole: Texture; readonly broken: Texture };

export function loadGateTextures(): Promise<GateTextures | null> {
  return Promise.all([
    Assets.load<Texture>(GATE_URLS.whole),
    Assets.load<Texture>(GATE_URLS.broken),
  ])
    .then(([whole, broken]) => ({ whole, broken }))
    .catch(() => null);
}

/** Painting px → stage px; the gate stands a little wider than a big enemy. */
const GATE_SCALE = 0.5;
/** Where the painting's fire bowls and carved sigils sit, in painting px. */
const GATE_BOWLS = [
  { x: 245, y: 560 },
  { x: 1210, y: 560 },
];
const GATE_SIGILS = [
  { x: 250, y: 395 },
  { x: 1200, y: 393 },
];

export interface Gate {
  readonly root: Container;
  /** The whole and the broken painting; the broken one shows once the keeper fell. */
  readonly whole: Sprite;
  readonly broken: Sprite;
  /** Glow on the carved sigils, pulsing while the keeper stands. */
  readonly sigil: Graphics;
  /** The warm light over the fire bowls, out when the gate breaks. */
  readonly light: Graphics;
  readonly fires: { x: number; y: number }[];
}

/**
 * The Gatekeeper's gate (spielzeit-v1.md, walls): two ash-stone pillars with carved Ember
 * sigils, fire bowls and a stone arch, standing behind the enemy on the Waymark stages of a
 * run's newest act. The painting has empty bowls and dark sigils: the fire and glow are drawn
 * here, so they can go out when the gate breaks.
 */
export function drawGate(tex: GateTextures): Gate {
  const root = new Container();
  const left = ENEMY_X - (tex.whole.width * GATE_SCALE) / 2;
  const top = GROUND_Y + 12 - tex.whole.height * GATE_SCALE;
  const at = (p: { x: number; y: number }) => ({
    x: left + p.x * GATE_SCALE,
    y: top + p.y * GATE_SCALE,
  });
  const sprite = (t: Texture) => {
    const s = new Sprite(t);
    s.position.set(left, top);
    s.scale.set(GATE_SCALE);
    root.addChild(s);
    return s;
  };
  const whole = sprite(tex.whole);
  const broken = sprite(tex.broken);
  broken.visible = false;
  const fires = GATE_BOWLS.map(at);
  // Light and sigil glow are drawn in painting px on the painting's own frame.
  const painted = (g: Graphics) => {
    g.position.set(left, top);
    g.scale.set(GATE_SCALE);
    g.blendMode = "add";
    return g;
  };
  const light = painted(new Graphics());
  for (const b of GATE_BOWLS) {
    light.ellipse(b.x, b.y - 10, 92, 34).fill({ color: 0xff8a1f, alpha: 0.28 });
  }
  // The Ember sigil glows in its carving while the keeper stands: the ring and the drop.
  const sigil = painted(new Graphics());
  for (const p of GATE_SIGILS) {
    sigil
      .circle(p.x, p.y, 76)
      .fill({ color: 0xff8a1f, alpha: 0.12 })
      .circle(p.x, p.y, 72)
      .stroke({ color: 0xffb13b, width: 7, alpha: 0.85 })
      .poly([p.x, p.y - 48, p.x + 19, p.y + 16, p.x - 19, p.y + 16])
      .fill({ color: 0xff8a1f, alpha: 0.85 })
      .circle(p.x, p.y + 22, 20)
      .fill({ color: 0xff8a1f, alpha: 0.85 });
  }
  root.addChild(light, sigil);
  return { root, whole, broken, sigil, light, fires };
}

/**
 * Level gap on the ground: a warm gold light under the hero who has outlevelled a foe by 3 or
 * more (a wall farmed down, level-v2.md), a red one under an enemy 5 or more levels above.
 */
/** Wildfire: a wide ember glow over the ground, brightest at the edges where the fire stands. */
export function drawWildfireGlow(): Graphics {
  const g = new Graphics();
  for (let i = 6; i > 0; i--) {
    g.ellipse(720, GROUND_Y + 30, 520 + i * 90, 40 + i * 16).fill({ color: 0xff5a1a, alpha: 0.05 });
  }
  for (const x of [0, 1440]) {
    for (let i = 5; i > 0; i--) {
      g.ellipse(x, GROUND_Y, 120 + i * 40, 90 + i * 30).fill({ color: 0xff8a1f, alpha: 0.06 });
    }
  }
  g.blendMode = "add";
  return g;
}

/** The Draught's brew ring: a glowing pool of its colour under the hero, with a thin rim. */
export function drawDraughtRing(color: number): Graphics {
  const g = new Graphics();
  for (let i = 4; i > 0; i--) {
    g.ellipse(HERO_X, GROUND_Y + 4, 60 + i * 18, 12 + i * 5).fill({ color, alpha: 0.07 });
  }
  g.ellipse(HERO_X, GROUND_Y + 4, 118, 28).stroke({ color, width: 2.5, alpha: 0.7 });
  g.ellipse(HERO_X, GROUND_Y + 4, 100, 22).stroke({ color: lighten(color), width: 1, alpha: 0.5 });
  g.blendMode = "add";
  g.label = "draught-ring";
  return g;
}

export function drawLevelGlow(gap: number): Graphics | null {
  const hero = gap <= -3;
  if (!hero && gap < 5) return null;
  const [x, color] = hero ? [HERO_X, 0xffd27a] : [ENEMY_X, 0xff4a3a];
  const g = new Graphics();
  for (let i = 5; i > 0; i--) {
    g.ellipse(x, GROUND_Y + 6, 70 + i * 26, 16 + i * 7).fill({ color, alpha: 0.08 });
  }
  return g;
}
