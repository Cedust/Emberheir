import { GAME_DATA } from "@emberheir/content";
import {
  type GameAction,
  type GameState,
  bossKnown,
  type RunState,
  applyAction,
  damageShare,
  deriveStats,
  flaskCapacity,
  gateStages,
  currentNode,
  getAct,
  isQuiet,
  stageMonsterLevel,
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
import { useNoteHover } from "../../ui/ItemTooltip";
import { Icon, type IconName } from "../../ui/Icon";
import { Potion } from "../../ui/Potion";
import { Button } from "../../ui/kit/Button";
import { fmt } from "../../ui/items";
import { SkillIcon } from "../battle/SkillIcon";
import { skillTint } from "../battle/skills";
import { HeirFace } from "../camp/CampFigures";
import { bountyView } from "../bounty";
import { ShareBar } from "../camp/BattlePlanTab";
import { finaleFoe, inFinale } from "../finale";
import { bossName } from "../labels";
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
    // A quiet node of the act map (or one just left): on along the road first.
    if (s.run?.phase === "rewards" || s.run?.visit) step({ type: "continue" });
    const run = s.run;
    if (run?.phase !== "intermission") return actions;
    // The road leads onto a quiet node: its cards wait, no fight.
    const node = currentNode(run);
    if (node && isQuiet(node.kind)) return actions;
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
  return (
    <section className="panel-card hero-card" aria-label="Hero">
      <div className="hero-card-head">
        <div className="plaque-portrait">
          <HeirFace />
        </div>
        <div className="plaque-names">
          <span className="plaque-name title-font">Heir of the Ember</span>
        </div>
      </div>
      <XpBar
        key={run.encounter?.seed ?? run.stage}
        level={hero.level}
        xp={hero.xp}
        next={next}
        gained={gained}
        levels={run.rewards?.levelsGained ?? 0}
        prevNext={xpToNextLevel(hero.level - 1, levelCap(state.legacy.prestige))}
      />
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
        {/* One potion with its charges as a number: grows with the Flask without crowding. */}
        <div
          className="flask-stock"
          role="img"
          aria-label={`Ember Flask ${state.flaskCharges} of ${flaskMax}`}
        >
          <Potion full={state.flaskCharges > 0} className="flask-potion" />
          <span className="flask-count mono">
            {state.flaskCharges}/{flaskMax}
          </span>
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
              <SkillIcon skillId={r.id} size={16} />
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

/**
 * The Warden's Gate (laengere-runs-v1.md): before the boss of the run's newest act, Challenge it
 * (its fall brings The Harvest) or Wander on through the act to farm. The boss's level shows red
 * while the hero is below it.
 */
export function GateCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const act = getAct(GAME_DATA, run.actId);
  const next = run.phase === "rewards" || run.visit ? run.stage + 1 : run.stage;
  const boss = next >= act.stages;
  const level = stageMonsterLevel(GAME_DATA, act, next, state.legacy.prestige);
  const gap = level - state.hero.level;
  const walks = run.wanders ?? 0;
  const foe = boss
    ? bossKnown(state, GAME_DATA, act.id)
      ? act.boss.name
      : "the boss"
    : "the Gatekeeper";
  const challenge = () => game.dispatchAll(nextStageActions(state));
  const wander = () =>
    game.dispatchAll([
      ...(run.phase === "rewards" || run.visit ? [{ type: "continue" } as const] : []),
      { type: "wander" },
    ]);
  return (
    <div className="path-cards gate-cards" aria-label="Warden's Gate">
      <GateCard
        kind="challenge"
        icon={boss ? "boss" : "warden"}
        name="Challenge"
        text={boss ? `Face ${foe}. Its fall brings The Harvest.` : `Face ${foe} of this Waymark.`}
        tip={{
          name: "Challenge",
          kind: "Warden's Gate",
          explain: boss
            ? "Fight the boss now. Win, and the run ends in The Harvest: the next Prestige begins."
            : "Fight the Gatekeeper now. It guards the Waymark: a wall of the newest act.",
          status: `Level ${level} · you are ${state.hero.level}`,
        }}
        onClick={challenge}
      >
        <span className={`gate-level${gap >= 1 ? " below" : ""}`}>Level {level}</span>
      </GateCard>
      <GateCard
        kind="wander"
        icon="cycle"
        name="Wander"
        text="Walk the act again for levels and loot."
        tip={{
          name: "Wander",
          kind: "Warden's Gate",
          explain:
            "Back to Stage 1 of this act on a new map. Life, Flask and Boons stay. No new Shrines, Waymarks pay only once.",
          ...(walks ? { status: `Walked ${walks}× on this trip` } : {}),
        }}
        onClick={wander}
      >
        {walks > 0 && <span className="gate-level">Walked {walks}×</span>}
      </GateCard>
    </div>
  );
}

function GateCard(props: {
  kind: string;
  icon: IconName;
  name: string;
  text: string;
  tip: Parameters<typeof useNoteHover>[0];
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const hover = useNoteHover(props.tip);
  return (
    <button
      type="button"
      aria-label={props.name}
      className={`path-card panel-card gate-${props.kind}`}
      onClick={props.onClick}
      {...hover}
    >
      <span className="path-sigil">
        <Icon name={props.icon} size={34} />
      </span>
      <strong className="title-font">{props.name}</strong>
      <span className="sub">{props.text}</span>
      {props.children}
    </button>
  );
}

export function UpNext(props: { state: GameState; run: RunState; prestige: number }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const stages = act.stages;
  // During the rewards (and at a quiet node) the next stage is stage + 1.
  const next = run.phase === "rewards" || run.visit ? run.stage + 1 : run.stage;
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
        <span>Boss: {bossName(props.state, act)}</span>
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

export function DoneCard(props: { state: GameState; run: RunState }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  let line: string;
  let sub: string;
  if (!rewards) {
    // At a quiet node of the map the road ahead starts with the next stage.
    const ahead = run.visit ? run.stage + 1 : run.stage;
    const boss = ahead === act.stages;
    line = inFinale(act)
      ? `${finaleFoe(run.stage)} waits`
      : boss
        ? `${bossKnown(props.state, GAME_DATA, act.id) ? act.boss.name : "The boss"} waits`
        : `Stage ${ahead} ahead`;
    sub = "";
  } else if (run.visit && !rewards.items.length && rewards.boonPick == null) {
    line = "The road goes on";
    sub = rewards.xp ? `+${fmt(rewards.xp)} XP` : "";
  } else {
    const pick = rewards.itemPick;
    const item = pick && pick.kind !== "salvageAll" ? rewards.items[pick.index] : undefined;
    line = inFinale(act)
      ? `${finaleFoe(run.stage)} fades`
      : item
        ? `${pick?.kind === "equip" ? "Equipped" : "Taken"}: ${item.name}`
        : rewards.items.length
          ? "All items salvaged"
          : // A fight without an item pick drops no items, only its usual rewards.
            "The road goes on";
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
