import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type RunState,
  getAct,
  openFork,
  rewardsDone,
  routeAt,
  salvageValue,
  takeBlockReason,
  targetSlot,
  wardensGate,
} from "@emberheir/sim";
import { Suspense, useState } from "react";
import { Button } from "../../ui/kit/Button";
import { fmt } from "../../ui/items";
import { type CurrencyId, Price, Wallet } from "../../ui/kit/Currency";
import { BoonPanel, ShrineCards } from "../Boons";
import { inFinale } from "../finale";
import { IdleArena } from "../lazyViews";
import type { Settings } from "../../ui/settings";
import { RunHeader } from "../RunHeader";
import type { GameApi } from "../useGame";
import { EquippedPanel, ItemCards, RuneDrops } from "./RewardCards";
import {
  BountyCard,
  BountyDone,
  DoneCard,
  GateCards,
  HeroCard,
  nextStageActions,
  PathCards,
  PlanCard,
  RunMoments,
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
  settings: Settings;
  /** A window is open over the arena: it holds still. */
  covered: boolean;
  onCharacter: () => void;
  onTree: () => void;
  onPlan: () => void;
  onMenu: () => void;
}) {
  const { state, run, game } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  const [focus, setFocus] = useState<EquipmentSlot | undefined>(undefined);
  const nextStage = run.phase === "rewards" ? run.stage + 1 : run.stage;
  // An act boss ends the run; a finale echo does not.
  const boss = run.encounter?.boss === true && run.phase === "rewards" && !inFinale(act);
  // A fork of the road ahead: after the rewards the path is chosen in the middle.
  const fork = boss ? null : routeAt(run, act, nextStage);
  const forkAhead = fork !== null && !fork.second;
  const pathOpen = forkAhead && openFork(run, act, nextStage) !== null;
  // The Warden's Gate before the newest act's boss: Challenge or Wander (laengere-runs-v1.md).
  const gate = !boss && wardensGate(state, GAME_DATA, { ...run, stage: nextStage });
  const step = !rewards
    ? forkAhead
      ? "path"
      : gate
        ? "gate"
        : "ready"
    : rewards.itemPick === null
      ? "items"
      : rewards.boonOffer?.length && rewards.boonPick == null
        ? "shrine"
        : forkAhead
          ? "path"
          : gate
            ? "gate"
            : "done";
  const done = step === "ready" || step === "done" || step === "path" || step === "gate";
  const title =
    step === "shrine"
      ? "EMBER SHRINE"
      : step === "path"
        ? "CHOOSE A PATH"
        : step === "gate"
          ? "WARDEN'S GATE"
          : step === "ready"
            ? "READY"
            : "VICTORY";
  const subtitle =
    step === "path" && fork
      ? `Stages ${fork.fork}–${fork.fork + 1}`
      : step === "items"
        ? rewards && rewards.items.length > 3
          ? `${rewards.thief === "caught" ? "Ember Thief caught" : "Boss Hoard"} · choose ${(rewards.picks ?? 1) - (rewards.taken?.length ?? 0)} of ${rewards.items.length}`
          : rewards?.thief === "escaped"
            ? "The thief got away · choose 1 of 3 items"
            : "Choose 1 of 3 items"
        : step === "shrine"
          ? "Steal 1 of 3 sparks"
          : step === "gate"
            ? nextStage >= act.stages
              ? "Challenge the boss or wander on"
              : "Challenge the Gatekeeper or wander on"
            : boss
              ? `${act.name} cleared`
              : "";
  const anyBlocked =
    step === "items" &&
    (rewards?.items ?? []).some((it) => takeBlockReason(state, GAME_DATA, it) !== undefined);
  const gains: Partial<Record<CurrencyId, number>> = rewards
    ? {
        acorns: rewards.acorns,
        ash: rewards.ash + rewards.salvagedAsh,
        coal: rewards.emberCoal,
        feathers: rewards.phoenixFeathers,
      }
    : {};

  return (
    <section className="screen intermission" aria-label="Intermission">
      <Suspense fallback={null}>
        <IdleArena state={state} run={run} settings={props.settings} paused={props.covered} />
      </Suspense>
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
        {/* Left: the hero as it stands. Middle: the choice of the moment. Right: the road. */}
        <aside className="intermission-left">
          <HeroCard state={state} run={run} game={game} />
          <BoonPanel state={state} />
          <PlanCard state={state} run={run} onPlan={props.onPlan} />
        </aside>
        <main className="intermission-center">
          <h2 className="screen-title title-font">{title}</h2>
          {subtitle && <p className="screen-sub">{subtitle}</p>}
          {rewards && step !== "ready" && !inFinale(act) && (
            <p className="auto-rewards sub" data-testid="auto-rewards">
              +{fmt(rewards.xp)} XP <Price id="acorns" amount={rewards.acorns} plus />{" "}
              <Price id="ash" amount={rewards.ash} plus />
              {rewards.emberCoal > 0 && (
                <>
                  {" "}
                  <Price id="coal" amount={rewards.emberCoal} plus />
                </>
              )}
              {rewards.phoenixFeathers > 0 && (
                <>
                  {" "}
                  <Price id="feathers" amount={rewards.phoenixFeathers} plus />
                </>
              )}
              {!!rewards.cinderglass && (
                <>
                  {" "}
                  <Price id="glass" amount={rewards.cinderglass} plus />
                </>
              )}
            </p>
          )}
          {rewards && step !== "ready" && (
            <div className="moment-row">
              <RunMoments state={state} run={run} />
              {rewards.bountyDone && <BountyDone />}
            </div>
          )}
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
          {step === "path" && <PathCards state={state} run={run} game={game} />}
          {step === "gate" && <GateCards state={state} run={run} game={game} />}
          {(step === "ready" || step === "done") && <DoneCard state={state} run={run} />}
          {step === "items" && (
            <div className="inventory-line">
              <Button icon="hammer" onClick={() => game.dispatch({ type: "salvageAll" })}>
                {rewards?.taken?.length ? "Salvage the Rest" : "Salvage All"} · +
                {(rewards?.items ?? [])
                  .filter((_, i) => !rewards?.taken?.some((t) => t.index === i))
                  .reduce((n, it) => n + salvageValue(it), 0)}{" "}
                Ash
              </Button>
            </div>
          )}
        </main>
        {/* During the item pick the paperdoll takes the road's place. */}
        {step !== "items" && (
          <aside className="intermission-right-road">
            <UpNext state={state} run={run} prestige={state.legacy.prestige} />
            {run.bounty && <BountyCard run={run} />}
          </aside>
        )}
        {step === "items" && (
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
        )}
      </div>
      <footer className="intermission-footer bar-bottom">
        <Wallet state={state} gains={gains} />
        <div className="grow" />
        {!boss && (
          <Button
            variant="ghost"
            icon="retreat"
            blocked={done ? null : "Pick your rewards first"}
            tip={{
              name: "Retreat to Camp",
              kind: "",
              explain: "Gear and levels stay, this act's Boons burn.",
            }}
            onClick={() => game.dispatch({ type: "retreat" })}
          >
            Retreat to Camp
          </Button>
        )}
        <Button
          big
          variant="primary"
          icon="strike"
          className="next-stage"
          blocked={
            !done || (rewards !== null && !rewardsDone(rewards))
              ? "Pick your rewards first"
              : pathOpen
                ? "Choose a path first"
                : null
          }
          onClick={() => game.dispatchAll(nextStageActions(state))}
        >
          {boss ? "RETURN TO CAMP" : nextStage === act.stages ? "FACE THE BOSS" : "NEXT STAGE"}
        </Button>
      </footer>
    </section>
  );
}
