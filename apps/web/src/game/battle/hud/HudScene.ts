import type { FightSnapshot, FighterSnapshot } from "@emberheir/sim";
import {
  Application,
  BlurFilter,
  Container,
  FillGradient,
  Graphics,
  Mesh,
  MeshGeometry,
  RenderTexture,
  type Renderer,
  Shader,
  Sprite,
  UniformGroup,
} from "pixi.js";
import { Fx } from "../fx";
import { BAR_FRAGMENT, GAUGE_VERTEX, ORB_FRAGMENT } from "./shaders";
import { BAR_H, ENEMY_TOP, ENEMY_W, ORB_R, type HudLayout, hudLayout } from "./layout";

/**
 * The Diablo-style battle HUD drawn in PixiJS: the bar body, the Life and Heat orbs (liquid
 * shader in glass with a bronze frame, bubbles and embers) and the enemy's liquid Life bar.
 * The DOM layer on top carries slots, numbers and tooltips. Looks only: reads snapshots.
 */

type Rgb = readonly [number, number, number];

const hex = (c: number): Rgb => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

const LIFE_COLORS = { deep: hex(0x2e0205), bright: hex(0xd0161e), light: hex(0xff7a64) };
const HEAT_COLORS = { deep: hex(0x4a1003), bright: hex(0xff6a12), light: hex(0xffd77a) };
const ENEMY_COLORS = { deep: hex(0x2a0306), bright: hex(0xb8141a), light: hex(0xff8a5a) };

/** Height of the enemy plate drawn behind the DOM enemy frame. */
export const ENEMY_PLATE_H = 124;

const approach = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));

/** One liquid gauge: its shader uniforms and the eased values that drive them. */
class Gauge {
  /** The gauge on screen: the shader renders into a texture of bounded size (cheap at 4K). */
  readonly view: Sprite;
  private readonly mesh: Mesh<MeshGeometry, Shader>;
  private readonly target: RenderTexture;
  private readonly u: UniformGroup;
  /** Targets from the latest snapshot. */
  fill = 1;
  shield = 0;
  threshold = -1;
  ready = 0;
  low = 0;
  stun = 0;
  /** Eased values on screen. */
  private shown = { fill: 1, trail: 1, shield: 0, low: 0, stun: 0, ready: 0 };
  private trailHold = 0;
  slosh = 0;
  flash = 0;
  glow = 0;

