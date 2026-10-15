import { useEffect, useRef } from "react";

/**
 * One keyboard scheme for every screen (ui-ux-plan-v1.md 3.5): Esc closes, C/I/T/B/L open the
 * build windows, Q/E flip the tabs of the window on top.
 */
export const HOTKEYS = {
  close: "Esc",
  character: "C",
  inventory: "I",
  tree: "T",
  plan: "B",
  legacy: "L",
  prevTab: "Q",
  nextTab: "E",
} as const;

/** True while the player types into a field: then letters are text, not hotkeys. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

interface TabGroup {
  readonly ids: () => readonly string[];
  readonly active: () => string;
  readonly change: (id: string) => void;
}

/** Mounted tab bars, the newest last: Q/E act on the window on top. */
const groups: TabGroup[] = [];
let listening = false;

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
  const key = e.key.toLowerCase();
  if (key !== "q" && key !== "e") return;
  const group = groups[groups.length - 1];
  if (!group) return;
  const ids = group.ids();
  if (ids.length < 2) return;
  const next = stepTab(ids, group.active(), key === "e" ? 1 : -1);
  if (next !== undefined) {
    e.preventDefault();
    group.change(next);
  }
}

/** Neighbouring tab for Q (-1) or E (+1); wraps around. */
export function stepTab(ids: readonly string[], active: string, step: 1 | -1): string | undefined {
  if (ids.length === 0) return undefined;
  const at = Math.max(0, ids.indexOf(active));
  return ids[(at + step + ids.length) % ids.length];
}

/**
 * Lets Q and E switch between `ids` while this tab bar is the newest one on screen. Locked tabs
 * are simply left out of `ids`.
 */
export function useTabKeys(
  ids: readonly string[],
  active: string,
  onChange: (id: string) => void,
  enabled = true,
): void {
  const latest = useRef({ ids, active, onChange });
  useEffect(() => {
    latest.current = { ids, active, onChange };
  });
  useEffect(() => {
    if (!enabled) return;
    const group: TabGroup = {
      ids: () => latest.current.ids,
      active: () => latest.current.active,
      change: (id) => latest.current.onChange(id),
    };
    groups.push(group);
    if (!listening) {
      window.addEventListener("keydown", onKey);
      listening = true;
    }
    return () => {
      const i = groups.indexOf(group);
      if (i >= 0) groups.splice(i, 1);
      if (groups.length === 0 && listening) {
        window.removeEventListener("keydown", onKey);
        listening = false;
      }
    };
  }, [enabled]);
}
