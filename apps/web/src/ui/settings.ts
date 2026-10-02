import { useCallback, useEffect, useState } from "react";
import { storageKey } from "../storage";

/** Player settings (Settings mock): stored per browser, not in the save game. */
export interface Settings {
  readonly theme: "system" | "light" | "dark";
  readonly damageNumbers: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "system", damageNumbers: true };

const KEY = storageKey("settings");

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw
      ? pick({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) })
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Drops settings that no longer exist (e.g. the removed auto-drink) from old saves. */
function pick(s: Settings): Settings {
  return { theme: s.theme, damageNumbers: s.damageNumbers };
}

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  useEffect(() => applyTheme(settings.theme), [settings.theme]);
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
