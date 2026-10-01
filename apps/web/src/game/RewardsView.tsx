import { ITEM_CATALOG, POC_GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  PROGRESSION,
  type RunState,
  describeItem,
  equipBlockReason,
  getAct,
  rewardsDone,
  salvageValue,
  takeBlockReason,
  targetSlot,
} from "@emberheir/sim";
import { ItemCard } from "../items/ItemCard";
import { EQUIP_BLOCK_TEXT, spoilsHint, spoilsLabel } from "./labels";
import type { GameApi } from "./useGame";

/** Victory: automatic rewards → item pick (1 of 3) → Spoils pick (if any). */
export function RewardsView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  onOpenInventory: () => void;
}) {
  const { state, run, game } = props;
  const rewards = run.rewards;
  if (!rewards) return null;
  const act = getAct(POC_GAME_DATA, run.actId);
  const picked = rewards.itemPick;

  return (
    <section className="rewards panel" aria-label="Rewards">
      <h2>Victory</h2>
      <p className="auto-rewards" data-testid="auto-rewards">
        +{rewards.xp} XP · +{rewards.gold} Gold · +{rewards.dust} Dust
        {rewards.reforgeStones > 0 ? ` · +${rewards.reforgeStones} Reforge Stones` : ""}
        {rewards.levelsGained > 0 && (
          <strong className="level-up">
            {" "}
            Level up! Level {state.hero.level} · +
            {rewards.levelsGained * PROGRESSION.attributePointsPerLevel} Attribute Points
          </strong>
        )}
      </p>

      <h3>Choose one item</h3>
      <div className="loot-cards">
        {rewards.items.map((item, i) => {
          const equipReason = equipBlockReason(state, POC_GAME_DATA, item, "pick");
          const takeReason = takeBlockReason(state, POC_GAME_DATA, item);
          const slot = targetSlot(item, POC_GAME_DATA, state.hero.equipment);
          const current = slot ? state.hero.equipment[slot] : undefined;
          const chosen = picked && picked.kind !== "salvageAll" && picked.index === i;
          return (
            <div key={item.id} className={`loot-card${chosen ? " chosen" : ""}`}>
              <ItemCard tooltip={describeItem(item, ITEM_CATALOG, state.hero.attributes)} />
              <p className="replaces">{current ? `Replaces: ${current.name}` : "Empty slot"}</p>
              {!picked ? (
                <div className="loot-buttons">
                  <button
                    type="button"
                    className="primary"
                    disabled={equipReason !== undefined}
                    title={equipReason ? EQUIP_BLOCK_TEXT[equipReason] : undefined}
                    onClick={() => game.dispatch({ type: "pickItem", index: i, mode: "equip" })}
                  >
                    Equip
                  </button>
                  <button
                    type="button"
                    disabled={takeReason !== undefined}
                    title={takeReason ? "No room" : undefined}
                    onClick={() => game.dispatch({ type: "pickItem", index: i, mode: "take" })}
                  >
                    Take
                  </button>
                  {(equipReason || takeReason) && (
                    <span className="block-reason">
                      {equipReason ? EQUIP_BLOCK_TEXT[equipReason] : "No room"}
                    </span>
                  )}
                </div>
              ) : (
                <p className="pick-result">
                  {chosen
                    ? picked.kind === "equip"
                      ? "Equipped"
                      : "Taken"
                    : `Salvaged (+${salvageValue(item)} Dust)`}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!picked && (
        <div className="loot-footer">
          <button type="button" onClick={props.onOpenInventory}>
            Open Inventory
          </button>
          <button type="button" onClick={() => game.dispatch({ type: "salvageAll" })}>
            Salvage All
          </button>
          <span className="hint">The items you do not pick turn into Salvage Dust.</span>
        </div>
      )}

      {picked && rewards.spoils.length > 0 && (
        <>
          <h3>Spoils: choose one</h3>
          <div className="spoils-cards">
            {rewards.spoils.map((card, i) => (
              <button
                key={card.kind}
                type="button"
                className={`spoils-card${rewards.spoilsPick === i ? " chosen" : ""}`}
                disabled={rewards.spoilsPick !== null}
                onClick={() => game.dispatch({ type: "pickSpoils", index: i })}
              >
                <strong>{spoilsLabel(card, act.essence.name)}</strong>
                <span>{spoilsHint(card)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {rewardsDone(rewards) && (
        <div className="rewards-continue">
          <button
            type="button"
            className="primary big"
            onClick={() => game.dispatch({ type: "continue" })}
          >
            {run.encounter?.boss ? "Return to Camp" : "Continue"}
          </button>
        </div>
      )}
    </section>
  );
}
