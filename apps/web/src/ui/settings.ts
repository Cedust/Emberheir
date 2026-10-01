import { useCallback, useEffect, useState } from "react";

/** Player settings (Settings mock): stored per browser, not in the save game. */
export interface Settings {
  readonly theme: "system" | "light" | "dark";
  readonly damageNumbers: boolean;
  /** Auto-drink the Ember Flask before a stage below this Life fraction; 0 = off. */
  readonly autoFlask: number;
}

export const DEFAULT_SETTINGS: Settings = { theme: "system", damageNumbers: true, autoFlask: 0.4 };
export const AUTO_FLASK_OPTIONS = [0, 0.25, 0.4, 0.6] as const;

const KEY = "emberheir.settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      : DEFAULT_SETTINGS;
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
