import type { InactiveReason, ItemTooltip } from "@emberheir/sim";

const INACTIVE_TEXT: Record<InactiveReason["kind"], string> = {
  requirements: "Inactive: requirements not met",
  wrongSlot: "Inactive: wrong slot",
  offHandMismatch: "Inactive: does not fit the weapon",
};

/** Item tooltip as a card: rarity frame, base values, implicit, affixes, requirements. */
export function ItemCard(props: { tooltip: ItemTooltip; inactive?: InactiveReason | undefined }) {
  const { tooltip, inactive } = props;
  return (
    <article
      className={`item-card rarity-${tooltip.rarity}${inactive ? " inactive" : ""}`}
      aria-label={tooltip.name}
      data-testid="item-card"
    >
      <header>
        <h3 className="item-name">{tooltip.name}</h3>
        <p className="item-type">
          {tooltip.rarity === "normal" ? "" : `${tooltip.rarityName} `}
          {tooltip.baseName} · {tooltip.slotName}
        </p>
        <p className="item-level">
          Item Level {tooltip.itemLevel} · Tier {tooltip.tier}
        </p>
      </header>

      {tooltip.baseLines.length > 0 && (
        <ul className="item-lines item-base">
          {tooltip.baseLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {tooltip.implicitLines.length > 0 && (
        <ul className="item-lines item-implicit">
          {tooltip.implicitLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {tooltip.affixLines.length > 0 && (
        <ul className="item-lines item-affixes">
          {tooltip.affixLines.map((line) => (
            <li key={line.text} className={`affix-${line.kind}`}>
              {line.text}
            </li>
          ))}
        </ul>
      )}

      {tooltip.requirements.length > 0 && (
        <p className="item-requirements">
          Requires{" "}
          {tooltip.requirements.map((r, i) => (
            <span key={r.attribute} className={r.met === false ? "unmet" : undefined}>
              {i > 0 ? ", " : ""}
              {r.value} {r.name}
            </span>
          ))}
        </p>
      )}

      {inactive && <p className="item-inactive">{INACTIVE_TEXT[inactive.kind]}</p>}
    </article>
  );
}
