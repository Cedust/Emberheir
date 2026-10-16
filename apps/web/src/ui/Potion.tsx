import flaskEmpty from "../assets/currency/flask-empty.webp";
import flaskFull from "../assets/currency/flask-full.webp";

/** The Ember Flask's potion, the same in the Battle HUD and between stages: painted full or empty. */
export function Potion(props: { full: boolean; className?: string }) {
  return (
    <img
      className={`${props.className ?? ""} ${props.full ? "full" : ""}`}
      src={props.full ? flaskFull : flaskEmpty}
      alt=""
      draggable={false}
    />
  );
}

const DRAUGHT_ICONS = import.meta.glob<string>("../assets/draughts/*.webp", {
  eager: true,
  import: "default",
});

/** A Draught's painted vial, by Draught id (undefined for a Draught without art). */
export const draughtIconUrl = (draughtId: string): string | undefined =>
  DRAUGHT_ICONS[`../assets/draughts/${draughtId}.webp`];
