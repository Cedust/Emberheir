import hunterUrl from "../assets/classes/hunter.webp";
import warlockUrl from "../assets/classes/warlock.webp";
import warriorUrl from "../assets/classes/warrior.webp";
import { Icon } from "../ui/Icon";

/**
 * Each class's painted emblem: its signature gear. The three classes of the Klassengerüst borrow
 * the old emblems (Warrior, Hunter, Warlock) until their own are painted.
 */
const CLASS_EMBLEMS: Record<string, string> = {
  cinderguard: warriorUrl,
  ashstrider: hunterUrl,
  emberseer: warlockUrl,
};

export function ClassEmblem(props: { classId: string; size?: number }) {
  const size = props.size ?? 20;
  const src = CLASS_EMBLEMS[props.classId];
  if (!src) return <Icon name="user" size={size} color="var(--accent)" />;
  return (
    <img className="class-emblem" src={src} width={size} height={size} alt="" draggable={false} />
  );
}
