import { ACTS, ITEM_CATALOG } from "@emberheir/content";
import { type CodexHome, type CodexPartKind, type GameState, codexKnows } from "@emberheir/sim";
import { useState } from "react";

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

/** Learned parts and all parts, e.g. for the Legacy tab "Trigger Codex · 4/26". */
export function codexProgress(state: GameState): { known: number; total: number } {
  const codex = state.legacy.codex;
  const known = [...CONDITIONS, ...EFFECTS].filter((p) => codexKnows(codex, p.kind, p.id)).length;
  return { known, total: CONDITIONS.length + EFFECTS.length };
}

/**
 * The Trigger Codex at the Hearthfire: every Condition and Effect, learned ones by name, the
 * rest as silhouettes with their home. Liora kindles learned pairs at the item's tier.
 */
export function TriggerCodex(props: { state: GameState }) {
  const codex = props.state.legacy.codex;
  const [picked, setPicked] = useState<Part | null>(null);
  const known = (p: Part) => codexKnows(codex, p.kind, p.id);
  const { known: count } = codexProgress(props.state);

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
    <section className="trigger-codex" aria-label="Trigger Codex">
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
          <span className="sub">{count === 0 ? "None" : "Choose a part."}</span>
        )}
      </footer>
    </section>
  );
}
