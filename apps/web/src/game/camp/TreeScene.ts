import type { SkillNode } from "@emberheir/sim";
import {
  Application,
  Container,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
  Graphics,
  Rectangle,
  Text,
} from "pixi.js";
import { Fx } from "../battle/fx";

/**
 * The Skill Tree as a PixiJS scene (skilltree-v2.md): one tree that grows with every Prestige,
 * with a camera to drag and zoom. Node colours follow the item rarities: grey = Unavailable,
 * white = Available, blue/yellow/purple = learned tier I/II/III, orange = Keystone. Hovering a
 * node lays its path over the web; a fork's closed side shows as a broken seal. Looks only:
 * learning goes through the React side and the sim.
 */

export type NodeState = "unavailable" | "available" | "learned";

export interface TreeNodeView {
  readonly node: SkillNode;
  readonly state: NodeState;
  readonly pending: boolean;
  readonly selected: boolean;
  readonly ranks: number;
  readonly maxRanks: number;
  /** Colour tier of a learned node (1-3). */
  readonly tier: number;
  /** The other side of its fork is learned: a broken seal (level-v2.md). */
  readonly sealed: boolean;
}

export interface TreeLabel {
  readonly key: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly color: number;
  readonly size: number;
}

export interface TreeView {
  readonly nodes: readonly TreeNodeView[];
  readonly labels: readonly TreeLabel[];
  /** Path preview of the hovered node: a learned node first, then the nodes it would cost. */
  readonly path?: readonly string[];
}

export interface TreeCallbacks {
  onSelect(id: string): void;
  /** Double click: put a point into the node. */
  onLearn(id: string): void;
  /** Hovered node and its position in stage pixels inside the canvas, or null. */
  onHover(id: string | null, x: number, y: number): void;
}

/** Stage pixels per tree unit at zoom 1. */
const UNIT = 78;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.2;
/** Names show from this zoom on, rank counters a bit earlier. */
const NAME_ZOOM = 1.0;
const RANK_ZOOM = 0.7;

export const TIER_COLOR: Record<number, number> = {
  1: 0x5b8cff,
  2: 0xffd84a,
  3: 0xb36bff,
};
const KEYSTONE = 0xff8a1f;
const AVAILABLE = 0xd8d4cc;
const UNAVAILABLE = 0x4f4842;
const PENDING = 0x4fe08a;
const CORE = 0x17120e;
const EMBER = 0xff8a3a;
const PATH = 0xfff1c9;

const RADIUS: Record<SkillNode["kind"], number> = {
  minor: 13,
  notable: 19,
  skill: 18,
  keystone: 25,
};

interface NodeSprite {
  readonly root: Container;
  readonly ring: Graphics;
  readonly name: Text;
  readonly rank: Text;
  view: TreeNodeView;
}

function octagon(r: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
}

const diamond = (r: number) => [0, -r, r, 0, 0, r, -r, 0];

