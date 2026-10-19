import { Icon } from "../ui/Icon";

/**
 * Painted emblems (design/notes/klassen-masteries-art-v1.md, cut by
 * tools/art/cut_classes_masteries.py): one per class, and one per Mastery in its class's colours.
 */
const URLS = import.meta.glob<string>(["../assets/classes/*.webp", "../assets/masteries/*.webp"], {
  eager: true,
  import: "default",
});

function Emblem(props: { src: string | undefined; size: number; className: string }) {
  if (!props.src) return <Icon name="user" size={props.size} color="var(--accent)" />;
  return (
    <img
      className={props.className}
      src={props.src}
      width={props.size}
      height={props.size}
      alt=""
      draggable={false}
    />
  );
}

export function ClassEmblem(props: { classId: string; size?: number | undefined }) {
  return (
    <Emblem
      src={URLS[`../assets/classes/${props.classId}.webp`]}
      size={props.size ?? 20}
      className="class-emblem"
    />
  );
}

export function MasteryEmblem(props: { masteryId: string; size?: number | undefined }) {
  return (
    <Emblem
      src={URLS[`../assets/masteries/${props.masteryId}.webp`]}
      size={props.size ?? 20}
      className="class-emblem"
    />
  );
}

/** The Heir's emblem: the main Mastery's once chosen, the class's before. */
export function HeirEmblem(props: {
  classId: string;
  mastery?: string | undefined;
  size?: number;
}) {
  return props.mastery ? (
    <MasteryEmblem masteryId={props.mastery} size={props.size} />
  ) : (
    <ClassEmblem classId={props.classId} size={props.size} />
  );
}
