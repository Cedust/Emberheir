import { Icon, type IconName } from "../ui/Icon";

/** Each class's emblem (klassen-v2.md): marks the class and its recommended paths. */
export const CLASS_ICONS: Record<string, IconName> = {
  warrior: "shield",
  reaver: "claw",
  hunter: "bow",
  sorcerer: "wand",
  warlock: "eye",
};

export function ClassEmblem(props: { classId: string; size?: number; color?: string }) {
  return (
    <Icon
      name={CLASS_ICONS[props.classId] ?? "user"}
      size={props.size ?? 20}
      color={props.color ?? "var(--accent)"}
    />
  );
}
