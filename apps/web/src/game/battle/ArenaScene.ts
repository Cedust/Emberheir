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
  drawGate,
  drawGround,
  type Gate,
  loadGateTextures,
  drawStars,
  drawWildfireEdge,
  drawWildfireGlow,
} from "./arenaProps";
import { type EnemyLook, drawEnemy, loadEnemyTexture } from "./enemyArt";
import { backdropFeet, loadBackdrop, placeBackdrop } from "./arenaBackdrop";
import { Fx } from "./fx";
import { silhouetteGlow } from "./glow";
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
  /** A red glow around the enemy while it winds up a Heavy Attack. */
  private telegraph: Container | null = null;
  private fx: Fx | null = null;
  private weather: Weather | null = null;
  private floaters: Floaters | null = null;
  private later: Later[] = [];
  private clock = 0;
  private telegraphOn = false;
  /** Draws the enemy's art again, for the glows baked from its outline. */
  private enemyArt: (() => Container) | null = null;
  private tint: Record<Side, number> = { hero: 0xffffff, enemy: 0xffffff };
  private ailments: Record<Side, readonly string[]> = { hero: [], enemy: [] };
  /** The hero's Class Trait as the last snapshot showed it, and its drawing. */
  private trait: FighterSnapshot["trait"] | undefined;
  private traitGfx: Graphics | null = null;
  private traitCarry = 0;
  private ailmentCarry: Record<Side, number> = { hero: 0, enemy: 0 };
  /** The Gatekeeper's painted stone gate, its fire bowls and the glowing Ember sigils. */
  private gate: Gate | null = null;
  private gateCarry = 0;
  /** Wildfire: the burning ground glow and the flame edges at both sides of the view. */
  private wildfire: { glow: Graphics; edges: readonly [Container, Container] } | null = null;
  /**
   * The Ashen Harvester's phase (1 full Life, 2 below 66 %, 3 below 33 %, as in the sim): each one
   * wears the bosses it echoes. Phase 2 burns and frosts over, phase 3 cracks into the void.
   */
  private harvester: { phase: 1 | 2 | 3; carry: number; glow: Container | null } | null = null;
  /** The ember glowing in a carried Ember Focus. */
  private offHandGlow: Container | null = null;
  /** A hovering Grimoire, bobbing over the fist. */
  private offHandFloat: Container | null = null;
  /** Damage over time adds up per fighter and ailment for half a second, then floats as one. */
  private dots = new Map<string, number>();
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

  /** Kaelen's straw man: hits throw straw (`straw`). */
  private strawMan = false;

  /** Screen-fixed layer above the arena (the battle HUD): no camera shake or zoom. */
  readonly overlay = new Container();

  /** Resolves with the Pixi app, or null without WebGL or when destroyed meanwhile. */
  async mount(host: HTMLElement, hero: HeroLook, enemy: EnemyLook): Promise<Application | null> {
    this.strawMan = enemy.id === "training-dummy";
    const [heir, weapon, painting, backdrop, gate] = await Promise.all([
      loadHeirTextures(),
      loadHeroWeapon(hero),
      loadEnemyTexture(enemy),
      loadBackdrop(enemy.act),
      enemy.gate ? loadGateTextures() : null,
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
    if (gate) {
      this.gate = drawGate(gate);
      this.world.addChildAt(this.gate.root, 1);
    }
    if (enemy.wildfire) {
      const edges = [drawWildfireEdge(enemy.wildfire), drawWildfireEdge(enemy.wildfire)] as const;
      edges[1].scale.x = -1;
      this.wildfire = { glow: drawWildfireGlow(), edges };
      this.world.addChildAt(this.wildfire.glow, 1);
      this.world.addChildAt(edges[0], 2);
      this.world.addChildAt(edges[1], 2);
    }

    this.hero = makeFigure("hero", drawHero(hero, heir, weapon), HERO_X);
    this.heroArm = this.hero.body.getChildByLabel("heir-arm", true) ?? null;
    this.heroFist = this.hero.body.getChildByLabel("heir-fist", true) ?? null;
    const ranged =
      this.hero.body.getChildByLabel("heir-ranged", true) ??
      this.hero.body.getChildByLabel("heir-caster", true);
    this.heroRanged = ranged instanceof RangedHold || ranged instanceof CasterHold ? ranged : null;
    this.heroShot = this.hero.body.getChildByLabel("heir-shot", true) ?? null;
    this.offHandGlow = this.hero.body.getChildByLabel("off-hand-glow", true) ?? null;
    this.offHandFloat = this.hero.body.getChildByLabel("off-hand-float", true) ?? null;
    this.enemy = makeFigure("enemy", drawEnemy(enemy, painting), ENEMY_X);
    // Glows around the enemy's outline are baked only when first needed (a Heavy Attack
    // wind-up, a Harvester phase): baking a blurred silhouette costs a moment.
    this.enemyArt = () => drawEnemy(enemy, painting);
    if (enemy.id === "ashen-harvester") this.harvester = { phase: 1, carry: 0, glow: null };
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
          if (e.via === "twin") {
            // Twin Cast: the cast repeats, a violet ring around the caster names it.
            const c = this.center(e.side);
            this.fx?.ring(c.x, c.y, 0xd2b8ff, 40, 150, 0.3, 5, 0.9);
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
          // The Heavy Attack cap held part of the blow back: embers flare on the target.
          if (e.capped) {
            const target = e.side === "hero" ? "enemy" : "hero";
            const c = this.center(target);
            this.fx?.burst({
              x: c.x,
              y: c.y,
              count: 8,
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
          if (this.showNumbers) this.dot(e.side, e.ailment, e.damage);
          break;
        case "ailment":
          this.ailmentPuff(e.side, e.ailment, 6);
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
          // The Rime Warden's Shatter: its broken ice flies at the foe. Its Chill half
          // (no hit follows) only shows the Chill puff.
          if (e.name === "Shatter") {
            if (events[i + 1]?.type === "hit") this.shatter(e.side);
            break;
          }
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
    if (this.telegraphOn && !this.telegraph) {
      // The Heavy Attack wind-up: a red glow around the enemy's own outline. It stands behind
      // the figure, so it is wider than the figure: a halo shows around it.
      this.telegraph = this.enemyGlow(26, 1.12);
      if (this.telegraph) this.telegraph.tint = 0xff2a12;
    }
    this.trait = snapshot.over ? undefined : snapshot.hero.trait;
    for (const side of ["hero", "enemy"] as const) {
      const list = snapshot[side].ailments;
      const first = list[0];
      this.tint[side] = first ? (AILMENT_TINT[first.type] ?? 0xffffff) : 0xffffff;
      // Sunder: armor flakes keep falling while it lasts.
      const sunder = snapshot[side].curses.some((c) => c.armor) ? ["sunder"] : [];
      this.ailments[side] = [...list.map((a) => a.type), ...sunder];
      if (snapshot[side].life <= 0) this.ailments[side] = [];
    }
    const h = this.harvester;
    if (h && snapshot.enemy.life > 0) {
      const share = snapshot.enemy.life / Math.max(1, snapshot.enemy.maxLife);
      const phase = share < 0.33 ? 3 : share < 0.66 ? 2 : 1;
      if (phase !== 1 && phase > h.phase) {
        h.phase = phase;
        // The echoes it wears glow around it from phase 2 on (fire and rime, then void).
        h.glow ??= this.enemyGlow(28, 1.1);
        if (h.glow) h.glow.tint = phase === 2 ? 0xff7a2a : 0xa35cff;
        this.harvesterPhase(phase);
      }
    }
  }

  /** A glow baked from the enemy's outline, behind the figure, still dark. */
  private enemyGlow(blur: number, scale: number): Container | null {
    if (!this.enemy || !this.enemyArt) return null;
    const glow = silhouetteGlow(this.enemyArt(), blur);
    glow.scale.set(scale);
    glow.alpha = 0;
    this.enemy.body.addChildAt(glow, 0);
    return glow;
  }

  /** The Harvester enters a new phase: its cloak flares, ash falls, the camera jolts. */
  private harvesterPhase(phase: 2 | 3): void {
    const fx = this.fx;
    if (!fx) return;
    const c = this.center("enemy");
    const [main, second] = phase === 2 ? [0xff8a1f, 0x9fe0ff] : [0xa35cff, 0xffe14d];
    fx.ring(c.x, c.y - 60, 0xffffff, 40, 260, 0.5, 8, 1);
    fx.ring(c.x, c.y - 60, main, 30, 320, 0.8, 10, 1);
    fx.ring(ENEMY_X, GROUND_Y, second, 20, 260, 0.9, 7);
    fx.burst({
      x: c.x,
      y: c.y - 80,
      count: this.motion ? 46 : 16,
      color: [main, second, 0xd8d4cc],
      spreadX: 140,
      spreadY: 200,
      angle: [RISE - 1.2, RISE + 1.2],
      speed: [60, 240],
      life: [0.6, 1.3],
      size: [8, 16],
      drag: 0.5,
    });
    if (phase === 3 && this.motion) {
      for (let i = 0; i < 3; i++) {
        const x = c.x + (i - 1) * 110;
        this.wait(0.08 * i, () => this.fx?.bolt(x, this.view().top, x + 20, c.y - 120, 0xd2b8ff));
      }
    }
    this.shake(0.5);
  }

  /**
   * Between phase changes the Harvester wears its echoes: a glow around it breathes (fire and
   * rime, then void), a few sparks of them drift up.
   */
  private drawHarvester(dt: number): void {
    const h = this.harvester;
    const fx = this.fx;
    if (!h || h.phase === 1 || !fx || !this.enemy || this.enemy.root.alpha !== 1) return;
    if (h.glow) h.glow.alpha = 0.8 + (this.motion ? 0.2 * Math.sin(this.clock * 1.8) : 0);
    h.carry += 5 * dt;
    for (; h.carry >= 1; h.carry--) {
      const fire = fx.rand.next() < 0.6;
      fx.burst({
        x: ENEMY_X + fx.rand.range(-130, 130),
        y: GROUND_Y - fx.rand.range(40, 420),
        count: 1,
        color:
          h.phase === 2
            ? fire
              ? [0xff6a2b, 0xffb13b]
              : [0xbfe8ff, 0xffffff]
            : fire
              ? [0xa35cff, 0x6a3a9a]
              : [0xffe14d, 0xd2b8ff],
        spreadX: 10,
        spreadY: 10,
        angle: [RISE - 0.4, RISE + 0.4],
        speed: [30, 90],
        life: [0.8, 1.4],
        size: [8, 14],
        endSize: 0.1,
      });
    }
  }

  /**
   * The Class Trait in the arena (klassengeruest-v1.md 2): an ember aura that grows with Fury,
   * the Overcharge sparks circling the Emberseer, and Hunter's Mark as a sight over the enemy.
   */
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

  /**
   * A rare Breakpoint Perk (`PERK_FX`): a ring in its colour and its name. Barrier Burst also
   * scatters its broken ward; Titan and Undying shake. The common ones fire on almost every hit
   * and show nothing.
   */
  private perk(owner: Side, perk: PerkId): void {
    const look = PERK_FX[perk];
    if (!look) return;
    const side: Side = look.on === "self" ? owner : owner === "hero" ? "enemy" : "hero";
    const c = this.center(side);
    const color = [...look.color];
    const main = color[0] ?? 0xffffff;
    this.fx?.ring(c.x, c.y, main, 40, 150, 0.4, 6, 1);
    if (perk === "barrierBurst") {
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
    }
    if (perk === "titan" || perk === "undying") this.shake(0.35);
    this.float(owner, getPerk(perk).name, main, false, 0.8);
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
        this.fx?.ring(c.x, c.y, tint, 200, 20, 0.3, 10, 1);
        this.wait(0.28, () => {
          this.fx?.ring(c.x, c.y, 0xffffff, 20, 260, 0.4, 12, 1);
          this.fx?.burst({
            x: c.x,
            y: c.y,
            count: 24,
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

  /** A broken Ice Barrier bursts into shards that fly at the foe. */
  private shatter(side: Side): void {
    const fx = this.fx;
    if (!fx) return;
    const from = this.center(side);
    const to = this.center(side === "hero" ? "enemy" : "hero");
    const toward = Math.atan2(to.y - from.y, to.x - from.x);
    fx.ring(from.x, from.y, 0xe8f4ff, 50, 230, 0.4, 9, 1);
    fx.burst({
      x: from.x,
      y: from.y,
      count: 26,
      kind: "bit",
      color: [0xb8e4ff, 0xffffff, 0x6ab8f0],
      spreadY: 80,
      angle: [toward - 0.35, toward + 0.35],
      speed: [520, 900],
      gravity: 300,
      life: [0.35, 0.6],
      size: [7, 14],
      stretch: 0.8,
      spin: 12,
    });
    fx.burst({
      x: from.x,
      y: from.y,
      count: 14,
      color: [0x9fe0ff, 0xe8f4ff],
      spreadX: 40,
      spreadY: 60,
      angle: [0, Math.PI * 2],
      speed: [60, 180],
      life: [0.4, 0.8],
      size: [14, 26],
      drag: 0.3,
    });
    this.float(side, "Shatter", 0x9fe0ff, false, 0.8);
    this.shake(0.25);
  }

  private shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private hitStop(seconds: number): void {
    if (this.speed !== 1 || this.freezeCooldown > 0) return;
    this.freeze = Math.max(this.freeze, seconds);
    this.freezeCooldown = 0.35;
  }

  /** Signature looks of the weapon Innates and their Skill Tree stand-ins (klassen-v2.md). */
  /** Kaelen's Training Dummy: straw and splinters fly off with every hit. */
  private straw(at: { x: number; y: number }, away: number, big: boolean): void {
    this.fx?.burst({
      x: at.x,
      y: at.y,
      count: big ? 26 : 10,
      kind: "bit",
      color: [0xe8c872, 0xd4a84a, 0xb8863a, 0xf2dc9a],
      spreadY: 50,
      angle: [away - 1.2, away + 1.2],
      speed: [120, big ? 520 : 340],
      gravity: 620,
      life: [0.6, 1.2],
      size: [7, 14],
      stretch: 0.8,
      spin: 10,
      wobble: 30,
      drag: 0.4,
    });
  }

  private signature(source: string, at: { x: number; y: number }, away: number): void {
    const fx = this.fx;
    if (!fx) return;
    switch (source) {
      case "Ember Lunge":
        // Kaelen sparring: his blade carries the Hearthfire, embers trail the lunge.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 12,
          color: [0xffb13b, 0xff8a1f, 0xffe9a8],
          spreadX: 40,
          spreadY: 24,
          angle: [away - 0.6, away + 0.6],
          speed: [200, 520],
          life: [0.3, 0.7],
          size: [8, 16],
          drag: 0.1,
          gravity: -120,
        });
        fx.ring(at.x, at.y, 0xff8a1f, 20, 120, 0.3, 6, 1);
        break;
      case "Crushing Blow":
        // Armor plates crack off: Sunder.
        fx.burst({
          x: at.x,
          y: at.y,
          count: 10,
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
        // Ice shards burst out of the foe.
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
        this.hitStop(0.05);
        break;
      case "Skull Crack":
        // The blow lands on the head: a bright ring there, nothing on the ground.
        fx.ring(at.x, at.y - 120, 0xffe14d, 20, 120, 0.4, 7, 1);
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
        case "shards":
          // The Rime Warden's Shatter: `shatter` sends the shards, the blow lands as they arrive.
          this.wait(0.25, land);
          break;
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
      count: big ? 18 : 8,
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
    this.signature(e.source, at, away);
    if (target === "enemy" && this.strawMan) this.straw(at, away, big);
    // No rings on a hit (Timo 2026-11-02): Block, Deflect, Crit and Mighty Hit show in the
    // number (its mark, colour and size), a big hit also in shake and hit-stop.
    // A Deflect: the victim half-dodges.
    if (e.deflected) victim.dodge = Math.max(victim.dodge, 0.5);
    if (big) {
      this.shake(heavy ? 0.7 : 0.35);
      this.hitStop(heavy ? 0.12 : 0.06);
    } else {
      this.shake(0.06);
    }
    if (this.showNumbers) {
      const text = `${e.damage.toLocaleString("en-US")}${e.crit ? "!" : ""}${e.mighty ? " ⚒" : ""}`;
      // Crits float orange, Mighty Hits dark orange-red, both big and tilted.
      const tone = e.mighty
        ? (DAMAGE_COLORS.mighty ?? color)
        : e.crit
          ? (DAMAGE_COLORS.crit ?? color)
          : color;
      const label = e.blocked ? `${text} ⛨` : e.deflected ? `${text} ↺` : text;
      this.float(target, label, tone, e.crit || e.mighty === true);
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

  /** A damage tick: ticks of one ailment add up for half a second and float as one number. */
  private dot(side: Side, ailment: string, damage: number): void {
    const key = `${side}:${ailment}`;
    const sum = this.dots.get(key);
    this.dots.set(key, (sum ?? 0) + damage);
    if (sum !== undefined) return;
    this.wait(0.5, () => {
      const total = this.dots.get(key) ?? 0;
      this.dots.delete(key);
      if (total > 0)
        this.float(side, String(total), DAMAGE_COLORS[ailment] ?? 0xffffff, false, 0.75);
    });
  }

  private ailmentPuff(side: Side, ailment: string, count: number): void {
    const style = AILMENT_FX[ailment];
    if (!style || !this.fx) return;
    const c = this.center(side);
    this.fx.burst({ ...style, x: c.x, y: c.y + 20, count });
  }

  /** The Gatekeeper fell: its arch breaks, the fires go out in a rain of stone and sparks. */
  private breakGate(gate: Gate): void {
    if (gate.broken.visible) return;
    gate.whole.visible = false;
    gate.broken.visible = true;
    gate.sigil.visible = false;
    gate.light.visible = false;
    // The arch comes down between the pillars.
    this.fx?.burst({
      x: gate.whole.x + gate.whole.width / 2,
      y: gate.whole.y + gate.whole.height * 0.12,
      count: 36,
      kind: "bit",
      color: [0x5e5750, 0x8a8178, 0x3a332d],
      spreadX: 160,
      spreadY: 20,
      angle: [RISE - 1.4, RISE + 1.4],
      speed: [20, 120],
      life: [0.9, 1.6],
      size: [10, 20],
      gravity: 700,
      spin: 4,
    });
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
      color,
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
    this.drawTrait(dt);
    if (this.telegraph) {
      const pulse = this.motion ? 0.25 * Math.sin(this.clock * 9) : 0;
      const target = this.telegraphOn ? 0.75 + pulse : 0;
      this.telegraph.alpha += (target - this.telegraph.alpha) * Math.min(1, dt * 12);
    }
    // Ailment particles while an ailment lasts (4 per second each).
    for (const side of ["hero", "enemy"] as const) {
      const list = this.ailments[side];
      if (!list.length) continue;
      const due2 = this.ailmentCarry[side] + 4 * dt;
      const n = Math.floor(due2);
      this.ailmentCarry[side] = due2 - n;
      for (let i = 0; i < n; i++) for (const a of list) this.ailmentPuff(side, a, 1);
    }
    this.drawHarvester(dt);
    // The Gatekeeper's gate: the fire bowls burn, the sigil glows while the keeper stands.
    if (this.gate && !this.gate.broken.visible) {
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
    // Wildfire: the ground glow breathes, the flame edges stand at both sides of the view and
    // flicker.
    if (this.wildfire) {
      const { glow, edges } = this.wildfire;
      const view = this.view();
      edges[0].x = view.left;
      edges[1].x = view.right;
      edges.forEach((edge, i) => {
        const t = this.clock + i * 1.7;
        const flick = this.motion ? Math.sin(t * 7.3) * 0.6 + Math.sin(t * 3.1) * 0.4 : 0;
        edge.alpha = 0.85 + 0.15 * flick;
        edge.scale.y = 1 + 0.07 * flick;
      });
      if (this.motion) glow.alpha = 0.8 + 0.2 * Math.sin(this.clock * 1.7);
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
    if (this.fx) {
      this.weather?.update(this.fx, this.view(), dt);
      this.fx.update(dt);
    }
    this.moveCamera(dt);
    this.floaters?.update(dt);
  }
}
