import { GAME_DATA } from "@emberheir/content";
import {
  AILMENT_SOURCE,
  BATTLE_PLAN_LADDER,
  type BattlePlanState,
  type BattlePlanUnlocks,
  CAPSTONES,
  type GameState,
  PROGRESSION,
  REACTION_CONDITIONS,
  REACTION_COOLDOWN,
  SLOT_CONDITIONS,
  SLOT_MODIFIERS,
  type SlotModifier,
  battlePlanUnlocks,
  damageShare,
  modifierAllowed,
  reactionConditionAllowed,
  unlockPrestige,
  deriveStats,
  estimateRotation,
  heatPerSecond,
  heroSetup,
  knownSkills,
  masteryPointsLeft,
  respecAcorns,
  spentInTree,
  triggerThreshold,
} from "@emberheir/sim";
import { Suspense, useState } from "react";
import { Icon } from "../../ui/Icon";
import {
  type TabItem,
  Medallion,
  Tabs,
  Window,
  WindowHeader,
  WindowLayer,
} from "../../ui/kit/Window";
import { CurrencyChip } from "../../ui/kit/Currency";
import { useNoteHover } from "../../ui/ItemTooltip";
import { skillIcon, skillTint } from "../battle/skills";
import type { GameApi } from "../useGame";
import { MasteryTab, SkillTreeTab } from "../lazyViews";
import { PersonaPortrait } from "./art/PersonaArt";
import { PaintDefs } from "./art/paint";
import { TrainingDummyTab } from "./TrainingDummyTab";

/** Prestige that opens each Rotation / Reaction Slot (from the Battle Plan ladder). */
const unlocksOf = (upgrade: "rotationSlot" | "reactionSlot", max: number) =>
  Array.from({ length: max }, (_, i) => unlockPrestige(upgrade, i + 1)).filter(
    (p): p is number => p !== undefined,
  );
const ROTATION_UNLOCK = unlocksOf("rotationSlot", 4);
const REACTION_UNLOCK = unlocksOf("reactionSlot", 2);

function Flames(props: { wait: number }) {
  if (props.wait < 0.3) {
    return (
      <span className="chain-plus" title="Back to back">
        +
      </span>
    );
  }
  const n = props.wait < 2.5 ? 1 : props.wait < 5 ? 2 : 3;
  return (
    <span
      className="chain-flames"
      title={n === 1 ? "Short wait" : n === 2 ? "Medium wait" : "Long wait"}
    >
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} name="flame" size={14} />
      ))}
    </span>
  );
}

