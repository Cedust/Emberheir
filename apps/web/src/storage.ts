import type { z } from "zod";

/**
 * PR previews on GitHub Pages share the origin (cedust.github.io) with the main preview, so
 * their browser storage is shared too. Each PR preview gets its own keys so playing it never
 * touches the main save. `VITE_PREVIEW_PR` is set by the PR preview workflow.
 */
export const PREVIEW_PR: string = import.meta.env.VITE_PREVIEW_PR ?? "";

export function storageKey(name: string, pr: string = PREVIEW_PR): string {
  return pr ? `emberheir.pr-${pr}.${name}` : `emberheir.${name}`;
}

/**
 * Reads a JSON value from the browser storage through its zod schema. Missing, broken or
 * wrongly shaped data gives `fallback`; a schema can repair single fields itself (`.catch`).
 */
export function parseStored<T>(json: string | null, schema: z.ZodType<T>, fallback: T): T {
  if (json === null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(json));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}
