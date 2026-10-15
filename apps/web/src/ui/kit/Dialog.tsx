import { type ReactNode, useEffect, useRef } from "react";
import { KeyHint } from "./Button";
import { isTypingTarget } from "./hotkeys";

/**
 * Hades-style dialogue box: a big portrait, a name plate, the line, up to four answers. Number
 * keys 1–4 pick an answer (shown as key caps).
 */
export function Dialog(props: {
  name: string;
  role?: string;
  portrait: ReactNode;
  children: ReactNode;
  answers: readonly { label: string; onPick: () => void; note?: string }[];
}) {
  const answers = props.answers.slice(0, 4);
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const pick = latest.current[Number(e.key) - 1];
      if (pick) {
        e.preventDefault();
        pick.onPick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="k-dialog" role="dialog" aria-label={props.name}>
      <div className="k-dialog-portrait">{props.portrait}</div>
      <div className="k-dialog-box">
        <div className="k-dialog-plate">
          <span className="k-title-main">{props.name}</span>
          {props.role && <span className="k-title-sub">{props.role}</span>}
        </div>
        <p className="k-dialog-line">{props.children}</p>
        <div className="k-dialog-answers">
          {answers.map((a, i) => (
            <button key={a.label} type="button" className="k-answer" onClick={a.onPick}>
              <KeyHint k={String(i + 1)} />
              <span>{a.label}</span>
              {a.note && <span className="k-answer-note">{a.note}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
