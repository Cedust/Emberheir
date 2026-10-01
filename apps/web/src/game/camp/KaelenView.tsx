import { POC_GAME_DATA, SKILL_TREE } from "@emberheir/content";
import {
  type GameState,
  PROGRESSION,
  type SkillNode,
  deriveStats,
  estimateRotation,
  heatPerSecond,
  heroSetup,
  knownSkills,
  learnBlockReason,
  learnNodes,
  nodeMaxRanks,
  nodeRanks,
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
const xs = SKILL_TREE.nodes.map((n) => n.x);
const ys = SKILL_TREE.nodes.map((n) => n.y);
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
] as const;
const branchColor = (b: string) => BRANCHES.find((x) => x.id === b)?.color ?? "#b3a288";

/** Branch names placed beyond the end of each branch. */
const BRANCH_LABELS = BRANCHES.map((branch) => {
  const nodes = SKILL_TREE.nodes.filter((n) => n.branch === branch.id);
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

/** The Battle Plan ladder (skills-v1.md): one upgrade per Prestige. */
const PLAN_UPGRADES = [
  "Rotation Slot 2",
  "Trigger Threshold",
  "Rotation Slot 3",
  "Reaction Slot 1",
  "Slot Modifiers",
  "Rotation Slot 4",
  "Reaction Slot 2",
  "Rotation Conditions",
  "2nd Slot Modifier",
  "Capstone",
];
const ROTATION_UNLOCK = [0, 1, 3, 6];
const REACTION_UNLOCK = [4, 7];

function NodeShape(props: {
  node: SkillNode;
  className: string;
  onClick: () => void;
  ranks: number;
}) {
  const { node } = props;
  const x = px(node);
  const y = py(node);
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

function SkillTreeTab(props: { state: GameState; game: GameApi; viewOnly: boolean }) {
  const { state, game, viewOnly } = props;
  const [pending, setPending] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(SKILL_TREE.startNodeId);

  // Learned + pending, as the tree would look after Confirm.
  const budget = {
    skillPoints: state.hero.unspentSkillPoints,
    harvesterEmber: state.wallet.harvesterEmber,
  };
  const preview = learnNodes(SKILL_TREE, state.hero.learned, pending, budget);
  const selected = SKILL_TREE.nodes.find((n) => n.id === selectedId) ?? SKILL_TREE.nodes[0];
  const reason = selected
    ? learnBlockReason(SKILL_TREE, preview.learned, selected.id, preview.budget)
    : undefined;

  const nodeClass = (node: SkillNode) => {
    const ranks = nodeRanks(SKILL_TREE, preview.learned, node.id);
    const learnable = !learnBlockReason(SKILL_TREE, preview.learned, node.id, {
      skillPoints: 1,
      harvesterEmber: 1,
    });
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
          {SKILL_TREE.nodes.flatMap((node) =>
            node.links.map((link) => {
              const other = SKILL_TREE.nodes.find((n) => n.id === link);
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
          {SKILL_TREE.nodes.map((node) => (
            <NodeShape
              key={node.id}
              node={node}
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
              <span className="eyebrow">{selected.branch.toUpperCase()}</span>
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
                <br />
                <span className="sub small">
                  Learning it adds the skill to your Battle Plan library.
                </span>
              </p>
            )}
            {selected.kind === "keystone" && (
              <p className="sub small">
                Costs 1 Harvester&apos;s Ember in addition to 1 Skill Point.
              </p>
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
            const nodes = SKILL_TREE.nodes.filter((n) => n.branch === b.id);
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
          <p className="sub small">
            Rupture, Affliction and the Prestige branches are not in the PoC. Each Prestige lets you
            pick one new branch.
          </p>
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
        {viewOnly && (
          <p className="sub small view-only-hint">
            View only. Learn new nodes at Kaelen in the Camp.
          </p>
        )}
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

function BattlePlanTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [slot, setSlot] = useState(0);
  const { setup } = heroSetup(state, POC_GAME_DATA);
  const stats = deriveStats(setup);
  const known = knownSkills(state, POC_GAME_DATA, setup.weapon);
  const rate = heatPerSecond(setup, stats);
  const slots = setup.rotation.map((r) => ({
    name: r.skill.name,
    id: r.skill.id,
    heatCost: r.skill.heatCost,
    threshold: triggerThreshold(r.skill.heatCost, r.threshold),
  }));
  const chain = estimateRotation(slots, rate, stats.startingHeat);
  const prestige = state.legacy.prestige;

  const current = (i: number) => {
    const id = state.hero.rotation[i] ?? null;
    return id === null ? known.find((k) => k.startSkill) : known.find((k) => k.skill.id === id);
  };

  return (
    <div className="plan-layout">
      <main className="plan-main">
        <section>
          <div className="section-row">
            <span className="title-font section-title">Rotation</span>
            <span className="sub">
              Runs left to right, then starts over. A skill fires once Heat reaches its threshold.
            </span>
          </div>
          <div className="plan-slots">
            {ROTATION_UNLOCK.map((p, i) => {
              const unlocked = i < state.progress.rotationSlots;
              const k = unlocked ? current(i) : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  className={`plan-slot panel-card ${unlocked ? "" : "locked"} ${slot === i && unlocked ? "on" : ""}`}
                  disabled={!unlocked}
                  aria-label={`Rotation Slot ${i + 1}`}
                  onClick={() => setSlot(i)}
                >
                  <span className="eyebrow">SLOT {i + 1}</span>
                  {unlocked && k ? (
                    <>
                      <span className="plan-skill">
                        <span className="skill-chip" style={{ background: skillTint(k.skill.id) }}>
                          <Icon name={skillIcon(k.skill.id)} size={24} color="#fff6e4" />
                        </span>
                        <span className="title-font">{k.skill.name}</span>
                      </span>
                      <span className="sub small">
                        Lv {k.level} · {k.skill.heatCost} Heat{k.startSkill ? " · Start Skill" : ""}
                      </span>
                      <span className="sub small threshold-note">
                        Fires at cost. Threshold unlocks at Prestige 2.
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon name="lock" size={22} />
                      <span className="sub">Unlocks at Prestige {p}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <div className="section-row">
            <span className="title-font section-title">Reactions</span>
            <span className="sub">
              Outside the rotation. Fire once when the condition hits, then cool down.
            </span>
          </div>
          <div className="plan-slots reactions">
            {REACTION_UNLOCK.map((p) => (
              <div key={p} className="plan-slot panel-card locked">
                <Icon name="lock" size={20} />
                <span className="sub">Unlocks at Prestige {p}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="chain panel-card" aria-label="One rotation">
          <div className="section-row">
            <span className="title-font section-title">One rotation</span>
            <span className="sub">Estimate at {rate.toFixed(1)} Heat/s, no hits taken</span>
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
        <section className="panel-card ladder">
          <span className="title-font section-title">Battle Plan upgrades</span>
          <ol>
            {PLAN_UPGRADES.map((u, i) => (
              <li key={u} className={i < prestige ? "done" : i === prestige ? "next" : ""}>
                <span className="mono">P{i + 1}</span> {u}
              </li>
            ))}
          </ol>
        </section>
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
  viewOnly: boolean;
  onClose: () => void;
}) {
  const { state, game, viewOnly } = props;
  const [tab, setTab] = useState<"tree" | "plan">("tree");
  const [respec, setRespec] = useState(false);
  const spent = spentInTree(POC_GAME_DATA, state.hero.learned);
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
            {!viewOnly && (
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
        {tab === "tree" || viewOnly ? (
          <SkillTreeTab state={state} game={game} viewOnly={viewOnly} />
        ) : (
          <BattlePlanTab state={state} game={game} />
        )}
      </section>
    </div>
  );
}
