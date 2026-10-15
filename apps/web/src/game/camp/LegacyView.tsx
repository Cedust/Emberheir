import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  SLOT_NAMES,
  activeKeystones,
  heroTitle,
  keystoneLimit,
  itemSlotFor,
  LINEAGE_STEPS,
  lineageScale,
  levelCap,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { ItemDetail } from "../../ui/items";
import { useTabKeys } from "../../ui/kit/hotkeys";
import { collections } from "../collections";
import { TROPHY_COUNT, TrophyWall } from "./TrophyWall";

const RING: { slot: EquipmentSlot; icon: IconName }[] = [
  { slot: "helm", icon: "helm" },
  { slot: "amulet", icon: "amulet" },
  { slot: "body", icon: "armor" },
  { slot: "gloves", icon: "gloves" },
  { slot: "belt", icon: "belt" },
  { slot: "boots", icon: "boots" },
  { slot: "ring2", icon: "ring" },
  { slot: "ring1", icon: "ring" },
  { slot: "offHand", icon: "shield" },
  { slot: "charm", icon: "amulet" },
];

const slotName = (slot: EquipmentSlot) => SLOT_NAMES[itemSlotFor(slot)];

/**
 * The Hearthfire (Legacy mock): the Heir's gear in the ring of 10 slots, what stays, the
 * chronicle. Since Playtest 2 every item survives the harvest.
 */
