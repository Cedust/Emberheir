import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
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
  type SkillNode,
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
  learnBlockReason,
  learnNodes,
  nodeMaxRanks,
  nodeRanks,
  prestigeBranchNodes,
  spentInTree,
  triggerThreshold,
} from "@emberheir/sim";
import { type KeyboardEvent, useState } from "react";
import { Icon } from "../../ui/Icon";
import { fmt } from "../../ui/items";
import { skillIcon, skillTint } from "../battle/skills";
import { LEARN_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";

const SCALE = 76;
const PAD = 64;
/** The base tree; Prestige branch nodes have their own panel. */
const BASE_NODES = SKILL_TREE.nodes.filter((n) => !n.prestigeBranch);
const xs = BASE_NODES.map((n) => n.x);
const ys = BASE_NODES.map((n) => n.y);
const MIN_X = Math.min(...xs);
const MIN_Y = Math.min(...ys);
const WIDTH = (Math.max(...xs) - MIN_X) * SCALE + PAD * 2;
const HEIGHT = (Math.max(...ys) - MIN_Y) * SCALE + PAD * 2;
const px = (n: SkillNode) => (n.x - MIN_X) * SCALE + PAD;
const py = (n: SkillNode) => (n.y - MIN_Y) * SCALE + PAD;

const BRANCHES = [
  { id: "core", name: "Core", color: "#c9a063" },
  { id: "might", name: "Might", color: "#c9c2b8" },
  { id: "arcana", name: "Arcana", color: "#5b8cff" },
  { id: "rupture", name: "Rupture", color: "#d0505c" },
  { id: "affliction", name: "Affliction", color: "#a35cff" },
] as const;
const branchColor = (b: string) => BRANCHES.find((x) => x.id === b)?.color ?? "#b3a288";

/** Branch names placed beyond the end of each branch. */
const BRANCH_LABELS = BRANCHES.map((branch) => {
  const nodes = BASE_NODES.filter((n) => n.branch === branch.id);
  const avg = (f: (n: SkillNode) => number) =>
    nodes.reduce((sum, n) => sum + f(n), 0) / Math.max(1, nodes.length);
  return {
    ...branch,
    x: avg(px),
    y: branch.id === "core" ? Math.max(...nodes.map(py)) + 44 : avg(py) + 120,
  };
});

const KIND_LABEL: Record<SkillNode["kind"], string> = {
  minor: "Minor",
  notable: "Notable",
  skill: "Skill",
  keystone: "Keystone",
};

/** Prestige that opens each Rotation / Reaction Slot (from the Battle Plan ladder). */
const unlocksOf = (upgrade: "rotationSlot" | "reactionSlot", max: number) =>
  Array.from({ length: max }, (_, i) => unlockPrestige(upgrade, i + 1)).filter(
    (p): p is number => p !== undefined,
  );
const ROTATION_UNLOCK = unlocksOf("rotationSlot", 4);
const REACTION_UNLOCK = unlocksOf("reactionSlot", 2);

function NodeShape(props: {
  node: SkillNode;
  className: string;
  onClick: () => void;
  ranks: number;
  x: number;
  y: number;
}) {
  const { node, x, y } = props;
  const common = {
    className: props.className,
    onClick: props.onClick,
    role: "button",
    "aria-label": node.name,
    tabIndex: 0,
    style: { "--branch": branchColor(node.branch) } as React.CSSProperties,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") props.onClick();
    },
  };
  const max = nodeMaxRanks(node);
  let shape;
  if (node.kind === "skill") {
    shape = (
      <rect
        {...common}
        x={x - 15}
        y={y - 15}
        width={30}
        height={30}
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  } else if (node.kind === "keystone") {
    shape = <rect {...common} x={x - 19} y={y - 19} width={38} height={38} rx={4} />;
  } else {
    shape = <circle {...common} cx={x} cy={y} r={node.kind === "notable" ? 17 : 11} />;
  }
  return (
    <g>
      {shape}
      {max > 1 && (
        <text className="node-ranks" x={x} y={y + 34} textAnchor="middle">
          {props.ranks}/{max}
        </text>
      )}
    </g>
  );
}

const PB_X = 76;
const PB_Y = 52;
const PB_PAD = 26;
/** Room below the last row for rank labels. */
const PB_BOTTOM = 40;
/** Mini trees are drawn at tree scale and shown smaller. */
const PB_SHOWN = 0.64;

/** The Prestige branches as small chains: unlocked ones learnable, the rest dimmed. */
function PrestigeBranches(props: {
  branches: readonly string[];
  nodeClass: (node: SkillNode) => string;
  ranks: (id: string) => number;
  onSelect: (id: string) => void;
}) {
  const all = SKILL_TREE.prestigeBranches ?? [];
  const sorted = [
    ...all.filter((b) => props.branches.includes(b.id)),
    ...all.filter((b) => !props.branches.includes(b.id)),
  ];
  return (
    <div className="prestige-branches" aria-label="Prestige Branches">
      {sorted.map((b) => {
        const open = props.branches.includes(b.id);
        const nodes = prestigeBranchNodes(SKILL_TREE, b.id);
        const anchor = SKILL_TREE.nodes.find((n) => n.id === b.anchor);
        const width = 5 * PB_X + PB_PAD * 2;
        const height = 2 * PB_Y + PB_PAD + PB_BOTTOM;
        const x = (n: SkillNode) => n.x * PB_X + PB_PAD;
        const y = (n: SkillNode) => n.y * PB_Y + PB_PAD;
        return (
          <section
            key={b.id}
            className={`pb-card panel-card ${open ? "open" : "closed"}`}
            style={{ "--branch": branchColor(b.branch) } as React.CSSProperties}
            data-testid={`branch-${b.id}`}
          >
            <div className="pb-head">
              <span className="title-font pb-name">{b.name}</span>
              <span className="sub small">{b.theme}</span>
              <span className="eyebrow">
                {open ? `from ${anchor?.name ?? b.anchor}` : "Choose at a Prestige"}
              </span>
            </div>
            <svg
              className="skill-tree pb-tree"
              width={width * PB_SHOWN}
              height={height * PB_SHOWN}
              viewBox={`0 0 ${width} ${height}`}
            >
              {nodes.flatMap((node) =>
                node.links.map((link) => {
                  const other = nodes.find((n) => n.id === link);
                  if (!other) return null;
                  const on = props.ranks(node.id) > 0 && props.ranks(other.id) > 0;
                  return (
                    <line
                      key={`${node.id}-${link}`}
                      className={on ? "link on" : "link"}
                      x1={x(node)}
                      y1={y(node)}
                      x2={x(other)}
                      y2={y(other)}
                    />
                  );
                }),
              )}
              {nodes.map((node) => (
                <NodeShape
                  key={node.id}
                  node={node}
                  x={x(node)}
                  y={y(node)}
                  className={props.nodeClass(node)}
                  ranks={props.ranks(node.id)}
                  onClick={() => props.onSelect(node.id)}
                />
              ))}
            </svg>
            {!open && <Icon name="lock" size={18} />}
          </section>
        );
      })}
    </div>
  );
}

function SkillTreeTab(props: { state: GameState; game: GameApi; viewOnly: boolean }) {
  const { state, game, viewOnly } = props;
  const [pending, setPending] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(SKILL_TREE.startNodeId);
  const [view, setView] = useState<"base" | "prestige">("base");

  // Learned + pending, as the tree would look after Confirm.
  const budget = {
    skillPoints: state.hero.unspentSkillPoints,
    harvesterEmber: state.wallet.harvesterEmber,
  };
  const branches = state.legacy.branches;
  const preview = learnNodes(SKILL_TREE, state.hero.learned, pending, budget, branches);
  const selected = SKILL_TREE.nodes.find((n) => n.id === selectedId) ?? SKILL_TREE.nodes[0];
  const reason = selected
    ? learnBlockReason(SKILL_TREE, preview.learned, selected.id, preview.budget, branches)
    : undefined;

  const nodeClass = (node: SkillNode) => {
    const ranks = nodeRanks(SKILL_TREE, preview.learned, node.id);
    const learnable = !learnBlockReason(
      SKILL_TREE,
      preview.learned,
      node.id,
      { skillPoints: 1, harvesterEmber: 1 },
      branches,
    );
    return [
      "node",
      `kind-${node.kind}`,
      ranks > 0 ? "learned" : learnable ? "learnable" : "locked",
      pending.includes(node.id) ? "pending" : "",
      node.id === selectedId ? "selected" : "",
    ].join(" ");
  };

  return (
    <div className="tree-layout">
      <div className="tree-canvas">
        {(SKILL_TREE.prestigeBranches?.length ?? 0) > 0 && (
          <div className="tree-views tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === "base"}
              className={`tab title-font ${view === "base" ? "on" : ""}`}
              onClick={() => setView("base")}
            >
              Base Tree
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "prestige"}
              className={`tab title-font ${view === "prestige" ? "on" : ""}`}
              onClick={() => setView("prestige")}
            >
              Prestige Branches · {state.legacy.branches.length}
            </button>
          </div>
        )}
        {view === "prestige" ? (
          <PrestigeBranches
            branches={state.legacy.branches}
            nodeClass={nodeClass}
            ranks={(id) => nodeRanks(SKILL_TREE, preview.learned, id)}
            onSelect={setSelectedId}
          />
        ) : (
          <svg
            className="skill-tree"
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="group"
            aria-label="Skill Tree"
          >
            <defs>
              <radialGradient id="tree-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ff8a3a" stopOpacity="0.22" />
                <stop offset="1" stopColor="#ff8a3a" stopOpacity="0" />
              </radialGradient>
            </defs>
            {SKILL_TREE.nodes[0] && (
              <circle
                cx={px(SKILL_TREE.nodes[0])}
                cy={py(SKILL_TREE.nodes[0])}
                r={220}
                fill="url(#tree-glow)"
              />
            )}
            {BASE_NODES.flatMap((node) =>
              node.links.map((link) => {
                const other = BASE_NODES.find((n) => n.id === link);
                if (!other) return null;
                const on =
                  nodeRanks(SKILL_TREE, preview.learned, node.id) > 0 &&
                  nodeRanks(SKILL_TREE, preview.learned, other.id) > 0;
                return (
                  <line
                    key={`${node.id}-${link}`}
                    className={on ? "link on" : "link"}
                    x1={px(node)}
                    y1={py(node)}
                    x2={px(other)}
                    y2={py(other)}
                  />
                );
              }),
            )}
            {BASE_NODES.map((node) => (
              <NodeShape
                key={node.id}
                node={node}
                x={px(node)}
                y={py(node)}
                className={nodeClass(node)}
                ranks={nodeRanks(SKILL_TREE, preview.learned, node.id)}
                onClick={() => setSelectedId(node.id)}
              />
            ))}
            {BRANCH_LABELS.map((b) => (
              <text
                key={b.name}
                className="branch-label"
                x={b.x}
                y={b.y}
                textAnchor="middle"
                fill={b.color}
              >
                {b.name.toUpperCase()}
              </text>
            ))}
          </svg>
        )}
        <div className="tree-legend">
          <span>
            <i className="lg minor" /> Minor
          </span>
          <span>
            <i className="lg notable" /> Notable
          </span>
          <span>
            <i className="lg skill" /> Skill
          </span>
          <span>
            <i className="lg keystone" /> Keystone
          </span>
          <span>
            <i className="lg learned" /> learned
          </span>
          {!viewOnly && (
            <span>
              <i className="lg pending" /> pending
            </span>
          )}
        </div>
      </div>
      <aside className="tree-side">
        {selected && (
          <section
            className="node-detail panel-card"
            aria-label="Node details"
            style={{
              borderTopColor:
                selected.kind === "keystone" ? "#ffb13b" : branchColor(selected.branch),
            }}
          >
            <div className="section-row">
              <span className="eyebrow">
                {(
                  SKILL_TREE.prestigeBranches?.find((b) => b.id === selected.prestigeBranch)
                    ?.name ?? selected.branch
                ).toUpperCase()}
              </span>
              <span className="eyebrow">
                {KIND_LABEL[selected.kind]}
                {nodeMaxRanks(selected) > 1
                  ? ` · Rank ${nodeRanks(SKILL_TREE, preview.learned, selected.id)}/${nodeMaxRanks(selected)}`
                  : ""}
              </span>
            </div>
            <h3 className="title-font">{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.skill && (
              <p className="skill-info">
                <b>{selected.skill.name}</b> · {selected.skill.heatCost} Heat ·{" "}
                {selected.skill.tags.join(" · ")}
              </p>
            )}
            {selected.kind === "keystone" && (
              <p className="sub small">Costs 1 Harvester&apos;s Ember.</p>
            )}
            {!viewOnly && (
              <>
                <button
                  type="button"
                  className="btn primary"
                  disabled={reason !== undefined}
                  onClick={() => setPending((p) => [...p, selected.id])}
                >
                  {selected.kind === "keystone" ? "Learn · 1 Point + 1 Ember" : "Learn · 1 Point"}
                </button>
                {reason && <p className="block warn">{LEARN_BLOCK_TEXT[reason]}</p>}
              </>
            )}
          </section>
        )}
        <section className="panel-card branch-progress">
          <span className="title-font section-title">Your branches</span>
          {BRANCHES.map((b) => {
            const nodes = BASE_NODES.filter((n) => n.branch === b.id);
            const learned = nodes.filter((n) => nodeRanks(SKILL_TREE, preview.learned, n.id) > 0);
            return (
              <div key={b.id} className="branch-row">
                <span className="branch-name" style={{ color: b.color }}>
                  {b.name}
                </span>
                <div className="branch-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${(learned.length / nodes.length) * 100}%`,
                      background: b.color,
                    }}
                  />
                </div>
                <span className="mono small">
                  {learned.length}/{nodes.length}
                </span>
              </div>
            );
          })}
        </section>
        {!viewOnly && (
          <section className="pending-bar panel-card">
            <span className={pending.length ? "strong" : "sub"}>
              {pending.length} new node{pending.length === 1 ? "" : "s"} pending
            </span>
            <div className="grow" />
            <button
              type="button"
              className="btn"
              disabled={pending.length === 0}
              onClick={() => setPending([])}
            >
              Undo
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={pending.length === 0}
              onClick={() => {
                game.dispatch({ type: "learnNodes", nodeIds: pending });
                setPending([]);
              }}
            >
              Confirm
            </button>
          </section>
        )}
        {viewOnly && <p className="sub small view-only-hint">View only</p>}
      </aside>
    </div>
  );
}

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
  const capstoneCost = plan.capstone ? PROGRESSION.capstoneChangeGold : 0;
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
                      Lv {k.level} · {cost} Heat{k.startSkill ? " · Start Skill" : ""}
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
              {capstoneCost > 0 && <span className="sub small">Switch · {capstoneCost} Gold</span>}
            </div>
            <ul>
              {CAPSTONES.map((c) => {
                const on = plan.capstone?.id === c.id;
                const echoSlot = c.id === "echo" ? slot : (plan.capstone?.slot ?? 0);
                const blocked = !on && plan.capstone !== null && state.wallet.gold < capstoneCost;
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
  initialTab?: "tree" | "plan";
  onClose: () => void;
}) {
  const { state, game, viewOnly } = props;
  const planEditable = props.planEditable ?? !viewOnly;
  const [tab, setTab] = useState<"tree" | "plan">(props.initialTab ?? "tree");
  const [respec, setRespec] = useState(false);
  const spent = spentInTree(GAME_DATA, state.hero.learned);
  const canRespec =
    !viewOnly && spent.skillPoints > 0 && state.wallet.gold >= PROGRESSION.respecGold;

  return (
    <div className={viewOnly ? "overlay" : "screen-wrap"} role="dialog" aria-label="Kaelen">
      <section className="screen kaelen">
        <header className="kaelen-header bar-top">
          <div className="persona-portrait title-font" style={{ background: "#6a2a20" }}>
            K
          </div>
          <div className="run-title">
            <span className="title-font">KAELEN</span>
            <span className="sub">
              Trainer · &ldquo;Point by point, Heir. Fire learns patience too.&rdquo;
            </span>
          </div>
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "tree"}
              className={`tab title-font ${tab === "tree" ? "on" : ""}`}
              onClick={() => setTab("tree")}
            >
              Skill Tree
            </button>
            {planEditable && (
              <button
                type="button"
                role="tab"
                aria-selected={tab === "plan"}
                className={`tab title-font ${tab === "plan" ? "on" : ""}`}
                onClick={() => setTab("plan")}
              >
                Battle Plan
              </button>
            )}
          </div>
          <div className="grow" />
          <div className="wallet-row small-wallet">
            <span data-testid="skill-points">
              <b className="mono">{state.hero.unspentSkillPoints}</b>{" "}
              <span className="sub">Skill Points</span>
            </span>
            <span>
              <b className="mono">{state.wallet.harvesterEmber}</b>{" "}
              <span className="sub">Harvester&apos;s Ember</span>
            </span>
            <span>
              <b className="mono">{fmt(state.wallet.gold)}</b> <span className="sub">Gold</span>
            </span>
          </div>
          {!viewOnly &&
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
                  spent.skillPoints === 0
                    ? "Nothing learned yet"
                    : "All points and Ember come back. The Battle Plan resets."
                }
                onClick={() => setRespec(true)}
              >
                Respec · {PROGRESSION.respecGold} Gold
              </button>
            ))}
          <button
            type="button"
            className="icon-button"
            aria-label={viewOnly ? "Close" : "Back to Camp"}
            title={viewOnly ? "Close (T or Esc)" : "Back to Camp (Esc)"}
            onClick={props.onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        {tab === "tree" || !planEditable ? (
          <SkillTreeTab state={state} game={game} viewOnly={viewOnly} />
        ) : (
          <BattlePlanTab state={state} game={game} />
        )}
      </section>
    </div>
  );
}
