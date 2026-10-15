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
  type ActData,
  getAct,
  hearthEmbers,
  ROUTE_KINDS,
  type RouteKind,
  routeAt,
  thiefTrailOpen,
  heroReactions,
  heroSetup,
  isWallAct,
  levelCap,
  PROGRESSION,
  wildfireName,
  xpToNextLevel,
  tripOmenEffects,
} from "@emberheir/sim";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { Button } from "../../ui/kit/Button";
import { fmt } from "../../ui/items";
import { skillIcon, skillTint } from "../battle/skills";
import { BoonBar } from "../Boons";
import { bountyView } from "../bounty";
import { ShareBar } from "../camp/BattlePlanTab";
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
  // Parched (a Wildfire Omen) takes the Flask for the whole trip.
  const parched = tripOmenEffects(state, GAME_DATA).flaskHeal <= 0;
  const canDrink = !parched && state.flaskCharges > 0 && run.lifeFraction < 1;
  const heal = canDrink ? Math.min(PROGRESSION.flaskHeal * 100, 100 - lifePct) : 0;
  const flaskMax = Math.max(flaskCapacity(state, GAME_DATA), state.flaskCharges);
  const gained = run.rewards?.xp ?? 0;
  const next = xpToNextLevel(hero.level, levelCap(state.legacy.prestige));
  // A won Waymark before the boss heals (neuausrichtung-v1.md 5.4).
  const hearth =
    run.rewards !== null && hearthEmbers(getAct(GAME_DATA, run.actId), run.stage, run.wildfire);
  return (
    <section className="panel-card hero-card" aria-label="Hero">
      <div className="hero-card-head">
        <div className="plaque-portrait">
          <Icon name="user" size={24} color="#f3e6c8" />
        </div>
        <div className="plaque-names">
          <span className="plaque-name title-font">Heir of the Ember</span>
        </div>
      </div>
      {(run.rewards?.waymark || hearth) && (
        <div className="waymark-moment title-font" role="status">
          {[
            run.rewards?.waymark ? "Waymark! +1 Skill Point" : "",
            hearth ? `Hearth Embers: +${Math.round(PROGRESSION.hearthEmbers * 100)} % Life` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
      {run.rewards?.ashbornLevels ? (
        <div className="level-up title-font" role="status">
          Ashborn {state.hero.ashborn?.level ?? ""}! A point for the Character Sheet
        </div>
      ) : null}
      <XpBar
        key={run.encounter?.seed ?? run.stage}
        level={hero.level}
        xp={hero.xp}
        next={next}
        gained={gained}
        levels={run.rewards?.levelsGained ?? 0}
        prevNext={xpToNextLevel(hero.level - 1, levelCap(state.legacy.prestige))}
      />
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
        <Button
          variant="primary"
          icon="flask"
          blocked={canDrink ? null : state.flaskCharges > 0 ? "Life full" : "Flask empty"}
          onClick={() => game.dispatch({ type: "useFlask" })}
        >
          {canDrink
            ? `Drink +${Math.round(heal)}% Life`
            : state.flaskCharges > 0
              ? "Life full"
              : "Flask empty"}
        </Button>
      </div>
    </section>
  );
}

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * The XP bar fills up with the XP of the last fight. A level up runs it full, lets it flare and
 * starts it over at the new level (no banner, Timo).
 */
function XpBar(props: {
  level: number;
  xp: number;
  next: number;
  gained: number;
  levels: number;
  /** XP the level before needed (where a level up starts from). */
  prevNext: number;
}) {
  const { level, xp, next, gained, levels, prevNext } = props;
  const capped = !Number.isFinite(next);
  const target = capped ? 100 : Math.min(100, (xp / next) * 100);
  // Before the fight: the old fill (a level up starts from somewhere on the old bar).
  const before =
    levels === 1
      ? Math.max(0, ((prevNext - (gained - xp)) / prevNext) * 100)
      : levels > 1
        ? 0
        : Math.max(0, ((xp - gained) / next) * 100);
  const animate = gained > 0 && !capped && !reducedMotion();
  const [shown, setShown] = useState({
    pct: animate ? before : target,
    level: animate && levels > 0 ? level - levels : level,
    instant: true,
  });
  const [flare, setFlare] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    if (levels > 0) {
      at(150, () => setShown((s) => ({ ...s, pct: 100, instant: false })));
      at(900, () => {
        setFlare(true);
        setShown({ pct: 0, level, instant: true });
      });
      at(980, () => setShown({ pct: target, level, instant: false }));
      at(2200, () => setFlare(false));
    } else {
      at(150, () => setShown((s) => ({ ...s, pct: target, instant: false })));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Runs once per fight (the parent keys it by encounter).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`xp-block${flare ? " flare" : ""}`}>
      <div className="xp-head">
        <span className="title-font xp-level">Level {shown.level}</span>
        <span className="mono small">
          {capped ? "Max" : `${fmt(xp)} / ${fmt(next)}`}
          {gained > 0 && <span className="xp-gain"> +{fmt(gained)}</span>}
        </span>
      </div>
      <div
        className="xp-bar-big"
        role="meter"
        aria-label="XP"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(target)}
      >
        <div
          className={`fill${shown.instant ? " instant" : ""}`}
          style={{ width: `${shown.pct}%` }}
        />
      </div>
    </div>
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
      <Button icon="cycle" onClick={props.onPlan}>
        Edit Battle Plan
      </Button>
    </section>
  );
}

/** The paths of a fork (neuausrichtung-v1.md 6.2): what each one holds. */
const ROUTE_TEXT: Record<RouteKind, { name: string; text: string; icon: IconName }> = {
  elite: { name: "Elite Path", text: "Two Elites in a row, with their themed loot.", icon: "boss" },
  shrine: { name: "Shrine Path", text: "Two fights, then an Ember Shrine.", icon: "flame" },
  hearth: { name: "Hearth Path", text: "Two fights, then a fire: +25 % Life.", icon: "fire" },
  thief: { name: "Thief's Trail", text: "The Ember Thief waits on it.", icon: "target" },
};

/**
 * A fork of the road, in the middle of the Intermission: one big card per path. There is no
 * default; NEXT STAGE waits until one is chosen (Timo).
 */
export function PathCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const act = getAct(GAME_DATA, run.actId);
  const next = run.phase === "rewards" ? run.stage + 1 : run.stage;
  const at = routeAt(run, act, next);
  if (!at || at.second) return null;
  const chosen = run.routes?.[String(at.fork)];
  const kinds = ROUTE_KINDS.filter((k) => k !== "thief" || thiefTrailOpen(state, GAME_DATA));
  return (
    <div className="path-cards" role="radiogroup" aria-label="Choose a path">
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={chosen === k}
          aria-label={ROUTE_TEXT[k].name}
          className={`path-card panel-card path-${k}${chosen === k ? " chosen" : ""}`}
          onClick={() => game.dispatch({ type: "chooseRoute", route: k })}
        >
          <span className="path-sigil">
            <Icon name={ROUTE_TEXT[k].icon} size={34} />
          </span>
          <strong className="title-font">{ROUTE_TEXT[k].name}</strong>
          <span className="sub">{ROUTE_TEXT[k].text}</span>
        </button>
      ))}
    </div>
  );
}

/** The path taken at a fork, while it lasts. */
function PathRow(props: { run: RunState; act: ActData; next: number }) {
  const at = routeAt(props.run, props.act, props.next);
  const chosen = at && props.run.routes?.[String(at.fork)];
  if (!at || !chosen) return null;
  return (
    <div className="up-row" title={ROUTE_TEXT[chosen].text}>
      <Icon name={ROUTE_TEXT[chosen].icon} size={16} color="var(--heat)" />
      <span>{ROUTE_TEXT[chosen].name}</span>
      <span className="sub">
        Stages {at.fork}–{at.fork + 1}
      </span>
    </div>
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
      {(run.omens ?? []).map((id) => {
        const omen = GAME_DATA.omens?.find((o) => o.id === id);
        return omen ? (
          <div
            key={id}
            className="up-row omen-row"
            title={`${omen.price}${omen.reward ? ` ${omen.reward}` : ""}`}
          >
            <span className="omen-mark" />
            <span>Omen: {omen.name}</span>
            <span className="sub">{omen.peril ? `Peril ${omen.peril}` : omen.price}</span>
          </div>
        ) : null;
      })}
      <PathRow run={run} act={act} next={next} />
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
    sub = "";
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
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}
