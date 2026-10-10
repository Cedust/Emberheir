import { GAME_DATA, ITEM_CATALOG, RUNES, RUNEWORDS } from "@emberheir/content";
import {
  CRAFTING,
  type GameState,
  type Item,
  type ItemSlot,
  SLOT_NAMES,
  describeBonuses,
  gamblePrice,
  getBase,
  merchantItemLevel,
  merchantSlots,
} from "@emberheir/sim";
import { ItemArt } from "../../ui/ItemArt";
import { ItemTile, fmt } from "../../ui/items";
import { RuneStone, runeColor, runeName } from "../../ui/RuneArt";

/** Nyssa's and Marisha's center panels: Rune pouch, Codex, stock and gamble slots. */

/** Sockets of an item, big: empty holes and socketed Rune stones. */
export function SocketRow(props: {
  sockets: number;
  runes: readonly string[];
  highlight?: number;
}) {
  if (props.sockets <= 0) return <span className="sub">No Sockets</span>;
  return (
    <div
      className="socket-row"
      aria-label={`${props.runes.length} of ${props.sockets} Sockets filled`}
    >
      {Array.from({ length: props.sockets }, (_, i) => {
        const id = props.runes[i];
        return (
          <span key={i} className={`socket-hole${i === props.highlight ? " new" : ""}`}>
            {id && <RuneStone runeId={id} size={34} />}
          </span>
        );
      })}
    </div>
  );
}

/** The Runes in the pouch to socket. */
export function RunePouch(props: {
  state: GameState;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const owned = RUNES.filter((r) => (props.state.wallet.runes[r.id] ?? 0) > 0);
  return (
    <div className="rune-pouch" role="radiogroup" aria-label="Rune pouch">
      {owned.length === 0 && <span className="sub">No Runes. Elites and bosses drop them.</span>}
      {owned.map((r) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={props.selected === r.id}
          className={`rune-chip ${props.selected === r.id ? "on" : ""}`}
          style={{ "--rune": runeColor(r.id) } as React.CSSProperties}
          onClick={() => props.onSelect(r.id)}
        >
          <RuneStone runeId={r.id} size={30} />
          <span className="title-font">{r.name}</span>
          <span className="mono sub">×{props.state.wallet.runes[r.id]}</span>
        </button>
      ))}
    </div>
  );
}

/** All Runes (Combine) or all Runewords (Codex). Unknown ones stay silhouettes. */
export function RuneBoard(props: {
  state: GameState;
  mode: "combine" | "codex";
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { state } = props;
  const found = new Set(state.legacy.runesFound);
  if (props.mode === "combine") {
    return (
      <div className="rune-board" role="radiogroup" aria-label="Runes">
        {RUNES.map((r, i) => {
          const have = state.wallet.runes[r.id] ?? 0;
          const next = RUNES[i + 1];
          const known = found.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={props.selected === r.id}
              disabled={!known || !next}
              className={`rune-cell ${props.selected === r.id ? "on" : ""} ${known ? "" : "unknown"}`}
              style={{ "--rune": runeColor(r.id) } as React.CSSProperties}
              onClick={() => props.onSelect(r.id)}
            >
              <RuneStone runeId={r.id} size={44} dim={!known} />
              <span className="title-font">{known ? r.name : "?"}</span>
              <span className={`mono ${have >= CRAFTING.combineRunesCount ? "ok" : "sub"}`}>
                {have}/{CRAFTING.combineRunesCount}
              </span>
              {known && next && (
                <span className="rune-next sub">→ {found.has(next.id) ? next.name : "?"}</span>
              )}
              {known && (
                <span className="rune-bonus sub">
                  {describeBonuses(r.bonuses.weapon).join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  const forged = new Set(state.legacy.runewords);
  return (
    <div className="codex" role="list" aria-label="Runeword Codex">
      {RUNEWORDS.map((w) => {
        const known = w.runes.every((id) => found.has(id));
        const slots = [...new Set(w.slots.map((s) => SLOT_NAMES[s]))].join(" or ");
        return (
          <div
            key={w.id}
            role="listitem"
            className={`codex-row panel-card ${known ? "known" : "unknown"} ${forged.has(w.id) ? "forged" : ""}`}
          >
            <div className="codex-name">
              <span className="title-font">{known ? w.name : "? ? ?"}</span>
              <span className="sub small">
                {slots} · {w.runes.length} Sockets
              </span>
            </div>
            <div className="codex-runes">
              {w.runes.map((id, i) => (
                <span key={i} className="codex-rune">
                  <RuneStone runeId={id} size={30} dim={!found.has(id)} />
                  <span className="small">{found.has(id) ? runeName(id) : "?"}</span>
                </span>
              ))}
            </div>
            <span className="codex-effect sub small">
              {known ? describeBonuses(w.bonuses).slice(0, 3).join(" · ") : ""}
            </span>
            {forged.has(w.id) && <span className="codex-forged title-font">Forged</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Gamble: one card per slot with its price; the last gambled item below. */
export function GamblePanel(props: {
  state: GameState;
  selected: ItemSlot | null;
  onSelect: (slot: ItemSlot) => void;
  last: Item | null;
}) {
  const price = gamblePrice(merchantItemLevel(props.state, GAME_DATA));
  const slots = merchantSlots(GAME_DATA);
  return (
    <div className="gamble">
      <div className="gamble-slots" role="radiogroup" aria-label="Gamble slot">
        {slots.map((slot) => {
          const base = GAME_DATA.lootBases.find((id) => getBase(ITEM_CATALOG, id).slot === slot);
          return (
            <button
              key={slot}
              type="button"
              role="radio"
              aria-checked={props.selected === slot}
              className={`gamble-slot ${props.selected === slot ? "on" : ""}`}
              onClick={() => props.onSelect(slot)}
            >
              <span className="gamble-art">
                {base && <ItemArt baseId={base} slot={slot} />}
                <span className="gamble-q title-font">?</span>
              </span>
              <span className="title-font small">{SLOT_NAMES[slot]}</span>
            </button>
          );
        })}
      </div>
      <span className="sub small">
        {fmt(price)} Acorns each · Item Level {merchantItemLevel(props.state, GAME_DATA)}
      </span>
      {props.last && (
        <div className="gamble-last">
          <ItemTile item={props.last} label="Gambled" size={76} equipped={false} />
        </div>
      )}
    </div>
  );
}
