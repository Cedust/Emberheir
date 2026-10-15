import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

/** "!" or a count where something waits (WoW quest marker): over personas, on tabs. */
export function Marker(props: { value: number | "!"; className?: string }) {
  if (props.value === 0) return null;
  return (
    <span className={`k-marker ${props.className ?? ""}`} aria-hidden="true">
      {props.value}
    </span>
  );
}

/** Instead of a grey box: a small drawing and one line. */
export function EmptyState(props: { icon: IconName; children: ReactNode }) {
  return (
    <div className="k-empty">
      <span className="k-empty-art">
        <Icon name={props.icon} size={34} />
      </span>
      <span className="k-empty-text">{props.children}</span>
    </div>
  );
}
