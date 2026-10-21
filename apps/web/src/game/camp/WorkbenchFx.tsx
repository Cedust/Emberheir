import { Application, Container } from "pixi.js";
import { type RefObject, useEffect, useRef } from "react";
import { Fx } from "../battle/fx";
import type { PersonaId } from "./personaDefs";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The burst a crafter's work leaves on the workbench (ui-ux-plan-v1.md 4.3). */
function play(fx: Fx, persona: PersonaId, x: number, y: number): void {
  switch (persona) {
    case "thoric":
      // Sparks off the anvil: hot streaks that fall back down, and a short white-hot flash.
      fx.burst({
        x,
        y,
        count: 70,
        color: [0xffd27a, 0xff9a3a, 0xff6a1a],
        kind: "glow",
        speed: [180, 460],
        angle: [-Math.PI * 0.95, -Math.PI * 0.05],
        life: [0.4, 0.9],
        size: [5, 9],
        stretch: 3,
        gravity: 900,
        drag: 0.4,
      });
      fx.burst({
        x,
        y,
        count: 6,
        color: 0xfff1c8,
        kind: "glow",
        speed: [0, 20],
        life: [0.18, 0.3],
        size: [70, 110],
        endSize: 1.6,
        alpha: 0.7,
      });
      break;
    case "liora":
      // Soft light rising from the altar, like breath on a cold night.
      fx.burst({
        x,
        y,
        count: 46,
        color: [0xd9b8ff, 0xb36bff, 0xffffff],
        kind: "glow",
        spreadX: 70,
        spreadY: 20,
        speed: [30, 90],
        angle: [-Math.PI * 0.7, -Math.PI * 0.3],
        life: [0.9, 1.6],
        size: [10, 18],
        endSize: 0.1,
        wobble: 14,
      });
      fx.burst({
        x,
        y,
        count: 4,
        color: 0xc89bff,
        kind: "glow",
        speed: [0, 10],
        life: [0.4, 0.6],
        size: [90, 140],
        endSize: 1.4,
        alpha: 0.5,
      });
      break;
    case "nyssa":
      // A ring of rune light that flares out from the socket.
      fx.burst({
        x,
        y,
        count: 54,
        color: [0x8fd06a, 0x6ad0c0, 0xd8ffb0],
        kind: "glow",
        speed: [120, 200],
        life: [0.5, 0.8],
        size: [6, 11],
        drag: 0.2,
      });
      fx.burst({
        x,
        y,
        count: 18,
        color: [0x8fd06a, 0xb8f08a],
        kind: "bit",
        speed: [40, 120],
        angle: [-Math.PI, 0],
        life: [0.6, 1],
        size: [5, 8],
        gravity: 200,
        spin: 6,
      });
      break;
    case "marisha":
      // The dark shape in the crate draws in gold and violet light, then turns into the item
      // (screens.css gamble-turn) in a flash, and coins jump off the crate.
      fx.burst({
        x,
        y,
        count: 26,
        color: [0xb36bff, 0xffd86a, 0xe0c27a],
        kind: "glow",
        spreadX: 80,
        spreadY: 50,
        speed: [10, 40],
        angle: [-Math.PI * 0.75, -Math.PI * 0.25],
        life: [0.35, 0.5],
        size: [6, 11],
        endSize: 0.1,
        wobble: 10,
      });
      fx.shape(
        new Container(),
        0.4,
        () => {},
        "front",
        () => {
          fx.ring(x, y, 0xffe9a0, 20, 110, 0.45, 7, 1);
          fx.burst({
            x,
            y,
            count: 30,
            color: [0xe0c27a, 0xffd86a, 0xc9952a],
            kind: "bit",
            speed: [220, 420],
            angle: [-Math.PI * 0.85, -Math.PI * 0.15],
            life: [0.8, 1.2],
            size: [9, 14],
            endSize: 0.9,
            gravity: 1100,
            spin: 10,
          });
          fx.burst({
            x,
            y,
            count: 24,
            color: [0xffe9a0, 0xd9b8ff],
            kind: "glow",
            speed: [60, 200],
            life: [0.3, 0.6],
            size: [6, 10],
          });
        },
      );
      break;
  }
}

/**
 * Pixi particles over a crafter's work area: each time `pulse` grows, the persona's burst
 * plays at the bench (`anchor`). Looks only; off for prefers-reduced-motion.
 */
export function WorkbenchFx(props: {
  persona: PersonaId;
  pulse: number;
  anchor: RefObject<HTMLElement | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const fx = useRef<Fx | null>(null);
  const persona = useRef(props.persona);
  useEffect(() => {
    persona.current = props.persona;
  }, [props.persona]);

  useEffect(() => {
    const el = host.current;
    if (!el || reducedMotion()) return;
    let app: Application | null = new Application();
    let gone = false;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    void app
      .init({
        width: w,
        height: h,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        if (gone || !app) {
          app?.destroy(true, { children: true });
          return;
        }
        app.canvas.setAttribute("aria-hidden", "true");
        el.appendChild(app.canvas);
        const f = new Fx(app.renderer);
        app.stage.addChild(f.back, f.front);
        app.ticker.add((t) => f.update(t.deltaMS / 1000));
        fx.current = f;
      })
      .catch(() => {
        app = null;
      });
    return () => {
      gone = true;
      fx.current?.destroy();
      fx.current = null;
      if (app?.renderer) app.destroy(true, { children: true });
      app = null;
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    const at = props.anchor.current;
    if (props.pulse === 0 || !fx.current || !el) return;
    // Bench position in the canvas: screen rects are scaled by the Stage, layout sizes are not.
    const box = el.getBoundingClientRect();
    const scale = el.offsetWidth / (box.width || 1);
    const a = at?.getBoundingClientRect();
    const x = a ? (a.left + a.width / 2 - box.left) * scale : el.offsetWidth / 2;
    const y = a ? (a.top + a.height * 0.45 - box.top) * scale : el.offsetHeight / 3;
    play(fx.current, persona.current, x, y);
  }, [props.pulse, props.anchor]);

  return <div ref={host} className="workbench-fx" aria-hidden="true" data-pulse={props.pulse} />;
}
