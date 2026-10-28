/**
 * Theme tokens for the Pixi scenes. The canvases cannot use CSS variables themselves, so they
 * read the tokens of game.css here and redraw when the theme flips (OS setting or the Settings
 * switch).
 */

/** A token of :root as its CSS text, or `fallback` if it is not set. */
export function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** A hex colour token (`#rrggbb`) as a Pixi colour number. */
export function cssHex(name: string, fallback: number): number {
  const m = /^#([0-9a-f]{6})$/i.exec(cssVar(name, ""));
  return m?.[1] ? parseInt(m[1], 16) : fallback;
}

/** A number token, such as an alpha. */
export function cssNumber(name: string, fallback: number): number {
  const raw = cssVar(name, "");
  const v = Number(raw);
  return raw && Number.isFinite(v) ? v : fallback;
}

/** Mixes `a` towards `b` by `t` (0 = a, 1 = b). */
export function mixColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return m(16) | m(8) | m(0);
}

/** Calls `fn` whenever the theme flips; returns the unsubscribe. */
export function onThemeChange(fn: () => void): () => void {
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  const watch = new MutationObserver(fn);
  dark.addEventListener("change", fn);
  watch.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => {
    dark.removeEventListener("change", fn);
    watch.disconnect();
  };
}