/** A small labelled dropdown for the Battle Plan cards. */
function PlanSelect(props: {
  label: string;
  value: string;
  options: readonly { readonly id: string; readonly name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="plan-select">
      <span className="eyebrow">{props.label}</span>
      <select
        aria-label={props.label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const NO_MODIFIER = { id: "", name: "—" };

/** Modifier dropdowns of one slot (one per unlocked Modifier). */
function ModifierSelects(props: {
  count: number;
  unlocks: BattlePlanUnlocks;
  value: readonly SlotModifier[];
  onChange: (mods: SlotModifier[]) => void;
}) {
  return (
    <>
      {Array.from({ length: props.count }, (_, m) => (
        <PlanSelect
          key={m}
          label={props.count > 1 ? `Modifier ${m + 1}` : "Modifier"}
          value={props.value[m] ?? ""}
          options={[NO_MODIFIER, ...SLOT_MODIFIERS].filter(
            (o) =>
              o.id === "" ||
              o.id === props.value[m] ||
              (modifierAllowed(o.id as SlotModifier, props.unlocks) &&
                !props.value.includes(o.id as SlotModifier)),
          )}
          onChange={(id) => {
            const next = [...props.value];
            next[m] = id as SlotModifier;
            props.onChange(next.filter(Boolean));
          }}
        />
      ))}
    </>
  );
}

/** Damage share of one slot in the last fight ("Plan-Feedback ohne Text"). */
export function ShareBar(props: { share: number; label?: string }) {
  const pct = Math.round(props.share * 100);
  return (
    <span className="share-bar" title={`${props.label ?? "Damage"} last fight: ${pct} %`}>
      <span className="share-track">
        <span className="share-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="mono small">{pct}%</span>
    </span>
  );
}

function BattlePlanTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [slot, setSlot] = useState(0);
  const { setup } = heroSetup(state, GAME_DATA);
  const stats = deriveStats(setup);
  const known = knownSkills(state, GAME_DATA, setup.weapon);
  const rate = heatPerSecond(setup, stats);
  const slots = setup.rotation.map((r) => ({
    name: r.skill.name,
    id: r.skill.id,
    heatCost: r.skill.heatCost,
    threshold: triggerThreshold(r.skill.heatCost, r.threshold),
  }));
  const chain = estimateRotation(slots, rate, stats.startingHeat);
  const prestige = state.legacy.prestige;
  const unlocks = battlePlanUnlocks(prestige);
  const plan = state.hero.plan;
  const setPlan = (patch: Partial<BattlePlanState>) =>
    game.dispatch({ type: "setBattlePlan", plan: { ...plan, ...patch } });
  const at = <T,>(list: readonly T[], i: number, value: T, empty: T): T[] => {
    const next = Array.from({ length: Math.max(list.length, i + 1) }, (_, j) => list[j] ?? empty);
    next[i] = value;
    return next;
  };

  const current = (i: number) => {
    const id = state.hero.rotation[i] ?? null;
    return id === null ? known.find((k) => k.startSkill) : known.find((k) => k.skill.id === id);
  };
  const skillOptions = [
    { id: "", name: "—" },
    ...known.map((k) => ({ id: k.skill.id, name: k.skill.name })),
  ];
  const capstoneCost = plan.capstone ? PROGRESSION.capstoneChangeAcorns : 0;
  const report = state.run?.rewards?.report;

  return (
    <div className="plan-layout">
      <main className="plan-main">
        <section>
          <div className="section-row">
            <span className="title-font section-title">Rotation</span>
          </div>
          <div className="plan-slots">
            {ROTATION_UNLOCK.map((p, i) => {
              const unlocked = i < state.progress.rotationSlots;
              const k = unlocked ? current(i) : undefined;
              if (!unlocked || !k) {
                return (
                  <div key={i} className="plan-slot panel-card locked">
                    <span className="eyebrow">SLOT {i + 1}</span>
                    <Icon name="lock" size={22} />
                    <span className="sub">Unlocks at Prestige {p}</span>
                  </div>
                );
              }
              const cost = k.skill.heatCost;
              const thresholds = [
                { id: "", name: `${cost} (cost)` },
                ...Array.from({ length: Math.floor((100 - cost) / 10) }, (_, n) => {
                  const v = Math.ceil((cost + 1) / 10) * 10 + n * 10;
                  return { id: String(v), name: String(v) };
                }).filter((o) => Number(o.id) <= 100),
              ];
              return (
                <div
                  key={i}
                  className={`plan-slot panel-card ${slot === i ? "on" : ""}`}
                  data-testid={`rotation-slot-${i}`}
                >
                  <button
                    type="button"
                    className="plan-slot-head"
                    aria-label={`Rotation Slot ${i + 1}`}
                    aria-pressed={slot === i}
                    onClick={() => setSlot(i)}
                  >
                    <span className="eyebrow">SLOT {i + 1}</span>
                    <span className="plan-skill">
                      <span className="skill-chip" style={{ background: skillTint(k.skill.id) }}>
                        <Icon name={skillIcon(k.skill.id)} size={24} color="#fff6e4" />
                      </span>
                      <span className="title-font">{k.skill.name}</span>
                    </span>
                    <span className="sub small">
                      Lv {k.level} · {cost} Heat{k.startSkill ? " · Innate" : ""}
                    </span>
                  </button>
                  {report && <ShareBar share={damageShare(report, k.skill.name)} />}
                  {unlocks.thresholds && (
                    <PlanSelect
                      label="Fires at Heat"
                      value={plan.thresholds[i] != null ? String(plan.thresholds[i]) : ""}
                      options={thresholds}
                      onChange={(id) =>
                        setPlan({
                          thresholds: at(plan.thresholds, i, id ? Number(id) : null, null),
                        })
                      }
                    />
                  )}
                  <ModifierSelects
                    count={unlocks.modifiers}
                    unlocks={unlocks}
                    value={plan.modifiers[i] ?? []}
                    onChange={(mods) => setPlan({ modifiers: at(plan.modifiers, i, mods, []) })}
                  />
                  {unlocks.conditions && (
                    <PlanSelect
                      label="Only if"
                      value={plan.conditions[i] ?? ""}
                      options={[{ id: "", name: "Always" }, ...SLOT_CONDITIONS]}
                      onChange={(id) =>
                        setPlan({ conditions: at(plan.conditions, i, id || null, null) })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <section>
          <div className="section-row">
            <span className="title-font section-title">Reactions</span>
          </div>
          <div className="plan-slots reactions">
            {REACTION_UNLOCK.map((p, i) => {
              if (i >= unlocks.reactionSlots) {
                return (
                  <div key={p} className="plan-slot panel-card locked">
                    <Icon name="lock" size={20} />
                    <span className="sub">Unlocks at Prestige {p}</span>
                  </div>
                );
              }
              const r = plan.reactions[i] ?? null;
              const skill = known.find((k) => k.skill.id === r?.skillId);
              return (
                <div key={p} className="plan-slot panel-card" data-testid={`reaction-slot-${i}`}>
                  <span className="eyebrow">REACTION {i + 1}</span>
                  {skill ? (
                    <span className="plan-skill">
                      <span
                        className="skill-chip"
                        style={{ background: skillTint(skill.skill.id) }}
                      >
                        <Icon name={skillIcon(skill.skill.id)} size={24} color="#fff6e4" />
                      </span>
                      <span className="title-font">{skill.skill.name}</span>
                    </span>
                  ) : (
                    <span className="sub">Empty</span>
                  )}
                  {report && skill && (
                    <span className="sub small mono" title="Fired last fight">
                      ×{report.reactions.find((x) => x.skill === skill.skill.name)?.casts ?? 0}
                    </span>
                  )}
                  <PlanSelect
                    label="Skill"
                    value={r?.skillId ?? ""}
                    options={skillOptions}
                    onChange={(id) =>
                      setPlan({
                        reactions: at(
                          plan.reactions,
                          i,
                          id ? { skillId: id, conditionId: r?.conditionId ?? "life-50" } : null,
                          null,
                        ),
                      })
                    }
                  />
                  {r && (
                    <PlanSelect
                      label="When"
                      value={r.conditionId}
                      options={REACTION_CONDITIONS.filter(
                        (c) => c.id === r.conditionId || reactionConditionAllowed(c.id, unlocks),
                      )}
                      onChange={(id) =>
                        setPlan({
                          reactions: at(plan.reactions, i, { ...r, conditionId: id }, null),
                        })
                      }
                    />
                  )}
                  <ModifierSelects
                    count={unlocks.modifiers}
                    unlocks={unlocks}
                    value={plan.reactionModifiers[i] ?? []}
                    onChange={(mods) =>
                      setPlan({ reactionModifiers: at(plan.reactionModifiers, i, mods, []) })
                    }
                  />
                </div>
              );
            })}
            {unlocks.openingMove ? (
              <div className="plan-slot panel-card" data-testid="opening-move">
                <span className="eyebrow">OPENING MOVE</span>
                <PlanSelect
                  label="Skill"
                  value={plan.openingMove ?? ""}
                  options={skillOptions}
                  onChange={(id) => setPlan({ openingMove: id || null })}
                />
                <span className="sub small">Free at fight start</span>
              </div>
            ) : null}
            {unlocks.reactionSlots > 0 && (
              <span className="sub small reaction-note">{REACTION_COOLDOWN} s cooldown</span>
            )}
          </div>
        </section>
        <section className="chain panel-card" aria-label="One rotation">
          <div className="section-row">
            <span className="title-font section-title">One rotation</span>
            <span className="sub">≈ {rate.toFixed(1)} Heat/s</span>
            {report && (
              <span className="chain-report">
                <span className="sub small">{setup.weapon.defaultAttack}</span>
                <ShareBar
                  share={damageShare(report, setup.weapon.defaultAttack)}
                  label={setup.weapon.defaultAttack}
                />
                <span className="sub small">{AILMENT_SOURCE}</span>
                <ShareBar share={damageShare(report, AILMENT_SOURCE)} label={AILMENT_SOURCE} />
              </span>
            )}
          </div>
          <div className="chain-row">
            {chain.length === 0 && (
              <span className="sub">No Heat builds up: the rotation never fires.</span>
            )}
            {chain.map((step, i) => {
              const s = slots[step.slot];
              if (!s) return null;
              return (
                <span key={i} className="chain-step">
                  <Flames wait={step.wait} />
                  <span
                    className="skill-chip"
                    title={s.name}
                    style={{ background: skillTint(s.id) }}
                  >
                    <Icon name={skillIcon(s.id)} size={22} color="#fff6e4" />
                  </span>
                </span>
              );
            })}
            {chain.length > 0 && (
              <span className="chain-cycle" title="Starts over">
                <Icon name="cycle" size={20} />
              </span>
            )}
          </div>
        </section>
      </main>
      <aside className="plan-side">
        <section className="panel-card known">
          <div className="section-row">
            <span className="title-font section-title">Known Skills</span>
            <span className="sub small">Pick a slot, then a skill</span>
          </div>
          <ul className="known-skills">
            {known.map((k) => {
              const active = current(slot)?.skill.id === k.skill.id;
              return (
                <li key={k.skill.id}>
                  <button
                    type="button"
                    className={`known-skill ${active ? "on" : ""}`}
                    aria-pressed={active}
                    onClick={() =>
                      game.dispatch({
                        type: "setRotationSkill",
                        slot,
                        skillId: k.startSkill ? null : k.skill.id,
                      })
                    }
                  >
                    <span className="skill-chip" style={{ background: skillTint(k.skill.id) }}>
                      <Icon name={skillIcon(k.skill.id)} size={20} color="#fff6e4" />
                    </span>
                    <span className="known-text">
                      <span className="title-font">
                        {k.skill.name} <span className="sub small">Lv {k.level}</span>
                      </span>
                      <span className="sub small">
                        {k.skill.heatCost} Heat · {k.skill.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        {unlocks.capstone ? (
          <section className="panel-card capstones" aria-label="Capstone">
            <div className="section-row">
              <span className="title-font section-title">Capstone</span>
              {capstoneCost > 0 && (
                <span className="sub small">Switch · {capstoneCost} Acorns</span>
              )}
            </div>
            <ul>
              {CAPSTONES.map((c) => {
                const on = plan.capstone?.id === c.id;
                const echoSlot = c.id === "echo" ? slot : (plan.capstone?.slot ?? 0);
                const blocked = !on && plan.capstone !== null && state.wallet.acorns < capstoneCost;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`capstone ${on ? "on" : ""}`}
                      aria-pressed={on}
                      disabled={blocked || (on && c.id !== "echo")}
                      title={c.text}
                      onClick={() => setPlan({ capstone: { id: c.id, slot: echoSlot } })}
                    >
                      <span className="title-font">
                        {c.name}
                        {c.id === "echo" && on ? ` · Slot ${(plan.capstone?.slot ?? 0) + 1}` : ""}
                      </span>
                      <span className="sub small">{c.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="panel-card ladder">
            <span className="title-font section-title">Battle Plan upgrades</span>
            <ol>
              {BATTLE_PLAN_LADDER.map((u, i) => (
                <li key={u.name} className={i < prestige ? "done" : i === prestige ? "next" : ""}>
                  <span className="mono">P{i + 1}</span> {u.name}
                </li>
              ))}
            </ol>
          </section>
        )}
      </aside>
    </div>
  );
}

/**
 * Kaelen (Trainer mock): the Skill Tree with pending nodes (Confirm / Undo) and the Battle
 * Plan. During a run the T key opens the tree view only.
 */
export function KaelenView(props: {
  state: GameState;
  game: GameApi;
  /** The Skill Tree is view-only (during a run). */
  viewOnly: boolean;
  /** The Battle Plan can be changed (Camp and between stages, not mid-fight). */
  planEditable?: boolean;
  initialTab?: "tree" | "plan" | "mastery";
  onClose: () => void;
}) {
  const { state, game, viewOnly } = props;
  const planEditable = props.planEditable ?? !viewOnly;
  const [tab, setTab] = useState<"tree" | "plan" | "mastery" | "dummy">(props.initialTab ?? "tree");
  const [respec, setRespec] = useState(false);
  const spent = spentInTree(GAME_DATA, state.hero.learned, state.hero.classId);
  const respecPrice = respecAcorns(state.legacy.prestige);
  const canRespec = !viewOnly && spent > 0 && state.wallet.acorns >= respecPrice;
  const tabs: TabItem<typeof tab>[] = [
    { id: "tree", name: "Skill Tree", icon: "tree" },
    { id: "mastery", name: "Weapon Mastery", icon: "sword" },
    ...(planEditable
      ? [{ id: "plan" as const, name: "Battle Plan", icon: "strike" as const }]
      : []),
    ...(viewOnly ? [] : [{ id: "dummy" as const, name: "Training Dummy", icon: "eye" as const }]),
  ];

  return (
    <WindowLayer mode="full">
      <PaintDefs />
      <Window
        label="Kaelen"
        role="dialog"
        mode="full"
        className="kaelen"
        header={
          <WindowHeader
            title="Kaelen"
            sub="Trainer"
            medallion={
              <Medallion tint="#6a2a20">
                <PersonaPortrait id="kaelen" />
              </Medallion>
            }
            tabs={<Tabs label="Trainer" items={tabs} active={tab} onChange={setTab} />}
            right={
              <>
                <div className="wallet-row small-wallet k-wallet">
                  <PointChip
                    testId="skill-points"
                    value={state.hero.unspentSkillPoints}
                    name="Skill Points"
                    explain="Learn nodes in the Skill Tree. You earn them at Waymarks on the road."
                  />
                  <PointChip
                    value={masteryPointsLeft(state, GAME_DATA)}
                    name="Mastery Points"
                    explain="Spend them in your weapon's Mastery tree. Weapon Ranks give more."
                  />
                  <CurrencyChip id="acorns" amount={state.wallet.acorns} named />
                </div>
                {!viewOnly &&
                  (tab === "tree" || tab === "plan") &&
                  (respec ? (
                    <span className="respec-confirm">
                      <span className="sub small">Forget all nodes?</span>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          game.dispatch({ type: "respecTree" });
                          setRespec(false);
                        }}
                      >
                        Yes, respec
                      </button>
                      <button type="button" className="btn" onClick={() => setRespec(false)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      disabled={!canRespec}
                      title={
                        spent === 0
                          ? "Nothing learned yet"
                          : "All Skill Points come back. The Battle Plan resets."
                      }
                      onClick={() => setRespec(true)}
                    >
                      Respec · {respecPrice} Acorns
                    </button>
                  ))}
              </>
            }
            onClose={props.onClose}
          />
        }
      >
        <Suspense fallback={null}>
          {tab === "dummy" && !viewOnly ? (
            <TrainingDummyTab state={state} game={game} />
          ) : tab === "mastery" ? (
            <MasteryTab state={state} game={game} viewOnly={viewOnly} />
          ) : tab === "tree" || !planEditable ? (
            <SkillTreeTab state={state} game={game} viewOnly={viewOnly} />
          ) : (
            <BattlePlanTab state={state} game={game} />
          )}
        </Suspense>
      </Window>
    </WindowLayer>
  );
}

/** Unspent points in the header, explained on hover. */
function PointChip(props: { value: number; name: string; explain: string; testId?: string }) {
  const hover = useNoteHover({
    name: props.name,
    kind: "Points",
    explain: props.explain,
    status: `${props.value} left to spend`,
  });
  return (
    <span className="k-currency" data-testid={props.testId} tabIndex={0} {...hover}>
      <b className="mono">{props.value}</b> <span className="sub">{props.name}</span>
    </span>
  );
}
