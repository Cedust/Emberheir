import type { SettingsApi } from "../ui/settings";
import { Icon } from "../ui/Icon";
import { useEffect, useState } from "react";

export function SettingsPanel(props: { api: SettingsApi }) {
  const { settings, update } = props.api;
  return (
    <div className="settings">
      <div className="setting-row">
        <span>Theme</span>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={settings.theme === t}
              className={settings.theme === t ? "on" : ""}
              onClick={() => update({ theme: t })}
            >
              {t === "system" ? "System" : t === "light" ? "Parchment" : "Scorched"}
            </button>
          ))}
        </div>
      </div>
      <div className="setting-row">
        <span>Damage numbers</span>
        <div className="segmented" role="radiogroup" aria-label="Damage numbers">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={settings.damageNumbers === v}
              className={settings.damageNumbers === v ? "on" : ""}
              onClick={() => update({ damageNumbers: v })}
            >
              {v ? "On" : "Off"}
            </button>
          ))}
        </div>
      </div>
      <div className="setting-row">
        <span>Sound</span>
        <div className="segmented" role="radiogroup" aria-label="Sound">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={settings.sound === v}
              className={settings.sound === v ? "on" : ""}
              onClick={() => update({ sound: v })}
            >
              {v ? "On" : "Off"}
            </button>
          ))}
        </div>
      </div>
      <FullscreenRow />
    </div>
  );
}

/** Window or fullscreen (same as F11). Browsers only allow it after a click, so it is not saved. */
function FullscreenRow() {
  const [on, setOn] = useState(() => document.fullscreenElement !== null);
  useEffect(() => {
    const sync = () => setOn(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  if (!document.fullscreenEnabled) return null;
  const set = (v: boolean) => {
    if (v === on) return;
    const done = v ? document.documentElement.requestFullscreen() : document.exitFullscreen();
    done.catch(() => {});
  };
  return (
    <div className="setting-row">
      <span>Display</span>
      <div className="segmented" role="radiogroup" aria-label="Display">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on === v}
            className={on === v ? "on" : ""}
            onClick={() => set(v)}
          >
            {v ? "Fullscreen" : "Window"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Esc menu: Resume, Settings, Compendium, Quit to Title. The fight pauses while it is open. */
export function MenuOverlay(props: {
  settings: SettingsApi;
  inFight: boolean;
  onResume: () => void;
  onCompendium: () => void;
  onQuit: () => void;
}) {
  const [page, setPage] = useState<"main" | "settings">("main");
  return (
    <div className="overlay" role="dialog" aria-label="Menu">
      <div className="overlay-panel menu-panel">
        <header className="overlay-header">
          <span className="title-font big">{page === "main" ? "MENU" : "SETTINGS"}</span>
          <div className="grow" />
          {props.inFight && <span className="view-only title-font">FIGHT PAUSED</span>}
          <button type="button" className="icon-button" aria-label="Close" onClick={props.onResume}>
            <Icon name="close" size={20} />
          </button>
        </header>
        {page === "main" ? (
          <div className="menu-buttons">
            <button type="button" className="btn big primary" onClick={props.onResume}>
              Resume
            </button>
            <button type="button" className="btn big" onClick={() => setPage("settings")}>
              <Icon name="gear" size={18} /> Settings
            </button>
            <button type="button" className="btn big" onClick={props.onCompendium}>
              <Icon name="book" size={18} /> Compendium
            </button>
            <button type="button" className="btn big ghost" onClick={props.onQuit}>
              Quit to Title
            </button>
          </div>
        ) : (
          <>
            <SettingsPanel api={props.settings} />
            <button type="button" className="btn" onClick={() => setPage("main")}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
