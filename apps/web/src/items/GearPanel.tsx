import { ITEM_CATALOG, STARTING_ATTRIBUTES } from "@emberheir/content";
import {
  EQUIPMENT_SLOTS,
  type Equipment,
  type ResolvedEquipment,
  describeItem,
} from "@emberheir/sim";
import { ItemCard } from "./ItemCard";

/** Shows the rolled gear set as item cards. */
export function GearPanel(props: { equipment: Equipment; resolved: ResolvedEquipment }) {
  const items = EQUIPMENT_SLOTS.flatMap((slot) => {
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
