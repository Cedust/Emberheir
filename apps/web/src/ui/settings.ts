import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import type { GraphicsQuality } from "../game/pixiPacing";
import { parseStored, storageKey } from "../storage";
import { SOUND_GROUPS, type SoundGroup, setSoundOptions } from "./sound";

/** Player settings (Settings mock): stored per browser, not in the save game. */
export interface Settings {
  readonly theme: "system" | "light" | "dark";
  readonly damageNumbers: boolean;
  readonly sound: boolean;
  /** Master volume, 0..1. */
  readonly volume: number;
  /** Each kind of sound on its own (Hover ticks, Clicks, Windows, Coins, Loot, Notifications). */
  readonly sounds: Readonly<Record<SoundGroup, boolean>>;
  /** Screen shake and camera zoom in fights. */
  readonly screenShake: boolean;
  /** Arena sharpness, particles and weather (`QUALITY` in pixiPacing.ts). */
  readonly graphicsQuality: GraphicsQuality;
  /** Old Nan's First Steps tips for new players (game/tips). */
  readonly tips: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  damageNumbers: true,
  sound: true,
  volume: 0.5,
  sounds: { hover: true, click: true, window: true, coin: true, loot: true, notice: true },
  screenShake: true,
  graphicsQuality: "medium",
  tips: true,
};

const soundsSchema = z.object(
  Object.fromEntries(SOUND_GROUPS.map((g) => [g, z.boolean().catch(true)])) as Record<
    SoundGroup,
    z.ZodCatch<z.ZodBoolean>
  >,
);

const KEY = storageKey("settings");

/**
 * The stored settings. Each field falls back to its default on its own, so one broken value (or
 * one from an older version) does not reset the others; fields that no longer exist are dropped.
 */
const settingsSchema: z.ZodType<Settings> = z
  .object({
    theme: z.enum(["system", "light", "dark"]).catch(DEFAULT_SETTINGS.theme),
    damageNumbers: z.boolean().catch(DEFAULT_SETTINGS.damageNumbers),
    sound: z.boolean().catch(DEFAULT_SETTINGS.sound),
    volume: z.number().min(0).max(1).catch(DEFAULT_SETTINGS.volume),
    sounds: soundsSchema.catch(DEFAULT_SETTINGS.sounds),
    screenShake: z.boolean().catch(DEFAULT_SETTINGS.screenShake),
    graphicsQuality: z.enum(["high", "medium", "low"]).catch(DEFAULT_SETTINGS.graphicsQuality),
    tips: z.boolean().catch(DEFAULT_SETTINGS.tips),
  })
  .catch(DEFAULT_SETTINGS);

/** Settings from their stored JSON (`null` = never saved). */
export function parseSettings(json: string | null): Settings {
  return parseStored(json, settingsSchema, DEFAULT_SETTINGS);
}

function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(
    () => setSoundOptions({ on: settings.sound, volume: settings.volume, groups: settings.sounds }),
    [settings.sound, settings.volume, settings.sounds],
  );
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage can be blocked; the setting still applies for this session.
      }
      return next;
    });
  }, []);
  return { settings, update };
}

export type SettingsApi = ReturnType<typeof useSettings>;
