import type { MasteryNode, MasteryPath } from "@emberheir/sim";
import {
  Application,
  BlurFilter,
  Container,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
  Graphics,
  Rectangle,
  Sprite,
  Text,
} from "pixi.js";
import type { HeatBehavior } from "@emberheir/sim";
import { Fx } from "../battle/fx";
import { type WeaponLook, drawWeapon } from "./weaponArt";
import { type SceneWeaponArt, drawPaintedWeapon, paintedTextures } from "./paintedWeapon";
import { FramePacer, wantsAntialias } from "../pixiPacing";
import { arcPath } from "../pixiShapes";
import {
  FORGE_BED,
  FORGE_BOWLS,
  FORGE_BOWL_Y,
  FORGE_LID,
  type ForgeTextures,
  forgeTextures,
} from "./forgeArt";

/**
 * Weapon Mastery as a PixiJS scene, the "anatomy" look (waffe-als-system-v1.md): the painted
 * weapon lies diagonally over the forge. Refine hotspots sit on its parts, the three paths grow
 * out of it as engraved filigree that lights up, the Heat Forms burn in the forge below, the
 * Innate Forms are rune seals beside the blade, the Keystones are gem sockets around the pommel.
 * The weapon glows hotter with every grade; a worn Echo wraps it in its aura. Looks only:
 * learning goes through the React side and the sim.
 */

export type MasteryNodeState = "unavailable" | "available" | "learned" | "locked";

export interface MasteryNodeView {
  readonly node: MasteryNode;
  readonly state: MasteryNodeState;
  readonly pending: boolean;
  readonly selected: boolean;
  readonly ranks: number;
  readonly maxRanks: number;
}

export interface MasteryView {
  readonly weaponId: string;
  readonly paths: readonly MasteryPath[];
  readonly nodes: readonly MasteryNodeView[];
  /** Weapon grade index 0..4 (Crude..Exalted). */
  readonly grade: number;
  /** Colour of the weapon's element (crystal, orb, tip light). */
  readonly accent: number;
  /** The build on the painted weapon: grade metal, path runes, Keystone shape. */
  readonly look: WeaponLook;
  readonly echoColor: number | null;
  /** Pommel and tip in layout units. */
  readonly pommel: { readonly x: number; readonly y: number };
  readonly tip: { readonly x: number; readonly y: number };
  /** Mastery points are left to spend: available nodes call louder. */
  readonly pointsLeft: boolean;
}

export interface MasteryCallbacks {
  onSelect(id: string): void;
  onLearn(id: string): void;
  onHover(id: string | null, x: number, y: number): void;
}

/** Stage pixels per layout unit at zoom 1. */
const U = 62;
const PENDING = 0x4fe08a;
const KEYSTONE = 0xff8a1f;
const EMBER = 0xff8a3a;
const GOLD = 0xffd27a;
const DIM = 0x4f4842;
/** The weapon is painted this much thicker than its axis length would give. */
const ART_SCALE = 1.22;
/** Stage pixels kept free at the top for the nameplate. */
const TOP_INSET = 120;

/** Edge glow per grade: Crude, Honed, Tempered, Ascendant, Exalted. */
const GRADE_GLOW = [
  { color: 0x8a6a50, alpha: 0.12 },
  { color: 0xd0803a, alpha: 0.32 },
  { color: 0xff7a2a, alpha: 0.52 },
  { color: 0xffc04a, alpha: 0.72 },
  { color: 0xfff0c8, alpha: 0.92 },
];

export const HEAT_FORM_COLOR: Record<string, number> = {
  "heat-steady": 0xffb13b,
  "heat-cooling": 0x7fc8ff,
  "heat-warming": 0xff5a2a,
  "heat-smoldering": 0xc8402a,
};

export { ELEMENT_COLOR } from "../weaponLook";

const RADIUS: Record<MasteryNode["kind"], number> = {
  refine: 16,
  technique: 12,
  notable: 16,
  master: 21,
  keystone: 19,
  heatForm: 20,
  innateForm: 17,
};

/** Rune glyphs of the three Innate seals (line segments in a unit circle). */
const GLYPHS: readonly (readonly number[])[] = [
  [0, -0.7, 0, 0.7, -0.5, -0.2, 0.5, 0.2],
  [-0.5, -0.6, 0.5, 0.6, 0.5, -0.6, -0.5, 0.6, -0.6, 0, 0.6, 0],
  [0, -0.7, -0.55, 0.5, 0, -0.7, 0.55, 0.5, -0.4, 0.15, 0.4, 0.15],
];

interface NodeSprite {
  readonly root: Container;
  readonly g: Graphics;
  readonly flame: Graphics;
  readonly name: Text;
  /** A Heat Form's painted icon in its bowl, and the lid on a bowl that is not open yet. */
  icon?: Sprite;
  lid?: Sprite;
  view: MasteryNodeView;
}

/** Where the painted forge lies, in stage pixels; bowls sit on the Heat Form nodes. */
interface ForgeGeometry {
  readonly left: number;
  readonly top: number;
  readonly w: number;
  readonly h: number;
  /** The bowls' row (the Heat Form nodes' y). */
  readonly y: number;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export class MasteryScene {
  private app: Application | null = null;
  private destroyed = false;
  private readonly world = new Container();
  private readonly forgeBed = new Graphics();
  /** The painted forge behind the Heat Form icons, its front rims over them, lids and names on top. */
  private readonly forgeBack = new Container();
  private readonly forgeFront = new Container();
  private readonly forgeTop = new Container();
  private forgeTex: ForgeTextures | null = null;
  private forge: ForgeGeometry | null = null;
  private hoverId: string | null = null;
  private readonly filigreeGlow = new Graphics();
  /** The blurred glow baked into a texture: the blur runs on a redraw, not in every frame. */
  private readonly filigreeGlowBake = new Container();
  private readonly filigreeGlowRoom = new Graphics();
  private readonly filigree = new Graphics();
  private readonly weaponLayer = new Container();
  private readonly nodeLayer = new Container();
  private readonly labelLayer = new Container();
  private fx: Fx | null = null;
  private pacer: FramePacer | null = null;
  private art: SceneWeaponArt | null = null;
  private artKey = "";
  private echoAura: Container | null = null;
  private echoRing: Container | null = null;
  private edgeGlow: Container | null = null;
  private sprites = new Map<string, NodeSprite>();
  private labels: Text[] = [];
  private labelKey = "";
  private viewKey = "";
  private runeLight: Container | null = null;
  private view: MasteryView | null = null;
  private size = { w: 900, h: 700, resolution: 1 };
  /** Camera: world offset (stage pixels) and zoom, with targets the camera glides to. */
  private cam = { x: 0, y: 0, zoom: 1 };
  private goal = { x: 0, y: 0, zoom: 1 };
  /** The zoom that shows the whole weapon: zooming out stops a little below it. */
  private fitZoom = 1;
  private velocity = { x: 0, y: 0 };
  private drag: { x: number; y: number; moved: number; t: number } | null = null;
  /** Fingers on the canvas; two of them pinch-zoom. */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; x: number; y: number } | null = null;
  /** How far the last drag moved: a drag that ends on a node is not a click. */
  private dragged = 0;
  private shakeT = 0;
  private flash = 0;
  private lastTap = { id: "", t: 0 };
  private time = 0;
  private sparkT = 0.6;
  private emberT = 0;
  /** Particles, pulses and the gliding camera; off for prefers-reduced-motion. */
  motion = !reducedMotion();
  /** Screen shake on a learn (Settings). */
  shake = true;

