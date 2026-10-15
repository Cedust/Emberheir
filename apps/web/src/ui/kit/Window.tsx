import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { useNoteHover } from "../ItemTooltip";
import { IconButton, KeyHint } from "./Button";
import { HOTKEYS, useTabKeys } from "./hotkeys";
import { Marker } from "./Marker";

/**
 * The one window every screen outside the fight uses (ui-ux-plan-v1.md 3.1): a dark wood and
 * brass frame around parchment, one header, one way to close.
 */
export function Window(props: {
  label: string;
  header: ReactNode;
  children: ReactNode;
  /** "panel": a window over the dimmed scene; "full": covers the scene (Skill Tree). */
  mode?: "panel" | "full";
  /** "dialog" for windows that sit over another screen (Character, Kaelen). */
  role?: "dialog" | "region";
  className?: string;
}) {
  return (
    <section
      className={`k-window k-${props.mode ?? "panel"} ${props.className ?? ""}`}
      role={props.role === "dialog" ? "dialog" : undefined}
      aria-label={props.label}
    >
      <span className="k-corner tl" aria-hidden="true" />
      <span className="k-corner tr" aria-hidden="true" />
      <span className="k-corner bl" aria-hidden="true" />
      <span className="k-corner br" aria-hidden="true" />
      {props.header}
      <div className="k-window-body">{props.children}</div>
    </section>
  );
}

/**
 * Where a window sits (ui-ux-plan-v1.md 3.2): a "panel" floats over the dimmed, blurred scene
 * with a margin; a "full" window covers the stage (Skill Tree, Legacy ring need the room).
 */
export function WindowLayer(props: { mode?: "panel" | "full"; children: ReactNode }) {
  return <div className={`k-layer k-layer-${props.mode ?? "panel"}`}>{props.children}</div>;
}

/** Portrait medallion: a painted portrait, or an icon until the art exists. */
export function Medallion(props: {
  icon?: IconName;
  image?: string;
  tint?: string;
  /** Drawn art (e.g. a code-drawn persona portrait). */
  children?: ReactNode;
}) {
  return (
    <span className="k-medallion" style={props.tint ? { background: props.tint } : undefined}>
      {props.children ??
        (props.image ? (
          <img src={props.image} alt="" />
        ) : (
          props.icon && <Icon name={props.icon} size={26} color="#fff6e4" />
        ))}
    </span>
  );
}

/** Header bar: medallion, title, tabs, wallet, close with Esc. */
export function WindowHeader(props: {
  title: string;
  sub?: string;
  medallion?: ReactNode;
  tabs?: ReactNode;
  right?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <header className="k-window-head">
      {props.medallion}
      <div className="k-title">
        <span className="k-title-main">{props.title}</span>
        {props.sub && <span className="k-title-sub">{props.sub}</span>}
      </div>
      {props.tabs}
      <div className="k-grow" />
      {props.right}
      {props.onClose && (
        <IconButton
          icon="close"
          label="Close"
          hotkey={HOTKEYS.close}
          explain="Back to where you came from."
          onClick={props.onClose}
        />
      )}
    </header>
  );
}

export interface TabItem<T extends string> {
  readonly id: T;
  readonly name: string;
  readonly icon?: IconName;
  /** Small art instead of the icon, e.g. a persona's face. */
  readonly art?: ReactNode;
  /** A number or "!" when something waits there. */
  readonly marker?: number | "!";
  /** Why the tab is closed; locked tabs are skipped by Q/E. */
  readonly locked?: string;
}

/** Bookmark tabs; Q and E flip through them while this window is on top. */
export function Tabs<T extends string>(props: {
  items: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  keys?: boolean;
}) {
  const open = props.items.filter((t) => !t.locked).map((t) => t.id);
  useTabKeys(open, props.active, (id) => props.onChange(id as T), props.keys ?? true);
  const showKeys = (props.keys ?? true) && open.length > 1;
  return (
    <div className="k-tabs" role="tablist" aria-label={props.label}>
      {showKeys && <KeyHint k={HOTKEYS.prevTab} />}
      {props.items.map((t) => (
        <Tab key={t.id} item={t} on={t.id === props.active} onPick={() => props.onChange(t.id)} />
      ))}
      {showKeys && <KeyHint k={HOTKEYS.nextTab} />}
    </div>
  );
}

function Tab<T extends string>(props: { item: TabItem<T>; on: boolean; onPick: () => void }) {
  const t = props.item;
  // Only a closed tab explains itself; open tabs need no tooltip (Timo).
  const hover = useNoteHover(
    t.locked ? { name: t.name, kind: "", explain: "", status: t.locked } : undefined,
  );
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.on}
      aria-disabled={t.locked ? true : undefined}
      className={`k-tab${props.on ? " on" : ""}${t.locked ? " locked" : ""}`}
      onClick={t.locked ? undefined : props.onPick}
      {...hover}
    >
      {t.locked ? (
        <Icon name="lock" size={16} />
      ) : t.art ? (
        <span className="k-tab-art">{t.art}</span>
      ) : (
        t.icon && <Icon name={t.icon} size={16} />
      )}
      <span>{t.name}</span>
      {t.marker !== undefined && <Marker value={t.marker} />}
    </button>
  );
}
