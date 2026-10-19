import {
  ITEM_CATALOG,
  SKILL_TREE,
  TREE_PLACEMENT,
  type TreeRegion,
  onTree,
} from "@emberheir/content";
import {
  classStartNode,
  type GameState,
  type SkillNode,
  type SkillTreeBranch,
  branchTier,
  forgetBlockReason,
  forgetAcorns,
  getNode,
  forkPartner,
  KEYSTONE,
  activeKeystones,
  keystoneLimit,
  learnBudget,
  learnBlockReason,
  learnCost,
  learnNodes,
  learnPath,
  neighbours,
  nodeMaxRanks,
  nodeRanks,
} from "@emberheir/sim";
import { Button, HoldButton } from "../../ui/kit/Button";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStageSize } from "../../ui/Stage";
import { FORGET_BLOCK_TEXT, LEARN_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { type TreeLabel, type TreeNodeView, TreeScene, type TreeView } from "./TreeScene";
import { canvasResolution } from "../pixiPacing";
import { RuneStone, runeColor, runeName } from "../../ui/RuneArt";
import { Price } from "../../ui/kit/Currency";

const hexColor = (css: string) => Number.parseInt(css.replace("#", ""), 16);

/** A Rune Socket of the web: the Rune in it and the Runes of the pouch that can go in. */
function WebSocketPanel(props: {
  state: GameState;
  game: GameApi;
  nodeId: string;
  learned: boolean;
  viewOnly: boolean;
}) {
  const { state, game, nodeId, learned, viewOnly } = props;
  const current = state.hero.webRunes?.[nodeId];
  const pouch = Object.entries(state.wallet.runes).filter(([, n]) => n > 0);
  const web = (id: string) => ITEM_CATALOG.runes.get(id)?.web?.description ?? "";
  if (!learned) return <p className="sub small">Rune Socket</p>;
  return (
    <div className="web-socket" aria-label="Rune Socket">
      {current ? (
        <div className="web-socket-rune">
          <RuneStone runeId={current} size={28} />
          <span className="small">
            <b>{runeName(current)}</b> · {web(current)}
          </span>
          {!viewOnly && (
            <button
              type="button"
              className="btn"
              onClick={() => game.dispatch({ type: "socketWebRune", nodeId, runeId: null })}
            >
              Take out
            </button>
          )}
        </div>
      ) : (
        <p className="sub small">Empty</p>
      )}
      {!viewOnly && pouch.length === 0 && <p className="sub small">No Runes in the pouch.</p>}
      {!viewOnly &&
        pouch.map(([id, count]) => (
          <button
            key={id}
            type="button"
            className="btn web-socket-option"
            onClick={() => game.dispatch({ type: "socketWebRune", nodeId, runeId: id })}
          >
            <RuneStone runeId={id} size={22} />
            <span className="small">
              <b>
                {runeName(id)} ×{count}
              </b>{" "}
              · {web(id)}
            </span>
          </button>
        ))}
    </div>
  );
}

/** Regions of the Ash Tree with their colour (labels): damage-type colours in the crown. */
const BRANCHES: readonly { id: SkillTreeBranch; name: string; color: number }[] = [
  { id: "core", name: "Core", color: 0xc9a063 },
  { id: "steel", name: "Steel", color: 0xc9c2b8 },
  { id: "blood", name: "Blood", color: 0xe0314b },
  { id: "venom", name: "Venom", color: 0xb5d82c },
  { id: "flame", name: "Flame", color: 0xff6a2b },
  { id: "storm", name: "Storm", color: 0xffe14d },
  { id: "frost", name: "Frost", color: 0x6fd3ff },
  { id: "void", name: "Void", color: 0xa35cff },
  { id: "trunk", name: "Trunk", color: 0xc9a063 },
  { id: "roots", name: "Roots", color: 0xd08a4a },
];

/** The trunk's and the roots' names sit beside them (their nodes are laid out by hand). */
const LABEL_AT: Partial<Record<TreeRegion, { x: number; y: number }>> = {
  trunk: { x: -6, y: 1.6 },
  roots: { x: 0, y: 12.4 },
};

const KIND_LABEL: Record<SkillNode["kind"], string> = {
  minor: "Minor",
  notable: "Notable",
  skill: "Skill",
  keystone: "Keystone",
  socket: "Rune Socket",
};
const ROMAN = ["", "I", "II", "III", "IV", "V"];
const TIER_NAME = ["", "Magic", "Rare", "Epic", "Legendary", "Runeword"];

/** Base nodes, and the nodes of the Prestige branches at the tiers the Heir has reached. */
function visibleNodes(branches: readonly string[]): SkillNode[] {
  return SKILL_TREE.nodes.filter(
    (n) => !n.prestigeBranch || branchTier(branches, n.prestigeBranch) >= (n.tier ?? 1),
  );
}

/**
 * Colour tier of a learned node: its branch tier, raised by the extra ranks a deepening gives
 * to the branch's Skill.
 */
function colourTier(node: SkillNode, ranks: number): number {
  const own = node.tier ?? 1;
  if (node.kind !== "skill" || !node.prestigeBranch) return own;
  return Math.min(5, own + Math.max(0, ranks - (node.maxRanks ?? 1)));
}

/** Big names: every region past the rim of the tree, Masteries past their end. */
function treeLabels(branches: readonly string[]): TreeLabel[] {
  const labels: TreeLabel[] = BRANCHES.filter((b) => b.id !== "core").map((b) => {
    // Out past the region's Keystones, on the tree.
    const region = b.id as TreeRegion;
    const ring = (TREE_PLACEMENT[region].ring * Math.PI) / 180;
    const at =
      LABEL_AT[region] ?? onTree({ x: Math.cos(ring) * 14, y: Math.sin(ring) * 14 }, region);
    return { key: b.id, text: b.name.toUpperCase(), ...at, color: b.color, size: 20 };
  });
  for (const def of SKILL_TREE.prestigeBranches ?? []) {
    const tier = branchTier(branches, def.id);
    if (!tier) continue;
    const entry = SKILL_TREE.nodes.find((n) => n.id === `pb-${def.id}-entry`);
    const mid = SKILL_TREE.nodes.find((n) => n.id === `pb-${def.id}-mid`);
    if (!entry || !mid) continue;
    // `mid` sits three steps out from the entry: one step is a third of the way.
    const [sx, sy] = [(mid.x - entry.x) / 3, (mid.y - entry.y) / 3];
    const reach = [0, 7.6, 9.6, 11.6, 13.6, 15.6][tier] ?? 7.6;
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
  const budget = learnBudget(
    SKILL_TREE,
    state.hero.learned,
    state.hero.unspentSkillPoints,
    state.legacy.prestige,
  );
  const keystonePlaces = keystoneLimit(state.legacy.prestige);
  // Learned + pending, as the tree would look after Confirm.
  const preview = learnNodes(SKILL_TREE, state.hero.learned, pending, budget, branches);
  const nodes = useMemo(() => visibleNodes(branches), [branches]);
  const selected = SKILL_TREE.nodes.find((n) => n.id === selectedId) ?? SKILL_TREE.nodes[0];
  const reason = selected
    ? learnBlockReason(SKILL_TREE, preview.learned, selected.id, preview.budget, branches)
    : undefined;
  /** Path to a node from the learned web (the preview): the learned node it starts at first. */
  const pathOf = (id: string): { steps: string[]; from?: string } | undefined => {
    const steps = learnPath(SKILL_TREE, preview.learned, id, branches);
    if (!steps?.length) return steps ? { steps } : undefined;
    const from = neighbours(SKILL_TREE, steps[0] ?? "").find(
      (n) => nodeRanks(SKILL_TREE, preview.learned, n) > 0,
    );
    return { steps, ...(from ? { from } : {}) };
  };
  const pathCost = (steps: readonly string[]) =>
    steps.reduce(
      (sum, id) => {
        const cost = learnCost(getNode(SKILL_TREE, id), SKILL_TREE, preview.learned);
        return {
          skillPoints: sum.skillPoints + cost.skillPoints,
          keystones: sum.keystones + cost.keystones,
        };
      },
      { skillPoints: 0, keystones: 0 },
    );
  const hoverPath = hover ? pathOf(hover.id) : undefined;
  const selectedPath = selected ? pathOf(selected.id) : undefined;
  const selectedCost = selectedPath ? pathCost(selectedPath.steps) : undefined;
  const canWalk =
    !!selectedPath &&
    selectedPath.steps.length > 1 &&
    !!selectedCost &&
    selectedCost.skillPoints <= preview.budget.skillPoints &&
    selectedCost.keystones <= preview.budget.keystones;
  const start = SKILL_TREE.classStarts?.[state.hero.classId];
  const committed = selected ? (state.hero.learned[selected.id] ?? 0) > 0 : false;
  const forgetPrice = forgetAcorns(state.legacy.prestige);
  const forgetReason =
    selected && committed
      ? forgetBlockReason(SKILL_TREE, state.hero.learned, selected.id, start)
      : undefined;

  const view: TreeView = {
    nodes: nodes.map((node): TreeNodeView => {
      const ranks = nodeRanks(SKILL_TREE, preview.learned, node.id);
      const reachable = !learnBlockReason(
        SKILL_TREE,
        preview.learned,
        node.id,
        { skillPoints: KEYSTONE.skillPoints, keystones: 1 },
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
        sealed: ranks === 0 && !!forkPartner(SKILL_TREE, preview.learned, node),
        ...(state.hero.webRunes?.[node.id]
          ? { rune: hexColor(runeColor(state.hero.webRunes[node.id] ?? "")) }
          : {}),
      };
    }),
    labels: treeLabels(branches),
    keystones: {
      active: activeKeystones(SKILL_TREE, preview.learned),
      limit: keystonePlaces,
      max: keystoneLimit(Number.POSITIVE_INFINITY),
    },
    ...(hoverPath?.from ? { path: [hoverPath.from, ...hoverPath.steps] } : {}),
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
  const resolution = canvasResolution(stage.scale);

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
        {failed && <p className="tree-fallback sub">The Ash Tree needs WebGL.</p>}
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
            {hoverPath && hoverPath.steps.length > 0 && (
              <span className="small path-cost">
                {pointsText(pathCost(hoverPath.steps))}
                {hoverPath.steps.length > 1 ? ` · ${hoverPath.steps.length} nodes away` : ""}
              </span>
            )}
            {hovered.fork && <span className="small sub">Fork</span>}
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
            Start
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
          <span
            data-testid="keystone-places"
            title={`Keystones active at once. The notches in the Ember sigil show the places; one more opens at Prestige ${KEYSTONE.extraAtPrestige.join(", ")}.`}
          >
            <i className="lg st-keystone" /> Places {activeKeystones(SKILL_TREE, preview.learned)}/
            {keystonePlaces}
          </span>
          {!viewOnly && (
            <span>
              <i className="lg st-pending" /> pending
            </span>
          )}
        </div>
        {/* The canvas is drawn; this list gives keyboards and screen readers the same nodes. */}
        <div className="sr-only" role="group" aria-label="Ash Tree">
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
              <p className="sub small">
                Costs {KEYSTONE.skillPoints} Skill Points and one of your Keystone places (
                {activeKeystones(SKILL_TREE, preview.learned)}/{keystonePlaces} taken).
              </p>
            )}
            {selected.kind === "socket" && (
              <WebSocketPanel
                state={state}
                game={game}
                nodeId={selected.id}
                learned={committed && (state.hero.learned[selected.id] ?? 0) > 0}
                viewOnly={viewOnly}
              />
            )}
            {selected.fork && (
              <p className="sub small">
                Fork: only this or{" "}
                {
                  SKILL_TREE.nodes.find((n) => n.fork === selected.fork && n.id !== selected.id)
                    ?.name
                }
                .
              </p>
            )}
            {!viewOnly && (
              <>
                {canWalk && selectedPath && selectedCost && reason === "notConnected" ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setPending((p) => [...p, ...selectedPath.steps])}
                  >
                    Learn path · {pointsText(selectedCost)}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={reason !== undefined}
                    onClick={() => setPending((p) => [...p, selected.id])}
                  >
                    {selected.kind === "keystone"
                      ? `Learn · ${KEYSTONE.skillPoints} Points`
                      : "Learn · 1 Point"}
                  </button>
                )}
                {reason && !(canWalk && reason === "notConnected") && (
                  <p className="block warn">
                    {reason === "notConnected" && selectedCost
                      ? `${LEARN_BLOCK_TEXT[reason]} (path: ${pointsText(selectedCost)})`
                      : LEARN_BLOCK_TEXT[reason]}
                  </p>
                )}
                {committed && pending.length === 0 && forgetReason !== "start" && (
                  <>
                    <HoldButton
                      icon="cycle"
                      blocked={
                        forgetReason
                          ? FORGET_BLOCK_TEXT[forgetReason]
                          : state.wallet.acorns < forgetPrice
                            ? "Not enough Acorns"
                            : null
                      }
                      onConfirm={() => game.dispatch({ type: "forgetNode", nodeId: selected.id })}
                    >
                      Forget · <Price id="acorns" amount={forgetPrice} />
                    </HoldButton>
                    {forgetReason && (
                      <p className="block sub small">{FORGET_BLOCK_TEXT[forgetReason]}</p>
                    )}
                  </>
                )}
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
            <Button
              blocked={pending.length === 0 ? "Nothing pending" : null}
              onClick={() => setPending([])}
            >
              Undo
            </Button>
            <Button
              variant="primary"
              blocked={pending.length === 0 ? "Nothing pending" : null}
              onClick={() => {
                game.dispatch({ type: "learnNodes", nodeIds: pending });
                setPending([]);
              }}
            >
              Confirm
            </Button>
          </section>
        )}
        {viewOnly && <p className="sub small view-only-hint">View only</p>}
      </aside>
    </div>
  );
}

/** "3 Points", "7 Points · Keystone". */
function pointsText(cost: { skillPoints: number; keystones: number }): string {
  const points = `${cost.skillPoints} Point${cost.skillPoints === 1 ? "" : "s"}`;
  return cost.keystones ? `${points} · Keystone` : points;
}
