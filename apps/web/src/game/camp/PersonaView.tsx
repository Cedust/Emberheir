import { ITEM_CATALOG, POC_GAME_DATA } from "@emberheir/content";
import {
  CRAFTING,
  type CraftCost,
  type CraftRequest,
  type GameState,
  type Item,
  PROGRESSION,
  RARITY_NAMES,
  SLOT_NAMES,
  affixRollRange,
  applyAction,
  craftBlockReason,
  craftCost,
  describeStat,
  describeTrigger,
  findCraftItem,
  itemSlotFor,
  resolveTrigger,
  salvageValue,
  statAffixValue,
  upgradedItem,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { ItemGrid, ItemTile, baseSummary, fmt, walletEntries } from "../../ui/items";
import { CRAFT_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";

export type PersonaId = "thoric" | "liora";
type ActionKind = "upgrade" | "socket" | "salvage" | "reforge" | "temper" | "imbue" | "distill";

interface PersonaDef {
  readonly name: string;
  readonly role: string;
  readonly initial: string;
  readonly portrait: string;
  readonly accent: string;
  readonly quote: string;
  readonly actions: readonly { k: ActionKind; name: string; desc: string; later?: boolean }[];
}

const PERSONAS: Record<PersonaId, PersonaDef> = {
  thoric: {
    name: "Thoric",
    role: "Blacksmith",
    initial: "T",
    portrait: "#5a3a24",
    accent: "#c9c2b8",
    quote: "Bring it here. If it's bent, I straighten it. If it's broken, I charge extra.",
    actions: [
      { k: "upgrade", name: "Upgrade", desc: "+1 Tier. Rolls keep their quality." },
      { k: "socket", name: "Add Socket", desc: "Sockets and runes come later.", later: true },
      { k: "salvage", name: "Salvage", desc: "Break an inventory item down into Dust." },
    ],
  },
  liora: {
    name: "Liora",
    role: "Mystic",
    initial: "L",
    portrait: "#3a2a5a",
    accent: "#b36bff",
    quote: "Affixes are like moods, dear. I can change one. I cannot change all of them twice.",
    actions: [
      { k: "reforge", name: "Reforge", desc: "Reroll all affixes. Removes the lock." },
      { k: "temper", name: "Temper", desc: "Reroll the value of one affix." },
      { k: "imbue", name: "Imbue", desc: "Replace one affix with an Essence." },
      { k: "distill", name: "Distill", desc: "Turn Salvage Dust into a Reforge Stone." },
    ],
  },
};

const ACTION_HINT: Record<ActionKind, string> = {
  upgrade: "Choose any item. Values grow with the Tier.",
  socket: "Not in this version.",
  salvage: "Choose an item from your inventory.",
  reforge: "Base, Tier and Rarity stay. All affixes are rolled anew.",
  temper: "Click the affix to reroll. It stays locked in afterwards.",
  imbue: "Click the affix to replace, then choose an Essence.",
  distill: "No item needed.",
};

function affixText(item: Item, index: number): { text: string; trigger: boolean } {
  const roll = item.affixes[index];
  const affix = roll ? ITEM_CATALOG.affixes.get(roll.affixId) : undefined;
  if (!roll || !affix) return { text: "?", trigger: false };
  if (affix.kind === "trigger") {
    return { text: describeTrigger(resolveTrigger(affix, item.tier, roll.quality)), trigger: true };
  }
  return {
    text: describeStat(affix.stat, statAffixValue(affix, item.tier, roll.quality)),
    trigger: false,
  };
}

function rangeText(item: Item, affixId: string): string {
  const affix = ITEM_CATALOG.affixes.get(affixId);
  const range = affixRollRange(item, affixId, ITEM_CATALOG);
  if (!affix || affix.kind !== "stat" || !range) return "?";
  const lo = describeStat(affix.stat, range.min);
  const hi = describeStat(affix.stat, range.max);
  // "+3% Crit Chance" and "+5% Crit Chance" → "+3–5% Crit Chance"
  const m1 = /^([+-]?[\d.,]+)(.*)$/.exec(lo);
  const m2 = /^([+-]?[\d.,]+)(.*)$/.exec(hi);
  if (m1 && m2 && m1[2] === m2[2]) {
    return m1[1] === m2[1] ? lo : `${m1[1]}–${(m2[1] ?? "").replace("+", "")}${m1[2]}`;
  }
  return `${lo} to ${hi}`;
}

function costText(cost: CraftCost): string {
  const parts: string[] = [];
  if (cost.gold) parts.push(`${fmt(cost.gold)} Gold`);
  if (cost.dust) parts.push(`${fmt(cost.dust)} Dust`);
  if (cost.reforgeStones) {
    parts.push(`${cost.reforgeStones} Reforge Stone${cost.reforgeStones > 1 ? "s" : ""}`);
  }
  if (cost.ascensionShards) {
    parts.push(`${cost.ascensionShards} Ascension Shard${cost.ascensionShards > 1 ? "s" : ""}`);
  }
  for (const [id, n] of Object.entries(cost.essences)) {
    const name = POC_GAME_DATA.acts.find((a) => a.essence.id === id)?.essence.name ?? id;
    parts.push(`${n} ${name}`);
  }
  return parts.join(" · ") || "Free";
}

function ItemHead(props: { item: Item; label: string; dashed?: boolean; tier?: number }) {
  const { item } = props;
  return (
    <>
      <span className="eyebrow">{props.label}</span>
      <span className="title-font craft-item-name rarity-text">{item.name}</span>
      <span className="rarity-text small strong">
        {RARITY_NAMES[item.rarity].toUpperCase()} · T{props.tier ?? item.tier}
      </span>
      <span className="sub">{baseSummary(item)}</span>
      <div className="item-detail-rule" />
    </>
  );
}

/**
 * Thoric (Blacksmith) and Liora (Mystic) in one view (Persona mock): actions on the left,
 * Now → After in the middle with the cost bar, equipped items and inventory on the right.
 * There is no Undo.
 */
export function PersonaView(props: {
  state: GameState;
  game: GameApi;
  persona: PersonaId;
  onPersona: (p: PersonaId) => void;
  onClose: () => void;
}) {
  const { state, game } = props;
  const def = PERSONAS[props.persona];
  const [kinds, setKinds] = useState<Record<PersonaId, ActionKind>>({
    thoric: "upgrade",
    liora: "reforge",
  });
  const kind = kinds[props.persona];
  const [itemId, setItemId] = useState<string | null>(
    () => state.hero.equipment.mainHand?.id ?? null,
  );
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const essenceId = POC_GAME_DATA.acts[0]?.essence.id ?? "";
  const [last, setLast] = useState<string | null>(null);

  const found = itemId ? findCraftItem(state, itemId) : undefined;
  const item = found?.item;
  const equipped = !!found?.slot;

  const pickItem = (id: string) => {
    setItemId(id);
    setAffixIndex(null);
  };
  const pickKind = (k: ActionKind) => {
    setKinds((prev) => ({ ...prev, [props.persona]: k }));
    setAffixIndex(item?.lockedAffix ?? null);
  };

  // --- what the action would do ------------------------------------------------------------
  let request: CraftRequest | null = null;
  if (kind === "distill") request = { kind: "distill" };
  else if (item && (kind === "upgrade" || kind === "reforge")) request = { kind, itemId: item.id };
  else if (item && kind === "temper" && affixIndex !== null) {
    request = { kind, itemId: item.id, affixIndex };
  } else if (item && kind === "imbue" && affixIndex !== null) {
    request = { kind, itemId: item.id, affixIndex, essenceId };
  }

  let cost = "";
  let block: string | null = null;
  if (kind === "socket") {
    block = "Sockets come in a later version.";
  } else if (kind === "salvage") {
    cost = item ? `Free · +${salvageValue(item)} Dust` : "Free";
    block = !item
      ? "Choose an item"
      : equipped
        ? "Only from the inventory. Unequip it first."
        : null;
  } else if (!request) {
    cost = costText(craftCost({ kind: "reforge", itemId: "" }));
    if (kind === "temper")
      cost = costText(craftCost({ kind: "temper", itemId: "", affixIndex: 0 }));
    if (kind === "imbue") {
      cost = costText(craftCost({ kind: "imbue", itemId: "", affixIndex: 0, essenceId }));
    }
    block = !item ? "Choose an item" : "Choose an affix";
  } else {
    cost = costText(craftCost(request, item));
    const reason = craftBlockReason(state, POC_GAME_DATA, request);
    block = reason ? CRAFT_BLOCK_TEXT[reason] : null;
  }
  // Locked-out affixes and triggers say so even before an affix is picked.
  if (item && (kind === "temper" || kind === "imbue") && item.affixes.length === 0) {
    block = CRAFT_BLOCK_TEXT.noAffixes;
  }

  const run = () => {
    if (block) return;
    if (kind === "salvage" && item) {
      setLast(`Salvaged ${item.name}: +${salvageValue(item)} Dust`);
      game.dispatch({ type: "salvage", itemId: item.id });
      setItemId(null);
      return;
    }
    if (!request) return;
    // The sim is deterministic, so this preview is exactly what the dispatch will do.
    let after: GameState;
    try {
      after = applyAction(state, POC_GAME_DATA, { type: "craft", request });
    } catch {
      game.dispatch({ type: "craft", request });
      return;
    }
    const next =
      request.kind === "distill" ? undefined : findCraftItem(after, request.itemId)?.item;
    switch (request.kind) {
      case "distill":
        setLast(`Distilled 1 Reforge Stone (${after.wallet.reforgeStones} now)`);
        break;
      case "upgrade":
        setLast(`${next?.name ?? "Item"} is now Tier ${next?.tier ?? "?"}`);
        break;
      case "reforge":
        setLast(`Reforged into ${next?.name ?? "?"}`);
        break;
      case "temper":
      case "imbue":
        if (item && next) {
          setLast(
            `${affixText(item, request.affixIndex).text} → ${affixText(next, request.affixIndex).text}`,
          );
        }
        break;
    }
    game.dispatch({ type: "craft", request });
  };

  const liora = state.progress.trainerUnlocked;
  const actionName = def.actions.find((a) => a.k === kind)?.name ?? "";
  const after = item && kind !== "distill" && kind !== "socket" ? item : undefined;
  const essence = POC_GAME_DATA.acts[0]?.essence;
  const essenceHave = essence ? (state.wallet.essences[essence.id] ?? 0) : 0;

  return (
    <section className="screen persona-view" aria-label={`${def.name}, ${def.role}`}>
      <header className="persona-header bar-top">
        <span className="title-font eyebrow-big">
          CAMP · {POC_GAME_DATA.acts[0]?.name.toUpperCase()}
        </span>
        <div className="tabs" role="tablist">
          {(["thoric", "liora"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={props.persona === p}
              className={`tab title-font ${props.persona === p ? "on" : ""}`}
              disabled={p === "liora" && !liora}
              title={p === "liora" && !liora ? "Liora joins after the act boss falls" : undefined}
              onClick={() => props.onPersona(p)}
            >
              {PERSONAS[p].name} · {PERSONAS[p].role}
            </button>
          ))}
        </div>
        <div className="grow" />
        <div className="wallet-row small-wallet">
          {walletEntries(state).map((w) => (
            <span key={w.key} className={`w-${w.key}`}>
              <b className="mono">{fmt(w.value)}</b> <span className="sub">{w.name}</span>
            </span>
          ))}
        </div>
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

      <div className="persona-body">
        <aside className="persona-left">
          <div className="persona-head">
            <div
              className="persona-portrait big title-font"
              style={{ background: def.portrait, borderColor: def.accent }}
            >
              {def.initial}
            </div>
            <div className="plaque-names">
              <span className="title-font huge">{def.name}</span>
              <span className="sub">{def.role}</span>
            </div>
          </div>
          <blockquote className="persona-quote" style={{ borderColor: def.accent }}>
            &ldquo;{def.quote}&rdquo;
          </blockquote>
          <div className="persona-actions">
            {def.actions.map((a) => (
              <button
                key={a.k}
                type="button"
                className={`persona-action ${kind === a.k ? "on" : ""} ${a.later ? "later" : ""}`}
                aria-pressed={kind === a.k}
                onClick={() => pickKind(a.k)}
              >
                <span className="title-font">{a.name}</span>
                <span className="sub">{a.desc}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="persona-center">
          <div className="center-head">
            <span className="title-font huge">{actionName}</span>
            <span className="sub">{ACTION_HINT[kind]}</span>
          </div>

          {kind === "distill" ? (
            <div className="distill panel-card">
              <div className="distill-side">
                <span className="mono huge">{CRAFTING.distillDust}</span>
                <span className="sub">Salvage Dust</span>
              </div>
              <span className="arrow">→</span>
              <div className="distill-side">
                <span className="mono huge epic-text">1</span>
                <span className="sub">Reforge Stone</span>
              </div>
            </div>
          ) : item ? (
            <div className="now-after">
              <div
                className={`craft-card panel-card rarity-${item.rarity}`}
                data-testid="craft-now"
              >
                <ItemHead item={item} label={`NOW · ${equipped ? "EQUIPPED" : "INVENTORY"}`} />
                {item.affixes.length === 0 && <span className="sub">No affixes</span>}
                {item.affixes.map((_, i) => {
                  const t = affixText(item, i);
                  const pickable = kind === "temper" || kind === "imbue";
                  const lockedOut = item.lockedAffix !== undefined && item.lockedAffix !== i;
                  const disabled = !pickable || lockedOut || t.trigger;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`affix-line ${t.trigger ? "trigger" : ""} ${affixIndex === i && pickable ? "on" : ""}`}
                      disabled={disabled}
                      title={
                        t.trigger && pickable
                          ? "Trigger Affixes cannot be changed"
                          : lockedOut && pickable
                            ? "Locked: only the locked-in affix can change"
                            : undefined
                      }
                      onClick={() => setAffixIndex(i)}
                    >
                      <span className="grow">{t.text}</span>
                      {lockedOut && <Icon name="lock" size={14} />}
                      {item.lockedAffix === i && <span className="locked-in">LOCKED IN</span>}
                    </button>
                  );
                })}
              </div>
              <div className="arrow">→</div>
              <AfterCard
                item={after}
                kind={kind}
                affixIndex={affixIndex}
                essenceAffix={essence?.affixId}
              />
            </div>
          ) : (
            <div className="empty-pick panel-card sub">Choose an item on the right.</div>
          )}

          {kind === "imbue" && essence && (
            <div className="essence-row">
              <span className="strong">New affix:</span>
              <span className={`essence-chip on ${essenceHave > 0 ? "" : "empty"}`}>
                {essence.name}: {item ? rangeText(item, essence.affixId) : "?"} · have {essenceHave}
              </span>
            </div>
          )}

          <div className="grow" />
          {last && (
            <div className="craft-last panel-card" role="status">
              {last}
            </div>
          )}
          <div className="cost-bar panel-card">
            <div className="cost-text">
              <span className="eyebrow">COST</span>
              <span className="mono strong">{cost}</span>
              <span className={block ? "block warn" : "block ok"}>
                {block ?? "Ready. There is no Undo."}
              </span>
            </div>
            <button type="button" className="btn big primary" disabled={!!block} onClick={run}>
              {actionName}
            </button>
          </div>
        </main>

        <aside className="persona-right">
          <span className="title-font section-title">Equipped</span>
          <div className="equipped-row">
            {POC_GAME_DATA.equipmentSlots.map((slot) => {
              const it = state.hero.equipment[slot];
              return (
                <ItemTile
                  key={slot}
                  item={it}
                  label={SLOT_NAMES[itemSlotFor(slot)]}
                  size={68}
                  selected={!!it && it.id === itemId}
                  {...(it ? { onSelect: () => pickItem(it.id) } : {})}
                />
              );
            })}
          </div>
          <div className="section-row">
            <span className="title-font section-title">Inventory</span>
            <span className="mono sub">{state.inventory.length} items</span>
          </div>
          <ItemGrid
            placed={state.inventory}
            size={{ w: PROGRESSION.inventoryWidth, h: PROGRESSION.inventoryHeight }}
            cell={38}
            selected={itemId}
            onSelect={pickItem}
            label="Inventory"
          />
          <p className="sub small">
            Stash items are not at the forge. Move them to the inventory at the Supply Wagon.
          </p>
        </aside>
      </div>
    </section>
  );
}

function AfterCard(props: {
  item: Item | undefined;
  kind: ActionKind;
  affixIndex: number | null;
  essenceAffix: string | undefined;
}) {
  const { item, kind } = props;
  if (!item) return <div className="craft-card panel-card dashed" />;
  if (kind === "salvage") {
    return (
      <div className="craft-card panel-card dashed">
        <span className="eyebrow">AFTER</span>
        <span className="title-font craft-item-name">Salvage Dust</span>
        <span className="sub">The item is gone for good.</span>
        <div className="item-detail-rule" />
        <span className="after-line new">+{salvageValue(item)} Salvage Dust</span>
      </div>
    );
  }
  if (kind === "upgrade") {
    const up = upgradedItem(item);
    return (
      <div className={`craft-card panel-card dashed rarity-${item.rarity}`}>
        <ItemHead item={up} label="AFTER" />
        {item.affixes.map((_, i) => {
          const before = affixText(item, i).text;
          const now = affixText(up, i).text;
          return (
            <span key={i} className={`after-line ${before !== now ? "new" : ""}`}>
              {now}
            </span>
          );
        })}
      </div>
    );
  }
  if (kind === "reforge") {
    return (
      <div className={`craft-card panel-card dashed rarity-${item.rarity}`}>
        <ItemHead item={{ ...item, name: "New name" }} label="AFTER" />
        {item.affixes.map((_, i) => (
          <span key={i} className="after-line new">
            ? new random affix
          </span>
        ))}
        <span className="sub small">No lock afterwards.</span>
      </div>
    );
  }
  // Temper and Imbue: only the chosen affix changes.
  return (
    <div className={`craft-card panel-card dashed rarity-${item.rarity}`}>
      <ItemHead item={item} label="AFTER" />
      {item.affixes.map((roll, i) => {
        if (i !== props.affixIndex) {
          return (
            <span key={i} className="after-line">
              {affixText(item, i).text}
            </span>
          );
        }
        const affixId = kind === "imbue" ? (props.essenceAffix ?? roll.affixId) : roll.affixId;
        return (
          <span key={i} className="after-line new">
            {rangeText(item, affixId)} <span className="locked-in">LOCKED IN</span>
          </span>
        );
      })}
    </div>
  );
}
