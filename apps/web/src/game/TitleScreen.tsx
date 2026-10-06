import { GAME_DATA, GAME_TITLE } from "@emberheir/content";
import { type GameState, SIM_VERSION, getAct, heroTitle } from "@emberheir/sim";
import { useState } from "react";
import { PREVIEW_PR } from "../storage";
import { Icon } from "../ui/Icon";
import type { SettingsApi } from "../ui/settings";
import { ClassEmblem } from "./ClassEmblem";
import { ClassSelect } from "./ClassSelect";
import { SettingsPanel } from "./MenuOverlay";
import { loadLastSlot, loadSlots, saveSlot } from "./saves";
import type { NewCharacter } from "./useGame";

/** One line about where a character stands. */
function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Generation ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}

export function TitleScreen(props: {
  settings: SettingsApi;
  onContinue: (slot: number) => void;
  onNewGame: (character: NewCharacter) => void;
  onLab: () => void;
}) {
  const [slots, setSlots] = useState(loadSlots);
  const last = loadLastSlot();
  const lastSave = last !== null ? slots[last] : null;
  const free = slots.findIndex((s) => s === null);
  const [page, setPage] = useState<"main" | "characters" | "new" | "settings">("main");
  const [newSlot, setNewSlot] = useState(Math.max(0, free));
  const [selected, setSelected] = useState(
    last ??
      Math.max(
        0,
        slots.findIndex((s) => s !== null),
      ),
  );
  const [deleting, setDeleting] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const buildDate = new Date(__BUILD_TIME__).toLocaleDateString("en-GB");
  const hasCharacters = slots.some((s) => s !== null);
  const createIn = (slot: number) => {
    setNewSlot(slot);
    setPage("new");
  };
  const selectedSave = slots[selected] ?? null;

  if (page === "new") {
    return (
      <section className="screen title-screen class-screen" aria-label="New Heir">
        <ClassSelect
          slot={newSlot}
          settings={props.settings.settings}
          onBegin={props.onNewGame}
          onBack={() => setPage(hasCharacters ? "characters" : "main")}
        />
      </section>
    );
  }

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
            {lastSave && last !== null && (
              <button
                type="button"
                className="btn big primary"
                onClick={() => props.onContinue(last)}
              >
                Continue
                <small>
                  {lastSave.hero.name} · {heroTitle(lastSave, GAME_DATA)} · {whereText(lastSave)}
                </small>
              </button>
            )}
            {hasCharacters && (
              <button type="button" className="btn big" onClick={() => setPage("characters")}>
                Characters
              </button>
            )}
            <button
              type="button"
              className={`btn big ${lastSave ? "" : "primary"}`}
              onClick={() => (free >= 0 ? createIn(free) : setPage("characters"))}
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

        {page === "characters" && (
          <div className="character-select">
            <div className="slot-grid" role="listbox" aria-label="Characters">
              {slots.map((save, i) =>
                save ? (
                  <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    className={`slot-card panel-card ${i === selected ? "on" : ""}`}
                    onClick={() => {
                      setSelected(i);
                      setConfirmDelete(false);
                    }}
                    onDoubleClick={() => props.onContinue(i)}
                  >
                    <ClassEmblem classId={save.hero.classId} size={40} />
                    <span className="slot-text">
                      <strong className="title-font">{save.hero.name}</strong>
                      <span className="accent">{heroTitle(save, GAME_DATA)}</span>
                      <span className="sub small">{whereText(save)}</span>
                    </span>
                  </button>
                ) : (
                  <button
                    key={i}
                    type="button"
                    className="slot-card panel-card empty"
                    onClick={() => createIn(i)}
                  >
                    <Icon name="user" size={36} color="var(--text-sub)" />
                    <span className="title-font">New Heir</span>
                  </button>
                ),
              )}
            </div>
            {confirmDelete && selectedSave ? (
              <div className="delete-confirm panel-card" role="alertdialog" aria-label="Delete">
                <span>
                  Type <strong>{selectedSave.hero.name}</strong> to delete this Heir for good.
                </span>
                <input
                  aria-label="Name to delete"
                  value={deleting}
                  onChange={(e) => setDeleting(e.target.value)}
                />
                <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={deleting.trim() !== selectedSave.hero.name}
                  onClick={() => {
                    saveSlot(selected, null);
                    const next = loadSlots();
                    setSlots(next);
                    setConfirmDelete(false);
                    setDeleting("");
                    if (!next.some((s) => s !== null)) setPage("main");
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="slot-buttons">
                <button type="button" className="btn" onClick={() => setPage("main")}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!selectedSave}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="btn big primary"
                  disabled={!selectedSave}
                  onClick={() => props.onContinue(selected)}
                >
                  Play
                </button>
              </div>
            )}
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
