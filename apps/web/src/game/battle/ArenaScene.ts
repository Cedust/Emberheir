import {
  type CombatEvent,
  type FighterSnapshot,
  type FightSnapshot,
  type PayoffKind,
  type PerkId,
  type Side,
  getPerk,
} from "@emberheir/sim";
import { type Application, Container, Graphics, Sprite } from "pixi.js";
import { type GraphicsQuality, IDLE_FPS, MAX_FPS, PAUSED_FPS, QUALITY } from "../pixiPacing";
import { type ArenaLease, leaseArenaApp } from "./arenaApp";
import { Floaters, prepareFloaterFonts } from "./floaters";
import {
  type Delivery,
  AILMENT_FX,
  AILMENT_TINT,
  DAMAGE_COLORS,
  PAYOFF_FX,
  PAYOFF_NAMES,
  PERK_FX,
  RISE,
  SKILL_FX,
} from "./arenaEffects";
import {
  type Figure,
  ENEMY_X,
  GROUND_Y,
  H,
  HERO_X,
  lighten,
  makeFigure,
  other,
  spread,
  W,
} from "./arenaLayout";
import {
  drawDraughtRing,
  drawGate,
  drawGround,
  drawLevelGlow,
  drawStars,
  drawWildfireGlow,
} from "./arenaProps";
import { type EnemyLook, drawEnemy, loadEnemyTexture } from "./enemyArt";
import { backdropFeet, loadBackdrop, placeBackdrop } from "./arenaBackdrop";
import { Fx } from "./fx";
import { armSwing, loadHeirTextures } from "./heirRig";
import {
  CasterHold,
  type HeroLook,
  RANGED_WEAPONS,
  RangedHold,
  drawHero,
  loadHeroWeapon,
} from "./heroArt";
import { type View, Weather } from "./weather";

/** A Skip resolves the rest of the fight at once: then only the outcome is shown. */
const FLOOD = 40;

interface Later {
  at: number;
  readonly run: () => void;
}

type HitEvent = Extract<CombatEvent, { type: "hit" }>;

/**
 * The PixiJS arena (battle-view-v1.md section 2): ground, two placeholder figures, floating
 * damage numbers and hit effects. It only reads fight events and snapshots; the fight itself
 * runs in the sim. Placeholder art until the painted sprites exist.
 *
 * The art lives next to it: `heroArt.ts`, `enemyArt.ts`, `arenaProps.ts` (ground, gate, glows),
 * `arenaEffects.ts` (`SKILL_FX`, `PERK_FX`, `AILMENT_FX`), `fx.ts` and `weather.ts`.
 */
export class ArenaScene {
  private app: Application | null = null;
  private lease: ArenaLease | null = null;
  private readonly onTick = (ticker: { deltaMS: number }) => this.tick(ticker.deltaMS / 1000);
  private readonly camera = new Container();
  private readonly world = new Container();
  private size = { w: W, h: H, resolution: 1 };
  private destroyed = false;
  private hero: Figure | null = null;
  /** The painted Heir's forearm (turns to swing) and fist (where shots leave). */
  private heroArm: Container | null = null;
  private heroFist: Container | null = null;
  /** Bow or Crossbow in the ranged pose, where its shots leave, and when the last one left. */
  /** Bow, Crossbow, Wand or Staff in its own pose: plays the shot. */
  private heroRanged: RangedHold | CasterHold | null = null;
  private heroShot: Container | null = null;
  private heroShotAt = -Infinity;
  private enemy: Figure | null = null;
  private backdrop: { sprite: Sprite; feet: number } | null = null;
  private telegraph: Graphics | null = null;
  private aura: Graphics | null = null;
  /** Ground light of the stronger side when the levels are far apart. */
  private levelGlow: Graphics | null = null;
  private fx: Fx | null = null;
  private weather: Weather | null = null;
  private floaters: Floaters | null = null;
  private later: Later[] = [];
  private clock = 0;
  private telegraphOn = false;
  private tint: Record<Side, number> = { hero: 0xffffff, enemy: 0xffffff };
  /** Barrier share of max Life per side; the ward bubble around the fighter shows it. */
  private barrier: Record<Side, number> = { hero: 0, enemy: 0 };
  private ward: Record<Side, Graphics | null> = { hero: null, enemy: null };
  private ailments: Record<Side, readonly string[]> = { hero: [], enemy: [] };
  /** The hero's Class Trait as the last snapshot showed it, and its drawing. */
  private trait: FighterSnapshot["trait"] | undefined;
  private traitGfx: Graphics | null = null;
  private traitCarry = 0;
  private ailmentCarry: Record<Side, number> = { hero: 0, enemy: 0 };
  private echoColor: number | null = null;
  private echoCarry = 0;
  private draught: { ring: Graphics; color: number } | null = null;
  private draughtCarry = 0;
  /** The Gatekeeper's stone gate, its fire bowls and the Ember sigil on the lintel. */
  private gate: { root: Container; sigil: Graphics; fires: { x: number; y: number }[] } | null =
    null;
  private gateCarry = 0;
  /** Wildfire: the burning ground glow and how hard the edges flame (the tier). */
  private wildfire: { glow: Graphics; tier: number } | null = null;
  private wildfireCarry = 0;
  private echoAura: Container | null = null;
  /** The ember glowing in a carried Ember Focus. */
  private offHandGlow: Container | null = null;
  /** A hovering Grimoire, bobbing over the fist. */
  private offHandFloat: Container | null = null;
  /** Exalted weapons shed golden sparks from this point of the hero figure. */
  private exaltedTip: Container | null = null;
  private exaltedCarry = 0;
  /** The weapon's tip and the Heirloom Infusion it carries (klassengeruest-v1.md 4). */
  private weaponTip: Container | null = null;
  private infusion: string | undefined;
  private infusionCarry = 0;
  private infusionArc = 0;
  /** The main Mastery's aura: Burst pulses, Tempo whirls, Ailment drips. */
  private masteryAura: HeroLook["mastery"];
  private masteryCarry = 0;
  private ranged: Record<Side, boolean> = { hero: false, enemy: false };
  /** The telegraphed Heavy Attack and until when its hit counts as heavy. */
  private heavy: { skill: string; until: number } | null = null;
  private trauma = 0;
  private zoom = 1;
  private freeze = 0;
  private freezeCooldown = 0;
  showNumbers = true;
  paused = false;
  /** Screen shake and camera zoom (Settings; off with reduced motion). */
  motion = true;
  /** Fight speed; hit-stops only play at normal speed. */
  speed = 1;
  /** Graphics Quality (Settings): particle budget and weather; set before `mount`. */
  quality: GraphicsQuality = "medium";
  /** Nothing fights (Intermission): the air drifts at the calm frame rate. */
  idle = false;

  /**
   * Host size in stage pixels and device pixels per stage pixel. The drawing stays centered
   * and sits on the bottom edge; the canvas renders at the screen's real pixel density. `scale`
   * shrinks the whole arena (class select preview).
   */
  layout(w: number, h: number, resolution: number, scale = 1, bottom = 0): void {
    this.size = { w, h, resolution };
    this.world.scale.set(scale);
    this.world.position.set((w - W * scale) / 2, h - bottom - H * scale);
    this.app?.renderer.resize(w, h, resolution);
    this.placeBackdrop();
  }

  private placeBackdrop(): void {
    if (!this.backdrop) return;
    const { w, h } = this.size;
    const feetY = this.world.y + GROUND_Y * this.world.scale.y;
    placeBackdrop(this.backdrop.sprite, this.backdrop.feet, w, h, feetY);
  }

  /** Live particles and floating texts (the `?dev` meter). */
  get stats(): { particles: number; floaters: number } {
    return { particles: this.fx?.count ?? 0, floaters: this.floaters?.count ?? 0 };
  }

  /** True during a hit-stop: the fight loop holds the sim for that moment. */
  get frozen(): boolean {
    return this.freeze > 0;
  }

  /** Screen-fixed layer above the arena (the battle HUD): no camera shake or zoom. */
  readonly overlay = new Container();

