import { devParam } from "../devTools";
import { GAME_DATA, GAME_SUBTITLE, GAME_TITLE } from "@emberheir/content";
import titleLogoUrl from "../assets/logo/title-logo.webp";
import { type GameState, SIM_VERSION, heroTitle } from "@emberheir/sim";
import { useState } from "react";
import { PREVIEW_PR } from "../storage";
import { Icon } from "../ui/Icon";
import { Button, HoldButton } from "../ui/kit/Button";
import type { SettingsApi } from "../ui/settings";
import { useStageSize } from "../ui/Stage";
import { CampLight } from "./camp/art/CampLight";
import { CampBackdrop, CampFx, SCENE_W, campLights } from "./camp/art/CampScene";
import { PaintDefs } from "./camp/art/paint";
import feathersUrl from "../assets/currency/feathers.webp";
import { ActionIcon, actionIcon } from "../ui/actionIcons";
import { Medallion, Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
import { HeirEmblem } from "./ClassEmblem";
import { ClassSelect } from "./ClassSelect";
import { StoryIntro } from "./intro/StoryIntro";
import { useTitleScene } from "./music/titleScene";
import { CreditsPanel } from "./Credits";
import { SettingsPanel } from "./MenuOverlay";
import { BackupPanel } from "./BackupPanel";
import { CloudChoice, CloudPlate, useCloudStart } from "./cloud/CloudUi";
import { continuePlace, whereText } from "./heirLine";
import { loadDamagedSlots, loadLastSlot, loadSlots, saveSlot } from "./saves";
import type { NewCharacter } from "./useGame";

/** The Combat Lab is a developer tool: it only shows with ?dev in the address. */
const DEV = devParam("dev");

/**
 * The story intro plays before every new Heir. Browser tests start straight at the class
 * select, unless they ask for the intro with ?intro.
 */
const PLAY_INTRO = !navigator.webdriver || new URLSearchParams(window.location.search).has("intro");

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

interface TitleProps {
  settings: SettingsApi;
  onContinue: (slot: number) => void;
  onNewGame: (character: NewCharacter) => void;
  onLab: () => void;
}

/**
 * The title. A signed-in device first syncs its saves with the cloud (cloud/CloudUi.tsx): the
 * menu reads the slots only after that.
 */
export function TitleScreen(props: TitleProps) {
  const start = useCloudStart();
  if (start.kind === "ready" || start.kind === "guest") return <TitleMenu {...props} />;
  return (
    <section className="screen title-screen" aria-label="Main menu">
      <TitleScene />
      <div className="title-content">
        <h1 className="title-logo">
          <img src={titleLogoUrl} alt="" draggable={false} />
          <span className="sr-only">{GAME_TITLE}</span>
        </h1>
        <CloudChoice start={start} />
      </div>
    </section>
  );
}

function TitleMenu(props: TitleProps) {
  const [slots, setSlots] = useState(loadSlots);
  // A save that does not load (changed by hand, broken) keeps its slot until it is deleted.
  const [damaged, setDamaged] = useState(loadDamagedSlots);
  const last = loadLastSlot();
  const lastSave = last !== null ? slots[last] : null;
  const free = slots.findIndex((s, i) => s === null && !damaged.includes(i));
  const [page, setPage] = useState<
    "main" | "characters" | "intro" | "new" | "settings" | "credits"
  >("main");
  // The class the Heir remembered in the story intro.
  const [remembered, setRemembered] = useState<string | null>(null);
  const [fromIntro, setFromIntro] = useState(false);
  const [newSlot, setNewSlot] = useState(Math.max(0, free));
  const [selected, setSelected] = useState(
    last ??
      Math.max(
        0,
        slots.findIndex((s) => s !== null),
      ),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  useTitleScene(page === "intro" || page === "new" ? "newHeir" : "menu");
  const buildDate = new Date(__BUILD_TIME__).toLocaleDateString("en-GB");
  const hasCharacters = slots.some((s) => s !== null) || damaged.length > 0;
  const createIn = (slot: number) => {
    setNewSlot(slot);
    setRemembered(null);
    setFromIntro(PLAY_INTRO);
    setPage(PLAY_INTRO ? "intro" : "new");
  };
  const selectedSave = slots[selected] ?? null;
  const selectedDamaged = damaged.includes(selected);

  if (page === "intro") {
    return (
      <StoryIntro
        onDone={(classId) => {
          setRemembered(classId);
          setPage("new");
        }}
      />
    );
  }

  if (page === "new") {
    return (
      <section
        className={`screen title-screen class-screen${fromIntro ? " from-intro" : ""}`}
        aria-label="New Heir"
      >
        <TitleScene />
        <ClassSelect
          slot={newSlot}
          initialClass={remembered}
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
        <h1 className="title-logo">
          <img src={titleLogoUrl} alt="" draggable={false} />
          <span className="sr-only">{GAME_TITLE}</span>
        </h1>
        <p className="title-subtitle">{GAME_SUBTITLE}</p>

        {(page === "main" || page === "settings" || page === "credits") && (
          <div className="menu-buttons">
            {lastSave && last !== null && (
              <Button
                big
                variant="primary"
                className="continue-btn"
                onClick={() => props.onContinue(last)}
              >
                Continue
                <ContinueLine save={lastSave} />
              </Button>
            )}
            <Button
              big
              art={<ActionIcon id="lineage" size={32} />}
              onClick={() => setPage("characters")}
            >
              Characters
            </Button>
            <Button
              big
              variant={lastSave ? "secondary" : "primary"}
              art={<ActionIcon src={feathersUrl} size={32} />}
              onClick={() => (free >= 0 ? createIn(free) : setPage("characters"))}
            >
              New Game
            </Button>
            <Button
              big
              art={<ActionIcon id="settings" size={32} />}
              onClick={() => setPage("settings")}
            >
              Settings
            </Button>
            <Button
              big
              art={<ActionIcon id="credits" size={32} />}
              onClick={() => setPage("credits")}
            >
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
                    <ActionIcon src={feathersUrl} size={40} />
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
      </div>
      <CloudPlate />
      {(page === "settings" || page === "credits") && (
        <WindowLayer>
          <Window
            label={page === "settings" ? "Settings" : "Credits"}
            role="dialog"
            className="menu-window"
            header={
              <WindowHeader
                title={page === "settings" ? "Settings" : "Credits"}
                medallion={<Medallion image={actionIcon(page)} tint="#5a4218" />}
                onClose={() => setPage("main")}
              />
            }
          >
            <div className="menu-settings">
              {page === "settings" ? <SettingsPanel api={props.settings} /> : <CreditsPanel />}
              <div className="menu-foot">
                <Button icon="prev" onClick={() => setPage("main")}>
                  Back
                </Button>
              </div>
            </div>
          </Window>
        </WindowLayer>
      )}
      <footer className="build-info mono">
        v{__APP_VERSION__}
        {PREVIEW_PR ? ` · PR #${PREVIEW_PR}` : ""} · {__BUILD_COMMIT__} · {buildDate} · Sim{" "}
        {SIM_VERSION}
      </footer>
    </section>
  );
}

/** Under Continue: "Cinderguard [12] · Ashen Fields [2]", the numbers are Level and Harvest. */
function ContinueLine(props: { save: GameState }) {
  const { save } = props;
  const harvest = save.legacy.prestige + 1;
  return (
    <small className="continue-line">
      <span>{heroTitle(save, GAME_DATA)}</span>
      <span className="continue-chip" title={`Level ${save.hero.level}`}>
        <span className="sr-only">Level </span>
        {save.hero.level}
      </span>
      <span className="continue-dot" aria-hidden="true" />
      <span>{continuePlace(save)}</span>
      <span className="continue-chip" title={`Harvest ${harvest}`}>
        <span className="sr-only">Harvest </span>
        {harvest}
      </span>
    </small>
  );
}
