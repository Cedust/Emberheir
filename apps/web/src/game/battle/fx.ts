import {
  Container,
  Graphics,
  Particle,
  ParticleContainer,
  type Renderer,
  type Texture,
} from "pixi.js";

/**
 * Arena effects: particles (sparks, ailments, act weather) and short-lived shapes (slashes,
 * rings, projectiles, lightning). Looks only: nothing here feeds back into the fight.
 */

/** Small seeded PRNG for looks (the arena never touches the fight's Rng). */
export class Jitter {
  private s: number;
  constructor(seed = 0x9e3779b9) {
    this.s = seed >>> 0;
  }
  /** 0..1 */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)] as T;
  }
}

type Range = readonly [number, number];
export type Layer = "back" | "front";

export interface Burst {
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly color: number | readonly number[];
  /** Spawn area around (x, y). */
  readonly spreadX?: number;
  readonly spreadY?: number;
  /** Pixels per second. */
  readonly speed?: Range;
  /** Radians; 0 = right, -π/2 = up. */
  readonly angle?: Range;
  readonly life?: Range;
  /** Diameter in pixels at birth. */
  readonly size?: Range;
  /** Size at death relative to birth. Default 0.2. */
  readonly endSize?: number;
  readonly gravity?: number;
  /** Velocity kept per second (0..1). Default 1 (no drag). */
  readonly drag?: number;
  /** "glow": soft additive light; "bit": solid flake (ash, ice, leaves, blood). */
  readonly kind?: "glow" | "bit";
  /** Stretch along the flight direction (sparks, rain). */
  readonly stretch?: number;
  readonly spin?: number;
  /** Sideways sway in pixels (snow, bubbles). */
  readonly wobble?: number;
  readonly alpha?: number;
  readonly layer?: Layer;
}

interface Mote {
  readonly p: Particle;
  readonly box: ParticleContainer;
  vx: number;
  vy: number;
  readonly gravity: number;
  readonly drag: number;
  age: number;
  readonly life: number;
  readonly size0: number;
  readonly size1: number;
  readonly alpha0: number;
  readonly stretch: number;
  readonly spin: number;
  readonly wobble: number;
  readonly phase: number;
  baseX: number;
}

interface Shape {
  readonly g: Container;
  age: number;
  readonly life: number;
  readonly step: (t: number, dt: number) => void;
  readonly done?: () => void;
}

/** Texture size in pixels; particle scale = wanted size / TEX. */
const TEX = 32;
/** Above this many live particles new ones are dropped (weak GPUs, Skip floods). */
const CAP = 1400;

export class Fx {
  readonly back = new Container();
  readonly front = new Container();
  private readonly boxes: Record<Layer, { glow: ParticleContainer; bit: ParticleContainer }>;
  private readonly glowTex: Texture;
  private readonly bitTex: Texture;
  private motes: Mote[] = [];
  private shapes: Shape[] = [];
  readonly rand = new Jitter();

  constructor(renderer: Renderer) {
    const glow = new Graphics();
    for (let i = 0; i < 10; i++) {
      glow
        .circle(TEX / 2, TEX / 2, (TEX / 2) * (1 - i / 10))
        .fill({ color: 0xffffff, alpha: 0.16 });
    }
    this.glowTex = renderer.generateTexture({ target: glow, resolution: 2 });
    const bit = new Graphics()
      .poly([TEX / 2, 2, TEX - 6, TEX / 2, TEX / 2, TEX - 2, 6, TEX / 2])
      .fill(0xffffff);
    this.bitTex = renderer.generateTexture({ target: bit, resolution: 2 });
    glow.destroy();
    bit.destroy();
    const make = (blend: "add" | "normal") => {
      const box = new ParticleContainer({
        dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
      });
      box.blendMode = blend;
      return box;
    };
    this.boxes = {
      back: { bit: make("normal"), glow: make("add") },
      front: { bit: make("normal"), glow: make("add") },
    };
    this.back.addChild(this.boxes.back.bit, this.boxes.back.glow);
    this.front.addChild(this.boxes.front.bit, this.boxes.front.glow);
  }

  get count(): number {
    return this.motes.length;
  }

