import {
  type EquipmentSlot,
  type GameState,
  SLOT_NAMES,
  itemSlotFor,
  levelCap,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { ItemDetail } from "../../ui/items";
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
  { slot: "mainHand", icon: "sword" },
];

const slotName = (slot: EquipmentSlot) => SLOT_NAMES[itemSlotFor(slot)];

/**
 * The Hearthfire (Legacy mock): the Heir's gear in the ring of 10 slots, what stays, the
 * chronicle. Since Playtest 2 every item survives the harvest, so all worn gear is an Heirloom.
 */
export function LegacyView(props: {
  state: GameState;
  onClose: () => void;
  initialTab?: "heirlooms" | "trophies";
}) {
  const { state } = props;
  const { legacy } = state;
  const [tab, setTab] = useState<"heirlooms" | "trophies">(props.initialTab ?? "heirlooms");
  const generation = legacy.prestige + 1;
  const [sel, setSel] = useState<EquipmentSlot>("mainHand");
  const heirloom = (slot: EquipmentSlot) => state.hero.equipment[slot];
  const worn = RING.filter((r) => heirloom(r.slot)).length;
  const carried = worn + state.inventory.length + state.stash.length;
  const s = state.stats;
  const selItem = heirloom(sel);
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
      kind: "HARVESTER'S EMBER",
      value: String(state.wallet.harvesterEmber),
      desc: "Free Ember. Pays for Keystones at Kaelen.",
    },
    {
      kind: "LEVEL CAP",
      value: String(levelCap(legacy.prestige)),
      desc: `Level ${state.hero.level} now. Every act you open raises it by 5.`,
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
            aria-selected={tab === "heirlooms"}
            className={`tab title-font ${tab === "heirlooms" ? "on" : ""}`}
            onClick={() => setTab("heirlooms")}
          >
            Heirlooms
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
              const item = heirloom(r.slot);
              return (
                <button
                  key={r.slot}
                  type="button"
                  className={`ring-slot${item ? ` heirloom rarity-${item.rarity}` : ""}${sel === r.slot ? " on" : ""}`}
                  style={{ left: 360 + Math.cos(a) * 270 - 52, top: 400 + Math.sin(a) * 270 - 52 }}
                  title={
                    item ? `${slotName(r.slot)}: ${item.name}` : `${slotName(r.slot)}: no Heirloom`
                  }
                  aria-label={
                    item ? `${slotName(r.slot)}: ${item.name}` : `${slotName(r.slot)}: no Heirloom`
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
              <span className="title-font big">{worn} / 10 Heirlooms</span>
              <span className="sub">Click a slot for details</span>
            </div>
          </div>
          <aside className="legacy-side">
            {selItem ? (
              <ItemDetail
                item={selItem}
                where="HEIRLOOM"
                className="sealed"
                footer={
                  <span className="sub small">
                    Survives every harvest. Thoric can raise its Tier with an Ascension Shard.
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
                    {c.enemyName.split(",")[0]} fell at Level {c.level} after {c.deaths} death
                    {c.deaths === 1 ? "" : "s"}.
                  </span>
                </div>
              ))}
              <div className="chronicle-row">
                <span className="mono accent">Gen {generation}</span>
                <span>Now · the Heir walks the Ashen Fields.</span>
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
