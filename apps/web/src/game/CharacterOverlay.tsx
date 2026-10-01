import { ITEM_CATALOG, POC_GAME_DATA } from "@emberheir/content";
import {
  ATTRIBUTES,
  type Attribute,
  type Attributes,
  type GameState,
  INVENTORY_SIZE,
  SLOT_NAMES,
  deriveStats,
  describeItem,
  equipBlockReason,
  heroSetup,
  itemSize,
  itemSlotFor,
  salvageValue,
  unequipBlockReason,
  usedCells,
} from "@emberheir/sim";
import { useState } from "react";
import { ItemCard } from "../items/ItemCard";
import { EQUIP_BLOCK_TEXT, UNEQUIP_BLOCK_TEXT } from "./labels";
import type { GameApi } from "./useGame";

const ATTRIBUTE_INFO: Record<Attribute, { name: string; effects: string }> = {
  strength: { name: "Strength", effects: "Physical Damage, Armor" },
  dexterity: { name: "Dexterity", effects: "Crit Chance, Trigger Chance" },
  agility: { name: "Agility", effects: "Attack Speed, Evasion" },
  intelligence: { name: "Intelligence", effects: "Elemental Damage, All Resistance" },
  wisdom: { name: "Wisdom", effects: "Heat Gain, Ailment Duration" },
  vitality: { name: "Vitality", effects: "Life, Tenacity" },
};

const ZERO: Record<Attribute, number> = {
  strength: 0,
  dexterity: 0,
  agility: 0,
  intelligence: 0,
  wisdom: 0,
  vitality: 0,
};

const pct = (v: number) => `${(v * 100).toFixed(1)} %`;

