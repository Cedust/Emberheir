import hunterUrl from "../assets/classes/hunter.webp";
import reaverUrl from "../assets/classes/reaver.webp";
import sorcererUrl from "../assets/classes/sorcerer.webp";
import warlockUrl from "../assets/classes/warlock.webp";
import warriorUrl from "../assets/classes/warrior.webp";
import { Icon } from "../ui/Icon";

/** Each class's painted emblem (klassen-v2.md): its signature gear. */
const CLASS_EMBLEMS: Record<string, string> = {
  warrior: warriorUrl,
  reaver: reaverUrl,
  hunter: hunterUrl,
  sorcerer: sorcererUrl,
  warlock: warlockUrl,
};

export function ClassEmblem(props: { classId: string; size?: number }) {
  const size = props.size ?? 20;
  const src = CLASS_EMBLEMS[props.classId];
  if (!src) return <Icon name="user" size={size} color="var(--accent)" />;
  return (
    <img className="class-emblem" src={src} width={size} height={size} alt="" draggable={false} />
  );
}
