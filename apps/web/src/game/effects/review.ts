import { z } from "zod";
import { parseStored, storageKey } from "../../storage";
import { type EffectEntry, VERDICT_LABEL } from "./effectList";

/**
 * Timo's own pick per effect in the gallery (keep or remove, a note), kept in the browser and
 * exported as JSON for the effect cleanup. A developer tool, not part of the save game.
 */
export type Choice = "keep" | "remove";

export interface Pick {
  readonly choice?: Choice | undefined;
  readonly note?: string | undefined;
}

export type Review = Readonly<Record<string, Pick>>;

const REVIEW_SCHEMA = z.record(
  z.string(),
  z.object({
    choice: z.enum(["keep", "remove"]).optional().catch(undefined),
    note: z.string().optional().catch(undefined),
  }),
);

const KEY = storageKey("effect-review");

export const CHOICE_LABEL: Record<Choice, string> = { keep: "Behalten", remove: "Entfernen" };

export function loadReview(): Review {
  try {
    return parseStored(localStorage.getItem(KEY), REVIEW_SCHEMA, {}) as Review;
  } catch {
    return {};
  }
}

export function saveReview(review: Review): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(review));
  } catch {
    // Private window or blocked storage: the picks last until the page closes.
  }
}

/** One effect's pick changed; an empty pick leaves the review. */
export function setPick(review: Review, id: string, pick: Pick): Review {
  const rest = Object.fromEntries(Object.entries(review).filter(([key]) => key !== id));
  const note = pick.note?.trim() ? pick.note : undefined;
  if (!pick.choice && !note) return rest;
  return {
    ...rest,
    [id]: { ...(pick.choice ? { choice: pick.choice } : {}), ...(note ? { note } : {}) },
  };
}

/** The review as JSON: every effect with my suggestion and Timo's pick (null = still open). */
export function exportReview(effects: readonly EffectEntry[], review: Review, now: Date): string {
  const rows = effects.map((e) => {
    const pick = review[e.id];
    return {
      id: e.id,
      group: e.group,
      name: e.name,
      suggestion: VERDICT_LABEL[e.verdict],
      choice: pick?.choice ?? null,
      ...(pick?.note ? { note: pick.note } : {}),
    };
  });
  return JSON.stringify(
    {
      kind: "emberheir-effect-review",
      version: 1,
      exportedAt: now.toISOString(),
      decided: rows.filter((r) => r.choice !== null).length,
      total: rows.length,
      effects: rows,
    },
    null,
    2,
  );
}
