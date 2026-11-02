import { useEffect, useMemo, useState } from "react";
import { prefersReducedMotion } from "../../ui/kit/juice";
import { playUiSound } from "../../ui/sound";

/** Milliseconds per letter, and the breath after a comma or a full stop. */
export const LETTER_MS = 30;
const PAUSE_MS: Readonly<Record<string, number>> = {
  ",": 120,
  ";": 140,
  ":": 160,
  ".": 300,
  "!": 300,
  "?": 300,
  "…": 360,
  "—": 200,
};

/** When each letter of `text` appears (ms after the start): a full stop holds the next letter back. */
export function revealTimes(text: string): number[] {
  const times: number[] = [];
  let t = 0;
  for (const ch of text) {
    t += LETTER_MS;
    times.push(t);
    t += PAUSE_MS[ch] ?? 0;
  }
  return times;
}

/** How many letters of `text` show `ms` after the line started. */
export function lettersAt(times: readonly number[], ms: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? Infinity) <= ms) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Types `text` out letter by letter, with a soft tick now and then. `finish` shows the whole line
 * at once (a click while it types). With reduced motion the line is there right away.
 */
export function useTypewriter(
  text: string,
  /** Wait this long before the first letter (while the scene fades in). */
  delay = 0,
): { shown: number; done: boolean; finish: () => void } {
  const letters = useMemo(() => Array.from(text), [text]);
  const times = useMemo(() => revealTimes(text), [text]);
  const [state, setState] = useState({ text, shown: 0 });
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const shown = reduced ? letters.length : state.text === text ? state.shown : 0;
  const done = shown >= letters.length;

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let last = 0;
    const start = performance.now();
    const step = (now: number) => {
      const n = lettersAt(times, now - start - delay);
      if (n !== last) {
        // Only letters tick, not the spaces between the words.
        if (letters[n - 1]?.trim()) playUiSound("type");
        last = n;
        setState((s) => (s.text === text && s.shown >= n ? s : { text, shown: n }));
      }
      if (n < letters.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text, letters, times, delay, reduced]);

  return { shown, done, finish: () => setState({ text, shown: letters.length }) };
}