  constructor(
    private readonly renderer: Renderer,
    kind: "orb" | "bar",
    w: number,
    h: number,
    colors: { deep: Rgb; bright: Rgb; light: Rgb },
    notch = false,
  ) {
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, w, 0, w, h, 0, h]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    this.u = new UniformGroup({
      uTime: { value: 0, type: "f32" },
      uFill: { value: 1, type: "f32" },
      uTrail: { value: 1, type: "f32" },
      uShield: { value: 0, type: "f32" },
      uSlosh: { value: 0, type: "f32" },
      uFlash: { value: 0, type: "f32" },
      uGlow: { value: 0, type: "f32" },
      uLow: { value: 0, type: "f32" },
      uThreshold: { value: -1, type: "f32" },
      uReady: { value: 0, type: "f32" },
      uStun: { value: 0, type: "f32" },
      uDeep: { value: new Float32Array(colors.deep), type: "vec3<f32>" },
      uBright: { value: new Float32Array(colors.bright), type: "vec3<f32>" },
      uLight: { value: new Float32Array(colors.light), type: "vec3<f32>" },
      uAspect: { value: w / h, type: "f32" },
      uNotch: { value: notch ? 1 : 0, type: "f32" },
    });
    const shader = Shader.from({
      gl: { vertex: GAUGE_VERTEX, fragment: kind === "orb" ? ORB_FRAGMENT : BAR_FRAGMENT },
      resources: { gauge: this.u },
    });
    this.mesh = new Mesh({ geometry, shader });
    this.target = RenderTexture.create({
      width: w,
      height: h,
      resolution: Math.min(1.5, renderer.resolution),
      antialias: false,
    });
    this.view = new Sprite(this.target);
  }

  /** Feeds the new target; drops slosh the liquid and leave a pale trail behind. */
  set(fill: number, shield: number): void {
    const f = Math.max(0, Math.min(1, fill));
    if (f < this.fill - 0.004) {
      const drop = this.fill - f;
      this.slosh = Math.min(1, this.slosh + drop * 6);
      this.flash = Math.min(1, this.flash + 0.25 + drop * 3);
      this.trailHold = 0.45;
    } else if (f > this.fill + 0.004) {
      this.glow = Math.min(1, this.glow + 0.6);
      this.slosh = Math.min(1, this.slosh + 0.2);
    }
    this.fill = f;
    this.shield = Math.max(0, Math.min(1, shield));
  }

  /** Jumps to the targets without easing (fight start, Skip). */
  snap(): void {
    this.shown.fill = this.fill;
    this.shown.trail = this.fill;
    this.shown.shield = this.shield;
  }

  update(time: number, dt: number): void {
    const s = this.shown;
    s.fill = approach(s.fill, this.fill, 14, dt);
    if (this.trailHold > 0) this.trailHold -= dt;
    else s.trail = approach(s.trail, s.fill, 3.2, dt);
    if (s.trail < s.fill) s.trail = s.fill;
    s.shield = approach(s.shield, this.shield, 8, dt);
    s.low = approach(s.low, this.low, 4, dt);
    s.stun = approach(s.stun, this.stun, 10, dt);
    s.ready = approach(s.ready, this.ready, 10, dt);
    this.slosh = Math.max(0, this.slosh - dt * 0.9);
    this.flash = Math.max(0, this.flash - dt * 3.5);
    this.glow = Math.max(0, this.glow - dt * 1.6);
    const u = this.u.uniforms;
    u.uTime = time;
    u.uFill = s.fill;
    u.uTrail = s.trail;
    u.uShield = s.shield;
    u.uSlosh = this.slosh;
    u.uFlash = this.flash;
    u.uGlow = this.glow;
    u.uLow = s.low;
    u.uThreshold = this.threshold;
    u.uReady = s.ready;
    u.uStun = s.stun;
    this.renderer.render({ container: this.mesh, target: this.target, clear: true });
  }

  destroy(): void {
    this.mesh.destroy();
    this.target.destroy(true);
  }

  /** Current liquid level as shown (0..1). */
  get level(): number {
    return this.shown.fill;
  }
}

/** A bronze-framed glass orb with its own particles behind the glass. */
class Orb {
  readonly root = new Container();
  readonly gauge: Gauge;
  readonly fx: Fx;
  private readonly glow = new Graphics();
  private spawn = 0;

  constructor(
    app: Application,
    private readonly kind: "life" | "heat",
  ) {
    const R = ORB_R;
    const colors = kind === "life" ? LIFE_COLORS : HEAT_COLORS;
    const gem = kind === "life" ? 0xff3a3a : 0xffa53a;

    // Soft drop shadow (BlurFilter) so the orb sits on the bar, not on top of it.
    const shadow = new Graphics().circle(0, 6, R + 22).fill({ color: 0x000000, alpha: 0.7 });
    shadow.filters = [new BlurFilter({ strength: 14, quality: 3 })];

    // Back glow in additive light, stronger with more Heat (and when a skill is ready).
    this.glow.circle(0, 0, R * 1.55).fill(
      new FillGradient({
        type: "radial",
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0,
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
          {
            offset: 0.45,
            color: `rgba(${colors.bright.map((c) => Math.round(c * 255)).join(",")},0.55)`,
          },
          { offset: 1, color: "rgba(0,0,0,0)" },
        ],
        textureSpace: "local",
      }),
    );
    this.glow.blendMode = "add";
    this.glow.alpha = 0;

    this.gauge = new Gauge(app.renderer, "orb", R * 2, R * 2, colors);
    this.gauge.view.position.set(-R, -R);

    // Particles live behind the glass: masked to the globe.
    this.fx = new Fx(app.renderer);
    const inner = new Container();
    const mask = new Graphics().circle(0, 0, R - 2).fill(0xffffff);
    inner.addChild(this.fx.back, this.fx.front, mask);
    inner.mask = mask;

