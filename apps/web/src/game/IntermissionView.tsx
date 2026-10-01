import { POC_GAME_DATA } from "@emberheir/content";
import {
  type GameAction,
  type GameState,
  PROGRESSION,
  type RunState,
  type SpoilsCard,
  applyAction,
  deriveStats,
  equipBlockReason,
  getAct,
  heroSetup,
  rewardsDone,
  salvageValue,
  takeBlockReason,
  xpToNextLevel,
} from "@emberheir/sim";
import { Icon, type IconName } from "../ui/Icon";
import { ItemDetail, compareWithEquipped, fmt, walletEntries } from "../ui/items";
import type { Settings } from "../ui/settings";
import { RunHeader } from "./RunHeader";
import { EQUIP_BLOCK_TEXT, spoilsHint, spoilsLabel } from "./labels";
import type { GameApi } from "./useGame";

const SPOILS_LOOK: Record<SpoilsCard["kind"], { icon: IconName; tint: string }> = {
  flaskCharge: { icon: "flask", tint: "#c9322a" },
  reforgeStones: { icon: "stone", tint: "#2d5bd0" },
  essence: { icon: "drop", tint: "#6b5a3e" },
};

/**
 * NEXT STAGE as one step: finish the rewards, drink the flask if Life is below the auto-drink
 * setting, start the fight. After the boss, `continue` goes back to the Camp instead.
 */
export function nextStageActions(state: GameState, autoFlask: number): GameAction[] {
  const actions: GameAction[] = [];
  let s = state;
  const step = (a: GameAction) => {
    actions.push(a);
    s = applyAction(s, POC_GAME_DATA, a);
  };
  try {
    if (s.run?.phase === "rewards") step({ type: "continue" });
    const run = s.run;
    if (run?.phase !== "intermission") return actions;
    if (run.lifeFraction < autoFlask && s.flaskCharges > 0) step({ type: "useFlask" });
    step({ type: "startStage" });
  } catch {
    // useGame shows the error when it applies the same actions.
  }
  return actions;
}

function HeroCard(props: { state: GameState; run: RunState; game: GameApi; settings: Settings }) {
  const { state, run, game } = props;
  const hero = state.hero;
  const maxLife = deriveStats(heroSetup(state, POC_GAME_DATA).setup).maxLife;
  const lifePct = Math.round(run.lifeFraction * 100);
  const canDrink = state.flaskCharges > 0 && run.lifeFraction < 1;
  const heal = canDrink ? Math.min(PROGRESSION.flaskHeal * 100, 100 - lifePct) : 0;
  const flaskMax = Math.max(PROGRESSION.flaskStartCharges, state.flaskCharges);
  const gained = run.rewards?.xp ?? 0;
  const next = xpToNextLevel(hero.level);
  return (
    <section className="panel-card hero-card" aria-label="Hero">
      <div className="hero-card-head">
        <div className="plaque-portrait">
          <Icon name="user" size={24} color="#f3e6c8" />
        </div>
        <div className="plaque-names">
          <span className="plaque-name title-font">Heir of the Ember</span>
          <span className="sub">
            Level {hero.level}
            {gained > 0 ? ` · +${fmt(gained)} XP` : ""}
          </span>
        </div>
      </div>
      {run.rewards && run.rewards.levelsGained > 0 && (
        <div className="level-up title-font" role="status">
          Level up! +{run.rewards.levelsGained * PROGRESSION.attributePointsPerLevel} Attribute
          Points
        </div>
      )}
      <div className="xp-line sub">
        {Number.isFinite(next) ? (
          <>
            XP {fmt(hero.xp)} / {fmt(next)}
          </>
        ) : (
          "Level cap reached"
        )}
      </div>
      <div className="life-head">
        <span className="title-font">Life</span>
        <span className="mono">
          {fmt(run.lifeFraction * maxLife)} / {fmt(maxLife)}
        </span>
      </div>
      <div
        className="bar-life big"
        role="meter"
        aria-label="Life"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={lifePct}
      >
        <div className="fill" style={{ width: `${lifePct}%` }} />
        {heal > 0 && (
          <div className="heal-preview" style={{ left: `${lifePct}%`, width: `${heal}%` }} />
        )}
        <span className="bar-label">{lifePct}%</span>
      </div>
      <p className="sub small">Life carries over to the next stage. Barrier and Heat reset.</p>
      <div className="flask-row">
        <div className="flask-pips">
          {Array.from({ length: flaskMax }, (_, i) => (
            <span key={i} className={`flask-pip ${i < state.flaskCharges ? "full" : ""}`} />
          ))}
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={!canDrink}
          onClick={() => game.dispatch({ type: "useFlask" })}
        >
          <Icon name="flask" size={16} />
          {canDrink
            ? `Drink +${Math.round(heal)}% Life`
            : state.flaskCharges > 0
              ? "Life full"
              : "Flask empty"}
        </button>
      </div>
      <p className="sub small">
        {props.settings.autoFlask > 0
          ? `Auto-drink below ${Math.round(props.settings.autoFlask * 100)}% Life (Menu)`
          : "Auto-drink is off (Menu)"}
      </p>
    </section>
  );
}

