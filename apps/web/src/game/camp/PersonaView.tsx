import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import {
  applyAction,
  craftBlockReason,
  craftCost,
  type CraftCost,
  type CraftRequest,
  findCraftItem,
  type GameState,
  type Item,
  type ItemSlot,
  itemSlotFor,
  kindleTargets,
  learnFromItem,
  nextAct,
  PROGRESSION,
  salvageValue,
  SLOT_NAMES,
} from "@emberheir/sim";
import { useRef, useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { ItemGrid, ItemTile, rarityClass } from "../../ui/items";
import { Button, HoldButton } from "../../ui/kit/Button";
import { Cost, type CurrencyId, Wallet } from "../../ui/kit/Currency";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { Medallion, Tabs, Window, WindowHeader, WindowLayer } from "../../ui/kit/Window";
import { dollBox, Paperdoll } from "../../ui/Paperdoll";
import { runeName, RuneStone } from "../../ui/RuneArt";
import { itemDrops } from "../itemDrops";
import { CRAFT_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { WeaponSlot } from "../WeaponSlot";
import { PaintDefs } from "./art/paint";
import { PersonaPortrait } from "./art/PersonaArt";
import { AfterCard, ItemHead, KindleParts, partName } from "./PersonaCards";
import {
  ACTION_HINT,
  type ActionKind,
  affixText,
  greaterName,
  PERSONA_ORDER,
  type PersonaId,
  personaPresent,
  PERSONAS,
  SIDE_DOLL,
} from "./personaDefs";
import { CruciblePanel } from "./CruciblePanel";
import { GamblePanel, RuneBoard, RunePouch, SocketRow } from "./RuneViews";
import { BENCH, Workbench } from "./Workbench";
import { WorkbenchFx } from "./WorkbenchFx";

/**
 * The Camp's crafters in one view (Persona mock): actions on the left,
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
    liora: "temper",
    nyssa: "socket",
    marisha: "gamble",
  });
  const [runeId, setRuneId] = useState<string | null>(null);
  const [slot, setSlot] = useState<ItemSlot | null>(null);
  const [gambled, setGambled] = useState<Item | null>(null);
  const kind = kinds[props.persona];
  const [itemId, setItemId] = useState<string | null>(
    () => state.hero.equipment.offHand?.id ?? state.hero.equipment.body?.id ?? null,
  );
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  // What the last craft did; shown in the cost bar until another item or service is picked.
  const [lastDone, setLastDone] = useState<{ persona: PersonaId; text: string } | null>(null);
  const setLast = (text: string) => setLastDone({ persona: props.persona, text });
  const shownLast = lastDone?.persona === props.persona ? lastDone.text : null;
  const [conditionId, setConditionId] = useState<string | null>(null);
  const [effectId, setEffectId] = useState<string | null>(null);
  // Each finished craft plays the crafter's effect on the bench.
  const [pulse, setPulse] = useState(0);
  const bench = useRef<HTMLDivElement>(null);
  const drops = itemDrops(state, game);

  const found = itemId ? findCraftItem(state, itemId) : undefined;
  const item = found?.item;
  const equipped = !!found?.slot;
  const targets = item ? kindleTargets(item, ITEM_CATALOG) : [];
  const kindleIndex =
    affixIndex !== null && targets.includes(affixIndex)
      ? affixIndex
      : targets.length === 1
        ? targets[0]
        : null;
  const learned = item ? learnFromItem(state.legacy.codex, item, ITEM_CATALOG).learned : [];
  // Ember Crucible: a Legendary or Unique teaches its Power (neuausrichtung-v1.md 8).
  const power = item?.powerId ? ITEM_CATALOG.powers.get(item.powerId) : undefined;
  const teaches =
    power && item && (state.powerCodex?.[power.id] ?? 0) < item.tier
      ? { name: power.name, tier: item.tier }
      : undefined;

  const pickItem = (id: string) => {
    setItemId(id);
    setAffixIndex(null);
    setLastDone(null);
  };
  const pickKind = (k: ActionKind) => {
    setKinds((prev) => ({ ...prev, [props.persona]: k }));
    setLastDone(null);
    setAffixIndex(item?.lockedAffix ?? null);
  };

  let request: CraftRequest | null = null;
  if (item && kind === "socket") request = { kind: "addSocket", itemId: item.id };
  else if (item && kind === "rune" && runeId) {
    request = { kind: "socketRune", itemId: item.id, runeId };
  } else if (kind === "combine" && runeId) request = { kind: "combineRunes", runeId };
  else if (kind === "gamble" && slot) request = { kind: "gamble", slot };
  else if (
    item &&
    (kind === "upgrade" ||
      kind === "reforge" ||
      kind === "awaken" ||
      kind === "shift" ||
      kind === "intensify")
  ) {
    request = { kind, itemId: item.id };
  } else if (item && kind === "temper" && affixIndex !== null) {
    request = { kind, itemId: item.id, affixIndex };
  } else if (item && kind === "kindle" && conditionId && effectId && kindleIndex !== null) {
    request = {
      kind,
      itemId: item.id,
      conditionId,
      effectId,
      ...(kindleIndex !== undefined ? { affixIndex: kindleIndex } : {}),
    };
  }

  // What the action costs (shown as currency icons, red where the wallet is short).
  let price: CraftCost | null = null;
  let block: string | null = null;
  if (kind === "codex" || kind === "crucible") {
    block = null;
  } else if (
    !request &&
    (kind === "rune" || kind === "combine" || kind === "gamble" || kind === "socket")
  ) {
    block =
      kind === "rune"
        ? !item
          ? "Choose an item"
          : "Choose a Rune"
        : kind === "combine"
          ? "Choose a Rune"
          : kind === "gamble"
            ? "Choose a slot"
            : "Choose an item";
  } else if (kind === "kindle" && !request) {
    block = !item
      ? "Choose an item"
      : targets.length === 0
        ? CRAFT_BLOCK_TEXT.noTriggerPlace
        : kindleIndex === null
          ? CRAFT_BLOCK_TEXT.notTrigger
          : "Choose a Condition and an Effect";
  } else if (kind === "salvage") {
    block = !item
      ? "Choose an item"
      : equipped
        ? "Only from the inventory. Unequip it first."
        : null;
  } else if (!request) {
    price =
      kind === "temper"
        ? craftCost({ kind: "temper", itemId: "", affixIndex: 0 })
        : craftCost({ kind: "reforge", itemId: "" });
    block = !item ? "Choose an item" : "Choose an affix";
  } else {
    price = craftCost(request, item, GAME_DATA, state);
    const reason = craftBlockReason(state, GAME_DATA, request);
    block = reason ? CRAFT_BLOCK_TEXT[reason] : null;
  }
  // Locked-out affixes and triggers say so even before an affix is picked.
  if (item && kind === "temper" && item.affixes.length === 0) {
    block = CRAFT_BLOCK_TEXT.noAffixes;
  }

  const run = () => {
    if (block) return;
    if (kind === "salvage" && item) {
      const names = learned.map((l) => partName(l.kind, l.id)).join(", ");
      setLast(
        `Salvaged ${item.name}: +${salvageValue(item)} Ash${names ? ` · Codex: ${names}` : ""}${teaches ? ` · Power Codex: ${teaches.name} T${teaches.tier}` : ""}`,
      );
      game.dispatch({ type: "salvage", itemId: item.id });
      setItemId(null);
      setPulse((n) => n + 1);
      return;
    }
    if (!request) return;
    // The sim is deterministic, so this preview is exactly what the dispatch will do.
    let after: GameState;
    try {
      after = applyAction(state, GAME_DATA, { type: "craft", request });
    } catch {
      game.dispatch({ type: "craft", request });
      return;
    }
    const next = "itemId" in request ? findCraftItem(after, request.itemId)?.item : undefined;
    switch (request.kind) {
      case "addSocket":
        setLast(`${next?.name ?? "Item"} now has ${next?.sockets ?? 0} Sockets`);
        break;
      case "socketRune": {
        const word = next?.runes?.length === next?.sockets ? next?.name : undefined;
        setLast(
          word &&
            word !== item?.name &&
            after.legacy.runewords.length > state.legacy.runewords.length
            ? `Runeword forged: ${word}!`
            : `Socketed ${runeName(request.runeId)}`,
        );
        if ((after.wallet.runes[request.runeId] ?? 0) === 0) setRuneId(null);
        break;
      }
      case "combineRunes": {
        const made = Object.keys(after.wallet.runes).find(
          (id) => (after.wallet.runes[id] ?? 0) > (state.wallet.runes[id] ?? 0),
        );
        setLast(`Three ${runeName(request.runeId)} became ${made ? runeName(made) : "?"}`);
        if ((after.wallet.runes[request.runeId] ?? 0) < 3) setRuneId(null);
        break;
      }
      case "gamble": {
        const fresh = after.inventory.find(
          (p) => !state.inventory.some((q) => q.item.id === p.item.id),
        );
        setGambled(fresh?.item ?? null);
        setLast(fresh ? `Gambled: ${fresh.item.name}` : "Gambled");
        break;
      }
      case "upgrade":
        setLast(`${next?.name ?? "Item"} is now Tier ${next?.tier ?? "?"}`);
        break;
      case "reforge":
        setLast(`Reforged into ${next?.name ?? "?"}`);
        break;
      case "awaken":
      case "shift":
      case "intensify":
        if (next?.greater) {
          setLast(`${greaterName(next.greater.rank)}: ${affixText(next, next.greater.index).text}`);
        }
        break;
      case "kindle": {
        const index = request.affixIndex ?? item?.affixes.length ?? 0;
        if (next) setLast(`Kindled: ${affixText(next, index).text}`);
        break;
      }
      case "temper":
        if (item && next) {
          setLast(
            `${affixText(item, request.affixIndex).text} → ${affixText(next, request.affixIndex).text}`,
          );
        }
        break;
    }
    game.dispatch({ type: "craft", request });
    setPulse((n) => n + 1);
  };

  const actionName = def.actions.find((a) => a.k === kind)?.name ?? "";
  const after = item;
  const itemCenter = [
    "upgrade",
    "socket",
    "salvage",
    "reforge",
    "temper",
    "kindle",
    "rune",
    "awaken",
    "shift",
    "intensify",
  ].includes(kind);

  const benchName = BENCH[props.persona];
  const place = { action: `Place on the ${benchName}`, run: (id: string) => pickItem(id) };
  const actions = def.actions
    .filter((a) => !a.endgame || state.legacy.finaleWon === true)
    .filter(
      (a) =>
        !a.powers ||
        Object.keys(state.powerCodex ?? {}).length > 0 ||
        state.legacy.finaleWon === true,
    );

  return (
    <WindowLayer>
      <PaintDefs />
      <Window
        label={`${def.name}, ${def.role}`}
        className="persona-view"
        header={
          <WindowHeader
            title={def.name}
            sub={`${def.role} · Camp at the ${nextAct(state, GAME_DATA).name}`}
            medallion={
              <Medallion tint={def.portrait}>
                <PersonaPortrait id={props.persona} />
              </Medallion>
            }
            tabs={
              <Tabs
                label="Camp crafters"
                // Crafters who have not joined the caravan yet are not shown at all.
                items={PERSONA_ORDER.filter((p) => personaPresent(state, p)).map((p) => ({
                  id: p,
                  name: PERSONAS[p].name,
                  art: <PersonaPortrait id={p} />,
                }))}
                active={props.persona}
                onChange={props.onPersona}
              />
            }
            right={<Wallet state={state} />}
            onClose={props.onClose}
          />
        }
      >
        <div className="persona-body">
          <aside className="persona-left">
            <div
              className="persona-bust"
              style={{ background: def.portrait, borderColor: def.accent }}
            >
              <PersonaPortrait id={props.persona} />
            </div>
            <blockquote className="persona-quote" style={{ borderColor: def.accent }}>
              &ldquo;{def.quote}&rdquo;
            </blockquote>
            <div className="persona-actions" role="group" aria-label="Services">
              {actions.map((a) => (
                <ActionTile
                  key={a.k}
                  icon={a.icon}
                  name={a.name}
                  note={{ name: a.name, kind: def.name, explain: a.desc }}
                  on={kind === a.k}
                  onPick={() => pickKind(a.k)}
                />
              ))}
            </div>
          </aside>

          <main className="persona-center">
            <WorkbenchFx persona={props.persona} pulse={pulse} anchor={bench} />
            <div className="center-head">
              <span className="title-font huge">{actionName}</span>
              <span className="sub">{ACTION_HINT[kind]}</span>
            </div>

            {kind === "crucible" ? (
              <CruciblePanel state={state} game={game} />
            ) : kind === "combine" || kind === "codex" ? (
              <div ref={bench} className="bench-anchor">
                <RuneBoard state={state} mode={kind} selected={runeId} onSelect={setRuneId} />
              </div>
            ) : kind === "gamble" ? (
              <div ref={bench} className="bench-anchor">
                <GamblePanel state={state} selected={slot} onSelect={setSlot} last={gambled} />
              </div>
            ) : !itemCenter ? null : (
              <>
                <Workbench persona={props.persona} item={item} onDrop={pickItem} ref={bench} />
                {item && (
                  <div className="now-after">
                    <div
                      className={`craft-card panel-card ${item ? rarityClass(item) : "dashed"}`}
                      data-testid="craft-now"
                    >
                      {item && (
                        <ItemHead
                          item={item}
                          label={`NOW · ${equipped ? "EQUIPPED" : "INVENTORY"}`}
                        />
                      )}
                      {item && (kind === "rune" || kind === "socket") && (
                        <SocketRow sockets={item.sockets ?? 0} runes={item.runes ?? []} />
                      )}
                      {item &&
                        item.affixes.length === 0 &&
                        kind !== "rune" &&
                        kind !== "socket" && <span className="sub">No affixes</span>}
                      {item?.affixes.map((_, i) => {
                        const t = affixText(item, i);
                        const kindleMode = kind === "kindle";
                        const pickable = kind === "temper" || kindleMode;
                        const lockedOut = item.lockedAffix !== undefined && item.lockedAffix !== i;
                        const disabled = kindleMode
                          ? !targets.includes(i) || lockedOut
                          : !pickable || lockedOut || t.trigger;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`affix-line ${t.trigger ? "trigger" : ""} ${item.affixes[i]?.kindled ? "kindled" : ""} ${(kindleMode ? kindleIndex === i : affixIndex === i && pickable) ? "on" : ""}`}
                            disabled={disabled}
                            title={
                              t.trigger && pickable && !kindleMode
                                ? "Trigger Affixes cannot be changed"
                                : lockedOut && pickable
                                  ? "Locked: only the locked-in affix can change"
                                  : undefined
                            }
                            onClick={() => setAffixIndex(i)}
                          >
                            <span className="grow">{t.text}</span>
                            {item.greater?.index === i && (
                              <span className="greater-mark">{greaterName(item.greater.rank)}</span>
                            )}
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
                      affixIndex={kind === "kindle" ? (kindleIndex ?? null) : affixIndex}
                      runeId={runeId}
                      learned={learned}
                      power={teaches}
                      kindle={
                        item && conditionId && effectId && kindleIndex !== null
                          ? {
                              conditionId,
                              effectId,
                              index: kindleIndex ?? item.affixes.length,
                            }
                          : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}

            {kind === "rune" && <RunePouch state={state} selected={runeId} onSelect={setRuneId} />}

            {kind === "kindle" && (
              <KindleParts
                state={state}
                conditionId={conditionId}
                effectId={effectId}
                onCondition={setConditionId}
                onEffect={setEffectId}
              />
            )}

            <div className="grow" />
            {kind !== "codex" && kind !== "crucible" && (
              <div className="cost-bar panel-card">
                {shownLast ? (
                  <span className="cost-last" role="status">
                    {shownLast}
                  </span>
                ) : (
                  <span className={`cost-block${block ? " warn" : ""}`}>{block}</span>
                )}
                {kind === "salvage"
                  ? item && (
                      <span className="cost-gain" aria-label={`+${salvageValue(item)} Ash`}>
                        +<b className="mono">{salvageValue(item)}</b> Ash
                      </span>
                    )
                  : price && <Price cost={price} state={state} />}
                {kind === "salvage" ? (
                  <HoldButton
                    primary
                    icon="trash"
                    blocked={block}
                    tip={{ name: "Salvage", kind: "Hold to confirm", explain: "There is no Undo." }}
                    onConfirm={run}
                  >
                    {actionName}
                  </HoldButton>
                ) : (
                  <Button
                    variant="primary"
                    big
                    blocked={block}
                    tip={{ name: actionName, kind: def.name, explain: "There is no Undo." }}
                    onClick={run}
                  >
                    {actionName}
                  </Button>
                )}
              </div>
            )}
          </main>

          <aside className="persona-right">
            <span className="title-font section-title">Equipped</span>
            <Paperdoll scale={SIDE_DOLL} className="side">
              <WeaponSlot state={state} scale={SIDE_DOLL} />
              {GAME_DATA.equipmentSlots.map((slot) => {
                const it = state.hero.equipment[slot];
                const pos = dollBox(slot, SIDE_DOLL);
                return (
                  <div key={slot} className="doll-slot" style={{ left: pos.x, top: pos.y }}>
                    <ItemTile
                      item={it}
                      label={SLOT_NAMES[itemSlotFor(slot)]}
                      width={pos.w}
                      height={pos.h}
                      selected={!!it && it.id === itemId}
                      drag={drops.slot(slot)}
                      context={
                        it ? { action: place.action, run: () => place.run(it.id) } : undefined
                      }
                      {...(it ? { onSelect: () => pickItem(it.id) } : {})}
                    />
                  </div>
                );
              })}
            </Paperdoll>
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
              drop={drops.grid("inventory")}
              context={{ action: () => place.action, run: (it) => place.run(it.id) }}
            />
          </aside>
        </div>
      </Window>
    </WindowLayer>
  );
}

/** One service of the crafter: a big icon tile, what it does in the tooltip. */
function ActionTile(props: {
  icon: IconName;
  name: string;
  note: NoteHover;
  on: boolean;
  onPick: () => void;
}) {
  const hover = useNoteHover(props.note);
  return (
    <button
      type="button"
      className={`persona-action${props.on ? " on" : ""}`}
      aria-pressed={props.on}
      onClick={props.onPick}
      {...hover}
    >
      <Icon name={props.icon} size={28} />
      <span className="title-font">{props.name}</span>
    </button>
  );
}

const PRICE: readonly [keyof CraftCost, CurrencyId][] = [
  ["acorns", "acorns"],
  ["ash", "ash"],
  ["emberCoal", "coal"],
  ["phoenixFeathers", "feathers"],
  ["cinderglass", "glass"],
];

/** A craft's price: currency icons (red where the wallet is short) and the Runes it uses. */
function Price(props: { cost: CraftCost; state: GameState }) {
  const w = props.state.wallet;
  const have: Record<CurrencyId, number> = {
    acorns: w.acorns,
    ash: w.ash,
    coal: w.emberCoal,
    feathers: w.phoenixFeathers,
    glass: w.cinderglass ?? 0,
    runes: 0,
    flask: 0,
  };
  const parts = PRICE.flatMap(([key, id]) => {
    const amount = (props.cost[key] as number | undefined) ?? 0;
    return amount > 0 ? [{ id, amount, have: have[id] }] : [];
  });
  const runes = Object.entries(props.cost.runes);
  if (parts.length === 0 && runes.length === 0) return <span className="cost-free">Free</span>;
  return (
    <span className="cost-price">
      <Cost parts={parts} />
      {runes.map(([id, n]) => (
        <span
          key={id}
          className={`cost-rune${(w.runes[id] ?? 0) < n ? " short" : ""}`}
          aria-label={`${n} ${runeName(id)}`}
          title={`${n} ${runeName(id)}`}
        >
          <RuneStone runeId={id} size={22} />
          <b className="mono">{n}</b>
        </span>
      ))}
    </span>
  );
}