export function LegacyView(props: {
  state: GameState;
  onClose: () => void;
  initialTab?: "gear" | "trophies" | "collections";
}) {
  const { state } = props;
  const { legacy } = state;
  const [tab, setTab] = useState<"gear" | "trophies" | "collections">(props.initialTab ?? "gear");
  useTabKeys(["gear", "trophies", "collections"], tab, (id) => setTab(id as typeof tab));
  const goals = collections(state);
  const full = goals.filter((g) => g.found >= g.total).length;
  const generation = legacy.prestige + 1;
  const [sel, setSel] = useState<EquipmentSlot>("body");
  const wornIn = (slot: EquipmentSlot) => state.hero.equipment[slot];
  const worn = RING.filter((r) => wornIn(r.slot)).length;
  const carried = worn + state.inventory.length + state.stash.length;
  const s = state.stats;
  const selItem = wornIn(sel);
  const facts = [
    {
      kind: "GENERATION",
      value: String(generation),
      desc:
        generation === 1
          ? "The first Heir. Everything is still new."
          : `${legacy.prestige} harvest${legacy.prestige === 1 ? "" : "s"} survived.`,
    },
    {
      kind: "ITEMS CARRIED",
      value: String(carried),
      desc: "Worn, packed and stashed. The caravan saves all of it from the fire.",
    },
    {
      kind: "KEYSTONES",
      value: `${activeKeystones(GAME_DATA.skillTree, state.hero.learned)} / ${keystoneLimit(legacy.prestige)}`,
      desc: "Active at once. One more place at Prestige 2, 4 and 6.",
    },
    {
      kind: "LEVEL CAP",
      value: String(levelCap(legacy.prestige)),
      desc: `Level ${state.hero.level} now. Ten levels above the harvest boss, for farming.`,
    },
    {
      kind: "BATTLE PLAN",
      value: `${state.progress.rotationSlots} Slot${state.progress.rotationSlots === 1 ? "" : "s"}`,
      desc: "Grows with every harvest.",
    },
    {
      kind: "THIS GENERATION",
      value: `${s.wins} / ${s.fights}`,
      desc: `Fights won. ${s.deaths} deaths, ${s.retreats} retreats, ${s.bossKills} boss kills in total.`,
    },
  ];
  return (
    <section className="screen legacy" aria-label="Legacy">
      <header className="persona-header bar-top">
        <div className="run-title">
          <span className="title-font">LEGACY</span>
          <span className="sub">Everything that survives the fire</span>
        </div>
        <span className="gen-tag title-font">Generation {generation}</span>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "gear"}
            className={`tab title-font ${tab === "gear" ? "on" : ""}`}
            onClick={() => setTab("gear")}
          >
            Worn Gear
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "trophies"}
            className={`tab title-font ${tab === "trophies" ? "on" : ""}`}
            onClick={() => setTab("trophies")}
          >
            Trophy Wall · {legacy.trophies.length}/{TROPHY_COUNT}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "collections"}
            className={`tab title-font ${tab === "collections" ? "on" : ""}`}
            onClick={() => setTab("collections")}
          >
            Collections · {full}/{goals.length}
          </button>
        </div>
        <div className="grow" />
        <button
          type="button"
          className="icon-button"
          aria-label="Back to Camp"
          title="Back to Camp (Esc)"
          onClick={props.onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      {tab === "trophies" ? (
        <TrophyWall state={state} />
      ) : tab === "collections" ? (
        <div className="collections-page">
          <div className="collections" aria-label="Collections">
            {goals.map((g) => {
              const done = g.found >= g.total;
              return (
                <section
                  key={g.id}
                  className={`panel-card collection${done ? " done" : ""}`}
                  aria-label={g.name}
                >
                  <span className="eyebrow">{g.name.toUpperCase()}</span>
                  <span className="title-font big">
                    {g.found} / {g.total}
                  </span>
                  <div
                    className="collection-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={g.total}
                    aria-valuenow={g.found}
                  >
                    <div style={{ width: `${(100 * g.found) / Math.max(1, g.total)}%` }} />
                  </div>
                  <span className="sub small">{g.how}</span>
                  <span className={`collection-reward small${done ? " accent" : ""}`}>
                    <Icon name={done ? "check" : "lock"} size={14} />
                    {done ? `${g.reward.replace(/^A /, "The ")} is raised.` : g.reward}
                  </span>
                </section>
              );
            })}
          </div>
          <Lineage state={state} />
        </div>
      ) : (
        <div className="legacy-body">
          <aside className="legacy-facts">
            {facts.map((f) => (
              <div key={f.kind} className="legacy-fact panel-card">
                <div className="section-row">
                  <span className="eyebrow">{f.kind}</span>
                  <span className="mono">{f.value}</span>
                </div>
                <span className="sub small">{f.desc}</span>
              </div>
            ))}
          </aside>
          <div className="legacy-ring">
            <div className="ring-line" />
            {RING.map((r, i) => {
              const a = ((-90 + i * 36) * Math.PI) / 180;
              const item = wornIn(r.slot);
              return (
                <button
                  key={r.slot}
                  type="button"
                  className={`ring-slot${item ? ` worn rarity-${item.rarity}` : ""}${sel === r.slot ? " on" : ""}`}
                  style={{ left: 360 + Math.cos(a) * 270 - 52, top: 400 + Math.sin(a) * 270 - 52 }}
                  title={item ? `${slotName(r.slot)}: ${item.name}` : `${slotName(r.slot)}: empty`}
                  aria-label={
                    item ? `${slotName(r.slot)}: ${item.name}` : `${slotName(r.slot)}: empty`
                  }
                  onClick={() => setSel(r.slot)}
                >
                  {item ? (
                    <span className="ring-art">
                      <ItemArt baseId={item.baseId} slot={itemSlotFor(r.slot)} />
                    </span>
                  ) : (
                    <Icon name={r.icon} size={30} strokeWidth={1.6} className="rarity-stroke" />
                  )}
                  <span className="sub small">{item ? item.name : slotName(r.slot)}</span>
                  <span className="seal">◆</span>
                </button>
              );
            })}
            <div className="ring-center">
              <Icon name="fire" size={64} color="var(--accent)" />
              <span className="title-font big">{worn} / 10 worn</span>
              <span className="sub">Click a slot for details</span>
            </div>
          </div>
          <aside className="legacy-side">
            {selItem ? (
              <ItemDetail
                item={selItem}
                where="WORN"
                className="sealed"
                footer={
                  <span className="sub small">
                    Survives every harvest. Thoric can raise its Tier with a Phoenix Feather.
                  </span>
                }
              />
            ) : (
              <section className="panel-card">
                <span className="eyebrow">{slotName(sel).toUpperCase()}</span>
                <p className="title-font">Empty slot</p>
              </section>
            )}
            <section className="panel-card chronicle" aria-label="Chronicle">
              <span className="title-font section-title">Chronicle</span>
              {legacy.chronicle.map((c) => (
                <div key={c.generation} className="chronicle-row">
                  <span className="mono">Gen {c.generation}</span>
                  <span>
                    {c.title ? <strong className="accent">{c.title}</strong> : null}
                    {c.title ? " · " : ""}
                    {c.enemyName.split(",")[0]} fell at Level {c.level} after {c.deaths} death
                    {c.deaths === 1 ? "" : "s"}.
                  </span>
                </div>
              ))}
              <div className="chronicle-row">
                <span className="mono accent">Gen {generation}</span>
                <span>
                  <strong className="accent">{heroTitle(state, GAME_DATA)}</strong> · Now ·{" "}
                  {state.hero.name} walks the Ashen Fields.
                </span>
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

/**
 * Lineage (spielzeit-v1.md, D): the account's finale wins. The first one opens a bonus for every
 * class, each further one raises them all a step; a character carries its own class's bonus.
 */
function Lineage(props: { state: GameState }) {
  const step = props.state.lineage ?? 0;
  const scale = lineageScale(step);
  const own = props.state.hero.classId;
  return (
    <section className="panel-card lineage" aria-label="Lineage">
      <div className="section-row">
        <span className="title-font section-title">Lineage</span>
        <span className="lineage-steps" aria-label={`Step ${step} of ${LINEAGE_STEPS}`}>
          {Array.from({ length: LINEAGE_STEPS }, (_, i) => (
            <span key={i} className={`lineage-pip${i < step ? " lit" : ""}`}>
              <Icon name="flame" size={16} />
            </span>
          ))}
        </span>
      </div>
      <span className="sub small">
        {step === 0
          ? "Win The Last Ember with any Heir to open it. Every class then inherits its bonus."
          : `Step ${step} of ${LINEAGE_STEPS}. Every Heir who wins The Last Ember adds a step.`}{" "}
        {step >= LINEAGE_STEPS
          ? "The title Emberheir is yours."
          : `At step ${LINEAGE_STEPS} every Heir is called Emberheir.`}
      </span>
      <div className="lineage-classes">
        {GAME_DATA.classes.map((c) => {
          const l = c.lineage;
          if (!l) return null;
          const value = Math.round(l.percent * Math.max(1, scale) * 10) / 10;
          return (
            <div
              key={c.id}
              className={`lineage-class${c.id === own ? " own" : ""}${step > 0 ? " open" : ""}`}
              title={`${l.name}: every new ${c.name} gets +${value} % ${l.stat}${step === 0 ? " once the Lineage opens" : ""}.`}
            >
              <span className="eyebrow">{c.name.toUpperCase()}</span>
              <span className="title-font">{l.name}</span>
              <span className="mono">
                +{value} % {l.stat}
              </span>
              {c.id === own && <span className="sub small accent">This Heir</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
