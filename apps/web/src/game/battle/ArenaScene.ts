import type { CombatEvent, FightSnapshot, Side } from "@emberheir/sim";
import { Application, Container, Graphics, Text } from "pixi.js";

/**
 * The PixiJS arena (battle-view-v1.md section 2): ground, two placeholder figures, floating
 * damage numbers and hit effects. It only reads fight events and snapshots; the fight itself
 * runs in the sim. Placeholder art until the painted sprites exist.
 */

export interface HeroLook {
  readonly weapon: "sword" | "wand" | "axe" | "dagger" | "bow" | "crossbow" | "mace" | "staff";
  readonly offHand: "shield" | "focus" | null;
}

export interface EnemyLook {
  readonly archetype: string;
  readonly boss: boolean;
  readonly elite: boolean;
  /** Act number: every act dresses its enemies in its own colors. */
  readonly act: number;
  /** The Ember Thief carries a glowing sack of loot on its back. */
  readonly thief?: boolean;
}

/** Original damage-type colors (ui-look-v1.md): the arena uses them in both modes. */
const DAMAGE_COLORS: Record<string, number> = {
  physical: 0xc9c2b8,
  fire: 0xff6a2b,
  cold: 0x6fd3ff,
  lightning: 0xffe14d,
  void: 0xa35cff,
  burn: 0xff6a2b,
  chill: 0x6fd3ff,
  shock: 0xffe14d,
  bleed: 0xe0314b,
  poison: 0xb5d82c,
  corruption: 0xa35cff,
  heal: 0x4fe08a,
  barrier: 0xe8e2d6,
  miss: 0xd8d0c4,
};

const AILMENT_TINT: Record<string, number> = {
  burn: 0xff8a5a,
  chill: 0x9fe0ff,
  shock: 0xfff08a,
  bleed: 0xff9a9a,
  poison: 0xc4f0a0,
  corruption: 0xc9a0ff,
};

/** The arena is drawn for 1440 × 708 stage pixels; wider or taller hosts see more ground. */
const W = 1440;
const H = 708;
const BLEED = 1200;
const GROUND_Y = 660;
const HERO_X = 400;
const ENEMY_X = 1040;
const INK = 0x2a1f17;

interface Floater {
  readonly text: Text;
  readonly vx: number;
  readonly vy: number;
  age: number;
  readonly life: number;
  readonly pop: boolean;
}

interface Figure {
  readonly root: Container;
  readonly body: Container;
  readonly side: Side;
  lunge: number;
  flash: number;
}

export class ArenaScene {
  private app: Application | null = null;
  private readonly world = new Container();
  private size = { w: W, h: H, resolution: 1 };
  private destroyed = false;
  private hero: Figure | null = null;
  private enemy: Figure | null = null;
  private telegraph: Graphics | null = null;
  private aura: Graphics | null = null;
  private floaters: Floater[] = [];
  private clock = 0;
  private telegraphOn = false;
  private tint: Record<Side, number> = { hero: 0xffffff, enemy: 0xffffff };
  showNumbers = true;
  paused = false;

  /**
   * Host size in stage pixels and device pixels per stage pixel. The drawing stays centered
   * and sits on the bottom edge; the canvas renders at the screen's real pixel density.
   */
  layout(w: number, h: number, resolution: number): void {
    this.size = { w, h, resolution };
    this.world.position.set((w - W) / 2, h - H);
    this.app?.renderer.resize(w, h, resolution);
  }

