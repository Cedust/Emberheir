import { ACTS, ITEM_CATALOG } from "@emberheir/content";
import { type CodexHome, type CodexPartKind, type GameState, codexKnows } from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";

const ARCHETYPE_NAMES: Record<string, string> = {
  brute: "Brutes",
  skirmisher: "Skirmishers",
  caster: "Casters",
  afflicter: "Afflicters",
  thornback: "Thornbacks",
  warden: "Wardens",
  harvester: "The Harvester",
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
 * Old Nan's Trigger Codex: every Condition and Effect, learned ones by name, the rest as
 * silhouettes with their home. Liora kindles learned pairs at the item's tier.
 */
export function TriggerCodex(props: { state: GameState; onClose: () => void }) {
  const { state } = props;
  const codex = state.legacy.codex;
  const [picked, setPicked] = useState<Part | null>(null);
  const known = (p: Part) => codexKnows(codex, p.kind, p.id);
  const count = [...CONDITIONS, ...EFFECTS].filter(known).length;

  const column = (title: string, parts: Part[]) => (
    <div className="codex-column">
      <span className="title-font section-title">{title}</span>
      <div className="codex-grid" role="list" aria-label={title}>
        {parts.map((p) => {
          const learned = known(p);
          const on = picked?.kind === p.kind && picked.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="listitem"
              className={`codex-part ${learned ? "known" : "unknown"} ${on ? "on" : ""}`}
              aria-label={learned ? p.name : `Unknown, ${homeHint(p.home)}`}
              onClick={() => setPicked(p)}
            >
              <span className="codex-name">{learned ? p.name : "? ? ?"}</span>
              <span className="codex-meta sub">{homeHint(p.home)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const pickedKnown = picked ? known(picked) : false;
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
              <span className="sub">
                {pickedKnown
                  ? "Learned · Liora can kindle it"
                  : `Drops more often: ${homeHint(picked.home)}`}
              </span>
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
