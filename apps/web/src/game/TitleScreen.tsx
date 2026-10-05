import { GAME_TITLE, ITEM_CATALOG, GAME_DATA } from "@emberheir/content";
import { SIM_VERSION, getBase } from "@emberheir/sim";
import { useState } from "react";
import { PREVIEW_PR } from "../storage";
import { Icon } from "../ui/Icon";
import type { SettingsApi } from "../ui/settings";
import { SettingsPanel } from "./MenuOverlay";
import { loadSave } from "./useGame";

const STARTER_TEXT: Record<string, { icon: "sword" | "wand"; lines: string[] }> = {
  sword: {
    icon: "sword",
    lines: [
      "Melee · Cooling Heat",
      "Getting hit builds Heat. It fades.",
      "Start Skill: Power Strike",
    ],
  },
  "fire-wand": {
    icon: "wand",
    lines: ["Ranged · Warming Heat", "Heat fills by itself over time.", "Start Skill: Firebolt"],
  },
};

export function TitleScreen(props: {
  settings: SettingsApi;
  onContinue: () => void;
  onNewGame: (starterWeapon: string) => void;
  onLab: () => void;
}) {
  const save = loadSave();
  const [page, setPage] = useState<"main" | "new" | "settings">("main");
  const buildDate = new Date(__BUILD_TIME__).toLocaleDateString("en-GB");
  return (
    <section className="screen title-screen" aria-label="Main menu">
      <div className="title-glow" aria-hidden="true" />
      <div className="title-content">
        <div className="logo-row">
          <span className="diamond" />
          <h1 className="title-logo title-font">{GAME_TITLE}</h1>
          <span className="diamond" />
        </div>
        <p className="title-sub">An heir. An ember. A harvest that never ends.</p>

        {page === "main" && (
          <div className="menu-buttons">
            {save && (
              <button type="button" className="btn big primary" onClick={props.onContinue}>
                Continue
                <small>
                  Generation {save.legacy.prestige + 1} · Level {save.hero.level} ·{" "}
                  {save.run ? `Act 1, Stage ${save.run.stage}` : "In the Camp"}
                </small>
              </button>
            )}
            <button
              type="button"
              className={`btn big ${save ? "" : "primary"}`}
              onClick={() => setPage("new")}
            >
              New Game
            </button>
            <button type="button" className="btn big" onClick={() => setPage("settings")}>
              Settings
            </button>
            <button type="button" className="link-button" onClick={props.onLab}>
              Combat Lab (dev)
            </button>
          </div>
        )}

        {page === "new" && (
          <div className="starter-pick">
            <h2 className="title-font">Choose your first weapon</h2>
            {save && <p className="warning">Starting a new game replaces your save.</p>}
            <div className="starter-cards">
              {GAME_DATA.starterWeapons.map((id) => {
                const info = STARTER_TEXT[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className="starter-card panel-card"
                    onClick={() => props.onNewGame(id)}
                  >
                    <Icon name={info?.icon ?? "sword"} size={48} color="var(--accent)" />
                    <strong className="title-font">{getBase(ITEM_CATALOG, id).name}</strong>
                    {info?.lines.map((l) => (
                      <span key={l} className="sub">
                        {l}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn" onClick={() => setPage("main")}>
              Back
            </button>
          </div>
        )}

        {page === "settings" && (
          <div className="title-settings panel-card">
            <SettingsPanel api={props.settings} />
            <button type="button" className="btn" onClick={() => setPage("main")}>
              Back
            </button>
          </div>
        )}
      </div>
      <footer className="build-info mono">
        Dev Preview · {PREVIEW_PR ? `PR #${PREVIEW_PR}` : "M4"} · {__BUILD_COMMIT__} · {buildDate} ·
        Sim {SIM_VERSION}
      </footer>
    </section>
  );
}