  async mount(host: HTMLElement, hero: HeroLook, enemy: EnemyLook): Promise<void> {
    const app = new Application();
    try {
      await app.init({
        width: this.size.w,
        height: this.size.h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: this.size.resolution,
        autoDensity: true,
      });
    } catch {
      // No WebGL: the fight still runs, only the arena art is missing.
      return;
    }
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(app.canvas);
    app.stage.addChild(this.world);

    this.world.addChild(drawGround());
    this.aura = new Graphics();
    if (enemy.elite || enemy.boss) {
      this.aura
        .ellipse(ENEMY_X, GROUND_Y - 120, enemy.boss ? 210 : 170, enemy.boss ? 180 : 150)
        .stroke({ color: enemy.boss ? 0xff8a1f : 0xffd84a, width: 3, alpha: 0.45 });
    }
    this.world.addChild(this.aura);
    this.telegraph = new Graphics()
      .ellipse(ENEMY_X, GROUND_Y - 130, 200, 170)
      .stroke({ color: 0xff6a2b, width: 5 });
    this.telegraph.alpha = 0;
    this.world.addChild(this.telegraph);

    this.hero = makeFigure("hero", drawHero(hero), HERO_X);
    this.enemy = makeFigure("enemy", drawEnemy(enemy), ENEMY_X);
    this.world.addChild(this.hero.root, this.enemy.root);

    app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.destroy(true, { children: true });
    this.app = null;
  }

  /** New fight events since the last call. */
  onEvents(events: readonly CombatEvent[]): void {
    if (!this.app) return;
    for (const e of events) {
      switch (e.type) {
        case "hit": {
          this.figure(e.side).lunge = 1;
          const target = this.figure(other(e.side));
          target.flash = 1;
          if (this.showNumbers) {
            const text = `${e.damage.toLocaleString("en-US")}${e.crit ? "!" : ""}`;
            this.float(
              other(e.side),
              e.blocked ? `${text} ⛨` : text,
              DAMAGE_COLORS[e.damageType] ?? 0xffffff,
              e.crit,
            );
          }
          break;
        }
        case "dot":
          if (this.showNumbers)
            this.float(e.side, String(e.damage), DAMAGE_COLORS[e.ailment] ?? 0xffffff, false, 0.75);
          break;
        case "heal":
          if (this.showNumbers)
            this.float(e.side, `+${e.amount}`, DAMAGE_COLORS.heal ?? 0x4fe08a, false);
          break;
        case "barrier":
          if (this.showNumbers)
            this.float(
              e.side,
              `+${e.amount} Barrier`,
              DAMAGE_COLORS.barrier ?? 0xffffff,
              false,
              0.8,
            );
          break;
        case "evade":
          this.float(
            e.side === "hero" ? "enemy" : "hero",
            "Evade",
            DAMAGE_COLORS.miss ?? 0xffffff,
            false,
            0.8,
          );
          break;
        case "death":
          this.figure(e.side).root.alpha = 0.35;
          break;
        default:
          break;
      }
    }
  }

  /** Current state: telegraph wind-up and ailment tints. */
  onSnapshot(snapshot: FightSnapshot): void {
    this.telegraphOn = snapshot.enemy.telegraph !== null;
    for (const side of ["hero", "enemy"] as const) {
      const first = snapshot[side].ailments[0];
      this.tint[side] = first ? (AILMENT_TINT[first.type] ?? 0xffffff) : 0xffffff;
    }
  }

  private figure(side: Side): Figure {
    const f = side === "hero" ? this.hero : this.enemy;
    if (!f) throw new Error("Arena not ready");
    return f;
  }

  private float(side: Side, label: string, color: number, crit: boolean, scale = 1): void {
    if (!this.app) return;
    const x =
      (side === "hero" ? HERO_X : ENEMY_X) +
      (side === "hero" ? -40 : 40) +
      spread(this.clock * 7.3) * 70;
    const text = new Text({
      text: label,
      style: {
        fontFamily: "JetBrains Mono, monospace",
        fontWeight: "700",
        fontSize: Math.round((crit ? 46 : 28) * scale),
        fill: crit ? lighten(color) : color,
        stroke: { color: 0x1c1a18, width: crit ? 5 : 4 },
        dropShadow: crit ? { color: 0xffffff, alpha: 0.45, blur: 10, distance: 0 } : false,
      },
    });
    text.anchor.set(0.5);
    text.position.set(x, GROUND_Y - 260 + spread(this.clock * 3.1) * 40);
    if (crit) text.rotation = -0.14;
    this.world.addChild(text);
    this.floaters.push({
      text,
      vx: spread(this.clock * 5.7) * 12,
      vy: -55,
      age: 0,
      life: crit ? 1.3 : 1.05,
      pop: crit,
    });
  }