  /** Resolves with the Pixi app, or null without WebGL or when destroyed meanwhile. */
  async mount(host: HTMLElement, hero: HeroLook, enemy: EnemyLook): Promise<Application | null> {
    this.echoColor = hero.echo ?? null;
    const [heir, weapon, painting, backdrop] = await Promise.all([
      loadHeirTextures(),
      loadHeroWeapon(hero),
      loadEnemyTexture(enemy),
      loadBackdrop(enemy.act),
      prepareFloaterFonts(),
    ]);
    if (this.destroyed) return null;
    const lease = await leaseArenaApp(this.size.w, this.size.h, this.size.resolution);
    if (!lease) return null;
    if (this.destroyed) {
      lease.release();
      return null;
    }
    const app = lease.app;
    this.lease = lease;
    this.app = app;
    // The shared app may come from a screen of another size.
    app.renderer.resize(this.size.w, this.size.h, this.size.resolution);
    app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(app.canvas);
    app.stage.addChild(this.camera, this.overlay);
    if (backdrop) {
      // A painted act: the painting replaces the drawn hills behind the fighters.
      this.backdrop = { sprite: new Sprite(backdrop), feet: backdropFeet(enemy.act) };
      this.camera.addChild(this.backdrop.sprite);
      this.placeBackdrop();
    }
    this.camera.addChild(this.world);

    const fx = new Fx(app.renderer, QUALITY[this.quality].particles);
    this.fx = fx;
    this.weather = new Weather(enemy.act, enemy.wildfire ?? 0, QUALITY[this.quality].weather);
    this.ranged = { hero: RANGED_WEAPONS.has(hero.weapon), enemy: enemy.ranged ?? false };

    if (!backdrop) this.world.addChild(drawGround());
    this.world.addChild(fx.back);
    this.aura = new Graphics();
    if (enemy.champion) {
      // A Champion wears two rings: violet Void-fire around the gold of an Elite.
      this.aura
        .ellipse(ENEMY_X, GROUND_Y - 120, 200, 172)
        .stroke({ color: 0xa35cff, width: 10, alpha: 0.22 })
        .ellipse(ENEMY_X, GROUND_Y - 120, 178, 156)
        .stroke({ color: 0xffd84a, width: 3, alpha: 0.6 });
    } else if (enemy.elite || enemy.boss) {
      this.aura
        .ellipse(ENEMY_X, GROUND_Y - 120, enemy.boss ? 210 : 170, enemy.boss ? 180 : 150)
        .stroke({ color: enemy.boss ? 0xff8a1f : 0xffd84a, width: 3, alpha: 0.45 });
    }
    this.world.addChild(this.aura);
    // Barrier (Intelligence, Warden skills): a pale ward bubble that fades as it is used up.
    for (const side of ["hero", "enemy"] as const) {
      const x = side === "hero" ? HERO_X : ENEMY_X;
      const ward = new Graphics()
        .ellipse(x, GROUND_Y - 190, 150, 205)
        .fill({ color: 0x9fd8ff, alpha: 0.14 })
        .stroke({ color: 0x8fd0ff, width: 14, alpha: 0.18 })
        .stroke({ color: 0x9fdcff, width: 4, alpha: 1 })
        .ellipse(x - 52, GROUND_Y - 300, 34, 60)
        .fill({ color: 0xffffff, alpha: 0.18 });
      ward.alpha = 0;
      this.ward[side] = ward;
      this.world.addChild(ward);
    }
    if (enemy.gate) {
      this.gate = drawGate();
      this.world.addChildAt(this.gate.root, 1);
    }
    if (enemy.wildfire) {
      this.wildfire = { glow: drawWildfireGlow(), tier: enemy.wildfire };
      this.world.addChildAt(this.wildfire.glow, 1);
    }
    this.levelGlow = drawLevelGlow(enemy.levelGap ?? 0);
    if (this.levelGlow) this.world.addChild(this.levelGlow);
    if (hero.draught !== undefined) {
      this.draught = { ring: drawDraughtRing(hero.draught), color: hero.draught };
      this.world.addChild(this.draught.ring);
    }
    this.telegraph = new Graphics()
      .ellipse(ENEMY_X, GROUND_Y - 130, 200, 170)
      .stroke({ color: 0xff6a2b, width: 5 });
    this.telegraph.alpha = 0;
    this.world.addChild(this.telegraph);

    this.hero = makeFigure("hero", drawHero(hero, heir, weapon), HERO_X);
    this.heroArm = this.hero.body.getChildByLabel("heir-arm", true) ?? null;
    this.heroFist = this.hero.body.getChildByLabel("heir-fist", true) ?? null;
    const ranged =
      this.hero.body.getChildByLabel("heir-ranged", true) ??
      this.hero.body.getChildByLabel("heir-caster", true);
    this.heroRanged = ranged instanceof RangedHold || ranged instanceof CasterHold ? ranged : null;
    this.heroShot = this.hero.body.getChildByLabel("heir-shot", true) ?? null;
    this.echoAura = this.hero.body.getChildByLabel("weapon-echo", true) ?? null;
    this.offHandGlow = this.hero.body.getChildByLabel("off-hand-glow", true) ?? null;
    this.offHandFloat = this.hero.body.getChildByLabel("off-hand-float", true) ?? null;
    this.exaltedTip =
      hero.weaponLook.grade >= 4
        ? (this.hero.body.getChildByLabel("weapon-tip", true) ?? null)
        : null;
    this.weaponTip = this.hero.body.getChildByLabel("weapon-tip", true) ?? null;
    this.infusion = hero.weaponLook.element;
    this.masteryAura = hero.mastery;
    this.enemy = makeFigure("enemy", drawEnemy(enemy, painting), ENEMY_X);
    this.traitGfx = new Graphics();
    this.world.addChild(this.hero.root, this.enemy.root, this.traitGfx, fx.front);

    // The weather is already falling when the fight opens.
    for (let i = 0; i < 80; i++) {
      this.weather.update(fx, this.view(), 0.1);
      fx.update(0.1);
    }

    this.floaters = new Floaters(this.world);
    app.ticker.add(this.onTick);
    return app;
  }

  /**
   * Wander at the Warden's Gate (laengere-runs-v1.md): the road through the act rolls on. A gust
   * of ash and embers streams past the hero, glowing footsteps run ahead on the ground. Visual
   * only; with reduced motion a short, calm gust.
   */
  wander(): void {
    const fx = this.fx;
    if (!fx) return;
    const right = this.view().right;
    const pulses = this.motion ? 6 : 2;
    for (let i = 0; i < pulses; i++) {
      this.wait(i * 0.18, () => {
        fx.burst({
          x: right + 40,
          y: GROUND_Y - 220,
          count: 24,
          color: [0x6b5a4a, 0x8a7a68, 0x3b3024],
          spreadX: 60,
          spreadY: 200,
          angle: [Math.PI - 0.12, Math.PI + 0.12],
          speed: [700, 1100],
          life: [1.4, 2],
          size: [5, 11],
          kind: "bit",
          spin: 4,
          wobble: 12,
          drag: 0.85,
          alpha: 0.85,
          layer: "front",
        });
        fx.burst({
          x: right + 40,
          y: GROUND_Y - 160,
          count: 8,
          color: [0xff8a1f, 0xffb13b, 0xffd84a],
          spreadX: 40,
          spreadY: 140,
          angle: [Math.PI - 0.05, Math.PI + 0.25],
          speed: [500, 900],
          life: [1, 1.6],
          size: [6, 12],
          drag: 0.8,
          layer: "front",
        });
        fx.ring(HERO_X + 90 + i * 110, GROUND_Y, 0xffb13b, 8, 46, 0.9, 5);
      });
    }
  }

  /**
   * A quiet node of the act map (act-karte-entwurf-v1.md): its moment in the arena where the
   * enemy would stand. Hearth: a campfire flares and warm sparks rise around the hero. Cache: a
   * chest bursts open in gold. Event: a strange mist rolls in. Marisha: coins rain from her
   * wagon. Shrine: stolen fire swirls up. Visual only; calmer with reduced motion.
   */
  visit(kind: string): void {
    const fx = this.fx;
    if (!fx) return;
    const spot = HERO_X + 260;
    const calm = this.motion ? 1 : 0.4;
    const n = (count: number) => Math.max(4, Math.round(count * calm));
    switch (kind) {
      case "hearth":
        for (let i = 0; i < (this.motion ? 4 : 1); i++) {
          this.wait(i * 0.25, () => {
            fx.burst({
              x: spot,
              y: GROUND_Y - 10,
              count: n(26),
              color: [0xff8a1f, 0xffb13b, 0xffd84a],
              spreadX: 26,
              spreadY: 8,
              angle: [-Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35],
              speed: [90, 220],
              life: [0.9, 1.6],
              size: [6, 14],
              wobble: 10,
              drag: 0.9,
            });
            fx.burst({
              x: HERO_X,
              y: GROUND_Y - 120,
              count: n(10),
              color: [0xffd27a, 0xfff2c4],
              spreadX: 70,
              spreadY: 110,
              angle: [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2],
              speed: [30, 80],
              life: [1, 1.6],
              size: [5, 9],
            });
          });
        }
        fx.ring(spot, GROUND_Y, 0xff9a3c, 10, 90, 0.9, 6);
        break;
      case "cache":
        fx.ring(spot, GROUND_Y - 30, 0xffd84a, 10, 120, 0.6, 7, 0.9);
        fx.burst({
          x: spot,
          y: GROUND_Y - 30,
          count: n(40),
          color: [0xffd84a, 0xffb13b, 0xfff2c4],
          spreadX: 20,
          spreadY: 10,
          angle: [-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7],
          speed: [260, 520],
          life: [0.8, 1.3],
          size: [6, 12],
          gravity: 700,
          kind: "bit",
          spin: 6,
        });
        break;
      case "event":
        for (let i = 0; i < (this.motion ? 3 : 1); i++) {
          this.wait(i * 0.3, () =>
            fx.burst({
              x: spot + 160,
              y: GROUND_Y - 90,
              count: n(18),
              color: [0x8a7aa8, 0x6b6080, 0xb8a8d8],
              spreadX: 120,
              spreadY: 80,
              angle: [Math.PI - 0.15, Math.PI + 0.15],
              speed: [40, 110],
              life: [1.8, 2.6],
              size: [30, 60],
              endSize: 1.4,
              alpha: 0.35,
              wobble: 20,
            }),
          );
        }
        fx.ring(spot, GROUND_Y - 120, 0xb8a8ff, 10, 70, 0.8, 4, 1);
        break;
      case "marisha":
        for (let i = 0; i < (this.motion ? 3 : 1); i++) {
          this.wait(i * 0.2, () =>
            fx.burst({
              x: spot,
              y: GROUND_Y - 260,
              count: n(16),
              color: [0xffd84a, 0xe0a83a, 0xc9a063],
              spreadX: 90,
              spreadY: 20,
              angle: [Math.PI / 2 - 0.2, Math.PI / 2 + 0.2],
              speed: [80, 160],
              life: [1, 1.5],
              size: [7, 11],
              gravity: 600,
              kind: "bit",
              spin: 8,
            }),
          );
        }
        break;
      case "shrine":
        fx.ring(HERO_X, GROUND_Y, 0xff6a2a, 20, 140, 0.8, 6);
        fx.burst({
          x: HERO_X,
          y: GROUND_Y - 40,
          count: n(36),
          color: [0xff6a2a, 0xffb13b, 0xfff2c4],
          spreadX: 80,
          spreadY: 20,
          angle: [-Math.PI / 2 - 0.25, -Math.PI / 2 + 0.25],
          speed: [160, 340],
          life: [1, 1.6],
          size: [6, 13],
          stretch: 2,
          wobble: 14,
        });
        break;
      default:
        break;
    }
  }

