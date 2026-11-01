/**
 * Painted Legendary Power icons (Timo's power sheets A–C, cut by tools/art/cut_powers.py into one
 * webp per power id). They sit next to the Power's name wherever it is shown.
 */
const POWERS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../assets/powers/*.webp", { eager: true, import: "default" }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -".webp".length), url]),
);

/** Whether a Power has a painted icon. */
export function hasPowerIcon(powerId: string): boolean {
  return powerId in POWERS;
}

/** The painted icon of a Legendary Power, or nothing if it has none. */
export function PowerIcon(props: { powerId: string; size?: number; className?: string }) {
  const src = POWERS[props.powerId];
  if (!src) return null;
  const size = props.size ?? 32;
  return (
    <img
      className={`power-icon ${props.className ?? ""}`}
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  );
}
