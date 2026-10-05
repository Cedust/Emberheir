import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import {
  type GameState,
  PROGRESSION,
  actsInRun,
  branchTier,
  levelCap,
  openBranches,
  prestigeBranchNodes,
  prestigeRewards,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import type { GameApi } from "./useGame";

/** The boss's last words when its fall starts the harvest. */
const LAST_WORDS: Record<string, string> = {
  "ashen-fields": "Hrrk... the Harvester... will want... its field back...",
  rotwood: "Rot... returns... The Harvester... always... reaps...",
  "ember-wastes": "The fire... was never... mine...",
  "frost-peaks": "Cold... keeps... nothing... from it...",
  "storm-spires": "The storm... was only... its breath...",
  "void-rift": "Even nothing... gets... harvested...",
  emberfall: "You cannot keep... the ember... Heir... It always... grows back...",
};

type Step = "victory" | "branch";
const STEPS = [
  { id: "victory", name: "Victory" },
  { id: "branch", name: "Bloodline" },
  { id: "heir", name: "Inheritance" },
] as const;

function Crumbs(props: { step: (typeof STEPS)[number]["id"] }) {
  return (
    <ol className="prestige-crumbs" aria-label="Prestige steps">
      {STEPS.map((s) => (
        <li key={s.id} className={s.id === props.step ? "on" : ""}>
          {s.name}
        </li>
      ))}
    </ol>
  );
}

const ROMAN = ["", "I", "II", "III"];

const BRANCH_COLORS: Record<string, string> = {
  core: "#c9a063",
  might: "#c9c2b8",
  arcana: "#5b8cff",
  rupture: "#d0505c",
  affliction: "#a35cff",
};

/** Exploding embers for the Victory step (fixed shape). */
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const r = i % 2 ? 70 : 92;
  const p = (d: number) =>
    `${(110 + Math.cos(a) * d).toFixed(0)} ${(110 + Math.sin(a) * d).toFixed(0)}`;
  return `M${p(28)} L${p(r)}`;
}).join(" ");

/**
 * Prestige flow: Victory over the final boss, then the new Skill Tree branch. The world burns,
 * the caravan carries all of the Heir's things out (Playtest 2); the Inheritance screen follows as
 * a notice.
 */