  /**
   * A new Trail on the enemy just beaten (hunts-entwurf-v1.md): glowing paw prints run from the
   * hero to the fallen enemy, a ring of gold rises where it stood, more sparks for each Trail;
   * Apex burns red. Visual only; calmer with reduced motion.
   */
  trail(tier: number): void {
    const fx = this.fx;
    if (!fx) return;
    const apex = tier >= 4;
    const color = apex ? [0xff5a2b, 0xff8a1f, 0xffd84a] : [0xffd27a, 0xffb13b, 0xfff2c4];
    const steps = this.motion ? 6 : 2;
    for (let i = 0; i < steps; i++) {
      const x = HERO_X + 80 + ((ENEMY_X - HERO_X - 160) * (i + 1)) / steps;
      this.wait(i * 0.12, () => {
        fx.ring(x, GROUND_Y + (i % 2 ? 6 : -6), color[0] ?? 0xffd27a, 4, 18, 0.7, 3);
      });
    }
    this.wait(steps * 0.12, () => {
      for (let r = 0; r < Math.min(tier, 4); r++) {
        fx.ring(ENEMY_X, GROUND_Y - 20 - r * 26, color[1] ?? 0xffb13b, 12, 90 + r * 20, 0.9, 5);
      }
      fx.burst({
        x: ENEMY_X,
        y: GROUND_Y - 30,
        count: Math.round((18 + tier * 10) * (this.motion ? 1 : 0.4)),
        color,
        spreadX: 60,
        spreadY: 16,
        angle: [-Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4],
        speed: [140, 320],
        life: [1, 1.8],
        size: [5, 12],
        stretch: 1.6,
        wobble: 10,
      });
    });
  }

  /** Between fights (Intermission): the hero waits alone in the act's air. */
  hideEnemy(): void {
    if (this.enemy) this.enemy.root.visible = false;
  }

  /** Between fights the arena stays empty: the Heir shows again in the fight (Timo 2026-10-21). */
  hideHero(): void {
    if (this.hero) {
      this.hero.root.visible = false;
      // The hero's sparks and auras only run at full alpha.
      this.hero.root.alpha = 0;
    }
    if (this.draught) this.draught.ring.visible = false;
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.ticker?.remove(this.onTick);
    this.camera.destroy({ children: true });
    this.overlay.destroy({ children: true });
    this.floaters?.destroy();
    this.fx?.destroy();
    this.lease?.release();
    this.lease = null;
    this.app = null;
  }

  /** New fight events since the last call. */
  onEvents(events: readonly CombatEvent[]): void {
    if (!this.app) return;
    if (events.length > FLOOD) {
      for (const e of events) if (e.type === "death") this.die(e.side);
      return;
    }
    // Multi-hit skills (Flurry) land one after another instead of all in one frame.
    const order = new Map<string, number>();
    events.forEach((e, i) => {
      switch (e.type) {
        case "skill":
          this.cast(e.side, e.skill, e.heatCost, events.slice(i + 1));
          if (e.via === "twin") {
            // Twin Cast: the cast repeats, two violet rings mirror each other around the caster.
            const c = this.center(e.side);
            this.fx?.ring(c.x, c.y, 0xd2b8ff, 40, 150, 0.3, 5, 0.9);
            this.wait(0.1, () => this.fx?.ring(c.x, c.y, 0xffffff, 40, 150, 0.3, 4, 0.8));
            this.float(e.side, "Twin Cast", 0xd2b8ff, false, 0.7);
          }
          break;
        case "telegraph":
          this.heavy = { skill: e.skill, until: this.clock + e.windup + 1 };
          break;
        case "hit": {
          const key = `${e.side}:${e.source}`;
          const n = order.get(key) ?? 0;
          order.set(key, n + 1);
          this.hit(e, n * 0.08);
          // The Heavy Attack cap held part of the blow back: an ember shield flares on the target.
          if (e.capped) {
            const target = e.side === "hero" ? "enemy" : "hero";
            const c = this.center(target);
            this.fx?.ring(c.x, c.y, 0xffc46b, 50, 170, 0.45, 9, 1);
            this.fx?.burst({
              x: c.x,
              y: c.y,
              count: 22,
              color: [0xffc46b, 0xfff1c9],
              spreadX: 30,
              angle: [0, Math.PI * 2],
              speed: [160, 320],
              life: [0.3, 0.6],
              size: [6, 11],
              drag: 0.4,
            });
            if (this.showNumbers) this.float(target, "Held", 0xffc46b, false, 0.8);
          }
          break;
        }
        case "dot":
          if (this.showNumbers)
            this.float(e.side, String(e.damage), DAMAGE_COLORS[e.ailment] ?? 0xffffff, false, 0.75);
          this.ailmentPuff(e.side, e.ailment, 3);
          break;
        case "ailment":
          this.ailmentPuff(e.side, e.ailment, 14);
          break;
        case "heal": {
          const c = this.center(e.side);
          this.fx?.burst({
            x: c.x,
            y: GROUND_Y - 40,
            count: 18,
            color: [0x4fe08a, 0xa8ffc8],
            spreadX: 70,
            angle: [RISE - 0.2, RISE + 0.2],
            speed: [90, 200],
            life: [0.6, 1.1],
            size: [10, 18],
            drag: 0.3,
          });
          if (this.showNumbers)
            this.float(e.side, `+${e.amount}`, DAMAGE_COLORS.heal ?? 0x4fe08a, false);
          break;
        }
        case "barrier": {
          const c = this.center(e.side);
          this.fx?.ring(c.x, c.y, 0xe8f4ff, 60, 190, 0.5, 7, 1);
          if (this.showNumbers)
            this.float(
              e.side,
              `+${e.amount} Barrier`,
              DAMAGE_COLORS.barrier ?? 0xffffff,
              false,
              0.8,
            );
          break;
        }
        case "buff": {
          const c = this.center(e.side);
          // Coatings show their ailment's color (Serrated Edge, Venom Coat).
          const coat =
            e.stat === "bleedChance" ? 0xe0314b : e.stat === "poisonChance" ? 0xb5d82c : null;
          this.fx?.burst({
            x: c.x,
            y: GROUND_Y - 20,
            count: 16,
            color: coat ? [coat, lighten(coat)] : [0xffd84a, 0xffb13b],
            spreadX: 80,
            angle: [RISE - 0.1, RISE + 0.1],
            speed: [220, 380],
            life: [0.4, 0.7],
            size: [6, 10],
            stretch: 0.6,
            drag: 0.2,
          });
          break;
        }
        case "trigger": {
          const c = this.center(e.side);
          this.fx?.ring(c.x, c.y, 0xffd84a, 30, 120, 0.3, 5, 1);
          // An extra attack (Riposte, "strike back" affixes) names itself, so its number does
          // not read as a faster attack speed.
          const next = events[i + 1];
          if (next?.type === "hit" && next.side === e.side) {
            this.float(e.side, e.name, DAMAGE_COLORS.trigger ?? 0xffffff, false, 0.7);
          }
          break;
        }
        case "evade": {
          // `side` is the fighter who evaded.
          const evader = e.side;
          this.figure(evader).dodge = 1;
          this.fx?.burst({
            x: this.center(evader).x,
            y: GROUND_Y - 6,
            count: 10,
            kind: "bit",
            color: [0x8a7552, 0x6b5a3e],
            spreadX: 50,
            angle: [Math.PI + 0.2, Math.PI * 2 - 0.2],
            speed: [40, 120],
            gravity: 300,
            life: [0.3, 0.6],
            size: [5, 9],
          });
          this.float(evader, "Evade", DAMAGE_COLORS.miss ?? 0xffffff, false, 0.8);
          break;
        }
        case "perk":
          this.perk(e.side, e.perk);
          break;
        case "payoff":
          this.payoff(e.side, e.payoff);
          break;
        case "stun":
          this.figure(e.side).stun = e.seconds;
          break;
        case "death":
          this.die(e.side);
          break;
        default:
          break;
      }
    });
  }

