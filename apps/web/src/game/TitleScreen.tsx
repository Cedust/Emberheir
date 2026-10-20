import { GAME_DATA, GAME_TITLE } from "@emberheir/content";
import { type GameState, SIM_VERSION, getAct, heroTitle } from "@emberheir/sim";
import { useState } from "react";
import { PREVIEW_PR } from "../storage";
import { Icon } from "../ui/Icon";
import { Button, HoldButton } from "../ui/kit/Button";
import type { SettingsApi } from "../ui/settings";
import { useStageSize } from "../ui/Stage";
import { CampLight } from "./camp/art/CampLight";
import { CampBackdrop, CampFx, SCENE_W, campLights } from "./camp/art/CampScene";
import { PaintDefs } from "./camp/art/paint";
import { HeirEmblem } from "./ClassEmblem";
import { ClassSelect } from "./ClassSelect";
import { CreditsPanel } from "./Credits";
import { SettingsPanel } from "./MenuOverlay";
import { BackupPanel } from "./BackupPanel";
import { loadDamagedSlots, loadLastSlot, loadSlots, saveSlot } from "./saves";
import type { NewCharacter } from "./useGame";

/** One line about where a character stands. */
function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Generation ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}

/** The Combat Lab is a developer tool: it only shows with ?dev in the address. */
const DEV = new URLSearchParams(window.location.search).has("dev");

/** The Camp at night behind the title: the same painting, fire and light as the Camp. */
function TitleScene() {
  const size = useStageSize();
  const ox = (size.w - SCENE_W) / 2;
  return (
    <div className="title-scene" aria-hidden="true">
      <PaintDefs />
      <CampBackdrop w={size.w} h={size.h} ox={ox} />
      <CampFx w={size.w} h={size.h} ox={ox} />
      <CampLight w={size.w} h={size.h} ox={ox} lights={campLights({ orb: false })} />
      <div className="title-veil" />
    </div>
  );
}

export function TitleScreen(props: {
  settings: SettingsApi;
  onContinue: (slot: number) => void;
  onNewGame: (character: NewCharacter) => void;
  onLab: () => void;
}) {
  const [slots, setSlots] = useState(loadSlots);
  // A save that does not load (changed by hand, broken) keeps its slot until it is deleted.
  const [damaged, setDamaged] = useState(loadDamagedSlots);
  const last = loadLastSlot();
  const lastSave = last !== null ? slots[last] : null;
  const free = slots.findIndex((s, i) => s === null && !damaged.includes(i));
  const [page, setPage] = useState<"main" | "characters" | "new" | "settings" | "credits">("main");
  const [newSlot, setNewSlot] = useState(Math.max(0, free));
  const [selected, setSelected] = useState(
    last ??
      Math.max(
        0,
        slots.findIndex((s) => s !== null),
      ),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const buildDate = new Date(__BUILD_TIME__).toLocaleDateString("en-GB");
  const hasCharacters = slots.some((s) => s !== null) || damaged.length > 0;
  const createIn = (slot: number) => {
    setNewSlot(slot);
    setPage("new");
  };
  const selectedSave = slots[selected] ?? null;
  const selectedDamaged = damaged.includes(selected);

  if (page === "new") {
    return (
      <section className="screen title-screen class-screen" aria-label="New Heir">
        <TitleScene />
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
      <TitleScene />
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
              <Button big variant="primary" onClick={() => props.onContinue(last)}>
                Continue
                <small>
                  {heroTitle(lastSave, GAME_DATA)} · {whereText(lastSave)}
                </small>
              </Button>
            )}
            <Button big icon="user" onClick={() => setPage("characters")}>
              Characters
            </Button>
            <Button
              big
              variant={lastSave ? "secondary" : "primary"}
              icon="fire"
              onClick={() => (free >= 0 ? createIn(free) : setPage("characters"))}
            >
              New Game
            </Button>
            <Button big icon="gear" onClick={() => setPage("settings")}>
              Settings
            </Button>
            <Button big icon="star" onClick={() => setPage("credits")}>
              Credits
            </Button>
            {DEV && (
              <Button variant="ghost" onClick={props.onLab}>
                Combat Lab
              </Button>
            )}
            {DEV && (
              <Button variant="ghost" onClick={() => window.location.assign("?effects")}>
                Effect Gallery
              </Button>
            )}
          </div>
        )}

        {page === "characters" && (
          <div className="character-select">
            <div className="slot-grid" role="listbox" aria-label="Characters">
              {slots.map((save, i) =>
                damaged.includes(i) ? (
                  <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    className={`slot-card panel-card damaged ${i === selected ? "on" : ""}`}
                    onClick={() => {
                      setSelected(i);
                      setConfirmDelete(false);
                    }}
                  >
                    <Icon name="warning" size={36} color="var(--accent)" />
                    <span className="slot-text">
                      <strong className="title-font">Damaged save</strong>
                      <span className="sub small">
                        It was changed or broke. Delete it to free the slot.
                      </span>
                    </span>
                  </button>
                ) : save ? (
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
                    <HeirEmblem
                      classId={save.hero.classId}
                      mastery={save.legacy.branches[0]}
                      size={48}
                    />
                    <span className="slot-text">
                      <strong className="title-font">{heroTitle(save, GAME_DATA)}</strong>
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
            {confirmDelete && (selectedSave || selectedDamaged) ? (
              <div className="delete-confirm panel-card" role="alertdialog" aria-label="Delete">
                <span>Delete this Heir for good?</span>
                <Button onClick={() => setConfirmDelete(false)}>Keep</Button>
                <HoldButton
                  icon="trash"
                  onConfirm={() => {
                    saveSlot(selected, null);
                    const next = loadSlots();
                    const broken = loadDamagedSlots();
                    setSlots(next);
                    setDamaged(broken);
                    setConfirmDelete(false);
                    if (!next.some((s) => s !== null) && broken.length === 0) setPage("main");
                  }}
                >
                  Delete
                </HoldButton>
              </div>
            ) : (
              <div className="slot-buttons">
                <Button icon="prev" onClick={() => setPage("main")}>
                  Back
                </Button>
                <Button
                  variant="ghost"
                  icon="trash"
                  blocked={selectedSave || selectedDamaged ? null : "No Heir chosen"}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
                <Button
                  big
                  variant="primary"
                  blocked={selectedSave ? null : "No Heir chosen"}
                  onClick={() => props.onContinue(selected)}
                >
                  Play
                </Button>
              </div>
            )}
            <BackupPanel />
          </div>
        )}

        {page === "credits" && (
          <div className="title-settings k-window">
            <CreditsPanel />
            <div className="menu-foot">
              <Button icon="prev" onClick={() => setPage("main")}>
                Back
              </Button>
            </div>
          </div>
        )}

        {page === "settings" && (
          <div className="title-settings k-window">
            <SettingsPanel api={props.settings} />
            <div className="menu-foot">
              <Button icon="prev" onClick={() => setPage("main")}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
      <footer className="build-info mono">
        v{__APP_VERSION__}
        {PREVIEW_PR ? ` · PR #${PREVIEW_PR}` : ""} · {__BUILD_COMMIT__} · {buildDate} · Sim{" "}
        {SIM_VERSION}
      </footer>
    </section>
  );
}
