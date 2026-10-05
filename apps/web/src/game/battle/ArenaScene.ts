import type { CombatEvent, FightSnapshot, Side } from "@emberheir/sim";
import { Application, Container, Graphics, Text } from "pixi.js";
import { Fx, type Burst } from "./fx";
import { Weather, type View } from "./weather";

/**
 * The PixiJS arena (battle-view-v1.md section 2): ground, two placeholder figures, floating
 * damage numbers and hit effects. It only reads fight events and snapshots; the fight itself
 * runs in the sim. Placeholder art until the painted sprites exist.
 */

export interface HeroLook {
  readonly heroClass: "warrior" | "reaver" | "hunter" | "sorcerer" | "warlock";
  readonly weapon: "sword" | "wand" | "axe" | "dagger" | "bow" | "crossbow" | "mace" | "staff";
  readonly offHand: "shield" | "focus" | "quiver" | "talisman" | "grimoire" | null;
}

export interface EnemyLook {
  readonly archetype: string;
  readonly boss: boolean;
  readonly elite: boolean;
  /** Act number: every act dresses its enemies in its own colors. */
  readonly act: number;
  /** The Ember Thief carries a glowing sack of loot on its back. */
  readonly thief?: boolean;
  /** Ranged enemies shoot or cast across the arena instead of striking up close. */
  readonly ranged?: boolean;
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
  trigger: 0xf0b44c,
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

/** How a hit travels: melee slashes, arrows, glowing orbs, lightning, meteors or a burst on the target. */
type Delivery = "slash" | "arrow" | "orb" | "bolt" | "fall" | "nova";

/** Skills with their own look; everything else follows the attacker's weapon. */
const SKILL_FX: Record<string, Delivery> = {
  Firebolt: "orb",
  "Ice Lance": "orb",
  "Chain Lightning": "bolt",
  Meteor: "fall",
  "Toxic Burst": "nova",
  Immolate: "nova",
  Corrupt: "orb",
  "Soul Harvest": "nova",
  "Piercing Shot": "arrow",
  "Barbed Arrow": "arrow",
  "Heavy Bolt": "arrow",
  "Plague Cloud": "nova",
  Thunderstrike: "bolt",
  "Frost Nova": "nova",
  Inferno: "nova",
  "Void Rift": "nova",
  "Void Bolt": "orb",
  "Cinder Spit": "orb",
  "Blight Spit": "orb",
  "Rot Spray": "orb",
  Fireball: "orb",
  Eruption: "fall",
  "Ice Bolt": "orb",
  Avalanche: "fall",
  "Forked Bolt": "bolt",
  Thunderclap: "nova",
  "Void Lance": "orb",
  Hex: "orb",
  Consume: "nova",
  "Rift Snap": "nova",
  "Soul Reap": "nova",
  Ashfall: "fall",
  "The Last Harvest": "nova",
  "Flame Dash": "slash",
  "Arc Dash": "slash",
  Pounce: "slash",
};

const RISE = -Math.PI / 2;
const FALL = Math.PI / 2;

/** Particles that hang around a fighter while an ailment is on them. */
const AILMENT_FX: Record<string, Omit<Burst, "x" | "y" | "count">> = {
  sunder: {
    kind: "bit",
    color: [0x8a8f96, 0x5e5750],
    angle: [FALL - 0.4, FALL + 0.4],
    speed: [30, 80],
    gravity: 400,
    life: [0.4, 0.8],
    size: [5, 9],
    spin: 5,
    spreadX: 60,
    spreadY: 100,
  },
  burn: {
    color: [0xff6a2b, 0xffb13b],
    angle: [RISE - 0.3, RISE + 0.3],
    speed: [60, 130],
    life: [0.4, 0.8],
    size: [19, 35],
    spreadX: 50,
    spreadY: 90,
    wobble: 8,
  },
  chill: {
    kind: "bit",
    color: [0x9fe0ff, 0xffffff],
    angle: [FALL - 0.6, FALL + 0.6],
    speed: [20, 50],
    life: [0.8, 1.4],
    size: [10, 16],
    endSize: 0.6,
    spin: 3,
    spreadX: 60,
    spreadY: 120,
  },
  shock: {
    color: 0xffe14d,
    speed: [250, 450],
    life: [0.08, 0.16],
    size: [8, 13],
    stretch: 0.8,
    spreadX: 50,
    spreadY: 110,
  },
  bleed: {
    kind: "bit",
    color: [0xe0314b, 0xa01830],
    angle: [FALL - 0.3, FALL + 0.3],
    speed: [20, 60],
    gravity: 500,
    life: [0.5, 0.8],
    size: [10, 14],
    endSize: 0.7,
    spreadX: 40,
    spreadY: 70,
  },
  poison: {
    color: [0xb5d82c, 0xd8f06a],
    angle: [RISE - 0.4, RISE + 0.4],
    speed: [20, 50],
    life: [0.8, 1.3],
    size: [13, 22],
    wobble: 10,
    spreadX: 55,
    spreadY: 110,
  },
  corruption: {
    color: [0xa35cff, 0x6a3ad8],
    angle: [RISE - 0.6, RISE + 0.6],
    speed: [15, 40],
    life: [0.8, 1.4],
    size: [19, 35],
    endSize: 0.05,
    spreadX: 60,
    spreadY: 120,
  },
};

/** A Skip resolves the rest of the fight at once: then only the outcome is shown. */
const FLOOD = 40;

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
  readonly stars: Graphics;
  /** Animation timers, 1 → 0. */
  lunge: number;
  flash: number;
  knock: number;
  recoil: number;
  dodge: number;
  /** Seconds of Stun left. */
  stun: number;
}

