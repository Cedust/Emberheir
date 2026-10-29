import { GAME_DATA } from "@emberheir/content";
import {
  type ActData,
  type BountyCache,
  type BountyDefinition,
  bountyCinderglass,
  type DraughtDefinition,
  type GameState,
  getBase,
  type Item,
  DRAUGHT_FLASK_COST,
  draughtAcorns,
  knownDraughts,
  minPeril,
  type OmenDefinition,
  omenPeril,
  perilReward,
  salvageValue,
  SLOT_NAMES,
  wildfireLevel,
  wildfireName,
} from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { rarityClass } from "../../ui/items";
import { useItemHover, useNoteHover } from "../../ui/ItemTooltip";
import { RuneStone, runeName } from "../../ui/RuneArt";
import { TrailMark } from "../../ui/TrailMark";
import { draughtIconUrl } from "../../ui/Potion";
import { type BountyView, bountyView } from "../bounty";
import { CurrencyIcon, Price } from "../../ui/kit/Currency";
import cacheClosedUrl from "../../assets/benches/eldrins-cache-closed.webp";
import cacheOpenUrl from "../../assets/benches/eldrins-cache-open.webp";

/** The Camp's choices before setting out: the Draught, the Wildfire tier, the Scout's bounty. */

/**
 * Draughts (balance-grundlagen-v1.md F, draughts-einfuehrung-v1.md): one vial per Draught Liora
 * knows; the chosen one is brewed from a Flask charge and a few Acorns at every set-out. Clicking
 * it again pours it back (no Draught). Element Draughts not learned yet are not shown.
 */
export function DraughtPicker(props: { state: GameState; onPick: (id: string | null) => void }) {
  const chosen = props.state.draught ?? null;
  return (
    <div className="draught-picker" role="group" aria-label="Draught">
      <span className="draught-label sub">
        Draught <Price id="acorns" amount={draughtAcorns(props.state)} />
      </span>
      {knownDraughts(props.state, GAME_DATA).map((d) => (
        <DraughtVial
          key={d.id}
          draught={d}
          on={chosen === d.id}
          onPick={() => props.onPick(chosen === d.id ? null : d.id)}
        />
      ))}
    </div>
  );
}

/** "+20 % Fire Resistance, +5 % max Fire Resistance" as one bullet per bonus. */
const draughtBullets = (d: DraughtDefinition): string[] =>
  d.description.split(", ").map((line) => line[0]?.toUpperCase() + line.slice(1));

function DraughtVial(props: { draught: DraughtDefinition; on: boolean; onPick: () => void }) {
  const d = props.draught;
  const hover = useNoteHover({
    name: d.name,
    kind: `Draught · ${DRAUGHT_FLASK_COST} Flask charge and Acorns · until the Camp`,
    bullets: draughtBullets(d),
    explain: d.explain,
    status: props.on ? "Brewed at every set-out · click to pour it back" : "Click to brew it",
  });
  const color = `#${d.color.toString(16).padStart(6, "0")}`;
  const icon = draughtIconUrl(d.id);
  return (
    <button
      type="button"
      aria-pressed={props.on}
      aria-label={d.name}
      className={`draught-vial${props.on ? " on" : ""}`}
      style={{ "--vial": color } as React.CSSProperties}
      onClick={props.onPick}
      {...hover}
    >
      {icon ? (
        <img src={icon} alt="" draggable={false} />
      ) : (
        <svg viewBox="0 0 20 28" width="18" height="26" aria-hidden="true">
          <path d="M7 1h6v6l5 8v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9l5-8z" className="vial-glass" />
          <path d="M3.5 16h13v8a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" className="vial-brew" />
        </svg>
      )}
    </button>
  );
}

const WILDFIRE_HINT =
  "Wildfire: any act burns again, harder each tier. Monster Level 92 at I up to 110 at X (above V the foes outlevel you), only T10 items, more Legendaries and higher Runes. Choose Omens for Peril: VI asks for 2, up to 10 at X, and every point pays more XP and Legendaries. Clear an act boss to open the next tier.";

