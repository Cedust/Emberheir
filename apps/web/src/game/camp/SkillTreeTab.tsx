import { SKILL_TREE } from "@emberheir/content";
import {
  classStartNode,
  type GameState,
  type SkillNode,
  type SkillTreeBranch,
  branchTier,
  learnBlockReason,
  learnNodes,
  nodeMaxRanks,
  nodeRanks,
} from "@emberheir/sim";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStageSize } from "../../ui/Stage";
import { LEARN_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { type TreeLabel, type TreeNodeView, TreeScene, type TreeView } from "./TreeScene";

/** Base branches with their colour (labels). */
const BRANCHES: readonly { id: SkillTreeBranch; name: string; color: number }[] = [
  { id: "core", name: "Core", color: 0xc9a063 },
  { id: "might", name: "Might", color: 0xc9c2b8 },
  { id: "arcana", name: "Arcana", color: 0x5b8cff },
  { id: "rupture", name: "Rupture", color: 0xd0505c },
  { id: "affliction", name: "Affliction", color: 0xa35cff },
];

const KIND_LABEL: Record<SkillNode["kind"], string> = {
  minor: "Minor",
  notable: "Notable",
  skill: "Skill",
  keystone: "Keystone",
};
const ROMAN = ["", "I", "II", "III"];
const TIER_NAME = ["", "Magic", "Rare", "Epic"];

/** Base nodes, and the nodes of the Prestige branches at the tiers the Heir has reached. */
function visibleNodes(branches: readonly string[]): SkillNode[] {
  return SKILL_TREE.nodes.filter(
    (n) => !n.prestigeBranch || branchTier(branches, n.prestigeBranch) >= (n.tier ?? 1),
  );
}

/**
 * Colour tier of a learned node: its branch tier, raised by the extra ranks a deepening gives
 * to the Minor nodes below it.
 */
function colourTier(node: SkillNode, ranks: number): number {
  const own = node.tier ?? 1;
  if (node.kind !== "minor" || !node.prestigeBranch) return own;
  return Math.min(3, own + Math.max(0, ranks - (node.maxRanks ?? 1)));
}

/** Big branch names: base branches beside their nodes, Prestige branches past their end. */
function treeLabels(branches: readonly string[]): TreeLabel[] {
  const labels: TreeLabel[] = BRANCHES.map((b) => {
    const nodes = SKILL_TREE.nodes.filter((n) => n.branch === b.id && !n.prestigeBranch);
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    return b.id === "core"
      ? { key: b.id, text: "CORE", x: 0, y: 3.9, color: b.color, size: 20 }
      : {
          key: b.id,
          text: b.name.toUpperCase(),
          x: cx * 1.55,
          y: cy * 1.55 + 0.6,
          color: b.color,
          size: 22,
        };
  });
  for (const def of SKILL_TREE.prestigeBranches ?? []) {
    const tier = branchTier(branches, def.id);
    if (!tier) continue;
    const entry = SKILL_TREE.nodes.find((n) => n.id === `pb-${def.id}-entry`);
    const mid = SKILL_TREE.nodes.find((n) => n.id === `pb-${def.id}-mid`);
    if (!entry || !mid) continue;
    // `mid` sits three steps out from the entry: one step is a third of the way.
    const [sx, sy] = [(mid.x - entry.x) / 3, (mid.y - entry.y) / 3];
    const reach = [0, 7.6, 9.6, 11.6][tier] ?? 7.6;
    labels.push({
      key: def.id,
      text: `${def.name.toUpperCase()} ${ROMAN[tier]}`,
      x: entry.x + sx * reach,
      y: entry.y + sy * reach,
      color: BRANCHES.find((b) => b.id === def.branch)?.color ?? 0xc9a063,
      size: 18,
    });
  }
  return labels;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function SkillTreeTab(props: { state: GameState; game: GameApi; viewOnly: boolean }) {
  const { state, game, viewOnly } = props;
  const [pending, setPending] = useState<string[]>([]);
  const startId = classStartNode(SKILL_TREE, state.hero.classId) ?? "";
  const [selectedId, setSelectedId] = useState(startId);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const stage = useStageSize();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<TreeScene | null>(null);

  const branches = state.legacy.branches;
  const budget = {
    skillPoints: state.hero.unspentSkillPoints,
    harvesterEmber: state.wallet.harvesterEmber,
  };
  // Learned + pending, as the tree would look after Confirm.
  const preview = learnNodes(SKILL_TREE, state.hero.learned, pending, budget, branches);
  const nodes = useMemo(() => visibleNodes(branches), [branches]);
  const selected = SKILL_TREE.nodes.find((n) => n.id === selectedId) ?? SKILL_TREE.nodes[0];
  const reason = selected
    ? learnBlockReason(SKILL_TREE, preview.learned, selected.id, preview.budget, branches)
    : undefined;

  const view: TreeView = {
    nodes: nodes.map((node): TreeNodeView => {
      const ranks = nodeRanks(SKILL_TREE, preview.learned, node.id);
      const reachable = !learnBlockReason(
        SKILL_TREE,
        preview.learned,
        node.id,
        { skillPoints: 1, harvesterEmber: 1 },
        branches,
      );
      return {
        node,
        state: ranks > 0 ? "learned" : reachable ? "available" : "unavailable",
        pending: pending.includes(node.id),
        selected: node.id === selectedId,
        ranks,
        maxRanks: nodeMaxRanks(node, branches),
        tier: colourTier(node, ranks),
      };
    }),
    labels: treeLabels(branches),
  };

  // Callbacks of the scene read the latest state through this ref.
  const learnRef = useRef<(id: string) => void>(() => undefined);
  useEffect(() => {
    learnRef.current = (id: string) => {
      if (viewOnly) return;
      setSelectedId(id);
      if (!learnBlockReason(SKILL_TREE, preview.learned, id, preview.budget, branches)) {
        setPending((p) => [...p, id]);
      }
    };
  });

  const [box, setBox] = useState({ w: 900, h: 700 });
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setBox({ w: host.clientWidth, h: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  const resolution = Math.min(3, (window.devicePixelRatio || 1) * stage.scale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new TreeScene({
      onSelect: (id) => setSelectedId(id),
      onLearn: (id) => learnRef.current(id),
      onHover: (id, x, y) => setHover(id ? { id, x, y } : null),
    });
    scene.motion = !reducedMotion();
    scene.layout(host.clientWidth, host.clientHeight, resolution);
    scene.setView(view);
    sceneRef.current = scene;
    void scene.mount(host).then((ok) => {
      if (!ok && sceneRef.current === scene) setFailed(true);
    });
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // The scene lives as long as the tab; size and view updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    sceneRef.current?.layout(box.w, box.h, resolution);
  }, [box.w, box.h, resolution]);
  useEffect(() => {
    sceneRef.current?.setView(view);
  });

  const hovered = hover ? SKILL_TREE.nodes.find((n) => n.id === hover.id) : undefined;
  const selectedTier = selected ? (selected.tier ?? 1) : 1;

  return (
    <div className="tree-layout">
      <div className="tree-canvas tree-pixi">
        <div ref={hostRef} className="tree-host" data-testid="skill-tree-canvas" />
        {failed && <p className="tree-fallback sub">The Skill Tree needs WebGL.</p>}
        {hovered && hover && (
          <div
            className="tree-tip panel-card"
            style={{ left: hover.x, top: hover.y }}
            role="tooltip"
          >
            <span className="eyebrow">
              {KIND_LABEL[hovered.kind]}
              {hovered.prestigeBranch ? ` · Tier ${ROMAN[hovered.tier ?? 1]}` : ""}
            </span>
            <b className="title-font">{hovered.name}</b>
            <span className="small">{hovered.description}</span>
          </div>
        )}
        <div className="tree-controls">
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Zoom in"
            onClick={() => sceneRef.current?.zoomBy(1.25)}
          >
            +
          </button>
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Zoom out"
            onClick={() => sceneRef.current?.zoomBy(0.8)}
          >
            −
          </button>
          <button type="button" className="btn" onClick={() => sceneRef.current?.fit()}>
            Fit
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => sceneRef.current?.focus(startId, 1.1)}
          >
            Heart
          </button>
        </div>
        <div className="tree-legend">
          <span>
            <i className="lg st-unavailable" /> Unavailable
          </span>
          <span>
            <i className="lg st-available" /> Available
          </span>
          <span>
            <i className="lg st-t1" /> Tier I
          </span>
          <span>
            <i className="lg st-t2" /> Tier II
          </span>
          <span>
            <i className="lg st-t3" /> Tier III
          </span>
          <span>
            <i className="lg st-keystone" /> Keystone
          </span>
          {!viewOnly && (
            <span>
              <i className="lg st-pending" /> pending
            </span>
          )}
        </div>
        {/* The canvas is drawn; this list gives keyboards and screen readers the same nodes. */}
        <div className="sr-only" role="group" aria-label="Skill Tree">
          {nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-label={n.name}
              aria-pressed={n.id === selectedId}
              onClick={() => {
                setSelectedId(n.id);
                sceneRef.current?.focus(n.id);
              }}
            />
          ))}
        </div>
      </div>
      <aside className="tree-side">
        {selected && (
          <section
            className="node-detail panel-card"
            aria-label="Node details"
            style={{
              borderTopColor:
                selected.kind === "keystone"
                  ? "var(--rarity-legendary)"
                  : `var(--rarity-${TIER_NAME[selectedTier]?.toLowerCase() ?? "magic"})`,
            }}
          >
            <div className="section-row">
              <span className="eyebrow">
                {(
                  (SKILL_TREE.prestigeBranches?.find((b) => b.id === selected.prestigeBranch)
                    ?.name ?? selected.branch) +
                  (selected.prestigeBranch ? ` ${ROMAN[selectedTier]}` : "")
                ).toUpperCase()}
              </span>
              <span className="eyebrow">
                {KIND_LABEL[selected.kind]}
                {nodeMaxRanks(selected, branches) > 1
                  ? ` · Rank ${nodeRanks(SKILL_TREE, preview.learned, selected.id)}/${nodeMaxRanks(selected, branches)}`
                  : ""}
              </span>
            </div>
            <h3 className="title-font">{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.replaces && (
              <p className="sub small">
                Replaces {SKILL_TREE.nodes.find((n) => n.id === selected.replaces)?.name}.
              </p>
            )}
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
                  {selected.kind === "keystone" ? "Learn · 1 Ember" : "Learn · 1 Point"}
                </button>
                {reason && <p className="block warn">{LEARN_BLOCK_TEXT[reason]}</p>}
              </>
            )}
          </section>
        )}
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