interface Later {
  at: number;
  readonly run: () => void;
}

type HitEvent = Extract<CombatEvent, { type: "hit" }>;

export class ArenaScene {
  private app: Application | null = null;
  private readonly camera = new Container();
  private readonly world = new Container();
  private size = { w: W, h: H, resolution: 1 };
  private destroyed = false;
  private hero: Figure | null = null;
  private enemy: Figure | null = null;
  private telegraph: Graphics | null = null;
  private aura: Graphics | null = null;
  private fx: Fx | null = null;
  private weather: Weather | null = null;
  private floaters: Floater[] = [];
  private later: Later[] = [];
  private clock = 0;
  private telegraphOn = false;
  private tint: Record<Side, number> = { hero: 0xffffff, enemy: 0xffffff };
  private ailments: Record<Side, readonly string[]> = { hero: [], enemy: [] };
  private ailmentCarry: Record<Side, number> = { hero: 0, enemy: 0 };
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

  /**
   * Host size in stage pixels and device pixels per stage pixel. The drawing stays centered
   * and sits on the bottom edge; the canvas renders at the screen's real pixel density. `scale`
   * shrinks the whole arena (class select preview).
   */
  layout(w: number, h: number, resolution: number, scale = 1): void {
    this.size = { w, h, resolution };
    this.world.scale.set(scale);
    this.world.position.set((w - W * scale) / 2, h - H * scale);
    this.app?.renderer.resize(w, h, resolution);
  }