  private tick(dt: number): void {
    if (this.paused) return;
    this.clock += dt;
    for (const f of [this.hero, this.enemy]) {
      if (!f) continue;
      const dir = f.side === "hero" ? 1 : -1;
      f.lunge = Math.max(0, f.lunge - dt * 5);
      f.flash = Math.max(0, f.flash - dt * 6);
      f.body.x = dir * 26 * Math.sin(f.lunge * Math.PI);
      f.body.y = Math.sin(this.clock * 2.2 + (f.side === "hero" ? 0 : 1.3)) * 3;
      const base = this.tint[f.side];
      f.body.tint = f.flash > 0.5 ? 0xff7777 : base;
    }
    if (this.telegraph) {
      const target = this.telegraphOn ? 0.55 + 0.35 * Math.sin(this.clock * 9) : 0;
      this.telegraph.alpha += (target - this.telegraph.alpha) * Math.min(1, dt * 12);
    }
    this.floaters = this.floaters.filter((f) => {
      f.age += dt;
      f.text.x += f.vx * dt;
      f.text.y += f.vy * dt;
      const t = f.age / f.life;
      const pop = f.pop && f.age < 0.15 ? 1 + (0.15 - f.age) * 3 : 1;
      f.text.scale.set(pop);
      f.text.alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      if (t >= 1) {
        f.text.destroy();
        return false;
      }
      return true;
    });
  }
}

