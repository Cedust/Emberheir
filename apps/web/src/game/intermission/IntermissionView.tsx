import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type RunState,
  getAct,
  rewardsDone,
  salvageValue,
  takeBlockReason,
  targetSlot,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { fmt, walletEntries } from "../../ui/items";
import { ShrineCards } from "../Boons";
import { inFinale } from "../finale";
import { RunHeader } from "../RunHeader";
import type { GameApi } from "../useGame";
import { EquippedPanel, ItemCards, RuneDrops } from "./RewardCards";
import {
  BountyCard,
  BountyDone,
  DoneCard,
  HeroCard,
  nextStageActions,
  PlanCard,
  UpNext,
} from "./RunCards";

/**
 * Between two stages (Intermission mock): the rewards of the last fight (item pick, then a
 * Shrine's Boon), Life and the Ember Flask, the Scout's Bounty, what comes next, and NEXT STAGE.
 */
export function IntermissionView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  onCharacter: () => void;
  onTree: () => void;
  onPlan: () => void;
  onMenu: () => void;
}) {
  const { state, run, game } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  const [focus, setFocus] = useState<EquipmentSlot | undefined>(undefined);
  const step = !rewards
    ? "ready"
    : rewards.itemPick === null
      ? "items"
      : rewards.boonOffer?.length && rewards.boonPick == null
        ? "shrine"
        : "done";
  const done = step === "ready" || step === "done";
  const nextStage = run.phase === "rewards" ? run.stage + 1 : run.stage;
  // An act boss ends the run; a finale echo does not.
  const boss = run.encounter?.boss === true && run.phase === "rewards" && !inFinale(act);
  const title = step === "shrine" ? "EMBER SHRINE" : step === "ready" ? "READY" : "VICTORY";
  const subtitle =
    step === "items"
      ? rewards && rewards.items.length > 3
        ? `${rewards.thief === "caught" ? "Ember Thief caught" : "Boss Hoard"} · choose ${(rewards.picks ?? 1) - (rewards.taken?.length ?? 0)} of ${rewards.items.length}`
        : rewards?.thief === "escaped"
          ? "The thief got away · choose 1 of 3 items"
          : "Choose 1 of 3 items"
      : step === "shrine"
        ? "Steal 1 of 3 sparks"
        : boss
          ? `${act.name} cleared`
          : `Ready for Stage ${nextStage}`;
  const anyBlocked =
    step === "items" &&
    (rewards?.items ?? []).some((it) => takeBlockReason(state, GAME_DATA, it) !== undefined);
  const gains: Record<string, number> = rewards
    ? {
        acorns: rewards.acorns,
        ash: rewards.ash + rewards.salvagedAsh,
        coal: rewards.emberCoal,
        feathers: rewards.phoenixFeathers,
      }
    : {};

  return (
    <section className="screen intermission" aria-label="Intermission">
      <RunHeader
        act={act}
        stage={run.stage}
        sub={rewards ? `Stage ${run.stage} cleared` : `Stage ${run.stage} next`}
        cleared={!!rewards}
        attributePoints={state.hero.unspentAttributePoints}
        skillPoints={state.hero.unspentSkillPoints}
        waymarks={state.progress.waymarks}
        prestige={state.legacy.prestige}
        {...(run.wildfire ? { wildfire: run.wildfire } : {})}
        onCharacter={props.onCharacter}
        onTree={props.onTree}
        onMenu={props.onMenu}
      />
      <div className="intermission-body">
        <aside className="intermission-left">
          <HeroCard state={state} run={run} game={game} />
          <UpNext run={run} prestige={state.legacy.prestige} />
          {run.bounty && <BountyCard run={run} />}
          <PlanCard state={state} run={run} onPlan={props.onPlan} />
        </aside>
        <main className="intermission-center">
          <h2 className="screen-title title-font">{title}</h2>
          <p className="screen-sub">{subtitle}</p>
          {rewards && step !== "ready" && !inFinale(act) && (
            <p className="auto-rewards sub" data-testid="auto-rewards">
              +{fmt(rewards.xp)} XP · +{fmt(rewards.acorns)} Acorns · +{fmt(rewards.ash)} Ash
              {rewards.emberCoal > 0 ? ` · +${rewards.emberCoal} Ember Coal` : ""}
              {rewards.phoenixFeathers > 0
                ? ` · +${rewards.phoenixFeathers} Phoenix Feather${rewards.phoenixFeathers > 1 ? "s" : ""}`
                : ""}
            </p>
          )}
          {rewards?.bountyDone && step !== "ready" && <BountyDone />}
          {rewards && step !== "ready" && rewards.runes.length > 0 && (
            <RuneDrops key={`runes-${run.encounter?.seed ?? run.stage}`} runes={rewards.runes} />
          )}
          {step === "items" && (
            <ItemCards
              key={run.encounter?.seed ?? run.stage}
              state={state}
              run={run}
              game={game}
              onFocus={setFocus}
            />
          )}
          {step === "shrine" && <ShrineCards state={state} run={run} game={game} />}
          {done && <DoneCard run={run} />}
          {step === "items" && (
            <div className="inventory-line">
              <button
                type="button"
                className="btn"
                title="Unpicked items become Ash"
                onClick={() => game.dispatch({ type: "salvageAll" })}
              >
                {rewards?.taken?.length ? "Salvage the Rest" : "Salvage All"} · +
                {(rewards?.items ?? [])
                  .filter((_, i) => !rewards?.taken?.some((t) => t.index === i))
                  .reduce((n, it) => n + salvageValue(it), 0)}{" "}
                Ash
              </button>
            </div>
          )}
        </main>
        <EquippedPanel
          state={state}
          focus={
            focus ??
            (step === "items" && rewards?.items[0]
              ? targetSlot(rewards.items[0], GAME_DATA, state.hero.equipment)
              : undefined)
          }
          onFocus={setFocus}
          inventoryFull={anyBlocked}
          onInventory={props.onCharacter}
        />
      </div>
      <footer className="intermission-footer bar-bottom">
        <div className="wallet-row" aria-label="Wallet">
          {walletEntries(state).map((w) => (
            <div key={w.key} className="wallet-entry">
              <span className="mono">
                {fmt(w.value)}
                {(gains[w.key] ?? 0) > 0 && (
                  <span className="gain"> +{fmt(gains[w.key] ?? 0)}</span>
                )}
              </span>
              <span className="sub">{w.name}</span>
            </div>
          ))}
        </div>
        <div className="grow" />
        <button
          type="button"
          className="btn big primary next-stage"
          disabled={!done || (rewards !== null && !rewardsDone(rewards))}
          onClick={() => game.dispatchAll(nextStageActions(state))}
        >
          {boss ? "RETURN TO CAMP" : nextStage === act.stages ? "FACE THE BOSS" : "NEXT STAGE"}
          <Icon name="strike" size={18} />
        </button>
        {!boss && (
          <button
            type="button"
            className="btn ghost"
            disabled={!done}
            title={
              done
                ? "Back to Camp. Gear and levels stay, this act's Boons burn."
                : "Pick your rewards first"
            }
            onClick={() => game.dispatch({ type: "retreat" })}
          >
            <Icon name="retreat" size={16} />
            Retreat to Camp
          </button>
        )}
      </footer>
    </section>
  );
}