  /** Current state: telegraph wind-up and ailment tints. */
  onSnapshot(snapshot: FightSnapshot): void {
    this.telegraphOn = snapshot.enemy.telegraph !== null;
    this.trait = snapshot.over ? undefined : snapshot.hero.trait;
    for (const side of ["hero", "enemy"] as const) {
      this.barrier[side] = Math.min(
        1,
        snapshot[side].barrier / Math.max(1, snapshot[side].maxLife),
      );
      const list = snapshot[side].ailments;
      const first = list[0];
      this.tint[side] = first ? (AILMENT_TINT[first.type] ?? 0xffffff) : 0xffffff;
      // Sunder: armor flakes keep falling while it lasts.
      const sunder = snapshot[side].curses.some((c) => c.armor) ? ["sunder"] : [];
      this.ailments[side] = [...list.map((a) => a.type), ...sunder];
      if (snapshot[side].life <= 0) this.ailments[side] = [];
    }
  }

  /**
   * The Class Trait in the arena (klassengeruest-v1.md 2): an ember aura that grows with Fury,
   * the Overcharge sparks circling the Emberseer, and Hunter's Mark as a sight over the enemy.
   */
  /**
   * Infusion: the Heirloom path's element clings to the weapon. A Fire blade burns, Lightning
   * crackles, Cold breathes frost, Void smokes. Physical weapons stay bare.
   */
  private drawInfusion(dt: number): void {
    const fx = this.fx;
    const element = this.infusion;
    if (!fx || !this.weaponTip || !this.hero || this.hero.root.alpha !== 1) return;
    if (!element || element === "physical") return;
    const at = this.world.toLocal(this.weaponTip.getGlobalPosition());
    this.infusionCarry += (this.motion ? 10 : 4) * dt;
    for (; this.infusionCarry >= 1; this.infusionCarry--) {
      const base = { x: at.x, y: at.y, count: 1, layer: "front" as const };
      if (element === "fire") {
        fx.burst({
          ...base,
          color: [0xff4a1a, 0xff8a1f, 0xffd84a],
          spreadX: 40,
          spreadY: 50,
          angle: [RISE - 0.4, RISE + 0.4],
          speed: [40, 110],
          life: [0.3, 0.7],
          size: [8, 18],
          endSize: 0.1,
        });
      } else if (element === "lightning") {
        fx.burst({
          ...base,
          color: [0xffe066, 0xfff6c0],
          spreadX: 36,
          spreadY: 50,
          speed: [80, 180],
          life: [0.12, 0.25],
          size: [3, 6],
          stretch: 3,
        });
      } else if (element === "cold") {
        fx.burst({
          ...base,
          color: [0xcfe9ff, 0x8ec8f0, 0xffffff],
          spreadX: 40,
          spreadY: 50,
          angle: [Math.PI * 0.35, Math.PI * 0.65],
          speed: [8, 30],
          life: [0.8, 1.5],
          size: [12, 24],
          alpha: 0.45,
        });
      } else {
        fx.burst({
          ...base,
          color: [0x2a1840, 0x6a3aa0, 0xa070e0],
          spreadX: 36,
          spreadY: 46,
          angle: [RISE - 0.5, RISE + 0.5],
          speed: [12, 40],
          life: [0.8, 1.4],
          size: [14, 28],
          alpha: 0.5,
        });
      }
    }
    // Lightning also throws a short arc now and then.
    if (element === "lightning" && this.motion) {
      this.infusionArc -= dt;
      if (this.infusionArc <= 0) {
        this.infusionArc = 0.4 + Math.random() * 0.6;
        const a = Math.random() * Math.PI * 2;
        fx.bolt(at.x, at.y, at.x + Math.cos(a) * 50, at.y + Math.sin(a) * 50, 0xffe066);
      }
    }
  }

  private drawMasteryAura(dt: number): void {
    const fx = this.fx;
    const aura = this.masteryAura;
    if (!fx || !aura || !this.hero || this.hero.root.alpha !== 1) return;
    const x = this.hero.root.x;
    const rate = aura === "burst" ? 0.7 : 6;
    this.masteryCarry += (this.motion ? rate : rate / 2) * dt;
    for (; this.masteryCarry >= 1; this.masteryCarry--) {
      if (aura === "burst") {
        // A slow ember ring at the feet: power gathering for the big blow.
        fx.ring(x, GROUND_Y - 4, 0xff8a3a, 30, 120, 0.9, 4);
      } else if (aura === "tempo") {
        // Wind streaks circle the hero.
        const side = Math.random() < 0.5 ? -1 : 1;
        fx.burst({
          x: x - side * 70,
          y: GROUND_Y - 60 - Math.random() * 140,
          count: 1,
          color: [0xf2e6c8, 0xd8f0ff],
          angle: side > 0 ? [-0.15, 0.15] : [Math.PI - 0.15, Math.PI + 0.15],
          speed: [220, 320],
          life: [0.25, 0.4],
          size: [4, 7],
          stretch: 6,
          alpha: 0.5,
          layer: "back",
        });
      } else {
        // Dark drops fall from the hero's hands.
        fx.burst({
          x,
          y: GROUND_Y - 120,
          count: 1,
          color: [0x5a2a6a, 0x3a5a2a, 0x2a1830],
          spreadX: 60,
          spreadY: 50,
          angle: [Math.PI * 0.4, Math.PI * 0.6],
          speed: [20, 50],
          life: [0.8, 1.3],
          size: [6, 12],
          alpha: 0.6,
          kind: "bit",
          layer: "back",
        });
      }
    }
  }

  private drawTrait(dt: number): void {
    const g = this.traitGfx;
    if (!g) return;
    g.clear();
    const trait = this.trait;
    if (!trait || !this.hero || this.hero.root.alpha < 1) return;
    const spin = this.motion ? this.clock : 0;
    const hero = this.center("hero");
    if (trait.kind === "fury") {
      const share = trait.value / Math.max(1, trait.max);
      if (share <= 0) return;
      const pulse = this.motion ? 0.06 * Math.sin(this.clock * 6) : 0;
      g.ellipse(hero.x, GROUND_Y - 190, 120 + 40 * share, 180 + 40 * share)
        .fill({ color: 0xff6a2b, alpha: 0.05 + 0.12 * share })
        .stroke({ color: 0xff8a3a, width: 4 + 6 * share, alpha: 0.2 + 0.4 * share + pulse });
      // Embers rise off the Cinderguard, more the hotter the Fury burns.
      this.traitCarry += 14 * share * dt;
      for (; this.fx && this.traitCarry >= 1; this.traitCarry--) {
        this.fx.burst({
          x: hero.x,
          y: GROUND_Y - 120,
          count: 1,
          color: [0xff6a2b, 0xffb13b, 0xffd84a],
          spreadX: 110,
          spreadY: 160,
          angle: [RISE - 0.3, RISE + 0.3],
          speed: [60, 140],
          life: [0.4, 0.9],
          size: [6, 12],
          endSize: 0.1,
        });
      }
    } else if (trait.kind === "overcharge") {
      const color = DAMAGE_COLORS[trait.damageType] ?? 0xffd84a;
      for (let i = 0; i < trait.max; i++) {
        const a = spin * 1.8 + (i * Math.PI * 2) / trait.max;
        const x = hero.x + Math.cos(a) * 130;
        const y = hero.y + Math.sin(a) * 50;
        const lit = i < trait.value;
        g.circle(x, y, lit ? 16 : 9).fill({
          color: lit ? color : 0x8a8078,
          alpha: lit ? 0.35 : 0.25,
        });
        g.circle(x, y, lit ? 7 : 4).fill({
          color: lit ? 0xffffff : 0xb8b0a8,
          alpha: lit ? 1 : 0.5,
        });
      }
    } else if (trait.value > 0) {
      // Hunter's Mark: a turning sight over the enemy, one notch lit per Mark; it glows hotter as
      // the Marks pile up for the next Crit.
      const foe = this.center("enemy");
      const y = foe.y - 230;
      const a = spin * 1.2;
      const share = trait.value / Math.max(1, trait.max);
      const color = share >= 1 ? 0xff6a2b : 0xffe9a8;
      g.circle(foe.x, y, 26 + 6 * share).stroke({ color, width: 3 + 2 * share, alpha: 0.9 });
      for (let i = 0; i < 4; i++) {
        const r = a + (i * Math.PI) / 2;
        g.moveTo(foe.x + Math.cos(r) * 16, y + Math.sin(r) * 16)
          .lineTo(foe.x + Math.cos(r) * 36, y + Math.sin(r) * 36)
          .stroke({ color, width: 3, alpha: 0.9 });
      }
      for (let i = 0; i < trait.max; i++) {
        const r = -Math.PI / 2 + (i * Math.PI * 2) / trait.max;
        const lit = i < trait.value;
        g.circle(foe.x + Math.cos(r) * 50, y + Math.sin(r) * 50, lit ? 6 : 3).fill({
          color: lit ? 0xff6a2b : 0x8a8078,
          alpha: lit ? 0.95 : 0.4,
        });
      }
      g.circle(foe.x, y, 4 + 3 * share).fill({ color: 0xff6a2b });
    }
  }