const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Deterministic jitter in -0.5..0.5 (no Math.random needed for looks). */
function spread(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

function lighten(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * 0.35);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function makeFigure(side: Side, body: Container, x: number): Figure {
  const root = new Container();
  root.position.set(x, GROUND_Y);
  const shadow = new Graphics()
    .ellipse(0, 0, side === "hero" ? 150 : 190, 18)
    .fill({ color: 0x1c1a18, alpha: 0.35 });
  root.addChild(shadow, body);
  return { root, body, side, lunge: 0, flash: 0 };
}

function drawGround(): Container {
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

/** The Heir: fixed body, only weapon and off hand change (ui-views-v1.md). Origin = feet. */
function drawHero(look: HeroLook): Container {
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  if (look.offHand === "shield") {
    c.addChild(new Graphics().ellipse(-56, -240, 38, 50).fill(0x6b5a3e).stroke(line));
    c.addChild(new Graphics().ellipse(-56, -240, 20, 28).fill(0xc9a063).stroke(line));
  } else if (look.offHand === "focus") {
    c.addChild(new Graphics().circle(-62, -250, 22).fill(0x5b8cff).stroke(line));
  }
  c.addChild(
    new Graphics()
      .moveTo(-70, -150)
      .bezierCurveTo(-74, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 74, -260, 70, -150)
      .closePath()
      .fill(0xa8401a)
      .stroke(line),
    new Graphics()
      .moveTo(-30, -150)
      .lineTo(-22, -240)
      .lineTo(22, -240)
      .lineTo(30, -150)
      .fill(0xe8c07a)
      .stroke(line),
    new Graphics().circle(0, -364, 40).fill(0xf0c9a0).stroke(line),
    new Graphics()
      .moveTo(-40, -372)
      .bezierCurveTo(-34, -400, 34, -400, 40, -372)
      .lineTo(40, -364)
      .bezierCurveTo(30, -384, -30, -384, -40, -364)
      .closePath()
      .fill(0xe8c07a)
      .stroke(line),
  );
  if (look.weapon === "sword") {
    c.addChild(
      new Graphics()
        .moveTo(70, -260)
        .lineTo(160, -348)
        .stroke({ color: INK, width: 10, cap: "round" }),
      new Graphics()
        .moveTo(70, -260)
        .lineTo(160, -348)
        .stroke({ color: 0xd8d4cc, width: 5, cap: "round" }),
      new Graphics()
        .moveTo(58, -270)
        .lineTo(82, -246)
        .stroke({ color: 0x7a5a24, width: 7, cap: "round" }),
    );
  } else if (look.weapon === "axe") {
    c.addChild(
      new Graphics()
        .moveTo(66, -232)
        .lineTo(140, -352)
        .stroke({ color: 0x7a5a24, width: 9, cap: "round" }),
      new Graphics()
        .moveTo(122, -334)
        .quadraticCurveTo(150, -372, 182, -348)
        .quadraticCurveTo(170, -318, 150, -300)
        .closePath()
        .fill(0xc9c2b8)
        .stroke(line),
    );
  } else if (look.weapon === "dagger") {
    c.addChild(
      new Graphics()
        .moveTo(76, -244)
        .lineTo(126, -300)
        .stroke({ color: INK, width: 9, cap: "round" }),
      new Graphics()
        .moveTo(76, -244)
        .lineTo(126, -300)
        .stroke({ color: 0xd8d4cc, width: 4, cap: "round" }),
      new Graphics()
        .moveTo(66, -252)
        .lineTo(86, -232)
        .stroke({ color: 0x3f5a2e, width: 7, cap: "round" }),
    );
  } else if (look.weapon === "mace") {
    c.addChild(
      new Graphics()
        .moveTo(70, -250)
        .lineTo(136, -340)
        .stroke({ color: 0x7a5a24, width: 9, cap: "round" }),
      new Graphics().circle(142, -350, 22).fill(0x8a8f96).stroke(line),
      new Graphics().poly([142, -386, 150, -370, 134, -370]).fill(0x8a8f96).stroke(line),
      new Graphics().poly([178, -350, 162, -342, 162, -358]).fill(0x8a8f96).stroke(line),
    );
  } else if (look.weapon === "staff") {
    c.addChild(
      new Graphics()
        .moveTo(90, -150)
        .lineTo(130, -420)
        .stroke({ color: 0x5e4a36, width: 9, cap: "round" }),
      new Graphics().circle(132, -432, 16).fill(0xa35cff).stroke(line),
      new Graphics().circle(132, -432, 26).stroke({ color: 0xc9a0ff, width: 2, alpha: 0.6 }),
    );
  } else if (look.weapon === "bow") {
    c.addChild(
      new Graphics()
        .moveTo(96, -390)
        .quadraticCurveTo(170, -290, 96, -170)
        .stroke({ color: INK, width: 10, cap: "round" }),
      new Graphics()
        .moveTo(96, -390)
        .quadraticCurveTo(170, -290, 96, -170)
        .stroke({ color: 0x9a6a34, width: 5, cap: "round" }),
      new Graphics().moveTo(96, -390).lineTo(96, -170).stroke({ color: 0xe8e2d6, width: 2 }),
    );
  } else if (look.weapon === "crossbow") {
    c.addChild(
      new Graphics()
        .moveTo(40, -262)
        .lineTo(170, -270)
        .stroke({ color: INK, width: 14, cap: "round" }),
      new Graphics()
        .moveTo(40, -262)
        .lineTo(170, -270)
        .stroke({ color: 0x7a5a24, width: 8, cap: "round" }),
      new Graphics()
        .moveTo(150, -330)
        .quadraticCurveTo(186, -270, 150, -208)
        .stroke({ color: INK, width: 9, cap: "round" }),
      new Graphics()
        .moveTo(150, -330)
        .quadraticCurveTo(186, -270, 150, -208)
        .stroke({ color: 0xc9c2b8, width: 4, cap: "round" }),
      new Graphics()
        .moveTo(150, -330)
        .lineTo(110, -268)
        .lineTo(150, -208)
        .stroke({ color: 0xe8e2d6, width: 2 }),
    );
  } else {
    c.addChild(
      new Graphics()
        .moveTo(70, -240)
        .lineTo(130, -340)
        .stroke({ color: 0x7a5a24, width: 7, cap: "round" }),
      new Graphics().circle(134, -346, 12).fill(0xff6a2b).stroke(line),
    );
  }
  c.y = 150;
  return c;
}

type Palette = { body: number; trim: number; head: number };

const ENEMY_COLORS: Record<string, Palette> = {
  brute: { body: 0x6b5a3e, trim: 0x4a3c29, head: 0x9a8a70 },
  skirmisher: { body: 0x5a4a33, trim: 0x8a7552, head: 0xb3a288 },
  caster: { body: 0x7a2a20, trim: 0xff6a2b, head: 0x9a8a70 },
};

/** Rotwood: moss, bark and rot instead of ash. */
const ROTWOOD_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x3f4a2a, trim: 0x7a8a4a, head: 0x9aa078 },
  afflicter: { body: 0x4a5a26, trim: 0x9fe04a, head: 0x8a9a6a },
  thornback: { body: 0x5a4630, trim: 0x3a2c1e, head: 0x8a7a5a },
  warden: { body: 0x2f4a32, trim: 0x6a8a4a, head: 0x9aa480 },
};