export function PrestigeView(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const pending = state.pendingPrestige;
  const [step, setStep] = useState<Step>("victory");
  // Branches to deepen first, then new ones.
  const owned = (id: string) => state.legacy.branches.includes(id);
  const open = openBranches(state, GAME_DATA).sort(
    (a, b) => Number(owned(b.id)) - Number(owned(a.id)),
  );
  const [branch, setBranch] = useState<string | undefined>(() => open[0]?.id);
  if (!pending) return null;
  const final = state.legacy.prestige + 1 >= PROGRESSION.finalPrestige;
  const finish = () => game.dispatch({ type: "prestige", ...(branch ? { branchId: branch } : {}) });

  if (step === "victory") {
    return (
      <section className="screen prestige prestige-victory" aria-label="Victory">
        <Crumbs step="victory" />
        <div className="victory-content">
          <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="100" fill="rgb(255 138 58 / 0.12)" />
            <circle cx="110" cy="110" r="64" fill="rgb(255 138 58 / 0.22)" />
            <path d={SHARDS} stroke="#ffb13b" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="110" cy="110" r="18" fill="#ffb13b" />
          </svg>
          <h2 className="victory-title title-font">
            {(pending.enemyName.split(",")[0] ?? "").toUpperCase()} FALLS
          </h2>
          <p className="victory-quote">
            &ldquo;{LAST_WORDS[pending.actId] ?? "...the Harvester... will come for you..."}&rdquo;
          </p>
          <p className="victory-sub">
            {final
              ? "The Harvester breaks apart, but its ember does not scatter. It flees into one last flame, and this time nothing burns."
              : pending.actId === "emberfall"
                ? "The Harvester breaks apart. Its ember scatters over the world, and everything burns down to grow again."
                : "The ground goes quiet. Then the sky catches fire: the Ashen Harvester has come to reap what grew."}
          </p>
          <button
            type="button"
            className="btn big primary"
            onClick={() => (open.length ? setStep("branch") : finish())}
          >
            {final ? "Keep Everything" : "Pack the Caravan"}
          </button>
        </div>
      </section>
    );
  }

  if (step === "branch") {
    return (
      <section className="screen prestige prestige-branch" aria-label="Bloodline">
        <Crumbs step="branch" />
        <header className="seal-head">
          <h2 className="title-font">THE BLOODLINE GROWS</h2>
          <p className="sub">Grow a new branch, or deepen one you have. It stays forever.</p>
        </header>
        <div className="branch-picks">
          {open.map((b) => {
            const tier = branchTier(state.legacy.branches, b.id) + 1;
            const nodes = prestigeBranchNodes(SKILL_TREE, b.id).filter(
              (n) => (n.tier ?? 1) === tier,
            );
            const skill = nodes.find((n) => n.skill)?.skill;
            const keystone = nodes.find((n) => n.kind === "keystone");
            const notable = nodes.find((n) => n.kind === "notable");
            const on = b.id === branch;
            return (
              <button
                key={b.id}
                type="button"
                className={`branch-pick panel-card ${on ? "on" : ""} ${tier > 1 ? `deepen tier-${tier}` : ""}`}
                aria-pressed={on}
                style={{ "--branch": BRANCH_COLORS[b.branch] } as React.CSSProperties}
                onClick={() => setBranch(b.id)}
              >
                <span className="eyebrow">
                  {tier > 1 ? `DEEPEN · TIER ${ROMAN[tier]}` : b.branch.toUpperCase()}
                </span>
                <span className="title-font branch-pick-name">
                  {b.name}
                  {tier > 1 ? ` ${ROMAN[tier]}` : ""}
                </span>
                <span className="sub">{b.theme}</span>
                {skill && (
                  <span className="small">
                    Skill · <b>{skill.name}</b>
                  </span>
                )}
                {tier > 1 && notable && (
                  <span className="small">
                    Notable · <b>{notable.name}</b>
                  </span>
                )}
                {keystone && (
                  <span className="small">
                    Keystone · <b>{keystone.name}</b>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="branch-footer">
          <button type="button" className="btn big primary" disabled={!branch} onClick={finish}>
            {branch && state.legacy.branches.includes(branch) ? "Deepen" : "Take"}{" "}
            {open.find((b) => b.id === branch)?.name ?? "it"}
          </button>
        </div>
      </section>
    );
  }

  return null;
}

/** Inheritance (last Prestige step): Old Nan, the rewards, then wake in the Camp. */
export function InheritanceView(props: { state: GameState; onWake: () => void }) {
  const { state } = props;
  const prestige = state.legacy.prestige;
  const r = prestigeRewards(GAME_DATA, prestige);
  const acts = actsInRun(GAME_DATA, prestige);
  const newAct = acts.length > actsInRun(GAME_DATA, prestige - 1).length ? acts.at(-1) : undefined;
  const newBranch = SKILL_TREE.prestigeBranches?.find((b) => b.id === state.legacy.branches.at(-1));
  const newTier = newBranch ? branchTier(state.legacy.branches, newBranch.id) : 0;
  const final = prestige >= PROGRESSION.finalPrestige;
  const rewards = [
    ...(r.planUpgrade
      ? [
          {
            kind: "BATTLE PLAN",
            name: r.planUpgrade,
            desc: "Set it up at Kaelen.",
            tone: "accent",
          },
        ]
      : []),
    ...(newBranch
      ? [
          {
            kind: "PRESTIGE BRANCH",
            name: `${newBranch.name}${newTier > 1 ? ` ${ROMAN[newTier]}` : ""}`,
            desc: newBranch.theme,
            tone: "accent",
          },
        ]
      : []),
    {
      kind: "HARVESTER'S EMBER",
      name: `+${r.harvesterEmber} Ember`,
      desc: "Unlocks one Keystone in the Skill Tree.",
      tone: "ember",
    },
    ...(final
      ? []
      : [
          {
            kind: "LEVEL CAP",
            name: `${levelCap(prestige - 1)} → ${r.levelCap}`,
            desc: `${r.levelCap - levelCap(prestige - 1)} more levels to earn this run.`,
            tone: "good",
          },
        ]),
    {
      kind: final ? "THE LAST EMBER" : newAct ? "NEW ACT" : "WORLD",
      name: final
        ? "The last flame"
        : newAct
          ? `Act ${newAct.number} · ${newAct.name}`
          : `${acts.length} Acts`,
      desc: final
        ? "Six Warden echoes, then the Harvester's Core. Enter it from the Camp."
        : `Monster Level ${r.levelBand.start}–${r.levelBand.end}. The road leads further.`,
      tone: "epic",
    },
  ];
  return (
    <section className="screen prestige prestige-heir" aria-label="Inheritance">
      <Crumbs step="heir" />
      <div className="heir-body">
        <aside className="heir-nan">
          <div className="heir-nan-head">
            <span className="nan-portrait title-font">N</span>
            <div>
              <span className="title-font">Old Nan</span>
              <span className="sub">Hearthkeeper</span>
            </div>
          </div>
          <div className="heir-nan-lines">
            {final ? (
              <>
                <p>Down again. But look, dear: the field is still there. Nothing caught.</p>
                <p>
                  One flame got away. Small, mean and very hot. Everything you own is yours to keep
                  now, so go and put it out.
                </p>
              </>
            ) : (
              <>
                <p>
                  It&apos;s down. And there it goes, the whole field, up in smoke. Don&apos;t worry,
                  dear, it&apos;ll grow back. It always does.
                </p>
                <p>
                  The caravan got your things out in time, every last one. The fire can&apos;t take
                  what you carry.
                </p>
                <p>Another harvest, another Heir. Sit down, child. The fire&apos;s warm.</p>
              </>
            )}
          </div>
          <span className="sub small heir-note">
            {final
              ? "You wake in the Camp with everything you had. The Last Ember waits by the road."
              : "You wake in the Camp before Act 1 and start again at Stage 1, with everything you carried."}
          </span>
        </aside>
        <main className="heir-main">
          <span className="eyebrow">INHERITANCE · GENERATION {prestige + 1}</span>
          <div className="heir-rewards">
            {rewards.map((card) => (
              <div key={card.kind} className={`heir-card panel-card tone-card-${card.tone}`}>
                <span className="eyebrow">{card.kind}</span>
                <span className="title-font heir-card-name">{card.name}</span>
                <span className="sub">{card.desc}</span>
              </div>
            ))}
          </div>
          {prestige === 1 && (
            <div className="heir-caravan panel-card">
              <Icon name="camp" size={22} />
              <span>
                <b>Kaelen and Liora</b> travel with the caravan: Skill Tree and Battle Plan at
                Kaelen, Reforge, Temper and Imbue at Liora.
              </span>
            </div>
          )}
          <div className="grow" />
          <button type="button" className="btn big primary wake" onClick={props.onWake}>
            Wake at the Hearthfire
          </button>
        </main>
      </div>
    </section>
  );
}
