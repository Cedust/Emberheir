import { ITEM_CATALOG } from "@emberheir/content";
import {
  crucibleBindCost,
  CRUCIBLE_SLOTS,
  type CrucibleSlot,
  crucibleLock,
  type GameState,
} from "@emberheir/sim";
import { Cost } from "../../ui/kit/Currency";
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
  const cost = crucibleBindCost(state.legacy.prestige);
  const afford = state.wallet.ash >= cost.ash && state.wallet.emberCoal >= cost.emberCoal;
  const worn = new Set(
    Object.values(state.hero.equipment).flatMap((i) => (i?.powerId ? [i.powerId] : [])),
  );
  return (
    <div className="crucible" aria-label="Ember Crucible">
      <Cost
        parts={[
          { id: "ash", amount: cost.ash, have: state.wallet.ash },
          { id: "coal", amount: cost.emberCoal, have: state.wallet.emberCoal },
        ]}
      />
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
                <span className="sub small">Empty</span>
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
