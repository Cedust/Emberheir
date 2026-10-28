/**
 * Touch input (tablet-plan-v1.md): the same UI as on PC, with gestures instead of the mouse.
 * A long press opens a tooltip and keeps it until the next tap; the click that ends a long press
 * is swallowed, so pressing a button to read it never presses it. The browser's own long-press
 * menu, double-tap zoom and pinch zoom of the page are switched off. The last pointer type is
 * kept on `<html data-input>`, so hotkey hints hide while the player uses touch.
 */

export const LONG_PRESS_MS = 450;
/** A finger that moves further than this is dragging or scrolling, not pressing. */
const MOVE_SLOP = 10;

export type InputKind = "mouse" | "touch";

interface Press {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly timer: number;
}

let press: Press | null = null;
/** Hides the tooltip a long press opened; the next tap anywhere calls it. */
let pressedTip: (() => void) | null = null;
let swallowClickUntil = 0;
let installed = false;
/** Shows a plain text tooltip for an element with a `title` but no tooltip of its own. */
let titleTip: ((element: Element, text: string) => () => void) | null = null;
/** Marks pointer-down events a tooltip handler already took care of. */
const handled = new WeakSet<Event>();

const isTouch = (e: { pointerType: string }) =>
  e.pointerType === "touch" || e.pointerType === "pen";

function cancelPress(): void {
  if (press) window.clearTimeout(press.timer);
  press = null;
}

/** Closes the tooltip a long press opened, if any. */
export function closePressedTip(): void {
  const hide = pressedTip;
  pressedTip = null;
  hide?.();
}

/** Starts a long press; `open` runs when the finger stays put long enough and returns the hide. */
function startPress(e: PointerEvent, open: () => () => void): void {
  cancelPress();
  handled.add(e);
  const timer = window.setTimeout(() => {
    press = null;
    closePressedTip();
    pressedTip = open();
    // The finger lifts after this: that click must not press the button underneath.
    swallowClickUntil = performance.now() + 1500;
    navigator.vibrate?.(8);
  }, LONG_PRESS_MS);
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, timer };
}

function setInput(kind: InputKind): void {
  if (document.documentElement.dataset.input !== kind)
    document.documentElement.dataset.input = kind;
}

/** The input the player used last. */
export function currentInput(): InputKind {
  return document.documentElement.dataset.input === "touch" ? "touch" : "mouse";
}

/** Lets the tooltip layer show `title` texts on a long press (the layer mounts once). */
export function setTitleTip(show: typeof titleTip): void {
  titleTip = show;
}

/** Installs the window listeners once; safe to call again. */
export function installTouch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  if (window.matchMedia?.("(hover: none) and (pointer: coarse)").matches) setInput("touch");
  else setInput("mouse");

  const opts = { capture: true } as const;
  window.addEventListener(
    "pointerdown",
    (e) => {
      setInput(isTouch(e) ? "touch" : "mouse");
      cancelPress();
      swallowClickUntil = 0;
      // The next tap outside closes the tooltip a long press opened; its own buttons still work.
      const onTip = e.target instanceof Element && e.target.closest("[data-tip-box]");
      if (pressedTip && isTouch(e) && !onTip) closePressedTip();
    },
    opts,
  );
  // After React: a press on an element without a tooltip handler may still show its title.
  window.addEventListener("pointerdown", (e) => {
    if (!isTouch(e) || handled.has(e) || !titleTip || !(e.target instanceof Element)) return;
    const el = e.target.closest("[title]");
    const text = el?.getAttribute("title");
    if (!el || !text) return;
    const show = titleTip;
    startPress(e, () => show(el, text));
  });
  window.addEventListener(
    "pointermove",
    (e) => {
      if (
        press &&
        e.pointerId === press.id &&
        Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_SLOP
      )
        cancelPress();
    },
    opts,
  );
  window.addEventListener("pointerup", cancelPress, opts);
  window.addEventListener("pointercancel", cancelPress, opts);
  window.addEventListener(
    "click",
    (e) => {
      if (performance.now() > swallowClickUntil) return;
      swallowClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    },
    opts,
  );
  // A long press must not open the browser menu, nor run an item's right-click action.
  window.addEventListener(
    "contextmenu",
    (e) => {
      if (currentInput() !== "touch") return;
      e.preventDefault();
      e.stopPropagation();
    },
    opts,
  );
  // Safari: no pinch zoom of the whole page (the trees and the map zoom on their own).
  for (const type of ["gesturestart", "gesturechange"]) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }
}

/**
 * Pointer and focus handlers for an element with a tooltip: the mouse shows it on hover, a
 * finger on a long press, the keyboard on focus. `show` returns nothing; `hide` closes it.
 */
export function tipHandlers(show: (element: Element) => void, hide: () => void) {
  // Only the focus that showed the tooltip hides it again (a click elsewhere blurs this element).
  let byFocus = false;
  return {
    onPointerEnter: (e: React.PointerEvent) => {
      if (!isTouch(e)) show(e.currentTarget);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (!isTouch(e)) hide();
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (!isTouch(e)) return;
      const el = e.currentTarget;
      startPress(e.nativeEvent, () => {
        show(el);
        return hide;
      });
    },
    onFocus: (e: React.FocusEvent) => {
      // A tap focuses a button on some browsers: only keyboard focus shows the tooltip.
      if (!focusVisible(e.currentTarget)) return;
      byFocus = true;
      show(e.currentTarget);
    },
    onBlur: () => {
      if (byFocus) hide();
      byFocus = false;
    },
  };
}

function focusVisible(el: Element): boolean {
  if (currentInput() === "touch") return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}
