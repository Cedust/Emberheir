import { useEffect, useSyncExternalStore } from "react";
import { storageKey } from "../storage";
import { isTypingTarget } from "./kit/hotkeys";

/**
 * Whether item tooltips and loot cards show the comparison with the equipped item. Off by
 * default; Shift turns it on and off everywhere. The choice stays in the browser.
 */

export const COMPARE_KEY = "Shift";
const KEY = storageKey("compare");

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let shown = load();
const listeners = new Set<() => void>();

export function setCompareShown(value: boolean): void {
  shown = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // No storage (private window): the choice lasts until reload.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while the comparison is shown. */
export function useCompareShown(): boolean {
  return useSyncExternalStore(subscribe, () => shown);
}

/** Listens for Shift and flips the comparison; mount once (the item hover layer). */
export function useCompareKey(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== COMPARE_KEY || e.repeat || isTypingTarget(e.target)) return;
      setCompareShown(!shown);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
