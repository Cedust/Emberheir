import { useEffect, useRef } from "react";
import type { LogLine } from "./format";

export function CombatLog({ lines }: { lines: readonly LogLine[] }) {
  const ref = useRef<HTMLOListElement>(null);

  // Keep the newest line in view.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <ol className="log" ref={ref} aria-label="Combat log" data-testid="combat-log">
      {lines.length === 0 && <li className="log-empty">Press Start fight.</li>}
      {lines.map((line, i) => (
        <li key={i} className={`log-line side-${line.side ?? "none"}`}>
          <span className="log-time">{line.time}</span>
          <span className={line.tone ? `tone-${line.tone}` : undefined}>{line.text}</span>
        </li>
      ))}
    </ol>
  );
}
