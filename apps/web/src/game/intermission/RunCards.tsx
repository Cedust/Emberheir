import { GAME_DATA } from "@emberheir/content";
import {
  type GameAction,
  type GameState,
  type RunState,
  applyAction,
  damageShare,
  deriveStats,
  flaskCapacity,
  gateStages,
  getAct,
  heroReactions,
  heroSetup,
  isWallAct,
  levelCap,
  PROGRESSION,
  wildfireName,
  xpToNextLevel,
} from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import { fmt } from "../../ui/items";
import { skillIcon, skillTint } from "../battle/skills";
import { BoonBar } from "../Boons";
import { bountyView } from "../bounty";
import { ShareBar } from "../camp/KaelenView";
import { finaleFoe, inFinale } from "../finale";
import type { GameApi } from "../useGame";

/** The Intermission's side cards: the hero, the Battle Plan, what comes next, the bounty. */

/**
 * NEXT STAGE as one step: finish the rewards, start the fight. The flask is only drunk by
 * hand. After the boss, `continue` goes back to the Camp instead.
 */
export function nextStageActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  let s = state;
  const step = (a: GameAction) => {
    actions.push(a);
    s = applyAction(s, GAME_DATA, a);
  };
  try {
    if (s.run?.phase === "rewards") step({ type: "continue" });
    const run = s.run;
    if (run?.phase !== "intermission") return actions;
    step({ type: "startStage" });
  } catch {
    // useGame shows the error when it applies the same actions.
  }
  return actions;
}

