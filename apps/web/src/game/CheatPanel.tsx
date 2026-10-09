import { GAME_DATA } from "@emberheir/content";
import {
  CHEAT_MAX_LEVEL,
  type GameState,
  type Item,
  MASTERY,
  RARITIES,
  RARITY_NAMES,
  type Rarity,
  SLOT_NAMES,
  type WalletCurrency,
  actsInRun,
  getBase,
  heroWeaponRank,
  masteryPointsLeft,
  nextAct,
  weaponGrade,
} from "@emberheir/sim";
import { useState } from "react";
import { PREVIEW_PR } from "../storage";
import { Icon } from "../ui/Icon";
import type { GameApi } from "./useGame";

/**
 * Cheat Mode (Timo 2026-10-08): on in every PR preview and in local dev builds, elsewhere with
 * `?cheat` in the address. It edits the save directly, so testers reach any point of the game.
 */
export const CHEATS_ENABLED =
  PREVIEW_PR !== "" ||
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).has("cheat");

type Tab = "hero" | "currency" | "items" | "progress";
const TABS: { id: Tab; name: string }[] = [
  { id: "hero", name: "Hero" },
  { id: "currency", name: "Currency" },
  { id: "items", name: "Items" },
  { id: "progress", name: "Progress" },
];

const CURRENCIES: { key: WalletCurrency; name: string }[] = [
  { key: "gold", name: "Gold" },
  { key: "dust", name: "Dust" },
  { key: "reforgeStones", name: "Reforge Stones" },
  { key: "ascensionShards", name: "Ascension Shards" },
  { key: "harvesterEmber", name: "Harvester's Ember" },
  { key: "kindling", name: "Kindling" },
];

/** A number that is set on Enter, on blur or with the button. */
function NumberRow(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  quick?: readonly number[];
  onSet: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(props.value);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (Number.isFinite(n) && n !== props.value) props.onSet(n);
  };
  return (
    <label className="cheat-row">
      <span className="cheat-label">{props.label}</span>
      <input
        type="number"
        className="cheat-input mono"
        aria-label={props.label}
        value={shown}
        min={props.min ?? 0}
        max={props.max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          // Typing must not trigger the game's hotkeys (C, T); Esc and F8 still close the panel.
          if (e.key !== "Escape" && e.key !== "F8") e.stopPropagation();
        }}
      />
      {props.quick?.map((q) => (
        <button
          key={q}
          type="button"
          className="btn small"
          onClick={() => {
            setDraft(null);
            props.onSet(Math.max(props.min ?? 0, props.value + q));
          }}
        >
          {q > 0 ? `+${q.toLocaleString("en-US")}` : q.toLocaleString("en-US")}
        </button>
      ))}
    </label>
  );
}

