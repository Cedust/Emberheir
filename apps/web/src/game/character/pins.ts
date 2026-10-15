import { createContext, useCallback, useContext, useState } from "react";
import { z } from "zod";
import { parseStored, storageKey } from "../../storage";

/**
 * Panels of the Stats tab the player pins to the Overview (at most three). Triggers and Legendary
 * Powers are lists too long for it, so they have no star. Stored per browser
 * like the settings, not in the save game.
 */
export const PANEL_IDS = [
  "damage",
  "bonuses",
  "ailments",
  "vitals",
  "avoidance",
  "resistances",
  "endurance",
  "heat",
  "heatSources",
] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export const MAX_PINS = 3;
export const DEFAULT_PINS: readonly PanelId[] = ["damage", "vitals", "heat"];

const KEY = storageKey("sheet-pins");

const isPanel = (id: string): id is PanelId => (PANEL_IDS as readonly string[]).includes(id);

/** Panels that no longer exist are dropped, doubles and extras too. */
const pinsSchema: z.ZodType<readonly PanelId[]> = z
  .array(z.string())
  .transform((ids) => [...new Set(ids.filter(isPanel))].slice(0, MAX_PINS));

/** Pins from their stored JSON (`null` = never saved): broken data gives the defaults. */
export function parsePins(json: string | null): readonly PanelId[] {
  return parseStored(json, pinsSchema, [...DEFAULT_PINS]);
}

function load(): readonly PanelId[] {
  try {
    return parsePins(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PINS;
  }
}

export interface PinApi {
  readonly pinned: readonly PanelId[];
  readonly toggle: (id: PanelId) => void;
}

export function usePins(): PinApi {
  const [pinned, setPinned] = useState<readonly PanelId[]>(load);
  const toggle = useCallback((id: PanelId) => {
    setPinned((prev) => {
      const next = prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < MAX_PINS
          ? [...prev, id]
          : prev;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage can be blocked; the pins still apply while the sheet is open.
      }
      return next;
    });
  }, []);
  return { pinned, toggle };
}

/** The Character Sheet's pins; plaques outside the sheet have no star. */
export const PinContext = createContext<PinApi | null>(null);

export function usePinContext(): PinApi | null {
  return useContext(PinContext);
}