export function HeroCard(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const hero = state.hero;
  const maxLife = deriveStats(heroSetup(state, GAME_DATA).setup).maxLife;
  const lifePct = Math.round(run.lifeFraction * 100);
  const canDrink = state.flaskCharges > 0 && run.lifeFraction < 1;
  const heal = canDrink ? Math.min(PROGRESSION.flaskHeal * 100, 100 - lifePct) : 0;
  const flaskMax = Math.max(flaskCapacity(state, GAME_DATA), state.flaskCharges);
  const gained = run.rewards?.xp ?? 0;
  const next = xpToNextLevel(hero.level, levelCap(state.legacy.prestige));
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
      {run.rewards?.waymark && (
        <div className="waymark-moment title-font" role="status">
          Waymark! +1 Skill Point
        </div>
      )}
      {run.rewards && run.rewards.levelsGained > 0 && (
        <div className="level-up title-font" role="status">
          Level up! More Life and Damage
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
      <BoonBar state={state} />
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
    </section>
  );
}

/** The Battle Plan at a glance, with each slot's damage share in the last fight. */
export function PlanCard(props: { state: GameState; run: RunState; onPlan: () => void }) {
  const { state, run } = props;
  const { setup } = heroSetup(state, GAME_DATA);
  const reactions = heroReactions(state, GAME_DATA, setup.weapon);
  const report = run.rewards?.report;
  const rows = [
    ...setup.rotation.map((r) => ({ id: r.skill.id, name: r.skill.name, reaction: false })),
    ...reactions.map((r) => ({ id: r.skill.id, name: r.skill.name, reaction: true })),
  ];
  return (
    <section className="panel-card plan-card" aria-label="Battle Plan">
      <span className="eyebrow">Battle Plan</span>
      <ul>
        {rows.map((r) => (
          <li key={`${r.id}-${r.reaction}`} className={r.reaction ? "reaction" : ""}>
            <span className="skill-chip" style={{ background: skillTint(r.id) }}>
              <Icon name={skillIcon(r.id)} size={16} color="#fff6e4" />
            </span>
            <span className="plan-card-name">{r.name}</span>
            {report &&
              (r.reaction ? (
                <span className="mono small">
                  ×{report.reactions.find((x) => x.skill === r.name)?.casts ?? 0}
                </span>
              ) : (
                <ShareBar share={damageShare(report, r.name)} />
              ))}
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={props.onPlan}>
        <Icon name="cycle" size={16} />
        Edit Battle Plan
      </button>
    </section>
  );
}

export function UpNext(props: { run: RunState; prestige: number }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const stages = act.stages;
  // During the rewards the next stage is stage + 1.
  const next = run.phase === "rewards" ? run.stage + 1 : run.stage;
  if (inFinale(act)) {
    return (
      <section className="panel-card up-next" aria-label="Up next">
        <span className="eyebrow">Up next</span>
        <div className="up-row">
          <span className="title-font">Stage {next}</span>
          <span className="sub">{finaleFoe(next)}</span>
        </div>
        {next < stages && (
          <div className="up-row">
            <Icon name="boss" size={16} color="#ff8a1f" />
            <span>{act.boss.name}</span>
            <span className="sub">Stage {stages}</span>
          </div>
        )}
      </section>
    );
  }
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
  // The Wildfire has no Shrines and no Gatekeepers.
  const shrine = run.wildfire ? undefined : act.shrineStages.find((s) => s >= next);
  const gate =
    !run.wildfire && isWallAct(GAME_DATA, act, props.prestige)
      ? gateStages(act).find((s) => s >= next)
      : undefined;
  return (
    <section className="panel-card up-next" aria-label="Up next">
      <span className="eyebrow">Up next</span>
      <div className="up-row">
        <span className="title-font">Stage {next}</span>
        <span className="sub">
          {act.name}
          {run.wildfire ? ` · ${wildfireName(run.wildfire)}` : ""}
        </span>
      </div>
      {shrine !== undefined && (
        <div className="up-row">
          <span className="shrine-mark" />
          <span>Ember Shrine</span>
          <span className="sub">
            after Stage {shrine} · {shrine === next ? "next" : `in ${shrine - next}`}
          </span>
        </div>
      )}
      {gate !== undefined && (
        <div className="up-row" title="An Elite guards this Waymark of the newest act.">
          <span className="gate-mark" />
          <span>Gatekeeper</span>
          <span className="sub">
            Stage {gate} · {gate === next ? "now" : `in ${gate - next}`}
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
    </section>
  );
}

/** The Scout's Bounty for this trip and how far it is. */
export function BountyCard(props: { run: RunState }) {
  const bounty = props.run.bounty;
  if (!bounty) return null;
  const view = bountyView(bounty);
  const counted = view.target > 1 && bounty.status === "open";
  return (
    <section
      className={`panel-card bounty-card ${bounty.status}`}
      aria-label="Bounty"
      title="Eldrin's task for this trip. Done, it pays at once."
    >
      <div className="section-row">
        <span className="eyebrow">
          <Icon name="target" size={12} /> Bounty · {view.def.name}
        </span>
        <span className="mono small">
          {bounty.status === "done"
            ? "Done"
            : bounty.status === "failed"
              ? "Failed"
              : counted
                ? `${bounty.progress}/${view.target}`
                : "Open"}
        </span>
      </div>
      <span className="small">{view.text}</span>
    </section>
  );
}

/** The moment a Bounty is done: Eldrin pays it back in the Camp. */
export function BountyDone() {
  return (
    <div className="bounty-paid panel-card" role="status">
      <Icon name="target" size={28} color="var(--accent)" />
      <div className="bounty-paid-text">
        <strong className="title-font">Bounty done!</strong>
        <span className="sub">Turn it in at Eldrin in the Camp.</span>
      </div>
    </div>
  );
}

export function DoneCard(props: { run: RunState }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  let line: string;
  let sub: string;
  if (!rewards) {
    const boss = run.stage === act.stages;
    line = inFinale(act)
      ? `${finaleFoe(run.stage)} waits`
      : boss
        ? `${act.boss.name} waits`
        : `Stage ${run.stage} ahead`;
    sub = run.stage === 1 ? "The caravan watches you go." : "Catch your breath.";
  } else {
    const pick = rewards.itemPick;
    const item = pick && pick.kind !== "salvageAll" ? rewards.items[pick.index] : undefined;
    line = inFinale(act)
      ? `${finaleFoe(run.stage)} fades`
      : item
        ? `${pick?.kind === "equip" ? "Equipped" : "Taken"}: ${item.name}`
        : "All items salvaged";
    sub = "";
    const boon = rewards.boonPick != null ? rewards.boonOffer?.[rewards.boonPick] : undefined;
    const boonName = boon && GAME_DATA.boons?.find((b) => b.id === boon.id)?.name;
    if (boonName) sub += `${sub ? " · " : ""}Boon: ${boonName}`;
    if (rewards.salvagedAsh > 0)
      sub += `${sub ? " · " : ""}+${rewards.salvagedAsh} Ash from salvage`;
  }
  return (
    <div className="done-card panel-card" data-testid="done-card">
      <Icon name="fire" size={40} color="var(--accent)" />
      <strong className="title-font">{line}</strong>
      <span className="sub">{sub}</span>
    </div>
  );
}