    // Static parts render once into a texture: the blur and the frame are not redrawn per frame.
    const frame = drawFrame(R, gem);
    const cache = { resolution: app.renderer.resolution, antialias: true };
    shadow.cacheAsTexture(cache);
    frame.cacheAsTexture(cache);
    this.root.addChild(shadow, this.glow, this.gauge.view, inner, frame);
  }

  update(time: number, dt: number, hot: number): void {
    this.gauge.update(time, dt);
    this.glow.alpha = approach(this.glow.alpha, hot, 3, dt);
    const R = ORB_R;
    const level = this.gauge.level;
    const surface = R - 2 * R * level;
    // Embers rise through the Heat, little bubbles through the Life.
    this.spawn += dt * (this.kind === "heat" ? 6 + 26 * level : 3 + 7 * level);
    while (this.spawn >= 1 && level > 0.02) {
      this.spawn -= 1;
      const r = this.fx.rand;
      const y = r.range(Math.max(surface + 6, -R + 8), R - 10);
      const half = Math.sqrt(Math.max(0, R * R - y * y)) - 8;
      this.fx.burst(
        this.kind === "heat"
          ? {
              x: r.range(-half, half),
              y,
              count: 1,
              color: [0xffd27a, 0xff8a2a, 0xffb84a],
              angle: [-Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35],
              speed: [25, 70],
              life: [0.5, 1.2],
              size: [5, 11],
              wobble: 6,
            }
          : {
              x: r.range(-half, half),
              y,
              count: 1,
              color: [0xff9a8a, 0xffc4b8],
              angle: [-Math.PI / 2 - 0.1, -Math.PI / 2 + 0.1],
              speed: [14, 34],
              life: [0.8, 1.6],
              size: [4, 8],
              endSize: 0.9,
              alpha: 0.45,
              wobble: 4,
            },
      );
    }
    this.fx.update(dt);
  }

  /** A puff of particles in the orb (heal, Barrier, Heat spent). */
  puff(colors: readonly number[], count: number, up = true): void {
    const R = ORB_R;
    const surface = R - 2 * R * this.gauge.level;
    this.fx.burst({
      x: 0,
      y: Math.max(-R + 20, surface),
      count,
      color: colors,
      spreadX: R * 0.6,
      spreadY: 10,
      angle: up ? [-Math.PI / 2 - 0.8, -Math.PI / 2 + 0.8] : [0, Math.PI * 2],
      speed: [40, 140],
      life: [0.35, 0.8],
      size: [6, 14],
      drag: 0.3,
    });
  }
}

/** The bronze ring around an orb: bevels, studs and a gem crest on top. */
function drawFrame(R: number, gem: number): Container {
  const root = new Container();
  const bronze = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: "#f0c77a" },
      { offset: 0.35, color: "#a8732e" },
      { offset: 0.7, color: "#5e3a16" },
      { offset: 1, color: "#2a180a" },
    ],
    textureSpace: "local",
  });
  const ring = new Graphics()
    .circle(0, 0, R + 15)
    .fill(bronze)
    .circle(0, 0, R)
    .cut()
    .circle(0, 0, R + 15)
    .stroke({ color: 0x140c06, width: 3 })
    .circle(0, 0, R + 1)
    .stroke({ color: 0x140c06, width: 3 })
    .circle(0, 0, R + 8)
    .stroke({ color: 0xffe3a8, width: 1.2, alpha: 0.35 });
  // Studs around the ring.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const x = Math.cos(a) * (R + 8);
    const y = Math.sin(a) * (R + 8);
    ring
      .circle(x, y, 3.2)
      .fill(0x2a180a)
      .circle(x - 0.8, y - 0.8, 1.6)
      .fill(0xffe0a0);
  }
  // Crest: three spikes and a gem.
  const top = -R - 12;
  ring
    .poly([
      -34,
      top + 8,
      -20,
      top - 14,
      -8,
      top + 2,
      0,
      top - 24,
      8,
      top + 2,
      20,
      top - 14,
      34,
      top + 8,
    ])
    .fill(bronze)
    .stroke({ color: 0x140c06, width: 2.5 });
  ring.circle(0, top - 2, 10).fill(0x140c06);
  ring.circle(0, top - 2, 7.5).fill(gem);
  ring.circle(-2.5, top - 4.5, 2.5).fill({ color: 0xffffff, alpha: 0.75 });
  const gemGlow = new Graphics().circle(0, top - 2, 16).fill({ color: gem, alpha: 0.35 });
  gemGlow.blendMode = "add";
  root.addChild(ring, gemGlow);
  return root;
}

