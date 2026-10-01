import { ITEM_CATALOG, POC_EQUIPMENT_SLOTS, STARTING_ATTRIBUTES } from "@emberheir/content";
import { type Equipment, type ResolvedEquipment, describeItem } from "@emberheir/sim";
import { ItemCard } from "./ItemCard";

/** Shows the rolled PoC gear set as item cards. */
export function GearPanel(props: { equipment: Equipment; resolved: ResolvedEquipment }) {
  const items = POC_EQUIPMENT_SLOTS.flatMap((slot) => {
    const item = props.equipment[slot];
    return item ? [{ slot, item }] : [];
  });
  if (items.length === 0) {
    return <p className="gear-empty">No gear. Pick a rarity and press Roll gear.</p>;
  }
  return (
    <div className="gear-grid" aria-label="Equipped gear">
      {items.map(({ slot, item }) => (
        <ItemCard
          key={slot}
          tooltip={describeItem(item, ITEM_CATALOG, STARTING_ATTRIBUTES)}
          inactive={props.resolved.inactive.find((i) => i.slot === slot)?.reason}
        />
      ))}
    </div>
  );
}
