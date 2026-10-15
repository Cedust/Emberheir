import type { SettingsApi } from "../ui/settings";
import { Button } from "../ui/kit/Button";
import { Medallion, Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
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
        <span>Screen shake</span>
        <div className="segmented" role="radiogroup" aria-label="Screen shake">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={settings.screenShake === v}
              className={settings.screenShake === v ? "on" : ""}
              onClick={() => update({ screenShake: v })}
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
  /** Cheat Mode only. */
  onCheats?: (() => void) | undefined;
  onQuit: () => void;
}) {
  const [page, setPage] = useState<"main" | "settings">("main");
  return (
    <WindowLayer>
      <Window
        label="Menu"
        role="dialog"
        className="menu-window"
        header={
          <WindowHeader
            title={page === "main" ? "Menu" : "Settings"}
            medallion={<Medallion icon={page === "main" ? "menu" : "gear"} tint="#5a4218" />}
            right={props.inFight && <span className="view-only title-font">FIGHT PAUSED</span>}
            onClose={props.onResume}
          />
        }
      >
        {page === "main" ? (
          <div className="menu-buttons">
            <Button big variant="primary" onClick={props.onResume}>
              Resume
            </Button>
            <Button big icon="gear" onClick={() => setPage("settings")}>
              Settings
            </Button>
            <Button big icon="book" onClick={props.onCompendium}>
              Compendium
            </Button>
            {props.onCheats && (
              <Button big hotkey="F8" onClick={props.onCheats}>
                Cheats
              </Button>
            )}
            <Button big variant="ghost" onClick={props.onQuit}>
              Quit to Title
            </Button>
          </div>
        ) : (
          <div className="menu-settings">
            <SettingsPanel api={props.settings} />
            <div className="menu-foot">
              <Button icon="prev" onClick={() => setPage("main")}>
                Back
              </Button>
            </div>
          </div>
        )}
      </Window>
    </WindowLayer>
  );
}
