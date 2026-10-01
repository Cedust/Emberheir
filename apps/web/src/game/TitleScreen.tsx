import { GAME_TITLE, ITEM_CATALOG, POC_GAME_DATA } from "@emberheir/content";
import { getBase } from "@emberheir/sim";
import { useState } from "react";
import { loadSave } from "./useGame";

const STARTER_TEXT: Record<string, string> = {
  sword: "Melee, Cooling Heat: hit often or the Heat fades. Start Skill: Power Strike.",
  "fire-wand": "Ranged, Warming Heat: fills by itself over time. Start Skill: Firebolt.",
};

export function TitleScreen(props: {
  onContinue: () => void;
  onNewGame: (starterWeapon: string) => void;
  onLab: () => void;
}) {
  const save = loadSave();
  const [choosing, setChoosing] = useState(false);
  return (
    <section className="title-screen panel" aria-label="Main menu">
      <h2 className="title-logo">{GAME_TITLE}</h2>
      <p className="title-sub">Act 1 · Ashen Fields</p>
      {!choosing ? (
        <div className="menu">
          {save && (
            <button type="button" className="primary" onClick={props.onContinue}>
              Continue
              <small>
                Level {save.hero.level} ·{" "}
                {save.run ? `Act 1, Stage ${save.run.stage}` : "In the Camp"}
              </small>
            </button>
          )}
          <button
            type="button"
            className={save ? undefined : "primary"}
            onClick={() => setChoosing(true)}
          >
            New Game
          </button>
          <button type="button" onClick={props.onLab}>
            Combat Lab
          </button>
        </div>
      ) : (
        <div className="starter-pick">
          <h3>Choose your first weapon</h3>
          {save && <p className="warning">Starting a new game replaces your save.</p>}
          <div className="starter-cards">
            {POC_GAME_DATA.starterWeapons.map((id) => (
              <button
                key={id}
                type="button"
                className="starter-card"
                onClick={() => props.onNewGame(id)}
              >
                <strong>{getBase(ITEM_CATALOG, id).name}</strong>
                <span>{STARTER_TEXT[id]}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setChoosing(false)}>
            Back
          </button>
        </div>
      )}
    </section>
  );
}
