import {
  ATTRIBUTES,
  ATTRIBUTE_RULES,
  type Attribute,
  type AttributePoints,
  type Attributes,
  BREAKPOINTS,
  PERKS,
  type PerkId,
  addAttributes,
  heroPerks,
} from "@emberheir/sim";
import { type PerkStatus, usePerkHover } from "../ui/ItemTooltip";

export const ATTRIBUTE_INFO: Record<Attribute, { name: string; short: string; effects: string }> = {
  strength: { name: "Strength", short: "STR", effects: "Physical Damage · Armor" },
  dexterity: { name: "Dexterity", short: "DEX", effects: "Crit Chance · Trigger Chance" },
  intelligence: {
    name: "Intelligence",
    short: "INT",
    effects: "Elemental Damage · All Resistance",
  },
  agility: { name: "Agility", short: "AGI", effects: "Attack Speed · Evasion" },
  wisdom: { name: "Wisdom", short: "WIS", effects: "Heat Gain · Ailment Duration" },
  vitality: { name: "Vitality", short: "VIT", effects: "Life · Tenacity" },
};

export const NO_POINTS: Record<Attribute, number> = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  agility: 0,
  wisdom: 0,
  vitality: 0,
};

const perkAt = (a: Attribute, threshold: number) =>
  PERKS.find((p) => p.attribute === a && p.threshold === threshold);

function PerkChip(props: { perk: PerkId; status: PerkStatus; value: number }) {
  const hover = usePerkHover(props);
  const perk = PERKS.find((p) => p.id === props.perk);
  return (
    <span
      className={`perk-chip ${props.status === "lost" ? "lost" : ""} ${props.status === "gained" ? "gained" : ""}`}
      tabIndex={0}
      {...hover}
    >
      {perk?.name}
    </span>
  );
}

/** A Breakpoint seal on the notch row; hovering it explains its Perk. */
function Seal(props: { className: string; perk: PerkId; status: PerkStatus; value: number }) {
  const hover = usePerkHover(props);
  return <span className={props.className} data-testid={`seal-${props.perk}`} {...hover} />;
}

/**
 * Attribute stones (attribute-v1.md section 9): one row per attribute with ten notches, the
 * Breakpoints 4/7/10 as ember seals that light up with their Perk. Pending points glow, points
 * about to leave show hollow. Blaze Boons add notches past the own value (they count for Perks);
 * gear shows as a small "+N" only.
 */
export function AttributeStones(props: {
  /** Own attributes before the pending change. */
  base: Attributes;
  /** Pending change per attribute (may be negative where `onRemove` allows it). */
  delta: Record<Attribute, number>;
  boon?: AttributePoints;
  gear?: AttributePoints;
  canAdd?: (a: Attribute) => boolean;
  canRemove?: (a: Attribute) => boolean;
  onAdd?: (a: Attribute) => void;
  onRemove?: (a: Attribute) => void;
  /** Perks that were lit before the change (lost ones show red). */
  before?: readonly PerkId[];
}) {
  const next = addAttributes(props.base, props.delta);
  const lit = new Set(heroPerks(next, props.boon ?? {}));
  const was = new Set(props.before ?? heroPerks(props.base, props.boon ?? {}));
  const lost = [...was].filter((p) => !lit.has(p));
  const gained = [...lit].filter((p) => !was.has(p));
  const status = (p: PerkId): PerkStatus =>
    gained.includes(p) ? "gained" : lit.has(p) ? "active" : lost.includes(p) ? "lost" : "locked";
  return (
    <div className="attr-stones">
      <ul className="attributes">
        {ATTRIBUTES.map((a) => {
          const own = next[a];
          const before = props.base[a];
          const boon = props.boon?.[a] ?? 0;
          const gear = Math.max(
            0,
            Math.min(ATTRIBUTE_RULES.itemMax - own - boon, props.gear?.[a] ?? 0),
          );
          return (
            <li key={a} data-testid={`attr-${a}`}>
              <div className="attr-text" title={ATTRIBUTE_INFO[a].effects}>
                <span className="attr-name title-font">{ATTRIBUTE_INFO[a].name}</span>
                <span className="sub small">{ATTRIBUTE_INFO[a].effects}</span>
              </div>
              <div className="attr-notches">
                {Array.from({ length: ATTRIBUTE_RULES.max }, (_, i) => {
                  const n = i + 1;
                  const seal = (BREAKPOINTS as readonly number[]).includes(n);
                  const perk = seal ? perkAt(a, n) : undefined;
                  const state =
                    n <= Math.min(own, before)
                      ? "own"
                      : n <= own
                        ? "new"
                        : n <= before
                          ? "leaving"
                          : n <= own + boon
                            ? "boon"
                            : "empty";
                  const className = `notch ${state} ${seal ? "seal" : ""} ${perk && lit.has(perk.id) ? "lit" : ""}`;
                  return perk ? (
                    <Seal
                      key={n}
                      className={className}
                      perk={perk.id}
                      status={status(perk.id)}
                      value={own + boon}
                    />
                  ) : (
                    <span key={n} className={className} />
                  );
                })}
              </div>
              <span className="attr-value mono">
                {own + boon}
                {gear > 0 && <em className="gear"> +{gear}</em>}
              </span>
              {props.onRemove && (
                <button
                  type="button"
                  className="plus minus"
                  aria-label={`Remove ${ATTRIBUTE_INFO[a].name}`}
                  disabled={!props.canRemove?.(a)}
                  onClick={() => props.onRemove?.(a)}
                >
                  −
                </button>
              )}
              {props.onAdd && (
                <button
                  type="button"
                  className="plus"
                  aria-label={`Add ${ATTRIBUTE_INFO[a].name}`}
                  disabled={!props.canAdd?.(a)}
                  onClick={() => props.onAdd?.(a)}
                >
                  +
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="perk-line" data-testid="perks">
        {PERKS.filter((p) => lit.has(p.id) || lost.includes(p.id)).map((p) => (
          <PerkChip
            key={p.id}
            perk={p.id}
            status={status(p.id)}
            value={next[p.attribute] + (props.boon?.[p.attribute] ?? 0)}
          />
        ))}
      </div>
    </div>
  );
}