  private figure(side: Side): Figure {
    const f = side === "hero" ? this.hero : this.enemy;
    if (!f) throw new Error("Arena not ready");
    return f;
  }

  /** Chest height of a fighter, where hits land. */
  private center(side: Side): { x: number; y: number } {
    return { x: side === "hero" ? HERO_X : ENEMY_X, y: GROUND_Y - 250 };
  }

  /** Where projectiles leave: the bow, wand or casting hand. */
  private hand(side: Side): { x: number; y: number } {
    if (side === "hero" && this.heroShot) {
      const p = this.world.toLocal(this.heroShot.getGlobalPosition());
      return { x: p.x, y: p.y };
    }
    if (side === "hero" && this.heroFist) {
      const p = this.world.toLocal(this.heroFist.getGlobalPosition());
      return { x: p.x + 30, y: p.y - 30 };
    }
    return side === "hero"
      ? { x: HERO_X + 140, y: GROUND_Y - 350 }
      : { x: ENEMY_X - 130, y: GROUND_Y - 300 };
  }

  /** The visible arena in world pixels. */
  private view(): View {
    const scale = this.world.scale.x;
    const left = -this.world.x / scale;
    const top = -this.world.y / scale;
    return { left, right: left + this.size.w / scale, top, ground: GROUND_Y };
  }

  private wait(seconds: number, run: () => void): void {
    if (seconds <= 0) run();
    else this.later.push({ at: this.clock + seconds, run });
  }

  private perk(owner: Side, perk: PerkId): void {
    const look = PERK_FX[perk];
    const side: Side = look.on === "self" ? owner : owner === "hero" ? "enemy" : "hero";
    const c = this.center(side);
    const color = [...look.color];
    const main = color[0] ?? 0xffffff;
    switch (look.look) {
      case "flakes":
        this.fx?.burst({
          x: c.x,
          y: c.y,
          count: 12,
          kind: "bit",
          color,
          spreadX: 30,
          spreadY: 40,
          angle: [Math.PI + 0.3, Math.PI * 2 - 0.3],
          speed: [60, 180],
          gravity: 600,
          life: [0.5, 0.9],
          size: [5, 9],
          spin: 8,
        });
        break;
      case "ring":
        this.fx?.ring(c.x, c.y, main, 40, 150, 0.4, 5, 1);
        break;
      case "rise":
        this.fx?.burst({
          x: c.x,
          y: GROUND_Y - 10,
          count: 22,
          color,
          spreadX: 60,
          angle: [RISE - 0.25, RISE + 0.25],
          speed: [80, 220],
          life: [0.6, 1.2],
          size: [6, 12],
          drag: 0.4,
          wobble: 12,
        });
        break;
      case "wind":
        this.fx?.burst({
          x: c.x,
          y: c.y + 30,
          count: 14,
          color,
          spreadY: 60,
          angle: owner === "hero" ? [Math.PI - 0.1, Math.PI + 0.1] : [-0.1, 0.1],
          speed: [260, 420],
          life: [0.25, 0.45],
          size: [4, 7],
          stretch: 1.2,
          drag: 0.1,
        });
        break;
      case "star":
        this.fx?.ring(c.x, c.y, main, 20, 110, 0.3, 6, 1);
        this.fx?.burst({
          x: c.x,
          y: c.y,
          count: 18,
          color,
          speed: [180, 340],
          life: [0.25, 0.5],
          size: [5, 9],
          stretch: 1,
          drag: 0.15,
        });
        break;
    }
    if (perk === "titan" || perk === "undying") this.shake(0.35);
    if (look.name) this.float(owner, getPerk(perk).name, main, false, 0.8);
  }

  /** An ailment payoff or Class Trait (`PAYOFF_FX`). */
  private payoff(owner: Side, kind: PayoffKind): void {
    const look = PAYOFF_FX[kind];
    const side: Side = look.on === "self" ? owner : owner === "hero" ? "enemy" : "hero";
    const c = this.center(side);
    const color = [...look.color];
    const main = color[0] ?? 0xffffff;
    switch (look.look) {
      case "pop":
        // Poison stacks burst: green droplets spray out of the target.
        this.fx?.ring(c.x, c.y, main, 30, 140, 0.35, 8, 1);
        this.fx?.burst({
          x: c.x,
          y: c.y,
          count: 26,
          color,
          angle: [0, Math.PI * 2],
          speed: [140, 300],
          gravity: 420,
          life: [0.4, 0.8],
          size: [8, 15],
          drag: 0.3,
        });
        break;
      case "flare":
        // The Burn flares up: a column of fire rises from the target.
        this.fx?.ring(c.x, c.y, main, 40, 180, 0.4, 10, 1);
        this.fx?.burst({
          x: c.x,
          y: GROUND_Y - 30,
          count: 30,
          color,
          spreadX: 70,
          angle: [RISE - 0.25, RISE + 0.25],
          speed: [260, 480],
          life: [0.35, 0.7],
          size: [16, 30],
          drag: 0.25,
          wobble: 10,
        });
        break;
      case "implode":
        // Corruption collapses: a dark ring shrinks into the target, then bursts.
        this.fx?.ring(c.x, c.y, color[1] ?? main, 200, 30, 0.45, 12, 1);
        this.wait(0.3, () => {
          this.fx?.ring(c.x, c.y, main, 30, 220, 0.5, 10, 1);
          this.fx?.burst({
            x: c.x,
            y: c.y,
            count: 32,
            color,
            angle: [0, Math.PI * 2],
            speed: [200, 420],
            life: [0.3, 0.7],
            size: [10, 22],
            endSize: 0.1,
            drag: 0.2,
          });
        });
        break;
      case "ring":
        this.fx?.ring(c.x, c.y, main, 50, 170, 0.45, 9, 1);
        break;
      case "rift": {
        // Starfall Crit: the air tears open in a white-violet seam, light spills out of it.
        const top = c.y - 120;
        const bottom = c.y + 90;
        this.fx?.bolt(c.x - 6, top, c.x + 6, bottom, main);
        this.fx?.bolt(c.x + 4, top + 20, c.x - 4, bottom - 20, 0xffffff);
        this.fx?.ring(c.x, c.y, main, 24, 150, 0.35, 8, 1);
        for (const dir of [0, Math.PI]) {
          this.fx?.burst({
            x: c.x,
            y: c.y,
            count: 22,
            color,
            spreadY: 90,
            angle: [dir - 0.5, dir + 0.5],
            speed: [120, 300],
            life: [0.3, 0.6],
            size: [5, 10],
            stretch: 1,
            drag: 0.2,
          });
        }
        break;
      }
      case "nova": {
        // Overcharge: the three charges break loose as a ring of the weapon's element.
        const tint = DAMAGE_COLORS[this.trait?.damageType ?? "fire"] ?? main;
        this.fx?.ring(c.x, c.y, tint, 30, 320, 0.5, 14, 1);
        this.fx?.ring(c.x, c.y, 0xffffff, 20, 200, 0.35, 6, 1);
        this.fx?.burst({
          x: c.x,
          y: c.y,
          count: 40,
          color: [tint, 0xffffff],
          angle: [0, Math.PI * 2],
          speed: [260, 520],
          life: [0.3, 0.6],
          size: [8, 16],
          stretch: 0.6,
          drag: 0.2,
        });
        break;
      }
      case "cashIn": {
        // Cash In: the enemy's ailments are pulled into one point (their colours), then break out
        // as one blow in the Heirloom's element.
        const tint = DAMAGE_COLORS[this.trait?.damageType ?? "fire"] ?? main;
        const dots = [0xff6a2b, 0xb5d82c, 0xa35cff, 0xc8102e];
        this.fx?.ring(c.x, c.y, dots[0] ?? main, 220, 30, 0.3, 6, 0.9);
        this.fx?.ring(c.x, c.y, dots[2] ?? main, 200, 25, 0.28, 6, 0.9);
        this.fx?.ring(c.x, c.y, tint, 180, 20, 0.3, 10, 1);
        this.wait(0.28, () => {
          this.fx?.ring(c.x, c.y, 0xffffff, 20, 260, 0.4, 12, 1);
          this.fx?.ring(c.x, c.y, tint, 30, 200, 0.5, 8, 1);
          this.fx?.burst({
            x: c.x,
            y: c.y,
            count: 44,
            color: [tint, 0xffffff, ...dots],
            angle: [0, Math.PI * 2],
            speed: [260, 560],
            life: [0.3, 0.6],
            size: [8, 18],
            stretch: 0.8,
            drag: 0.2,
          });
        });
        break;
      }
      case "arc": {
        // Conduction: a thin arc runs from the Shocked enemy back to the Wand.
        const back = this.center(owner);
        this.fx?.bolt(c.x, c.y - 20, back.x, back.y - 30, main);
        break;
      }
      case "star":
        this.fx?.ring(c.x, c.y, main, 20, 110, 0.3, 6, 1);
        this.fx?.burst({
          x: c.x,
          y: c.y,
          count: 14,
          color,
          speed: [180, 340],
          life: [0.25, 0.5],
          size: [5, 9],
          stretch: 1,
          drag: 0.15,
        });
        break;
    }
    if (look.shake) this.shake(look.shake);
    if (!look.quiet)
      this.float(owner === side ? owner : side, PAYOFF_NAMES[kind], main, false, 0.8);
  }

