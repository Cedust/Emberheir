import { Container, Graphics } from "pixi.js";
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

/**
 * The Gatekeeper's gate (spielzeit-v1.md, walls): two ash-stone pillars carved with the Ember
 * sigil, fire bowls and a lintel, standing behind the enemy on the Waymark stages of a run's
 * newest act.
 */
export function drawGate(): {
  root: Container;
  sigil: Graphics;
  fires: { x: number; y: number }[];
} {
  const root = new Container();
  const stone = 0x6b625a;
  const dark = 0x3a332d;
  const top = GROUND_Y - 470;
  const fires: { x: number; y: number }[] = [];
  for (const dx of [-250, 250]) {
    const x = ENEMY_X + dx;
    root.addChild(
      new Graphics()
        .roundRect(x - 34, top, 68, GROUND_Y - top + 10, 8)
        .fill(stone)
        .stroke({ color: INK, width: 5 }),
      new Graphics()
        .moveTo(x - 20, top + 60)
        .lineTo(x - 8, top + 140)
        .lineTo(x - 22, top + 230)
        .moveTo(x + 14, top + 300)
        .lineTo(x + 4, top + 380)
        .stroke({ color: dark, width: 3, cap: "round" }),
    );
    // A fire bowl on an iron bracket halfway up the pillar.
    const by = top + 210;
    root.addChild(
      new Graphics()
        .moveTo(x, by + 40)
        .lineTo(x, by + 10)
        .stroke({ color: INK, width: 6, cap: "round" }),
      new Graphics()
        .poly([x - 34, by - 4, x + 34, by - 4, x + 22, by + 22, x - 22, by + 22])
        .fill(dark)
        .stroke({ color: INK, width: 4 }),
    );
    const glow = new Graphics().ellipse(x, by - 14, 40, 26).fill({ color: 0xff8a1f, alpha: 0.4 });
    glow.blendMode = "add";
    root.addChild(glow);
    fires.push({ x, y: by - 8 });
  }
  root.addChild(
    new Graphics()
      .roundRect(ENEMY_X - 302, top + 20, 604, 56, 10)
      .fill(stone)
      .stroke({ color: INK, width: 5 }),
  );
  // The Ember sigil carved into both pillars, glowing while the keeper stands.
  const sigil = new Graphics();
  for (const x of [ENEMY_X - 250, ENEMY_X + 250]) {
    const y = top + 110;
    sigil
      .circle(x, y, 18)
      .stroke({ color: 0xffb13b, width: 4 })
      .poly([x, y - 14, x + 9, y + 5, x, y + 13, x - 9, y + 5])
      .fill(0xff8a1f);
  }
  sigil.blendMode = "add";
  root.addChild(sigil);
  return { root, sigil, fires };
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
