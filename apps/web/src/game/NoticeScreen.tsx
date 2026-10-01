import { POC_GAME_DATA } from "@emberheir/content";
import { type Notice, getAct } from "@emberheir/sim";

interface NoticeText {
  readonly title: string;
  readonly sub: string;
  readonly nan: string;
  readonly facts: (n: Notice, act: string) => { k: string; v: string; tone: string }[];
}

const TEXT: Record<Notice["kind"], NoticeText> = {
  death: {
    title: "ASHBOUND",
    sub: "You fell, and the ash gave you back. You keep everything: gear, Gold, Dust and Inventory. Only the way through this Act starts over.",
    nan: "The ash spat you back out. It does that. It likes you.",
    facts: (n, act) => [
      { k: "FELL AT", v: `Act 1 · Stage ${n.stage}`, tone: "text" },
      { k: "BY", v: n.enemyName ?? "Unknown", tone: "rare" },
      { k: "BACK TO", v: `Camp · ${act}`, tone: "accent" },
    ],
  },
  retreat: {
    title: "RETREAT",
    sub: "You left the fight and went back to camp. Same rules as a death: you keep everything, and the Act starts over.",
    nan: "Sensible. Dead heroes don't farm.",
    facts: (n, act) => [
      { k: "LEFT AT", v: `Act 1 · Stage ${n.stage}`, tone: "text" },
      { k: "KEPT", v: "Everything", tone: "good" },
      { k: "BACK TO", v: `Camp · ${act}`, tone: "accent" },
    ],
  },
  actCleared: {
    title: "ACT CLEARED",
    sub: "The boss is down and the caravan moves on. Kaelen will train you now, and Liora has unpacked her jars.",
    nan: "Gorrak is down. Kaelen has seen enough to train you now.",
    facts: (_n, act) => [
      { k: "CLEARED", v: act, tone: "text" },
      { k: "NEW IN CAMP", v: "Kaelen · Liora", tone: "good" },
      { k: "BACK TO", v: `Camp · ${act}`, tone: "accent" },
    ],
  },
};

/** Drifting ash: fixed pseudo-random dots (same layout every time). */
const ASH = (() => {
  let s = 7;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 70 }, () => ({
    x: rnd() * 1440,
    y: rnd() * 900,
    r: 1 + rnd() * 3,
    o: 0.2 + rnd() * 0.5,
    ember: rnd() > 0.85,
  }));
})();

/** Shown once after a run ends (Ashbound mock): death, retreat or a cleared act. */
export function NoticeScreen(props: { notice: Notice; onDismiss: () => void }) {
  const { notice } = props;
  const text = TEXT[notice.kind];
  const act = getAct(POC_GAME_DATA, notice.actId);
  return (
    <section
      className={`screen notice-screen notice-${notice.kind}`}
      aria-label={text.title}
      role="status"
    >
      <svg className="ash" viewBox="0 0 1440 900" aria-hidden="true">
        {ASH.map((a, i) => (
          <circle
            key={i}
            cx={a.x}
            cy={a.y}
            r={a.r}
            opacity={a.o}
            fill={a.ember ? "#ff8a3a" : "#b3a288"}
          />
        ))}
      </svg>
      <div className="notice-content">
        <h2 className="notice-title title-font">{text.title}</h2>
        <p className="notice-sub">{text.sub}</p>
        <div className="notice-facts">
          {text.facts(notice, act.name).map((f) => (
            <div key={f.k} className="fact">
              <span className="eyebrow">{f.k}</span>
              <span className={`title-font tone-${f.tone}`}>{f.v}</span>
            </div>
          ))}
        </div>
        <div className="nan-line">
          <span className="nan-portrait title-font">N</span>
          <span className="quote">Old Nan: &ldquo;{text.nan}&rdquo;</span>
        </div>
        {notice.kind === "death" && (
          <p className="recap-placeholder sub">
            Death Recap (what killed you and three build hints) comes later.
          </p>
        )}
        <button type="button" className="btn big primary" onClick={props.onDismiss}>
          Wake at the Hearthfire
        </button>
      </div>
    </section>
  );
}
