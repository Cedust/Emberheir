import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../Icon";
import { type NoteHover, useNoteHover } from "../ItemTooltip";

/** A key cap, e.g. on a button or in a tooltip. */
export function KeyHint(props: { k: string }) {
  return <kbd className="k-key">{props.k}</kbd>;
}

type Variant = "primary" | "secondary" | "ghost";

/**
 * The three button tiers (ui-ux-plan-v1.md 3.4): one glowing **primary** per screen, parchment
 * **secondary** with brass trim, quiet **ghost**. A disabled button says why in its tooltip.
 */
export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  big?: boolean;
  icon?: IconName;
  /** A painted icon instead of the line icon. */
  art?: ReactNode;
  /** Key cap shown on the button, e.g. "C". */
  hotkey?: string;
  /** Tooltip: what the button does, in plain words. */
  tip?: NoteHover;
  /** Why the button cannot be used right now; disables it and shows up in the tooltip. */
  blocked?: string | null;
  className?: string;
}) {
  const blocked = props.blocked ?? null;
  const note =
    props.tip ?? (blocked ? { name: textOf(props.children), kind: "", explain: "" } : undefined);
  const hover = useNoteHover(
    note && {
      ...note,
      ...(blocked ? { status: blocked } : {}),
      ...(props.hotkey ? { hotkey: props.hotkey } : {}),
    },
  );
  return (
    <button
      type="button"
      className={`k-btn k-${props.variant ?? "secondary"}${props.big ? " k-big" : ""} ${props.className ?? ""}`}
      onClick={blocked ? undefined : props.onClick}
      aria-disabled={blocked ? true : undefined}
      data-blocked={blocked ? "" : undefined}
      {...hover}
    >
      {props.art ? (
        <span className="k-btn-art">{props.art}</span>
      ) : (
        props.icon && <Icon name={props.icon} size={props.big ? 20 : 17} />
      )}
      <span>{props.children}</span>
      {props.hotkey && <KeyHint k={props.hotkey} />}
    </button>
  );
}

/** Square icon button (Menu, Close) with its name and key in the tooltip. */
export function IconButton(props: {
  icon: IconName;
  label: string;
  onClick: () => void;
  hotkey?: string;
  explain?: string;
}) {
  const hover = useNoteHover({
    name: props.label,
    kind: "",
    explain: props.explain ?? "",
    ...(props.hotkey ? { hotkey: props.hotkey } : {}),
  });
  return (
    <button
      type="button"
      className="k-icon-btn"
      aria-label={props.label}
      onClick={props.onClick}
      {...hover}
    >
      <Icon name={props.icon} size={20} />
    </button>
  );
}

const HOLD_MS = 900;

/**
 * Hold to confirm (Diablo IV): for Salvage, Respec and Reset. The fill runs like the Heat bar;
 * letting go early cancels. Space or Enter held on the focused button works the same.
 */
export function HoldButton(props: {
  children: ReactNode;
  onConfirm: () => void;
  blocked?: string | null;
  tip?: NoteHover;
  icon?: IconName;
  /** The screen's main action (Confirm) instead of a destructive one (Salvage, Discard). */
  primary?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const blocked = props.blocked ?? null;
  const confirm = useRef(props.onConfirm);
  useEffect(() => {
    confirm.current = props.onConfirm;
  });
  const hover = useNoteHover({
    name: props.tip?.name ?? textOf(props.children),
    kind: props.tip?.kind ?? "Hold to confirm",
    explain: props.tip?.explain ?? "",
    ...(blocked ? { status: blocked } : {}),
  });

  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setProgress(0);
  };
  const begin = () => {
    if (blocked || raf.current) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        raf.current = 0;
        setProgress(0);
        confirm.current();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      type="button"
      className={`k-btn ${props.primary ? "k-primary" : "k-secondary"} k-hold`}
      aria-disabled={blocked ? true : undefined}
      data-blocked={blocked ? "" : undefined}
      {...hover}
      onPointerDown={(e) => {
        // A finger on a blocked button reads why; otherwise holding is the action itself.
        if (blocked) hover.onPointerDown?.(e);
        begin();
      }}
      onPointerUp={stop}
      onPointerLeave={(e) => {
        hover.onPointerLeave?.(e);
        stop();
      }}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
    >
      <span className="k-hold-fill" style={{ transform: `scaleX(${progress})` }} />
      {props.icon && <Icon name={props.icon} size={17} />}
      <span>{props.children}</span>
    </button>
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}
