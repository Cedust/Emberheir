import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import { type GameState, type UniqueDefinition, bossKnown, getBase } from "@emberheir/sim";
import { useState } from "react";
import { ItemArt } from "../../ui/ItemArt";
import { actVisible } from "../labels";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly uniques: UniqueDefinition[];
}

/** Rows of the wall: one per act boss, then the Uniques without a home ("Wanderers"). */
const ROWS: Row[] = [
  ...GAME_DATA.acts.map((act) => ({
    id: act.id,
    name: act.boss.name.split(",")[0] ?? act.boss.name,
    uniques: [...ITEM_CATALOG.uniques.values()].filter((u) => u.bossOf === act.id),
  })),
  {
    id: "wanderers",
    name: "Wanderers",
    uniques: [...ITEM_CATALOG.uniques.values()].filter((u) => !u.bossOf),
  },
];

/** The rows this Heir may see: acts beyond the run stay off the wall, unmet bosses unnamed. */
function visibleRows(state: GameState): Row[] {
  return ROWS.filter((r) => r.id === "wanderers" || actVisible(state, r.id)).map((r) =>
    r.id === "wanderers" || bossKnown(state, GAME_DATA, r.id) ? r : { ...r, name: "???" },
  );
}

/**
 * The Trophy Wall at the Hearthfire (Teil 3 B): silhouettes of every Unique, sorted by boss; the
 * ones ever found are painted in. Permanent like the Runeword Codex.
 */
export function TrophyWall(props: { state: GameState }) {
  const found = new Set(props.state.legacy.trophies);
  const [sel, setSel] = useState<string | undefined>(props.state.legacy.trophies[0]);
  const unique = sel ? ITEM_CATALOG.uniques.get(sel) : undefined;
  const power = unique?.powerId ? ITEM_CATALOG.powers.get(unique.powerId) : undefined;
  const rows = visibleRows(props.state);
  const row = rows.find((r) => r.uniques.some((u) => u.id === sel));
  return (
    <div className="trophy-layout">
      <div className="trophy-wall" aria-label="Trophy Wall">
        {rows.map((r) => (
          <div key={r.id} className="trophy-row">
            <span className="trophy-boss title-font">{r.name}</span>
            <div className="trophy-items">
              {r.uniques.map((u) => {
                const has = found.has(u.id);
                const slot = getBase(ITEM_CATALOG, u.baseId).slot;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`trophy${has ? " found" : ""}${sel === u.id ? " on" : ""}`}
                    aria-label={has ? u.name : "Not found yet"}
                    title={has ? u.name : "???"}
                    data-testid={`trophy-${u.id}`}
                    disabled={!has}
                    onClick={() => setSel(u.id)}
                  >
                    <span className="trophy-art">
                      <ItemArt baseId={u.baseId} uniqueId={u.id} slot={slot} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <aside className="trophy-side">
        {unique ? (
          <section className="panel-card trophy-detail special-unique">
            <span className="eyebrow">{row?.name.toUpperCase()}</span>
            <span className="title-font rarity-text trophy-name">{unique.name}</span>
            <span className="sub small">{getBase(ITEM_CATALOG, unique.baseId).name}</span>
            {power && (
              <p className="trophy-power">
                <b>{power.name}.</b> {power.description}
              </p>
            )}
            {unique.flavor && <p className="sub small flavor">&ldquo;{unique.flavor}&rdquo;</p>}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
