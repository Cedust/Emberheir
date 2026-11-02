import { useEffect, useRef, useState } from "react";
import fieldsUrl from "../../assets/arena/ashen-fields.webp";
import foundUrl from "../../assets/intro/found-in-the-ash.webp";
import { Button } from "../../ui/kit/Button";
import { Dialog } from "../../ui/kit/Dialog";
import { isTypingTarget } from "../../ui/kit/hotkeys";
import { prefersReducedMotion } from "../../ui/kit/juice";
import { PersonaPortrait } from "../camp/art/PersonaArt";
import { INTRO_LINES, LAST_LINE, MEMORIES } from "./script";
import { useTypewriter } from "./typewriter";
import "./intro.css";

/** Ash flakes drifting down and embers rising: spread by their index, the same every time. */
const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: -((i * 1.7) % 11),
  size: 3 + ((i * 5) % 4),
  drift: ((i * 13) % 9) - 4,
}));
const EMBERS = Array.from({ length: 12 }, (_, i) => ({
  x: 8 + ((i * 29) % 84),
  delay: -((i * 1.3) % 7),
}));

/** A typed line: the letters still to come keep their place, so the box never jumps. */
function Typed(props: { text: string; shown: number; more: boolean }) {
  const letters = Array.from(props.text);
  return (
    <>
      <span>{letters.slice(0, props.shown).join("")}</span>
      <span className="si-unseen">{letters.slice(props.shown).join("")}</span>
      {props.more && <span className="si-more" aria-hidden="true" />}
    </>
  );
}

/**
 * The story intro of a new game (docs/design/notes/story-intro-v1.md). Old Nan tells of the
 * world over the Ashen Fields at dusk, then finds the Heir in the ash and asks who they were; the
 * answer opens the class select on that class (`null`: the Heir doesn't remember, or skipped).
 * Click, Space or Enter shows the whole line, then the next; Esc skips it all.
 */
export function StoryIntro(props: { onDone: (classId: string | null) => void }) {
  const [step, setStep] = useState(0);
  const [memory, setMemory] = useState<number | null>(null);
  const [tail, setTail] = useState<"reply" | "last" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const intro = INTRO_LINES[Math.min(step, INTRO_LINES.length - 1)] ?? INTRO_LINES[0];
  const picked = memory !== null ? MEMORIES[memory] : undefined;
  const text =
    tail === "reply" && picked ? picked.reply : tail === "last" ? LAST_LINE : (intro?.text ?? "");
  const scene = tail ? "found" : (intro?.scene ?? "world");
  const asking = !tail && step === INTRO_LINES.length - 1;
  // The first line of a scene waits for the black to lift (and Old Nan's face to arrive).
  const opens = !tail && (step === 0 || INTRO_LINES[step - 1]?.scene !== scene);
  const typed = useTypewriter(text, opens ? (scene === "found" ? 1500 : 800) : 0);
  const sky = scene === "world" ? intro?.sky : undefined;
  // The land glows red from the burning on, and darkens on the last told line.
  const burning = scene === "world" && step >= 2 && step <= 3;
  const dusk = scene === "world" && step === 4;

  const finish = (classId: string | null) => {
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(() => props.onDone(classId), prefersReducedMotion() ? 0 : 700);
  };
  const advance = () => {
    if (leaving) return;
    if (!typed.done) typed.finish();
    else if (asking) return;
    else if (tail === "reply") setTail("last");
    else if (tail === "last") finish(picked?.classId ?? null);
    else setStep((s) => s + 1);
  };
  const remember = (i: number) => {
    setMemory(i);
    setTail("reply");
  };

  const latest = useRef({ advance, finish });
  useEffect(() => {
    latest.current = { advance, finish };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        latest.current.finish(null);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        latest.current.advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const more = typed.done && !asking;
  return (
    <section
      className={`screen story-intro si-${scene}${burning ? " si-burning" : ""}${dusk ? " si-dusk" : ""}${leaving ? " si-leaving" : ""}`}
      aria-label="Story"
      onClick={(e) => {
        if (!(e.target as Element).closest("button")) advance();
      }}
    >
      <div className="si-backdrop" aria-hidden="true">
        {/* Timo's painting "Found in the Ash": the Heir in the ash by Old Nan's lantern. */}
        <div
          className="si-painting"
          key={scene}
          style={{ backgroundImage: `url(${scene === "found" ? foundUrl : fieldsUrl})` }}
        />
        <div className="si-glow" />
        {sky === "fall" && (
          <>
            <div className="si-star" key={`star-${step}`} />
            <div className="si-impact" key={`impact-${step}`} />
          </>
        )}
        <div className="si-ash">
          {FLAKES.map((f, i) => (
            <i
              key={i}
              style={
                {
                  "--x": `${f.x}%`,
                  "--d": `${f.delay}s`,
                  "--s": `${f.size}px`,
                  "--w": `${f.drift * 12}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className="si-embers">
          {EMBERS.map((f, i) => (
            <i key={i} style={{ "--x": `${f.x}%`, "--d": `${f.delay}s` } as React.CSSProperties} />
          ))}
        </div>
        <div className="si-veil" />
      </div>
      {/* Black between the told world and Old Nan's face; it fades out as the scene opens. */}
      <div className="si-curtain" key={scene} aria-hidden="true" />

      <div className="si-skip">
        <Button variant="ghost" hotkey="Esc" onClick={() => finish(null)}>
          Skip
        </Button>
      </div>

      {scene === "world" ? (
        <p className="si-told" key={step} data-testid="intro-line">
          <Typed text={text} shown={typed.shown} more={more} />
        </p>
      ) : (
        <div className="si-nan">
          <Dialog
            name="Old Nan"
            role="Hearthkeeper"
            label="Old Nan"
            portrait={<PersonaPortrait id="nan" />}
            answers={
              asking && typed.done
                ? MEMORIES.map((m, i) => ({ label: m.answer, onPick: () => remember(i) }))
                : []
            }
          >
            <span data-testid="intro-line">
              <Typed text={text} shown={typed.shown} more={more} />
            </span>
          </Dialog>
        </div>
      )}
    </section>
  );
}