  private shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private hitStop(seconds: number): void {
    if (this.speed !== 1 || this.freezeCooldown > 0) return;
    this.freeze = Math.max(this.freeze, seconds);
    this.freezeCooldown = 0.35;
  }

  private cast(side: Side, skill: string, heatCost: number, rest: readonly CombatEvent[]): void {
    const fx = this.fx;
    if (!fx) return;
    const next = rest.find(
      (e) =>
        (e.type === "hit" && e.side === side && e.source === skill) ||
        ((e.type === "heal" || e.type === "barrier" || e.type === "buff") && e.side === side),
    );
    const color =
      next?.type === "hit" && next.damageType !== "physical"
        ? (DAMAGE_COLORS[next.damageType] ?? 0xffb13b)
        : next?.type === "heal"
          ? 0x4fe08a
          : next?.type === "barrier"
            ? 0xe8f4ff
            : 0xffb13b;
    const big = heatCost >= 60;
    const x = this.center(side).x;
    fx.ring(x, GROUND_Y - 4, color, 40, big ? 230 : 150, big ? 0.55 : 0.4, big ? 9 : 5);
    fx.burst({
      x,
      y: GROUND_Y - 20,
      count: big ? 26 : 12,
      color: [color, lighten(color)],
      spreadX: big ? 110 : 70,
      angle: [RISE - 0.25, RISE + 0.25],
      speed: [80, big ? 280 : 200],
      life: [0.4, 0.9],
      size: [8, 14],
      drag: 0.4,
    });
    if (big) this.shake(0.2);
  }