/** Wildfire tier for the next trip (spielzeit-v1.md, C): Off, then I up to one above the best. */
export function WildfirePicker(props: {
  tier: number;
  top: number;
  best: number;
  onPick: (tier: number) => void;
}) {
  const { tier, top, best } = props;
  return (
    <div className="wildfire-picker" aria-label="Wildfire" title={WILDFIRE_HINT}>
      <button
        type="button"
        className="btn ghost wildfire-step"
        aria-label="Lower Wildfire"
        disabled={tier <= 0}
        onClick={() => props.onPick(tier - 1)}
      >
        <Icon name="prev" size={16} />
      </button>
      <span className={`wildfire-tier title-font${tier > 0 ? " on" : ""}`}>
        <Icon name="fire" size={16} />
        {tier > 0 ? wildfireName(tier) : "Wildfire off"}
        <span className="sub small">
          {tier > 0 ? `Monster Level ${wildfireLevel(tier)}` : ""}
          {best > 0 ? `${tier > 0 ? " · " : ""}best ${wildfireName(best).slice(9)}` : ""}
        </span>
      </span>
      <button
        type="button"
        className="btn ghost wildfire-step"
        aria-label="Raise Wildfire"
        disabled={tier >= top}
        onClick={() => props.onPick(tier + 1)}
      >
        <Icon name="next" size={16} />
      </button>
    </div>
  );
}

/** What a bounty adds to Eldrin's Cache, besides the Home Rune and the item pick. */
/** One size for every icon in a bounty's pay line: Rune, Cache, Ember Coal, Trail. */
const PAY_ICON = 26;

function BountyBonus(props: { def: BountyDefinition }) {
  const b = props.def.bonus;
  switch (b.kind) {
    case "emberCoal":
      return (
        <span className="k-price" title={`${b.min}–${b.max} Ember Coal`}>
          <CurrencyIcon id="coal" size={PAY_ICON} />
          <b className="mono">
            +{b.min}–{b.max}
          </b>
        </span>
      );
    case "trail":
      return (
        <span
          className="bounty-bonus"
          title={`+${b.kills} Trail kills, one card with its Hunt Affix`}
        >
          <TrailMark tier={2} size={PAY_ICON} /> +{b.kills}
        </span>
      );
    case "picks":
      return <span className="bounty-bonus words">Take {b.picks} items</span>;
    case "rarity":
      return <span className="bounty-bonus words">Rarer items</span>;
  }
}

/** The Cinderglass of a Wildfire bounty, like the Ember Coal bonus: icon and range. */
function GlassPay(props: { tier: number }) {
  const { min, max } = bountyCinderglass(props.tier);
  return (
    <span className="k-price" title={`${min}–${max} Cinderglass`}>
      <CurrencyIcon id="glass" size={PAY_ICON} />
      <b className="mono">
        +{min}–{max}
      </b>
    </span>
  );
}

/**
 * What a bounty pays, as icons: the act's Home Rune (Cinderglass in the Wildfire), the item pick,
 * the bounty's own bonus.
 */
function BountyPay(props: { def: BountyDefinition; act: ActData; wildfire?: number }) {
  const rune = props.act.homeRune;
  return (
    <span className="bounty-pay">
      {props.wildfire ? (
        <GlassPay tier={props.wildfire} />
      ) : (
        rune && (
          <span title={`Home Rune: ${runeName(rune)}`}>
            <RuneStone runeId={rune} size={PAY_ICON} />
          </span>
        )
      )}
      <span className="bounty-bonus" title="An item pick from Eldrin's Cache">
        <img className="cache-mini" src={cacheClosedUrl} alt="" draggable={false} />
      </span>
      <BountyBonus def={props.def} />
    </span>
  );
}

/**
 * Eldrin's two Bounties for the chosen road (bounties-v2-plan.md B1): the task and what it pays.
 * The hero takes one or none; clicking the chosen one again lets it go.
 */