  constructor(private readonly callbacks: MasteryCallbacks) {
    this.filigreeGlow.blendMode = "add";
    this.filigreeGlow.filters = [new BlurFilter({ strength: 4, quality: 2 })];
    this.filigreeGlowBake.blendMode = "add";
    this.filigreeGlowBake.addChild(this.filigreeGlowRoom, this.filigreeGlow);
    this.forgeFront.eventMode = "none";
    this.forgeTop.eventMode = "none";
    this.world.addChild(
      this.forgeBed,
      this.forgeBack,
      this.labelLayer,
      this.filigreeGlowBake,
      this.filigree,
      this.weaponLayer,
      this.nodeLayer,
      this.forgeFront,
      this.forgeTop,
    );
  }

  layout(w: number, h: number, resolution: number): void {
    this.size = { w, h, resolution };
    this.app?.renderer.resize(w, h, resolution);
    if (this.app?.stage) this.app.stage.hitArea = new Rectangle(0, 0, w, h);
    this.fit(true);
  }

  async mount(host: HTMLElement): Promise<boolean> {
    const app = new Application();
    try {
      await app.init({
        width: this.size.w,
        height: this.size.h,
        backgroundAlpha: 0,
        antialias: wantsAntialias(this.size.resolution),
        resolution: this.size.resolution,
        autoDensity: true,
      });
    } catch {
      return false;
    }
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return false;
    }
    this.app = app;
    app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(app.canvas);
    this.fx = new Fx(app.renderer);
    this.world.addChildAt(this.fx.back, 1);
    this.world.addChild(this.fx.front);
    app.stage.addChild(this.world);
    app.stage.eventMode = "static";
    app.stage.hitArea = new Rectangle(0, 0, this.size.w, this.size.h);
    app.stage.on("pointerdown", (e) => this.dragStart(e));
    app.stage.on("globalpointermove", (e) => this.dragMove(e));
    app.stage.on("pointerup", (e) => this.dragEnd(e));
    app.stage.on("pointerupoutside", (e) => this.dragEnd(e));
    app.stage.on("wheel", (e) => this.wheel(e));
    // The page must not scroll while the wheel zooms the weapon.
    app.canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    this.rebuild();
    this.fit(true);
    this.pacer = new FramePacer(app.ticker);
    app.ticker.add((t) => this.tick(t.deltaMS / 1000));
    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.fx?.destroy();
    this.app?.destroy(true, { children: true });
    this.app = null;
  }

  setView(view: MasteryView): void {
    // React renders often (hover): only redraw when something visible changed.
    const key = [
      view.weaponId,
      view.grade,
      view.accent,
      JSON.stringify(view.look),
      view.echoColor,
      view.pointsLeft,
      ...view.nodes.map((n) => `${n.state}${n.pending}${n.selected}${n.ranks}`),
    ].join("|");
    if (key === this.viewKey && this.app) return;
    this.viewKey = this.app ? key : "";
    const before = new Map(this.view?.nodes.map((n) => [n.node.id, n]) ?? []);
    const burning = (nodes: readonly MasteryNodeView[]) =>
      nodes.find((n) => n.node.kind === "heatForm" && (n.state === "learned" || n.pending));
    const oldForm = this.view && burning(this.view.nodes);
    this.view = view;
    this.rebuild();
    const newForm = burning(view.nodes);
    if (oldForm && newForm && oldForm.node.id !== newForm.node.id) {
      this.leap(oldForm.node, newForm);
    }
    for (const n of view.nodes) {
      const old = before.get(n.node.id);
      if (!old) continue;
      const lit = (v: MasteryNodeView) => v.state === "learned" || v.pending;
      if (n.ranks > old.ranks || (lit(n) && !lit(old)) || (n.pending && !old.pending)) {
        this.strike(n);
      }
    }
  }

  /** World position of a node in stage pixels (Refine hotspots sit on the painted weapon). */
  private pos(n: MasteryNode): { x: number; y: number } {
    const v = this.view;
    if (n.kind === "refine" && v && this.art) {
      const ax = v.tip.x - v.pommel.x;
      const ay = v.tip.y - v.pommel.y;
      const len = Math.hypot(ax, ay);
      // t along the weapon from the node's projection, the art's centre line as offset.
      const t =
        this.art.refineT?.[n.id] ??
        ((n.x - v.pommel.x) * ax + (n.y - v.pommel.y) * ay) / (len * len);
      const off = this.art.anchorY(t) * ART_SCALE;
      return {
        x: (v.pommel.x + ax * t) * U + (-ay / len) * off,
        y: (v.pommel.y + ay * t) * U + (ax / len) * off,
      };
    }
    return { x: n.x * U, y: n.y * U };
  }

  // --- camera --------------------------------------------------------------------------------

  /** Shows the whole weapon with all its nodes. */
  fit(instant = false): void {
    const v = this.view;
    if (!v?.nodes.length) return;
    const xs = [...v.nodes.map((n) => n.node.x), v.pommel.x, v.tip.x];
    const ys = [...v.nodes.map((n) => n.node.y), v.pommel.y, v.tip.y];
    // The painted forge and its title reach about a unit below the Heat Forms.
    const form = v.nodes.find((n) => n.node.kind === "heatForm");
    if (form) ys.push(form.node.y + 1);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs) * U - 90,
      Math.max(...xs) * U + 90,
      Math.min(...ys) * U - 70,
      Math.max(...ys) * U + 80,
    ];
    const h = this.size.h - TOP_INSET;
    const zoom = Math.min(this.size.w / (maxX - minX), h / (maxY - minY), 1.4);
    this.fitZoom = zoom;
    this.goal = {
      x: this.size.w / 2 - ((minX + maxX) / 2) * zoom,
      y: TOP_INSET + h / 2 - ((minY + maxY) / 2) * zoom,
      zoom,
    };
    if (instant || !this.motion) this.cam = { ...this.goal };
    this.applyCamera();
  }

  /** Centers a node. */
  focus(id: string, zoom = Math.max(this.goal.zoom, this.fitZoom * 1.6)): void {
    const n = this.view?.nodes.find((v) => v.node.id === id);
    if (!n) return;
    const p = this.pos(n.node);
    const z = clamp(zoom, this.minZoom(), this.maxZoom());
    this.goal = { x: this.size.w / 2 - p.x * z, y: this.size.h / 2 - p.y * z, zoom: z };
    if (!this.motion) this.cam = { ...this.goal };
  }

  zoomBy(factor: number): void {
    this.zoomAround(this.size.w / 2, this.size.h / 2, factor);
  }

  private minZoom(): number {
    return this.fitZoom * 0.7;
  }

  private maxZoom(): number {
    return Math.max(2.2, this.fitZoom * 3);
  }

  private zoomAround(sx: number, sy: number, factor: number): void {
    const zoom = clamp(this.goal.zoom * factor, this.minZoom(), this.maxZoom());
    const k = zoom / this.goal.zoom;
    this.goal = { x: sx - (sx - this.goal.x) * k, y: sy - (sy - this.goal.y) * k, zoom };
    if (!this.motion) this.cam = { ...this.goal };
  }

  private wheel(e: FederatedWheelEvent): void {
    this.zoomAround(e.global.x, e.global.y, Math.exp(-e.deltaY * 0.0015));
  }

  private dragStart(e: FederatedPointerEvent): void {
    this.touches.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.touches.size >= 2) {
      this.pinch = this.pinchOf();
      this.drag = null;
      this.dragged = 99;
      this.velocity = { x: 0, y: 0 };
      return;
    }
    this.drag = { x: e.global.x, y: e.global.y, moved: 0, t: performance.now() };
    this.dragged = 0;
    this.velocity = { x: 0, y: 0 };
  }

  private pinchOf(): { dist: number; x: number; y: number } {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return { dist: 1, x: 0, y: 0 };
    return {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }

  private dragMove(e: FederatedPointerEvent): void {
    if (this.touches.has(e.pointerId))
      this.touches.set(e.pointerId, { x: e.global.x, y: e.global.y });
    if (this.pinch && this.touches.size >= 2) {
      // Two fingers: zoom around their middle and pan with it.
      const next = this.pinchOf();
      this.goal.x += next.x - this.pinch.x;
      this.goal.y += next.y - this.pinch.y;
      this.zoomAround(next.x, next.y, next.dist / this.pinch.dist);
      this.cam = { ...this.goal };
      this.pinch = next;
      return;
    }
    if (!this.drag) return;
    const dx = e.global.x - this.drag.x;
    const dy = e.global.y - this.drag.y;
    const now = performance.now();
    const dt = Math.max(1, now - this.drag.t) / 1000;
    this.drag = {
      x: e.global.x,
      y: e.global.y,
      moved: this.drag.moved + Math.hypot(dx, dy),
      t: now,
    };
    this.goal.x += dx;
    this.goal.y += dy;
    this.cam.x += dx;
    this.cam.y += dy;
    this.velocity = { x: dx / dt, y: dy / dt };
  }

  private dragEnd(e: FederatedPointerEvent): void {
    this.touches.delete(e.pointerId);
    if (this.pinch) {
      // Lifting one finger of a pinch neither taps nor flings.
      if (this.touches.size < 2) this.pinch = null;
      this.drag = null;
      return;
    }
    this.dragged = this.drag?.moved ?? 0;
    if (this.drag && performance.now() - this.drag.t > 80) this.velocity = { x: 0, y: 0 };
    this.drag = null;
  }

  private applyCamera(): void {
    const shake =
      this.shakeT > 0 && this.shake && this.motion
        ? {
            x: Math.sin(this.time * 90) * 6 * this.shakeT * 4,
            y: Math.cos(this.time * 70) * 4 * this.shakeT * 4,
          }
        : { x: 0, y: 0 };
    this.world.position.set(this.cam.x + shake.x, this.cam.y + shake.y);
    this.world.scale.set(this.cam.zoom);
    if (this.app) {
      this.app.canvas.dataset.zoom = this.goal.zoom.toFixed(2);
      this.app.canvas.dataset.pan = `${Math.round(this.goal.x)},${Math.round(this.goal.y)}`;
    }
    // Path node names show once the view is close enough to read them.
    const close = this.cam.zoom >= this.fitZoom * 1.35;
    for (const s of this.sprites.values()) {
      const kind = s.view.node.kind;
      if (kind === "technique" || kind === "refine") s.name.visible = close || s.view.selected;
    }
  }

  // --- drawing -------------------------------------------------------------------------------

  private pathColor(n: MasteryNode): number {
    return this.view?.paths.find((p) => p.id === n.path)?.color ?? GOLD;
  }

  /** The colour a node shows in its current state. */
  private colorOf(n: MasteryNodeView): number {
    if (n.pending) return PENDING;
    const node = n.node;
    const own =
      node.kind === "keystone"
        ? KEYSTONE
        : node.kind === "heatForm"
          ? (HEAT_FORM_COLOR[node.id] ?? EMBER)
          : node.kind === "innateForm"
            ? 0xffd27a
            : node.kind === "refine"
              ? (GRADE_GLOW[this.view?.grade ?? 0]?.color ?? GOLD)
              : this.pathColor(node);
    if (n.state === "learned") return own;
    if (n.state === "available") return node.path ? own : 0xd8d4cc;
    return DIM;
  }

  private rebuild(): void {
    const v = this.view;
    if (!this.app || !v) return;
    this.drawWeapon(v);
    this.drawForge(v);
    this.drawFiligree(v);
    this.bakeFiligreeGlow();
    this.drawLabels(v);

    const seen = new Set<string>();
    for (const n of v.nodes) {
      seen.add(n.node.id);
      let s = this.sprites.get(n.node.id);
      if (!s) {
        s = this.makeSprite(n);
        this.sprites.set(n.node.id, s);
      }
      s.view = n;
      const p = this.pos(n.node);
      s.root.position.set(p.x, p.y);
      this.drawNode(s);
    }
    for (const [id, s] of this.sprites) {
      if (seen.has(id)) continue;
      if (s.name.parent !== s.root) s.name.destroy();
      s.root.destroy({ children: true });
      this.sprites.delete(id);
    }
  }

  private drawWeapon(v: MasteryView): void {
    const key = `${v.weaponId}:${v.echoColor ?? ""}:${JSON.stringify(v.look)}`;
    const ax = (v.tip.x - v.pommel.x) * U;
    const ay = (v.tip.y - v.pommel.y) * U;
    const length = Math.hypot(ax, ay);
    if (key !== this.artKey) {
      // A painted weapon draws once its painting is loaded; until then the old one stays.
      const painted = paintedTextures(v.weaponId, v.look);
      if (painted instanceof Promise) {
        void painted.then(() => {
          if (this.app && this.view) this.rebuild();
        });
        return;
      }
      this.artKey = key;
      this.weaponLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
      const art: SceneWeaponArt = painted
        ? drawPaintedWeapon(v.weaponId, length / ART_SCALE, v.look, painted)
        : drawWeapon(v.weaponId, length / ART_SCALE, v.look);
      this.art = art;
      const holder = new Container();
      holder.position.set(v.pommel.x * U, v.pommel.y * U);
      holder.rotation = Math.atan2(ay, ax);
      holder.scale.set(ART_SCALE);
      // Blurred layers are baked into textures once: the frame only moves and fades them.
      const baked = (child: Graphics | Container, blur: number): Container => {
        child.filters = [new BlurFilter({ strength: blur, quality: 3 })];
        const wrap = new Container();
        // Room for the blur: a cached texture clipped at the shape's bounds smears its edge.
        const b = child.getLocalBounds();
        const pad = blur * 4;
        const room = new Graphics()
          .rect(b.minX - pad, b.minY - pad, b.width + pad * 2, b.height + pad * 2)
          .fill({ color: 0x000000, alpha: 0.001 });
        wrap.addChild(room, child);
        wrap.cacheAsTexture(true);
        return wrap;
      };
      // Cast shadow on the forge floor.
      const silhouette = art.silhouette();
      silhouette.tint = 0x000000;
      const shadow = baked(silhouette, 10);
      shadow.alpha = 0.6;
      shadow.position.set(10, 22);
      // The worn Echo: an aura of its colour around the whole weapon, and every few seconds
      // the weapon's outline rings out of it like an echo.
      this.echoAura = null;
      this.echoRing = null;
      if (v.echoColor !== null) {
        const auraShape = art.silhouette();
        auraShape.tint = v.echoColor;
        const aura = baked(auraShape, 14);
        aura.blendMode = "add";
        const ringShape = art.silhouette();
        ringShape.tint = v.echoColor;
        const ring = new Container();
        const mid = length / ART_SCALE / 2;
        ring.pivot.set(mid, 0);
        ring.position.set(mid, 0);
        ring.addChild(baked(ringShape, 5));
        ring.blendMode = "add";
        ring.alpha = 0;
        this.echoAura = aura;
        this.echoRing = ring;
        holder.addChild(aura, ring);
      }
      art.edge.tint = (GRADE_GLOW[v.grade] ?? GRADE_GLOW[0])?.color ?? EMBER;
      const glow = baked(art.edge, 7);
      glow.blendMode = "add";
      this.edgeGlow = glow;
      // The runes of the learned paths glow in their colours.
      const runeBlur = baked(art.runeGlow, 4);
      runeBlur.blendMode = "add";
      this.runeLight = runeBlur;
      holder.addChildAt(shadow, 0);
      if (art.glowBehind) holder.addChild(glow, art.body, runeBlur);
      else holder.addChild(art.body, glow, runeBlur);
      this.weaponLayer.addChild(holder);
    }
  }

  /**
   * Timo's painted forge (forgeArt.ts) under the weapon: its four bowls sit on the Heat Form
   * nodes, which put their icons into the coals (drawNode); the chosen one burns (drawFlame).
   */
  private drawForge(v: MasteryView): void {
    const tex = forgeTextures();
    if (tex instanceof Promise) {
      void tex.then(() => {
        if (this.app && this.view) this.rebuild();
      });
      return;
    }
    if (!this.forgeTex) {
      this.forgeTex = tex;
      this.forgeBack.addChild(new Sprite(tex.forge));
      this.forgeFront.addChild(new Sprite(tex.front));
    }
    const forms = v.nodes.filter((n) => n.node.kind === "heatForm");
    const [a, b] = forms;
    if (!a || !b) return;
    // Sized so its bowls lie exactly as far apart as the Heat Form nodes.
    const w = ((b.node.x - a.node.x) * U) / ((FORGE_BOWLS[1] ?? 0) - (FORGE_BOWLS[0] ?? 0));
    const h = (w * tex.forge.height) / tex.forge.width;
    const y = a.node.y * U;
    const g = {
      left: a.node.x * U - (FORGE_BOWLS[0] ?? 0) * w,
      top: y - FORGE_BOWL_Y * h,
      w,
      h,
      y,
    };
    this.forge = g;
    for (const layer of [this.forgeBack, this.forgeFront]) {
      const sprite = layer.children[0];
      sprite?.position.set(g.left, g.top);
      sprite?.setSize(w, h);
    }
    // A soft shadow on the floor.
    this.forgeBed
      .clear()
      .ellipse(g.left + w / 2, g.top + h - 4, w / 2 + 24, 14)
      .fill({ color: 0x000000, alpha: 0.5 });
  }

  /**
   * The engraving of each path: one segment from every node to the nodes it links to (the root
   * grows out of the nearest point of the weapon), so the forks split and join again. `lit`: both
   * ends are learned (or pending).
   */
  private pathLines(v: MasteryView): {
    path: MasteryPath;
    segments: { a: { x: number; y: number }; b: { x: number; y: number }; lit: boolean }[];
    /** Lit chains from the weapon outward, for the sparks. */
    chains: { x: number; y: number }[][];
    /** The Master and the node before it (the label sits beyond them). */
    end: { x: number; y: number } | undefined;
    before: { x: number; y: number } | undefined;
  }[] {
    const on = (n: MasteryNodeView | undefined) => !!n && (n.state === "learned" || n.pending);
    return v.paths.map((path) => {
      const nodes = v.nodes.filter((n) => n.node.path === path.id);
      const byId = new Map(nodes.map((n) => [n.node.id, n]));
      const rootOf = (node: MasteryNode) => {
        const ax = v.tip.x - v.pommel.x;
        const ay = v.tip.y - v.pommel.y;
        const t = ((node.x - v.pommel.x) * ax + (node.y - v.pommel.y) * ay) / (ax * ax + ay * ay);
        return { x: (v.pommel.x + ax * t) * U, y: (v.pommel.y + ay * t) * U };
      };
      const segments: { a: { x: number; y: number }; b: { x: number; y: number }; lit: boolean }[] =
        [];
      for (const n of nodes) {
        const links = (n.node.links ?? []).map((id) => byId.get(id)).filter((l) => l);
        if (links.length === 0) {
          segments.push({ a: rootOf(n.node), b: this.pos(n.node), lit: on(n) });
        }
        for (const l of links) {
          if (!l) continue;
          segments.push({ a: this.pos(l.node), b: this.pos(n.node), lit: on(n) && on(l) });
        }
      }
      // Sparks run along the deepest lit chain.
      const chains: { x: number; y: number }[][] = [];
      const deepest = [...nodes].reverse().find((n) => on(n));
      if (deepest) {
        const chain = [this.pos(deepest.node)];
        let at: MasteryNodeView | undefined = deepest;
        while (at) {
          const prev: MasteryNodeView | undefined = (at.node.links ?? [])
            .map((id) => byId.get(id))
            .find((l) => on(l));
          if (!prev) {
            chain.unshift(rootOf(at.node));
            break;
          }
          chain.unshift(this.pos(prev.node));
          at = prev;
        }
        chains.push(chain);
      }
      const master = nodes.find((n) => n.node.kind === "master")?.node;
      const before = [...nodes].reverse().find((n) => n.node.kind === "technique")?.node;
      return {
        path,
        segments,
        chains,
        end: master ? this.pos(master) : undefined,
        before: before ? this.pos(before) : undefined,
      };
    });
  }

  private bakeFiligreeGlow(): void {
    const bake = this.filigreeGlowBake;
    bake.cacheAsTexture(false);
    // Room for the blur: a texture clipped at the lines' own bounds would cut its soft edge.
    const b = this.filigreeGlow.getLocalBounds();
    const pad = 20;
    this.filigreeGlowRoom
      .clear()
      .rect(b.minX - pad, b.minY - pad, b.width + pad * 2, b.height + pad * 2)
      .fill({ color: 0x000000, alpha: 0.001 });
    bake.cacheAsTexture({ resolution: this.app?.renderer.resolution ?? 1, antialias: true });
  }

  private drawFiligree(v: MasteryView): void {
    const g = this.filigree.clear();
    const glow = this.filigreeGlow.clear();
    const curve = (
      target: Graphics,
      pts: { x: number; y: number }[],
      from: number,
      to: number,
      bow = 0,
    ) => {
      const a = pts[from];
      if (!a) return;
      target.moveTo(a.x, a.y);
      for (let i = from + 1; i <= to; i++) {
        const p = pts[i];
        const prev = pts[i - 1];
        if (!p || !prev) continue;
        // A soft bow on every segment, alternating sides like a vine.
        const mx = (prev.x + p.x) / 2;
        const my = (prev.y + p.y) / 2;
        const side = (i + bow) % 2 === 0 ? 1 : -1;
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        target.quadraticCurveTo(mx - dy * 0.18 * side, my + dx * 0.18 * side, p.x, p.y);
      }
    };
    for (const { path, segments } of this.pathLines(v)) {
      segments.forEach(({ a, b, lit }, i) => {
        const pts = [a, b];
        // The engraving groove, then the metal line in it.
        curve(g, pts, 0, 1, i);
        g.stroke({ color: 0x0c0806, width: 8, alpha: 0.9, cap: "round" });
        curve(g, pts, 0, 1, i);
        g.stroke({ color: path.color, width: 2, alpha: 0.32, cap: "round" });
        // A little curl beside every segment.
        const side = i % 2 === 0 ? 1 : -1;
        const cx = (a.x + b.x) / 2 - (b.y - a.y) * 0.22 * side;
        const cy = (a.y + b.y) / 2 + (b.x - a.x) * 0.22 * side;
        arcPath(g, cx, cy, 6, 0, Math.PI * 1.4).stroke({
          color: lit ? path.color : 0x3a322b,
          width: 2,
          alpha: lit ? 0.8 : 0.6,
        });
        if (lit) {
          curve(g, pts, 0, 1, i);
          g.stroke({ color: path.color, width: 4, cap: "round" });
          curve(glow, pts, 0, 1, i);
          glow.stroke({ color: path.color, width: 14, alpha: 0.5, cap: "round" });
        }
      });
    }
    // The Keystone ring around the pommel.
    const ks = v.nodes.filter((n) => n.node.kind === "keystone");
    if (ks.length) {
      const c = { x: v.pommel.x * U, y: v.pommel.y * U };
      // Angles in 0..2π: the ring sits below and left of the pommel, across ±π.
      const angles = ks.map((n) => {
        const a = Math.atan2(n.node.y * U - c.y, n.node.x * U - c.x);
        return a < 0 ? a + Math.PI * 2 : a;
      });
      const r = Math.hypot((ks[0]?.node.x ?? 0) * U - c.x, (ks[0]?.node.y ?? 0) * U - c.y);
      const open = ks.some((n) => n.state !== "locked");
      const [a0, a1] = [Math.min(...angles) - 0.25, Math.max(...angles) + 0.25];
      // arcPath, not Pixi's arc: that one leaves invalid points a GPU draws as stray lines.
      arcPath(g, c.x, c.y, r, a0, a1).stroke({ color: 0x0c0806, width: 12 });
      arcPath(g, c.x, c.y, r, a0, a1).stroke({ color: open ? 0xa8732e : 0x3a2c1e, width: 4 });
      const chosen = ks.find((n) => n.state === "learned" || n.pending);
      if (chosen) {
        const p = this.pos(chosen.node);
        g.moveTo(p.x, p.y).lineTo(c.x, c.y).stroke({ color: KEYSTONE, width: 3 });
        glow.moveTo(p.x, p.y).lineTo(c.x, c.y).stroke({ color: KEYSTONE, width: 16, alpha: 0.6 });
      }
    }
    // Seals and orbs hang on thin chains from the weapon.
    for (const n of v.nodes) {
      if (n.node.kind !== "innateForm") continue;
      const p = this.pos(n.node);
      const ax = v.tip.x - v.pommel.x;
      const ay = v.tip.y - v.pommel.y;
      const t = ((n.node.x - v.pommel.x) * ax + (n.node.y - v.pommel.y) * ay) / (ax * ax + ay * ay);
      const len = Math.hypot(ax, ay);
      // Orbs hang from the painted tip (a crystal or gem point, often off the axis).
      const tip = t >= 1 ? this.art?.tip : undefined;
      const q = tip
        ? {
            x: v.pommel.x * U + ((ax * tip.x - ay * tip.y) / len) * ART_SCALE,
            y: v.pommel.y * U + ((ay * tip.x + ax * tip.y) / len) * ART_SCALE,
          }
        : {
            x: (v.pommel.x + ax * Math.min(1, t)) * U,
            y: (v.pommel.y + ay * Math.min(1, t)) * U,
          };
      const on = n.state === "learned" || n.pending;
      g.moveTo(q.x, q.y)
        .lineTo(p.x, p.y)
        .stroke({
          color: on ? this.colorOf(n) : 0x3a322b,
          width: on ? 3 : 2,
          alpha: on ? 0.9 : 0.7,
        });
    }
  }

  private drawLabels(v: MasteryView): void {
    // Labels depend only on the weapon's paths: rebuilt when the weapon changes.
    const key = `${v.weaponId}:${v.paths.map((p) => p.id).join()}:${this.forge ? 1 : 0}`;
    if (key === this.labelKey) return;
    this.labelKey = key;
    for (const t of this.labels) t.destroy();
    this.labels = [];
    const add = (text: string, x: number, y: number, color: number, size = 20) => {
      const t = new Text({
        text,
        style: {
          fontFamily: "Cinzel, serif",
          fontWeight: "900",
          fontSize: size,
          letterSpacing: 4,
          fill: color,
        },
        resolution: 2 * this.size.resolution,
      });
      t.anchor.set(0.5);
      t.alpha = 0.6;
      t.position.set(x, y);
      this.labelLayer.addChild(t);
      this.labels.push(t);
    };
    for (const { path, end: last, before: prev } of this.pathLines(v)) {
      if (!last || !prev) continue;
      const d = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
      add(
        path.name.toUpperCase(),
        last.x + ((last.x - prev.x) / d) * 70,
        last.y + ((last.y - prev.y) / d) * 56,
        path.color,
      );
    }
    const forms = v.nodes.filter((n) => n.node.kind === "heatForm");
    const forge = this.forge;
    if (forms[0] && forge)
      add("HEAT FORM", forge.left + forge.w / 2, forge.top + forge.h + 16, EMBER, 15);
    const seals = v.nodes.filter((n) => n.node.kind === "innateForm");
    if (seals.length) {
      // Above the middle seal, a little further out from the weapon.
      const mid = seals[Math.floor(seals.length / 2)]?.node;
      if (mid) add("INNATE", mid.x * U - 30, mid.y * U - 58, 0xffd27a, 15);
    }
    const ks = v.nodes.filter((n) => n.node.kind === "keystone");
    if (ks.length) {
      const x = Math.min(...ks.map((n) => n.node.x)) * U - 20;
      const y = Math.max(...ks.map((n) => n.node.y)) * U + 56;
      add("KEYSTONE", x + 70, y, KEYSTONE, 15);
    }
  }

  private makeSprite(n: MasteryNodeView): NodeSprite {
    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";
    const r = RADIUS[n.node.kind] + 8;
    // A Heat Form is its bowl and the icon standing in it.
    root.hitArea =
      n.node.kind === "heatForm"
        ? new Rectangle(-r * 1.8, -r * 3.4, r * 3.6, r * 4.4)
        : new Rectangle(-r, -r, r * 2, r * 2);
    const flame = new Graphics();
    flame.blendMode = "add";
    const g = new Graphics();
    const name = new Text({
      text: n.node.name,
      style: {
        fontFamily: "Alegreya Sans, sans-serif",
        fontWeight: "700",
        fontSize: 13,
        fill: 0xecdfc4,
        stroke: { color: 0x0d0a08, width: 4 },
      },
      resolution: 2 * this.size.resolution,
    });
    name.anchor.set(0.5, 0);
    root.addChild(flame, g, name);
    root.on("pointertap", () => this.tap(n.node.id));
    root.on("pointerover", () => {
      const p = root.getGlobalPosition();
      this.hoverId = n.node.id;
      this.callbacks.onHover(n.node.id, p.x, p.y);
    });
    root.on("pointerout", () => {
      this.hoverId = null;
      this.callbacks.onHover(null, 0, 0);
    });
    this.nodeLayer.addChild(root);
    return { root, g, flame, name, view: n };
  }

  private tap(id: string): void {
    if (this.dragged > 6) return;
    const now = performance.now();
    if (this.lastTap.id === id && now - this.lastTap.t < 320) {
      this.lastTap = { id: "", t: 0 };
      this.callbacks.onLearn(id);
      return;
    }
    this.lastTap = { id, t: now };
    this.callbacks.onSelect(id);
  }

  private drawNode(s: NodeSprite): void {
    const n = s.view;
    const kind = n.node.kind;
    const g = s.g.clear();
    const r = RADIUS[kind];
    const color = this.colorOf(n);
    const lit = n.state === "learned" || n.pending;
    const dim = n.state === "unavailable" || n.state === "locked";
    if (lit && kind !== "heatForm") {
      for (let i = 3; i > 0; i--) g.circle(0, 0, r + 4 + i * 5).fill({ color, alpha: 0.08 });
    }
    if (n.selected && kind !== "heatForm") {
      g.circle(0, 0, r + 8).stroke({ color: 0xfff3d6, width: 2, alpha: 0.9 });
    }

    switch (kind) {
      case "refine": {
        // A bronze rivet on the weapon with a rank pip per point.
        g.circle(0, 0, r).fill({ color: 0x1a120c, alpha: 0.85 });
        g.circle(0, 0, r).stroke({ color: lit ? color : 0xa8732e, width: 3 });
        g.circle(0, 0, r * 0.45).fill({ color: lit ? color : 0x5a4030, alpha: lit ? 0.95 : 0.8 });
        const max = n.maxRanks;
        for (let i = 0; i < max; i++) {
          const a = -Math.PI / 2 + (i - (max - 1) / 2) * 0.55;
          g.circle(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7), 3.5).fill({
            color: i < n.ranks ? color : 0x2a1f17,
          });
          g.circle(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7), 3.5).stroke({
            color: 0x0b0705,
            width: 1.2,
          });
        }
        break;
      }
      case "technique": {
        // A diamond with a pip per rank.
        const d = [0, -r, r, 0, 0, r, -r, 0];
        g.poly(d).fill({ color: 0x17120e });
        if (lit) g.poly(d.map((v) => v * 0.6)).fill({ color, alpha: 0.9 });
        g.poly(d).stroke({ color, width: 2.5, alpha: dim ? 0.7 : 1 });
        const max = n.maxRanks;
        for (let i = 0; i < max; i++) {
          const x = (i - (max - 1) / 2) * 9;
          g.circle(x, -r - 7, 3).fill({ color: i < n.ranks ? color : 0x2a1f17 });
          g.circle(x, -r - 7, 3).stroke({ color: 0x0b0705, width: 1.2 });
        }
        break;
      }
      case "master": {
        // The path's crown: an eight-pointed star in a ring.
        const star: number[] = [];
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 8;
          const k = i % 2 === 0 ? r : r * 0.55;
          star.push(Math.cos(a) * k, Math.sin(a) * k);
        }
        g.circle(0, 0, r + 3).fill({ color: 0x17120e });
        g.poly(star).fill({ color: lit ? color : 0x241a12, alpha: lit ? 0.85 : 1 });
        g.poly(star).stroke({ color, width: 2.5, alpha: dim ? 0.7 : 1 });
        g.circle(0, 0, r + 3).stroke({ color: 0xa8732e, width: 1.5, alpha: 0.8 });
        if (lit) g.circle(0, 0, r * 0.22).fill({ color: 0xffffff, alpha: 0.85 });
        break;
      }
      case "notable": {
        // A cut gem: hexagon with facets.
        const hexPts: number[] = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          hexPts.push(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.poly(hexPts).fill({ color: 0x17120e });
        if (lit) g.poly(hexPts.map((v) => v * 0.78)).fill({ color, alpha: 0.75 });
        for (let i = 0; i < 6; i++) {
          g.moveTo(0, 0)
            .lineTo(hexPts[i * 2] ?? 0, hexPts[i * 2 + 1] ?? 0)
            .stroke({ color: lit ? 0xffffff : color, width: 1, alpha: lit ? 0.35 : 0.25 });
        }
        g.poly(hexPts).stroke({ color, width: 3.5, alpha: dim ? 0.7 : 1 });
        g.poly(hexPts.map((v) => v * 1.25)).stroke({ color: 0xa8732e, width: 1.5, alpha: 0.7 });
        break;
      }
      case "keystone": {
        const oct: number[] = [];
        for (let i = 0; i < 8; i++) {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          oct.push(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.poly(oct).fill({ color: 0x2a180a });
        g.poly(oct).stroke({ color: dim ? 0x5a4030 : 0xd0a050, width: 3.5 });
        g.circle(0, 0, r * 0.55).fill({ color: lit ? color : 0x120c08 });
        if (lit) g.circle(-r * 0.18, -r * 0.18, r * 0.18).fill({ color: 0xffffff, alpha: 0.8 });
        else g.circle(0, 0, r * 0.55).stroke({ color, width: 2, alpha: dim ? 0.5 : 0.9 });
        break;
      }
      case "heatForm":
        this.drawBowl(s, lit, dim);
        break;
      case "innateForm": {
        // A rune seal: wax-red disc with a glyph.
        const idx = this.view?.nodes.filter((v) => v.node.kind === "innateForm").indexOf(n) ?? 0;
        g.circle(0, 0, r).fill({ color: lit ? 0x5a1a10 : 0x1e1410 });
        g.circle(0, 0, r).stroke({ color: lit ? color : dim ? 0x4a3828 : 0xa8732e, width: 3 });
        g.circle(0, 0, r - 5).stroke({ color, width: 1, alpha: 0.5 });
        const glyph = GLYPHS[idx % GLYPHS.length] ?? [];
        for (let i = 0; i + 3 < glyph.length; i += 4) {
          g.moveTo((glyph[i] ?? 0) * r * 0.7, (glyph[i + 1] ?? 0) * r * 0.7)
            .lineTo((glyph[i + 2] ?? 0) * r * 0.7, (glyph[i + 3] ?? 0) * r * 0.7)
            .stroke({
              color: lit ? 0xfff0c8 : color,
              width: 2.2,
              alpha: dim ? 0.55 : 1,
              cap: "round",
            });
        }
        break;
      }
    }

    // Names: always for the big choices, on select for path nodes.
    const always = kind !== "technique" && kind !== "refine";
    s.name.visible = always || n.selected;
    s.name.position.set(0, r + (kind === "refine" ? 14 : 8));
    if (kind === "heatForm") this.placeBowlName(s);
    // Text styles re-render their texture: only touch them when they change.
    const fill = lit ? 0xfff0c8 : dim ? 0x9a8c78 : 0xecdfc4;
    const fontSize = kind === "notable" || kind === "keystone" || kind === "master" ? 14 : 12;
    if (s.name.style.fill !== fill) s.name.style.fill = fill;
    if (s.name.style.fontSize !== fontSize) s.name.style.fontSize = fontSize;
    s.root.alpha = dim ? 0.78 : 1;
  }

  // --- effects -------------------------------------------------------------------------------

  /** The hammer strike when a point goes into a node. */
  private strike(n: MasteryNodeView): void {
    if (!this.fx || !this.motion) return;
    const p = this.pos(n.node);
    const color = this.colorOf(n);
    const big = n.node.kind === "keystone" || n.node.kind === "notable" || n.node.kind === "master";
    this.fx.ring(p.x, p.y, 0xffffff, 6, big ? 90 : 56, 0.35, 6, 1);
    this.fx.ring(p.x, p.y, color, 10, big ? 130 : 80, 0.55, 4, 1);
    this.fx.burst({
      x: p.x,
      y: p.y,
      count: big ? 46 : 26,
      color: [0xffffff, GOLD, color, EMBER],
      speed: [120, 420],
      angle: [-Math.PI * 0.95, -Math.PI * 0.05],
      gravity: 620,
      life: [0.35, 0.8],
      size: [4, 8],
      stretch: 2.5,
      drag: 0.4,
    });
    this.fx.burst({
      x: p.x,
      y: p.y,
      count: 8,
      color,
      speed: [10, 50],
      life: [0.4, 0.8],
      size: [30, 60],
      alpha: 0.5,
    });
    this.shakeT = big ? 0.25 : 0.15;
    if (n.node.kind === "refine") this.flash = 1;
  }

  // --- frame ---------------------------------------------------------------------------------

  /** The camera glides, a drag or pinch is on, or a flick still carries the view. */
  private moving(): boolean {
    return (
      this.drag !== null ||
      this.touches.size > 0 ||
      this.velocity.x !== 0 ||
      this.velocity.y !== 0 ||
      Math.abs(this.goal.x - this.cam.x) > 0.5 ||
      Math.abs(this.goal.y - this.cam.y) > 0.5 ||
      Math.abs(this.goal.zoom - this.cam.zoom) > 0.002 ||
      this.shakeT > 0 ||
      this.flash > 0
    );
  }

  private tick(dt: number): void {
    this.time += dt;
    this.pacer?.update(dt, this.moving());
    const v = this.view;
    if (!this.drag && (this.velocity.x || this.velocity.y)) {
      // A flick keeps the view gliding for a moment.
      this.goal.x += this.velocity.x * dt;
      this.goal.y += this.velocity.y * dt;
      this.cam.x += this.velocity.x * dt;
      this.cam.y += this.velocity.y * dt;
      const keep = Math.pow(0.02, dt);
      this.velocity = { x: this.velocity.x * keep, y: this.velocity.y * keep };
      if (Math.hypot(this.velocity.x, this.velocity.y) < 5) this.velocity = { x: 0, y: 0 };
    }
    const k = this.motion ? 1 - Math.pow(0.0005, dt) : 1;
    this.cam.x += (this.goal.x - this.cam.x) * k;
    this.cam.y += (this.goal.y - this.cam.y) * k;
    this.cam.zoom += (this.goal.zoom - this.cam.zoom) * k;
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.applyCamera();
    if (!v) return;

    // The edge breathes with the grade's heat; a Refine strike makes it flare.
    const grade = GRADE_GLOW[v.grade] ?? GRADE_GLOW[0];
    if (this.edgeGlow && grade) {
      const pulse = this.motion ? 0.85 + 0.15 * Math.sin(this.time * 1.7) : 1;
      this.edgeGlow.alpha = Math.min(1, grade.alpha * pulse + this.flash * 0.8);
    }
    if (this.runeLight) {
      this.runeLight.alpha = this.motion ? 0.7 + 0.3 * Math.sin(this.time * 2.1) : 0.85;
    }
    if (this.echoAura) {
      this.echoAura.alpha = this.motion ? 0.42 + 0.14 * Math.sin(this.time * 1.4) : 0.45;
    }
    if (this.echoRing) {
      const p = this.motion ? (this.time % 3.2) / 3.2 : 1;
      this.echoRing.scale.set(1 + p * 0.06, 1 + p * 0.9);
      this.echoRing.alpha = 0.55 * (1 - p) * (1 - p);
    }

    const pulse = this.motion ? 0.75 + 0.25 * Math.sin(this.time * 3.4) : 1;
    for (const s of this.sprites.values()) {
      const n = s.view;
      const waiting = n.state === "available" && !n.pending && v.pointsLeft;
      s.g.alpha = waiting ? pulse : 1;
      if (n.node.kind === "heatForm") this.drawFlame(s);
    }

    if (!this.fx || !this.motion) return;
    this.fx.update(dt);
    this.emberT -= dt;
    if (this.emberT <= 0) {
      this.emberT = 0.09;
      this.forgeEmbers(v);
      this.echoMotes(v);
    }
    this.sparkT -= dt;
    if (this.sparkT <= 0) {
      this.sparkT = 1.1;
      this.sparkRun(v);
    }
  }

  /**
   * A Heat Form's bowl in the painted forge: its icon stands in the coals, a lid closes the bowl
   * until the Weapon Rank opens it. The ring around the rim marks the selected or open bowl.
   */
  private drawBowl(s: NodeSprite, lit: boolean, dim: boolean): void {
    const tex = this.forgeTex;
    const forge = this.forge;
    const behavior: HeatBehavior | undefined = s.view.node.effect.heatForm;
    if (!tex || !forge || !behavior) return;
    const a = FORGE_BED.a * forge.w;
    const b = FORGE_BED.b * forge.w;
    if (!s.icon) {
      s.icon = new Sprite(tex.icons[behavior]);
      s.icon.anchor.set(0.5, 0.86);
      s.root.addChildAt(s.icon, s.root.getChildIndex(s.g) + 1);
    }
    if (!s.lid) {
      s.lid = new Sprite(tex.lid);
      s.lid.anchor.set(0.5, 0.58);
      this.forgeTop.addChild(s.lid);
    }
    const size = a * 1.9;
    s.icon.setSize(size, size);
    s.icon.position.set(0, b * 0.35);
    const closed = s.view.state === "locked";
    s.icon.visible = !closed;
    s.lid.visible = closed;
    s.lid.position.set(s.root.x, s.root.y - b * 0.2);
    s.lid.scale.set((FORGE_LID * forge.w) / tex.lid.width);
    const g = s.g;
    if (s.view.selected) {
      g.ellipse(0, 0, a + 9, b + 7).stroke({ color: 0xfff3d6, width: 2, alpha: 0.9 });
    } else if (!lit && !dim && !closed) {
      g.ellipse(0, 0, a + 6, b + 5).stroke({ color: this.colorOf(s.view), width: 2, alpha: 0.5 });
    }
  }

  /** A Heat Form's name, carved on the forge's stones under its bowl (over the front piece). */
  private placeBowlName(s: NodeSprite): void {
    const forge = this.forge;
    if (!forge) return;
    if (s.name.parent !== this.forgeTop) this.forgeTop.addChild(s.name);
    s.name.anchor.set(0.5);
    s.name.visible = true;
    s.name.position.set(s.root.x, forge.y + forge.w * 0.118);
    s.name.alpha = s.view.state === "locked" ? 0.7 : 1;
  }

  /** The chosen Heat Form burns in its bowl; the others glimmer, brighter under the pointer. */
  private drawFlame(s: NodeSprite): void {
    const f = s.flame.clear();
    const forge = this.forge;
    if (!forge) return;
    const n = s.view;
    // The fire keeps the form's own colour, also while the choice waits to be confirmed.
    const color = HEAT_FORM_COLOR[n.node.id] ?? EMBER;
    const lit = n.state === "learned" || n.pending;
    const hovered = this.hoverId === n.node.id;
    const t = this.motion ? this.time : 0;
    const a = FORGE_BED.a * forge.w;
    const b = FORGE_BED.b * forge.w;
    if (s.icon) s.icon.tint = lit ? 0xffffff : hovered ? 0xb4a494 : 0x443b35;
    if (!lit) {
      if (n.state === "locked") return;
      f.ellipse(0, 0, a * 0.7, b * 0.6).fill({
        color: EMBER,
        alpha: (hovered ? 0.32 : 0.14) + 0.05 * Math.sin(t * 2 + n.node.x),
      });
      return;
    }
    // The coals glow in the form's colour and light the forge around the bowl.
    for (let i = 1; i <= 6; i++) {
      f.ellipse(0, -a * 0.5, a * (0.6 + i * 0.22), a * (0.5 + i * 0.2)).fill({
        color,
        alpha: 0.03,
      });
    }
    f.ellipse(0, 0, a, b).fill({ color, alpha: 0.55 });
    f.ellipse(0, 0, a * 0.6, b * 0.6).fill({
      color: 0xfff3d6,
      alpha: 0.35 + 0.1 * Math.sin(t * 4.3),
    });
    // Tongues of fire behind the icon: a wide outer flame, smaller ones flickering at its sides,
    // a white-hot core.
    const tongues = [
      { x: 0, w: 0.85, h: 2.1, alpha: 0.22, core: false },
      { x: -0.45, w: 0.4, h: 1.4, alpha: 0.3, core: false },
      { x: 0.45, w: 0.4, h: 1.5, alpha: 0.3, core: false },
      { x: 0, w: 0.55, h: 1.6, alpha: 0.38, core: false },
      { x: 0, w: 0.28, h: 1.0, alpha: 0.55, core: true },
    ];
    const base = b * 0.3;
    tongues.forEach((tg, i) => {
      const h = a * tg.h * (1 + 0.14 * Math.sin(t * (7 + i * 2.3) + i * 1.7));
      const w = a * tg.w;
      const x = a * tg.x;
      const sway = Math.sin(t * (4.5 + i) + i * 2) * a * 0.12;
      f.moveTo(x - w, base)
        .bezierCurveTo(
          x - w * 1.15,
          base - h * 0.5,
          x + sway - w * 0.55,
          base - h * 0.95,
          x + sway,
          base - h,
        )
        .bezierCurveTo(
          x + sway + w * 0.55,
          base - h * 0.95,
          x + w * 1.15,
          base - h * 0.5,
          x + w,
          base,
        )
        .fill({ color: tg.core ? 0xfff3d6 : color, alpha: tg.alpha });
    });
  }

  /** Switching the Heat Form: a spark leaps from the old bowl into the new one. */
  private leap(from: MasteryNode, to: MasteryNodeView): void {
    const fx = this.fx;
    if (!fx || !this.motion) return;
    const a = this.pos(from);
    const b = this.pos(to.node);
    const color = this.colorOf(to);
    const lift = 50 + Math.abs(b.x - a.x) * 0.25;
    const dot = new Graphics().circle(0, 0, 9).fill({ color, alpha: 0.6 });
    dot.circle(0, 0, 4).fill({ color: 0xffffff });
    dot.blendMode = "add";
    fx.shape(
      dot,
      0.45,
      (t) => {
        const x = a.x + (b.x - a.x) * t;
        const y = a.y - 10 + (b.y - a.y) * t - Math.sin(Math.PI * t) * lift;
        dot.position.set(x, y);
        fx.burst({
          x,
          y,
          count: 1,
          color: [color, GOLD],
          speed: [5, 30],
          life: [0.2, 0.45],
          size: [5, 10],
        });
      },
      "front",
    );
  }

  private forgeEmbers(v: MasteryView): void {
    if (!this.fx) return;
    const forms = v.nodes.filter((n) => n.node.kind === "heatForm");
    const chosen = forms.find((n) => n.state === "learned" || n.pending);
    const p = chosen ? this.pos(chosen.node) : { x: 0, y: 4.3 * U };
    const color = chosen ? (HEAT_FORM_COLOR[chosen.node.id] ?? EMBER) : EMBER;
    const bed = this.forge ? FORGE_BED.a * this.forge.w : 30;
    // Soft flames lick up out of the bowl, embers fly higher.
    this.fx.burst({
      x: p.x,
      y: p.y - 4,
      count: 2,
      color: [color, 0xfff3d6],
      spreadX: bed * 0.6,
      speed: [40, 90],
      angle: [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2],
      life: [0.35, 0.7],
      size: [bed * 0.5, bed * 0.9],
      endSize: 0.1,
      alpha: 0.6,
    });
    this.fx.burst({
      x: p.x,
      y: p.y - 10,
      count: 1,
      color: [color, GOLD, EMBER],
      spreadX: bed * 0.7,
      speed: [50, 120],
      angle: [-Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35],
      life: [0.8, 1.6],
      size: [4, 8],
      wobble: 10,
      alpha: 0.9,
    });
    // Ash and sparks drifting up through the whole scene.
    if (this.fx.rand.next() < 0.5) {
      this.fx.burst({
        x: this.fx.rand.range(-7, 7) * U,
        y: 5.4 * U,
        count: 1,
        color: [EMBER, 0xffb13b],
        speed: [30, 70],
        angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3],
        life: [4, 7],
        size: [3, 7],
        wobble: 18,
        alpha: 0.4,
        layer: "back",
      });
    }
  }

  /** The worn Echo's motes circle the weapon. */
  private echoMotes(v: MasteryView): void {
    if (!this.fx || v.echoColor === null || this.fx.rand.next() > 0.6) return;
    const t = this.fx.rand.next();
    this.fx.burst({
      x: (v.pommel.x + (v.tip.x - v.pommel.x) * t) * U,
      y: (v.pommel.y + (v.tip.y - v.pommel.y) * t) * U,
      count: 1,
      color: [v.echoColor, 0xffffff],
      spreadX: 30,
      spreadY: 30,
      speed: [15, 40],
      life: [1.2, 2.2],
      size: [8, 16],
      wobble: 12,
      alpha: 0.55,
    });
  }

  /** A spark runs out of the weapon along a lit path. */
  private sparkRun(v: MasteryView): void {
    const fx = this.fx;
    if (!fx) return;
    const lines = this.pathLines(v).filter((l) => l.chains.length > 0);
    const line = lines.length ? fx.rand.pick(lines) : undefined;
    const pts = line?.chains[0];
    if (!line || !pts || pts.length < 2) return;
    const lengths = pts
      .slice(1)
      .map((p, i) => Math.hypot(p.x - (pts[i]?.x ?? 0), p.y - (pts[i]?.y ?? 0)));
    const total = lengths.reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const dot = new Graphics().circle(0, 0, 7).fill({ color: line.path.color, alpha: 0.6 });
    dot.circle(0, 0, 3).fill({ color: 0xffffff });
    dot.blendMode = "add";
    fx.shape(
      dot,
      Math.max(0.5, total / 520),
      (t) => {
        let d = t * total;
        let i = 0;
        while (i < lengths.length - 1 && d > (lengths[i] ?? 0)) d -= lengths[i++] ?? 0;
        const a = pts[i];
        const b = pts[i + 1];
        if (!a || !b) return;
        const k = Math.min(1, d / (lengths[i] || 1));
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        dot.position.set(x, y);
        fx.burst({
          x,
          y,
          count: 1,
          color: line.path.color,
          speed: [5, 25],
          life: [0.2, 0.4],
          size: [6, 10],
        });
      },
      "front",
    );
  }
}

export const MASTERY_UNIT = U;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