  burst(b: Burst): void {
    const r = this.rand;
    const kind = b.kind ?? "glow";
    const box = this.boxes[b.layer ?? "front"][kind];
    const tex = kind === "glow" ? this.glowTex : this.bitTex;
    for (let i = 0; i < b.count && this.motes.length < CAP; i++) {
      const angle = r.range(...(b.angle ?? [0, Math.PI * 2]));
      const speed = r.range(...(b.speed ?? [60, 160]));
      const size = r.range(...(b.size ?? [8, 14]));
      const color = typeof b.color === "number" ? b.color : r.pick(b.color);
      const x = b.x + (b.spreadX ? r.range(-b.spreadX, b.spreadX) : 0);
      const p = new Particle({
        texture: tex,
        x,
        y: b.y + (b.spreadY ? r.range(-b.spreadY, b.spreadY) : 0),
        anchorX: 0.5,
        anchorY: 0.5,
        tint: color,
        alpha: b.alpha ?? 1,
        rotation: kind === "bit" ? r.range(0, Math.PI) : 0,
      });
      box.particleChildren.push(p);
      this.motes.push({
        p,
        box,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: b.gravity ?? 0,
        drag: b.drag ?? 1,
        age: 0,
        life: r.range(...(b.life ?? [0.4, 0.8])),
        size0: size / TEX,
        size1: (size / TEX) * (b.endSize ?? 0.2),
        alpha0: b.alpha ?? 1,
        stretch: b.stretch ?? 0,
        spin: b.spin ? r.range(-b.spin, b.spin) : 0,
        wobble: b.wobble ?? 0,
        phase: r.range(0, Math.PI * 2),
        baseX: x,
      });
    }
  }

  /** A shape that lives `life` seconds; `step` gets 0..1 and the frame time. */
  shape(
    g: Container,
    life: number,
    step: Shape["step"],
    layer: Layer = "front",
    done?: () => void,
  ) {
    (layer === "front" ? this.front : this.back).addChild(g);
    this.shapes.push({ g, age: 0, life, step, ...(done ? { done } : {}) });
    step(0, 0);
  }

  /** An expanding, fading ring (casts, barriers, crits). */
  ring(
    x: number,
    y: number,
    color: number,
    r0: number,
    r1: number,
    life = 0.35,
    width = 6,
    /** Height relative to width: flat on the ground by default, 1 for a round ring. */
    squash = 0.42,
  ) {
    const g = new Graphics();
    g.blendMode = "add";
    this.shape(g, life, (t) => {
      const ease = 1 - (1 - t) * (1 - t);
      g.clear()
        .ellipse(x, y, r0 + (r1 - r0) * ease, (r0 + (r1 - r0) * ease) * squash)
        .stroke({ color, width: width * (1 - t) + 1, alpha: 1 - t });
    });
  }

  /** A crescent slash across the target. */
  slash(x: number, y: number, dir: 1 | -1, color: number, big: boolean) {
    const g = new Graphics();
    g.blendMode = "add";
    const tilt = this.rand.range(-0.5, 0.5);
    const r = big ? 120 : 90;
    g.position.set(x, y);
    g.rotation = tilt;
    g.scale.x = dir;
    this.shape(g, big ? 0.26 : 0.2, (t) => {
      const sweep = Math.min(1, t * 2.4);
      const a0 = -1.2;
      const a1 = a0 + 2.4 * sweep;
      g.clear();
      for (const [w, alpha, c] of [
        [big ? 30 : 20, 0.4, color],
        [big ? 11 : 7, 0.95, 0xffffff],
      ] as const) {
        // Each stroke starts at the arc's own first point: without the moveTo, Pixi starts the
        // second arc at an invalid (NaN) point, which a GPU draws as a line to the top left.
        g.moveTo(-r * 0.55 + Math.cos(a0) * r, Math.sin(a0) * r)
          .arc(-r * 0.55, 0, r, a0, a1)
          .stroke({ color: c, width: w * (1 - t * 0.6), alpha });
      }
      g.alpha = 1 - Math.max(0, t - 0.4) / 0.6;
    });
  }