export function BountyChoice(props: {
  offer: readonly BountyView[];
  act: ActData;
  /** Wildfire tier of the trip (0 = a normal trip). */
  wildfire?: number;
  chosen: string | null;
  onPick: (id: string | null) => void;
}) {
  const wild = (props.wildfire ?? 0) > 0;
  return (
    <div className="omen-choice bounty-choice" role="radiogroup" aria-label="Bounty">
      <span className="eyebrow">BOUNTY · TAKE ONE IF YOU LIKE</span>
      <div className="omen-cards">
        {props.offer.map((b) => {
          const on = props.chosen === b.def.id;
          return (
            <button
              key={b.def.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={b.def.name}
              // The Wildfire's Omens fill the window: there the task is on hover only.
              title={wild ? b.text : undefined}
              className={`omen-card bounty-offer${wild ? " compact" : ""}${on ? " on" : ""}`}
              onClick={() => props.onPick(on ? null : b.def.id)}
            >
              <span className="omen-name title-font">{b.def.name}</span>
              {!wild && <span className="bounty-text sub">{b.text}</span>}
              <BountyPay def={b.def} act={props.act} wildfire={props.wildfire ?? 0} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A done bounty at Eldrin: turn it in to open his Cache. */
export function BountyTurnIn(props: { state: GameState; onTurnIn: () => void }) {
  const done = props.state.bountyDone;
  if (!done) return null;
  const view = bountyView({
    id: done.id,
    ...(done.enemyId ? { enemyId: done.enemyId } : {}),
    progress: 0,
    status: "done",
  });
  const act = GAME_DATA.acts.find((a) => a.id === done.actId);
  const waiting = props.state.bountyCache !== undefined;
  return (
    <div className="bounty-note done" aria-label="Bounty">
      <img className="cache-chest" src={cacheClosedUrl} alt="" draggable={false} />
      <span className="eyebrow">BOUNTY DONE · {view.def.name.toUpperCase()}</span>
      {act && <BountyPay def={view.def} act={act} wildfire={done.wildfire ?? 0} />}
      <button
        type="button"
        className="btn primary bounty-turn-in"
        disabled={waiting}
        title={waiting ? "Take the items of the last Cache first" : undefined}
        onClick={props.onTurnIn}
      >
        <Icon name="target" size={14} /> Turn In
      </button>
    </div>
  );
}

/**
 * Eldrin's Cache (bounties-v2-plan.md B3): what he paid at once, and the item cards to take into
 * the inventory. The cards left turn to Ash when it closes.
 */
export function BountyCacheView(props: {
  state: GameState;
  onTake: (index: number) => void;
  onClose: () => void;
}) {
  const cache = props.state.bountyCache;
  if (!cache) return null;
  const def = GAME_DATA.bounties?.find((b) => b.id === cache.id);
  const left = cache.picks - cache.taken.length;
  return (
    <div className="bounty-note paid bounty-cache" aria-label="Eldrin's Cache" role="group">
      <img className="cache-chest open" src={cacheOpenUrl} alt="" draggable={false} />
      <span className="eyebrow">
        ELDRIN&apos;S CACHE{def ? ` · ${def.name.toUpperCase()}` : ""}
      </span>
      <span className="bounty-pay">
        {cache.runes.map((id, i) => (
          <span key={i} title={runeName(id)}>
            <RuneStone runeId={id} size={PAY_ICON} />
          </span>
        ))}
        {(cache.cinderglass ?? 0) > 0 && (
          <Price id="glass" amount={cache.cinderglass ?? 0} plus size={PAY_ICON} />
        )}
        {cache.emberCoal > 0 && <Price id="coal" amount={cache.emberCoal} plus size={PAY_ICON} />}
        {(cache.acorns ?? 0) > 0 && (
          <Price id="acorns" amount={cache.acorns ?? 0} plus size={PAY_ICON} />
        )}
        {cache.trailKills && cache.enemyId ? (
          <span className="bounty-bonus" title="Trail kills">
            <TrailMark tier={2} size={PAY_ICON} /> +{cache.trailKills}
          </span>
        ) : null}
      </span>
      <span className="sub small">Take {left === 1 ? "one item" : `${left} items`}:</span>
      <div className="bounty-cards">
        {cache.items.map((item, i) =>
          cache.taken.includes(i) ? null : (
            <CacheCard key={item.id} item={item} onTake={() => props.onTake(i)} />
          ),
        )}
      </div>
      <button type="button" className="btn ghost bounty-leave" onClick={props.onClose}>
        Leave the rest · <Price id="ash" amount={cacheAsh(cache)} />
      </button>
    </div>
  );
}

/** One card of Eldrin's Cache: the item with room around it, its name and slot; a click takes it. */
function CacheCard(props: { item: Item; onTake: () => void }) {
  const { item } = props;
  const { active, tip: hover } = useItemHover(item, false, "Take", props.onTake);
  const slot = getBase(GAME_DATA.items, item.baseId).slot;
  return (
    <button
      type="button"
      className={`hoard-face cache-card ${rarityClass(item)}`}
      aria-label={`Take: ${item.name}`}
      title={active ? undefined : item.name}
      onClick={props.onTake}
      onContextMenu={(e) => {
        e.preventDefault();
        props.onTake();
      }}
      {...hover}
    >
      <span className="cache-art">
        <ItemArt baseId={item.baseId} uniqueId={item.uniqueId} slot={slot} />
      </span>
      <span className="title-font rarity-text cache-name">{item.name}</span>
      <span className="sub small">
        {SLOT_NAMES[slot]} · T{item.tier}
      </span>
    </button>
  );
}

/** The Ash the cards not taken turn to. */
function cacheAsh(cache: BountyCache): number {
  return cache.items
    .filter((_, i) => !cache.taken.includes(i))
    .reduce((sum, it) => sum + salvageValue(it), 0);
}

const omenOf = (id: string): OmenDefinition | undefined =>
  GAME_DATA.omens?.find((o) => o.id === id);

/**
 * Run Omens (neuausrichtung-v1.md 5.2): an old act burns under one of two Omens. Eldrin shows
 * both with their price, their reward and the Scout's question to the build; the hero picks one.
 */
export function OmenChoice(props: {
  offer: readonly string[];
  chosen: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="omen-choice" role="radiogroup" aria-label="Omen">
      <span className="eyebrow">OMEN · CHOOSE ONE</span>
      <div className="omen-cards">
        {props.offer.map((id) => {
          const o = omenOf(id);
          if (!o) return null;
          const on = props.chosen === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.name}
              className={`omen-card${on ? " on" : ""}`}
              onClick={() => props.onPick(id)}
            >
              <span className="omen-name title-font">{o.name}</span>
              <span className="omen-price">{o.price}</span>
              {o.reward && <span className="omen-reward">{o.reward}</span>}
              <span className="omen-question sub small">{o.question}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Wildfire Omens (neuausrichtung-v1.md 7.2): any number, each adds its Peril. Tiers above V ask
 * for a minimum; every point pays more XP and Legendaries, every four a Rune rank.
 */
export function WildfireOmens(props: {
  tier: number;
  chosen: readonly string[];
  onToggle: (id: string) => void;
}) {
  const pool = (GAME_DATA.omens ?? []).filter((o) => o.kind === "wildfire");
  const peril = omenPeril(props.chosen.flatMap((id) => omenOf(id) ?? []));
  const need = minPeril(props.tier);
  const pay = perilReward(peril);
  return (
    <div className="wildfire-omens" role="group" aria-label="Wildfire Omens">
      <div className="omen-peril">
        <span className="eyebrow">OMENS</span>
        <b className={`mono${peril < need ? " short" : ""}`}>
          Peril {peril}
          {need > 0 ? ` / ${need}` : ""}
        </b>
        <span className="sub small">
          {peril > 0
            ? `+${Math.round(pay.xp * 100)} % XP · +${Math.round(pay.legendary * 100)} % Legendary${pay.runeTiers ? ` · Runes +${pay.runeTiers} rank` : ""}`
            : need > 0
              ? `${wildfireName(props.tier)} asks for ${need} Peril`
              : "Optional: more Peril, more loot"}
        </span>
      </div>
      <div className="omen-grid">
        {pool.map((o) => (
          <OmenToggle
            key={o.id}
            omen={o}
            on={props.chosen.includes(o.id)}
            onToggle={() => props.onToggle(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OmenToggle(props: { omen: OmenDefinition; on: boolean; onToggle: () => void }) {
  const o = props.omen;
  const hover = useNoteHover({
    name: o.name,
    kind: `Wildfire Omen · Peril ${o.peril ?? 0}`,
    explain: `${o.price} ${o.question}`,
    status: props.on ? "Burns on this trip · click to drop it" : "Click to take it",
  });
  return (
    <button
      type="button"
      aria-pressed={props.on}
      aria-label={o.name}
      className={`omen-toggle${props.on ? " on" : ""}`}
      onClick={props.onToggle}
      {...hover}
    >
      <span className="omen-name">{o.name}</span>
      <span className="omen-pips" aria-hidden="true">
        {"◆".repeat(o.peril ?? 0)}
      </span>
    </button>
  );
}
