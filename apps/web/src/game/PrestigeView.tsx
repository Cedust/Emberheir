import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  PROGRESSION,
  SLOT_NAMES,
  itemSlotFor,
  actsInRun,
  openBranches,
  prestigeBranchNodes,
  prestigeRewards,
  sealsAvailable,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { ItemDetail, ItemTile, fmt } from "../ui/items";
import type { GameApi } from "./useGame";
import { Paperdoll, dollBox } from "../ui/Paperdoll";

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

type Step = "victory" | "branch" | "seal";
const STEPS = [
  { id: "victory", name: "Victory" },
  { id: "branch", name: "Bloodline" },
  { id: "seal", name: "Seal" },
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

const BRANCH_COLORS: Record<string, string> = {
  core: "#c9a063",
  might: "#c9c2b8",
  arcana: "#5b8cff",
  rupture: "#d0505c",
  affliction: "#a35cff",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Exploding embers for the Victory step (fixed shape). */
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const r = i % 2 ? 70 : 92;
  const p = (d: number) =>
    `${(110 + Math.cos(a) * d).toFixed(0)} ${(110 + Math.sin(a) * d).toFixed(0)}`;
  return `M${p(28)} L${p(r)}`;
}).join(" ");

/**
 * Prestige flow (Prestige mock, PoC variant): Victory over the final boss, then the Seal step
 * where the player picks which slots keep their item. "Let It Burn" runs the Prestige; the
 * Inheritance screen follows as a notice.
 */
