/**
 * Painted menu and workbench icons (tools/art/cut_menu_icons.py): the crafters' services by their
 * ActionKind, plus "ash-tree" and "heirloom" for the top bar and Kaelen's tabs.
 */
const ART = import.meta.glob<string>("../assets/actions/*.webp", {
  eager: true,
  import: "default",
});

export function actionIcon(id: string): string | undefined {
  return ART[`../assets/actions/${id}.webp`];
}
