import type { GameState } from "@emberheir/sim";
import { useState } from "react";
import { Dialog } from "../../ui/kit/Dialog";
import { WindowLayer } from "../../ui/kit/Window";
import type { GameApi } from "../useGame";
import { PersonaPortrait } from "./art/PersonaArt";
import { nanLines } from "./campPersonas";
import { useNanResets } from "./NanResets";

/**
 * Old Nan by the fire (ui-ux-plan-v1.md 4.5): the Hades dialogue box with her advice, and the
 * Compendium and her resets as answers.
 */
export function NanWindow(props: {
  state: GameState;
  game: GameApi;
  onCompendium: () => void;
  onClose: () => void;
}) {
  // A new piece of advice every time she is visited, and on "Tell me more".
  const lines = nanLines(props.state);
  const [line, setLine] = useState(() => Math.floor(Math.random() * lines.length));
  const resets = useNanResets(props.state, props.game);
  return (
    <WindowLayer>
      <div className="nan-stage">
        <Dialog
          name="Old Nan"
          role="Hearthkeeper"
          label="Old Nan, Hearthkeeper"
          portrait={<PersonaPortrait id="nan" />}
          answers={[
            { label: "Tell me more.", onPick: () => setLine((n) => n + 1) },
            { label: "Compendium", onPick: props.onCompendium },
            ...resets,
            { label: "Farewell.", onPick: props.onClose },
          ]}
        >
          “{lines[line % lines.length]}”
        </Dialog>
      </div>
    </WindowLayer>
  );
}
