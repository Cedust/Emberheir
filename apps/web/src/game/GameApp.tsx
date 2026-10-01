import { useEffect, useState } from "react";
import { CombatDebug } from "../combat/CombatDebug";
import { Stage } from "../ui/Stage";
import { useSettings } from "../ui/settings";
import { CharacterOverlay } from "./CharacterOverlay";
import { Compendium } from "./Compendium";
import { IntermissionView } from "./IntermissionView";
import { MenuOverlay } from "./MenuOverlay";
import { NoticeScreen } from "./NoticeScreen";
import { TitleScreen } from "./TitleScreen";
import { BattleView } from "./battle/BattleView";
import { type CampTarget, CampView } from "./camp/CampView";
import { KaelenView } from "./camp/KaelenView";
import { LegacyView } from "./camp/LegacyView";
import { type PersonaId, PersonaView } from "./camp/PersonaView";
import { StashView } from "./camp/StashView";
import { useGame } from "./useGame";

type Overlay = "character" | "tree" | "menu" | "compendium" | null;
type CampScreen = "legacy" | "persona" | "kaelen" | "stash" | null;

/** The playable PoC: title → camp → Act 1 → camp, on a 1440 × 900 stage. */
export function GameApp() {
  const game = useGame();
  const settings = useSettings();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [campScreen, setCampScreen] = useState<CampScreen>(null);
  const [persona, setPersona] = useState<PersonaId>("thoric");
  const [lab, setLab] = useState(false);
  const { state } = game;
  const run = state?.run ?? null;
  const inFight = run?.phase === "fight";
  const trainer = state?.progress.trainerUnlocked ?? false;

  const toggle = (o: Exclude<Overlay, null>) => setOverlay((cur) => (cur === o ? null : o));

  // Hotkeys: C = Character, T = Skill Tree, Esc = close or Menu.
  useEffect(() => {
    if (!state || lab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (state.notice) return;
      const key = e.key.toLowerCase();
      if (key === "escape") {
        if (overlay) setOverlay(null);
        else if (!run && campScreen) setCampScreen(null);
        else setOverlay("menu");
      } else if (key === "c" && overlay !== "menu") {
        setOverlay((cur) => (cur === "character" ? null : "character"));
      } else if (key === "t" && overlay !== "menu" && trainer) {
        if (run) setOverlay((cur) => (cur === "tree" ? null : "tree"));
        else setCampScreen((cur) => (cur === "kaelen" ? null : "kaelen"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, lab, overlay, run, campScreen, trainer]);

  if (lab) {
    return (
      <div className="shell">
        <button type="button" className="back-link" onClick={() => setLab(false)}>
          ← Main menu
        </button>
        <CombatDebug />
      </div>
    );
  }

  const openCamp = (target: CampTarget) => {
    switch (target) {
      case "character":
        setOverlay("character");
        break;
      case "compendium":
        setOverlay("compendium");
        break;
      case "forge":
        setPersona("thoric");
        setCampScreen("persona");
        break;
      case "altar":
        setPersona("liora");
        setCampScreen("persona");
        break;
      default:
        setCampScreen(target);
    }
  };

  let screen: React.ReactNode;
  if (!state) {
    screen = (
      <TitleScreen
        settings={settings}
        onContinue={game.resume}
        onNewGame={game.start}
        onLab={() => setLab(true)}
      />
    );
  } else if (state.notice) {
    screen = (
      <NoticeScreen
        notice={state.notice}
        onDismiss={() => {
          setCampScreen(null);
          game.dispatch({ type: "dismissNotice" });
        }}
      />
    );
  } else if (!run) {
    const close = () => setCampScreen(null);
    if (campScreen === "persona") {
      screen = (
        <PersonaView
          state={state}
          game={game}
          persona={persona}
          onPersona={setPersona}
          onClose={close}
        />
      );
    } else if (campScreen === "stash") {
      screen = <StashView state={state} game={game} onClose={close} />;
    } else if (campScreen === "kaelen" && trainer) {
      screen = <KaelenView state={state} game={game} viewOnly={false} onClose={close} />;
    } else if (campScreen === "legacy") {
      screen = <LegacyView state={state} onClose={close} />;
    } else {
      screen = (
        <CampView state={state} game={game} onOpen={openCamp} onMenu={() => setOverlay("menu")} />
      );
    }
  } else if (run.phase === "fight") {
    screen = (
      <BattleView
        key={run.encounter?.seed}
        state={state}
        run={run}
        game={game}
        settings={settings.settings}
        paused={overlay !== null}
        onCharacter={() => toggle("character")}
        onTree={() => toggle("tree")}
        onMenu={() => setOverlay("menu")}
      />
    );
  } else {
    screen = (
      <IntermissionView
        state={state}
        run={run}
        game={game}
        settings={settings.settings}
        onCharacter={() => toggle("character")}
        onTree={() => toggle("tree")}
        onMenu={() => setOverlay("menu")}
      />
    );
  }

  return (
    <Stage>
      {screen}
      {state && !state.notice && overlay === "character" && (
        <CharacterOverlay
          state={state}
          game={game}
          inFight={inFight}
          onClose={() => setOverlay(null)}
        />
      )}
      {state && overlay === "tree" && trainer && (
        <KaelenView state={state} game={game} viewOnly onClose={() => setOverlay(null)} />
      )}
      {state && overlay === "compendium" && <Compendium onClose={() => setOverlay(null)} />}
      {state && overlay === "menu" && (
        <MenuOverlay
          settings={settings}
          inFight={inFight}
          onResume={() => setOverlay(null)}
          onCompendium={() => setOverlay("compendium")}
          onQuit={() => {
            setOverlay(null);
            setCampScreen(null);
            game.quit();
          }}
        />
      )}
      {game.error && (
        <div className="toast" role="alert">
          {game.error}
          <button type="button" className="btn" onClick={game.clearError}>
            OK
          </button>
        </div>
      )}
    </Stage>
  );
}