export class TreeScene {
  private app: Application | null = null;
  private destroyed = false;
  private readonly world = new Container();
  private readonly linkGlow = new Graphics();
  private readonly links = new Graphics();
  private readonly pathGlow = new Graphics();
  private readonly pathLine = new Graphics();
  private readonly nodeLayer = new Container();
  private readonly labelLayer = new Container();
  private fx: Fx | null = null;
  private sprites = new Map<string, NodeSprite>();
  private labels = new Map<string, Text>();
  private view: TreeView = { nodes: [], labels: [] };
  private byId = new Map<string, TreeNodeView>();
  private size = { w: 800, h: 600, resolution: 1 };
  /** Camera: world offset (stage pixels) and zoom, with targets the camera glides to. */
  private cam = { x: 0, y: 0, zoom: 0.8 };
  private goal = { x: 0, y: 0, zoom: 0.8 };
  private velocity = { x: 0, y: 0 };
  private drag: { x: number; y: number; moved: number; t: number } | null = null;
  /** Fingers on the canvas; two of them pinch-zoom. */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; x: number; y: number } | null = null;
  /** How far the last drag moved: a drag that ends on a node is not a click. */
  private dragged = 0;
  private lastTap = { id: "", t: 0 };
  private time = 0;
  private spark = 0;
  private fitted = false;
  /** Particles and the gliding camera; off for prefers-reduced-motion. */
  motion = true;

  constructor(private readonly callbacks: TreeCallbacks) {
    // Branch names sit under the nodes so they never hide one.
    this.world.addChild(
      this.labelLayer,
      this.linkGlow,
      this.links,
      this.pathGlow,
      this.pathLine,
      this.nodeLayer,
    );
    this.linkGlow.blendMode = "add";
    this.pathGlow.blendMode = "add";
  }

  layout(w: number, h: number, resolution: number): void {
    const first = this.size.w === 800 && this.size.h === 600;
    this.size = { w, h, resolution };
    this.app?.renderer.resize(w, h, resolution);
    if (this.app?.stage) this.app.stage.hitArea = new Rectangle(0, 0, w, h);
    if (first || !this.fitted) this.fit(true);
  }

  async mount(host: HTMLElement): Promise<boolean> {
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
    this.world.addChildAt(this.fx.back, 0);
    this.world.addChild(this.fx.front);
    app.stage.addChild(this.world);
    app.stage.eventMode = "static";
    app.stage.hitArea = new Rectangle(0, 0, this.size.w, this.size.h);
    app.stage.on("pointerdown", (e) => this.dragStart(e));
    app.stage.on("globalpointermove", (e) => this.dragMove(e));
    app.stage.on("pointerup", (e) => this.dragEnd(e));
    app.stage.on("pointerupoutside", (e) => this.dragEnd(e));
    app.stage.on("wheel", (e) => this.wheel(e));
    // The page must not scroll while the wheel zooms the tree.
    app.canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    this.rebuild();
    this.fit(true);
    app.ticker.add((t) => this.tick(t.deltaMS / 1000));
    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.fx?.destroy();
    this.app?.destroy(true, { children: true });
    this.app = null;
  }

  setView(view: TreeView): void {
    const before = new Map(this.view.nodes.map((n) => [n.node.id, n]));
    this.view = view;
    this.rebuild();
    // A new point lights the node up.
    for (const n of view.nodes) {
      const old = before.get(n.node.id);
      if (!old) continue;
      const gained = n.ranks > old.ranks || (n.pending && !old.pending);
      if (gained) this.burstAt(n, n.pending ? PENDING : this.colorOf(n));
    }
  }

  // --- camera --------------------------------------------------------------------------------

  /** Shows every visible node. */
  fit(instant = false): void {
    if (!this.view.nodes.length) return;
    const xs = this.view.nodes.map((n) => n.node.x * UNIT);
    const ys = this.view.nodes.map((n) => n.node.y * UNIT);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs) - 70,
      Math.max(...xs) + 70,
      Math.min(...ys) - 70,
      Math.max(...ys) + 70,
    ];
    const zoom = clamp(
      Math.min(this.size.w / (maxX - minX), this.size.h / (maxY - minY)),
      MIN_ZOOM,
      1.1,
    );
    this.look((minX + maxX) / 2, (minY + maxY) / 2, zoom, instant);
    this.fitted = true;
  }

  /** Centers a node (or the tree's heart). */
  focus(id: string, zoom = Math.max(this.goal.zoom, 1)): void {
    const n = this.view.nodes.find((v) => v.node.id === id);
    if (n) this.look(n.node.x * UNIT, n.node.y * UNIT, zoom, false);
  }

  zoomBy(factor: number): void {
    this.zoomAround(this.size.w / 2, this.size.h / 2, factor);
  }

  private look(wx: number, wy: number, zoom: number, instant: boolean): void {
    this.goal = { x: this.size.w / 2 - wx * zoom, y: this.size.h / 2 - wy * zoom, zoom };
    if (instant || !this.motion) this.cam = { ...this.goal };
    this.applyCamera();
  }

  private zoomAround(sx: number, sy: number, factor: number): void {
    const zoom = clamp(this.goal.zoom * factor, MIN_ZOOM, MAX_ZOOM);
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
    this.world.position.set(this.cam.x, this.cam.y);
    this.world.scale.set(this.cam.zoom);
    if (this.app) this.app.canvas.dataset.zoom = this.goal.zoom.toFixed(2);
    // Branch names keep a readable size when the tree is zoomed out.
    const labelScale = Math.max(1, 0.85 / this.cam.zoom);
    for (const t of this.labels.values()) t.scale.set(labelScale);
    const names = this.cam.zoom >= NAME_ZOOM;
    const ranks = this.cam.zoom >= RANK_ZOOM;
    for (const s of this.sprites.values()) {
      s.name.visible = names || s.view.selected;
      s.rank.visible = ranks && s.view.maxRanks > 1;
    }
  }

  // --- drawing -------------------------------------------------------------------------------

  private colorOf(n: TreeNodeView): number {
    if (n.pending) return PENDING;
    if (n.state === "learned")
      return n.node.kind === "keystone" ? KEYSTONE : (TIER_COLOR[n.tier] ?? TIER_COLOR[1] ?? 0);
    if (n.state === "available") return n.node.kind === "keystone" ? KEYSTONE : AVAILABLE;
    return UNAVAILABLE;
  }

  private rebuild(): void {
    if (!this.app) return;
    const byId = new Map(this.view.nodes.map((n) => [n.node.id, n]));
    this.byId = byId;
    this.drawLinks(byId);
    this.drawPath(byId);

    const seen = new Set<string>();
    for (const n of this.view.nodes) {
      seen.add(n.node.id);
      let s = this.sprites.get(n.node.id);
      if (!s) {
        s = this.makeSprite(n);
        this.sprites.set(n.node.id, s);
      }
      s.view = n;
      this.drawNode(s);
    }
    for (const [id, s] of this.sprites) {
      if (seen.has(id)) continue;
      s.root.destroy({ children: true });
      this.sprites.delete(id);
    }

    const labelKeys = new Set(this.view.labels.map((l) => l.key));
    for (const [key, t] of this.labels) {
      if (labelKeys.has(key)) continue;
      t.destroy();
      this.labels.delete(key);
    }
    for (const l of this.view.labels) {
      let t = this.labels.get(l.key);
      if (!t) {
        t = new Text({
          text: l.text,
          style: {
            fontFamily: "Cinzel, serif",
            fontWeight: "900",
            fontSize: l.size,
            letterSpacing: 4,
            fill: l.color,
          },
          resolution: 2 * this.size.resolution,
        });
        t.anchor.set(0.5);
        t.alpha = 0.6;
        this.labelLayer.addChild(t);
        this.labels.set(l.key, t);
      }
      t.text = l.text;
      t.style.fill = l.color;
      t.position.set(l.x * UNIT, l.y * UNIT);
    }
    this.applyCamera();
  }

  private drawLinks(byId: Map<string, TreeNodeView>): void {
    this.links.clear();
    this.linkGlow.clear();
    const lit = (n: TreeNodeView) => n.state === "learned" || n.pending;
    for (const n of this.view.nodes) {
      for (const id of n.node.links) {
        const other = byId.get(id);
        if (!other) continue;
        const [x1, y1, x2, y2] = [
          n.node.x * UNIT,
          n.node.y * UNIT,
          other.node.x * UNIT,
          other.node.y * UNIT,
        ];
        const both = lit(n) && lit(other);
        const pending = both && (n.pending || other.pending);
        const half = lit(n) || lit(other);
        this.links
          .moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke({
            color: pending ? PENDING : both ? EMBER : half ? 0x8a7356 : 0x3a322b,
            width: both ? 4 : 3,
            alpha: both ? 1 : 0.9,
          });
        if (both) {
          this.linkGlow
            .moveTo(x1, y1)
            .lineTo(x2, y2)
            .stroke({ color: pending ? PENDING : EMBER, width: 14, alpha: 0.16 });
        }
      }
    }
  }

  /** The hovered node's path: a bright dashed trail with a soft glow, marching outwards. */
  private drawPath(byId: Map<string, TreeNodeView>): void {
    this.pathLine.clear();
    this.pathGlow.clear();
    const path = (this.view.path ?? []).map((id) => byId.get(id)).filter((n) => !!n);
    const dash = 10;
    const offset = this.motion ? (this.time * 28) % (dash * 2) : 0;
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1], path[i]];
      if (!a || !b) continue;
      const [x1, y1, x2, y2] = [a.node.x * UNIT, a.node.y * UNIT, b.node.x * UNIT, b.node.y * UNIT];
      this.pathGlow.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: PATH, width: 16, alpha: 0.14 });
      const len = Math.hypot(x2 - x1, y2 - y1);
      const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
      for (let d = offset - dash * 2; d < len; d += dash * 2) {
        const [s, e] = [Math.max(0, d), Math.min(len, d + dash)];
        if (e <= s) continue;
        this.pathLine.moveTo(x1 + ux * s, y1 + uy * s).lineTo(x1 + ux * e, y1 + uy * e);
      }
      this.pathLine.stroke({ color: PATH, width: 3, alpha: 0.95 });
    }
    for (const n of path.slice(1)) {
      const r = RADIUS[n.node.kind] + 5;
      this.pathLine.circle(n.node.x * UNIT, n.node.y * UNIT, r).stroke({
        color: PATH,
        width: 2,
        alpha: 0.9,
      });
    }
  }

  private makeSprite(n: TreeNodeView): NodeSprite {
    const root = new Container();
    root.position.set(n.node.x * UNIT, n.node.y * UNIT);
    root.eventMode = "static";
    root.cursor = "pointer";
    const r = RADIUS[n.node.kind];
    root.hitArea = new Rectangle(-r - 6, -r - 6, (r + 6) * 2, (r + 6) * 2);
    const ring = new Graphics();
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
    name.anchor.set(0.5, 1);
    name.position.set(0, -r - 8);
    const rank = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontWeight: "700",
        fontSize: 12,
        fill: 0xecdfc4,
        stroke: { color: 0x0d0a08, width: 4 },
      },
      resolution: 2 * this.size.resolution,
    });
    rank.anchor.set(0.5, 0);
    rank.position.set(0, r + 6);
    root.addChild(ring, name, rank);
    root.on("pointertap", () => this.tap(n.node.id));
    root.on("pointerover", () => {
      const p = root.getGlobalPosition();
      this.callbacks.onHover(n.node.id, p.x, p.y);
    });
    root.on("pointerout", () => this.callbacks.onHover(null, 0, 0));
    this.nodeLayer.addChild(root);
    return { root, ring, name, rank, view: n };
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
    const g = s.ring.clear();
    const kind = n.node.kind;
    const r = RADIUS[kind];
    const color = this.colorOf(n);
    const lit = n.state === "learned" || n.pending;
    const shape = (radius: number) => {
      if (kind === "keystone") return g.poly(octagon(radius));
      if (kind === "skill") return g.poly(diamond(radius));
      return g.circle(0, 0, radius);
    };
    // Soft light behind learned nodes.
    if (lit) {
      for (let i = 3; i > 0; i--) {
        g.circle(0, 0, r + 6 + i * 5).fill({ color, alpha: 0.07 });
      }
    }
    if (n.selected) {
      shape(r + 7).stroke({ color: 0xfff3d6, width: 2, alpha: 0.9 });
    }
    shape(r).fill({ color: CORE });
    if (lit) shape(r - 3).fill({ color, alpha: 0.28 });
    shape(r).stroke({
      color,
      width: kind === "minor" ? 3 : 4,
      alpha: n.state === "unavailable" ? 0.75 : 1,
    });
    if (kind === "notable") g.circle(0, 0, r - 6).stroke({ color, width: 2, alpha: 0.8 });
    if (n.sealed) {
      // A broken seal: the fork's other side is taken. Two cracks run across the node.
      g.poly(
        [-r * 0.75, -r * 0.5, -r * 0.1, -r * 0.05, -r * 0.35, r * 0.2, r * 0.7, r * 0.6],
        false,
      ).stroke({ color: 0xb04a3a, width: 3, alpha: 0.95 });
      g.poly([r * 0.6, -r * 0.7, r * 0.15, -r * 0.15, r * 0.4, r * 0.1], false).stroke({
        color: 0xb04a3a,
        width: 2,
        alpha: 0.9,
      });
    }
    if (kind === "skill") {
      g.poly(diamond(r * 0.45)).fill({ color, alpha: lit ? 0.9 : 0.35 });
    }
    if (kind === "keystone") {
      const tier = n.node.tier ?? 1;
      const gold = n.state === "unavailable" ? UNAVAILABLE : 0xffd27a;
      // One ring per Keystone tier, a crown on tier III.
      for (let i = 1; i < tier; i++) {
        g.poly(octagon(r + 4 + i * 4)).stroke({ color: gold, width: 2, alpha: 0.85 });
      }
      if (tier === 3) {
        const R = r + 4 + tier * 4;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.32;
          const [cx, cy] = [Math.cos(a), Math.sin(a)];
          g.poly([
            cx * R - cy * 4,
            cy * R + cx * 4,
            cx * (R + 9),
            cy * (R + 9),
            cx * R + cy * 4,
            cy * R - cx * 4,
          ]).fill({ color: gold });
        }
      }
      // Ember pips under the Keystone: one per tier.
      for (let i = 0; i < tier; i++) {
        g.circle((i - (tier - 1) / 2) * 9, r + 9, 3).fill({
          color: lit ? EMBER : gold,
          alpha: 0.95,
        });
      }
      g.poly(octagon(r * 0.42)).fill({ color, alpha: lit ? 0.85 : 0.3 });
    }
    s.rank.text = n.maxRanks > 1 ? `${n.ranks}/${n.maxRanks}` : "";
    if (kind === "keystone") s.rank.position.set(0, r + 15);
    s.name.text = n.node.name;
    s.root.alpha = n.sealed ? 0.55 : n.state === "unavailable" ? 0.85 : 1;
  }

  private burstAt(n: TreeNodeView, color: number): void {
    if (!this.fx || !this.motion) return;
    this.fx.burst({
      x: n.node.x * UNIT,
      y: n.node.y * UNIT,
      count: n.node.kind === "keystone" ? 36 : 18,
      color: [color, 0xffd27a, EMBER],
      speed: [40, 140],
      life: [0.4, 0.9],
      size: [6, 14],
      drag: 0.2,
    });
  }

  // --- frame ---------------------------------------------------------------------------------

  private tick(dt: number): void {
    this.time += dt;
    if (!this.drag && (this.velocity.x || this.velocity.y)) {
      // A flick keeps the tree gliding for a moment.
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
    this.applyCamera();

    if (this.motion && this.view.path?.length) {
      this.drawPath(this.byId);
    }

    // Available nodes breathe.
    const pulse = this.motion ? 0.82 + 0.18 * Math.sin(this.time * 3.2) : 1;
    for (const s of this.sprites.values()) {
      if (s.view.state === "available" && !s.view.pending) s.ring.alpha = pulse;
      else s.ring.alpha = 1;
    }

    if (this.fx && this.motion) {
      this.spark -= dt;
      if (this.spark <= 0) {
        this.spark = 0.12;
        // Learned Keystones smoulder, tier III ones send sparks up.
        for (const n of this.view.nodes) {
          if (n.node.kind !== "keystone" || n.state !== "learned") continue;
          const tier = n.node.tier ?? 1;
          if (this.fx.rand.next() > 0.25 * tier) continue;
          this.fx.burst({
            x: n.node.x * UNIT,
            y: n.node.y * UNIT - 10,
            count: 1,
            color: [KEYSTONE, 0xffd27a],
            spreadX: 18,
            speed: [20, 50],
            angle: [-Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4],
            life: [0.8, 1.6],
            size: [5, 9],
            alpha: 0.9,
            layer: "front",
          });
        }
        // Embers drift through the dark around the tree.
        const view = this.visibleWorld();
        this.fx.burst({
          x: view.x + this.fx.rand.next() * view.w,
          y: view.y + view.h,
          count: 1,
          color: [EMBER, 0xffb13b],
          speed: [25, 60],
          angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3],
          life: [3, 6],
          size: [4, 8],
          alpha: 0.35,
          layer: "back",
        });
      }
      this.fx.update(dt);
    }
  }

  private visibleWorld() {
    const z = this.cam.zoom;
    return { x: -this.cam.x / z, y: -this.cam.y / z, w: this.size.w / z, h: this.size.h / z };
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const TREE_UNIT = UNIT;