/** Character: equipment, attributes (pending → Confirm / Undo), stats and the inventory grid. */
export function CharacterOverlay(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const [pending, setPending] = useState<Record<Attribute, number>>(ZERO);
  const [selected, setSelected] = useState<string | null>(null);
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
  const { setup, gear } = heroSetup(preview, POC_GAME_DATA);
  const stats = deriveStats(setup);
  const selectedItem = state.inventory.find((p) => p.item.id === selected)?.item;
  const equipReason = selectedItem
    ? equipBlockReason(state, POC_GAME_DATA, selectedItem, "inventory")
    : undefined;

  const confirm = () => {
    game.dispatch({ type: "allocateAttributes", points: pending });
    setPending(ZERO);
  };

  return (
    <div className="overlay" role="dialog" aria-label="Character">
      <div className="overlay-panel panel character">
        <header className="overlay-header">
          <h2>Character · Level {state.hero.level}</h2>
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </header>
        <div className="character-columns">
          <section aria-label="Equipment">
            <h3>Equipment</h3>
            <ul className="equipment-list">
              {POC_GAME_DATA.equipmentSlots.map((slot) => {
                const item = state.hero.equipment[slot];
                const reason = unequipBlockReason(state, POC_GAME_DATA, slot);
                const inactive = gear.inactive.find((i) => i.slot === slot)?.reason;
                return (
                  <li key={slot}>
                    <span className="slot-label">{SLOT_NAMES[itemSlotFor(slot)]}</span>
                    {item ? (
                      <>
                        <ItemCard
                          tooltip={describeItem(item, ITEM_CATALOG, state.hero.attributes)}
                          inactive={inactive}
                        />
                        <button
                          type="button"
                          disabled={reason !== undefined}
                          title={reason ? UNEQUIP_BLOCK_TEXT[reason] : undefined}
                          onClick={() => game.dispatch({ type: "unequip", slot })}
                        >
                          Unequip
                        </button>
                      </>
                    ) : (
                      <span className="empty-slot">Empty</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Attributes">
            <h3>Attributes</h3>
            <p className="points" data-testid="attribute-points">
              {left} Attribute Points
            </p>
            <ul className="attributes">
              {ATTRIBUTES.map((a) => (
                <li key={a}>
                  <span className="attr-name">{ATTRIBUTE_INFO[a].name}</span>
                  <span className="attr-value">
                    {state.hero.attributes[a] + pending[a]}
                    {pending[a] > 0 && <em> (+{pending[a]})</em>}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add ${ATTRIBUTE_INFO[a].name}`}
                    disabled={left <= 0 || state.run?.phase === "fight"}
                    onClick={() => setPending((p) => ({ ...p, [a]: p[a] + 1 }))}
                  >
                    +
                  </button>
                  <span className="attr-effects">{ATTRIBUTE_INFO[a].effects}</span>
                </li>
              ))}
            </ul>
            <div className="attr-buttons">
              <button type="button" className="primary" disabled={spent === 0} onClick={confirm}>
                Confirm
              </button>
              <button type="button" disabled={spent === 0} onClick={() => setPending(ZERO)}>
                Undo
              </button>
            </div>
            <dl className="stats">
              <dt>Life</dt>
              <dd>{stats.maxLife}</dd>
              <dt>Weapon</dt>
              <dd>
                {setup.weapon.name} {Math.round(setup.weapon.damage.min)}–
                {Math.round(setup.weapon.damage.max)}
              </dd>
              <dt>Attack Speed</dt>
              <dd>{stats.attackSpeed.toFixed(2)}/s</dd>
              <dt>Physical Damage</dt>
              <dd>+{pct(stats.physicalDamage)}</dd>
              <dt>Elemental Damage</dt>
              <dd>+{pct(stats.elementalDamage)}</dd>
              <dt>Crit Chance</dt>
              <dd>{pct(stats.critChance)}</dd>
              <dt>Armor</dt>
              <dd>{Math.round(stats.armor)}</dd>
              <dt>Evasion</dt>
              <dd>{pct(stats.evasion)}</dd>
              <dt>Resistance</dt>
              <dd>{pct(stats.resistance)}</dd>
              <dt>Heat Gain</dt>
              <dd>+{pct(stats.heatGain)}</dd>
              <dt>Rotation</dt>
              <dd>
                {setup.rotation.map((r) => `${r.skill.name} (Lv ${r.level ?? 1})`).join(", ")}
              </dd>
            </dl>
          </section>

          <section aria-label="Inventory">
            <h3>
              Inventory{" "}
              <small>
                {usedCells(state.inventory, ITEM_CATALOG)} / {INVENTORY_SIZE.w * INVENTORY_SIZE.h}
              </small>
            </h3>
            <div
              className="inventory-grid"
              style={{
                gridTemplateColumns: `repeat(${INVENTORY_SIZE.w}, var(--cell))`,
                gridTemplateRows: `repeat(${INVENTORY_SIZE.h}, var(--cell))`,
              }}
            >
              {state.inventory.map((p) => {
                const size = itemSize(p.item, ITEM_CATALOG);
                return (
                  <button
                    key={p.item.id}
                    type="button"
                    className={`inv-item rarity-${p.item.rarity}${selected === p.item.id ? " selected" : ""}`}
                    style={{
                      gridColumn: `${p.x + 1} / span ${size.w}`,
                      gridRow: `${p.y + 1} / span ${size.h}`,
                    }}
                    title={p.item.name}
                    onClick={() => setSelected(p.item.id)}
                  >
                    {p.item.name}
                  </button>
                );
              })}
            </div>
            {selectedItem ? (
              <div className="inv-detail">
                <ItemCard
                  tooltip={describeItem(selectedItem, ITEM_CATALOG, state.hero.attributes)}
                />
                <div className="loot-buttons">
                  <button
                    type="button"
                    className="primary"
                    disabled={equipReason !== undefined}
                    title={equipReason ? EQUIP_BLOCK_TEXT[equipReason] : undefined}
                    onClick={() => {
                      game.dispatch({ type: "equip", itemId: selectedItem.id });
                      setSelected(null);
                    }}
                  >
                    Equip
                  </button>
                  <button
                    type="button"
                    disabled={state.run?.phase === "fight"}
                    onClick={() => {
                      game.dispatch({ type: "salvage", itemId: selectedItem.id });
                      setSelected(null);
                    }}
                  >
                    Salvage (+{salvageValue(selectedItem)} Dust)
                  </button>
                  {equipReason && (
                    <span className="block-reason">{EQUIP_BLOCK_TEXT[equipReason]}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="hint">Select an item to equip or salvage it.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