  /** True during a hit-stop: the fight loop holds the sim for that moment. */
  get frozen(): boolean {
    return this.freeze > 0;
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
    app.stage.addChild(this.camera);
    this.camera.addChild(this.world);

    const fx = new Fx(app.renderer);
    this.fx = fx;
    this.weather = new Weather(enemy.act);
    this.ranged = { hero: RANGED_WEAPONS.has(hero.weapon), enemy: enemy.ranged ?? false };

    this.world.addChild(drawGround(), fx.back);
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
    this.world.addChild(this.hero.root, this.enemy.root, fx.front);

    // The weather is already falling when the fight opens.
    for (let i = 0; i < 80; i++) {
      this.weather.update(fx, this.view(), 0.1);
      fx.update(0.1);
    }

    app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  destroy(): void {
    this.destroyed = true;
    this.fx?.destroy();
    this.app?.destroy(true, { children: true });
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
          break;
        case "telegraph":
          this.heavy = { skill: e.skill, until: this.clock + e.windup + 1 };
          break;
        case "hit": {
          const key = `${e.side}:${e.source}`;
          const n = order.get(key) ?? 0;
          order.set(key, n + 1);
          this.hit(e, n * 0.08);
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
    for (const side of ["hero", "enemy"] as const) {
      const list = snapshot[side].ailments;
      const first = list[0];
      this.tint[side] = first ? (AILMENT_TINT[first.type] ?? 0xffffff) : 0xffffff;
      // Sunder: armor flakes keep falling while it lasts.
      const sunder = snapshot[side].curses.some((c) => c.armor) ? ["sunder"] : [];
      this.ailments[side] = [...list.map((a) => a.type), ...sunder];
      if (snapshot[side].life <= 0) this.ailments[side] = [];
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
          this.wait(0.08, land);
          break;
        case "arrow":
        case "orb":
          attacker.recoil = 1;
          fx.projectile(how, from, to, color, land);
          break;
        case "bolt":
          attacker.recoil = 1;
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
    const big = e.crit || heavy;
    const at = this.center(target);
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
    if (big) {
      fx.ring(at.x, at.y, 0xffffff, 30, heavy ? 220 : 160, 0.3, 8, 1);
      this.shake(heavy ? 0.7 : 0.35);
      this.hitStop(heavy ? 0.12 : 0.06);
    } else {
      this.shake(0.06);
    }
    if (this.showNumbers) {
      const text = `${e.damage.toLocaleString("en-US")}${e.crit ? "!" : ""}`;
      this.float(target, e.blocked ? `${text} ⛨` : text, color, e.crit);
    }
  }

  private ailmentPuff(side: Side, ailment: string, count: number): void {
    const style = AILMENT_FX[ailment];
    if (!style || !this.fx) return;
    const c = this.center(side);
    this.fx.burst({ ...style, x: c.x, y: c.y + 20, count });
  }

  private die(side: Side): void {
    const f = this.figure(side);
    if (f.root.alpha < 1) return;
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
      f.dodge = Math.max(0, f.dodge - dt * 4);
      f.stun = Math.max(0, f.stun - dt);
      f.body.x =
        dir * 26 * Math.sin(f.lunge * Math.PI) -
        dir * 30 * f.knock -
        dir * 14 * Math.sin(f.recoil * Math.PI) -
        dir * 60 * Math.sin(f.dodge * Math.PI);
      f.body.y = Math.sin(this.clock * 2.2 + (f.side === "hero" ? 0 : 1.3)) * 3;
      f.body.rotation = -dir * 0.06 * Math.min(1, f.knock);
      const base = this.tint[f.side];
      f.body.tint = f.flash > 0.5 ? 0xff7777 : base;
      f.stars.visible = f.stun > 0;
      if (f.stun > 0) drawStars(f.stars, this.clock, f.side === "hero" ? -440 : -470);
    }
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
    if (this.fx) {
      this.weather?.update(this.fx, this.view(), dt);
      this.fx.update(dt);
    }
    this.moveCamera(dt);
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

const RANGED_WEAPONS = new Set<HeroLook["weapon"]>(["wand", "staff", "bow", "crossbow"]);

/** Three little stars circling a stunned fighter's head. */
function drawStars(g: Graphics, clock: number, y: number): void {
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
  const stars = new Graphics();
  stars.visible = false;
  root.addChild(shadow, body, stars);
  return { root, body, side, stars, lunge: 0, flash: 0, knock: 0, recoil: 0, dodge: 0, stun: 0 };
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

/** Colors per class (klassen-v2.md section 9): body, chest piece, headgear. */
const CLASS_LOOKS: Record<HeroLook["heroClass"], { body: number; chest: number; head: number }> = {
  warrior: { body: 0x8a2f1c, chest: 0x9aa0a6, head: 0x8a8f96 },
  reaver: { body: 0x4a3426, chest: 0x8a1c24, head: 0x2e2119 },
  hunter: { body: 0x3f5a2e, chest: 0x7a5a34, head: 0x34492a },
  sorcerer: { body: 0x2d4a8a, chest: 0xe8c07a, head: 0xe8c07a },
  warlock: { body: 0x4b2a66, chest: 0x6a6460, head: 0x5a5450 },
};

/**
 * The Heir: one body per class, weapon and off hand change (klassen-v2.md section 9).
 * Origin = feet. Placeholder art until the painted characters exist.
 */
function drawHero(look: HeroLook): Container {
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  const colors = CLASS_LOOKS[look.heroClass];
  // Off hand and back gear sit behind the body.
  if (look.offHand === "quiver" || look.heroClass === "hunter") {
    c.addChild(
      new Graphics().roundRect(-78, -330, 30, 120, 8).fill(0x7a5a34).stroke(line),
      new Graphics()
        .poly([-74, -330, -70, -360, -66, -330])
        .poly([-62, -330, -58, -366, -54, -330])
        .fill(0xe8e2d6)
        .stroke({ color: INK, width: 2 }),
    );
  }
  if (look.offHand === "shield") {
    c.addChild(new Graphics().ellipse(-56, -240, 38, 50).fill(0x6b5a3e).stroke(line));
    c.addChild(new Graphics().ellipse(-56, -240, 20, 28).fill(0xc9a063).stroke(line));
  } else if (look.offHand === "focus") {
    c.addChild(new Graphics().circle(-62, -250, 22).fill(0x5b8cff).stroke(line));
  } else if (look.offHand === "talisman") {
    c.addChild(
      new Graphics().moveTo(-60, -300).lineTo(-60, -262).stroke({ color: INK, width: 2 }),
      new Graphics().poly([-60, -262, -46, -244, -60, -222, -74, -244]).fill(0xc8202f).stroke(line),
    );
  } else if (look.offHand === "grimoire") {
    c.addChild(
      new Graphics().roundRect(-92, -272, 52, 62, 6).fill(0x3a1f4a).stroke(line),
      new Graphics().circle(-66, -241, 10).fill(0xa35cff).stroke({ color: INK, width: 2 }),
    );
  }
  // Robes reach the ground and flare; armor and leather stop at the knees.
  const robe = look.heroClass === "sorcerer" || look.heroClass === "warlock";
  const body = new Graphics();
  if (robe) {
    body
      .moveTo(-84, -150)
      .bezierCurveTo(-70, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 70, -260, 84, -150);
    if (look.heroClass === "warlock") {
      // A tattered hem.
      for (let x = 84; x > -84; x -= 24) body.lineTo(x - 12, -164).lineTo(x - 24, -150);
    }
    body.closePath();
  } else {
    body
      .moveTo(-70, -150)
      .bezierCurveTo(-74, -260, -50, -320, 0, -320)
      .bezierCurveTo(50, -320, 74, -260, 70, -150)
      .closePath();
  }
  c.addChild(body.fill(colors.body).stroke(line));
  if (look.heroClass === "reaver") {
    // A blood-red sash across the chest.
    c.addChild(
      new Graphics()
        .poly([-50, -300, -30, -310, 52, -186, 32, -176])
        .fill(colors.chest)
        .stroke(line),
    );
  } else if (robe) {
    c.addChild(
      new Graphics().rect(-8, -300, 16, 150).fill(colors.chest).stroke(line),
      new Graphics()
        .circle(-40, -200, 4)
        .circle(40, -220, 4)
        .circle(-30, -260, 3)
        .fill({ color: look.heroClass === "sorcerer" ? 0xff8a3a : 0xa35cff, alpha: 0.9 }),
    );
  } else {
    c.addChild(
      new Graphics()
        .moveTo(-30, -150)
        .lineTo(-22, -240)
        .lineTo(22, -240)
        .lineTo(30, -150)
        .fill(colors.chest)
        .stroke(line),
    );
  }
  c.addChild(new Graphics().circle(0, -364, 40).fill(0xf0c9a0).stroke(line));
  const head = new Graphics();
  switch (look.heroClass) {
    case "warrior":
      // Half helm with a nose guard.
      head
        .moveTo(-44, -360)
        .bezierCurveTo(-44, -414, 44, -414, 44, -360)
        .lineTo(-44, -360)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      head.rect(-4, -362, 8, 22).fill(colors.head).stroke({ color: INK, width: 2 });
      break;
    case "reaver":
    case "hunter":
      // A hood that frames the face.
      head
        .moveTo(-48, -330)
        .bezierCurveTo(-60, -400, -20, -420, 0, -420)
        .bezierCurveTo(20, -420, 60, -400, 48, -330)
        .bezierCurveTo(40, -380, -40, -380, -48, -330)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      break;
    case "sorcerer":
      // Hair and a high gold collar.
      head
        .moveTo(-40, -372)
        .bezierCurveTo(-34, -400, 34, -400, 40, -372)
        .lineTo(40, -364)
        .bezierCurveTo(30, -384, -30, -384, -40, -364)
        .closePath()
        .fill(0x3a2a1e)
        .stroke(line);
      head
        .moveTo(-52, -310)
        .quadraticCurveTo(-62, -350, -44, -372)
        .moveTo(52, -310)
        .quadraticCurveTo(62, -350, 44, -372)
        .stroke({ color: colors.head, width: 7, cap: "round" });
      break;
    case "warlock":
      // A pointed, sagging hood.
      head
        .moveTo(-50, -330)
        .bezierCurveTo(-60, -390, -30, -420, 10, -446)
        .bezierCurveTo(30, -410, 60, -390, 50, -330)
        .bezierCurveTo(40, -380, -40, -380, -50, -330)
        .closePath()
        .fill(colors.head)
        .stroke(line);
      break;
  }
  c.addChild(head);
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