export function PrestigeView(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const pending = state.pendingPrestige;
  const [step, setStep] = useState<Step>("victory");
  const seals = sealsAvailable(state, GAME_DATA);
  const slots = GAME_DATA.equipmentSlots;
  // Last time's Seals are placed again; they can be moved.
  const [sealed, setSealed] = useState<EquipmentSlot[]>(() =>
    state.legacy.seals.filter((s) => state.hero.equipment[s]).slice(0, seals),
  );
  const [selected, setSelected] = useState<EquipmentSlot>(
    () => slots.find((s) => state.hero.equipment[s]) ?? "mainHand",
  );
  const open = openBranches(state, GAME_DATA);
  const [branch, setBranch] = useState<string | undefined>(() => open[0]?.id);
  if (!pending) return null;

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
            {pending.actId === "emberfall"
              ? "The Harvester breaks apart. Its ember scatters over the world, and everything burns down to grow again."
              : "The ground goes quiet. Then the sky catches fire: the Ashen Harvester has come to reap what grew."}
          </p>
          <button
            type="button"
            className="btn big primary"
            onClick={() => setStep(open.length ? "branch" : "seal")}
          >
            Hold On to What Matters
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
          <p className="sub">Choose a new branch for the Skill Tree. It stays forever.</p>
        </header>
        <div className="branch-picks">
          {open.map((b) => {
            const nodes = prestigeBranchNodes(SKILL_TREE, b.id);
            const skill = nodes.find((n) => n.skill)?.skill;
            const keystone = nodes.find((n) => n.kind === "keystone");
            const on = b.id === branch;
            return (
              <button
                key={b.id}
                type="button"
                className={`branch-pick panel-card ${on ? "on" : ""}`}
                aria-pressed={on}
                style={{ "--branch": BRANCH_COLORS[b.branch] } as React.CSSProperties}
                onClick={() => setBranch(b.id)}
              >
                <span className="eyebrow">{b.branch.toUpperCase()}</span>
                <span className="title-font branch-pick-name">{b.name}</span>
                <span className="sub">{b.theme}</span>
                {skill && (
                  <span className="small">
                    Skill · <b>{skill.name}</b>
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
          <button
            type="button"
            className="btn big primary"
            disabled={!branch}
            onClick={() => setStep("seal")}
          >
            Take {open.find((b) => b.id === branch)?.name ?? "it"}
          </button>
        </div>
      </section>
    );
  }

  const sel = state.hero.equipment[selected];
  const isSealed = sealed.includes(selected);
  const free = seals - sealed.length;
  const canToggle = !!sel && (isSealed || free > 0);
  const toggle = () => {
    if (!canToggle) return;
    setSealed((cur) => (isSealed ? cur.filter((s) => s !== selected) : [...cur, selected]));
  };
  const unsealed = slots.filter((s) => state.hero.equipment[s] && !sealed.includes(s)).length;
  const w = state.wallet;
  const burns = [
    `${plural(unsealed, "equipped item")} without a Seal`,
    `Inventory: ${plural(state.inventory.length, "item")}`,
    `Supply Wagon (Stash): ${plural(state.stash.length, "item")}`,
    `${fmt(w.gold)} Gold, ${fmt(w.dust)} Dust, ${plural(w.reforgeStones, "Reforge Stone")}, ${plural(w.ascensionShards, "Ascension Shard")}`,
    "Act progress",
  ];
  const stays = [
    `${plural(sealed.length, "sealed item")} (Heirlooms)`,
    `Level ${state.hero.level} and all points`,
    "Skill Tree, Battle Plan, Harvester's Ember",
    "Camp personas, settings",
  ];
  if (!state.hero.equipment.mainHand || !sealed.includes("mainHand")) {
    stays.push("A plain weapon of the same kind, if the Main Hand burns");
  }

  return (
    <section className="screen prestige prestige-seal" aria-label="The Harvest Begins">
      <Crumbs step="seal" />
      <header className="seal-head">
        <h2 className="title-font">THE HARVEST BEGINS</h2>
        <p className="sub">Choose which slots keep their item.</p>
      </header>
      <div className="seal-body">
        <section className="seal-doll panel-card" aria-label="Seal slots">
          <div className="section-row">
            <span className="title-font section-title">Legacy Seals</span>
            <span className="seal-pips" aria-label={`${sealed.length} of ${seals} Seals placed`}>
              {Array.from({ length: seals }, (_, i) => (
                <span key={i} className={i < sealed.length ? "on" : ""} />
              ))}
            </span>
          </div>
          <span className={`sub ${free > 0 ? "accent" : ""}`} data-testid="seal-text">
            {free > 0
              ? `${plural(free, "Seal")} left to place`
              : "All Seals placed. Click a sealed slot to move its Seal."}
          </span>
          <Paperdoll>
            {slots.map((slot) => {
              const pos = dollBox(slot);
              const it = state.hero.equipment[slot];
              const on = sealed.includes(slot);
              return (
                <div
                  key={slot}
                  className={`doll-slot ${on ? "sealed" : it ? "burns" : ""}`}
                  style={{ left: pos.x, top: pos.y }}
                >
                  <ItemTile
                    item={it}
                    label={SLOT_NAMES[itemSlotFor(slot)]}
                    width={pos.w}
                    height={pos.h}
                    selected={slot === selected}
                    {...(it ? { onSelect: () => setSelected(slot) } : {})}
                  />
                  {on && <span className="seal-mark">◆</span>}
                  {!on && it && (
                    <span className="burn-mark">
                      <Icon name="fire" size={14} />
                    </span>
                  )}
                </div>
              );
            })}
          </Paperdoll>
        </section>
        <section className="seal-side">
          {sel ? (
            <ItemDetail
              item={sel}
              heroAttributes={state.hero.attributes}
              where={isSealed ? "SEALED" : "BURNS"}
              className={isSealed ? "sealed" : ""}
              footer={
                <div className="detail-buttons">
                  <button
                    type="button"
                    className={`btn ${isSealed ? "" : "seal-btn"}`}
                    disabled={!canToggle}
                    onClick={toggle}
                  >
                    {isSealed ? "Remove Seal" : "Seal This Slot"}
                  </button>
                  <span className="sub small">
                    {isSealed
                      ? "This item becomes an Heirloom."
                      : free > 0
                        ? "Uses 1 Seal."
                        : "No Seal left. Remove one first."}
                  </span>
                </div>
              }
            />
          ) : (
            <div className="empty-pick panel-card sub">This slot is empty.</div>
          )}
          <div className="burn-lists">
            <div className="panel-card burns">
              <span className="title-font section-title">Burns</span>
              <ul>
                {burns.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="panel-card stays">
              <span className="title-font section-title">Stays</span>
              <ul>
                {stays.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="seal-footer">
            <span className="sub">There is no going back once the fire spreads.</span>
            <button
              type="button"
              className="btn big primary"
              onClick={() =>
                game.dispatch({
                  type: "prestige",
                  sealedSlots: sealed,
                  ...(branch ? { branchId: branch } : {}),
                })
              }
            >
              Let It Burn
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

/** Inheritance (last Prestige step): Old Nan, the rewards, then wake in the Camp. */
export function InheritanceView(props: { state: GameState; onWake: () => void }) {
  const { state } = props;
  const prestige = state.legacy.prestige;
  const r = prestigeRewards(GAME_DATA, prestige);
  const acts = actsInRun(GAME_DATA, prestige);
  const newAct = acts.length > actsInRun(GAME_DATA, prestige - 1).length ? acts.at(-1) : undefined;
  const newBranch = SKILL_TREE.prestigeBranches?.find((b) => b.id === state.legacy.branches.at(-1));
  const rewards = [
    {
      kind: "LEGACY SEAL",
      name: `${r.seals} / 10 Seals`,
      desc: "Sealed slots keep their item through every harvest.",
      tone: "seal",
    },
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
            name: newBranch.name,
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
    {
      kind: "SALVAGE DUST",
      name: `+${fmt(r.dust)} Dust`,
      desc: "A fresh start for crafting, whatever burned.",
      tone: "dust",
    },
    {
      kind: "LEVEL CAP",
      name: `${r.levelCap - PROGRESSION.levelCapPerPrestige} → ${r.levelCap}`,
      desc: `${PROGRESSION.levelCapPerPrestige} more levels to earn this run.`,
      tone: "good",
    },
    {
      kind: newAct ? "NEW ACT" : "WORLD",
      name: newAct ? `Act ${newAct.number} · ${newAct.name}` : `${acts.length} Acts`,
      desc: `Monster Level ${r.levelBand.start}–${r.levelBand.end}. The road leads further.`,
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
            <p>
              It&apos;s down. And there it goes, the whole field, up in smoke. Don&apos;t worry,
              dear, it&apos;ll grow back. It always does.
            </p>
            <p>Hold on to what matters. The fire can&apos;t take what you&apos;ve sealed.</p>
            <p>Another harvest, another Heir. Sit down, child. The fire&apos;s warm.</p>
          </div>
          <span className="sub small heir-note">
            You wake in the Camp before Act 1 and start again at Stage 1. The Supply Wagon burned
            and gets patched on your first return.
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
