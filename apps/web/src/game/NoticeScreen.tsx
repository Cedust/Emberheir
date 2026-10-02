import { GAME_DATA } from "@emberheir/content";
import { type ActData, type Notice, getAct } from "@emberheir/sim";

interface NoticeText {
  readonly title: string;
  readonly sub: string;
  readonly nan: string;
  readonly facts: (
    n: Notice,
    act: ActData,
    next: ActData | undefined,
  ) => { k: string; v: string; tone: string }[];
}

type NoticeKind = Exclude<Notice["kind"], "prestige">;

const TEXT: Record<NoticeKind, NoticeText> = {
  death: {
    title: "ASHBOUND",
    sub: "You fell, and the ash gave you back. You keep everything: gear, Gold, Dust and Inventory. Only the way through this Act starts over.",
    nan: "The ash spat you back out. It does that. It likes you.",
    facts: (n, act) => [
      { k: "FELL AT", v: `Act ${act.number} · Stage ${n.stage}`, tone: "text" },
      { k: "BY", v: n.enemyName ?? "Unknown", tone: "rare" },
      { k: "BACK TO", v: `Camp · ${act.name}`, tone: "accent" },
    ],
  },
  retreat: {
    title: "RETREAT",
    sub: "You left the fight and went back to camp. Same rules as a death: you keep everything, and the Act starts over.",
    nan: "Sensible. Dead heroes don't farm.",
    facts: (n, act) => [
      { k: "LEFT AT", v: `Act ${act.number} · Stage ${n.stage}`, tone: "text" },
      { k: "KEPT", v: "Everything", tone: "good" },
      { k: "BACK TO", v: `Camp · ${act.name}`, tone: "accent" },
    ],
  },
  actCleared: {
    title: "ACT CLEARED",
    sub: "The boss is down and the caravan moves on. The road ahead is open.",
    nan: "Gorrak is down. Kaelen has seen enough to train you now.",
    facts: (_n, act, next) => [
      { k: "CLEARED", v: act.name, tone: "text" },
      ...(act.number === 1
        ? [{ k: "NEW IN CAMP", v: "Kaelen · Liora · Nyssa", tone: "good" }]
        : []),
      {
        k: "ROAD AHEAD",
        v: next ? `Act ${next.number} · ${next.name}` : "Farm or rest",
        tone: "accent",
      },
    ],
  },
};

/** Old Nan's word after each act boss. */
const CLEARED_NAN: Record<string, string> = {
  "ashen-fields": "Gorrak is down. Kaelen has seen enough to train you now.",
  rotwood: "The Mother of Rot is compost now. The forest can finally breathe.",
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
  // Prestige has its own screen (Inheritance).
  const text = TEXT[notice.kind === "prestige" ? "actCleared" : notice.kind];
  const act = getAct(GAME_DATA, notice.actId);
  const next = GAME_DATA.acts.find((a) => a.number === act.number + 1);
  const nan = notice.kind === "actCleared" ? (CLEARED_NAN[act.id] ?? text.nan) : text.nan;
  return (
    <section
      className={`screen notice-screen notice-${notice.kind}`}
      aria-label={text.title}
      role="status"
    >
      <svg
        className="ash"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
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
          {text.facts(notice, act, next).map((f) => (
            <div key={f.k} className="fact">
              <span className="eyebrow">{f.k}</span>
              <span className={`title-font tone-${f.tone}`}>{f.v}</span>
            </div>
          ))}
        </div>
        <div className="nan-line">
          <span className="nan-portrait title-font">N</span>
          <span className="quote">Old Nan: &ldquo;{nan}&rdquo;</span>
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