function Segmented<T extends string | number>(props: {
  label: string;
  options: readonly { value: T; name: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented cheat-segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={props.value === o.value ? "on" : ""}
          onClick={() => props.onChange(o.value)}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

const RARITY_OPTIONS = RARITIES.map((r) => ({ value: r, name: RARITY_NAMES[r] }));

function HeroTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const rank = heroWeaponRank(state);
  // Ranks this run allows (level-v2.md: the Rank is capped per run).
  const cap = MASTERY.rankCaps[Math.min(state.legacy.prestige, MASTERY.rankCaps.length - 1)] ?? 0;
  const ranks = MASTERY.rankLevels
    .map((level, r) => ({ value: r, name: String(r), level }))
    .filter((r) => r.value <= cap);
  return (
    <div className="cheat-grid">
      <section className="cheat-card">
        <span className="eyebrow">Level</span>
        <NumberRow
          label="Level"
          value={state.hero.level}
          min={1}
          max={CHEAT_MAX_LEVEL}
          quick={[1, 10, 20, 50, 100]}
          onSet={(level) => game.cheat({ kind: "level", level })}
        />
        <p className="sub small">Life and Weapon Damage follow the level.</p>
        <NumberRow
          label="Skill Points"
          value={state.hero.unspentSkillPoints}
          max={999}
          quick={[10, 50, 100]}
          onSet={(amount) => game.cheat({ kind: "skillPoints", amount })}
        />
        <p className="sub small">Unspent points. Waymarks and the Harvest give the real ones.</p>
      </section>
      <section className="cheat-card">
        <span className="eyebrow">
          Weapon Rank · {weaponGrade(rank)} {rank}
        </span>
        <div className="cheat-ranks" role="radiogroup" aria-label="Weapon Rank">
          {ranks.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={rank === r.value}
              className={`cheat-rank${rank === r.value ? " on" : ""}`}
              title={`Level ${r.level}`}
              onClick={() => game.cheat({ kind: "level", level: r.level })}
            >
              {r.name}
            </button>
          ))}
        </div>
        <p className="sub small">Sets the level of that Rank.</p>
      </section>
      <section className="cheat-card">
        <span className="eyebrow">Weapon Mastery · {masteryPointsLeft(state, GAME_DATA)} free</span>
        <NumberRow
          label="Bonus Mastery Points"
          value={state.hero.mastery.bonusPoints ?? 0}
          quick={[5, 20]}
          onSet={(amount) => game.cheat({ kind: "masteryPoints", amount })}
        />
        <p className="sub small">On top of the Weapon Rank. A respec keeps them.</p>
      </section>
      <section className="cheat-card">
        <span className="eyebrow">Camp</span>
        <NumberRow
          label="Flask Charges"
          value={state.flaskCharges}
          max={99}
          onSet={(amount) => game.cheat({ kind: "flasks", amount })}
        />
        <button
          type="button"
          className="btn"
          disabled={state.progress.trainerUnlocked && state.progress.runesmithUnlocked}
          onClick={() => game.cheat({ kind: "unlockCamp" })}
        >
          Kaelen and Eldrin join
        </button>
      </section>
    </div>
  );
}

function CurrencyTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const essences = GAME_DATA.acts.map((a) => a.essence);
  const runes = [...GAME_DATA.items.runes.values()];
  return (
    <div className="cheat-grid">
      <section className="cheat-card">
        <span className="eyebrow">Currencies</span>
        {CURRENCIES.map((c) => (
          <NumberRow
            key={c.key}
            label={c.name}
            value={state.wallet[c.key]}
            quick={c.key === "gold" || c.key === "dust" ? [1000, 10000] : [10, 100]}
            onSet={(amount) => game.cheat({ kind: "currency", currency: c.key, amount })}
          />
        ))}
      </section>
      <section className="cheat-card">
        <span className="eyebrow">Essences</span>
        {essences.map((e) => (
          <NumberRow
            key={e.id}
            label={e.name}
            value={state.wallet.essences[e.id] ?? 0}
            quick={[10]}
            onSet={(amount) => game.cheat({ kind: "essence", essenceId: e.id, amount })}
          />
        ))}
      </section>
      <section className="cheat-card cheat-wide">
        <span className="eyebrow">Runes</span>
        <div className="cheat-runes">
          {runes.map((r) => (
            <NumberRow
              key={r.id}
              label={r.name}
              value={state.wallet.runes[r.id] ?? 0}
              quick={[1]}
              onSet={(amount) => game.cheat({ kind: "rune", runeId: r.id, amount })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ItemsTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const bases = GAME_DATA.lootBases.map((id) => getBase(GAME_DATA.items, id));
  const uniques = [...GAME_DATA.items.uniques.values()];
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [uniqueId, setUniqueId] = useState("");
  const [rarity, setRarity] = useState<Rarity>("rare");
  const [itemLevel, setItemLevel] = useState(Math.max(1, state.hero.level));
  const [to, setTo] = useState<"inventory" | "stash">("inventory");
  const owned: { item: Item; where: string }[] = [
    ...Object.entries(state.hero.equipment).flatMap(([slot, item]) =>
      item ? [{ item, where: SLOT_NAMES[getBase(GAME_DATA.items, item.baseId).slot] ?? slot }] : [],
    ),
    ...state.inventory.map((p) => ({ item: p.item, where: "Inventory" })),
    ...state.stash.map((p) => ({ item: p.item, where: "Stash" })),
  ];
  return (
    <div className="cheat-grid">
      <section className="cheat-card">
        <span className="eyebrow">New item</span>
        <label className="cheat-row">
          <span className="cheat-label">Base</span>
          <select
            className="cheat-input"
            aria-label="Base"
            value={baseId}
            disabled={uniqueId !== ""}
            onChange={(e) => setBaseId(e.target.value)}
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {SLOT_NAMES[b.slot]} · {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cheat-row">
          <span className="cheat-label">Unique</span>
          <select
            className="cheat-input"
            aria-label="Unique"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
          >
            <option value="">None</option>
            {uniques.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        {uniqueId === "" && (
          <Segmented label="Rarity" options={RARITY_OPTIONS} value={rarity} onChange={setRarity} />
        )}
        <NumberRow
          label="Item Level"
          value={itemLevel}
          min={1}
          quick={[10]}
          onSet={(n) => setItemLevel(Math.max(1, Math.floor(n)))}
        />
        <Segmented
          label="Into"
          options={[
            { value: "inventory", name: "Inventory" },
            { value: "stash", name: "Stash" },
          ]}
          value={to}
          onChange={setTo}
        />
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            game.cheat({
              kind: "giveItem",
              baseId,
              rarity,
              itemLevel,
              to,
              ...(uniqueId ? { uniqueId } : {}),
            })
          }
        >
          Give item
        </button>
      </section>
      <section className="cheat-card">
        <span className="eyebrow">
          Change an item · {RARITY_NAMES[rarity]} · Level {itemLevel}
        </span>
        <p className="sub small">
          Rolls it anew on its base with the rarity and level on the left.
        </p>
        <div className="cheat-items">
          {owned.length === 0 && <span className="sub">No items yet.</span>}
          {owned.map(({ item, where }) => (
            <div key={item.id} className="cheat-item">
              <span className={`rarity-text rarity-${item.rarity} cheat-item-name`}>
                {item.name}
              </span>
              <span className="sub small">
                {where} · L{item.itemLevel}
              </span>
              <button
                type="button"
                className="btn small"
                disabled={item.uniqueId !== undefined}
                onClick={() =>
                  game.cheat({ kind: "rerollItem", itemId: item.id, rarity, itemLevel })
                }
              >
                Reroll
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressTab(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const inCamp = !state.run && !state.pendingPrestige;
  const acts = actsInRun(GAME_DATA, state.legacy.prestige);
  const next = nextAct(state, GAME_DATA);
  // Clearing the newest act opens the Prestige flow: close the panel so it shows.
  const clear = (all: boolean) => {
    game.cheat({ kind: "clearAct", all });
    props.onClose();
  };
  return (
    <div className="cheat-grid">
      <section className="cheat-card">
        <span className="eyebrow">
          Run {state.legacy.prestige + 1} · {acts.length} {acts.length === 1 ? "act" : "acts"}
        </span>
        <ul className="cheat-acts">
          {acts.map((a) => (
            <li key={a.id} className={state.progress.actsCleared.includes(a.id) ? "done" : ""}>
              {a.name}
            </li>
          ))}
        </ul>
        <button type="button" className="btn" disabled={!inCamp} onClick={() => clear(false)}>
          Clear {next.name}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!inCamp}
          onClick={() => clear(true)}
        >
          Clear the run · Prestige
        </button>
        {!inCamp && <p className="sub small">Only in the Camp.</p>}
      </section>
      <section className="cheat-card">
        <span className="eyebrow">Echoes</span>
        {GAME_DATA.echoes.map((e) => (
          <NumberRow
            key={e.id}
            label={e.name}
            value={state.legacy.echoes[e.id]?.stage ?? 0}
            max={MASTERY.maxEchoStage}
            quick={[1]}
            onSet={(stage) => game.cheat({ kind: "echo", echoId: e.id, stage })}
          />
        ))}
      </section>
    </div>
  );
}

export function CheatPanel(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("hero");
  const { state, game } = props;
  return (
    <div className="overlay" role="dialog" aria-label="Cheats">
      <div className="overlay-panel cheat-panel">
        <header className="overlay-header">
          <span className="title-font big">CHEATS</span>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`tab title-font ${tab === t.id ? "on" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="grow" />
          <button type="button" className="icon-button" aria-label="Close" onClick={props.onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="cheat-body">
          {tab === "hero" && <HeroTab state={state} game={game} />}
          {tab === "currency" && <CurrencyTab state={state} game={game} />}
          {tab === "items" && <ItemsTab state={state} game={game} />}
          {tab === "progress" && <ProgressTab state={state} game={game} onClose={props.onClose} />}
        </div>
      </div>
    </div>
  );
}
