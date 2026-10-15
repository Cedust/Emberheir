import { type ReactNode, useEffect, useRef, useState } from "react";
import { playUiSound } from "../sound";

/**
 * Juice (ui-ux-plan-v1.md step 8): menu sounds, windows that fold away instead of vanishing,
 * and wallet numbers that count. Looks and sounds only; nothing here changes the game.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** What gets a hover tick: buttons and the people in the Camp, not every item in a bag. */
const HOVER = ".k-btn, .k-icon-btn, .k-tab, .camp-target, .btn, .icon-button, .k-answer";

/**
 * One listener for the whole game instead of a sound call in every button: a soft tick when the
 * pointer enters a button, a click when it is pressed, a dull knock when it is blocked. Tabs make
 * their own page-turn sound (see `Tabs`), so a click on a tab stays silent here.
 */
export function useUiSounds() {
  useEffect(() => {
    let hovered: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !(e.target instanceof Element)) return;
      const el = e.target.closest(HOVER);
      if (el === hovered) return;
      hovered = el;
      if (el && !isBlocked(el)) playUiSound("hover");
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const el = e.target.closest("button, [role=button], [role=tab]");
      if (!el || el.matches(".k-tab")) return;
      playUiSound(isBlocked(el) ? "blocked" : "click");
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
    };
  }, []);
}

function isBlocked(el: Element): boolean {
  return (
    el.hasAttribute("data-blocked") ||
    el.getAttribute("aria-disabled") === "true" ||
    (el instanceof HTMLButtonElement && el.disabled)
  );
}

/** How long a window takes to fold away (kit.css `k-layer-out`). */
export const LEAVE_MS = 150;

/**
 * Keeps a window on screen for a moment after it was closed, so it can fold away (kit.css
 * `[data-leaving]`), and plays the parchment sound on open and close. While it leaves it takes
 * no clicks. `null` children mean "closed".
 */
export function Presence(props: { children: ReactNode }) {
  const open = props.children !== null && props.children !== undefined && props.children !== false;
  // What was last shown, kept for the fold-away. Adjusted while rendering, so the closed window
  // never drops out for a frame (which would mount it anew, Pixi scenes and all).
  const [shown, setShown] = useState<{ open: boolean; children: ReactNode }>({
    open,
    children: props.children,
  });
  const [leaving, setLeaving] = useState(false);
  if (shown.open !== open || (open && shown.children !== props.children)) {
    if (shown.open !== open) setLeaving(!open && !prefersReducedMotion());
    setShown({ open, children: open ? props.children : shown.children });
  }

  const heard = useRef(open);
  useEffect(() => {
    if (heard.current === open) return;
    heard.current = open;
    playUiSound(open ? "open" : "close");
  }, [open]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(false), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!open && !leaving) return null;
  // The same wrapper open and leaving, so React keeps the window instead of mounting a copy.
  return (
    <div
      className="k-presence"
      data-leaving={open ? undefined : ""}
      aria-hidden={open ? undefined : true}
      inert={!open}
    >
      {open ? props.children : shown.children}
    </div>
  );
}

/** Ease-out over `t` in 0..1. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The number a counter shows `elapsed` ms into rolling from `from` to `to`. */
export function rollValue(from: number, to: number, elapsed: number, duration: number): number {
  if (elapsed >= duration || duration <= 0) return to;
  return Math.round(from + (to - from) * easeOut(Math.max(0, elapsed) / duration));
}

/** Longer rolls for bigger jumps, but never long enough to wait for. */
export function rollDuration(delta: number): number {
  return Math.min(900, 280 + Math.log10(1 + Math.abs(delta)) * 160);
}

/**
 * A number that counts to its new value instead of jumping (Diablo gold), and which way it last
 * moved, for a short glow. A coin rings when it goes up.
 */
export function useRollingNumber(target: number): { value: number; trend: "up" | "down" | null } {
  const [value, setValue] = useState(target);
  const [trend, setTrend] = useState<"up" | "down" | null>(null);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    setTrend(target > from ? "up" : "down");
    if (target > from) playUiSound("coin");
    const settle = window.setTimeout(() => setTrend(null), 700);
    if (prefersReducedMotion()) {
      shown.current = target;
      setValue(target);
      return () => window.clearTimeout(settle);
    }
    const duration = rollDuration(target - from);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const v = rollValue(from, target, now - start, duration);
      shown.current = v;
      setValue(v);
      if (v !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [target]);

  return { value, trend };
}
