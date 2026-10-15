import type { GameState } from "@emberheir/sim";
import { useState } from "react";
import { Button } from "../../ui/kit/Button";
import { Wallet } from "../../ui/kit/Currency";
import { Medallion, Window, WindowHeader, WindowLayer } from "../../ui/kit/Window";
import type { GameApi } from "../useGame";
import { PersonaPortrait } from "./art/PersonaArt";
import { NAN_LINES } from "./campPersonas";
import { NanResets } from "./NanResets";

/** Old Nan by the fire: a word of advice, the Compendium and the Codex, and her resets. */
export function NanWindow(props: {
  state: GameState;
  game: GameApi;
  onCompendium: () => void;
  onCodex: () => void;
  onClose: () => void;
}) {
  // A new piece of advice every time she is visited, and on "Talk".
  const [line, setLine] = useState(() => Math.floor(Math.random() * NAN_LINES.length));
  return (
    <WindowLayer>
      <Window
        label="Old Nan, Hearthkeeper"
        className="nan-window"
        header={
          <WindowHeader
            title="Old Nan"
            sub="Hearthkeeper"
            medallion={
              <Medallion tint="#5e4a36">
                <PersonaPortrait id="nan" />
              </Medallion>
            }
            right={<Wallet state={props.state} />}
            onClose={props.onClose}
          />
        }
      >
        <div className="nan-body">
          <p className="nan-quote">“{NAN_LINES[line % NAN_LINES.length]}”</p>
          <Button variant="ghost" onClick={() => setLine((n) => n + 1)}>
            Talk
          </Button>
          <div className="nan-books">
            <Button
              icon="book"
              tip={{
                name: "Compendium",
                kind: "Old Nan",
                explain: "Every enemy, item and skill you have met so far.",
              }}
              onClick={props.onCompendium}
            >
              Compendium
            </Button>
            <Button
              icon="rune"
              tip={{
                name: "Trigger Codex",
                kind: "Old Nan",
                explain: "The trigger parts you learned from salvaged items.",
              }}
              onClick={props.onCodex}
            >
              Trigger Codex
            </Button>
          </div>
          <section className="nan-resets-box" aria-label="Wake from the ashes">
            <span className="eyebrow">WAKE FROM THE ASHES</span>
            <NanResets state={props.state} game={props.game} />
          </section>
        </div>
      </Window>
    </WindowLayer>
  );
}
