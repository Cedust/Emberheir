/**
 * Developer tools (Release 1.0, Timo 2026-11-09): Cheat Mode (F8), `?dev` (fight speed, Skip,
 * Combat Lab) and the pages `?effects`, `?sfx` and `?uikit`. They are built into the dev server,
 * the PR previews and the Playwright build only. The release on main (GitHub Pages and
 * Cloudflare) is built without them: the constant is `false` there, so the galleries are not
 * even in its files.
 */
export const DEV_TOOLS: boolean = __DEV_TOOLS__;

/** `?<name>` in the address, only where the developer tools exist. */
export const devParam = (name: string): boolean =>
  DEV_TOOLS && new URLSearchParams(window.location.search).has(name);
