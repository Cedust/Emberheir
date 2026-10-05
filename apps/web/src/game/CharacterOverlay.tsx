import { GAME_DATA } from "@emberheir/content";
import {
  ATTRIBUTES,
  type Attribute,
  type Attributes,
  type EquipmentSlot,
  type GameState,
  type Item,
  PROGRESSION,
  SLOT_NAMES,
  deriveStats,
  equipBlockReason,
  estimateDps,
  formatPercent,
  heatPerSecond,
  heroSetup,
  itemSlotFor,
  salvageValue,
  speedValue,
  unequipBlockReason,
  levelCap,
  xpToNextLevel,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import {
  ItemDetail,
  ItemGrid,
  ItemTile,
  compareWithEquipped,
  fmt,
  walletEntries,
} from "../ui/items";
import { EQUIP_BLOCK_TEXT, UNEQUIP_BLOCK_TEXT } from "./labels";
import type { GameApi } from "./useGame";
import { Paperdoll, dollBox } from "../ui/Paperdoll";

const ATTRIBUTE_INFO: Record<Attribute, { name: string; effects: string }> = {
  strength: { name: "Strength", effects: "Physical Damage · Armor" },
  dexterity: { name: "Dexterity", effects: "Crit Chance · Trigger Chance" },
  agility: { name: "Agility", effects: "Attack Speed · Evasion" },
  intelligence: { name: "Intelligence", effects: "Elemental Damage · All Resistance" },
  wisdom: { name: "Wisdom", effects: "Heat Gain · Ailment Duration" },
  vitality: { name: "Vitality", effects: "Life · Tenacity" },
};

const ZERO: Record<Attribute, number> = {
  strength: 0,
  dexterity: 0,
  agility: 0,
  intelligence: 0,
  wisdom: 0,
  vitality: 0,
};

const TABS = ["Offense", "Defense", "Heat"] as const;
type Tab = (typeof TABS)[number];

const pct = (v: number) => `${formatPercent(v)} %`;
const HEAT_TEXT = { cooling: "Cooling", steady: "Steady", warming: "Warming" };

/**
 * Character (Character mock): paperdoll, attributes with pending points (Confirm / Undo),
 * stats in tabs, the inventory grid and the item detail with compare. During a fight it is
 * view only.
 */
export function CharacterOverlay(props: {
  state: GameState;
  game: GameApi;
  inFight: boolean;
  onClose: () => void;
}) {
  const { state, game, inFight } = props;
  const [pending, setPending] = useState<Record<Attribute, number>>(ZERO);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Offense");
  const spent = ATTRIBUTES.reduce((n, a) => n + pending[a], 0);
  const left = state.hero.unspentAttributePoints - spent;

  // Preview: stats as they would be after Confirm.
  const preview: GameState = {
    ...state,
    hero: {
      ...state.hero,
      attributes: Object.fromEntries(
        ATTRIBUTES.map((a) => [a, state.hero.attributes[a] + pending[a]]),
      ) as unknown as Attributes,
    },
  };
  const { setup, gear } = heroSetup(preview, GAME_DATA);
  const stats = deriveStats(setup);
  const dps = estimateDps(setup, stats);

  const equippedEntry = Object.entries(state.hero.equipment).find(([, it]) => it?.id === selected);
  const equippedSlot = equippedEntry?.[0] as EquipmentSlot | undefined;
  const invItem = state.inventory.find((p) => p.item.id === selected)?.item;
  const sel: Item | undefined = equippedEntry?.[1] ?? invItem;

  const confirm = () => {
    game.dispatch({ type: "allocateAttributes", points: pending });
    setPending(ZERO);
  };

  const cap = levelCap(state.legacy.prestige);
  const next = xpToNextLevel(state.hero.level, cap);
  const xpText = Number.isFinite(next)
    ? `${Math.floor((state.hero.xp / next) * 100)}% to Lv ${state.hero.level + 1} · Cap ${cap}`
    : `Level cap ${cap} reached`;

  const rows: Record<Tab, { label: string; value: string }[]> = {
    Offense: [
      { label: "Damage per second (estimate)", value: fmt(dps) },
      {
        label: `${setup.weapon.name} damage`,
        value: `${Math.round(setup.weapon.damage.min)}–${Math.round(setup.weapon.damage.max)}`,
      },
      {
        label: "Speed (Attack Speed)",
        value: String(speedValue(stats.attackSpeed)),
      },
      { label: "Physical Damage", value: `+${pct(stats.physicalDamage)}` },
      { label: "Elemental Damage", value: `+${pct(stats.elementalDamage)}` },
      { label: "Crit Chance", value: pct(stats.critChance) },
      { label: "Crit Damage", value: "150 %" },
      { label: "Trigger Chance", value: `+${pct(stats.triggerChance)}` },
    ],
    Defense: [
      { label: "Life", value: fmt(stats.maxLife) },
      { label: "Armor", value: fmt(stats.armor) },
      { label: "Evasion", value: pct(stats.evasion) },
      { label: "Block", value: pct(stats.blockChance) },
      { label: "Fire Resistance", value: pct(stats.fireResistance) },
      { label: "Cold Resistance", value: pct(stats.coldResistance) },
      { label: "Lightning Resistance", value: pct(stats.lightningResistance) },
      { label: "Void Resistance", value: pct(stats.voidResistance) },
      { label: "Tenacity", value: pct(stats.tenacity) },
      { label: "Lifesteal", value: pct(stats.lifesteal) },
    ],
    Heat: [
      { label: "Heat behavior", value: HEAT_TEXT[setup.weapon.heatBehavior] },
      { label: "Heat per second (estimate)", value: heatPerSecond(setup, stats).toFixed(1) },
      { label: "Heat Gain", value: `+${pct(stats.heatGain)}` },
      { label: "Starting Heat", value: fmt(stats.startingHeat) },
      { label: "Ailment Duration", value: `+${pct(stats.ailmentDuration)}` },
      {
        label: "Battle Plan",
        value: setup.rotation.map((r) => `${r.skill.name} ${r.level ?? 1}`).join(" · "),
      },
    ],
  };

  let footer = null;
  if (sel && invItem) {
    const reason = equipBlockReason(state, GAME_DATA, invItem, "inventory");
    footer = (
      <div className="detail-buttons">
        <button
          type="button"
          className="btn primary"
          disabled={reason !== undefined}
          title={reason ? EQUIP_BLOCK_TEXT[reason] : undefined}
          onClick={() => {
            game.dispatch({ type: "equip", itemId: invItem.id });
            setSelected(null);
          }}
        >
          Equip
        </button>
        <button
          type="button"
          className="btn"
          disabled={inFight}
          onClick={() => {
            game.dispatch({ type: "salvage", itemId: invItem.id });
            setSelected(null);
          }}
        >
          Salvage · +{salvageValue(invItem)} Dust
        </button>
        {inFight ? (
          <span className="block warn">Between stages only</span>
        ) : (
          reason && <span className="block warn">{EQUIP_BLOCK_TEXT[reason]}</span>
        )}
      </div>
    );
  } else if (sel && equippedSlot) {
    const reason = unequipBlockReason(state, GAME_DATA, equippedSlot);
    const inactive = gear.inactive.find((i) => i.slot === equippedSlot);
    footer = (
      <div className="detail-buttons">
        {inactive && <span className="block warn">Inactive: requirements not met</span>}
        <button
          type="button"
          className="btn"
          disabled={reason !== undefined}
          title={reason ? UNEQUIP_BLOCK_TEXT[reason] : undefined}
          onClick={() => game.dispatch({ type: "unequip", slot: equippedSlot })}
        >
          Unequip
        </button>
        {reason && reason !== "empty" && (
          <span className="block warn">{UNEQUIP_BLOCK_TEXT[reason]}</span>
        )}
      </div>
    );
  }

  return (
    <div className="overlay" role="dialog" aria-label="Character">
      <div className="overlay-panel character">
        <header className="overlay-header">
          <div className="run-title">
            <span className="title-font big">CHARACTER</span>
            <span className="sub">Heir of the Ember · Level {state.hero.level}</span>
          </div>
          <div className="xp-bar" title={xpText}>
            <div
              className="fill"
              style={{
                width: `${Number.isFinite(next) ? Math.min(100, (state.hero.xp / next) * 100) : 100}%`,
              }}
            />
          </div>
          <span className="sub">{xpText}</span>
          <div className="grow" />
          {inFight && <span className="view-only title-font">FIGHT PAUSED · VIEW ONLY</span>}
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            title="Close (C or Esc)"
            onClick={props.onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="character-columns">
          <section className="doll-column" aria-label="Equipment">
            <span className="title-font section-title">Equipment</span>
            <Paperdoll>
              {GAME_DATA.equipmentSlots.map((slot) => {
                const pos = dollBox(slot);
                const it = state.hero.equipment[slot];
                const inactive = gear.inactive.some((i) => i.slot === slot);
                return (
                  <div key={slot} className="doll-slot" style={{ left: pos.x, top: pos.y }}>
                    <ItemTile
                      item={it}
                      label={SLOT_NAMES[itemSlotFor(slot)]}
                      width={pos.w}
                      height={pos.h}
                      selected={!!it && it.id === selected}
                      inactive={inactive}
                      {...(it ? { onSelect: () => setSelected(it.id) } : {})}
                    />
                  </div>
                );
              })}
            </Paperdoll>
          </section>

          <section className="attr-column" aria-label="Attributes">
            <div className="section-row">
              <span className="title-font section-title">Attributes</span>
              <span className={`points ${left > 0 ? "has" : ""}`} data-testid="attribute-points">
                {left} Attribute Points
              </span>
            </div>
            <ul className="attributes">
              {ATTRIBUTES.map((a) => (
                <li key={a}>
                  <div className="attr-text">
                    <span className="attr-name title-font">{ATTRIBUTE_INFO[a].name}</span>
                    <span className="sub small">{ATTRIBUTE_INFO[a].effects}</span>
                  </div>
                  <span className="attr-value mono">
                    {state.hero.attributes[a] + pending[a]}
                    {pending[a] > 0 && <em className="added"> +{pending[a]}</em>}
                  </span>
                  {!inFight && (
                    <button
                      type="button"
                      className="plus"
                      aria-label={`Add ${ATTRIBUTE_INFO[a].name}`}
                      disabled={left <= 0}
                      onClick={() => setPending((p) => ({ ...p, [a]: p[a] + 1 }))}
                    >
                      +
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {!inFight && (
              <div className="attr-buttons">
                <button
                  type="button"
                  className="btn primary"
                  disabled={spent === 0}
                  onClick={confirm}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={spent === 0}
                  onClick={() => setPending(ZERO)}
                >
                  Undo
                </button>
              </div>
            )}
            <div className="tabs small-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`tab title-font ${tab === t ? "on" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <dl className="stat-rows">
              {rows[tab].map((r) => (
                <div key={r.label} className="stat-row">
                  <dt>{r.label}</dt>
                  <dd className="mono">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="inv-column" aria-label="Inventory">
            <div className="section-row">
              <span className="title-font section-title">Inventory</span>
              <span className="mono sub">{state.inventory.length} items</span>
            </div>
            <ItemGrid
              placed={state.inventory}
              size={{ w: PROGRESSION.inventoryWidth, h: PROGRESSION.inventoryHeight }}
              cell={44}
              selected={selected}
              onSelect={(id) => setSelected(id)}
              label="Inventory grid"
            />
            {sel ? (
              <ItemDetail
                item={sel}
                heroAttributes={state.hero.attributes}
                where={equippedSlot ? "EQUIPPED" : "INVENTORY"}
                compare={invItem ? compareWithEquipped(state, invItem) : undefined}
                footer={footer}
                className="character-detail"
              />
            ) : (
              <div className="empty-pick panel-card sub">
                Select an item to equip or salvage it.
              </div>
            )}
            <div className="wallet-row small-wallet">
              {walletEntries(state).map((w) => (
                <span key={w.key} className={`w-${w.key}`}>
                  <b className="mono">{fmt(w.value)}</b> <span className="sub">{w.name}</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
