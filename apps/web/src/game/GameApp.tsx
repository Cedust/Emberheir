import { Suspense, useEffect, useState } from "react";
import { CombatDebug } from "../combat/CombatDebug";
import { ItemArtDefs } from "../ui/ItemArt";
import { ItemHoverLayer } from "../ui/ItemTooltip";
import { Stage } from "../ui/Stage";
import { useSettings } from "../ui/settings";
import { CHEATS_ENABLED, CheatPanel } from "./CheatPanel";
import { CharacterOverlay } from "./CharacterOverlay";
import { Compendium } from "./Compendium";
import { TriggerCodex } from "./camp/TriggerCodex";
import { IntermissionView } from "./IntermissionView";
import { MenuOverlay } from "./MenuOverlay";
import { EndingScreen, NoticeScreen } from "./NoticeScreen";
import { InheritanceView, PrestigeView } from "./PrestigeView";
import { TitleScreen } from "./TitleScreen";
import { BattleView } from "./lazyViews";
import { type CampTarget, CampView } from "./camp/CampView";
import { KaelenView } from "./camp/KaelenView";
import { LegacyView } from "./camp/LegacyView";
import { type PersonaId, PersonaView } from "./camp/PersonaView";
import { StashView } from "./camp/StashView";
import { useGame } from "./useGame";

type Overlay = "character" | "tree" | "plan" | "menu" | "compendium" | "codex" | "cheats" | null;
type CampScreen = "legacy" | "persona" | "kaelen" | "stash" | null;

/** The game: title → camp → Act 1 → camp, on a full-window, resolution-independent stage. */
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

  const toggle = (o: Exclude<Overlay, null>) => setOverlay((cur) => (cur === o ? null : o));

  // Hotkeys: C = Character, T = Skill Tree, Esc = close or Menu, F8 = Cheats (Cheat Mode).
  useEffect(() => {
    if (!state || lab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "F8" && CHEATS_ENABLED) {
        e.preventDefault();
        setOverlay((cur) => (cur === "cheats" ? null : "cheats"));
        return;
      }
      if (state.notice || state.pendingPrestige) return;
      const key = e.key.toLowerCase();
      if (key === "escape") {
        if (overlay) setOverlay(null);
        else if (!run && campScreen) setCampScreen(null);
        else setOverlay("menu");
      } else if (key === "c" && overlay !== "menu") {
        setOverlay((cur) => (cur === "character" ? null : "character"));
      } else if (key === "t" && overlay !== "menu") {
        if (run) setOverlay((cur) => (cur === "tree" || cur === "plan" ? null : "tree"));
        else setCampScreen((cur) => (cur === "kaelen" ? null : "kaelen"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, lab, overlay, run, campScreen]);

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
      case "codex":
        setOverlay("codex");
        break;
      case "forge":
        setPersona("thoric");
        setCampScreen("persona");
        break;
      case "altar":
        setPersona("liora");
        setCampScreen("persona");
        break;
      case "shop":
        setPersona("marisha");
        setCampScreen("persona");
        break;
      case "runes":
        setPersona("nyssa");
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
  } else if (state.pendingPrestige) {
    screen = <PrestigeView key={state.nonce} state={state} game={game} />;
  } else if (state.notice?.kind === "prestige") {
    screen = (
      <InheritanceView
        state={state}
        onWake={() => {
          setCampScreen(null);
          game.dispatch({ type: "dismissNotice" });
        }}
      />
    );
  } else if (state.notice?.kind === "ending") {
    screen = (
      <EndingScreen
        state={state}
        onDismiss={() => {
          setCampScreen(null);
          game.dispatch({ type: "dismissNotice" });
        }}
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
    } else if (campScreen === "kaelen") {
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
      <Suspense fallback={null}>
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
      </Suspense>
    );
  } else {
    screen = (
      <IntermissionView
        state={state}
        run={run}
        game={game}
        onCharacter={() => toggle("character")}
        onTree={() => toggle("tree")}
        onPlan={() => toggle("plan")}
        onMenu={() => setOverlay("menu")}
      />
    );
  }

  return (
    <Stage>
      <ItemArtDefs />
      <ItemHoverLayer state={state}>
        {/* Under an open overlay the screen's idle animations wait (screens.css). */}
        <div className="screen-host" data-covered={overlay ? "" : undefined}>
          {screen}
        </div>
        {state && !state.notice && !state.pendingPrestige && overlay === "character" && (
          <CharacterOverlay
            state={state}
            game={game}
            inFight={inFight}
            onClose={() => setOverlay(null)}
          />
        )}
        {state && (overlay === "tree" || overlay === "plan") && (
          <KaelenView
            key={overlay}
            state={state}
            game={game}
            viewOnly
            planEditable={!inFight}
            initialTab={overlay === "plan" ? "plan" : "tree"}
            onClose={() => setOverlay(null)}
          />
        )}
        {state && overlay === "compendium" && <Compendium onClose={() => setOverlay(null)} />}
        {state && overlay === "codex" && (
          <TriggerCodex state={state} game={game} onClose={() => setOverlay(null)} />
        )}
        {state && overlay === "menu" && (
          <MenuOverlay
            settings={settings}
            inFight={inFight}
            onResume={() => setOverlay(null)}
            onCompendium={() => setOverlay("compendium")}
            onCheats={CHEATS_ENABLED ? () => setOverlay("cheats") : undefined}
            onQuit={() => {
              setOverlay(null);
              setCampScreen(null);
              game.quit();
            }}
          />
        )}
        {state && overlay === "cheats" && (
          <CheatPanel state={state} game={game} onClose={() => setOverlay(null)} />
        )}
        {game.error && (
          <div className="toast" role="alert">
            {game.error}
            <button type="button" className="btn" onClick={game.clearError}>
              OK
            </button>
          </div>
        )}
      </ItemHoverLayer>
    </Stage>
  );
}