/** Ember Wastes: obsidian, magma and glowing seams. */
const EMBER_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x5a2416, trim: 0xff8a3c, head: 0xc2603a },
  brute: { body: 0x2e2420, trim: 0xff6a2b, head: 0x6a4a3a },
  caster: { body: 0x7a1e12, trim: 0xffb13b, head: 0xb08a70 },
  warden: { body: 0x1f1a1e, trim: 0xff6a2b, head: 0x5a4a50 },
};

/** Frost Peaks: ice, fur and pale stone. */
const FROST_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x8a96a0, trim: 0xe8f2f8, head: 0xc0ccd4 },
  thornback: { body: 0x5a8aa8, trim: 0xbfe8ff, head: 0x8ab8d0 },
  caster: { body: 0x2a4a6a, trim: 0x6fd3ff, head: 0xc8d8e0 },
  warden: { body: 0x3a4a5a, trim: 0x9fe0ff, head: 0xa8b8c4 },
};

/** Storm Spires: slate, copper and violet sparks. */
const STORM_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x4a4a7a, trim: 0xffe14d, head: 0x9a9ac0 },
  brute: { body: 0x3a3a52, trim: 0xb87333, head: 0x7a7a90 },
  caster: { body: 0x2a2a5a, trim: 0xffe14d, head: 0xb0b0d0 },
  thornback: { body: 0x8a5a2a, trim: 0xffe14d, head: 0xb87333 },
};

/** Void Rift: near-black with violet glows. */
const VOID_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x2a1a3a, trim: 0xa35cff, head: 0x4a3a5a },
  brute: { body: 0x1e1828, trim: 0x6a3a9a, head: 0x3a3048 },
  caster: { body: 0x3a1a5a, trim: 0xc9a0ff, head: 0x6a5a7a },
  afflicter: { body: 0x2a1a40, trim: 0xa35cff, head: 0x5a4a6a },
};

/** Emberfall: ash grey and the last embers. */
const EMBERFALL_COLORS: Record<string, Palette> = {
  brute: { body: 0x4a4440, trim: 0xff8a1f, head: 0x8a8078 },
  caster: { body: 0x3a3634, trim: 0xa35cff, head: 0x9a9088 },
  skirmisher: { body: 0x2e2a28, trim: 0xe0314b, head: 0x6a625c },
  warden: { body: 0x3a3430, trim: 0xff6a2b, head: 0x7a7068 },
  harvester: { body: 0x1a1614, trim: 0xff8a1f, head: 0xe8e2d6 },
};

const ACT_COLORS: Record<number, Record<string, Palette>> = {
  2: ROTWOOD_COLORS,
  3: EMBER_COLORS,
  4: FROST_COLORS,
  5: STORM_COLORS,
  6: VOID_COLORS,
  7: EMBERFALL_COLORS,
};