  /** Signature looks of the weapon Innates and their Skill Tree stand-ins (klassen-v2.md). */
  private signature(source: string, at: { x: number; y: number }, away: number): void {
    const fx = this.fx;
    if (!fx) return;
    switch (source) {
      case "Crushing Blow":
        // Armor plates crack off: Sunder.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 22,
          kind: "bit",
          color: [0x8a8f96, 0xc9c2b8, 0x5e5750],
          spreadY: 40,
          angle: [away - 1.1, away + 1.1],
          speed: [160, 420],
          gravity: 900,
          life: [0.5, 0.9],
          size: [8, 16],
          spin: 8,
        });
        fx.ring(at.x, at.y, 0xc9c2b8, 30, 140, 0.35, 6, 1);
        this.shake(0.25);
        break;
      case "Earthsplitter":
        // The Vanquisher's blow splits the ground under the foe.
        fx.ring(at.x, GROUND_Y - 4, 0xc9c2b8, 30, 240, 0.55, 9);
        fx.burst({
          x: at.x,
          y: GROUND_Y - 6,
          count: 18,
          kind: "bit",
          color: [0x6b625a, 0x9a9088, 0x3a332c],
          angle: [RISE - 0.9, RISE + 0.9],
          speed: [180, 420],
          gravity: 1100,
          life: [0.5, 0.9],
          size: [6, 12],
          spin: 6,
        });
        this.shake(0.35);
        this.hitStop(0.06);
        break;
      case "Searing Blow":
        // The blade leaves a curtain of embers rising off the foe.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 26,
          color: [0xff8a3a, 0xffd84a, 0xff4a1a],
          spreadX: 40,
          spreadY: 60,
          angle: [RISE - 0.5, RISE + 0.5],
          speed: [120, 320],
          life: [0.5, 1],
          size: [6, 12],
          drag: 0.06,
          gravity: -120,
        });
        break;
      case "Storm Strike":
        // Each of the three cuts throws a short arc from the sky.
        fx.bolt(at.x + (Math.random() - 0.5) * 60, this.view().top, at.x, at.y, 0xffe14d);
        break;
      case "Frost Strike":
        // Ice shards burst out and a cold ring settles on the ground.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 20,
          kind: "bit",
          color: [0xb8e4ff, 0xffffff, 0x6ab8f0],
          angle: [away - 1, away + 1],
          speed: [220, 520],
          gravity: 800,
          life: [0.4, 0.8],
          size: [6, 12],
          spin: 10,
        });
        fx.ring(at.x, GROUND_Y - 4, 0xb8e4ff, 30, 200, 0.5, 8);
        this.hitStop(0.05);
        break;
      case "Skull Crack":
        fx.ring(at.x, at.y - 120, 0xffe14d, 20, 120, 0.4, 7, 1);
        fx.ring(at.x, GROUND_Y - 4, 0xc9c2b8, 40, 200, 0.5, 8);
        this.shake(0.4);
        this.hitStop(0.08);
        break;
      case "Heavy Bolt":
        // The bolt punches through and out the back.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 18,
          color: [0xffffff, 0xffe9a8],
          angle: [away - 0.12, away + 0.12],
          speed: [700, 1100],
          life: [0.15, 0.3],
          size: [6, 10],
          stretch: 1.2,
        });
        fx.ring(at.x, at.y, 0xffffff, 10, 90, 0.25, 5, 1);
        this.shake(0.3);
        break;
      case "Barbed Arrow":
      case "Envenom":
        fx.burst({
          x: at.x,
          y: at.y,
          count: 12,
          kind: "bit",
          color: source === "Envenom" ? [0xb5d82c, 0x6a8a1a] : [0xe0314b, 0xb5d82c],
          angle: [away - 0.8, away + 0.8],
          speed: [120, 300],
          gravity: 600,
          life: [0.4, 0.8],
          size: [5, 9],
        });
        break;
      default:
        break;
    }
  }

  private delivery(side: Side, source: string, damageType: string): Delivery {
    const named = SKILL_FX[source];
    if (named) return named;
    if (!this.ranged[side]) return "slash";
    if (damageType === "physical") return "arrow";
    return damageType === "lightning" ? "bolt" : "orb";
  }

  private hit(e: HitEvent, delay: number): void {
    const fx = this.fx;
    if (!fx) return;
    const target = other(e.side);
    const color = DAMAGE_COLORS[e.damageType] ?? 0xffffff;
    const heavy =
      e.side === "enemy" &&
      this.heavy !== null &&
      this.heavy.skill === e.source &&
      this.clock <= this.heavy.until;
    const how = this.delivery(e.side, e.source, e.damageType);
    const land = () => this.impact(e, how, heavy);
    const attacker = this.figure(e.side);
    const from = this.hand(e.side);
    const to = this.center(target);
    this.wait(delay, () => {
      switch (how) {
        case "slash":
          attacker.lunge = 1;
          attacker.swing = 1;
          this.wait(0.08, land);
          break;
        case "arrow":
        case "orb":
          attacker.recoil = 1;
          if (e.side === "hero") this.heroShotAt = this.clock;
          fx.projectile(how, from, to, color, land);
          break;
        case "bolt":
          attacker.recoil = 1;
          if (e.side === "hero") this.heroShotAt = this.clock;
          fx.bolt(from.x, from.y, to.x, to.y, color);
          land();
          break;
        case "fall": {
          const top = this.view().top;
          const dir = target === "enemy" ? -1 : 1;
          fx.projectile("fall", { x: to.x + dir * 180, y: top - 40 }, to, color, land);
          break;
        }
        case "nova":
          attacker.recoil = 1;
          fx.ring(to.x, GROUND_Y - 4, color, 30, 260, 0.45, 10);
          land();
          break;
      }
    });
  }

  private impact(e: HitEvent, how: Delivery, heavy: boolean): void {
    const fx = this.fx;
    if (!fx) return;
    const target = other(e.side);
    const victim = this.figure(target);
    const color = DAMAGE_COLORS[e.damageType] ?? 0xffffff;
    const big = e.crit || heavy || e.mighty === true;
    const at = this.center(target);
    if (e.glancing) {
      this.glance(e, at, target);
      return;
    }
    victim.flash = 1;
    victim.knock = Math.max(victim.knock, big ? 1 : 0.35);
    // Sparks fly away from the attacker.
    const away = target === "enemy" ? 0 : Math.PI;
    if (how === "slash") {
      const edge = e.damageType === "physical" ? 0xffb13b : color;
      fx.slash(at.x, at.y, e.side === "hero" ? 1 : -1, edge, big);
    }
    fx.burst({
      x: at.x,
      y: at.y,
      count: big ? 34 : 14,
      color:
        e.blocked || e.damageType === "physical"
          ? [0xffe9a8, 0xffffff, 0xffb13b]
          : [color, lighten(color), 0xffffff],
      spreadY: 30,
      angle: [away - 0.9, away + 0.9],
      speed: [240, big ? 760 : 480],
      life: [0.18, 0.45],
      size: [9, 15],
      stretch: 0.5,
      drag: 0.05,
      gravity: 700,
    });
    if (how === "nova" || how === "fall") {
      fx.burst({
        x: at.x,
        y: GROUND_Y - 30,
        count: 20,
        color: [color, lighten(color)],
        spreadX: 90,
        angle: [RISE - 0.35, RISE + 0.35],
        speed: [150, 360],
        life: [0.3, 0.6],
        size: [12, 22],
        drag: 0.1,
      });
    }
    this.signature(e.source, at, away);
    if (e.blocked)
      fx.ring(at.x + (target === "hero" ? -56 : 56), at.y, 0xffe9a8, 20, 80, 0.25, 6, 1);
    if (e.deflected) {
      // A Deflect: the victim half-dodges and the spell glances off in a pale arc.
      victim.dodge = Math.max(victim.dodge, 0.5);
      fx.ring(at.x, at.y, 0xd8f0c8, 24, 110, 0.3, 5, 1);
      fx.burst({
        x: at.x,
        y: at.y,
        count: 10,
        color: [0xd8f0c8, 0xa8d8a0, 0xffffff],
        angle: [RISE - 1.1, RISE + 1.1],
        speed: [160, 340],
        life: [0.25, 0.5],
        size: [6, 11],
        drag: 0.08,
      });
    }
    if (e.mighty) {
      // A Mighty Hit: the blow drives down into the ground, a wide amber shock ring.
      fx.ring(at.x, GROUND_Y - 4, 0xffb13b, 40, 260, 0.4, 10, 1);
      fx.burst({
        x: at.x,
        y: GROUND_Y - 10,
        count: 16,
        kind: "bit",
        color: [0x8a6a48, 0x5e4a36, 0xffb13b],
        spreadX: 60,
        angle: [RISE - 0.6, RISE + 0.6],
        speed: [200, 420],
        life: [0.3, 0.6],
        size: [5, 10],
        gravity: 1100,
      });
    }
    if (big) {
      fx.ring(at.x, at.y, 0xffffff, 30, heavy ? 220 : 160, 0.3, 8, 1);
      this.shake(heavy ? 0.7 : 0.35);
      this.hitStop(heavy ? 0.12 : 0.06);
    } else {
      this.shake(0.06);
    }
    if (this.showNumbers) {
      const text = `${e.damage.toLocaleString("en-US")}${e.crit ? "!" : ""}${e.mighty ? " ⚒" : ""}`;
      this.float(target, e.blocked ? `${text} ⛨` : e.deflected ? `${text} ↺` : text, color, e.crit);
    }
  }

  /** A Glancing Blow: the weapon skids off, dull grey sparks skitter up, a small grey number. */
  private glance(e: HitEvent, at: { x: number; y: number }, target: Side): void {
    const fx = this.fx;
    if (!fx) return;
    const victim = this.figure(target);
    victim.knock = Math.max(victim.knock, 0.15);
    const away = target === "enemy" ? 0 : Math.PI;
    // Skids upward and back toward the attacker.
    const up = target === "enemy" ? RISE - 0.5 : RISE + 0.5;
    fx.burst({
      x: at.x - (target === "enemy" ? 40 : -40),
      y: at.y - 30,
      count: 10,
      color: [0x8a8178, 0xc9c2b8, 0x5e5750],
      angle: [up - 0.5, up + 0.5],
      speed: [180, 380],
      life: [0.15, 0.32],
      size: [5, 9],
      stretch: 0.8,
      gravity: 900,
    });
    fx.burst({
      x: at.x,
      y: at.y,
      count: 4,
      kind: "bit",
      color: 0x5e5750,
      angle: [away - 0.6, away + 0.6],
      speed: [60, 140],
      life: [0.3, 0.5],
      size: [4, 7],
      gravity: 500,
    });
    if (e.parried) {
      // A Parry: the defender's steel catches the blow in a bright arc.
      const guard = this.center(target);
      fx.ring(guard.x + (target === "hero" ? 40 : -40), guard.y, 0xdfe6ee, 18, 90, 0.25, 5, 1);
      fx.burst({
        x: guard.x + (target === "hero" ? 40 : -40),
        y: guard.y,
        count: 12,
        color: [0xffffff, 0xdfe6ee, 0xb8c0cc],
        angle: [RISE - 1.2, RISE + 1.2],
        speed: [220, 460],
        life: [0.12, 0.3],
        size: [4, 8],
        stretch: 1.2,
        gravity: 600,
      });
    }
    if (this.showNumbers) {
      const text = e.damage.toLocaleString("en-US");
      this.float(target, e.parried ? `${text} ⚔` : text, 0x8a8178, false, 0.75);
    }
  }

  private ailmentPuff(side: Side, ailment: string, count: number): void {
    const style = AILMENT_FX[ailment];
    if (!style || !this.fx) return;
    const c = this.center(side);
    this.fx.burst({ ...style, x: c.x, y: c.y + 20, count });
  }

  /** The Gatekeeper fell: its gate cracks, the fires go out in a rain of stone and sparks. */
  private breakGate(gate: NonNullable<ArenaScene["gate"]>): void {
    gate.root.alpha = 0.3;
    gate.sigil.alpha = 0;
    for (const f of gate.fires) {
      this.fx?.burst({
        x: f.x,
        y: f.y + 120,
        count: 30,
        kind: "bit",
        color: [0x5e5750, 0x8a8178, 0x3a332d],
        spreadX: 40,
        spreadY: 200,
        angle: [RISE - 1, RISE + 1],
        speed: [40, 160],
        life: [0.8, 1.6],
        size: [8, 16],
        gravity: 500,
        spin: 5,
      });
      this.fx?.burst({
        x: f.x,
        y: f.y,
        count: 24,
        color: [0xff8a1f, 0xffd84a],
        angle: [RISE - 0.8, RISE + 0.8],
        speed: [80, 260],
        life: [0.5, 1],
        size: [8, 14],
        drag: 0.4,
      });
    }
    this.shake(0.5);
  }

  private die(side: Side): void {
    const f = this.figure(side);
    if (f.root.alpha < 1) return;
    if (side === "enemy" && this.gate) this.breakGate(this.gate);
    f.root.alpha = 0.35;
    f.knock = 1.6;
    f.stun = 0;
    const c = this.center(side);
    this.fx?.burst({
      x: c.x,
      y: c.y + 40,
      count: 60,
      kind: "bit",
      color: [0x2a1f17, 0x5e5750, 0x8a8178],
      spreadX: 80,
      spreadY: 150,
      angle: [RISE - 0.8, RISE + 0.8],
      speed: [30, 140],
      life: [0.8, 1.8],
      size: [6, 12],
      spin: 4,
      drag: 0.5,
    });
    this.fx?.burst({
      x: c.x,
      y: c.y + 40,
      count: 40,
      color: [0xff8a1f, 0xffb13b, 0xff6a2b],
      spreadX: 80,
      spreadY: 150,
      angle: [RISE - 0.5, RISE + 0.5],
      speed: [40, 180],
      life: [0.6, 1.6],
      size: [8, 14],
      wobble: 12,
    });
    this.shake(0.4);
  }

  private float(side: Side, label: string, color: number, crit: boolean, scale = 1): void {
    if (!this.app) return;
    const x =
      (side === "hero" ? HERO_X : ENEMY_X) +
      (side === "hero" ? -40 : 40) +
      spread(this.clock * 7.3) * 70;
    this.floaters?.spawn({
      x,
      y: GROUND_Y - 260 + spread(this.clock * 3.1) * 40,
      label,
      color: crit ? lighten(color) : color,
      fontSize: Math.round((crit ? 46 : 28) * scale),
      crit,
      vx: spread(this.clock * 5.7) * 12,
      vy: -55,
      life: crit ? 1.3 : 1.05,
    });
  }

  /** Shake and zoom live on the camera; the world stays laid out by `layout`. */
  private moveCamera(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const zoomTo = this.telegraphOn && this.motion ? 1.06 : 1;
    this.zoom += (zoomTo - this.zoom) * Math.min(1, dt * 4);
    const fx = this.world.x + ENEMY_X - 200;
    const fy = this.world.y + GROUND_Y - 260;
    const s = this.motion ? this.trauma * this.trauma : 0;
    const t = this.clock * 40;
    this.camera.pivot.set(fx, fy);
    this.camera.position.set(fx + Math.sin(t * 1.3) * 22 * s, fy + Math.sin(t * 1.7 + 1) * 16 * s);
    this.camera.rotation = Math.sin(t * 0.9 + 2) * 0.012 * s;
    this.camera.scale.set(this.zoom);
  }

  private tick(dt: number): void {
    // Under an overlay the arena holds still: a few frames a second keep the picture.
    if (this.app)
      this.app.ticker.maxFPS = this.paused ? PAUSED_FPS : this.idle ? IDLE_FPS : MAX_FPS;
    if (this.paused) return;
    this.freezeCooldown = Math.max(0, this.freezeCooldown - dt);
    if (this.freeze > 0) {
      // Hit-stop: everything holds still except the shake.
      this.freeze = Math.max(0, this.freeze - dt);
      this.clock += dt;
      this.moveCamera(dt);
      this.clock -= dt;
      return;
    }
    this.clock += dt;
    const due = this.later.filter((l) => l.at <= this.clock);
    this.later = this.later.filter((l) => l.at > this.clock);
    for (const l of due) l.run();
    for (const f of [this.hero, this.enemy]) {
      if (!f) continue;
      const dir = f.side === "hero" ? 1 : -1;
      f.lunge = Math.max(0, f.lunge - dt * 5);
      f.flash = Math.max(0, f.flash - dt * 6);
      f.knock = Math.max(0, f.knock - dt * 5);
      f.recoil = Math.max(0, f.recoil - dt * 6);
      f.swing = Math.max(0, f.swing - dt * 3);
      f.dodge = Math.max(0, f.dodge - dt * 4);
      f.stun = Math.max(0, f.stun - dt);
      f.body.x =
        dir * 26 * Math.sin(f.lunge * Math.PI) -
        dir * 30 * f.knock -
        dir * 14 * Math.sin(f.recoil * Math.PI) -
        dir * 60 * Math.sin(f.dodge * Math.PI);
      f.body.y = Math.sin(this.clock * 2.2 + (f.side === "hero" ? 0 : 1.3)) * 3;
      f.body.rotation = -dir * 0.06 * Math.min(1, f.knock);
      if (f.side === "hero" && this.heroArm) {
        // The forearm breathes with the body and swings the weapon on an attack.
        const ranged = this.ranged.hero;
        const timer = ranged ? f.recoil : f.swing;
        const swing = timer > 0 ? armSwing(1 - timer, ranged) : 0;
        this.heroArm.rotation = Math.sin(this.clock * 2.2) * 0.04 + swing;
      }
      if (f.side === "hero")
        this.heroRanged?.pose(this.clock - this.heroShotAt, this.clock, this.motion, f.swing);
      const base = this.tint[f.side];
      f.body.tint = f.flash > 0.5 ? 0xff7777 : base;
      f.stars.visible = f.stun > 0;
      if (f.stun > 0) drawStars(f.stars, this.clock, f.side === "hero" ? -440 : -470);
    }
    for (const side of ["hero", "enemy"] as const) {
      const ward = this.ward[side];
      if (!ward) continue;
      const share = this.barrier[side];
      const pulse = this.motion ? 0.08 * Math.sin(this.clock * 3) : 0;
      const target = share > 0.005 ? 0.55 + 0.45 * Math.min(1, share * 3) + pulse : 0;
      ward.alpha += (target - ward.alpha) * Math.min(1, dt * 8);
    }
    this.drawTrait(dt);
    if (this.telegraph) {
      const target = this.telegraphOn ? 0.55 + 0.35 * Math.sin(this.clock * 9) : 0;
      this.telegraph.alpha += (target - this.telegraph.alpha) * Math.min(1, dt * 12);
    }
    // Ailment particles while an ailment lasts (about 12 per second each).
    for (const side of ["hero", "enemy"] as const) {
      const list = this.ailments[side];
      if (!list.length) continue;
      const due2 = this.ailmentCarry[side] + 12 * dt;
      const n = Math.floor(due2);
      this.ailmentCarry[side] = due2 - n;
      for (let i = 0; i < n; i++) for (const a of list) this.ailmentPuff(side, a, 1);
    }
    // An Exalted weapon sheds golden sparks.
    if (this.fx && this.exaltedTip && this.hero && this.hero.root.alpha === 1) {
      this.exaltedCarry += 9 * dt;
      const at = this.world.toLocal(this.exaltedTip.getGlobalPosition());
      for (; this.exaltedCarry >= 1; this.exaltedCarry--) {
        this.fx.burst({
          x: at.x,
          y: at.y,
          count: 1,
          color: [0xffe08a, 0xfff6d8],
          spreadX: 50,
          spreadY: 60,
          angle: [RISE - 0.6, RISE + 0.6],
          speed: [10, 40],
          life: [0.5, 1.1],
          size: [4, 9],
          alpha: 0.8,
          layer: "front",
        });
      }
    }
    this.drawInfusion(dt);
    this.drawMasteryAura(dt);
    if (this.levelGlow && this.motion) {
      this.levelGlow.alpha = 0.75 + 0.25 * Math.sin(this.clock * 1.1);
    }
    // The Gatekeeper's gate: the fire bowls burn, the sigil glows while the keeper stands.
    if (this.gate && this.gate.root.alpha === 1) {
      if (this.motion) this.gate.sigil.alpha = 0.7 + 0.3 * Math.sin(this.clock * 2.4);
      this.gateCarry += 14 * dt;
      for (; this.fx && this.gateCarry >= 1; this.gateCarry--) {
        for (const f of this.gate.fires) {
          this.fx.burst({
            x: f.x,
            y: f.y,
            count: 1,
            color: [0xff6a2b, 0xffb13b, 0xffd84a],
            spreadX: 26,
            spreadY: 6,
            angle: [RISE - 0.3, RISE + 0.3],
            speed: [60, 130],
            life: [0.4, 0.8],
            size: [12, 22],
            endSize: 0.1,
          });
        }
      }
    }
    // Wildfire: the ground glow breathes, flames lick up at both edges of the view.
    if (this.wildfire) {
      const { glow, tier } = this.wildfire;
      if (this.motion) glow.alpha = 0.8 + 0.2 * Math.sin(this.clock * 1.7);
      this.wildfireCarry += (4 + tier) * dt;
      const view = this.view();
      for (; this.fx && this.wildfireCarry >= 1; this.wildfireCarry--) {
        for (const side of [view.left + 70, view.right - 70]) {
          this.fx.burst({
            x: side,
            y: view.ground + 20,
            count: 1,
            color: [0xff4a1a, 0xff8a1f, 0xffb13b],
            spreadX: 90,
            spreadY: 10,
            angle: [RISE - 0.25, RISE + 0.25],
            speed: [90, 190],
            life: [0.5, 1],
            size: [26, 46],
            endSize: 0.1,
            layer: "back",
          });
        }
      }
    }
    // The Draught of the trip: its brew ring breathes, bubbles rise from it.
    if (this.draught) {
      const { ring, color } = this.draught;
      if (this.motion) ring.alpha = 0.75 + 0.25 * Math.sin(this.clock * 2.1);
      if (this.fx && this.hero && this.hero.root.alpha === 1) {
        this.draughtCarry += 4 * dt;
        for (; this.draughtCarry >= 1; this.draughtCarry--) {
          this.fx.burst({
            x: HERO_X,
            y: GROUND_Y - 4,
            count: 1,
            color: [color, lighten(color)],
            spreadX: 120,
            spreadY: 8,
            angle: [RISE - 0.15, RISE + 0.15],
            speed: [40, 90],
            life: [0.8, 1.4],
            size: [6, 12],
            endSize: 0.4,
            wobble: 10,
            alpha: 0.7,
            layer: "back",
          });
        }
      }
    }
    // The worn Echo walks with the hero: its aura breathes, its motes drift up around them.
    if (this.echoAura && this.motion) {
      this.echoAura.alpha = 0.5 + 0.15 * Math.sin(this.clock * 1.4);
    }
    if (this.offHandGlow) {
      // A floating off hand flares on a cast.
      const flare = Math.max(0, 1 - (this.clock - this.heroShotAt) / 0.4);
      const breath = this.motion ? 0.2 * Math.sin(this.clock * 2.1) : 0;
      this.offHandGlow.alpha = 0.4 + breath + 0.5 * flare;
    }
    if (this.offHandFloat && this.motion) {
      this.offHandFloat.y = -4 * Math.sin(this.clock * 1.6);
    }
    if (this.fx && this.echoColor !== null && this.hero && this.hero.root.alpha === 1) {
      this.echoCarry += 7 * dt;
      const c = this.center("hero");
      for (; this.echoCarry >= 1; this.echoCarry--) {
        this.fx.burst({
          x: c.x,
          y: c.y + 30,
          count: 1,
          color: [this.echoColor, lighten(this.echoColor)],
          spreadX: 70,
          spreadY: 120,
          angle: [RISE - 0.4, RISE + 0.4],
          speed: [20, 60],
          life: [0.9, 1.6],
          size: [8, 16],
          wobble: 14,
          alpha: 0.5,
          layer: "back",
        });
      }
    }
    if (this.fx) {
      this.weather?.update(this.fx, this.view(), dt);
      this.fx.update(dt);
    }
    this.moveCamera(dt);
    this.floaters?.update(dt);
  }
}
