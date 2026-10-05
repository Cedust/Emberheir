import { GAME_DATA } from "@emberheir/content";
import { type ActData, type GameState, type Notice, getAct, isFinaleAct } from "@emberheir/sim";

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

type NoticeKind = Exclude<Notice["kind"], "prestige" | "ending">;

/** "Act 3 · Stage 4", or "The Last Ember · Stage 4". */
const where = (act: ActData, stage: number) =>
  `${isFinaleAct(GAME_DATA, act.id) ? act.name : `Act ${act.number}`} · Stage ${stage}`;
const camp = (act: ActData) => (isFinaleAct(GAME_DATA, act.id) ? "Camp" : `Camp · ${act.name}`);

const TEXT: Record<NoticeKind, NoticeText> = {
  death: {
    title: "ASHBOUND",
    sub: "You fell, and the ash gave you back. You keep everything: gear, Gold, Dust and Inventory. Only the way through this Act starts over.",
    nan: "The ash spat you back out. It does that. It likes you.",
    facts: (n, act) => [
      { k: "FELL AT", v: where(act, n.stage), tone: "text" },
      { k: "BY", v: n.enemyName ?? "Unknown", tone: "rare" },
      { k: "BACK TO", v: camp(act), tone: "accent" },
    ],
  },
  retreat: {
    title: "RETREAT",
    sub: "You left the fight and went back to camp. Same rules as a death: you keep everything, and the Act starts over.",
    nan: "Sensible. Dead heroes don't farm.",
    facts: (n, act) => [
      { k: "LEFT AT", v: where(act, n.stage), tone: "text" },
      { k: "KEPT", v: "Everything", tone: "good" },
      { k: "BACK TO", v: camp(act), tone: "accent" },
    ],
  },
  actCleared: {
    title: "ACT CLEARED",
    sub: "The boss is down and the caravan moves on. The road ahead is open.",
    nan: "Gorrak is down. Liora finally agrees to see you.",
    facts: (_n, act, next) => [
      { k: "CLEARED", v: act.name, tone: "text" },
      ...(act.number === 1 ? [{ k: "NEW IN CAMP", v: "Liora · Nyssa", tone: "good" }] : []),
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
  "ashen-fields": "Gorrak is down. Liora finally agrees to see you.",
  rotwood: "The Mother of Rot is compost now. The forest can finally breathe.",
  "ember-wastes": "The Cinder Tyrant cools into a very large paperweight.",
  "frost-peaks": "The Rime Warden shatters. Somebody pack a scarf for the next act.",
  "storm-spires": "The Storm Herald is grounded. My hair will never lie flat again.",
  "void-rift": "The Maw is shut. Don't look into the hole it left, dear.",
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

function Ash() {
  return (
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
  );
}

/** The end of the game (M11): the Harvester's Core is out. Stats, Old Nan, credits. */
export function EndingScreen(props: { state: GameState; onDismiss: () => void }) {
  const { state } = props;
  const facts = [
    { k: "PRESTIGES", v: String(state.legacy.prestige) },
    { k: "ATTEMPTS", v: String(state.legacy.finaleAttempts ?? 1) },
    { k: "FIGHTS", v: state.stats.fights.toLocaleString("en-US") },
    { k: "DEATHS", v: state.stats.deaths.toLocaleString("en-US") },
    { k: "TROPHIES", v: String(state.legacy.trophies.length) },
  ];
  return (
    <section className="screen notice-screen notice-ending" aria-label="The End" role="status">
      <Ash />
      <div className="ending-glow" aria-hidden />
      <div className="notice-content">
        <span className="eyebrow ending-eyebrow">The Last Ember</span>
        <h2 className="notice-title title-font">THE FIRE IS HOME</h2>
        <p className="notice-sub">
          The Harvester&apos;s last flame goes out. No more harvests. The ash settles, and the
          caravan stays.
        </p>
        <div className="notice-facts">
          {facts.map((f) => (
            <div key={f.k} className="fact">
              <span className="eyebrow">{f.k}</span>
              <span className="title-font tone-accent">{f.v}</span>
            </div>
          ))}
        </div>
        <div className="nan-line">
          <span className="nan-portrait title-font">N</span>
          <span className="quote">
            Old Nan: &ldquo;No smoke. No ash. Just... quiet. Well. I suppose I&apos;ll need to
            remember my name after all.&rdquo;
          </span>
        </div>
        <p className="ending-credits sub">Emberheir · an idea by Timo · built by Claude</p>
        <button type="button" className="btn big primary" onClick={props.onDismiss}>
          Back to the Hearthfire
        </button>
      </div>
    </section>
  );
}

/** Shown once after a run ends (Ashbound mock): death, retreat or a cleared act. */
export function NoticeScreen(props: { notice: Notice; onDismiss: () => void }) {
  const { notice } = props;
  // Prestige and the ending have their own screens.
  const text =
    TEXT[notice.kind === "prestige" || notice.kind === "ending" ? "actCleared" : notice.kind];
  const act = getAct(GAME_DATA, notice.actId);
  const next = GAME_DATA.acts.find((a) => a.number === act.number + 1);
  const nan = notice.kind === "actCleared" ? (CLEARED_NAN[act.id] ?? text.nan) : text.nan;
  return (
    <section
      className={`screen notice-screen notice-${notice.kind}`}
      aria-label={text.title}
      role="status"
    >
      <Ash />
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