function cssColor(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export class HudScene {
  private app: Application | null = null;
  private destroyed = false;
  private layoutInfo: HudLayout = hudLayout(1600, 900);
  private readonly root = new Container();
  private readonly bar = new Container();
  private readonly enemyPlate = new Container();
  private life: Orb | null = null;
  private heat: Orb | null = null;
  private enemy: Gauge | null = null;
  private time = 0;
  private hot = 0;
  private last: FightSnapshot | null = null;
  private prevHero: FighterSnapshot | null = null;
  paused = false;

  /** Stage size in stage pixels (the arena canvas covers the whole stage). */
  layout(w: number, h: number): void {
    this.layoutInfo = hudLayout(w, h);
    if (this.app) this.place();
  }

  /** Builds the HUD into `layer` (the arena's screen-fixed overlay) and runs on its ticker. */
  attach(app: Application, layer: Container, boss: boolean): void {
    if (this.destroyed) return;
    this.app = app;
    this.life = new Orb(app, "life");
    this.heat = new Orb(app, "heat");
    this.enemy = new Gauge(app.renderer, "bar", 600, 24, ENEMY_COLORS, boss);
    this.root.addChild(this.enemyPlate, this.bar, this.life.root, this.heat.root);
    layer.addChild(this.root);
    this.place();
    if (this.last) this.onSnapshot(this.last, true);
    app.ticker.add(this.onTick);
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.ticker?.remove(this.onTick);
    this.life?.fx.destroy();
    this.heat?.fx.destroy();
    this.life?.gauge.destroy();
    this.heat?.gauge.destroy();
    this.enemy?.destroy();
    this.root.destroy({ children: true });
    this.app = null;
  }

  private readonly onTick = (ticker: { deltaMS: number }) => this.tick(ticker.deltaMS / 1000);

  /** Redraws the bar body and enemy plate for the current stage size. */
  private place(): void {
    const L = this.layoutInfo;
    const { w, h, cx } = L;
    this.life?.root.position.set(L.lifeOrb.x, L.lifeOrb.y);
    this.heat?.root.position.set(L.heatOrb.x, L.heatOrb.y);

    // The bar is a dark well in both modes (like the item slots), trimmed in the theme's edge.
    const panel = cssColor("--slot-bg", "#32271d");
    const edge = cssColor("--edge", "#6a4a2c");
    this.bar.removeChildren().forEach((c) => c.destroy());
    const top = h - BAR_H;
    const x0 = L.lifeOrb.x;
    const x1 = L.heatOrb.x;
    // Fade the arena into the bar.
    const fade = new Graphics().rect(0, top - 70, w, 70).fill(
      new FillGradient({
        type: "linear",
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: "rgba(0,0,0,0)" },
          { offset: 1, color: "rgba(0,0,0,0.55)" },
        ],
        textureSpace: "local",
      }),
    );
    const body = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: panel },
        { offset: 1, color: "#0c0a08" },
      ],
      textureSpace: "local",
    });
    const g = new Graphics();
    // The raised center plate behind the skill bar (classic ARPG silhouette).
    const lip = 22;
    const half = Math.min(400, (x1 - x0) / 2 - 150);
    g.poly([
      x0,
      top,
      cx - half - 40,
      top,
      cx - half,
      top - lip,
      cx + half,
      top - lip,
      cx + half + 40,
      top,
      x1,
      top,
      x1,
      h,
      x0,
      h,
    ])
      .fill(body)
      .stroke({ color: edge, width: 4, alignment: 1 });
    // Bronze trim along the top edge.
    g.poly(
      [
        x0,
        top + 3,
        cx - half - 39,
        top + 3,
        cx - half + 1,
        top - lip + 3,
        cx + half - 1,
        top - lip + 3,
        cx + half + 39,
        top + 3,
        x1,
        top + 3,
      ],
      false,
    ).stroke({
      color: 0xd9a55a,
      width: 1.5,
      alpha: 0.55,
    });
    // Rivets along the bar.
    for (let x = x0 + 120; x < x1 - 110; x += 90) {
      if (x > cx - half - 50 && x < cx + half + 50) continue;
      g.circle(x, top + 12, 3)
        .fill(0x1a120a)
        .circle(x - 0.7, top + 11.3, 1.4)
        .fill(0xd9a55a);
    }
    this.bar.addChild(fade, g);
    const cache = { resolution: this.app?.renderer.resolution ?? 1, antialias: true };
    this.bar.cacheAsTexture(cache);
    this.bar.updateCacheTexture();

    // The enemy plate: dark glass panel with a bronze rim, behind the DOM enemy frame.
    this.enemyPlate.removeChildren().forEach((c) => c.destroy());
    const px = cx - ENEMY_W / 2;
    const plate = new Graphics()
      .roundRect(px, ENEMY_TOP, ENEMY_W, ENEMY_PLATE_H, 10)
      .fill({ color: 0x0e0b09, alpha: 0.72 })
      .stroke({ color: edge, width: 2 })
      .roundRect(px + 4, ENEMY_TOP + 4, ENEMY_W - 8, ENEMY_PLATE_H - 8, 7)
      .stroke({ color: 0xd9a55a, width: 1, alpha: 0.3 });
    const E = L.enemyLife;
    const tube = new Graphics()
      .roundRect(E.x - 4, E.y - 4, E.w + 8, E.h + 8, 6)
      .fill(0x140c06)
      .stroke({ color: 0xb98a4a, width: 2 });
    this.enemyPlate.addChild(plate, tube);
    if (this.enemy) {
      this.enemy.view.position.set(E.x, E.y);
      this.enemyPlate.addChild(this.enemy.view);
    }
  }

  onSnapshot(snap: FightSnapshot, jump = false): void {
    this.last = snap;
    if (!this.life || !this.heat || !this.enemy) return;
    const hero = snap.hero;
    const prev = this.prevHero;
    this.life.gauge.set(hero.life / hero.maxLife, hero.barrier / hero.maxLife);
    this.life.gauge.low = hero.life / hero.maxLife < 0.3 && !snap.over ? 1 : 0;
    this.heat.gauge.set(hero.heat / hero.maxHeat, 0);
    const next = hero.rotation[hero.nextSlot];
    this.heat.gauge.threshold = next ? next.threshold / hero.maxHeat : -1;
    const ready = next !== undefined && hero.heat >= next.threshold;
    this.heat.gauge.ready = ready ? 1 : 0;
    this.hot = 0.25 + 0.5 * (hero.heat / hero.maxHeat) + (ready ? 0.35 : 0);

    if (prev && !jump) this.effects(prev, hero);
    this.prevHero = hero;

    const enemy = snap.enemy;
    this.enemy.set(enemy.life / enemy.maxLife, enemy.barrier / enemy.maxLife);
    this.enemy.stun = enemy.stunned > 0 ? 1 : 0;
    if (jump) {
      this.life.gauge.snap();
      this.heat.gauge.snap();
      this.enemy.snap();
    }
  }

  /** Particle accents from what changed since the last snapshot. */
  private effects(prev: FighterSnapshot, hero: FighterSnapshot): void {
    if (!this.life || !this.heat) return;
    if (hero.life > prev.life + 0.5) this.life.puff([0x4fe08a, 0xa8ffc8], 16);
    if (hero.barrier > prev.barrier + 0.5) this.life.puff([0x9fe0ff, 0xffffff], 20, false);
    // Heat spent on a skill: a flare out of the orb.
    if (hero.heat < prev.heat - 8) this.heat.puff([0xffd27a, 0xff8a2a, 0xffffff], 26);
  }

  private tick(dt: number): void {
    if (this.paused) dt = 0;
    this.time += dt;
    this.life?.update(this.time, dt, 0.25);
    this.heat?.update(this.time, dt, this.hot);
    this.enemy?.update(this.time, dt);
  }
}
