import { POC_GAME_DATA, SKILL_TREE } from "@emberheir/content";
import {
  type GameState,
  type SkillNode,
  heroSetup,
  knownSkills,
  learnBlockReason,
  learnNodes,
  nodeMaxRanks,
  nodeRanks,
} from "@emberheir/sim";
import { useState } from "react";
import { LEARN_BLOCK_TEXT } from "./labels";
import type { GameApi } from "./useGame";

const SCALE = 52;
const PAD = 40;
const xs = SKILL_TREE.nodes.map((n) => n.x);
const ys = SKILL_TREE.nodes.map((n) => n.y);
const MIN_X = Math.min(...xs);
const MIN_Y = Math.min(...ys);
const WIDTH = (Math.max(...xs) - MIN_X) * SCALE + PAD * 2;
const HEIGHT = (Math.max(...ys) - MIN_Y) * SCALE + PAD * 2;
const px = (n: SkillNode) => (n.x - MIN_X) * SCALE + PAD;
const py = (n: SkillNode) => (n.y - MIN_Y) * SCALE + PAD;

/** Branch names placed at the middle of each branch. */
const BRANCH_LABELS = (["core", "might", "arcana"] as const).map((branch) => {
  const nodes = SKILL_TREE.nodes.filter((n) => n.branch === branch);
  const avg = (f: (n: SkillNode) => number) =>
    nodes.reduce((sum, n) => sum + f(n), 0) / Math.max(1, nodes.length);
  return {
    name: branch[0]?.toUpperCase() + branch.slice(1),
    x: avg(px),
    y: branch === "core" ? HEIGHT - 10 : avg(py) - 70,
  };
});

const KIND_LABEL: Record<SkillNode["kind"], string> = {
  minor: "Minor",
  notable: "Notable",
  skill: "Skill",
  keystone: "Keystone",
};

function NodeShape(props: { node: SkillNode; className: string; onClick: () => void }) {
  const { node } = props;
  const x = px(node);
  const y = py(node);
  const common = {
    className: props.className,
    onClick: props.onClick,
    role: "button",
    "aria-label": node.name,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") props.onClick();
    },
  };
  if (node.kind === "skill") {
    return (
      <rect
        {...common}
        x={x - 11}
        y={y - 11}
        width={22}
        height={22}
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  }
  if (node.kind === "keystone") {
    return <rect {...common} x={x - 13} y={y - 13} width={26} height={26} />;
  }
  return <circle {...common} cx={x} cy={y} r={node.kind === "notable" ? 14 : 9} />;
}

/** Kaelen, the Trainer: Skill Tree (pending → Confirm / Undo) and the Battle Plan. */
export function KaelenOverlay(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const [tab, setTab] = useState<"tree" | "plan">("tree");
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
    const isPending = pending.includes(node.id);
    return [
      "node",
      `kind-${node.kind}`,
      ranks > 0 ? "learned" : learnable ? "learnable" : "locked",
      isPending ? "pending" : "",
      node.id === selectedId ? "selected" : "",
    ].join(" ");
  };

  const weapon = heroSetup(state, POC_GAME_DATA).setup.weapon;
  const known = knownSkills(state, POC_GAME_DATA, weapon);

  return (
    <div className="overlay" role="dialog" aria-label="Kaelen">
      <div className="overlay-panel panel kaelen">
        <header className="overlay-header">
          <h2>Kaelen, the Trainer</h2>
          <span className="points" data-testid="skill-points">
            {preview.budget.skillPoints} Skill Points · {preview.budget.harvesterEmber}{" "}
            Harvester&apos;s Ember
          </span>
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "tree"}
              onClick={() => setTab("tree")}
            >
              Skill Tree
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plan"}
              onClick={() => setTab("plan")}
            >
              Battle Plan
            </button>
          </div>
          <button type="button" onClick={props.onClose}>
            Back to Camp
          </button>
        </header>

        {tab === "tree" ? (
          <div className="tree-layout">
            <svg
              className="skill-tree"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="group"
              aria-label="Skill Tree"
            >
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
                  onClick={() => setSelectedId(node.id)}
                />
              ))}
              {BRANCH_LABELS.map((b) => (
                <text key={b.name} className="branch-label" x={b.x} y={b.y} textAnchor="middle">
                  {b.name}
                </text>
              ))}
            </svg>
            {selected && (
              <aside className="node-detail" aria-label="Node details">
                <h3>{selected.name}</h3>
                <p className="node-kind">
                  {KIND_LABEL[selected.kind]} · {selected.branch[0]?.toUpperCase()}
                  {selected.branch.slice(1)}
                  {nodeMaxRanks(selected) > 1
                    ? ` · Rank ${nodeRanks(SKILL_TREE, preview.learned, selected.id)} / ${nodeMaxRanks(selected)}`
                    : ""}
                </p>
                <p>{selected.description}</p>
                {selected.skill && (
                  <p className="skill-info">
                    {selected.skill.name}: {selected.skill.heatCost} Heat ·{" "}
                    {selected.skill.description}
                  </p>
                )}
                <button
                  type="button"
                  className="primary"
                  disabled={reason !== undefined}
                  onClick={() => setPending((p) => [...p, selected.id])}
                >
                  {selected.kind === "keystone" ? "Learn (1 Ember)" : "Learn (1 point)"}
                </button>
                {reason && <p className="block-reason">{LEARN_BLOCK_TEXT[reason]}</p>}
                {selected.kind === "keystone" && (
                  <p className="hint">
                    Keystones cost Harvester&apos;s Ember, taken from the Ashen Harvester.
                  </p>
                )}
              </aside>
            )}
            <div className="attr-buttons">
              <button
                type="button"
                className="primary"
                disabled={pending.length === 0}
                onClick={() => {
                  game.dispatch({ type: "learnNodes", nodeIds: pending });
                  setPending([]);
                }}
              >
                Confirm
              </button>
              <button type="button" disabled={pending.length === 0} onClick={() => setPending([])}>
                Undo
              </button>
            </div>
          </div>
        ) : (
          <div className="battle-plan">
            <h3>Rotation</h3>
            <ol className="plan-slots">
              {Array.from({ length: 2 }, (_, i) => {
                const unlocked = i < state.progress.rotationSlots;
                const id = state.hero.rotation[i] ?? null;
                const current =
                  id === null
                    ? known.find((k) => k.startSkill)
                    : known.find((k) => k.skill.id === id);
                return (
                  <li key={i} className={unlocked ? "plan-slot" : "plan-slot locked"}>
                    <strong>Slot {i + 1}</strong>
                    {unlocked ? (
                      <select
                        aria-label={`Slot ${i + 1} skill`}
                        value={current?.skill.id ?? ""}
                        onChange={(e) =>
                          game.dispatch({
                            type: "setRotationSkill",
                            slot: i,
                            skillId: e.target.value || null,
                          })
                        }
                      >
                        {known.map((k) => (
                          <option key={k.skill.id} value={k.skill.id}>
                            {k.skill.name} · Lv {k.level} · {k.skill.heatCost} Heat
                            {k.startSkill ? " (Start Skill)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>Unlocks at Prestige 1</span>
                    )}
                  </li>
                );
              })}
            </ol>
            <h3>Known Skills</h3>
            <ul className="known-skills">
              {known.map((k) => (
                <li key={k.skill.id}>
                  <strong>{k.skill.name}</strong> · Lv {k.level} · {k.skill.heatCost} Heat ·{" "}
                  {k.skill.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