/** Which body an archetype uses: robed casters, broad brutes or lean fighters. */
const BODY: Record<string, "robe" | "broad" | "lean"> = {
  caster: "robe",
  afflicter: "robe",
  harvester: "robe",
  brute: "broad",
  thornback: "broad",
  warden: "broad",
  skirmisher: "lean",
};

function drawEnemy(look: EnemyLook): Container {
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  const fallback = { body: 0, trim: 0, head: 0 };
  const col =
    ACT_COLORS[look.act]?.[look.archetype] ??
    ENEMY_COLORS[look.archetype] ??
    ROTWOOD_COLORS[look.archetype] ??
    fallback;
  const body = BODY[look.archetype] ?? "broad";
  const scale = look.boss ? 1.1 : body === "broad" ? 1 : 0.86;
  if (body === "robe") {
    c.addChild(
      new Graphics()
        .moveTo(-80, -150)
        .lineTo(-40, -330)
        .lineTo(40, -330)
        .lineTo(80, -150)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics().circle(0, -368, 40).fill(col.head).stroke(line),
      new Graphics()
        .moveTo(-44, -380)
        .lineTo(0, -450)
        .lineTo(44, -380)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics()
        .moveTo(-90, -200)
        .lineTo(-140, -340)
        .stroke({ color: 0x5e4a36, width: 7, cap: "round" }),
      new Graphics().circle(-142, -346, 13).fill(col.trim).stroke(line),
    );
    if (look.archetype === "harvester") {
      // A scythe instead of a staff, and two ember eyes in the hood.
      c.addChild(
        new Graphics()
          .moveTo(-150, -120)
          .lineTo(-150, -500)
          .stroke({ color: 0x3a2a1e, width: 10, cap: "round" }),
        new Graphics()
          .moveTo(-150, -500)
          .quadraticCurveTo(-60, -540, 10, -470)
          .quadraticCurveTo(-70, -500, -150, -470)
          .closePath()
          .fill(0xd8d4cc)
          .stroke(line),
        new Graphics().circle(-14, -372, 6).fill(col.trim),
        new Graphics().circle(14, -372, 6).fill(col.trim),
      );
      if (look.act > 7) {
        // The Core (The Last Ember): the last flame burns in its chest.
        c.addChild(
          new Graphics().circle(0, -245, 62).fill({ color: 0xff8a1f, alpha: 0.22 }),
          new Graphics().circle(0, -245, 38).fill({ color: 0xffb13b, alpha: 0.45 }),
          new Graphics()
            .moveTo(0, -300)
            .quadraticCurveTo(26, -258, 18, -228)
            .quadraticCurveTo(0, -210, -18, -228)
            .quadraticCurveTo(-26, -258, 0, -300)
            .closePath()
            .fill(0xffd27a)
            .stroke({ color: 0xff8a1f, width: 3 }),
        );
      }
    }
    if (look.archetype === "afflicter") {
      for (const [x, y] of [
        [-30, -300],
        [24, -260],
        [-6, -210],
      ] as const) {
        c.addChild(new Graphics().ellipse(x, y, 9, 13).fill({ color: col.trim, alpha: 0.85 }));
      }
    }
  } else {
    const wide = body === "broad" ? 140 : 100;
    c.addChild(
      new Graphics()
        .moveTo(-wide, -150)
        .bezierCurveTo(-wide - 20, -280, -wide + 30, -360, 0, -360)
        .bezierCurveTo(wide - 30, -360, wide + 20, -280, wide, -150)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics()
        .moveTo(-wide + 50, -150)
        .lineTo(-wide + 65, -240)
        .lineTo(wide - 65, -240)
        .lineTo(wide - 50, -150)
        .fill(col.trim)
        .stroke(line),
      new Graphics().circle(0, -390, 44).fill(col.head).stroke(line),
      new Graphics()
        .moveTo(-36, -410)
        .lineTo(-18, -400)
        .moveTo(36, -410)
        .lineTo(18, -400)
        .stroke({ color: INK, width: 4 }),
      new Graphics()
        .moveTo(-24, -374)
        .quadraticCurveTo(0, -384, 24, -374)
        .stroke({ color: INK, width: 4 }),
    );
    if (look.archetype === "thornback") {
      // Thorns along the back and the shoulders.
      for (const [x, y, r] of [
        [-120, -300, -0.9],
        [-80, -350, -0.5],
        [-20, -372, -0.1],
        [40, -366, 0.3],
        [100, -330, 0.7],
        [136, -270, 1.1],
      ] as const) {
        const tip = { x: x + Math.sin(r) * 46, y: y - Math.cos(r) * 46 };
        c.addChild(
          new Graphics()
            .poly([x - 12, y + 6, tip.x, tip.y, x + 12, y + 6])
            .fill(col.trim)
            .stroke(line),
        );
      }
    }
    if (look.archetype === "warden") {
      c.addChild(
        new Graphics()
          .moveTo(-wide - 30, -120)
          .lineTo(-wide - 30, -470)
          .stroke({ color: 0x5e4a36, width: 10, cap: "round" }),
        new Graphics()
          .circle(-wide - 30, -480, 18)
          .fill(col.trim)
          .stroke(line),
        new Graphics()
          .ellipse(-wide + 10, -230, 46, 58)
          .fill(0x4a3c29)
          .stroke(line),
        new Graphics()
          .ellipse(-wide + 10, -230, 22, 30)
          .fill(col.trim)
          .stroke(line),
      );
    } else if (look.archetype === "brute" || look.archetype === "thornback") {
      c.addChild(
        new Graphics().ellipse(-wide, -260, 42, 34).fill(col.head).stroke(line),
        new Graphics()
          .moveTo(-wide, -260)
          .lineTo(-wide - 60, -310)
          .stroke({ color: INK, width: 16, cap: "round" }),
        new Graphics()
          .moveTo(-wide, -260)
          .lineTo(-wide - 60, -310)
          .stroke({ color: 0x7a5a24, width: 10, cap: "round" }),
        new Graphics()
          .roundRect(-wide - 120, -360, 80, 60, 8)
          .fill(0x4a4a4e)
          .stroke(line),
      );
    } else {
      for (const dy of [0, 40]) {
        c.addChild(
          new Graphics()
            .moveTo(-wide + 10, -250 + dy)
            .lineTo(-wide - 70, -320 + dy)
            .stroke({ color: INK, width: 8, cap: "round" }),
          new Graphics()
            .moveTo(-wide + 10, -250 + dy)
            .lineTo(-wide - 70, -320 + dy)
            .stroke({ color: 0xd8d4cc, width: 4, cap: "round" }),
        );
      }
    }
  }
  if (look.thief) {
    const sack = new Container();
    sack.addChild(
      new Graphics().circle(84, -330, 70).fill({ color: 0xffb13b, alpha: 0.3 }),
      new Graphics().ellipse(84, -320, 54, 60).fill(0xc9954a).stroke(line),
      new Graphics()
        .moveTo(64, -380)
        .lineTo(104, -380)
        .stroke({ color: INK, width: 5, cap: "round" }),
      new Graphics().circle(70, -392, 10).fill(0xffd84a).stroke(line),
      new Graphics().circle(96, -396, 9).fill(0xffd84a).stroke(line),
    );
    c.addChildAt(sack, 0);
  }
  if (look.boss && look.archetype !== "harvester") {
    c.addChild(
      new Graphics()
        .poly([-40, -430, -30, -470, -12, -446, 0, -480, 12, -446, 30, -470, 40, -430])
        .fill(0xff8a1f)
        .stroke(line),
    );
  }
  c.scale.set(scale);
  c.y = 150 * scale;
  return c;
}
