import { ACTS, POC_GAME_DATA } from "@emberheir/content";
import { deriveStats, heroSetup } from "@emberheir/sim";
import { useState } from "react";
import { CombatDebug } from "../combat/CombatDebug";
import { CampView } from "./CampView";
import { CharacterOverlay } from "./CharacterOverlay";
import { FightView } from "./FightView";
import { Hud } from "./Hud";
import { IntermissionView } from "./IntermissionView";
import { KaelenOverlay } from "./KaelenOverlay";
import { RewardsView } from "./RewardsView";
import { TitleScreen } from "./TitleScreen";
import { useGame } from "./useGame";

type Overlay = "character" | "kaelen" | null;

/** The playable PoC: title → camp → Act 1 → camp. */
export function GameApp() {
  const game = useGame();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [lab, setLab] = useState(false);
  const { state } = game;

  if (lab) {
    return (
      <>
        <button type="button" className="back-link" onClick={() => setLab(false)}>
          ← Main menu
        </button>
        <CombatDebug />
      </>
    );
  }

  if (!state) {
    return (
      <TitleScreen onContinue={game.resume} onNewGame={game.start} onLab={() => setLab(true)} />
    );
  }

  const run = state.run;
  const maxLife = deriveStats(heroSetup(state, POC_GAME_DATA).setup).maxLife;
  const arena = ACTS.find((a) => a.id === run?.actId)?.arenaGradient;

  return (
    <div
      className="game"
      style={
        arena
          ? ({ "--arena-top": arena[0], "--arena-bottom": arena[1] } as React.CSSProperties)
          : undefined
      }
    >
      <Hud state={state}>
        {run?.phase !== "fight" && (
          <button type="button" onClick={() => setOverlay("character")}>
            Character
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOverlay(null);
            game.quit();
          }}
        >
          Menu
        </button>
      </Hud>

      {game.error && (
        <p className="error" role="alert">
          {game.error}{" "}
          <button type="button" onClick={game.clearError}>
            OK
          </button>
        </p>
      )}

      {!run && (
        <CampView
          state={state}
          game={game}
          onCharacter={() => setOverlay("character")}
          onKaelen={() => setOverlay("kaelen")}
        />
      )}
      {run?.phase === "intermission" && (
        <IntermissionView
          state={state}
          run={run}
          maxLife={maxLife}
          game={game}
          onCharacter={() => setOverlay("character")}
        />
      )}
      {run?.phase === "fight" && (
        <FightView key={run.encounter?.seed} state={state} run={run} game={game} />
      )}
      {run?.phase === "rewards" && (
        <RewardsView
          state={state}
          run={run}
          game={game}
          onOpenInventory={() => setOverlay("character")}
        />
      )}

      {overlay === "character" && run?.phase !== "fight" && (
        <CharacterOverlay state={state} game={game} onClose={() => setOverlay(null)} />
      )}
      {overlay === "kaelen" && !run && state.progress.trainerUnlocked && (
        <KaelenOverlay state={state} game={game} onClose={() => setOverlay(null)} />
      )}
    </div>
  );
}