function UpNext(props: { run: RunState }) {
  const { run } = props;
  const act = getAct(POC_GAME_DATA, run.actId);
  const stages = act.monsterLevels.length;
  // During the rewards the next stage is stage + 1.
  const next = run.phase === "rewards" ? run.stage + 1 : run.stage;
  if (run.phase === "rewards" && run.encounter?.boss) {
    return (
      <section className="panel-card up-next" aria-label="Up next">
        <span className="eyebrow">Up next</span>
        <div className="up-row">
          <span className="title-font">Back to Camp</span>
          <span className="sub">{act.name} cleared</span>
        </div>
      </section>
    );
  }
  const spoils = act.spoilsStages.find((s) => s >= next);
  return (
    <section className="panel-card up-next" aria-label="Up next">
      <span className="eyebrow">Up next</span>
      <div className="up-row">
        <span className="title-font">Stage {next}</span>
        <span className="sub">{act.name}</span>
      </div>
      {spoils !== undefined && (
        <div className="up-row">
          <span className="spoils-mark" />
          <span>Spoils</span>
          <span className="sub">
            Stage {spoils} · {spoils === next ? "now" : `in ${spoils - next}`}
          </span>
        </div>
      )}
      <div className="up-row">
        <Icon name="boss" size={16} color="#ff8a1f" />
        <span>Boss: {act.boss.name}</span>
        <span className="sub">
          Stage {stages} · {stages === next ? "now" : `in ${stages - next}`}
        </span>
      </div>
      {next === stages && (
        <p className="warning small">The boss announces its heavy strikes. Watch its Heat.</p>
      )}
    </section>
  );
}

function ItemCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const rewards = run.rewards;
  if (!rewards) return null;
  return (
    <div className="loot-cards">
      {rewards.items.map((item, i) => {
        const equipReason = equipBlockReason(state, POC_GAME_DATA, item, "pick");
        const takeReason = takeBlockReason(state, POC_GAME_DATA, item);
        return (
          <ItemDetail
            key={item.id}
            item={item}
            heroAttributes={state.hero.attributes}
            compare={compareWithEquipped(state, item)}
            className="loot-card"
            testId="item-card"
            footer={
              <div className="card-buttons">
                <button
                  type="button"
                  className="btn primary"
                  disabled={equipReason !== undefined}
                  title={
                    equipReason
                      ? EQUIP_BLOCK_TEXT[equipReason]
                      : "Swap in, the old item goes to the inventory"
                  }
                  onClick={() => game.dispatch({ type: "pickItem", index: i, mode: "equip" })}
                >
                  {equipReason === "noRoom" ? "No room" : "Equip"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={takeReason !== undefined}
                  title={
                    takeReason ? "This item does not fit into the inventory" : "Put into inventory"
                  }
                  onClick={() => game.dispatch({ type: "pickItem", index: i, mode: "take" })}
                >
                  {takeReason ? "No room" : "Take"}
                </button>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function SpoilsCards(props: { run: RunState; game: GameApi }) {
  const rewards = props.run.rewards;
  if (!rewards) return null;
  const act = getAct(POC_GAME_DATA, props.run.actId);
  return (
    <div className="spoils-cards">
      {rewards.spoils.map((card, i) => {
        const look = SPOILS_LOOK[card.kind];
        return (
          <button
            key={card.kind}
            type="button"
            className="spoils-card panel-card"
            onClick={() => props.game.dispatch({ type: "pickSpoils", index: i })}
          >
            <span className="spoils-icon" style={{ background: look.tint }}>
              <Icon name={look.icon} size={40} color="#fff6e4" />
            </span>
            <strong className="title-font">{spoilsLabel(card, act.essence.name)}</strong>
            <span className="sub">{spoilsHint(card)}</span>
          </button>
        );
      })}
    </div>
  );
}

function DoneCard(props: { run: RunState }) {
  const { run } = props;
  const act = getAct(POC_GAME_DATA, run.actId);
  const rewards = run.rewards;
  let line: string;
  let sub: string;
  if (!rewards) {
    const boss = run.stage === act.monsterLevels.length;
    line = boss ? `${act.boss.name} waits` : `Stage ${run.stage} ahead`;
    sub = run.stage === 1 ? "The caravan watches you go." : "Catch your breath.";
  } else {
    const pick = rewards.itemPick;
    const item = pick && pick.kind !== "salvageAll" ? rewards.items[pick.index] : undefined;
    line = item
      ? `${pick?.kind === "equip" ? "Equipped" : "Taken"}: ${item.name}`
      : "All items salvaged";
    const spoil = rewards.spoilsPick !== null ? rewards.spoils[rewards.spoilsPick] : undefined;
    sub = spoil
      ? `Spoils: ${spoilsLabel(spoil, act.essence.name)}`
      : rewards.spoils.length
        ? ""
        : "No spoils this stage";
    if (rewards.salvagedDust > 0)
      sub += `${sub ? " · " : ""}+${rewards.salvagedDust} Dust from salvage`;
  }
  return (
    <div className="done-card panel-card" data-testid="done-card">
      <Icon name="fire" size={40} color="var(--accent)" />
      <strong className="title-font">{line}</strong>
      <span className="sub">{sub}</span>
    </div>
  );
}

/**
 * Between two stages (Intermission mock): the rewards of the last fight (item pick, then
 * spoils), Life and the Ember Flask, what comes next, and NEXT STAGE.
 */
export function IntermissionView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  settings: Settings;
  onCharacter: () => void;
  onTree: () => void;
  onMenu: () => void;
}) {
  const { state, run, game } = props;
  const act = getAct(POC_GAME_DATA, run.actId);
  const rewards = run.rewards;
  const step = !rewards
    ? "ready"
    : rewards.itemPick === null
      ? "items"
      : rewards.spoils.length > 0 && rewards.spoilsPick === null
        ? "spoils"
        : "done";
  const done = step === "ready" || step === "done";
  const nextStage = run.phase === "rewards" ? run.stage + 1 : run.stage;
  const boss = run.encounter?.boss === true && run.phase === "rewards";
  const title = step === "spoils" ? "SPOILS" : step === "ready" ? "READY" : "VICTORY";
  const subtitle =
    step === "items"
      ? "Choose 1 of 3 items"
      : step === "spoils"
        ? `${rewards?.rank === "boss" ? "Boss defeated" : rewards?.rank === "elite" ? "Elite defeated" : `Stage ${run.stage}`} · choose 1 of 3 spoils`
        : boss
          ? `${act.name} cleared`
          : `Ready for Stage ${nextStage}`;
  const used = state.inventory.length;
  const anyBlocked =
    step === "items" &&
    (rewards?.items ?? []).some((it) => takeBlockReason(state, POC_GAME_DATA, it) !== undefined);
  const gains: Record<string, number> = rewards
    ? {
        gold: rewards.gold,
        dust: rewards.dust + rewards.salvagedDust,
        reforge: rewards.reforgeStones,
        shards: rewards.ascensionShards,
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
        treeUnlocked={state.progress.trainerUnlocked}
        skillPoints={state.hero.unspentSkillPoints}
        onCharacter={props.onCharacter}
        onTree={props.onTree}
        onMenu={props.onMenu}
      />
      <div className="intermission-body">
        <aside className="intermission-left">
          <HeroCard state={state} run={run} game={game} settings={props.settings} />
          <UpNext run={run} />
        </aside>
        <main className="intermission-center">
          <h2 className="screen-title title-font">{title}</h2>
          <p className="screen-sub">{subtitle}</p>
          {rewards && step !== "ready" && (
            <p className="auto-rewards sub" data-testid="auto-rewards">
              +{fmt(rewards.xp)} XP · +{fmt(rewards.gold)} Gold · +{fmt(rewards.dust)} Dust
              {rewards.reforgeStones > 0 ? ` · +${rewards.reforgeStones} Reforge Stones` : ""}
              {rewards.ascensionShards > 0
                ? ` · +${rewards.ascensionShards} Ascension Shard${rewards.ascensionShards > 1 ? "s" : ""}`
                : ""}
            </p>
          )}
          {step === "items" && <ItemCards state={state} run={run} game={game} />}
          {step === "spoils" && <SpoilsCards run={run} game={game} />}
          {done && <DoneCard run={run} />}
          {step === "items" && (
            <div className="inventory-line">
              <span className={anyBlocked ? "inv-full" : "sub"}>
                {anyBlocked ? "Inventory full" : "Inventory"} · {used} items
              </span>
              <button type="button" className="btn" onClick={props.onCharacter}>
                <Icon name="inventory" size={16} />
                Open Inventory
              </button>
              <span className="sub">Unpicked items become Salvage Dust</span>
            </div>
          )}
        </main>
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
        {step === "items" && (
          <button
            type="button"
            className="btn"
            title={`All 3 items become Dust (+${(rewards?.items ?? []).reduce((n, it) => n + salvageValue(it), 0)})`}
            onClick={() => game.dispatch({ type: "salvageAll" })}
          >
            Salvage All
          </button>
        )}
        <button
          type="button"
          className="btn big primary next-stage"
          disabled={!done || (rewards !== null && !rewardsDone(rewards))}
          onClick={() => game.dispatchAll(nextStageActions(state, props.settings.autoFlask))}
        >
          {boss
            ? "RETURN TO CAMP"
            : nextStage === act.monsterLevels.length
              ? "FACE THE BOSS"
              : "NEXT STAGE"}
          <Icon name="strike" size={18} />
        </button>
        {!boss && (
          <button
            type="button"
            className="btn ghost"
            disabled={!done}
            title={
              done
                ? "Back to Camp. Gear and levels stay; the act starts over."
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
