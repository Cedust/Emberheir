import type { SettingsApi } from "../ui/settings";
import type { GraphicsQuality } from "./pixiPacing";
import { useNoteHover } from "../ui/ItemTooltip";
import { SOUND_GROUPS, type SoundGroup } from "../ui/sound";
import { Button } from "../ui/kit/Button";
import { ActionIcon, actionIcon } from "../ui/actionIcons";
import { Medallion, Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
import { useEffect, useState } from "react";
import { CreditsPanel } from "./Credits";

export function SettingsPanel(props: { api: SettingsApi }) {
  const { settings, update } = props.api;
  return (
    <div className="settings">
      <h3 className="settings-head title-font">Display</h3>
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
      <OnOffRow
        label="Damage numbers"
        value={settings.damageNumbers}
        onChange={(v) => update({ damageNumbers: v })}
      />
      <OnOffRow
        label="Screen shake"
        value={settings.screenShake}
        onChange={(v) => update({ screenShake: v })}
      />
      <QualityRow api={props.api} />
      <FullscreenRow />
      <OnOffRow
        label="Tips"
        tip="Old Nan's short tips the first time you reach something new."
        kind="Game"
        value={settings.tips}
        onChange={(v) => update({ tips: v })}
      />

      <h3 className="settings-head title-font">Sound</h3>
      <OnOffRow label="Sound" value={settings.sound} onChange={(v) => update({ sound: v })} />
      <div className={`setting-row${settings.sound ? "" : " muted"}`}>
        <span>Volume</span>
        <span className="setting-volume">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            aria-label="Volume"
            disabled={!settings.sound}
            value={Math.round(settings.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          />
          <b className="mono">{Math.round(settings.volume * 100)}%</b>
        </span>
      </div>
      {SOUND_GROUPS.map((g) => (
        <OnOffRow
          key={g}
          label={GROUP_LABEL[g].name}
          tip={GROUP_LABEL[g].explain}
          sub
          muted={!settings.sound}
          value={settings.sounds[g]}
          onChange={(v) => update({ sounds: { ...settings.sounds, [g]: v } })}
        />
      ))}
    </div>
  );
}

const GROUP_LABEL: Readonly<Record<SoundGroup, { name: string; explain: string }>> = {
  hover: { name: "Hover", explain: "A soft tick when the pointer touches a button." },
  click: { name: "Clicks", explain: "Buttons, tabs, and the knock of a blocked button." },
  window: { name: "Windows", explain: "The rustle when a window opens or closes." },
  coin: { name: "Coins", explain: "The ring when your currencies grow." },
  loot: { name: "Loot", explain: "Item and Rune drops, Boons." },
  notice: {
    name: "Notifications",
    explain: "A soft chime when a note slides in at the top right.",
  },
};

const QUALITY_LABEL: Readonly<Record<GraphicsQuality, string>> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Graphics Quality: how sharp the arena draws and how many particles fly (`QUALITY`). */
function QualityRow(props: { api: SettingsApi }) {
  const { settings, update } = props.api;
  const hover = useNoteHover({
    name: "Graphics quality",
    kind: "Display",
    explain: "Lower it if fights stutter: the arena draws a little softer, with fewer particles.",
  });
  return (
    <div className="setting-row">
      <span {...hover}>Graphics quality</span>
      <div className="segmented" role="radiogroup" aria-label="Graphics quality">
        {(["high", "medium", "low"] as const).map((q) => (
          <button
            key={q}
            type="button"
            role="radio"
            aria-checked={settings.graphicsQuality === q}
            className={settings.graphicsQuality === q ? "on" : ""}
            onClick={() => update({ graphicsQuality: q })}
          >
            {QUALITY_LABEL[q]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One On/Off switch. `sub` rows sit indented under Sound; `muted` greys them out. */
function OnOffRow(props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tip?: string;
  /** The tooltip's kind line (default Sound). */
  kind?: string;
  sub?: boolean;
  muted?: boolean;
}) {
  const hover = useNoteHover(
    props.tip ? { name: props.label, kind: props.kind ?? "Sound", explain: props.tip } : undefined,
  );
  return (
    <div className={`setting-row${props.sub ? " sub-row" : ""}${props.muted ? " muted" : ""}`}>
      <span {...hover}>{props.label}</span>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={props.value === v}
            className={props.value === v ? "on" : ""}
            disabled={props.muted}
            onClick={() => props.onChange(v)}
          >
            {v ? "On" : "Off"}
          </button>
        ))}
      </div>
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
  const [page, setPage] = useState<"main" | "settings" | "credits">("main");
  return (
    <WindowLayer>
      <Window
        label="Menu"
        role="dialog"
        className="menu-window"
        header={
          <WindowHeader
            title={page === "main" ? "Menu" : page === "settings" ? "Settings" : "Credits"}
            medallion={
              <Medallion image={actionIcon(page === "main" ? "menu" : page)} tint="#5a4218" />
            }
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
            <Button
              big
              art={<ActionIcon id="settings" size={32} />}
              onClick={() => setPage("settings")}
            >
              Settings
            </Button>
            <Button big art={<ActionIcon id="compendium" size={32} />} onClick={props.onCompendium}>
              Compendium
            </Button>
            {props.onCheats && (
              <Button big hotkey="F8" onClick={props.onCheats}>
                Cheats
              </Button>
            )}
            <Button
              big
              art={<ActionIcon id="credits" size={32} />}
              onClick={() => setPage("credits")}
            >
              Credits
            </Button>
            <Button big variant="ghost" onClick={props.onQuit}>
              Quit to Title
            </Button>
            <span className="menu-version mono">v{__APP_VERSION__}</span>
          </div>
        ) : page === "credits" ? (
          <div className="menu-settings">
            <CreditsPanel />
            <div className="menu-foot">
              <Button icon="prev" onClick={() => setPage("main")}>
                Back
              </Button>
            </div>
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
