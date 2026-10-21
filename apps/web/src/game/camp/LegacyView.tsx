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
import { Medallion, Tabs, Window, WindowHeader, WindowLayer } from "../../ui/kit/Window";
import { type CollectionId, collections } from "../collections";
import { RuneBoard } from "./RuneViews";
import { TrophyWall } from "./TrophyWall";
import { Bestiary } from "./Bestiary";
import { TriggerCodex } from "./TriggerCodex";

type LegacyTab = "gear" | "collections" | "lineage";

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
  initialTab?: LegacyTab;
}) {
  const { state } = props;
  const { legacy } = state;
  const [tab, setTab] = useState<LegacyTab>(props.initialTab ?? "gear");
  const goals = collections(state);
  const full = goals.filter((g) => g.found >= g.total).length;
  const [pick, setPick] = useState<CollectionId>("trophies");
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
          ? undefined
          : `${legacy.prestige} harvest${legacy.prestige === 1 ? "" : "s"} survived.`,
    },
    {
      kind: "ITEMS CARRIED",
      value: String(carried),
    },
    {
      kind: "KEYSTONES",
      value: `${activeKeystones(GAME_DATA.skillTree, state.hero.learned)} / ${keystoneLimit(legacy.prestige)}`,
    },
    {
      kind: "LEVEL",
      value: `${state.hero.level} / ${levelCap(legacy.prestige)}`,
    },
    {
      kind: "BATTLE PLAN",
      value: `${state.progress.rotationSlots} Slot${state.progress.rotationSlots === 1 ? "" : "s"}`,
    },
    {
      kind: "THIS GENERATION",
      value: `${s.wins} / ${s.fights}`,
      desc: `Fights won. ${s.deaths} deaths, ${s.retreats} retreats, ${s.bossKills} boss kills in total.`,
    },
  ];
  return (
    <WindowLayer mode="full">
      <Window
        label="Legacy"
        mode="full"
        className="legacy"
        header={
          <WindowHeader
            title="Legacy"
            sub="Everything that survives the fire"
            medallion={<Medallion icon="fire" />}
            tabs={
              <Tabs
                label="Legacy"
                items={[
                  { id: "gear", name: "Worn Gear", icon: "shield" },
                  { id: "collections", name: `Collections · ${full}/${goals.length}`, icon: "box" },
                  { id: "lineage", name: "Lineage", icon: "flame" },
                ]}
                active={tab}
                onChange={setTab}
              />
            }
            right={<span className="gen-tag title-font">Generation {generation}</span>}
            onClose={props.onClose}
          />
        }
      >
        {tab === "lineage" ? (
          <div className="lineage-page">
            <Lineage state={state} />
          </div>
        ) : tab === "collections" ? (
          <div className="collections-page">
            <div className="collections" role="radiogroup" aria-label="Collections">
              {goals.map((g) => {
                const done = g.found >= g.total;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === g.id}
                    className={`panel-card collection${done ? " done" : ""}${pick === g.id ? " on" : ""}`}
                    aria-label={g.name}
                    onClick={() => setPick(g.id)}
                  >
                    <span className="section-row">
                      <span className="eyebrow">{g.name.toUpperCase()}</span>
                      <span className="title-font collection-count">
                        {g.found} / {g.total}
                      </span>
                    </span>
                    <span
                      className="collection-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={g.total}
                      aria-valuenow={g.found}
                    >
                      <span style={{ width: `${(100 * g.found) / Math.max(1, g.total)}%` }} />
                    </span>
                    <span className={`collection-reward small${done ? " accent" : ""}`}>
                      <Icon name={done ? "check" : "lock"} size={14} />
                      {done ? `${g.reward.replace(/^A /, "The ")} is raised.` : g.reward}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="collection-detail">
              {pick === "trophies" ? (
                <TrophyWall state={state} />
              ) : pick === "hunts" ? (
                <Bestiary state={state} />
              ) : pick === "runewords" ? (
                <RuneBoard state={state} mode="codex" selected={null} onSelect={() => {}} />
              ) : (
                <TriggerCodex state={state} />
              )}
            </div>
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
                  {f.desc && <span className="sub small">{f.desc}</span>}
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
                    style={{
                      left: 360 + Math.cos(a) * 270 - 52,
                      top: 400 + Math.sin(a) * 270 - 52,
                    }}
                    title={
                      item ? `${slotName(r.slot)}: ${item.name}` : `${slotName(r.slot)}: empty`
                    }
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
              </div>
            </div>
            <aside className="legacy-side">
              {selItem ? (
                <ItemDetail item={selItem} where="WORN" className="sealed" />
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
                    <strong className="accent">{heroTitle(state, GAME_DATA)}</strong> · Now · The
                    Heir walks the Ashen Fields.
                  </span>
                </div>
              </section>
            </aside>
          </div>
        )}
      </Window>
    </WindowLayer>
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
        <span
          className="title-font section-title"
          title={`Every win of The Last Ember lights a flame. Every class inherits its bonus. At ${LINEAGE_STEPS} flames, every Heir is called Emberheir.`}
        >
          Lineage
        </span>
        <span className="lineage-steps" aria-label={`Step ${step} of ${LINEAGE_STEPS}`}>
          {Array.from({ length: LINEAGE_STEPS }, (_, i) => (
            <span key={i} className={`lineage-pip${i < step ? " lit" : ""}`}>
              <Icon name="flame" size={16} />
            </span>
          ))}
        </span>
      </div>
      {step >= LINEAGE_STEPS && <span className="title-font accent">Emberheir</span>}
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