  /** A jagged lightning bolt between two points. */
  bolt(x0: number, y0: number, x1: number, y1: number, color: number) {
    const g = new Graphics();
    g.blendMode = "add";
    const points: number[] = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const off = i === 0 || i === n ? 0 : this.rand.range(-34, 34);
      points.push(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + off);
    }
    this.shape(g, 0.22, (t) => {
      g.clear();
      g.poly(points, false).stroke({ color, width: 14, alpha: 0.35 * (1 - t) });
      g.poly(points, false).stroke({ color: 0xffffff, width: 4, alpha: 1 - t });
    });
  }

  /**
   * A projectile from (x0, y0) to (x1, y1). Arrows fly on a slight arc; orbs leave a glowing
   * trail. `arrive` runs on impact.
   */
  projectile(
    style: "arrow" | "orb" | "fall",
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: number,
    arrive: () => void,
  ) {
    const g = new Graphics();
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = style === "fall" ? 0.32 : style === "arrow" ? 0.2 : Math.min(0.32, dist / 2600);
    if (style === "arrow") {
      // Points right; the fletching trails behind.
      g.moveTo(-40, 0).lineTo(24, 0).stroke({ color: 0xe8e2d6, width: 5 });
      g.poly([40, 0, 22, -9, 22, 9]).fill(0xc9c2b8).stroke({ color: 0x2a1f17, width: 2 });
      g.poly([-26, 0, -44, -11, -38, 0, -44, 11])
        .fill(0xe0314b)
        .stroke({ color: 0x2a1f17, width: 2 });
    } else {
      g.blendMode = "add";
      g.circle(0, 0, style === "fall" ? 34 : 22).fill({ color, alpha: 0.35 });
      g.circle(0, 0, style === "fall" ? 20 : 12).fill({ color: 0xffffff, alpha: 0.9 });
    }
    const lift = style === "arrow" ? dist * 0.12 : 0;
    let last = { ...from };
    this.shape(
      g,
      dur,
      (t) => {
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * lift;
        g.position.set(x, y);
        if (style === "arrow") g.rotation = Math.atan2(y - last.y, x - last.x || 1);
        if (style !== "arrow" && t > 0) {
          this.burst({
            x,
            y,
            count: style === "fall" ? 3 : 2,
            color,
            spreadX: 6,
            spreadY: 6,
            speed: [10, 40],
            life: [0.18, 0.35],
            size: style === "fall" ? [18, 30] : [12, 20],
          });
        }
        last = { x, y };
      },
      "front",
      arrive,
    );
  }

  update(dt: number): void {
    const keep = new Map<ParticleContainer, Particle[]>();
    const alive: Mote[] = [];
    for (const m of this.motes) {
      m.age += dt;
      const t = m.age / m.life;
      if (t >= 1) continue;
      const drag = m.drag === 1 ? 1 : Math.pow(m.drag, dt);
      m.vx *= drag;
      m.vy = m.vy * drag + m.gravity * dt;
      m.baseX += m.vx * dt;
      m.p.y += m.vy * dt;
      m.p.x = m.baseX + (m.wobble ? Math.sin(m.age * 3 + m.phase) * m.wobble : 0);
      const size = m.size0 + (m.size1 - m.size0) * t;
      if (m.stretch) {
        const v = Math.hypot(m.vx, m.vy);
        m.p.rotation = Math.atan2(m.vy, m.vx);
        m.p.scaleX = size * (1 + (v / 100) * m.stretch);
        m.p.scaleY = size * 0.55;
      } else {
        m.p.rotation += m.spin * dt;
        m.p.scaleX = size;
        m.p.scaleY = size;
      }
      m.p.alpha = m.alpha0 * (t < 0.1 ? t / 0.1 : t > 0.6 ? (1 - t) / 0.4 : 1);
      alive.push(m);
      const list = keep.get(m.box);
      if (list) list.push(m.p);
      else keep.set(m.box, [m.p]);
    }
    this.motes = alive;
    for (const layer of Object.values(this.boxes)) {
      for (const box of [layer.glow, layer.bit]) {
        box.particleChildren = keep.get(box) ?? [];
        box.update();
      }
    }
    const shapes = this.shapes;
    const finished: Shape[] = [];
    this.shapes = [];
    for (const s of shapes) {
      s.age += dt;
      const t = Math.min(1, s.age / s.life);
      s.step(t, dt);
      if (t < 1) this.shapes.push(s);
      else finished.push(s);
    }
    // Impacts may start new shapes, so they run after the list is rebuilt.
    for (const s of finished) {
      s.g.destroy();
      s.done?.();
    }
  }

  destroy(): void {
    this.glowTex.destroy(true);
    this.bitTex.destroy(true);
  }
}
