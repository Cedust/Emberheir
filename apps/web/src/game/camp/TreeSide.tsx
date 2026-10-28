import type { CSSProperties, ReactNode } from "react";

/**
 * The right side of the Ash Tree and the Heirloom: the selected node as a painted plaque (like an
 * item tooltip, so it reads as "this one"), and below it a dock whose buttons never move: the
 * node's own action on top, the pending points with Undo / Confirm at the bottom right.
 */

/** Gem shapes, the same as the node's on the tree. */
export type NodeShape = "circle" | "ring" | "diamond" | "hexagon" | "octagon" | "star";

/** What the node is right now; colours the gem and the status line. */
export type NodeStatus = "learned" | "pending" | "available" | "locked";

const polygon = (corners: number, turn: number, r = 26, inner?: number) =>
  Array.from({ length: corners }, (_, i) => {
    const a = turn + (i * Math.PI * 2) / corners;
    const k = inner !== undefined && i % 2 === 1 ? inner : r;
    return `${(30 + Math.cos(a) * k).toFixed(1)},${(30 + Math.sin(a) * k).toFixed(1)}`;
  }).join(" ");

function GemShape(props: { shape: NodeShape; inset?: number; className?: string }) {
  const r = 26 - (props.inset ?? 0);
  const cls = props.className;
  switch (props.shape) {
    case "diamond":
      return <polygon className={cls} points={polygon(4, -Math.PI / 2, r)} />;
    case "hexagon":
      return <polygon className={cls} points={polygon(6, Math.PI / 6, r)} />;
    case "octagon":
      return <polygon className={cls} points={polygon(8, Math.PI / 8, r)} />;
    case "star":
      return <polygon className={cls} points={polygon(16, -Math.PI / 2, r, r * 0.6)} />;
    default:
      return <circle className={cls} cx={30} cy={30} r={r} />;
  }
}

/** The node's gem: its shape in its colour, filled once learned, painted art inside if it has one. */
function NodeGem(props: { shape: NodeShape; status: NodeStatus; art?: ReactNode }) {
  return (
    <span className="node-gem" aria-hidden="true">
      <svg viewBox="0 0 60 60" width={68} height={68}>
        <GemShape shape={props.shape} className="gem-base" />
        <GemShape shape={props.shape} inset={7} className="gem-core" />
        {props.shape === "ring" && <circle className="gem-ring" cx={30} cy={30} r={13} />}
      </svg>
      {props.art && <span className="node-gem-art">{props.art}</span>}
    </span>
  );
}

/** The selected node: tag line, gem, name in its colour, ranks, status, rules text. */
export function NodePlaque(props: {
  /** Region or path, e.g. "STEEL" or "EDGE". */
  tag: string;
  /** CSS colour of the tag (the region's or path's colour). */
  tagColor?: string;
  kind: string;
  name: string;
  /** CSS colour of the node (tier, path or Heat Form). */
  color: string;
  shape: NodeShape;
  status: NodeStatus;
  statusText: ReactNode;
  ranks?: { have: number; max: number };
  description: string;
  /** Painted art inside the gem (a skill, a Heat Form, a Rune). */
  art?: ReactNode;
  /** Notes under the rules text (fork, replaces, skill line). */
  children?: ReactNode;
}) {
  const { ranks } = props;
  return (
    <div
      className={`node-plaque node-${props.status}`}
      style={{ "--node": props.color, "--tag": props.tagColor ?? props.color } as CSSProperties}
    >
      <div className="node-plaque-tag">
        <span>{props.tag}</span>
        <span>{props.kind}</span>
      </div>
      <div className="node-plaque-head">
        <NodeGem shape={props.shape} status={props.status} art={props.art} />
        <div className="node-plaque-title">
          <h3 className="title-font">{props.name}</h3>
          {ranks && ranks.max > 1 && (
            <span className="node-pips" aria-label={`Rank ${ranks.have}/${ranks.max}`}>
              {Array.from({ length: ranks.max }, (_, i) => (
                <i key={i} className={i < ranks.have ? "on" : ""} />
              ))}
              <b className="mono">
                {ranks.have}/{ranks.max}
              </b>
            </span>
          )}
        </div>
      </div>
      <p className="node-status">{props.statusText}</p>
      <div className="node-plaque-body">
        <p className="node-desc">{props.description}</p>
        {props.children}
      </div>
    </div>
  );
}

/**
 * The fixed dock at the bottom of the side: the node's action (Learn, Choose, Forget), then the
 * pending points with Undo and Confirm. Both rows keep their place whatever is selected.
 */
export function TreeDock(props: {
  /** The node's own buttons. */
  action: ReactNode;
  pendingText: ReactNode;
  hasPending: boolean;
  /** Undo and Confirm. */
  commit: ReactNode;
}) {
  return (
    <div className="tree-dock">
      <div className="tree-dock-action">{props.action}</div>
      <div className={`tree-dock-commit${props.hasPending ? " has" : ""}`}>
        <span className="tree-dock-pending">{props.pendingText}</span>
        <div className="tree-dock-buttons">{props.commit}</div>
      </div>
    </div>
  );
}
