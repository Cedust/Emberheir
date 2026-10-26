import { Suspense, useEffect, useState } from "react";
import type { GameState } from "@emberheir/sim";
import { CombatDebug } from "../combat/CombatDebug";
import { ItemArtDefs } from "../ui/ItemArt";
import { ItemHoverLayer } from "../ui/ItemTooltip";
import { Stage } from "../ui/Stage";
import { useSettings } from "../ui/settings";
import { isTypingTarget } from "../ui/kit/hotkeys";
import { Presence, prefersReducedMotion, useUiSounds } from "../ui/kit/juice";
import { CHEATS_ENABLED, CheatPanel } from "./CheatPanel";
import { CharacterOverlay } from "./CharacterOverlay";
import { Compendium } from "./Compendium";
import { IntermissionView } from "./intermission/IntermissionView";
import { MenuOverlay } from "./MenuOverlay";
import { EndingScreen, NoticeScreen } from "./NoticeScreen";
import { HarvestBurn, PrestigeView } from "./PrestigeView";
import { TitleScreen } from "./TitleScreen";
import { BattleView } from "./lazyViews";
import { CampView } from "./camp/CampView";
import type { CampTarget } from "./camp/campPersonas";
import { KaelenView } from "./camp/KaelenView";
import { TrainingDummyView } from "./camp/TrainingDummyTab";
import { LegacyView } from "./camp/LegacyView";
import { PersonaView } from "./camp/PersonaView";
import type { PersonaId } from "./camp/personaDefs";
import { StashView } from "./camp/StashView";
import { useGame } from "./useGame";

type Overlay = "character" | "tree" | "plan" | "menu" | "compendium" | "cheats" | null;
type CampScreen = "legacy" | "persona" | "kaelen" | "dummy" | "stash" | "road" | "nan" | null;

/** The game: title → camp → Act 1 → camp, on a full-window, resolution-independent stage. */
export function GameApp() {
  const game = useGame();
  const settings = useSettings();
  useUiSounds();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [campScreen, setCampScreen] = useState<CampScreen>(null);
  const [persona, setPersona] = useState<PersonaId>("thoric");
  const [kaelenTab, setKaelenTab] = useState<"tree" | "plan">("tree");
  const [lab, setLab] = useState(false);
  // The Harvest as it was when Let It Burn was pressed: it burns away over the Camp.
  const [burning, setBurning] = useState<{ state: GameState; branch: string | undefined } | null>(
    null,
  );
  const { state } = game;
  const run = state?.run ?? null;
  const inFight = run?.phase === "fight";

  const toggle = (o: Exclude<Overlay, null>) => setOverlay((cur) => (cur === o ? null : o));

  // Hotkeys (ui-ux-plan-v1.md 3.5): Esc = close or Menu, C/I = Character, T = Ash Tree,
  // B = Battle Plan, L = Legacy (Camp), F8 = Cheats (Cheat Mode). Q/E flip tabs (ui/kit/hotkeys).
  useEffect(() => {
    if (!state || lab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
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
      } else if (overlay === "menu" || overlay === "cheats") {
        return;
      } else if (key === "c" || key === "i") {
        setOverlay((cur) => (cur === "character" ? null : "character"));
      } else if (key === "t" || key === "b") {
        // Mid-fight the Battle Plan is locked, so B shows the tree like T.
        const tab = key === "t" || inFight ? "tree" : "plan";
        if (run) {
          setOverlay((cur) => (cur === "tree" || cur === "plan" ? null : tab));
        } else {
          setOverlay(null);
          setKaelenTab(tab);
          setCampScreen((cur) => (cur === "kaelen" ? null : "kaelen"));
        }
      } else if (key === "l" && !run) {
        setOverlay(null);
        setCampScreen((cur) => (cur === "legacy" ? null : "legacy"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, lab, overlay, run, campScreen, inFight]);

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
      case "kaelen":
        setKaelenTab("tree");
        setCampScreen("kaelen");
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
  let campWindow: React.ReactNode = null;
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
    screen = (
      <PrestigeView
        key={state.nonce}
        state={state}
        game={game}
        onBurn={(branch) => {
          setCampScreen(null);
          if (!prefersReducedMotion()) setBurning({ state, branch });
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
    // The camera leans in on whoever's window is open (ui-ux-plan-v1.md 3.2).
    const focus =
      overlay === "character"
        ? "heir"
        : campScreen === "persona"
          ? persona
          : campScreen === "stash"
            ? "wagon"
            : campScreen === "road"
              ? "eldrin"
              : campScreen === "nan"
                ? "nan"
                : null;
    const camp = (
      <CampView
        state={state}
        game={game}
        panel={campScreen === "road" || campScreen === "nan" ? campScreen : null}
        onOpen={openCamp}
        onClosePanel={close}
        focus={focus}
        zoom={settings.settings.screenShake}
        onMenu={() => setOverlay("menu")}
      />
    );
    // Persona and Supply Wagon windows float over the dimmed Camp (ui-ux-plan-v1.md 3.2);
    // Kaelen and the Legacy need the whole stage and cover it.
    if (campScreen === "persona") {
      screen = camp;
      campWindow = (
        <PersonaView
          state={state}
          game={game}
          persona={persona}
          onPersona={setPersona}
          onClose={close}
        />
      );
    } else if (campScreen === "stash") {
      screen = camp;
      campWindow = <StashView state={state} game={game} onClose={close} />;
    } else if (campScreen === "kaelen") {
      screen = (
        <KaelenView
          key={kaelenTab}
          state={state}
          game={game}
          viewOnly={false}
          initialTab={kaelenTab}
          onClose={close}
        />
      );
    } else if (campScreen === "dummy") {
      screen = <TrainingDummyView state={state} game={game} onClose={close} />;
    } else if (campScreen === "legacy") {
      screen = <LegacyView state={state} onClose={close} />;
    } else {
      screen = camp;
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
        settings={settings.settings}
        covered={overlay !== null}
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
        <div className="screen-host" data-covered={overlay || campWindow ? "" : undefined}>
          {screen}
        </div>
        {burning && (
          <HarvestBurn onDone={() => setBurning(null)}>
            <PrestigeView state={burning.state} game={game} frozen={{ branch: burning.branch }} />
          </HarvestBurn>
        )}
        <Presence>{campWindow}</Presence>
        {/* On the road, Character and Ash Tree are windows over the arena with the arena
            around them (ui-ux-plan-v1.md 3.4). */}
        <div className={run ? "road-windows" : "camp-windows"}>
          <Presence>
            {state && !state.notice && !state.pendingPrestige && overlay === "character" && (
              <CharacterOverlay
                state={state}
                game={game}
                inFight={inFight}
                onClose={() => setOverlay(null)}
              />
            )}
          </Presence>
          <Presence>
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
          </Presence>
        </div>
        {state && overlay === "compendium" && (
          <Compendium state={state} onClose={() => setOverlay(null)} />
        )}
        <Presence>
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
        </Presence>
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
