import { ITEM_CATALOG } from "@emberheir/content";
import {
  CRUCIBLE,
  CRUCIBLE_SLOTS,
  type CrucibleSlot,
  crucibleLock,
  type GameState,
} from "@emberheir/sim";
import { fmt } from "../../ui/items";
import type { GameApi } from "../useGame";

const SLOT_TEXT: Record<CrucibleSlot, { name: string; text: string }> = {
  strike: { name: "Strike", text: "Hits, Crits, extra attacks, Execute" },
  ward: { name: "Ward", text: "Defense, healing, Barrier, Block" },
  ember: { name: "Ember", text: "Ailments, Heat, triggers, rules" },
};

/**
 * Ember Crucible at Liora (neuausrichtung-v1.md 8): Powers from the account's Power Codex go into
 * three slots by their kind. Binding costs Ash and Ember Coal, every change again; a Power works
 * at its learned tier and only once (worn on an item too, the Crucible's copy rests).
 */
export function CruciblePanel(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const codex = state.powerCodex ?? {};
  const afford =
    state.wallet.ash >= CRUCIBLE.bindAsh && state.wallet.emberCoal >= CRUCIBLE.bindEmberCoal;
  const worn = new Set(
    Object.values(state.hero.equipment).flatMap((i) => (i?.powerId ? [i.powerId] : [])),
  );
  return (
    <div className="crucible" aria-label="Ember Crucible">
      <span className="sub">
        Bind · <b className="mono">{fmt(CRUCIBLE.bindAsh)}</b> Ash ·{" "}
        <b className="mono">{CRUCIBLE.bindEmberCoal}</b> Ember Coal. The Power Codex is shared by
        all your characters.
      </span>
      <div className="crucible-slots">
        {CRUCIBLE_SLOTS.map((slot) => {
          const lock = crucibleLock(state, slot);
          const bound = state.hero.crucible?.[slot];
          const powers = [...ITEM_CATALOG.powers.values()].filter(
            (p) => p.crucible === slot && codex[p.id],
          );
          return (
            <section
              key={slot}
              className={`crucible-slot panel-card${lock ? " locked" : ""}`}
              aria-label={`${SLOT_TEXT[slot].name} slot`}
            >
              <span className="title-font">{SLOT_TEXT[slot].name}</span>
              <span className="sub small">{SLOT_TEXT[slot].text}</span>
              {lock ? (
                <span className="sub small crucible-lock">{lock}</span>
              ) : powers.length === 0 ? (
                <span className="sub small">No {SLOT_TEXT[slot].name} Power learned yet.</span>
              ) : (
                <div className="crucible-powers">
                  {powers.map((p) => {
                    const on = bound === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        aria-label={p.name}
                        className={`crucible-power${on ? " on" : ""}`}
                        disabled={!on && !afford}
                        title={
                          on
                            ? "Bound · click to empty the slot"
                            : afford
                              ? "Click to bind"
                              : "Not enough Ash or Ember Coal"
                        }
                        onClick={() =>
                          game.dispatch({ type: "bindPower", slot, powerId: on ? null : p.id })
                        }
                      >
                        <span className="crucible-power-name">
                          {p.name} <span className="mono sub">T{codex[p.id]}</span>
                        </span>
                        <span className="sub small">{p.description}</span>
                        {on && worn.has(p.id) && (
                          <span className="sub small warn">Worn on an item: this copy rests</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
