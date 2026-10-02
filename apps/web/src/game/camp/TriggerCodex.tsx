import { ACTS, ITEM_CATALOG } from "@emberheir/content";
import {
  CODEX,
  type CodexHome,
  type CodexPartKind,
  type GameState,
  codexMastery,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import type { GameApi } from "../useGame";

const ARCHETYPE_NAMES: Record<string, string> = {
  brute: "Brutes",
  skirmisher: "Skirmishers",
  caster: "Casters",
  afflicter: "Afflicters",
  thornback: "Thornbacks",
  warden: "Wardens",
};

/** Where a part drops more often, e.g. "Rotwood" or "Skirmishers · Bosses". */
export function homeHint(home: CodexHome): string {
  const parts: string[] = [];
  if (home.actId) parts.push(ACTS.find((a) => a.id === home.actId)?.name ?? "?");
  if (home.archetypes?.length) parts.push(ARCHETYPE_NAMES[home.archetypes[0] ?? ""] ?? "?");
  if (home.boss) parts.push("Bosses");
  return parts.join(" · ");
}

interface Part {
  readonly kind: CodexPartKind;
  readonly id: string;
  readonly name: string;
  readonly home: CodexHome;
}

const CONDITIONS: Part[] = [...ITEM_CATALOG.conditions.values()].map((c) => ({
  kind: "condition",
  id: c.id,
  name: c.name,
  home: c.home,
}));
const EFFECTS: Part[] = [...ITEM_CATALOG.effects.values()].map((e) => ({
  kind: "effect",
  id: e.id,
  name: e.name,
  home: e.home,
}));

/**
 * Old Nan's Trigger Codex: every Condition and Effect, learned ones with their Mastery, the rest
 * as silhouettes with their home. In the Camp a learned part can be marked as the Quarry.
 */
export function TriggerCodex(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const codex = state.legacy.codex;
  const quarry = state.legacy.quarry;
  const [picked, setPicked] = useState<Part | null>(null);
  const known = (p: Part) => codexMastery(codex, p.kind, p.id);
  const isQuarry = (p: Part) => quarry?.kind === p.kind && quarry.id === p.id;
  const count = [...CONDITIONS, ...EFFECTS].filter((p) => known(p) > 0).length;
  const inCamp = !state.run;

  const column = (title: string, parts: Part[]) => (
    <div className="codex-column">
      <span className="title-font section-title">{title}</span>
      <div className="codex-grid" role="list" aria-label={title}>
        {parts.map((p) => {
          const mastery = known(p);
          const on = picked?.kind === p.kind && picked.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="listitem"
              className={`codex-part ${mastery ? "known" : "unknown"} ${on ? "on" : ""} ${isQuarry(p) ? "quarry" : ""}`}
              aria-label={
                mastery ? `${p.name}, Mastery T${mastery}` : `Unknown, ${homeHint(p.home)}`
              }
              onClick={() => setPicked(p)}
            >
              <span className="codex-name">{mastery ? p.name : "? ? ?"}</span>
              <span className="codex-meta sub">{mastery ? `T${mastery}` : homeHint(p.home)}</span>
              {isQuarry(p) && <Icon name="eye" size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const pickedKnown = picked ? known(picked) : 0;
  return (
    <div className="overlay" role="dialog" aria-label="Trigger Codex">
      <div className="overlay-panel trigger-codex">
        <header className="overlay-header">
          <div className="run-title">
            <span className="title-font big">TRIGGER CODEX</span>
            <span className="sub mono">
              {count} / {CONDITIONS.length + EFFECTS.length}
            </span>
          </div>
          <div className="grow" />
          <span className="mono small">Kindling {state.wallet.kindling}</span>
          <button type="button" className="icon-button" aria-label="Close" onClick={props.onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="codex-body">
          {column("Conditions", CONDITIONS)}
          {column("Effects", EFFECTS)}
        </div>
        <footer className="codex-foot">
          {picked ? (
            <>
              <span className="title-font big">{pickedKnown ? picked.name : "? ? ?"}</span>
              <span className="sub">{homeHint(picked.home)}</span>
              {isQuarry(picked) && quarry && (
                <span className="mono small" data-testid="quarry-pity">
                  {quarry.misses} / {CODEX.quarryPity}
                </span>
              )}
              <div className="grow" />
              {pickedKnown > 0 && inCamp && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    game.dispatch({
                      type: "setQuarry",
                      part: isQuarry(picked) ? null : { kind: picked.kind, id: picked.id },
                    })
                  }
                >
                  {isQuarry(picked) ? "Drop Quarry" : "Mark as Quarry"}
                </button>
              )}
            </>
          ) : (
            <span className="sub">
              {count === 0 ? "Salvage items with triggers at Thoric." : "Choose a part."}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
